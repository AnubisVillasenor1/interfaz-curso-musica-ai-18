import { NextResponse } from 'next/server'

import { getAppUrl } from '@/lib/app-url'
import { signCallbackUrl } from '@/lib/callback-signature'
import { SUPABASE_NOT_CONFIGURED } from '@/lib/supabase/config'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

/** Identificador estable de la receta local: el cliente reproduce con él. */
const LOCAL_SEED_SALT = 'play-and-go-local-v1'

function clamp(value: unknown, min: number, max: number, fallback: number): number {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return fallback
  return Math.min(max, Math.max(min, Math.round(parsed)))
}

function text(value: unknown, max: number): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed ? trimmed.slice(0, max) : null
}

/**
 * Devuelve la unidad consumida cuando el intento muere antes de producir nada.
 * Sin esto, un proveedor caído le costaba al usuario una canción de su cupo.
 */
async function refundQuota(supabase: NonNullable<Awaited<ReturnType<typeof createClient>>>, userId: string, engine: string) {
  const { error } = await supabase.rpc('refund_generation_quota', { p_owner: userId, p_engine: engine })
  if (error) console.error('[generate] no se pudo devolver la cuota', error.message)
}

/**
 * Crea una canción.
 *
 * Dos motores, un solo contrato de cuota:
 *
 * - `local`: el arreglo se calcula aquí y se renderiza en el navegador con el
 *   motor propio (Tone.js). No cuesta dinero, así que el plan gratuito puede
 *   crear música de verdad desde el primer minuto. El audio sube después a
 *   Storage por `/api/songs/complete`.
 * - `provider`: API de pago con voces. Requiere `API_KEY`; sin ella la ruta
 *   responde 503 con una alternativa explícita en vez de dejar al usuario con
 *   un botón roto.
 *
 * Antes la cuota se leía y se escribía en dos peticiones separadas: dos clics
 * concurrentes leían el mismo contador y ambos pasaban. Ahora la reserva la
 * hace una RPC `security definer` con `for update`, y si el proveedor no
 * acepta, la cuota se devuelve.
 */
export async function POST(request: Request) {
  const supabase = await createClient()
  if (!supabase) return NextResponse.json({ error: SUPABASE_NOT_CONFIGURED }, { status: 503 })

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Inicia sesión para crear música.' }, { status: 401 })
  }

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null
  const title = text(body?.title, 80)
  const prompt = text(body?.prompt, 2000)
  if (!title || !prompt) {
    return NextResponse.json({ error: 'Completa el título y la dirección musical.' }, { status: 400 })
  }

  const engine = body?.engine === 'provider' ? 'provider' : 'local'
  const genre = text(body?.genre, 60)
  const lyrics = text(body?.lyrics, 4000)
  const tempo = clamp(body?.tempo, 40, 200, 0) || null
  const vocalStyle = text(body?.vocalStyle, 120)
  const instrumentation = text(body?.instrumentation, 240)
  const lessonId = text(body?.lessonId, 64)

  // Reserva atómica de cupo.
  const quota = await supabase.rpc('consume_generation_quota', { p_owner: user.id, p_engine: engine })
  const granted = (quota.data as Array<{ allowed: boolean; reason: string | null; limit_total: number; limit_used: number }> | null)?.[0]

  if (!quota.error && granted?.allowed !== true) {
    return NextResponse.json(
      { error: granted?.reason ?? 'Sin cupo disponible.', limit: granted?.limit_total ?? 0, used: granted?.limit_used ?? 0 },
      { status: 402 },
    )
  }
  if (quota.error) {
    console.error('[generate] la RPC de cuota falló', quota.error.message)
    return NextResponse.json(
      { error: 'No pudimos comprobar tu cupo. Reintenta en un momento.' },
      { status: 503 },
    )
  }

  const { data: song, error: insertError } = await supabase
    .from('songs')
    .insert({
      user_id: user.id,
      title,
      prompt,
      genre,
      tempo,
      vocal_style: vocalStyle,
      instrumentation,
      lyrics,
      engine,
      lesson_id: lessonId,
      status: 'queued',
    })
    .select('id, title, status, created_at, engine')
    .single()

  if (insertError || !song) {
    console.error('[generate] no se pudo guardar el proyecto', insertError?.message)
    await refundQuota(supabase, user.id, engine)
    return NextResponse.json(
      { error: 'No se pudo guardar tu proyecto. El cupo no se descontó.' },
      { status: 500 },
    )
  }

  if (engine === 'local') {
    // El servidor devuelve la receta, no el audio: renderizar necesita un
    // AudioContext y eso solo existe en el navegador.
    return NextResponse.json({
      song,
      render: {
        engine: 'local' as const,
        prompt,
        // Semilla derivada del id: el mismo id produce siempre el mismo arreglo.
        seed: `${LOCAL_SEED_SALT}:${song.id}`,
        genreId: text(body?.genreId, 40) ?? undefined,
        bpm: tempo ?? undefined,
        title,
      },
      message: 'Receta lista. El navegador renderiza y guarda tu canción.',
    })
  }

  const apiKey = process.env.API_KEY
  if (!apiKey) {
    // Se devuelve la reserva: si el proveedor no está configurado, nadie debe
    // pagar cupo por un intento que no podía funcionar.
    await refundQuota(supabase, user.id, engine)
    await supabase.from('songs').update({ status: 'error', error: 'Proveedor musical no configurado.' }).eq('id', song.id)
    return NextResponse.json(
      {
        song,
        error: 'El estudio con voces no está disponible ahora. Puedes crear con el motor local gratis.',
        fallback: 'local',
      },
      { status: 503 },
    )
  }

  const base = getAppUrl(request)
  if (!base) {
    await refundQuota(supabase, user.id, engine)
    await supabase.from('songs').update({ status: 'error', error: 'Falta NEXT_PUBLIC_APP_URL.' }).eq('id', song.id)
    return NextResponse.json({ error: 'Falta NEXT_PUBLIC_APP_URL para recibir el resultado.' }, { status: 503 })
  }

  const signature = await signCallbackUrl(String(song.id))
  if (!signature) {
    await refundQuota(supabase, user.id, engine)
    await supabase.from('songs').update({ status: 'error', error: 'Falta GENERATOR_CALLBACK_SECRET.' }).eq('id', song.id)
    return NextResponse.json({ error: 'El retorno del proveedor no está configurado.' }, { status: 503 })
  }

  try {
    const response = await fetch(process.env.SUNO_API_URL || 'https://api.sunoapi.org/api/v1/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      signal: AbortSignal.timeout(30_000),
      body: JSON.stringify({
        prompt,
        customMode: true,
        instrumental: body?.instrumental === true,
        model: 'V4',
        title,
        tags: genre ?? undefined,
        mv: 1,
        callBackUrl: `${base}/api/generate/callback?songId=${encodeURIComponent(String(song.id))}&sig=${signature}`,
      }),
    })

    const result = (await response.json().catch(() => null)) as { code?: number; data?: { taskId?: string } } | null

    if (!response.ok || !result?.data?.taskId) {
      throw new Error(`provider ${response.status}`)
    }

    // Se guarda la tarea: sin esto, si el callback no llega, la canción queda
    // en 'generating' para siempre y nadie puede recuperarla.
    await supabase
      .from('songs')
      .update({ status: 'generating', provider_task_id: String(result.data.taskId).slice(0, 120) })
      .eq('id', song.id)

    return NextResponse.json({ song, taskId: result.data.taskId })
  } catch (error) {
    console.error('[generate] el proveedor rechazó la petición', {
      message: error instanceof Error ? error.message : String(error),
    })
    await refundQuota(supabase, user.id, engine)
    await supabase.from('songs').update({ status: 'error', error: 'El proveedor musical no respondió.' }).eq('id', song.id)
    return NextResponse.json(
      { song, error: 'El proveedor musical no respondió. Tu proyecto quedó guardado para reintentar.' },
      { status: 502 },
    )
  }
}
