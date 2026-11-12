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
  if (!user) return NextResponse.json({ error: 'Inicia sesión para consultar esta generación.' }, { status: 401 })
  const admin = createAdminClient()
  if (!admin) return NextResponse.json({ error: 'El servicio de voz no está configurado.' }, { status: 503 })

  const { data, error } = await admin
    .from('voice_generations')
    .select('task_id,status,progress,error_message,audio_object_key,created_at,completed_at,parameters')
    .eq('task_id', taskId)
    .eq('user_id', user.id)
    .maybeSingle()
  if (error) return NextResponse.json({ error: 'No se pudo consultar el estado.' }, { status: 503 })
  if (!data) return NextResponse.json({ error: 'Generación no encontrada.' }, { status: 404 })
  return NextResponse.json({
    taskId: data.task_id,
    status: data.status,
    progress: data.progress,
    engine: data.parameters?.engine,
    error: data.status === 'failed' ? 'La generación local no pudo completarse.' : undefined,
    audioUrl: data.status === 'completed' && data.audio_object_key ? `/api/voice/generate/${data.task_id}/audio` : undefined,
    createdAt: data.created_at,
    completedAt: data.completed_at,
  }, { headers: { 'Cache-Control': 'private, no-store' } })
}
