import { randomUUID } from 'node:crypto'
import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { SUPABASE_NOT_CONFIGURED } from '@/lib/supabase/config'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type Parameters = {
  temperature: number
  guidanceScale: number
  durationSeconds: number
  sampleRate: 32000 | 44100 | 48000
  spectralAnalysis: boolean
  seed?: number
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
function boundedNumber(value: unknown, fallback: number, min: number, max: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return fallback
  return Math.min(max, Math.max(min, value))
}

export async function POST(request: Request) {
  const supabase = await createClient()
  if (!supabase) return NextResponse.json({ error: SUPABASE_NOT_CONFIGURED, code: 'not_configured' }, { status: 503 })
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Inicia sesión para generar audio.', code: 'unauthorized' }, { status: 401 })

  const body: unknown = await request.json().catch(() => null)
  if (!isRecord(body)) return NextResponse.json({ error: 'El cuerpo debe ser un objeto JSON.', code: 'invalid_request' }, { status: 400 })
  const prompt = typeof body.prompt === 'string' ? body.prompt.trim() : ''
  if (prompt.length < 3 || prompt.length > 2000) {
    return NextResponse.json({ error: 'El prompt debe contener entre 3 y 2000 caracteres.', code: 'invalid_prompt' }, { status: 400 })
  }
  // MusicGen is an instrumental model. Reject unsupported modes instead of claiming to generate vocals.
  if (body.mode !== undefined && body.mode !== 'instrumental') {
    return NextResponse.json({ error: 'El motor MusicGen configurado solo admite música instrumental.', code: 'unsupported_mode' }, { status: 422 })
  }
  const raw = isRecord(body.parameters) ? body.parameters : {}
  const sampleRate = raw.sampleRate === 44100 || raw.sampleRate === 48000 ? raw.sampleRate : 32000
  const parameters: Parameters = {
    temperature: boundedNumber(raw.temperature, 1, 0, 1.5),
    guidanceScale: boundedNumber(raw.guidanceScale, 3, 1, 10),
    durationSeconds: Math.round(boundedNumber(raw.durationSeconds, 15, 5, 30)),
    sampleRate,
    spectralAnalysis: raw.spectralAnalysis !== false,
    ...(Number.isInteger(raw.seed) && (raw.seed as number) >= 0 && (raw.seed as number) <= 2147483647 ? { seed: raw.seed as number } : {}),
  }

  const admin = createAdminClient()
  if (!admin) return NextResponse.json({ error: 'El servicio de generación no está configurado.', code: 'not_configured' }, { status: 503 })

  const idempotencyKey = request.headers.get('idempotency-key') ?? ''
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(idempotencyKey)) {
    return NextResponse.json({ error: 'Envía una clave Idempotency-Key UUID para evitar generaciones duplicadas.', code: 'idempotency_key_required' }, { status: 400 })
  }
  const { data: existing } = await supabase.from('audio_generation_tasks')
    .select('task_id,status,progress').eq('user_id', user.id).eq('idempotency_key', idempotencyKey).maybeSingle()
  if (existing) {
    if (existing.status === 'failed' || existing.status === 'cancelled') {
      return NextResponse.json({ error: 'La solicitud anterior terminó sin completarse. Genera una nueva clave para reintentar.', code: 'idempotency_key_used' }, { status: 409 })
    }
    return NextResponse.json({ taskId: existing.task_id, status: existing.status, progress: existing.progress, statusUrl: '/api/generation/' + existing.task_id }, { status: 202, headers: { 'Cache-Control': 'no-store' } })
  }
  // Use the existing atomic local-generation quota. Refund if persistence/enqueue fails.
  const { data: quotaRows, error: quotaError } = await supabase.rpc('consume_generation_quota', { p_owner: user.id, p_engine: 'local' })
  const quota = Array.isArray(quotaRows) ? quotaRows[0] as { allowed: boolean; reason: string | null } | undefined : undefined
  if (quotaError) return NextResponse.json({ error: 'No fue posible comprobar el cupo.', code: 'quota_unavailable' }, { status: 503 })
  if (!quota?.allowed) return NextResponse.json({ error: quota?.reason ?? 'Cupo diario agotado.', code: 'quota_exceeded' }, { status: 402 })

  const taskId = randomUUID()
  const { error: insertError } = await admin.from('audio_generation_tasks').insert({
    task_id: taskId, user_id: user.id, federation_id: 'FED-01', idempotency_key: idempotencyKey,
    prompt, mode: 'instrumental', status: 'queued', progress: 0, parameters,
  })
  if (insertError) {
    await supabase.rpc('refund_generation_quota', { p_owner: user.id, p_engine: 'local' })
    const { data: raced } = await supabase.from('audio_generation_tasks')
      .select('task_id,status,progress').eq('user_id', user.id).eq('idempotency_key', idempotencyKey).maybeSingle()
    if (raced && raced.status !== 'failed' && raced.status !== 'cancelled') {
      return NextResponse.json({ taskId: raced.task_id, status: raced.status, progress: raced.progress, statusUrl: '/api/generation/' + raced.task_id }, { status: 202, headers: { 'Cache-Control': 'no-store' } })
    }
    console.error('[generation] task insert failed', insertError.message)
    return NextResponse.json({ error: 'No se pudo registrar la tarea.', code: 'persistence_error' }, { status: 500 })
  }

  const gatewayUrl = process.env.AUDIO_QUEUE_GATEWAY_URL
  const token = process.env.GATEWAY_INTERNAL_TOKEN
  if (!gatewayUrl || !token) {
    await admin.from('audio_generation_tasks').update({ status: 'failed', error_message: 'Gateway de audio no configurado.', completed_at: new Date().toISOString() }).eq('task_id', taskId)
    await supabase.rpc('refund_generation_quota', { p_owner: user.id, p_engine: 'local' })
    return NextResponse.json({ error: 'El gateway de audio no está configurado.', code: 'gateway_not_configured' }, { status: 503 })
  }

  try {
    const response = await fetch(new URL('/v1/jobs', gatewayUrl), {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
      body: JSON.stringify({ taskId, userId: user.id, prompt, mode: 'instrumental', parameters }),
      signal: AbortSignal.timeout(8000),
      cache: 'no-store',
    })
    if (!response.ok) throw new Error(`Gateway respondió HTTP ${response.status}`)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Gateway unavailable'
    await admin.from('audio_generation_tasks').update({ status: 'failed', error_message: 'No se pudo encolar la generación.', completed_at: new Date().toISOString() }).eq('task_id', taskId)
    await supabase.rpc('refund_generation_quota', { p_owner: user.id, p_engine: 'local' })
    console.error('[generation] enqueue failed', message)
    return NextResponse.json({ error: 'No se pudo encolar el trabajo. El cupo fue devuelto.', code: 'enqueue_failed' }, { status: 503 })
  }

  return NextResponse.json({ taskId, status: 'queued', progress: 0, statusUrl: `/api/generation/${taskId}` }, { status: 202, headers: { 'Cache-Control': 'no-store' } })
}
