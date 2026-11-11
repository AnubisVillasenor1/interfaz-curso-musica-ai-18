import { NextResponse } from 'next/server'

import {
  getAdvancedAudioExam,
  gradeAdvancedAudioExam,
  publicQuestions,
  validateAdvancedAudioAnswers,
} from '@/lib/advanced-audio-exam'
import { ADVANCED_AUDIO_ASSESSMENT, ADVANCED_AUDIO_MODULE_IDS, isAdvancedAudioModuleId } from '@/lib/advanced-audio-curriculum'
import { enforceRateLimit, ipOf } from '@/lib/rate-limit'
import { readBoundedJson } from '@/lib/http/read-body'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'
const PRIVATE_HEADERS = { 'Cache-Control': 'private, no-store' } as const
const VALID_MODULES = ADVANCED_AUDIO_MODULE_IDS.join(', ')

/** Public exam GET never sends answer keys. Correct options appear only after a submission. */
export async function GET(request: Request) {
  const moduleId = new URL(request.url).searchParams.get('module')
  if (!isAdvancedAudioModuleId(moduleId)) {
    return NextResponse.json({ error: `Indica module=${VALID_MODULES}.`, code: 'invalid_module' }, { status: 400, headers: PRIVATE_HEADERS })
  }
  const exam = getAdvancedAudioExam(moduleId)
  if (!exam) return NextResponse.json({ error: 'Examen no disponible.', code: 'not_found' }, { status: 404, headers: PRIVATE_HEADERS })

  return NextResponse.json(
    {
      moduleId,
      title: exam.title,
      total: exam.questions.length,
      passPercent: ADVANCED_AUDIO_ASSESSMENT.passPercent,
      masteryPercent: ADVANCED_AUDIO_ASSESSMENT.masteryPercent,
      estimatedMinutes: ADVANCED_AUDIO_ASSESSMENT.estimateMinutes,
      questions: publicQuestions(exam),
      policy: ADVANCED_AUDIO_ASSESSMENT.policy,
    },
    { headers: PRIVATE_HEADERS },
  )
}

export async function POST(request: Request) {
const rateLimitResponse = await enforceRateLimit(
    `advanced-audio-exam:${ipOf(request)}`,
    20,
    'Demasiados intentos; espera antes de volver a presentar el examen.',
    PRIVATE_HEADERS,
  )
  if (rateLimitResponse) return rateLimitResponse

  const parsed = await readBoundedJson<{ moduleId?: unknown; answers?: unknown } | null>(request, 16 * 1024)
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.message, code: parsed.code }, { status: parsed.status, headers: PRIVATE_HEADERS })
  }
  const body = parsed.value
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return NextResponse.json({ error: 'Envía un objeto JSON con módulo y respuestas.', code: 'invalid_request' }, { status: 400, headers: PRIVATE_HEADERS })
  }
  const moduleId = body.moduleId
  if (!isAdvancedAudioModuleId(moduleId)) {
    return NextResponse.json({ error: `Indica moduleId=${VALID_MODULES}.`, code: 'invalid_module' }, { status: 400, headers: PRIVATE_HEADERS })
  }
  const exam = getAdvancedAudioExam(moduleId)
  const answers = body.answers
  if (!exam || !validateAdvancedAudioAnswers(exam, answers)) {
    return NextResponse.json({
      error: 'Envía una respuesta válida para cada pregunta; se aceptan únicamente opciones 0, 1 o 2.',
      code: 'invalid_answers',
      expectedCount: exam?.questions.length ?? 20,
    }, { status: 400, headers: PRIVATE_HEADERS })
  }

  const grading = gradeAdvancedAudioExam(exam, answers)
  let recorded = false
  let recordingMessage = 'Resultado calculado; inicia sesión para intentar guardar el resultado en tu perfil.'
  try {
    const supabase = await createClient()
    if (supabase) {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { error } = await supabase.from('exam_attempts').insert({
          user_id: user.id,
          score: grading.score,
          passed: grading.passed,
          answers: {
            assessment_id: 'advanced-audio-' + moduleId,
            answers,
            mastery: grading.mastery,
            evaluated_at: new Date().toISOString(),
          },
        })
        if (!error) {
          recorded = true
          recordingMessage = 'Resultado guardado en el historial de evaluaciones.'
        } else {
          recordingMessage = 'Resultado calculado, pero no pudo guardarse. Se puede conservar el reporte local.'
          console.error('[advanced-audio-exam] no se pudo guardar el intento:', error.message)
        }
      }
    }
  } catch (error) {
    recordingMessage = 'Resultado calculado, pero el almacenamiento no estuvo disponible.'
    console.error('[advanced-audio-exam] almacenamiento no disponible:', error instanceof Error ? error.message : 'error')
  }

  return NextResponse.json({
    moduleId,
    title: exam.title,
    ...grading,
    recorded,
    recordingMessage,
    minimumPass: ADVANCED_AUDIO_ASSESSMENT.passPercent,
    masteryThreshold: ADVANCED_AUDIO_ASSESSMENT.masteryPercent,
    certificateIssued: false,
    certificateNote: 'Este examen complementario no emite una acreditación oficial ni un título académico.',
  }, { headers: PRIVATE_HEADERS })
}
