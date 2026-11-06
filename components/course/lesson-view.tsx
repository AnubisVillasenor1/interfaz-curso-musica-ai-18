'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  AlertTriangle,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Copy,
  Headphones,
  Lightbulb,
  ListChecks,
  Quote,
  Sparkles,
  Target,
  Trophy,
} from 'lucide-react'

import { COURSE_BADGES, type CourseModule, type Lesson, type PromptTemplate } from '@/lib/course'
import { cn } from '@/lib/utils'

import { ProgressBar, focusRing, useCourseProgress } from './progress-bar'

export interface LessonNavItem {
  id: string
  title: string
  kicker: string
  moduleId: string
}

/** Nombre visible de una insignia a partir del código que devolvió la API. */
const badgeName = (code: string) => COURSE_BADGES.find((badge) => badge.code === code)

/** Envoltorios de texto que comparten todas las secciones de contenido. */
const sectionShell = 'rounded-2xl border border-white/10 bg-white/[.03] p-5 sm:p-7'
const bodyText = 'max-w-3xl text-[0.975rem] leading-[1.85] text-[#b5cbd4]'
const sectionTitle = 'flex items-center gap-2 text-lg font-semibold tracking-tight text-[#edfaff]'

/**
 * Resalta las variables entre {llaves} de un prompt.
 *
 * El texto se parte por el propio delimitador que usa `lib/course.ts`, así que
 * lo que se copia al portapapeles es idéntico a `prompt.text`: la marca es
 * presentación, no reescritura del contenido.
 */
function PromptText({ text }: { text: string }) {
  return (
    <>
      {text.split(/(\{[^}]*\})/g).map((part, index) =>
        part.startsWith('{') && part.endsWith('}') ? (
          <span
            key={`${part}-${index}`}
            className="rounded bg-[#75e9f2]/15 px-1 py-0.5 text-[#8cecf3] ring-1 ring-inset ring-[#75e9f2]/30"
          >
            {part}
          </span>
        ) : (
          <span key={`${part}-${index}`}>{part}</span>
        ),
      )}
    </>
  )
}

function PromptCard({ prompt }: { prompt: PromptTemplate }) {
  const [copied, setCopied] = useState(false)

  async function copy() {
    try {
      if (!navigator.clipboard) throw new Error('portapapeles no disponible')
      await navigator.clipboard.writeText(prompt.text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    } catch {
      setCopied(false)
    }
  }

  return (
    <li className="rounded-2xl border border-[#c09eff]/25 bg-[#c09eff]/[.05] p-5">
      <h4 className="text-sm font-semibold text-[#d4c7ff]">{prompt.name}</h4>
      <p className="mt-1.5 text-xs leading-5 text-[#a9c0ca]">{prompt.outcome}</p>

      <p className="mt-4 whitespace-pre-wrap break-words rounded-xl border border-white/10 bg-[#02080e]/45 p-4 font-mono text-[13px] leading-[1.75] text-[#c5d8df]">
        <PromptText text={prompt.text} />
      </p>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={copy}
          className={cn(
            'inline-flex items-center gap-2 rounded-full bg-[#75e9f2] px-4 py-2 text-xs font-semibold text-[#06131e] transition hover:bg-[#a0f4f9]',
            focusRing,
          )}
        >
          {copied ? <Check size={14} aria-hidden="true" /> : <Copy size={14} aria-hidden="true" />}
          {copied ? 'Copiado' : 'Copiar prompt'}
        </button>
        <span aria-live="polite" className="sr-only">
          {copied ? `Prompt «${prompt.name}» copiado al portapapeles.` : ''}
        </span>
      </div>

      <div className="mt-4">
        <p className="text-[10px] font-semibold uppercase tracking-[.2em] text-[#ff9eea]">
          Variables a sustituir ({prompt.variables.length})
        </p>
        <ul className="mt-2 flex flex-wrap gap-1.5">
          {prompt.variables.map((variable, index) => (
            <li
              key={`${variable}-${index}`}
              className="rounded-lg border border-[#75e9f2]/25 bg-[#75e9f2]/[.07] px-2 py-1 text-[11px] leading-4 text-[#8cecf3]"
            >
              {`{${variable}}`}
            </li>
          ))}
        </ul>
      </div>
    </li>
  )
}

/**
 * Lección completa. Todo el texto sale del objeto `Lesson` de `lib/course.ts`:
 * bloques, ejemplos, técnicas, prompts, ejercicio, escucha, errores y idea
 * central. Ninguna frase del curso se escribe aquí.
 */
export function LessonView({
  lesson,
  courseModule,
  previous,
  next,
}: {
  lesson: Lesson
  courseModule: CourseModule
  previous?: LessonNavItem
  next?: LessonNavItem
}) {
  const { progress, applyCompletion } = useCourseProgress()
  const [submitting, setSubmitting] = useState(false)
  const [feedback, setFeedback] = useState<string | null>(null)
  const [newBadges, setNewBadges] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)
  const [checked, setChecked] = useState<Record<number, boolean>>({})

  const isDone = progress.completed.includes(lesson.id)

  async function markComplete() {
    if (submitting) return
    setSubmitting(true)
    setError(null)
    setFeedback(null)

    try {
      const response = await fetch('/api/progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lessonId: lesson.id }),
      })
      const data = (await response.json().catch(() => null)) as {
        lessons_done?: number
        lessons_total?: number
        percent?: number
        badges?: string[]
        error?: string
      } | null

      if (!response.ok || typeof data?.lessons_done !== 'number') {
        setError(data?.error ?? 'No pudimos registrar tu progreso. Revisa tu conexión e intenta otra vez.')
        return
      }

      const earned = Array.isArray(data.badges) ? data.badges.filter((code) => typeof code === 'string') : []
      applyCompletion(
        {
          lessons_done: data.lessons_done,
          lessons_total: data.lessons_total ?? progress.total,
          percent: data.percent ?? 0,
          badges: earned,
        },
        lesson.id,
      )
      setNewBadges(earned)
      setFeedback(
        `Lección completada: ${data.lessons_done} de ${data.lessons_total ?? progress.total} · ${Math.round(data.percent ?? 0)}%.`,
      )
    } catch {
      setError('Se cortó la conexión con el servidor. Tu avance no se guardó.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <article className="flex flex-col gap-8">
      <nav aria-label="Ruta de la lección">
        <ol className="flex flex-wrap items-center gap-2 text-[11px] uppercase tracking-[.18em] text-[#7f9aa7]">
          <li>
            <Link href="/curso" className={cn('text-[#8cecf3] hover:text-[#a0f4f9]', focusRing)}>
              Programa
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li>
            <Link href={`/curso/${courseModule.id}`} className={cn('text-[#8cecf3] hover:text-[#a0f4f9]', focusRing)}>
              {courseModule.title}
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li className="text-[#a9c0ca]">Sesión {String(lesson.lessonNumber).padStart(2, '0')}</li>
        </ol>
      </nav>

      <header className="rounded-3xl border border-[#75e9f2]/25 bg-[#75e9f2]/[.05] p-6 sm:p-8">
        <p className="text-[10px] font-semibold uppercase tracking-[.24em] text-[#ff9eea]">{lesson.kicker}</p>
        <h1 className="mt-3 max-w-3xl text-3xl font-semibold leading-[1.1] tracking-[-.04em] sm:text-4xl">{lesson.title}</h1>
        <p className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-[#7f9aa7]">
          <span className="inline-flex items-center gap-1.5">
            <Clock3 size={13} aria-hidden="true" /> {lesson.minutes} min
          </span>
          <span>Módulo {String(courseModule.index).padStart(2, '0')} · {courseModule.title}</span>
          <span>
            Lección {lesson.lessonNumber} de {progress.total}
          </span>
        </p>
        <p className="mt-5 flex gap-3 rounded-2xl border border-[#c09eff]/30 bg-[#c09eff]/[.08] p-4">
          <Target className="mt-0.5 shrink-0 text-[#d4c7ff]" size={17} aria-hidden="true" />
          <span className="max-w-3xl text-sm leading-6 text-[#c5d8df]">
            <span className="font-semibold text-[#d4c7ff]">Objetivo: </span>
            {lesson.objective}
          </span>
        </p>
      </header>

      <ProgressBar progress={progress} label="Progreso del programa" />

      <section aria-labelledby="desarrollo-heading" className={sectionShell}>
        <h2 id="desarrollo-heading" className={sectionTitle}>
          <Sparkles size={17} className="text-[#75e9f2]" aria-hidden="true" /> La lección
        </h2>
        <div className="mt-5 flex flex-col gap-8">
          {lesson.blocks.map((block, index) => (
            <div key={`${block.heading}-${index}`}>
              <h3 className="max-w-3xl text-base font-semibold leading-7 tracking-[-.02em] text-[#edfaff]">{block.heading}</h3>
              <div className="mt-3 flex flex-col gap-4">
                {block.body.map((paragraph, pIndex) => (
                  <p key={pIndex} className={bodyText}>
                    {paragraph}
                  </p>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {lesson.examples.length > 0 && (
        <section aria-labelledby="ejemplos-heading" className={sectionShell}>
          <h2 id="ejemplos-heading" className={sectionTitle}>
            <Quote size={17} className="text-[#ff9eea]" aria-hidden="true" /> Ejemplos
          </h2>
          <ul className="mt-5 flex flex-col gap-4">
            {lesson.examples.map((example, index) => (
              <li
                key={index}
                className="max-w-3xl border-l-2 border-[#ff9eea]/45 pl-4 text-[0.9375rem] leading-[1.8] text-[#b5cbd4]"
              >
                {example}
              </li>
            ))}
          </ul>
        </section>
      )}

      {lesson.techniques.length > 0 && (
        <section aria-labelledby="tecnicas-heading" className={sectionShell}>
          <h2 id="tecnicas-heading" className={sectionTitle}>
            <Lightbulb size={17} className="text-[#ffcf72]" aria-hidden="true" /> Técnicas
          </h2>
          <ul className="mt-5 grid gap-3 md:grid-cols-2">
            {lesson.techniques.map((technique, index) => (
              <li key={index} className="rounded-xl border border-white/10 bg-[#02080e]/30 p-4 text-sm leading-7 text-[#b5cbd4]">
                <span className="mr-2 text-xs font-semibold text-[#75e9f2]">{String(index + 1).padStart(2, '0')}</span>
                {technique}
              </li>
            ))}
          </ul>
        </section>
      )}

      {lesson.prompts.length > 0 && (
        <section aria-labelledby="prompts-heading" className={sectionShell}>
          <h2 id="prompts-heading" className={sectionTitle}>
            <Copy size={17} className="text-[#75e9f2]" aria-hidden="true" /> Prompts de la sesión
          </h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-[#8fa9b5]">
            Las piezas marcadas entre llaves son variables: sustitúyelas con tus decisiones antes de generar.
          </p>
          <ul className="mt-5 flex flex-col gap-4">
            {lesson.prompts.map((prompt, index) => (
              <PromptCard key={`${prompt.name}-${index}`} prompt={prompt} />
            ))}
          </ul>
        </section>
      )}

      <section aria-labelledby="ejercicio-heading" className={sectionShell}>
        <h2 id="ejercicio-heading" className={sectionTitle}>
          <ListChecks size={17} className="text-[#83d7b4]" aria-hidden="true" /> Ejercicio
        </h2>
        <h3 className="mt-4 max-w-3xl text-base font-semibold tracking-tight">{lesson.exercise.title}</h3>

        <ol className="mt-5 flex flex-col gap-3">
          {lesson.exercise.steps.map((step, index) => (
            <li key={index} className="flex gap-4">
              <span
                className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-[#75e9f2]/15 text-xs font-semibold text-[#8cecf3]"
                aria-hidden="true"
              >
                {index + 1}
              </span>
              <span className="max-w-3xl pt-1 text-[0.9375rem] leading-[1.8] text-[#b5cbd4]">{step}</span>
            </li>
          ))}
        </ol>

        <p className="mt-6 max-w-3xl rounded-xl border border-[#ffcf72]/25 bg-[#ffcf72]/[.07] p-4 text-sm leading-6 text-[#d8c99d]">
          <span className="font-semibold text-[#ffcf72]">Entregable: </span>
          {lesson.exercise.deliverable}
        </p>

        <div className="mt-6">
          <h3 className="text-[10px] font-semibold uppercase tracking-[.2em] text-[#ff9eea]">Checklist de cumplimiento</h3>
          <ul className="mt-3 flex flex-col gap-2">
            {lesson.exercise.checklist.map((item, index) => (
              <li key={index}>
                <button
                  type="button"
                  aria-pressed={Boolean(checked[index])}
                  onClick={() => setChecked((current) => ({ ...current, [index]: !current[index] }))}
                  className={cn(
                    'flex w-full items-start gap-3 rounded-xl border p-3 text-left text-sm leading-6 transition',
                    checked[index]
                      ? 'border-[#83d7b4]/40 bg-[#83d7b4]/[.08] text-[#c5d8df]'
                      : 'border-white/10 bg-white/[.03] text-[#a9c0ca] hover:border-white/25',
                    focusRing,
                  )}
                >
                  <span
                    className={cn(
                      'mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-md border',
                      checked[index] ? 'border-[#83d7b4] bg-[#83d7b4]/25 text-[#83d7b4]' : 'border-white/25',
                    )}
                    aria-hidden="true"
                  >
                    {checked[index] ? <Check size={13} /> : null}
                  </span>
                  {item}
                </button>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-[11px] text-[#5f7a88]">
            Las casillas son una ayuda local para tu práctica; lo que queda registrado en tu cuenta es el botón
            «Marcar como completada».
          </p>
        </div>
      </section>

      {lesson.listening.length > 0 && (
        <section aria-labelledby="escucha-heading" className={sectionShell}>
          <h2 id="escucha-heading" className={sectionTitle}>
            <Headphones size={17} className="text-[#c09eff]" aria-hidden="true" /> Escucha guiada
          </h2>
          <ul className="mt-5 flex flex-col gap-4">
            {lesson.listening.map((reference, index) => (
              <li key={index} className="rounded-xl border border-white/10 bg-[#02080e]/30 p-4">
                <h3 className="text-sm font-semibold tracking-tight text-[#edfaff]">{reference.title}</h3>
                <p className="mt-2 max-w-3xl text-[0.9375rem] leading-[1.8] text-[#b5cbd4]">{reference.focus}</p>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <code className="rounded-lg border border-[#c09eff]/25 bg-[#c09eff]/[.08] px-2 py-1 font-mono text-[11px] text-[#d4c7ff]">
                    {reference.search}
                  </code>
                  <a
                    href={`https://www.google.com/search?q=${encodeURIComponent(reference.search)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={cn('text-[11px] font-medium text-[#8cecf3] underline underline-offset-4 hover:text-[#a0f4f9]', focusRing)}
                  >
                    Buscar
                  </a>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {lesson.pitfalls.length > 0 && (
        <section aria-labelledby="errores-heading" className={sectionShell}>
          <h2 id="errores-heading" className={sectionTitle}>
            <AlertTriangle size={17} className="text-[#ffcf72]" aria-hidden="true" /> Errores frecuentes y cómo se corrigen
          </h2>
          <ul className="mt-5 flex flex-col gap-4">
            {lesson.pitfalls.map((pitfall, index) => (
              <li key={index} className="grid gap-3 rounded-xl border border-white/10 bg-[#02080e]/30 p-4 md:grid-cols-2 md:gap-4">
                <p className="text-sm leading-7 text-[#b5cbd4]">
                  <span className="mb-1 block text-[10px] font-semibold uppercase tracking-[.2em] text-[#ff9eea]">Error</span>
                  {pitfall.mistake}
                </p>
                <p className="text-sm leading-7 text-[#b5cbd4] md:border-l md:border-white/10 md:pl-4">
                  <span className="mb-1 block text-[10px] font-semibold uppercase tracking-[.2em] text-[#83d7b4]">
                    Corrección
                  </span>
                  {pitfall.fix}
                </p>
              </li>
            ))}
          </ul>
        </section>
      )}

      <aside className="rounded-2xl border border-[#75e9f2]/35 bg-[#75e9f2]/[.08] p-6">
        <h2 className="text-[10px] font-semibold uppercase tracking-[.24em] text-[#8cecf3]">Para llevar</h2>
        <p className="mt-3 max-w-3xl text-base leading-8 text-[#edfaff]">{lesson.takeaway}</p>
      </aside>

      <section aria-labelledby="cierre-heading" className="rounded-2xl border border-white/10 bg-white/[.035] p-5 sm:p-6">
        <h2 id="cierre-heading" className="text-[10px] font-semibold uppercase tracking-[.24em] text-[#75e9f2]">
          Cerrar esta sesión
        </h2>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          {isDone ? (
            <p className="inline-flex items-center gap-2 rounded-full border border-[#83d7b4]/45 bg-[#83d7b4]/[.12] px-4 py-2 text-xs font-semibold text-[#83d7b4]">
              <Check size={14} aria-hidden="true" /> Ya está registrada como completada
            </p>
          ) : (
            <button
              type="button"
              onClick={markComplete}
              disabled={submitting}
              className={cn(
                'inline-flex items-center gap-2 rounded-full bg-[#75e9f2] px-5 py-2.5 text-sm font-semibold text-[#06131e] transition hover:bg-[#a0f4f9] disabled:cursor-wait disabled:opacity-60',
                focusRing,
              )}
            >
              {submitting ? 'Guardando…' : 'Marcar como completada'}
            </button>
          )}
        </div>

        <div aria-live="polite" role="status" className="mt-4 flex flex-col gap-3">
          {error && <p className="max-w-3xl text-sm leading-6 text-[#ffcf72]">{error}</p>}
          {feedback && !error && <p className="max-w-3xl text-sm leading-6 text-[#8cecf3]">{feedback}</p>}
          {newBadges.length > 0 && (
            <ul className="flex flex-wrap gap-2">
              {newBadges.map((code) => {
                const badge = badgeName(code)
                return (
                  <li
                    key={code}
                    className="inline-flex items-center gap-2 rounded-full border border-[#ffcf72]/45 bg-[#ffcf72]/[.12] px-3 py-1.5 text-xs font-semibold text-[#ffcf72]"
                  >
                    <Trophy size={13} aria-hidden="true" />
                    Insignia ganada: {badge?.name ?? code}
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </section>

      <nav aria-label="Lección anterior y siguiente" className="grid gap-3 sm:grid-cols-2">
        {previous ? (
          <Link
            href={`/curso/${previous.moduleId}/${previous.id}`}
            className={cn(
              'flex items-start gap-3 rounded-2xl border border-white/10 bg-white/[.035] p-4 transition hover:border-[#75e9f2]/45',
              focusRing,
            )}
          >
            <ChevronLeft className="mt-0.5 shrink-0 text-[#75e9f2]" size={18} aria-hidden="true" />
            <span>
              <span className="block text-[10px] uppercase tracking-[.2em] text-[#7f9aa7]">Anterior</span>
              <span className="mt-1 block text-sm font-medium leading-6">{previous.title}</span>
              <span className="mt-1 block text-[11px] text-[#7f9aa7]">{previous.kicker}</span>
            </span>
          </Link>
        ) : (
          <span aria-hidden="true" />
        )}

        {next ? (
          <Link
            href={`/curso/${next.moduleId}/${next.id}`}
            className={cn(
              'flex items-start gap-3 rounded-2xl border border-[#75e9f2]/35 bg-[#75e9f2]/[.07] p-4 transition hover:border-[#75e9f2]/60 sm:justify-end sm:text-right',
              focusRing,
            )}
          >
            <span className="min-w-0">
              <span className="block text-[10px] uppercase tracking-[.2em] text-[#7f9aa7]">Siguiente</span>
              <span className="mt-1 block text-sm font-medium leading-6">{next.title}</span>
              <span className="mt-1 block text-[11px] text-[#7f9aa7]">{next.kicker}</span>
            </span>
            <ChevronRight className="mt-0.5 shrink-0 text-[#75e9f2]" size={18} aria-hidden="true" />
          </Link>
        ) : (
          <Link
            href="/curso"
            className={cn(
              'flex items-start gap-3 rounded-2xl border border-white/10 bg-white/[.035] p-4 transition hover:border-[#75e9f2]/45 sm:justify-end',
              focusRing,
            )}
          >
            <span className="min-w-0">
              <span className="block text-[10px] uppercase tracking-[.2em] text-[#7f9aa7]">Última sesión</span>
              <span className="mt-1 block text-sm font-medium leading-6">Volver al programa</span>
            </span>
          </Link>
        )}
      </nav>
    </article>
  )
}
