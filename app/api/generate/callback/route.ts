import { NextResponse } from 'next/server'

import { verifyCallbackSignature } from '@/lib/callback-signature'
import { createAdminClient } from '@/lib/supabase/admin'

export const runtime = 'nodejs'

/**
 * Retorno del proveedor de pago (sunoapi.org).
 *
 * La versión anterior era pública y no verificaba nada: comprobaba que el
 * `songId` tuviera forma de UUID y escribía con `service_role` cualquier
 * `audio_url` que llegara en el cuerpo. Conocer un identificador —el tráfico de
 * la propia sesión, un log, cualquier fuga— bastaba para sustituir el audio de
 * otra persona por una URL arbitraria. Eso es inyección de contenido en la
 * biblioteca ajena, y se servía con un 200 que parecía éxito.
 *
 * El proveedor no firma sus notificaciones, así que firmamos nosotros la URL
 * que le entregamos: sin el HMAC del `songId` no se toca la fila.
 */

/** El proveedor manda el estado en campos distintos según el modelo. */
function readStatus(payload: Record<string, unknown>): 'ready' | 'error' | 'pending' {
  const raw = String(payload.status ?? payload.state ?? payload.taskStatus ?? '').toLowerCase()
  if (['error', 'failed', 'fail'].includes(raw)) return 'error'
  if (['success', 'complete', 'completed', 'succeeded', 'end', 'ready'].includes(raw)) return 'ready'
  return 'pending'
}

function readAudio(payload: Record<string, unknown>): { url: string | null; duration: number | null } {
  const data = (payload.data ?? payload) as Record<string, unknown>
  const candidates = [
    data.audio_url,
    data.audioUrl,
    payload.audio_url,
    payload.audioUrl,
  ]
  const url = candidates.find((value): value is string => typeof value === 'string' && /^https?:\/\//i.test(value)) ?? null

  const rawDuration = data.duration ?? payload.duration ?? data.durationSeconds ?? null
  const duration = Number(rawDuration)
  return { url, duration: Number.isFinite(duration) && duration > 0 && duration < 3600 ? duration : null }
}

export async function POST(request: Request) {
  const admin = createAdminClient()
  if (!admin) {
    // Responder 500 hace que Stripe… no, hace que el proveedor reintente. Sin
    // credenciales no hay nada que reintentar, pero un 200 enterraría el audio.
    return NextResponse.json({ error: 'El callback no puede procesarse en este entorno.', code: 'not_configured' }, { status: 503 })
  }

  const url = new URL(request.url)
  const songId = url.searchParams.get('songId') ?? url.searchParams.get('id')
  const signature = url.searchParams.get('sig')
  const expiresAt = url.searchParams.get('exp')
  const nonce = url.searchParams.get('nonce')

  if (!songId || !/^[0-9a-f-]{36}$/i.test(songId)) {
    return NextResponse.json({ error: 'Falta el identificador de canción.', code: 'invalid_request' }, { status: 400 })
  }

  const signatureReason = await verifyCallbackSignature(songId, signature, expiresAt, nonce)
  if (signatureReason !== 'ok') {
    console.warn('[callback] firma rechazada', {
      songId,
      reason: signatureReason,
      event: 'callback_signature_rejected',
    })
    return NextResponse.json(
      {
        error: 'Firma del callback inválida o expirada.',
        code: signatureReason === 'expired' ? 'signature_expired' : 'signature_invalid',
      },
      { status: 401 },
    )
  }

  const payload = (await request.json().catch(() => null)) as Record<string, unknown> | null
  if (!payload) return NextResponse.json({ error: 'El cuerpo del callback no es JSON válido.', code: 'invalid_request' }, { status: 400 })

  const status = readStatus(payload)
  if (status === 'pending') {
    // El proveedor notifica también mientras la tarea sigue viva. Un 200 sin
    // escribir deja la fila en 'generating' y el reintento natural llega igual.
    return NextResponse.json({ received: true, ignored: 'pending' })
  }

  const { url: audioUrl, duration } = readAudio(payload)

  const finish = async (result: string) => {
    // Un fallo de base de datos debe reintento: devolvemos 500 para que el
    // proveedor vuelva a llamar en vez de perder el audio que ya pagamos.
    if (result === 'db_error') {
      return NextResponse.json({ error: 'No se pudo registrar el resultado.', code: 'update_failed' }, { status: 500 })
    }

    // El nonce se consume sólo cuando el resultado terminal ya está aplicado.
    // Si la escritura falla, el ticket sigue vivo y el reintento del proveedor
    // puede completar la tarea.
    const ticket = await consumeCallbackTicket(admin, nonce as string, songId)
    if (ticket === 'error') {
      return NextResponse.json({ error: 'No se pudo registrar el resultado.', code: 'update_failed' }, { status: 500 })
    }
    return NextResponse.json({
      received: true,
      result,
      ...(ticket === 'replay' ? { duplicate: true } : {}),
    })
  }

  if (status === 'ready' && !audioUrl) {
    // "Terminada sin audio" es un error del proveedor, no un estado propio: si
    // la dejáramos en generating se quedaría colgada para siempre.
    return finish(await applyResult(admin, songId, 'error', null, duration, 'El proveedor dio la tarea por terminada sin audio.'))
  }

  return finish(await applyResult(admin, songId, status, audioUrl, duration, String(payload.errorMsg ?? payload.error ?? '')))
}

/**
 * Marca el ticket como usado dentro de la base.
 *
 * `consumed` y `replay` son respuestas válidas: el primero consume el nonce,
 * el segundo demuestra que ya se consumió. `missing` indica que el ticket no
 * existe (despliegue sin la migración), se registra pero no invalida un
 * resultado que ya se aplicó con firma válida.
 */
async function consumeCallbackTicket(
  admin: NonNullable<ReturnType<typeof createAdminClient>>,
  nonce: string,
  songId: string,
): Promise<'consumed' | 'replay' | 'missing' | 'error'> {
  const { data, error } = await admin.rpc('consume_generation_callback_ticket', {
    p_nonce: nonce,
    p_song_id: songId,
  })
  if (error) {
    console.error('[callback] consume_generation_callback_ticket falló', {
      code: error.code,
      message: error.message,
    })
    return 'error'
  }
  const outcome = String(data ?? '')
  if (outcome === 'consumed' || outcome === 'replay') return outcome
  console.error('[callback] ticket de callback no consumido', { outcome, songId })
  return 'missing'
}

async function applyResult(
  admin: NonNullable<ReturnType<typeof createAdminClient>>,
  songId: string,
  status: 'ready' | 'error',
  audioUrl: string | null,
  duration: number | null,
  error: string | null,
): Promise<string> {
  const { data, error: rpcError } = await admin.rpc('apply_generation_result', {
    p_song_id: songId,
    p_status: status,
    p_audio_url: audioUrl,
    p_duration: duration,
    p_error: error || null,
  })

  if (rpcError) {
    console.error('[callback] apply_generation_result falló', rpcError.message)
    return 'db_error'
  }
  return String(data ?? 'unknown')
}
