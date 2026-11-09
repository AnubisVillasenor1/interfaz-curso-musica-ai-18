'use client'

import { useCallback, useState } from 'react'
import Link from 'next/link'
import {
  ArrowRight,
  Check,
  ChevronRight,
  Clock3,
  Layers3,
  LockKeyhole,
  Sparkles,
} from 'lucide-react'

import { Dialog } from '@/components/ui/dialog'
import { Reveal } from '@/components/reveal'
import { COURSE_MODULES, lessonsByModule } from '@/lib/course'

/**
 * Imágenes ya versionadas en `/public/visuals`. Se eligen por tema para que la
 * tarjeta diga algo antes de leer el título; nada de Unsplash ni de URLs que
 * puedan desaparecer.
 */
const MODULE_VISUALS = [
  { src: '/visuals/sonic-architecture.png', alt: 'Arquitectura construida con ondas sonoras' },
  { src: '/visuals/neural-melody.png', alt: 'Melodía convertida en caminos neuronales' },
  { src: '/visuals/vocal-atmosphere.png', alt: 'Atmósfera vocal inmersiva' },
  { src: '/visuals/mixing-console.png', alt: 'Consola de mezcla holográfica' },
  { src: '/visuals/golden-wave.png', alt: 'Onda sonora de oro líquido' },
] as const

const MODULE_CATEGORIES = [
  'Fundamentos',
  'Prompting',
  'Voz y letra',
  'Producción',
  'Release',
] as const

const MODULE_STATE = [
  { id: 'done', label: 'Completado' },
  { id: 'current', label: 'Siguiente' },
  { id: 'locked', label: 'Con el curso' },
  { id: 'locked', label: 'Con el curso' },
  { id: 'locked', label: 'Con el curso' },
] as const

function minutesLabel(minutes: number): string {
  if (minutes < 60) return `${minutes} min`
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  return rest ? `${hours} h ${String(rest).padStart(2, '0')} min` : `${hours} h`
}

/**
 * Rejilla de módulos con detalle en diálogo.
 *
 * Antes era una lista de cinco filas: correcta, pero no dejaba ver el temario
 * sin salir de la portada. Ahora cada tarjeta abre el módulo completo —sesiones,
 * entregable y estado— y el botón final lleva a la ruta real. Los módulos que
 * aún no están incluidos en la cuenta muestran el precio en vez de fingir un
 * candado que no lleva a ninguna parte.
 */
export function ModuleGrid() {
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const close = useCallback(() => setSelectedId(null), [])

  const selected = COURSE_MODULES.find((module) => module.id === selectedId) ?? null
  const selectedIndex = selected ? COURSE_MODULES.findIndex((module) => module.id === selected.id) : -1
  const selectedLessons = selected ? lessonsByModule(selected.index) : []
  const selectedMinutes = selectedLessons.reduce((sum, lesson) => sum + lesson.minutes, 0)
  const selectedState = selectedIndex >= 0 ? MODULE_STATE[selectedIndex] : MODULE_STATE[0]

  return (
    <section id="ruta" className="pg-section">
      <div className="pg-container">
        <div className="flex flex-wrap items-end justify-between gap-5">
          <div className="max-w-2xl">
            <p className="pg-eyebrow">Estructura del programa</p>
            <h2 className="pg-title">{COURSE_MODULES.length} módulos para pasar de la idea al release.</h2>
            <p className="pg-lede">
              Cada tarjeta abre el temario completo. El recorrido está diseñado para que puedas explicar qué decidió
              el motor, qué decidiste tú y cómo defenderlo con evidencia.
            </p>
          </div>
          <Link href="/curso" className="pg-btn pg-btn-ghost pg-btn-sm">
            Ver el programa completo <ArrowRight size={14} aria-hidden />
          </Link>
        </div>

        <div className="module-grid mt-9">
          {COURSE_MODULES.map((module, index) => {
            const lessons = lessonsByModule(module.index)
            const minutes = lessons.reduce((sum, lesson) => sum + lesson.minutes, 0)
            const visual = MODULE_VISUALS[index % MODULE_VISUALS.length]
            const state = MODULE_STATE[index]
            const category = MODULE_CATEGORIES[index] ?? 'Módulo'

            return (
              <Reveal key={module.id} delay={index * 70}>
                <button
                  type="button"
                  className="module-card"
                  aria-haspopup="dialog"
                  onClick={() => setSelectedId(module.id)}
                >
                  <span className="module-card-media">
                    <img src={visual.src} alt={visual.alt} loading="lazy" />
                    <span className="module-card-shade" aria-hidden="true" />
                    <span className="module-card-scan" aria-hidden="true" />
                    <span className="module-card-topline">
                      <span className="module-card-number">MÓDULO {String(module.index).padStart(2, '0')}</span>
                      <span className="module-card-state" data-state={state.id}>
                        {state.id === 'done' ? <Check size={11} aria-hidden /> : null}
                        {state.id === 'locked' ? <LockKeyhole size={11} aria-hidden /> : null}
                        {state.id === 'current' ? <Sparkles size={11} aria-hidden /> : null}
                        {state.label}
                      </span>
                    </span>
                  </span>

                  <span className="module-card-body">
                    <span className="module-card-category">{category}</span>
                    <strong className="module-card-title">{module.title}</strong>
                    <span className="module-card-summary">{module.summary}</span>
                    <span className="module-card-foot">
                      <span className="module-card-meta">
                        <Layers3 size={12} aria-hidden /> {lessons.length} sesiones
                        <span className="module-card-dot" aria-hidden>·</span>
                        <Clock3 size={12} aria-hidden /> {minutesLabel(minutes)}
                      </span>
                      <span className="module-card-open">
                        Ver detalle <ChevronRight size={13} aria-hidden />
                      </span>
                    </span>
                  </span>
                </button>
              </Reveal>
            )
          })}
        </div>
      </div>

      <Dialog
        open={Boolean(selected)}
        onClose={close}
        eyebrow={selected ? `Módulo ${String(selected.index).padStart(2, '0')} · ${MODULE_CATEGORIES[selectedIndex] ?? 'Programa'}` : 'Programa'}
        title={selected?.title ?? 'Módulo'}
        className="pg-dialog-wide"
      >
        {selected && (
          <>
            <figure className="module-dialog-banner">
              <img
                src={MODULE_VISUALS[selectedIndex % MODULE_VISUALS.length]?.src}
                alt={MODULE_VISUALS[selectedIndex % MODULE_VISUALS.length]?.alt ?? ''}
              />
              <figcaption>
                <span>{selected.subtitle}</span>
                <small>
                  {selectedLessons.length} sesiones · {minutesLabel(selectedMinutes)} · {selectedState.label}
                </small>
              </figcaption>
            </figure>

            <p className="pg-note mt-4">{selected.summary}</p>
            <div className="pg-callout mt-4">
              <strong>Entregable · </strong>
              {selected.outcome}
            </div>

            <ol className="module-dialog-lessons mt-5">
              {selectedLessons.map((lesson) => (
                <li key={lesson.id}>
                  <span className="module-dialog-number">{String(lesson.lessonNumber).padStart(2, '0')}</span>
                  <span className="module-dialog-lesson-copy">
                    <strong>{lesson.title}</strong>
                    <small>{lesson.minutes} min · {lesson.kicker}</small>
                  </span>
                  {selectedState.id === 'locked' ? (
                    <LockKeyhole size={14} className="module-dialog-lock" aria-hidden />
                  ) : (
                    <Link href={`/curso/${selected.id}/${lesson.id}`} className="module-dialog-link">
                      Abrir <ChevronRight size={13} aria-hidden />
                    </Link>
                  )}
                </li>
              ))}
            </ol>

            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href={selectedState.id === 'locked' ? '/precios' : `/curso/${selected.id}`}
                className="pg-btn pg-btn-primary"
              >
                {selectedState.id === 'locked' ? 'Desbloquear con el curso' : 'Entrar al módulo'}
                <ArrowRight size={14} aria-hidden />
              </Link>
              <Link href="/curso" className="pg-btn pg-btn-ghost">
                Ver todo el programa
              </Link>
            </div>
          </>
        )}
      </Dialog>
    </section>
  )
}
