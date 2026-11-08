import { NextResponse } from 'next/server'
import { randomBytes } from 'crypto'

import { EXAM_QUESTIONS, EXAM_PASS_PERCENT, examPublicQuestions, gradeExam } from '@/lib/exam'
import { createAdminClient } from '@/lib/supabase/admin'
import { SUPABASE_NOT_CONFIGURED } from '@/lib/supabase/config'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

const PRIVATE_HEADERS = { 'Cache-Control': 'private, no-store' } as const
const QUESTION_IDS = new Set(EXAM_QUESTIONS.map((question) => question.id))

/**
 * Examen del curso (20 preguntas, 70% para aprobar).
 *
 * GET → preguntas públicas sin clave.
 * POST → autentica al estudiante, valida las respuestas contra el catálogo
 * del servidor, califica con la clave privada y escribe con service_role.
 * La identidad jamás se toma del cuerpo del cliente.
 */
export async function GET() {
  return NextResponse.json(
    { questions: examPublicQuestions(), passPercent: EXAM_PASS_PERCENT },
    { headers: PRIVATE_HEADERS },
  )
}

export async function POST(request: Request) {
  const supabase = await createClient()
  if (!supabase) {
    return NextResponse.json(
      { error: SUPABASE_NOT_CONFIGURED, code: 'not_configured' },
      { status: 503, headers: PRIVATE_HEADERS },
    )
  }

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json(
      { error: 'Inicia sesión para presentar el examen.', code: 'unauthorized' },
      { status: 401, headers: PRIVATE_HEADERS },
    )
  }

  const contentLength = Number(request.headers.get('content-length') ?? 0)
  if (contentLength > 16_384) {
    return NextResponse.json(
      { error: 'El envío del examen excede el tamaño permitido.', code: 'payload_too_large' },
      { status: 413, headers: PRIVATE_HEADERS },
    )
  }

  const body = (await request.json().catch(() => null)) as { answers?: unknown } | null
  const raw = body?.answers
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return NextResponse.json(
      { error: 'Envía las respuestas del examen en un objeto válido.', code: 'invalid_request' },
      { status: 400, headers: PRIVATE_HEADERS },
    )
  }

  const entries = Object.entries(raw as Record<string, unknown>)
  if (entries.length === 0 || entries.some(([id, value]) =>
    !QUESTION_IDS.has(id) || typeof value !== 'number' || !Number.isInteger(value) || value < 0 || value > 2
  )) {
    return NextResponse.json(
      { error: 'Hay respuestas desconocidas o índices de opción inválidos.', code: 'invalid_answers' },
      { status: 400, headers: PRIVATE_HEADERS },
    )
  }

  const answers: Record<string, number> = {}
  for (const [id, value] of entries) answers[id] = value as number

  // La clave nunca sale del servidor y la puntuación no se acepta del cliente.
  const { score, passed, correct } = gradeExam(answers)

  // Los intentos y las constancias solo se escriben desde servidor.
  // La sesión anterior determina user.id; el cliente no puede elegir el dueño.
  const admin = createAdminClient()
  if (!admin) {
    return NextResponse.json(
      { error: 'El registro seguro del examen no está configurado.', code: 'writer_not_configured' },
      { status: 503, headers: PRIVATE_HEADERS },
    )
  }

  const { data: attempt, error: attemptError } = await admin
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
    // 128 bits aleatorios; el código no es secuencial ni permite enumerar constancias.
    const candidateCode = randomBytes(16).toString('hex').toUpperCase()
    const { error: certError } = await admin
      .from('certificates')
      .insert({ user_id: user.id, code: candidateCode, exam_attempt_id: attempt.id })

    if (certError) {
      console.error('[exam] constancia no emitida', certError.message)
    } else {
      certificateCode = candidateCode
    }
  }

  return NextResponse.json(
    { score, passed, correct, total: EXAM_QUESTIONS.length, certificateCode },
    { headers: PRIVATE_HEADERS },
  )
}
