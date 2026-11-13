import { createHash, randomUUID } from 'node:crypto'
import { generateSpeech, gateway } from 'ai'
import { NextResponse } from 'next/server'

import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { enforcePolicy } from '@/lib/rate-limit'
import { SUPABASE_NOT_CONFIGURED } from '@/lib/supabase/config'
import { authorizeFeatureForUser, featureGateMessage } from '@/lib/licensing/feature-gate'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

const MAX_AUDIO_BYTES = 20_000_000
const TASK_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export async function POST(request: Request) {
  const limited = await enforcePolicy(request, 'tts', 'Has generado varias voces recientemente. Espera un momento.')
  if (limited) return limited

  const supabase = await createClient()
  if (!supabase) return NextResponse.json({ error: SUPABASE_NOT_CONFIGURED }, { status: 503 })
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Inicia sesión para generar voz.' }, { status: 401 })

  const rawLength = Number(request.headers.get('content-length') ?? 0)
  if (rawLength > 16_000) return NextResponse.json({ error: 'La solicitud es demasiado grande.' }, { status: 413 })
  const input: unknown = await request.json().catch(() => null)
  if (!isRecord(input)) return NextResponse.json({ error: 'Solicitud inválida.' }, { status: 400 })

  const profileId = typeof input.voiceProfileId === 'string' ? input.voiceProfileId : ''
  const text = typeof input.text === 'string' ? input.text.trim() : ''
  const language = input.language === 'en-US' ? 'en-US' : input.language === 'es-MX' ? 'es-MX' : null
  const speed = typeof input.speed === 'number' && Number.isFinite(input.speed) ? input.speed : 1
  const idempotencyKey = request.headers.get('Idempotency-Key')?.trim() ?? ''
  if (!TASK_ID.test(profileId) || text.length < 3 || text.length > 900 || !language || speed < 0.5 || speed > 2) {
    return NextResponse.json({ error: 'Revisa el perfil, el texto, el idioma y la velocidad.' }, { status: 400 })
  }
  if (!TASK_ID.test(idempotencyKey)) {
    return NextResponse.json({ error: 'Envía una clave Idempotency-Key UUID para evitar duplicados.' }, { status: 400 })
  }

  const admin = createAdminClient()
  if (!admin) return NextResponse.json({ error: 'El servicio de voz no está configurado.' }, { status: 503 })
  const { data: existing } = await admin
    .from('voice_generations')
    .select('task_id,status,progress,audio_object_key,content_hash,parameters')
    .eq('user_id', user.id)
    .eq('idempotency_key', idempotencyKey)
    .maybeSingle()
  if (existing) {
    return NextResponse.json(
      { taskId: existing.task_id, status: existing.status, progress: existing.progress, statusUrl: `/api/voice/generate/${existing.task_id}`, audioUrl: existing.status === 'completed' && existing.audio_object_key ? `/api/voice/generate/${existing.task_id}/audio` : undefined, contentHash: existing.content_hash ?? undefined, engine: existing.parameters?.engine },

      { status: existing.status === 'completed' ? 200 : 202, headers: { 'Cache-Control': 'private, no-store' } },
    )
  }

  const { data: profile } = await admin
    .from('voice_profiles')
    .select('id,base_voice_id,language,is_consented,status')
    .eq('id', profileId)
    .eq('user_id', user.id)
    .maybeSingle()
  if (!profile || !profile.is_consented || profile.status !== 'active') {
    return NextResponse.json({ error: 'El perfil no está activo o el consentimiento fue revocado.' }, { status: 403 })
  }
  if (profile.language !== language) return NextResponse.json({ error: 'Elige el idioma configurado en el perfil de voz.' }, { status: 400 })

  const authorization = await authorizeFeatureForUser(user.id, 'voice_identity', { consume: true, jobId: idempotencyKey })
  if (!authorization.ok) return NextResponse.json({ error: featureGateMessage(authorization.code), code: authorization.code }, { status: authorization.status })

  const voiceServiceUrl = process.env.VOICE_IDENTITY_URL?.trim()
  const internalToken = process.env.AUDIOCORE_INTERNAL_TOKEN?.trim()

  const taskId = randomUUID()
  const { error: insertError } = await admin.from('voice_generations').insert({
    task_id: taskId,
    voice_profile_id: profile.id,
    user_id: user.id,
    text,
    language,
    parameters: { engine: 'kokoro', speed },
    idempotency_key: idempotencyKey,
    status: 'processing',
    progress: 10,
  })
  if (insertError) {
    if (insertError.code === '23505') {
      const { data: raced } = await admin.from('voice_generations').select('task_id,status,progress,audio_object_key,content_hash,parameters').eq('user_id', user.id).eq('idempotency_key', idempotencyKey).maybeSingle()
      if (raced) return NextResponse.json({ taskId: raced.task_id, status: raced.status, progress: raced.progress, statusUrl: `/api/voice/generate/${raced.task_id}`, audioUrl: raced.status === 'completed' && raced.audio_object_key ? `/api/voice/generate/${raced.task_id}/audio` : undefined, contentHash: raced.content_hash ?? undefined, engine: raced.parameters?.engine }, { status: raced.status === 'completed' ? 200 : 202, headers: { 'Cache-Control': 'private, no-store' } })
    }
    return NextResponse.json({ error: 'No se pudo registrar la generación.' }, { status: 503 })
  }

  try {
    let audio: Buffer
    let audioMimeType: 'audio/wav' | 'audio/mpeg'
    let engine: 'kokoro' | 'vercel-gateway-fallback'

    try {
      if (!voiceServiceUrl || !internalToken) throw new Error('local_voice_not_configured')
      const response = await fetch(new URL('/v1/speak', voiceServiceUrl), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-internal-token': internalToken },
        body: JSON.stringify({ text, language, speed, voice: profile.base_voice_id }),
        signal: AbortSignal.timeout(50_000),
        cache: 'no-store',
      })
      const contentLength = Number(response.headers.get('content-length') ?? 0)
      if (!response.ok || contentLength > MAX_AUDIO_BYTES || !response.headers.get('content-type')?.toLowerCase().includes('audio/wav')) {
        throw new Error('voice_service_unavailable')
      }
      audio = Buffer.from(await response.arrayBuffer())
      audioMimeType = 'audio/wav'
      engine = 'kokoro'
    } catch {
      const fallback = await generateSpeech({
        model: gateway.speech('elevenlabs/eleven-flash-v2.5'),
        text,
        voice: 'Rachel',
        language: language === 'es-MX' ? 'es' : 'en',
        outputFormat: 'mp3',
        maxRetries: 1,
      })
      audio = Buffer.from(fallback.audio.uint8Array)
      audioMimeType = 'audio/mpeg'
      engine = 'vercel-gateway-fallback'
    }

    if (!audio.length || audio.length > MAX_AUDIO_BYTES) throw new Error('invalid_audio_size')
    const { data: currentProfile } = await admin
      .from('voice_profiles')
      .select('is_consented,status')
      .eq('id', profile.id)
      .eq('user_id', user.id)
      .maybeSingle()
    if (!currentProfile?.is_consented || currentProfile.status !== 'active') {
      await admin.from('voice_generations').update({ status: 'cancelled', progress: 0, error_message: 'consent_revoked' }).eq('task_id', taskId).eq('user_id', user.id).eq('status', 'processing')
      return NextResponse.json({ error: 'El consentimiento fue revocado durante la generación.' }, { status: 403 })
    }

    const extension = audioMimeType === 'audio/wav' ? 'wav' : 'mp3'
    const objectKey = `${user.id}/voice/${taskId}.${extension}`
    const { error: storageError } = await admin.storage.from('song-audio').upload(objectKey, audio, {
      contentType: audioMimeType,
      cacheControl: '0',
      upsert: false,
    })
    if (storageError) throw new Error('voice_storage_unavailable')

    const contentHash = createHash('sha256').update(audio).digest('hex')
    const { data: updatedGeneration, error: updateError } = await admin
      .from('voice_generations')
      .update({
        status: 'completed',
        progress: 100,
        parameters: { engine, speed },
        audio_bucket: 'song-audio',
        audio_object_key: objectKey,
        audio_mime_type: audioMimeType,
        byte_size: audio.length,
        content_hash: contentHash,
        completed_at: new Date().toISOString(),
      })
      .eq('task_id', taskId)
      .eq('user_id', user.id)
      .eq('status', 'processing')
      .select('task_id')
      .maybeSingle()
    if (updateError || !updatedGeneration) {
      await admin.storage.from('song-audio').remove([objectKey])
      throw new Error('voice_persistence_unavailable')
    }

    return NextResponse.json(
      { taskId, status: 'completed', progress: 100, engine, audioUrl: `/api/voice/generate/${taskId}/audio`, contentHash },
      { status: 201, headers: { 'Cache-Control': 'private, no-store' } },
    )
  } catch {
    await admin.from('voice_generations').update({ status: 'failed', progress: 0, error_message: 'voice_generation_failed' }).eq('task_id', taskId).eq('user_id', user.id).eq('status', 'processing')
    return NextResponse.json({ error: 'No se pudo generar el audio. Intenta de nuevo con una clave nueva.' }, { status: 502 })
  }
}
