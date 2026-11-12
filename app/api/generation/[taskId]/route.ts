import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { SUPABASE_NOT_CONFIGURED } from '@/lib/supabase/config'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(_request: Request, context: { params: Promise<{ taskId: string }> }) {
  const { taskId } = await context.params
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(taskId)) {
    return NextResponse.json({ error: 'Identificador de tarea inválido.', code: 'invalid_task_id' }, { status: 400 })
  }
  const supabase = await createClient()
  if (!supabase) return NextResponse.json({ error: SUPABASE_NOT_CONFIGURED, code: 'not_configured' }, { status: 503 })
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Inicia sesión para consultar la tarea.', code: 'unauthorized' }, { status: 401 })
  const { data: task, error } = await supabase.from('audio_generation_tasks')
    .select('task_id,status,progress,error_message,created_at,started_at,completed_at,duration_seconds,sample_rate,byte_size,content_hash,spectral_metadata')
    .eq('task_id', taskId).eq('user_id', user.id).maybeSingle()
  if (error) return NextResponse.json({ error: 'No se pudo consultar el estado.', code: 'status_unavailable' }, { status: 503 })
  if (!task) return NextResponse.json({ error: 'Tarea no encontrada.', code: 'not_found' }, { status: 404 })
  return NextResponse.json({
    taskId: task.task_id, status: task.status, progress: task.progress,
    audioUrl: task.status === 'completed' ? `/api/generation/${task.task_id}/audio` : null,
    spectralMetadata: task.spectral_metadata, error: task.error_message,
    createdAt: task.created_at, startedAt: task.started_at, completedAt: task.completed_at,
    durationSeconds: task.duration_seconds, sampleRate: task.sample_rate,
    byteSize: task.byte_size, contentHash: task.content_hash,
  }, { headers: { 'Cache-Control': 'no-store' } })
}
