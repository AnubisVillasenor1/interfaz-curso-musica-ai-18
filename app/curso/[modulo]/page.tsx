import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft, ChevronRight, Clock3 } from 'lucide-react'

import { ModuleLessonList } from '@/components/course/module-index'
import { COURSE_MODULES, lessonsByModule, type CourseModule } from '@/lib/course'
import { cn } from '@/lib/utils'

type Props = { params: Promise<{ modulo: string }> }

/**
 * El segmento `[modulo]` acepta el identificador real (`m01` … `m05`) y también
 * su índice (`1` … `5`), porque las dos formas aparecen ya en la UI del
 * producto. Cualquier otro valor cae en `notFound()`.
 */
function findModule(value: string): CourseModule | undefined {
  const key = value.trim().toLowerCase()
  return COURSE_MODULES.find((module) => module.id === key || String(module.index) === key)
}

export function generateStaticParams() {
  return COURSE_MODULES.map((module) => ({ modulo: module.id }))
}

const focusRing =
  'outline-none focus-visible:ring-2 focus-visible:ring-[#75e9f2] focus-visible:ring-offset-2 focus-visible:ring-offset-[#07121f]'

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { modulo } = await params
  const module = findModule(modulo)
  if (!module) return { title: 'Módulo no disponible · Play and Go by TAMV ONLINE' }

  return {
    title: `${module.title} · Play and Go by TAMV ONLINE`,
    description: module.summary,
  }
}

export default async function CursoModuloPage({ params }: Props) {
  const { modulo } = await params
  const module = findModule(modulo)
  if (!module) return notFound()

  const lessons = lessonsByModule(module.index)
  const minutes = lessons.reduce((sum, lesson) => sum + lesson.minutes, 0)
  const nextModule = COURSE_MODULES.find((item) => item.index === module.index + 1)

  return (
    <main className="min-h-screen bg-[#07121f] text-[#edfaff] selection:bg-[#75e9f2]/30">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_75%_5%,rgba(88,213,230,.16),transparent_30%),radial-gradient(circle_at_15%_80%,rgba(155,92,226,.14),transparent_32%)]" />

      <header className="relative z-20 mx-auto flex max-w-5xl items-center justify-between gap-4 px-5 py-5 lg:px-8">
        <Link href="/curso" className={cn('flex items-center gap-2 text-xs text-[#a9c0ca] hover:text-[#edfaff]', focusRing)}>
          <ArrowLeft size={15} aria-hidden="true" /> Programa
        </Link>
        <p className="text-[10px] uppercase tracking-[.24em] text-[#9fb8c7]">Módulo {String(module.index).padStart(2, '0')}</p>
        <span aria-hidden="true" className="w-16" />
      </header>

      <div className="relative z-10 mx-auto max-w-5xl px-5 pb-20 pt-6 lg:px-8">
        <section className="rounded-3xl border border-[#c09eff]/25 bg-[#c09eff]/[.06] p-6 sm:p-8">
          <p className="text-[10px] font-semibold uppercase tracking-[.24em] text-[#ff9eea]">{module.subtitle}</p>
          <h1 className="mt-4 max-w-3xl text-3xl font-semibold leading-[1.08] tracking-[-.05em] sm:text-4xl">{module.title}</h1>
          <p className="mt-5 max-w-3xl text-[0.975rem] leading-[1.85] text-[#aac3ce]">{module.summary}</p>
          <p className="mt-5 max-w-3xl rounded-2xl border border-[#ffcf72]/25 bg-[#ffcf72]/[.07] p-4 text-sm leading-7 text-[#d8c99d]">
            <span className="font-semibold text-[#ffcf72]">Al terminar este módulo: </span>
            {module.outcome}
          </p>
          <p className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2 text-[11px] text-[#7f9aa7]">
            <span>
              {lessons.length} lecciones · {module.id}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Clock3 size={13} aria-hidden="true" /> {minutes} min de trabajo guiado
            </span>
          </p>
        </section>

        <h2 className="mt-10 text-xl font-semibold tracking-tight">Sesiones de este módulo</h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-[#8fa9b5]">
          Cada sesión se abre completa: explicación, ejemplos, técnicas, prompts copiables, ejercicio con entregable,
          escucha guiada y errores frecuentes.
        </p>

        <div className="mt-6">
          <ModuleLessonList module={module} />
        </div>

        {nextModule && (
          <div className="mt-10 border-t border-white/10 pt-8">
            <Link
              href={`/curso/${nextModule.id}`}
              className={cn(
                'group flex items-center gap-4 rounded-2xl border border-white/10 bg-white/[.035] p-5 transition hover:border-[#75e9f2]/45',
                focusRing,
              )}
            >
              <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-[#c09eff]/15 text-sm font-semibold text-[#d4c7ff]">
                {String(nextModule.index).padStart(2, '0')}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[10px] uppercase tracking-[.2em] text-[#7f9aa7]">Siguiente módulo</span>
                <strong className="mt-1 block text-base font-semibold tracking-tight">{nextModule.title}</strong>
              </span>
              <ChevronRight className="shrink-0 text-[#6f8995] transition group-hover:text-[#75e9f2]" size={18} aria-hidden="true" />
            </Link>
          </div>
        )}
      </div>

      <footer className="relative z-10 border-t border-white/10 px-5 py-8 text-center text-xs text-[#78919d]">
        Play and Go by TAMV ONLINE <span className="mx-2 text-[#75e9f2]">•</span> Orgullosamente Realmontenses
      </footer>
    </main>
  )
}
