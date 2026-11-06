'use client'

import Link from 'next/link'
import { Check, ChevronRight, Clock3 } from 'lucide-react'

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
        <h2 id="modulos-heading" className="text-xl font-semibold tracking-tight">
          Los 5 módulos
        </h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-[#8fa9b5]">
          Cada módulo termina en un entregable. Abre uno para ver sus sesiones, y una sesión para leerla completa.
        </p>

        <ol className="mt-5 flex flex-col gap-3">
          {modules.map((module) => {
            const lessons = lessonsByModule(module.index)
            const minutes = lessons.reduce((sum, lesson) => sum + lesson.minutes, 0)
            const doneCount = module.lessonIds.filter((id) => completed.has(id)).length
            const finished = module.lessonIds.length > 0 && doneCount === module.lessonIds.length

            return (
              <li key={module.id}>
                <Link
                  href={`/curso/${module.id}`}
                  className={cn(
                    'group flex gap-4 rounded-2xl border p-5 transition hover:-translate-y-0.5',
                    finished
                      ? 'border-[#83d7b4]/40 bg-[#83d7b4]/[.06]'
                      : doneCount > 0
                        ? 'border-[#75e9f2]/45 bg-[#75e9f2]/[.07]'
                        : 'border-white/10 bg-white/[.035] hover:border-white/25',
                    focusRing,
                  )}
                >
                  <span
                    className={cn(
                      'flex size-11 shrink-0 items-center justify-center rounded-xl text-sm font-semibold',
                      finished ? 'bg-[#83d7b4]/20 text-[#83d7b4]' : 'bg-[#c09eff]/15 text-[#d4c7ff]',
                    )}
                    aria-hidden="true"
                  >
                    {finished ? <Check size={18} /> : pad(module.index)}
                  </span>

                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                      <strong className="text-base font-semibold tracking-tight">{module.title}</strong>
                      <span className="text-[10px] uppercase tracking-[.2em] text-[#ff9eea]">{module.subtitle}</span>
                    </span>
                    <span className="mt-2 block max-w-3xl text-sm leading-6 text-[#a9c0ca]">{module.summary}</span>
                    <span className="mt-3 block max-w-3xl rounded-xl border border-[#ffcf72]/20 bg-[#ffcf72]/[.05] p-3 text-xs leading-5 text-[#d8c99d]">
                      <span className="font-semibold text-[#ffcf72]">Al terminar: </span>
                      {module.outcome}
                    </span>
                    <span className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-[#7f9aa7]">
                      <span>
                        {lessons.length} lecciones · {minutes} min
                      </span>
                      <span className={cn(doneCount > 0 && 'text-[#8cecf3]')}>
                        {doneCount} de {module.lessonIds.length} completadas
                      </span>
                    </span>
                  </span>

                  <ChevronRight className="mt-1 shrink-0 text-[#6f8995] transition group-hover:text-[#75e9f2]" size={18} />
                </Link>
              </li>
            )
          })}
        </ol>
      </section>

      <section aria-labelledby="insignias-heading">
        <h2 id="insignias-heading" className="text-xl font-semibold tracking-tight">
          Insignias del programa
        </h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-[#8fa9b5]">
          Se desbloquean solas al registrar el progreso; el conteo lo calcula la base de datos, no esta pantalla.
        </p>
        <div className="mt-5">
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
        {lessons.map((lesson) => {
          const isDone = completed.has(lesson.id)
          return (
            <li key={lesson.id}>
              <Link
                href={`/curso/${module.id}/${lesson.id}`}
                className={cn(
                  'group flex gap-4 rounded-2xl border p-5 transition hover:-translate-y-0.5',
                  isDone ? 'border-[#83d7b4]/40 bg-[#83d7b4]/[.06]' : 'border-white/10 bg-white/[.035] hover:border-[#75e9f2]/40',
                  focusRing,
                )}
              >
                <span
                  className={cn(
                    'flex size-11 shrink-0 items-center justify-center rounded-xl text-sm font-semibold',
                    isDone ? 'bg-[#83d7b4]/20 text-[#83d7b4]' : 'bg-[#75e9f2]/12 text-[#8cecf3]',
                  )}
                  aria-hidden="true"
                >
                  {isDone ? <Check size={18} /> : pad(lesson.lessonNumber)}
                </span>

                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
                    <strong className="text-base font-semibold tracking-tight">{lesson.title}</strong>
                    <span className="text-[10px] uppercase tracking-[.2em] text-[#ff9eea]">{lesson.kicker}</span>
                  </span>
                  <span className="mt-2 block max-w-3xl text-sm leading-6 text-[#a9c0ca]">{lesson.objective}</span>
                  <span className="mt-3 flex flex-wrap items-center gap-2 text-[11px] text-[#7f9aa7]">
                    <span className="inline-flex items-center gap-1.5">
                      <Clock3 size={13} aria-hidden="true" /> {lesson.minutes} min
                    </span>
                    {isDone && (
                      <span className="font-semibold uppercase tracking-[.2em] text-[#83d7b4]">Completada</span>
                    )}
                  </span>
                </span>

                <ChevronRight className="mt-1 shrink-0 text-[#6f8995] transition group-hover:text-[#75e9f2]" size={18} />
              </Link>
            </li>
          )
        })}
      </ol>
    </div>
  )
}
