import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { SUPABASE_NOT_CONFIGURED } from '@/lib/supabase/config'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(_request: Request, context: { params: Promise<{ taskId: string }> }) {
  const { taskId } = await context.params
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(taskId)) {
    return NextResponse.json({ error: 'Identificador de tarea inválido.' }, { status: 400 })
  }
  const supabase = await createClient()
  if (!supabase) return NextResponse.json({ error: SUPABASE_NOT_CONFIGURED }, { status: 503 })
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Inicia sesión para descargar el audio.' }, { status: 401 })
  const { data: task, error } = await supabase.from('audio_generation_tasks')
    .select('task_id,status').eq('task_id', taskId).eq('user_id', user.id).maybeSingle()
  if (error) return NextResponse.json({ error: 'No se pudo verificar la tarea.' }, { status: 503 })
  if (!task) return NextResponse.json({ error: 'Tarea no encontrada.' }, { status: 404 })
  if (task.status !== 'completed') return NextResponse.json({ error: 'El audio todavía no está disponible.' }, { status: 409 })
  const gatewayUrl = process.env.AUDIO_QUEUE_GATEWAY_URL
  const token = process.env.GATEWAY_INTERNAL_TOKEN
  if (!gatewayUrl || !token) return NextResponse.json({ error: 'El servicio de audio no está configurado.' }, { status: 503 })
  try {
    const response = await fetch(new URL(`/v1/audio-url/${taskId}`, gatewayUrl), {
      headers: { authorization: `Bearer ${token}` }, cache: 'no-store', signal: AbortSignal.timeout(5000),
    })
    if (!response.ok) return NextResponse.json({ error: 'No se pudo preparar la descarga.' }, { status: 503 })
    const result = await response.json() as { url?: string }
    if (!result.url || !result.url.startsWith('https://') && !result.url.startsWith('http://')) {
      return NextResponse.json({ error: 'URL de audio inválida.' }, { status: 502 })
    }
    return NextResponse.redirect(result.url, 302, { headers: { 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer' } })
  } catch {
    return NextResponse.json({ error: 'El almacenamiento no está disponible.' }, { status: 503 })
  }
}
