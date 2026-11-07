'use client'

import { useEffect, useMemo, useState } from 'react'
import { AlertCircle, CheckCircle2, LoaderCircle, RotateCcw, Send } from 'lucide-react'
import type { AdvancedAudioModuleId } from '@/lib/advanced-audio-curriculum'

interface PublicQuestion { id: string; question: string; options: [string, string, string]; topic: string }
interface PublicExam {
  moduleId: AdvancedAudioModuleId; title: string; total: number; passPercent: number; masteryPercent: number
  estimatedMinutes: number; policy: string; questions: PublicQuestion[]
}
interface ExamResult {
  moduleId: AdvancedAudioModuleId; score: number; correct: number; total: number; passed: boolean; mastery: boolean
  review: Array<{ id: string; correct: boolean; explanation: string; correctOption: string }>
  recorded: boolean; recordingMessage: string; certificateIssued: false; certificateNote: string
}

export function AdvancedAudioExam({ moduleId }: { moduleId: AdvancedAudioModuleId }) {
  const [exam, setExam] = useState<PublicExam | null>(null)
  const [answers, setAnswers] = useState<Record<string, number>>({})
  const [result, setResult] = useState<ExamResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const controller = new AbortController()
    setLoading(true)
    setError(null)
    fetch('/api/advanced-audio/exam?module=' + moduleId, { signal: controller.signal, cache: 'no-store' })
      .then(async (response) => {
        const payload = await response.json().catch(() => null)
        if (!response.ok) throw new Error(payload?.error ?? 'No se pudo cargar el examen.')
        setExam(payload as PublicExam)
      })
      .catch((reason: unknown) => {
        if (!controller.signal.aborted) setError(reason instanceof Error ? reason.message : 'No se pudo cargar el examen.')
      })
      .finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => controller.abort()
  }, [moduleId])

  const answeredCount = useMemo(() => Object.keys(answers).length, [answers])
  const allAnswered = Boolean(exam && answeredCount === exam.questions.length)

  async function submit() {
    if (!exam || !allAnswered || submitting) return
    setSubmitting(true)
    setError(null)
    try {
      const response = await fetch('/api/advanced-audio/exam', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        cache: 'no-store',
        body: JSON.stringify({ moduleId, answers }),
      })
      const payload = await response.json().catch(() => null)
      if (!response.ok) throw new Error(payload?.error ?? 'No se pudo evaluar el examen.')
      setResult(payload as ExamResult)
      document.getElementById('advanced-exam-result')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'No se pudo evaluar el examen.')
    } finally { setSubmitting(false) }
  }

  function reset() {
    setAnswers({})
    setResult(null)
    setError(null)
    document.getElementById('advanced-exam-top')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  if (loading) {
    return <div className="pg-card flex items-center gap-3 p-5" role="status"><LoaderCircle className="animate-spin" size={18} /> Cargando preguntas del servidor…</div>
  }
  if (!exam) {
    return <div className="pg-card p-5" role="alert"><AlertCircle size={18} className="mb-2" /><p className="pg-prose">{error ?? 'El examen no está disponible.'}</p></div>
  }

  return (
    <div id="advanced-exam-top" className="space-y-6">
      <section className="pg-card p-5 sm:p-7">
        <p className="pg-eyebrow">Evaluación teórica · {exam.estimatedMinutes} minutos orientativos</p>
        <h2 className="pg-block-title mt-2">{exam.title}</h2>
        <p className="pg-prose mt-3">Responde las {exam.total} preguntas. Se aprueba con {exam.passPercent}/100; un resultado de {exam.masteryPercent}/100 o más indica dominio teórico sólido. El examen no sustituye la entrega práctica.</p>
        <div className="mt-4 flex flex-wrap gap-2">
          <span className="pg-chip">{answeredCount} de {exam.total} respondidas</span>
          <span className="pg-chip">Sin clave correcta en el cliente</span>
        </div>
        <div className="pg-meter mt-4" role="progressbar" aria-label="Preguntas contestadas" aria-valuemin={0} aria-valuemax={exam.total} aria-valuenow={answeredCount}>
          <div className="pg-meter-fill" style={{ width: (100 * answeredCount / exam.total) + '%' }} />
        </div>
        <p className="pg-note mt-4">{exam.policy}</p>
      </section>

      {error && <div className="pg-card p-4" role="alert"><p className="pg-prose">{error}</p></div>}

      {!result && (
        <form onSubmit={(event) => { event.preventDefault(); void submit() }} className="space-y-4">
          {exam.questions.map((question, index) => (
            <fieldset key={question.id} className="pg-card p-5 sm:p-6">
              <legend className="w-full">
                <span className="pg-eyebrow">Pregunta {String(index + 1).padStart(2, '0')} · {question.topic}</span>
                <span className="pg-block-title mt-2 block">{question.question}</span>
              </legend>
              <div className="mt-4 grid gap-2">
                {question.options.map((option, optionIndex) => {
                  const id = question.id + '-option-' + optionIndex
                  return (
                    <label key={id} htmlFor={id} className="pg-inset flex cursor-pointer items-start gap-3 p-3">
                      <input
                        id={id}
                        type="radio"
                        name={question.id}
                        value={optionIndex}
                        checked={answers[question.id] === optionIndex}
                        onChange={() => setAnswers((current) => ({ ...current, [question.id]: optionIndex }))}
                        className="mt-1 accent-cyan-300"
                      />
                      <span className="pg-prose">{option}</span>
                    </label>
                  )
                })}
              </div>
            </fieldset>
          ))}
          <div className="pg-card flex flex-wrap items-center justify-between gap-4 p-5">
            <p className="pg-note">El servidor conserva la clave de respuestas. El resultado teórico se devuelve sin emitir un certificado de grado.</p>
            <button type="submit" disabled={!allAnswered || submitting} className="pg-btn pg-btn-primary disabled:cursor-not-allowed disabled:opacity-50">
              {submitting ? <LoaderCircle className="animate-spin" size={16} aria-hidden="true" /> : <Send size={16} aria-hidden="true" />}
              {submitting ? 'Evaluando…' : 'Enviar respuestas'}
            </button>
          </div>
        </form>
      )}

      {result && (
        <section id="advanced-exam-result" className="pg-card p-5 sm:p-7" aria-live="polite">
          <div className="flex items-start gap-3">
            {result.passed ? <CheckCircle2 size={22} className="shrink-0" aria-hidden="true" /> : <AlertCircle size={22} className="shrink-0" aria-hidden="true" />}
            <div className="flex-1">
              <p className="pg-eyebrow">Resultado teórico · {result.correct}/{result.total} correctas</p>
              <h3 className="pg-title mt-1" data-size="sm">{result.score}/100 · {result.mastery ? 'Dominio teórico sólido' : result.passed ? 'Examen aprobado' : 'Requiere refuerzo'}</h3>
              <p className="pg-prose mt-2">{result.passed ? 'Se alcanzó el umbral teórico de aprobación.' : 'Revisa las preguntas incorrectas y repite el examen después de estudiar las lecciones correspondientes.'}</p>
              <p className="pg-note mt-2">{result.recordingMessage}</p>
              <p className="pg-note mt-2">{result.certificateNote}</p>
            </div>
          </div>
          <h4 className="pg-item-title mt-7">Retroalimentación por pregunta</h4>
          <div className="mt-3 space-y-2">
            {result.review.map((item, index) => {
              const question = exam.questions.find((candidate) => candidate.id === item.id)
              return (
                <div key={item.id} className="pg-inset p-4">
                  <p className="pg-prose"><strong>{String(index + 1).padStart(2, '0')} · {item.correct ? 'Correcta' : 'Revisar'}</strong>{question ? ' — ' + question.question : ''}</p>
                  {!item.correct && <p className="pg-prose mt-2"><strong>Respuesta esperada:</strong> {item.correctOption}</p>}
                  <p className="pg-note mt-2">{item.explanation}</p>
                </div>
              )
            })}
          </div>
          <button type="button" onClick={reset} className="pg-btn pg-btn-ghost mt-6">
            <RotateCcw size={15} aria-hidden="true" /> Volver a intentar
          </button>
        </section>
      )}
    </div>
  )
}
