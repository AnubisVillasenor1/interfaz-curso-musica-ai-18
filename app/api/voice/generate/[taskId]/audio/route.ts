import { NextResponse } from 'next/server'

import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { SUPABASE_NOT_CONFIGURED } from '@/lib/supabase/config'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type Props = { params: Promise<{ taskId: string }> }

export async function GET(_request: Request, { params }: Props) {
  const { taskId } = await params
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(taskId)) {
    return NextResponse.json({ error: 'Identificador de generación inválido.' }, { status: 400 })
  }
  const supabase = await createClient()
  if (!supabase) return NextResponse.json({ error: SUPABASE_NOT_CONFIGURED }, { status: 503 })
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Inicia sesión para escuchar esta voz.' }, { status: 401 })
  const admin = createAdminClient()
  if (!admin) return NextResponse.json({ error: 'El servicio de voz no está configurado.' }, { status: 503 })

  const { data: generation, error } = await admin
    .from('voice_generations')
    .select('voice_profile_id,status,audio_bucket,audio_object_key,audio_mime_type')
    .eq('task_id', taskId)
    .eq('user_id', user.id)
    .maybeSingle()
  if (error) return NextResponse.json({ error: 'No se pudo verificar el audio.' }, { status: 503 })
  if (!generation) return NextResponse.json({ error: 'Generación no encontrada.' }, { status: 404 })
  if (generation.status !== 'completed' || generation.audio_bucket !== 'song-audio' || typeof generation.audio_object_key !== 'string' || !generation.audio_object_key.startsWith(`${user.id}/voice/`)) {
    return NextResponse.json({ error: 'El audio no está disponible.' }, { status: 404 })
  }
  const { data: profile } = await admin.from('voice_profiles').select('is_consented,status').eq('id', generation.voice_profile_id).eq('user_id', user.id).maybeSingle()
  if (!profile?.is_consented || profile.status !== 'active') {
    return NextResponse.json({ error: 'El consentimiento de este perfil fue revocado.' }, { status: 404 })
  }

  const { data: file, error: storageError } = await admin.storage.from('song-audio').download(generation.audio_object_key)
  if (storageError || !file) return NextResponse.json({ error: 'El almacenamiento de audio no está disponible.' }, { status: 503 })
  return new NextResponse(await file.arrayBuffer(), {
    headers: {
      'Content-Type': generation.audio_mime_type || 'audio/wav',
      'Content-Disposition': `inline; filename="play-and-go-voice.${generation.audio_mime_type === 'audio/mpeg' ? 'mp3' : 'wav'}"`,
      'Cache-Control': 'private, no-store',
      'X-Content-Type-Options': 'nosniff',
    },
  })
}
