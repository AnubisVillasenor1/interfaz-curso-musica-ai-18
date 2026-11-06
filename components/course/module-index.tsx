'use client'

import Link from 'next/link'
import { Check, ChevronRight, Clock3 } from 'lucide-react'

import { Reveal } from '@/components/reveal'
import { COURSE_MODULES, lessonsByModule, type CourseModule } from '@/lib/course'
import { cn } from '@/lib/utils'

import { BadgeGrid, ProgressBar, focusRing, useCourseProgress } from './progress-bar'

function pad(value: number) {
  return String(value).padStart(2, '0')
}

/**
 * Índice del programa en `/curso`.
 *
 * Título, subtítulo, resumen y resultado salen de `COURSE_MODULES`; el
 * recuento de lecciones y los minutos se derivan de `lessonsByModule`. Nada
 * de texto curricular copiado a mano en el JSX.
 */
export function CourseModulesIndex({ modules = COURSE_MODULES }: { modules?: CourseModule[] }) {
  const { progress } = useCourseProgress()
  const completed = new Set(progress.completed)

  return (
    <div className="flex flex-col gap-10">
      <ProgressBar progress={progress} label="Tu ruta en el programa" />

      <section aria-labelledby="modulos-heading">
        <h2 id="modulos-heading" className="pg-title" style={{ fontSize: 'var(--pg-step-2)' }}>
          Los {modules.length} módulos
        </h2>
        <p className="pg-note mt-3 max-w-2xl">
          Cada módulo termina en un entregable. Abre uno para ver sus sesiones, y una sesión para
          leerla completa.
        </p>

        <ol className="mt-6 flex flex-col gap-3">
          {modules.map((module, index) => {
            const lessons = lessonsByModule(module.index)
            const minutes = lessons.reduce((sum, lesson) => sum + lesson.minutes, 0)
            const doneCount = module.lessonIds.filter((id) => completed.has(id)).length
            const finished = module.lessonIds.length > 0 && doneCount === module.lessonIds.length

            return (
              <Reveal as="li" key={module.id} delay={60 * index}>
                <Link href={`/curso/${module.id}`} className={cn('pg-card pg-card-hover flex gap-4 p-5', focusRing)}>
                  <span
                    className="pg-mark"
                    data-state={finished ? 'done' : doneCount > 0 ? 'part' : undefined}
                    aria-hidden="true"
                  >
                    {finished ? <Check size={18} /> : pad(module.index)}
                  </span>

                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                      <strong className="text-[15px] font-semibold tracking-tight">{module.title}</strong>
                      <span className="pg-eyebrow">{module.subtitle}</span>
                    </span>
                    <span className="pg-note mt-2 block max-w-3xl" style={{ color: 'var(--pg-text)' }}>
                      {module.summary}
                    </span>
                    <span className="pg-callout mt-3 block max-w-3xl">
                      <b>Al terminar: </b>
                      {module.outcome}
                    </span>
                    <span className="pg-meta mt-3">
                      <span>
                        {lessons.length} lecciones · {minutes} min
                      </span>
                      <span data-state={doneCount > 0 ? 'part' : undefined}>
                        {doneCount} de {module.lessonIds.length} completadas
                      </span>
                    </span>
                  </span>

                  <ChevronRight className="pg-row-arrow" size={18} aria-hidden="true" />
                </Link>
              </Reveal>
            )
          })}
        </ol>
      </section>

      <section aria-labelledby="insignias-heading">
        <h2 id="insignias-heading" className="pg-title" style={{ fontSize: 'var(--pg-step-2)' }}>
          Insignias del programa
        </h2>
        <p className="pg-note mt-3 max-w-2xl">
          Se desbloquean solas al registrar el progreso; el conteo lo calcula la base de datos, no
          esta pantalla.
        </p>
        <div className="mt-6">
          <BadgeGrid badges={progress.badges} heading="Insignias del programa" />
        </div>
      </section>
    </div>
  )
}

/**
 * Lista de sesiones de un módulo en `/curso/[modulo]`, alimentada por
 * `lessonsByModule(module.index)`. Incluye la barra global para no repetir la
 * lectura de `GET /api/progress` dentro de la misma página.
 */
export function ModuleLessonList({ module }: { module: CourseModule }) {
  const { progress } = useCourseProgress()
  const completed = new Set(progress.completed)
  const lessons = lessonsByModule(module.index)

  return (
    <div className="flex flex-col gap-8">
      <ProgressBar progress={progress} label="Progreso del programa" />

      <ol className="flex flex-col gap-3">
        {lessons.map((lesson, index) => {
          const isDone = completed.has(lesson.id)
          return (
            <Reveal as="li" key={lesson.id} delay={45 * index}>
              <Link
                href={`/curso/${module.id}/${lesson.id}`}
                className={cn('pg-card pg-card-hover flex gap-4 p-5', focusRing)}
              >
                <span className="pg-mark" data-state={isDone ? 'done' : undefined} aria-hidden="true">
                  {isDone ? <Check size={18} /> : pad(lesson.lessonNumber)}
                </span>

                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                    <strong className="text-[15px] font-semibold tracking-tight">{lesson.title}</strong>
                    <span className="pg-eyebrow">{lesson.kicker}</span>
                  </span>
                  <span className="pg-note mt-2 block max-w-3xl" style={{ color: 'var(--pg-text)' }}>
                    {lesson.objective}
                  </span>
                  <span className="pg-meta mt-3">
                    <span>
                      <Clock3 size={12} className="mr-1 inline-block align-[-1px]" aria-hidden="true" />
                      {lesson.minutes} min
                    </span>
                    {isDone && <span data-state="part">Completada</span>}
                  </span>
                </span>

                <ChevronRight className="pg-row-arrow" size={18} aria-hidden="true" />
              </Link>
            </Reveal>
          )
        })}
      </ol>
    </div>
  )
}
