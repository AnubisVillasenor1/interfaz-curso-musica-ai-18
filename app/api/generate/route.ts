import { NextResponse } from 'next/server'

import { getAppUrl } from '@/lib/app-url'
import { isAdminUser } from '@/lib/admin-access'
import { signCallbackUrl } from '@/lib/callback-signature'
import { COURSE_LESSONS } from '@/lib/course'
import { createTask, setTaskStatus } from '@/lib/music/task-store'
import { getMusicProvider } from '@/lib/music/providers'
import { isNotConfigured } from '@/lib/music/providers/errors'
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
 * - `provider`: delega en el proveedor activo (`MUSIC_PROVIDER`, ver
 *   `lib/music/providers/`): `suno` (histórico), `huggingface`, `replicate`,
 *   `fal` o `local` (Ace-Step/YuE en servidor propio). Sin claves la ruta
 *   responde 503 con alternativa local en vez de un botón roto.
 *
 * Antes la cuota se leía y se escribía en dos peticiones separadas: dos clics
 * concurrentes leían el mismo contador y ambos pasaban. Ahora la reserva la
 * hace una RPC `security definer` con `for update`, y si el proveedor no
 * acepta, la cuota se devuelve.
 */
export async function POST(request: Request) {
  const supabase = await createClient()
  if (!supabase) return NextResponse.json({ error: SUPABASE_NOT_CONFIGURED, code: 'not_configured' }, { status: 503 })

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Inicia sesión para crear música.', code: 'unauthorized' }, { status: 401 })
  }

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null
  const title = text(body?.title, 80)
  const prompt = text(body?.prompt, 2000)
  if (!title || !prompt) {
    return NextResponse.json({ error: 'Completa el título y la dirección musical.', code: 'invalid_request' }, { status: 400 })
  }

  const engine = body?.engine === 'provider' ? 'provider' : 'local'
  const genre = text(body?.genre, 60)
  const lyrics = text(body?.lyrics, 4000)
  const tempo = clamp(body?.tempo, 40, 200, 0) || null
  const vocalStyle = text(body?.vocalStyle, 120)
  const instrumentation = text(body?.instrumentation, 240)
  const lessonId = text(body?.lessonId, 64)
  // El lesson_id se valida contra el catálogo, igual que en `/api/progress`:
  // sin lista blanca, cualquier cadena persistía en `songs.lesson_id` y
  // rompía joins/progreso del curso.
  const validLessonId = lessonId && COURSE_LESSONS.some((lesson) => lesson.id === lessonId) ? lessonId : null

  // La cuenta propietaria usa el mismo flujo de seguridad, pero no consume cupo.
  // El privilegio depende únicamente del email verificado por Supabase, nunca del
  // cuerpo de la petición ni de metadata editable desde el navegador.
  const adminAccount = isAdminUser(user)
  const quota = adminAccount ? { data: null, error: null } : await supabase.rpc('consume_generation_quota', { p_owner: user.id, p_engine: engine })
  const granted = adminAccount
    ? { allowed: true, reason: null, limit_total: 999999, limit_used: 0 }
    : (quota.data as Array<{ allowed: boolean; reason: string | null; limit_total: number; limit_used: number }> | null)?.[0]

  if (!quota.error && granted?.allowed !== true) {
    return NextResponse.json(
      { error: granted?.reason ?? 'Sin cupo disponible.', code: 'quota_exceeded', limit: granted?.limit_total ?? 0, used: granted?.limit_used ?? 0 },
      { status: 402 },
    )
  }
  if (quota.error) {
    console.error('[generate] la RPC de cuota falló', quota.error.message)
    return NextResponse.json(
      { error: 'No pudimos comprobar tu cupo. Reintenta en un momento.', code: 'quota_unavailable' },
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
      lesson_id: validLessonId,
      status: 'queued',
    })
    .select('id, title, status, created_at, engine')
    .single()

  if (insertError || !song) {
    console.error('[generate] no se pudo guardar el proyecto', insertError?.message)
    await refundQuota(supabase, user.id, engine)
    return NextResponse.json(
      { error: 'No se pudo guardar tu proyecto. El cupo no se descontó.', code: 'storage_error' },
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
      quota: { limit: granted?.limit_total ?? 0, used: granted?.limit_used ?? 0 },
    })
  }

  // El callback es la única vía de vuelta: sin URL canónica o sin secreto de
  // firma ningún proveedor puede devolver el audio. No se cobra cupo por un
  // intento que no podría completarse.
  const base = getAppUrl(request)
  if (!base) {
    await refundQuota(supabase, user.id, engine)
    console.error('[generate] NEXT_PUBLIC_APP_URL sin definir: no hay retorno para el proveedor')
    await supabase.from('songs').update({ status: 'error', error: 'El retorno del proveedor no está configurado.' }).eq('id', song.id)
    return NextResponse.json(
      { error: 'El estudio con voces no está disponible ahora mismo. Puedes crear con el motor local gratis.', code: 'not_configured', fallback: 'local' },
      { status: 503 },
    )
  }

  const signature = await signCallbackUrl(String(song.id))
  if (!signature) {
    await refundQuota(supabase, user.id, engine)
    console.error('[generate] GENERATOR_CALLBACK_SECRET sin definir: el callback no se puede firmar')
    await supabase.from('songs').update({ status: 'error', error: 'El retorno del proveedor no está configurado.' }).eq('id', song.id)
    return NextResponse.json(
      { error: 'El estudio con voces no está disponible ahora mismo. Puedes crear con el motor local gratis.', code: 'not_configured', fallback: 'local' },
      { status: 503 },
    )
  }

  let provider
  try {
    provider = getMusicProvider()
  } catch (error) {
    if (isNotConfigured(error)) {
      await refundQuota(supabase, user.id, engine)
      console.error('[generate] proveedor no configurado', error instanceof Error ? error.message : String(error))
      await supabase.from('songs').update({ status: 'error', error: 'Proveedor musical no configurado.' }).eq('id', song.id)
      return NextResponse.json(
        {
          song,
          error: 'El estudio con voces no está disponible ahora. Puedes crear con el motor local gratis.',
          code: 'not_configured',
          fallback: 'local',
        },
        { status: 503 },
      )
    }
    throw error
  }

  // `suno` habla el contrato histórico (songId+sig en query → /api/generate/callback);
  // el resto POSTea JSON firmada por cuerpo a `/api/callback`.
  const callbackUrl =
    provider.id === 'suno'
      ? `${base}/api/generate/callback?songId=${encodeURIComponent(String(song.id))}&sig=${signature}`
      : `${base}/api/callback`

  const failSong = async (message: string) => {
    await supabase.from('songs').update({ status: 'error', error: message }).eq('id', song.id)
  }

  try {
    const result = await provider.generate({
      prompt,
      lyrics: lyrics ?? undefined,
      customMode: true,
      instrumental: body?.instrumental === true,
      duration: clamp(body?.duration, 5, 120, 30),
      callbackUrl,
      title,
      genre: genre ?? undefined,
    })

    createTask({
      taskId: result.taskId,
      provider: result.provider,
      model: result.model,
      request: { prompt, lyrics: lyrics ?? undefined, instrumental: body?.instrumental === true, duration: clamp(body?.duration, 5, 120, 30), callbackUrl, title, genre: genre ?? undefined },
    })

    // Proveedor síncrono (Hugging Face): el audio ya existe, la fila queda lista.
    if (result.audioUrl) {
      await supabase.from('songs').update({ status: 'ready', audio_url: result.audioUrl, provider_task_id: result.taskId }).eq('id', song.id)
      setTaskStatus(result.taskId, 'completed', { audioUrl: result.audioUrl, model: result.model })
      return NextResponse.json({
        song,
        taskId: result.taskId,
        data: { taskId: result.taskId },
        provider: result.provider,
        model: result.model,
        status: 'completed',
        quota: { limit: granted?.limit_total ?? 0, used: granted?.limit_used ?? 0 },
      })
    }

    // Se guarda la tarea: sin esto, si el callback no llega, la canción queda
    // en 'generating' para siempre y nadie puede recuperarla.
    await supabase
      .from('songs')
      .update({ status: 'generating', provider_task_id: result.taskId.slice(0, 120) })
      .eq('id', song.id)

    return NextResponse.json({
      song,
      taskId: result.taskId,
      data: { taskId: result.taskId },
      provider: result.provider,
      model: result.model,
      quota: { limit: granted?.limit_total ?? 0, used: granted?.limit_used ?? 0 },
    })
  } catch (error) {
    if (isNotConfigured(error)) {
      await refundQuota(supabase, user.id, engine)
      await failSong('Proveedor musical no configurado.')
      return NextResponse.json(
        {
          song,
          error: 'El estudio con voces no está disponible ahora. Puedes crear con el motor local gratis.',
          code: 'not_configured',
          fallback: 'local',
        },
        { status: 503 },
      )
    }
    console.error('[generate] el proveedor rechazó la petición', {
      message: error instanceof Error ? error.message : String(error),
      provider: provider.id,
    })
    await refundQuota(supabase, user.id, engine)
    await failSong('El proveedor musical no respondió.')
    return NextResponse.json(
      { song, error: 'El proveedor musical no respondió. Tu proyecto quedó guardado para reintentar.', code: 'provider_unreachable' },
      { status: 502 },
    )
  }
}
