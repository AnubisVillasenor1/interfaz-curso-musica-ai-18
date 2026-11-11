import { NextResponse } from 'next/server'

import { verifyCallbackSignature } from '@/lib/callback-signature'
import { verifyCallbackSignatureBody } from '@/lib/security/hmac'
import { setTaskStatus } from '@/lib/music/task-store'
import { createAdminClient } from '@/lib/supabase/admin'

export const runtime = 'nodejs'

/**
 * Callback unificado de proveedores (`POST /api/callback`).
 *
 * Contrato manual §3/§12: el engine local y Replicate/fal POSTean
 * `{ taskId, status, audioUrl, error, metadata }` con `x-signature` =
 * HMAC-SHA256 del cuerpo crudo. El proveedor histórico (`suno`) sigue usando
 * `/api/generate/callback?songId&sig=` — este endpoint también acepta esa
 * forma si `songId` viaja en query, resolviendo la canción por `taskId`.
 * Sin firma válida no se escribe: ver `lib/callback-signature.ts`.
 */
function normalizeStatus(raw: unknown): 'ready' | 'error' | 'pending' {
  const status = String(raw ?? '').toLowerCase()
  if (['failed', 'error', 'fail'].includes(status)) return 'error'
  if (['completed', 'complete', 'succeeded', 'success', 'ready', 'done'].includes(status)) return 'ready'
  return 'pending'
}

function normalizeAudio(payload: Record<string, unknown>): { url: string | null; duration: number | null } {
  const output = payload.output
  const candidates = [
    payload.audioUrl,
    payload.audio_url,
    Array.isArray(output) ? output[0] : undefined,
    output && typeof output === 'object' ? (output as Record<string, unknown>).audio : undefined,
    (payload.metadata as Record<string, unknown> | undefined)?.audioUrl,
  ]
  const url = candidates.find((value): value is string => typeof value === 'string' && /^https?:\/\//i.test(value)) ?? null
  const metadata = (payload.metadata ?? {}) as Record<string, unknown>
  const rawDuration = metadata.duration ?? payload.duration
  const duration = Number(rawDuration)
  return { url, duration: Number.isFinite(duration) && duration > 0 && duration < 3600 ? duration : null }
}

export async function POST(request: Request) {
  const rawBody = await request.text()
  const url = new URL(request.url)
  const querySongId = url.searchParams.get('songId')
  const headerSig = request.headers.get('x-signature')
  const querySig = url.searchParams.get('sig')
  const queryExpires = url.searchParams.get('exp')
  const queryNonce = url.searchParams.get('nonce')

  const bodyOk = verifyCallbackSignatureBody(rawBody, headerSig)
  const queryReason = querySongId
    ? await verifyCallbackSignature(querySongId, querySig, queryExpires, queryNonce)
    : 'missing'
  const queryOk = queryReason === 'ok'
  if (!bodyOk && !queryOk) {
    console.warn('[callback] firma ausente o inválida', { reason: queryReason })
    return NextResponse.json({ error: 'Firma del callback inválida.', code: 'signature_invalid' }, { status: 401 })
  }

  const payload = (await (() => {
    try { return JSON.parse(rawBody) } catch { return null }
  })()) as Record<string, unknown> | null
  if (!payload) return NextResponse.json({ error: 'El cuerpo del callback no es JSON válido.', code: 'invalid_request' }, { status: 400 })

  // Cuando la autorización viene del query, la canción objetivo es la firmada.
  // Antes se resolvía por `taskId` del cuerpo, así que una URL válida para una
  // canción podía escribir en otra cuyo `provider_task_id` se conociera.
  const authorizedSongId = queryOk ? querySongId : null
  const taskId = String(payload.taskId ?? payload.id ?? payload.request_id ?? '').trim()

  if (!authorizedSongId && !taskId) {
    return NextResponse.json({ error: 'taskId es obligatorio.', code: 'invalid_request' }, { status: 400 })
  }

  const status = normalizeStatus(payload.status ?? payload.state)
  if (status === 'pending') return NextResponse.json({ received: true, ignored: 'pending' })

  const { url: audioUrl, duration } = normalizeAudio(payload)
  const errorMsg = payload.error && typeof payload.error === 'object'
    ? String((payload.error as Record<string, unknown>).message ?? payload.error)
    : String(payload.error ?? payload.errorMsg ?? '')

  const finish = async (result: string) => {
    if (result === 'db_error') {
      return NextResponse.json({ error: 'No se pudo registrar el resultado.', code: 'update_failed' }, { status: 500 })
    }

    if (authorizedSongId && queryNonce) {
      const consumed = await consumeCallbackTicket(authorizedSongId, queryNonce)
      if (consumed === 'error') {
        return NextResponse.json({ error: 'No se pudo registrar el resultado.', code: 'update_failed' }, { status: 500 })
      }
    }

    return NextResponse.json({ received: true, result })
  }

  if (status === 'ready' && !audioUrl) {
    // Terminada sin audio = error del proveedor; se registra como error para
    // no colgar la fila en generating (si la BD falla → 500 y reintento).
    return finish(await applyResult({ songId: authorizedSongId, taskId }, 'error', null, duration, 'El proveedor dio la tarea por terminada sin audio.'))
  }

  return finish(await applyResult({ songId: authorizedSongId, taskId }, status, audioUrl, duration, errorMsg || null))
}

async function consumeCallbackTicket(
  songId: string,
  nonce: string,
): Promise<'consumed' | 'replay' | 'missing' | 'error'> {
  const admin = createAdminClient()
  if (!admin) return 'error'
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
  target: { songId: string | null; taskId: string },
  status: 'ready' | 'error',
  audioUrl: string | null,
  duration: number | null,
  error: string | null,
): Promise<string> {
  if (target.taskId) {
    setTaskStatus(target.taskId, status === 'ready' ? 'completed' : 'failed', {
      audioUrl: audioUrl ?? undefined,
      error: error ?? undefined,
    })
  }

  const admin = createAdminClient()
  if (!admin) return 'db_error'

  let songId = target.songId
  if (!songId) {
    const { data: song, error: lookupError } = await admin
      .from('songs')
      .select('id')
      .eq('provider_task_id', target.taskId)
      .maybeSingle()
    if (lookupError || !song?.id) {
      console.error('[callback] canción no localizada por taskId', { taskId: target.taskId })
      return song === null ? 'not_found' : 'db_error'
    }
    songId = song.id
  }

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
