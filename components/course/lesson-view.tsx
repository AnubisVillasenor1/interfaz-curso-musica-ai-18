'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
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
  Trophy,
} from 'lucide-react'

import { COURSE_BADGES, type CourseModule, type Lesson, type PromptTemplate } from '@/lib/course'
import type { LessonMediaCollection } from '@/lib/course-media'

import { AudioSectionButton } from './audio-section-button'
import { ProgressBar, useCourseProgress } from './progress-bar'

export interface LessonNavItem {
  id: string
  title: string
  kicker: string
  moduleId: string
}

/** Nombre visible de una insignia a partir del código que devolvió la API. */
const badgeName = (code: string) => COURSE_BADGES.find((badge) => badge.code === code)

/**
 * Envoltorios que comparten todas las secciones de contenido. Vienen del
 * sistema editorial de `app/globals.css`: si una lección necesita un color o
 * una altura de texto nueva, se añade al vocabulario allí, no se escribe un
 * hex suelto en este archivo.
 */
const sectionShell = 'pg-panel p-5 sm:p-7'
const bodyText = 'pg-prose'
const sectionTitle = 'pg-section-title'

const moduleVisuals: Record<number, { src: string; alt: string }> = {
  1: { src: '/visuals/neural-melody.png', alt: 'Sintetizador modular y ondas generativas en un estudio nocturno' },
  2: { src: '/visuals/beat-lab.png', alt: 'Secuenciador de ritmos y pads de producción musical' },
  3: { src: '/visuals/vocal-lab.png', alt: 'Micrófono de estudio y consola para trabajo vocal' },
  4: { src: '/visuals/mixing-console.png', alt: 'Consola de mezcla con medidores y canales de audio' },
  5: { src: '/visuals/playlist-night.png', alt: 'Portada de lanzamiento musical en un entorno nocturno' },
}

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
          <span key={`${part}-${index}`} className="pg-var">
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
    <li className="pg-card pg-card-prompt p-5">
      <h4 className="pg-item-title pg-accent-violet">{prompt.name}</h4>
      <p className="pg-note mt-1.5">{prompt.outcome}</p>

      <p className="pg-code mt-4">
        <PromptText text={prompt.text} />
      </p>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button type="button" onClick={copy} className="pg-btn pg-btn-ghost pg-btn-sm">
          {copied ? <Check size={14} aria-hidden="true" /> : <Copy size={14} aria-hidden="true" />}
          {copied ? 'Copiado' : 'Copiar prompt'}
        </button>
        <span aria-live="polite" className="sr-only">
          {copied ? `Prompt «${prompt.name}» copiado al portapapeles.` : ''}
        </span>
      </div>

      <div className="mt-4">
        <p className="pg-label">Variables a sustituir ({prompt.variables.length})</p>
        <ul className="mt-2 flex flex-wrap gap-1.5">
          {prompt.variables.map((variable, index) => (
            <li key={`${variable}-${index}`} className="pg-var pg-var-chip">
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
  media,
  courseModule,
  previous,
  next,
}: {
  lesson: Lesson
  media: LessonMediaCollection
  courseModule: CourseModule
  previous?: LessonNavItem
  next?: LessonNavItem
}) {
  const { progress, checkpoints, applyCompletion } = useCourseProgress()
  const [submitting, setSubmitting] = useState(false)
  const [feedback, setFeedback] = useState<string | null>(null)
  const [newBadges, setNewBadges] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)
  const [checked, setChecked] = useState<Record<number, boolean>>({})

  useEffect(() => {
    setChecked(checkpoints[lesson.id] ?? {})
  }, [checkpoints, lesson.id])

  const isDone = progress.completed.includes(lesson.id)

  async function saveCheckpoint(next: Record<number, boolean>) {
    setChecked(next)
    await fetch('/api/progress', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lessonId: lesson.id, checkpoint: next }),
    }).catch(() => undefined)
  }

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
        <ol className="pg-meta flex-wrap gap-x-2">
          <li>
            <Link href="/curso">Programa</Link>
          </li>
          <li aria-hidden="true" className="opacity-40">
            /
          </li>
          <li>
            <Link href={`/curso/${courseModule.id}`}>{courseModule.title}</Link>
          </li>
          <li aria-hidden="true" className="opacity-40">
            /
          </li>
          <li aria-current="page">Sesión {String(lesson.lessonNumber).padStart(2, '0')}</li>
        </ol>
      </nav>

      <header className="pg-card pg-card-featured p-6 sm:p-8">
        <p className="pg-eyebrow" data-tone="magenta">
          {lesson.kicker}
        </p>
        <h1 className="pg-title max-w-3xl">{lesson.title}</h1>
        <p className="pg-meta mt-4">
          <span className="inline-flex items-center gap-1.5">
            <Clock3 size={12} aria-hidden="true" /> {lesson.minutes} min
          </span>
          <span>
            Módulo {String(courseModule.index).padStart(2, '0')} · {courseModule.title}
          </span>
          <span>
            Lección {lesson.lessonNumber} de {progress.total}
          </span>
        </p>
        <p className="pg-callout mt-5" data-tone="violet" data-size="lead">
          <b>Objetivo: </b>
          {lesson.objective}
        </p>
        <figure className="pg-inset relative mt-5 aspect-video overflow-hidden" aria-label={`Imagen de apoyo: ${lesson.title}`}>
          <Image
            src={moduleVisuals[courseModule.index]?.src ?? '/visuals/sonic-architecture.png'}
            alt={moduleVisuals[courseModule.index]?.alt ?? 'Visualización de arquitectura sonora'}
            fill
            sizes="(max-width: 768px) 100vw, 768px"
            className="object-cover"
          />
          <figcaption className="absolute inset-x-0 bottom-0 bg-black/65 px-4 py-2 text-xs text-white">
            Recurso visual del módulo {String(courseModule.index).padStart(2, '0')} · Play &amp; Go
          </figcaption>
        </figure>
        <div className="mt-5">
          <AudioSectionButton text={`${lesson.title}. Objetivo: ${lesson.objective}. ${lesson.takeaway}`} label="Escuchar la lección" />
        </div>
      </header>

      <ProgressBar progress={progress} label="Progreso del programa" />

      <section aria-labelledby="desarrollo-heading" className={sectionShell}>
        <h2 id="desarrollo-heading" className={sectionTitle}>
          <Sparkles size={18} className="pg-accent-cyan" aria-hidden="true" /> La lección
        </h2>
        <div className="mt-5 flex flex-col gap-8">
          {lesson.blocks.map((block, index) => (
            <div key={`${block.heading}-${index}`}>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h3 className="pg-block-title">{block.heading}</h3>
                <AudioSectionButton text={`${block.heading}. ${block.body.join(' ')}`} label="Escuchar sección" />
              </div>
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
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 id="ejemplos-heading" className={sectionTitle}>
              <Quote size={18} className="pg-accent-magenta" aria-hidden="true" /> Ejemplos
            </h2>
            <AudioSectionButton text={`Ejemplos. ${lesson.examples.join(' ')}`} label="Escuchar ejemplos" />
          </div>
          <ul className="mt-5 flex flex-col gap-4">
            {lesson.examples.map((example, index) => (
              <li key={index} className="pg-quote">
                {example}
              </li>
            ))}
          </ul>
        </section>
      )}

      {lesson.techniques.length > 0 && (
        <section aria-labelledby="tecnicas-heading" className={sectionShell}>
          <h2 id="tecnicas-heading" className={sectionTitle}>
            <Lightbulb size={18} className="pg-accent-amber" aria-hidden="true" /> Técnicas
          </h2>
          <ul className="mt-5 grid gap-3 md:grid-cols-2">
            {lesson.techniques.map((technique, index) => (
              <li key={index} className="pg-inset pg-prose">
                <span className="pg-num-inline mr-2">{String(index + 1).padStart(2, '0')}</span>
                {technique}
              </li>
            ))}
          </ul>
        </section>
      )}

      {lesson.prompts.length > 0 && (
        <section aria-labelledby="prompts-heading" className={sectionShell}>
          <h2 id="prompts-heading" className={sectionTitle}>
            <Copy size={18} className="pg-accent-cyan" aria-hidden="true" /> Prompts de la sesión
          </h2>
          <p className="pg-prose mt-2">
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
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id="ejercicio-heading" className={sectionTitle}>
            <ListChecks size={18} className="pg-accent-mint" aria-hidden="true" /> Ejercicio
          </h2>
          <AudioSectionButton text={`${lesson.exercise.title}. ${lesson.exercise.steps.join(' ')} Entregable: ${lesson.exercise.deliverable}`} label="Escuchar ejercicio" />
        </div>
        <h3 className="pg-block-title mt-4">{lesson.exercise.title}</h3>

        <ol className="mt-5 flex flex-col gap-3">
          {lesson.exercise.steps.map((step, index) => (
            <li key={index} className="flex gap-4">
              <span className="pg-num" aria-hidden="true">
                {index + 1}
              </span>
              <span className="pg-prose pt-1">{step}</span>
            </li>
          ))}
        </ol>

        <p className="pg-callout mt-6" data-size="lead">
          <b>Entregable: </b>
          {lesson.exercise.deliverable}
        </p>

        <div className="mt-6">
          <h3 className="pg-label">Checklist de cumplimiento</h3>
          <ul className="mt-3 flex flex-col gap-2">
            {lesson.exercise.checklist.map((item, index) => (
              <li key={index}>
                <button
                  type="button"
                  aria-pressed={Boolean(checked[index])}
                  onClick={() => {
                    const next = { ...checked, [index]: !checked[index] }
                    void saveCheckpoint(next)
                  }}
                  className="pg-check"
                >
                  <span className="pg-check-box" aria-hidden="true">
                    {checked[index] ? <Check size={13} /> : null}
                  </span>
                  {item}
                </button>
              </li>
            ))}
          </ul>
          <p className="pg-note mt-2 max-w-3xl">
            Las casillas se guardan automáticamente en tu cuenta; también marca la lección como completada cuando termines el entregable.
          </p>
        </div>
      </section>

      {lesson.listening.length > 0 && (
        <section aria-labelledby="escucha-heading" className={sectionShell}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 id="escucha-heading" className={sectionTitle}>
              <Headphones size={18} className="pg-accent-violet" aria-hidden="true" /> Escucha guiada
            </h2>
            <AudioSectionButton text={`Escucha guiada. ${lesson.listening.map((item) => `${item.title}. ${item.focus}`).join(' ')}`} label="Escuchar guía" />
          </div>
          <ul className="mt-5 flex flex-col gap-4">
            {lesson.listening.map((reference, index) => (
              <li key={index} className="pg-inset">
                <h3 className="pg-item-title">{reference.title}</h3>
                <p className="pg-prose mt-2">{reference.focus}</p>
                <div className="mt-3 flex flex-wrap items-center gap-3">
                  <code className="pg-var pg-var-chip" data-tone="violet">
                    {reference.search}
                  </code>
                  <a
                    href={`https://openverse.org/search/audio?q=${encodeURIComponent(reference.search)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="pg-minilink"
                  >
                    Buscar audio abierto
                  </a>
                  <a
                    href={`https://commons.wikimedia.org/w/index.php?search=${encodeURIComponent(`filetype:video ${reference.search}`)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="pg-minilink"
                    aria-label={`Buscar video abierto sobre ${reference.title} en Wikimedia Commons; verificar la licencia antes de reutilizarlo`}
                  >
                    Buscar video abierto
                  </a>
                  <span className="pg-note">Verifica la licencia de cada recurso antes de reutilizarlo.</span>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section aria-labelledby="open-media-heading" className={sectionShell}>
        <h2 id="open-media-heading" className={sectionTitle}>
          <Headphones size={18} className="pg-accent-violet" aria-hidden="true" /> Medios audiovisuales abiertos
        </h2>
        <p className="pg-note mt-2">Se muestran recursos con licencias abiertas verificables (CC0, CC BY o CC BY-SA). Confirma la atribución y los subtítulos en la ficha original antes de reutilizar el material.</p>
        <div className="mt-5 grid gap-5">
          {media.video ? <figure className="pg-inset p-4">
            <h3 className="pg-item-title">{media.video.title}</h3>
            <video controls preload="none" playsInline className="mt-3 w-full rounded-xl" aria-label={`Video de apoyo para ${lesson.title}`}>
              <source src={media.video.url} />
              Tu navegador no puede reproducir este video. <a href={media.video.pageUrl} target="_blank" rel="noopener noreferrer">Abrir la ficha del recurso</a>.
            </video>
            <figcaption className="pg-note mt-3">{media.video.creator} · {media.video.provider} · {media.video.relevance === 'topic' ? 'Coincidencia temática' : 'Ejemplo general abierto'} · {media.video.licenseLabel} · <a href={media.video.licenseUrl} target="_blank" rel="noopener noreferrer" className="pg-minilink">Ver licencia</a> · <a href={media.video.pageUrl} target="_blank" rel="noopener noreferrer" className="pg-minilink">Ficha y subtítulos</a></figcaption>
          </figure> : <p className="pg-inset pg-note p-4">No se encontró un video compatible con licencia abierta para esta sesión. Usa las búsquedas por tema y revisa la licencia de cada resultado.</p>}
          {media.audio ? <figure className="pg-inset p-4">
            <h3 className="pg-item-title">Escucha de referencia · {media.audio.title}</h3>
            <audio controls preload="none" className="mt-3 w-full" aria-label={`Audio de referencia para ${lesson.title}`} src={media.audio.url}>Tu navegador no puede reproducir este audio.</audio>
            <figcaption className="pg-note mt-3">{media.audio.creator} · {media.audio.provider} · {media.audio.relevance === 'topic' ? 'Coincidencia temática' : 'Ejemplo general abierto'} · {media.audio.licenseLabel} · <a href={media.audio.licenseUrl} target="_blank" rel="noopener noreferrer" className="pg-minilink">Ver licencia</a> · <a href={media.audio.pageUrl} target="_blank" rel="noopener noreferrer" className="pg-minilink">Ficha del recurso</a></figcaption>
          </figure> : <p className="pg-inset pg-note p-4">No se encontró una pista compatible con licencia abierta para esta sesión. La guía de escucha y la narración de la lección siguen disponibles.</p>}
        </div>
      </section>

      {lesson.pitfalls.length > 0 && (
        <section aria-labelledby="errores-heading" className={sectionShell}>
          <h2 id="errores-heading" className={sectionTitle}>
            <AlertTriangle size={18} className="pg-accent-amber" aria-hidden="true" /> Errores frecuentes y cómo se corrigen
          </h2>
          <ul className="mt-5 flex flex-col gap-4">
            {lesson.pitfalls.map((pitfall, index) => (
              <li key={index} className="pg-inset grid gap-3 md:grid-cols-2 md:gap-4">
                <p className="pg-prose">
                  <span className="pg-label mb-1 block">Error</span>
                  {pitfall.mistake}
                </p>
                <p className="pg-prose pg-pitfall-fix">
                  <span className="pg-label mb-1 block" data-tone="mint">
                    Corrección
                  </span>
                  {pitfall.fix}
                </p>
              </li>
            ))}
          </ul>
        </section>
      )}

      <aside className="pg-card pg-card-featured p-6">
        <h2 className="pg-label" data-tone="cyan">
          Para llevar
        </h2>
        <p className="pg-lead mt-3">{lesson.takeaway}</p>
      </aside>

      <section aria-labelledby="cierre-heading" className="pg-panel p-5 sm:p-6">
        <h2 id="cierre-heading" className="pg-label" data-tone="cyan">
          Cerrar esta sesión
        </h2>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          {isDone ? (
            <p className="pg-flag">
              <Check size={14} aria-hidden="true" /> Ya está registrada como completada
            </p>
          ) : (
            <button type="button" onClick={markComplete} disabled={submitting} className="pg-btn pg-btn-primary">
              {submitting ? 'Guardando…' : 'Marcar como completada'}
            </button>
          )}
        </div>

        <div aria-live="polite" role="status" className="mt-4 flex flex-col gap-3">
          {error && <p className="pg-status" data-tone="error">{error}</p>}
          {feedback && !error && <p className="pg-status">{feedback}</p>}
          {newBadges.length > 0 && (
            <ul className="flex flex-wrap gap-2">
              {newBadges.map((code) => {
                const badge = badgeName(code)
                return (
                  <li key={code} className="pg-flag" data-tone="amber">
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
          <Link href={`/curso/${previous.moduleId}/${previous.id}`} className="pg-card pg-card-hover flex items-start gap-3 p-4">
            <ChevronLeft className="pg-accent-cyan mt-0.5 shrink-0" size={18} aria-hidden="true" />
            <span className="min-w-0">
              <span className="pg-label block" data-tone="muted">
                Anterior
              </span>
              <span className="pg-item-title mt-1.5 block leading-6">{previous.title}</span>
              <span className="pg-note mt-1 block">{previous.kicker}</span>
            </span>
          </Link>
        ) : (
          <span aria-hidden="true" />
        )}

        {next ? (
          <Link
            href={`/curso/${next.moduleId}/${next.id}`}
            className="pg-card pg-card-featured pg-card-hover flex items-start gap-3 p-4 sm:justify-end sm:text-right"
          >
            <span className="min-w-0">
              <span className="pg-label block" data-tone="muted">
                Siguiente
              </span>
              <span className="pg-item-title mt-1.5 block leading-6">{next.title}</span>
              <span className="pg-note mt-1 block">{next.kicker}</span>
            </span>
            <ChevronRight className="pg-accent-cyan mt-0.5 shrink-0" size={18} aria-hidden="true" />
          </Link>
        ) : (
          <Link href="/curso" className="pg-card pg-card-hover flex items-start gap-3 p-4 sm:justify-end">
            <span className="min-w-0">
              <span className="pg-label block" data-tone="muted">
                Última sesión
              </span>
              <span className="pg-item-title mt-1.5 block leading-6">Volver al programa</span>
            </span>
          </Link>
        )}
      </nav>
    </article>
  )
}
