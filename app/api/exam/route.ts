import { NextResponse } from 'next/server'
import { randomBytes } from 'crypto'

import { EXAM_PASS_PERCENT, examPublicQuestions, gradeExam } from '@/lib/exam'
import { SUPABASE_NOT_CONFIGURED } from '@/lib/supabase/config'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

const PRIVATE_HEADERS = { 'Cache-Control': 'private, no-store' } as const

/**
 * Examen del curso (20 preguntas, 70% para aprobar).
 *
 * GET → preguntas sin clave. POST → califica en servidor, guarda el intento
 * y, si aprueba, emite constancia con código verificable.
 */
export async function GET() {
  return NextResponse.json({ questions: examPublicQuestions(), passPercent: EXAM_PASS_PERCENT })
}

export async function POST(request: Request) {
  const supabase = await createClient()
  if (!supabase) return NextResponse.json({ error: SUPABASE_NOT_CONFIGURED, code: 'not_configured' }, { status: 503 })

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Inicia sesión para presentar el examen.', code: 'unauthorized' }, { status: 401 })

  const body = (await request.json().catch(() => null)) as { answers?: unknown } | null
  const raw = body?.answers
  if (!raw || typeof raw !== 'object') {
    return NextResponse.json({ error: 'Envía tus respuestas.', code: 'invalid_request' }, { status: 400 })
  }
  const answers: Record<string, number> = {}
  for (const [key, value] of Object.entries(raw)) {
    if (typeof value === 'number') answers[key] = value
  }
  if (Object.keys(answers).length === 0) {
    return NextResponse.json({ error: 'Envía tus respuestas.', code: 'invalid_request' }, { status: 400 })
  }

  const { score, passed, correct } = gradeExam(answers)

  const { data: attempt, error: attemptError } = await supabase
    .from('exam_attempts')
    .insert({ user_id: user.id, score, passed, answers })
    .select('id')
    .single()
  if (attemptError || !attempt) {
    console.error('[exam] intento no guardado', attemptError?.message)
    return NextResponse.json(
      { error: 'No pudimos registrar tu examen.', code: 'write_failed' },
      { status: 500, headers: PRIVATE_HEADERS },
    )
  }

  let certificateCode: string | null = null
  if (passed) {
    certificateCode = randomBytes(6).toString('hex').toUpperCase()
    const { error: certError } = await supabase
      .from('certificates')
      .insert({ user_id: user.id, code: certificateCode, exam_attempt_id: attempt.id })
    if (certError) {
      console.error('[exam] constancia no emitida', certError.message)
      certificateCode = null
    }
  }

  return NextResponse.json(
    { score, passed, correct, total: 20, certificateCode },
    { headers: PRIVATE_HEADERS },
  )
}
