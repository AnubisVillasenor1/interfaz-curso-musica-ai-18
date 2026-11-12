import { NextResponse } from 'next/server'

import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { enforcePolicy } from '@/lib/rate-limit'
import { SUPABASE_NOT_CONFIGURED } from '@/lib/supabase/config'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const CONSENT_VERSION = 'tamv-voice-identity-2026-11-v1'
const CONSENT_TEXT =
  'Acepto utilizar únicamente el preset de voz sintética configurado por el servicio. Entiendo que esta versión no clona voces a partir de muestras ni permite imitar a terceros. Usaré el resultado de forma responsable y respetaré los derechos de otras personas.'

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

async function getUser() {
  const supabase = await createClient()
  if (!supabase) return { user: null, configured: false }
  const { data: { user } } = await supabase.auth.getUser()
  return { user, configured: true }
}

export async function GET(request: Request) {
  const { user, configured } = await getUser()
  if (!configured) return NextResponse.json({ error: SUPABASE_NOT_CONFIGURED }, { status: 503 })
  if (!user) return NextResponse.json({ error: 'Inicia sesión para ver tus perfiles de voz.' }, { status: 401 })
  const admin = createAdminClient()
  if (!admin) return NextResponse.json({ error: 'El servicio de voz no está configurado.' }, { status: 503 })

  const { data, error } = await admin
    .from('voice_profiles')
    .select('id,name,description,language,base_voice_id,is_consented,status,created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(20)
  if (error) return NextResponse.json({ error: 'No se pudieron cargar los perfiles de voz.' }, { status: 503 })
  return NextResponse.json({ profiles: data ?? [] }, { headers: { 'Cache-Control': 'private, no-store' } })
}

export async function POST(request: Request) {
  const limited = await enforcePolicy(request, 'tts', 'Has creado varios perfiles recientemente. Espera un momento.')
  if (limited) return limited

  const { user, configured } = await getUser()
  if (!configured) return NextResponse.json({ error: SUPABASE_NOT_CONFIGURED }, { status: 503 })
  if (!user) return NextResponse.json({ error: 'Inicia sesión para crear un perfil de voz.' }, { status: 401 })

  const rawLength = Number(request.headers.get('content-length') ?? 0)
  if (rawLength > 8_000) return NextResponse.json({ error: 'La solicitud es demasiado grande.' }, { status: 413 })
  const input: unknown = await request.json().catch(() => null)
  if (!isRecord(input)) return NextResponse.json({ error: 'Solicitud inválida.' }, { status: 400 })
  const name = typeof input.name === 'string' ? input.name.trim() : ''
  const description = typeof input.description === 'string' ? input.description.trim() : ''
  const language = input.language === 'en-US' ? 'en-US' : input.language === 'es-MX' ? 'es-MX' : null
  if (name.length < 2 || name.length > 80 || description.length > 300 || !language) {
    return NextResponse.json({ error: 'Revisa el nombre, la descripción y el idioma del perfil.' }, { status: 400 })
  }
  if (input.consentAccepted !== true) {
    return NextResponse.json({ error: 'Debes aceptar el uso responsable del preset sintético.' }, { status: 400 })
  }

  const baseVoiceId = (language === 'en-US' ? process.env.KOKORO_VOICE_ID_EN : process.env.KOKORO_VOICE_ID)?.trim()
  if (!baseVoiceId) return NextResponse.json({ error: `No hay un preset Kokoro configurado para ${language}.` }, { status: 503 })
  const admin = createAdminClient()
  if (!admin) return NextResponse.json({ error: 'El servicio de voz no está configurado.' }, { status: 503 })

  const { data: profile, error: profileError } = await admin
    .from('voice_profiles')
    .insert({
      user_id: user.id,
      name,
      description: description || null,
      language,
      base_voice_id: baseVoiceId,
      characteristics: { speed: 1, engine: 'kokoro' },
      is_consented: true,
      consent_version: CONSENT_VERSION,
      consented_at: new Date().toISOString(),
      status: 'active',
    })
    .select('id,name,description,language,base_voice_id,is_consented,status,created_at')
    .single()

  if (profileError || !profile) {
    const duplicate = profileError?.code === '23505'
    return NextResponse.json(
      { error: duplicate ? 'Ya tienes un perfil con ese nombre.' : 'No se pudo guardar el perfil de voz.' },
      { status: duplicate ? 409 : 503 },
    )
  }

  const { error: consentError } = await admin.from('voice_consents').insert({
    user_id: user.id,
    voice_profile_id: profile.id,
    consent_type: 'synthetic_preset_use',
    consent_text: CONSENT_TEXT,
    consent_version: CONSENT_VERSION,
  })
  if (consentError) {
    await admin.from('voice_profiles').update({ is_consented: false, status: 'revoked' }).eq('id', profile.id).eq('user_id', user.id)
    return NextResponse.json({ error: 'No se pudo registrar el consentimiento; el perfil quedó desactivado.' }, { status: 503 })
  }

  return NextResponse.json({ profile }, { status: 201, headers: { 'Cache-Control': 'private, no-store' } })
}

export async function PATCH(request: Request) {
  const limited = await enforcePolicy(request, 'tts', 'Espera un momento antes de revocar otro perfil.')
  if (limited) return limited

  const { user, configured } = await getUser()
  if (!configured) return NextResponse.json({ error: SUPABASE_NOT_CONFIGURED }, { status: 503 })
  if (!user) return NextResponse.json({ error: 'Inicia sesión para revocar el consentimiento.' }, { status: 401 })
  const input: unknown = await request.json().catch(() => null)
  const profileId = isRecord(input) && typeof input.profileId === 'string' ? input.profileId : ''
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(profileId)) {
    return NextResponse.json({ error: 'Perfil de voz inválido.' }, { status: 400 })
  }
  const admin = createAdminClient()
  if (!admin) return NextResponse.json({ error: 'El servicio de voz no está configurado.' }, { status: 503 })

  const { data: profile } = await admin.from('voice_profiles').select('id').eq('id', profileId).eq('user_id', user.id).maybeSingle()
  if (!profile) return NextResponse.json({ error: 'Perfil no encontrado.' }, { status: 404 })
  const { error: revokeError } = await admin
    .from('voice_profiles')
    .update({ is_consented: false, status: 'revoked', updated_at: new Date().toISOString() })
    .eq('id', profileId)
    .eq('user_id', user.id)
  if (revokeError) return NextResponse.json({ error: 'No se pudo revocar el perfil.' }, { status: 503 })

  const { data: generations } = await admin
    .from('voice_generations')
    .select('audio_object_key')
    .eq('voice_profile_id', profileId)
    .eq('user_id', user.id)
    .eq('audio_bucket', 'song-audio')
  const objectKeys = (generations ?? []).map((item) => item.audio_object_key).filter((key): key is string => typeof key === 'string' && key.startsWith(`${user.id}/voice/`))
  if (objectKeys.length) {
    const { error: storageError } = await admin.storage.from('song-audio').remove(objectKeys)
    if (storageError) return NextResponse.json({ error: 'El consentimiento quedó revocado, pero no se pudo retirar todo el audio. Intenta revocar de nuevo para completar el borrado.' }, { status: 503 })
  }

  await admin
    .from('voice_generations')
    .update({ status: 'cancelled', progress: 0, audio_bucket: null, audio_object_key: null, audio_mime_type: null, byte_size: null, content_hash: null })
    .eq('voice_profile_id', profileId)
    .eq('user_id', user.id)
  await admin.from('voice_consents').insert({
    user_id: user.id,
    voice_profile_id: profileId,
    consent_type: 'consent_revoked',
    consent_text: 'La persona usuaria revocó el consentimiento y solicitó desactivar el perfil y retirar el audio generado asociado.',
    consent_version: CONSENT_VERSION,
  })

  return NextResponse.json({ revoked: true }, { headers: { 'Cache-Control': 'private, no-store' } })
}
