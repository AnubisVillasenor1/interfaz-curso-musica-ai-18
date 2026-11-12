import { NextResponse } from 'next/server'

import { lessonById } from '@/lib/course'
import { getLessonMedia } from '@/lib/course-media'
import { enforcePolicy } from '@/lib/rate-limit'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type Props = { params: Promise<{ lessonId: string }> }

export async function GET(request: Request, { params }: Props) {
  const limited = await enforcePolicy(request, 'music.search', 'Demasiadas solicitudes de medios. Intenta más tarde.')
  if (limited) return limited
  const { lessonId } = await params
  if (!/^[a-z0-9-]{5,20}$/i.test(lessonId)) {
    return NextResponse.json({ error: 'Identificador de lección inválido.' }, { status: 400 })
  }
  const lesson = lessonById(lessonId)
  if (!lesson) return NextResponse.json({ error: 'Lección no encontrada.' }, { status: 404 })
  const media = await getLessonMedia(lesson)
  return NextResponse.json(
    { lessonId: lesson.id, ...media, licensePolicy: ['CC0', 'Creative Commons BY', 'Creative Commons BY-SA'] },
    { headers: { 'Cache-Control': 'public, max-age=300, stale-while-revalidate=3600' } },
  )
}
