import { NextResponse } from 'next/server'

import { SUPABASE_NOT_CONFIGURED } from '@/lib/supabase/config'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

const PRIVATE_HEADERS = { 'Cache-Control': 'private, no-store' } as const

/**
 * Estado de una generación (`GET /api/task/{taskId}`).
 *
 * La verdad es la fila `songs` filtrada por `user_id`: sin ese filtro,
 * conocer un `provider_task_id` ajeno bastaba para escuchar su audio y su
 * prompt. El audio solo se devuelve si la fila es propia.
 */
export async function GET(request: Request, { params }: { params: Promise<{ taskId: string }> }) {
  const supabase = await createClient()
  if (!supabase) return NextResponse.json({ error: SUPABASE_NOT_CONFIGURED, code: 'not_configured' }, { status: 503 })

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Inicia sesión para consultar tareas.', code: 'unauthorized' }, { status: 401 })

  const { taskId } = await params
  const id = typeof taskId === 'string' ? taskId.trim() : ''
  if (!id || id.length > 200) return NextResponse.json({ error: 'Identificador de tarea inválido.', code: 'invalid_request' }, { status: 400 })

  const { data: song, error } = await supabase
    .from('songs')
    .select('id, status, audio_url, error, provider_task_id, created_at')
    .eq('provider_task_id', id)
    .eq('user_id', user.id)
    .maybeSingle()

  if (error) {
    console.error('[task] lectura falló', error.message)
    return NextResponse.json({ error: 'No pudimos consultar la tarea.', code: 'read_failed' }, { status: 500 })
  }
  if (!song) return NextResponse.json({ error: 'Tarea no encontrada.', code: 'not_found' }, { status: 404 })

  const status =
    song.status === 'ready' ? 'completed' : song.status === 'error' ? 'failed' : song.status === 'generating' ? 'processing' : 'queued'

  return NextResponse.json(
    {
      data: {
        taskId: id,
        status,
        audioUrl: song.audio_url ?? null,
        error: song.error ?? null,
        provider: process.env.MUSIC_PROVIDER ?? undefined,
      },
      songId: song.id,
      dbStatus: song.status,
    },
    { headers: PRIVATE_HEADERS },
  )
}
