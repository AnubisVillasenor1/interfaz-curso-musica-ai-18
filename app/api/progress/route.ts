import { NextResponse } from 'next/server'

import { COURSE_LESSONS } from '@/lib/course'
import { SUPABASE_NOT_CONFIGURED } from '@/lib/supabase/config'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

/**
 * Cabeceras de las respuestas con datos de una sola cuenta.
 *
 * `private, no-store` va en los GET de progreso, plan y biblioteca: sin él,
 * cualquier intermediario (el caché del navegador, un proxy corporativo) puede
 * servir la lista de lecciones de A a B. No es un fallo teórico —el navegador
 * cachea un GET 200 sin cabecera por heurística— y una API para agentes tiene
 * que poder afirmarse en la propia respuesta, no en que el cliente lo sabe hacer.
 */
const PRIVATE_HEADERS = { 'Cache-Control': 'private, no-store' } as const

/**
 * Progreso del curso e insignias.
 *
 * Se valida el `lessonId` contra el catálogo antes de llamar a la base de
 * datos. Sin esa lista blanca, cualquiera escribía `lesson_id: 'cualquiera'`
 * en el cuerpo y sumaba filas en `lesson_progress`; con 16 inserciones
 * arbitrarias se ganaba `productor_ia` sin ver una sesión. La RPC ya no
 * confía en el identificador: aquí se filtra que la lección exista de verdad.
 *
 * El resto lo hace `complete_lesson()`: upsert con `on conflict do nothing`,
 * recuento e insignias en una sola transacción.
 */
export async function POST(request: Request) {
  const supabase = await createClient()
  if (!supabase) return NextResponse.json({ error: SUPABASE_NOT_CONFIGURED, code: 'not_configured' }, { status: 503 })

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Inicia sesión para guardar tu avance.', code: 'unauthorized' }, { status: 401 })

  const body = (await request.json().catch(() => null)) as { lessonId?: unknown; checkpoint?: unknown } | null
  const lessonId = typeof body?.lessonId === 'string' ? body.lessonId.trim() : ''

  if (!COURSE_LESSONS.some((lesson) => lesson.id === lessonId)) {
    return NextResponse.json({ error: 'Esa lección no existe en el programa.', code: 'unknown_lesson' }, { status: 400 })
  }

  const { data, error } = await supabase.rpc('complete_lesson', { p_lesson_id: lessonId })

  if (error) {
    console.error('[progress] complete_lesson falló', error.message)
    return NextResponse.json({ error: 'No pudimos registrar tu progreso.', code: 'write_failed' }, { status: 500 })
  }

  const result = data as { lessons_done: number; lessons_total: number; percent: number; badges: string[] } | null

  if (!result || typeof result.lessons_done !== 'number') {
    return NextResponse.json({ error: 'No pudimos registrar tu progreso.', code: 'write_failed' }, { status: 500 })
  }

  return NextResponse.json(result, { headers: PRIVATE_HEADERS })
}

/**
 * Estado de las lecciones ya completadas, para marcar la ruta en la UI.
 *
 * Devuelve solo identificadores: el contenido se sirve desde `lib/course.ts`
 * y la lista la controla el propio usuario bajo RLS.
 */
export async function PATCH(request: Request) {
  const supabase = await createClient()
  if (!supabase) return NextResponse.json({ error: SUPABASE_NOT_CONFIGURED, code: 'not_configured' }, { status: 503 })
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Inicia sesión para guardar tu práctica.', code: 'unauthorized' }, { status: 401 })
  const body = (await request.json().catch(() => null)) as { lessonId?: unknown; checkpoint?: unknown } | null
  const lessonId = typeof body?.lessonId === 'string' ? body.lessonId.trim() : ''
  if (!COURSE_LESSONS.some((lesson) => lesson.id === lessonId)) return NextResponse.json({ error: 'Esa lección no existe en el programa.', code: 'unknown_lesson' }, { status: 400 })
  const checkpoint = body?.checkpoint && typeof body.checkpoint === 'object' && !Array.isArray(body.checkpoint) ? body.checkpoint : {}
  const { data, error } = await supabase.rpc('save_lesson_checkpoint', { p_lesson_id: lessonId, p_checkpoint: checkpoint })
  if (error) {
    console.error('[progress] checkpoint falló', error.message)
    return NextResponse.json({ error: 'No pudimos guardar tu práctica.', code: 'write_failed' }, { status: 500 })
  }
  return NextResponse.json({ lessonId, checkpoint: data ?? {} }, { headers: PRIVATE_HEADERS })
}

export async function GET() {
  const supabase = await createClient()
  if (!supabase) return NextResponse.json({ error: SUPABASE_NOT_CONFIGURED, code: 'not_configured' }, { status: 503 })

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Inicia sesión para ver tu ruta.', code: 'unauthorized' }, { status: 401 })

  const { data, error } = await supabase.from('lesson_progress').select('lesson_id, completed_at, checkpoint').eq('user_id', user.id).order('completed_at')

  if (error) {
    console.error('[progress] lectura falló', error.message)
    return NextResponse.json({ error: 'No pudimos cargar tu progreso.', code: 'read_failed' }, { status: 500 })
  }

  const { data: badges, error: badgesError } = await supabase.from('badges').select('code, earned_at').eq('user_id', user.id)
  // Sin chequeo, una tabla ausente devolvía [] silencioso mientras el resto de
  // la ruta falla cerrado: inconsistencia que esconde un deploy parcial.
  if (badgesError) {
    console.error('[progress] lectura de insignias falló', badgesError.message)
    return NextResponse.json({ error: 'No pudimos cargar tu progreso.', code: 'read_failed' }, { status: 500 })
  }

  return NextResponse.json(
    {
      completed: (data ?? []).map((row) => ({ lessonId: row.lesson_id, at: row.completed_at })),
      checkpoints: (data ?? []).map((row) => ({ lessonId: row.lesson_id, checkpoint: row.checkpoint ?? {} })),
      badges: (badges ?? []).map((row) => ({ code: row.code, earnedAt: row.earned_at })),
      total: COURSE_LESSONS.length,
    },
    { headers: PRIVATE_HEADERS },
  )
}
