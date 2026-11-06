import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft, ChevronRight, Clock3 } from 'lucide-react'

import { ModuleLessonList } from '@/components/course/module-index'
import { COURSE_MODULES, lessonsByModule, type CourseModule } from '@/lib/course'

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
    <main
      className="pg-shell relative min-h-screen overflow-x-clip"
      style={{ background: 'var(--pg-bg)', color: 'var(--pg-ink)' }}
    >
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 -z-10"
        style={{
          background:
            'radial-gradient(circle at 76% 2%, rgba(117,233,242,.13), transparent 33%), radial-gradient(circle at 14% 86%, rgba(192,158,255,.11), transparent 35%)',
        }}
      />

      <header className="pg-container flex items-center justify-between gap-4 py-5">
        <Link href="/curso" className="pg-navlink inline-flex items-center gap-2">
          <ArrowLeft size={14} aria-hidden="true" /> Programa
        </Link>
        <p className="pg-eyebrow">Módulo {String(module.index).padStart(2, '0')}</p>
        <span aria-hidden="true" className="w-16" />
      </header>

      <div className="pg-container pb-20">
        <section className="pg-card p-6 sm:p-8">
          <p className="pg-eyebrow">{module.subtitle}</p>
          <h1 className="pg-title">{module.title}</h1>
          <p className="pg-lede">{module.summary}</p>
          <p className="pg-callout mt-6 max-w-3xl">
            <b>Al terminar este módulo: </b>
            {module.outcome}
          </p>
          <p className="pg-meta mt-5">
            <span>
              {lessons.length} lecciones · {module.id}
            </span>
            <span>
              <Clock3 size={12} className="mr-1 inline-block align-[-1px]" aria-hidden="true" />
              {minutes} min de trabajo guiado
            </span>
          </p>
        </section>

        <h2 className="pg-title mt-14" style={{ fontSize: 'var(--pg-step-2)' }}>
          Sesiones de este módulo
        </h2>
        <p className="pg-note mt-3 max-w-2xl">
          Cada sesión se abre completa: explicación, ejemplos, técnicas, prompts copiables,
          ejercicio con entregable, escucha guiada y errores frecuentes.
        </p>

        <div className="mt-6">
          <ModuleLessonList module={module} />
        </div>

        {nextModule && (
          <Link
            href={`/curso/${nextModule.id}`}
            className="pg-card pg-card-hover mt-12 flex items-center gap-4 p-5"
          >
            <span className="pg-mark" aria-hidden="true">
              {String(nextModule.index).padStart(2, '0')}
            </span>
            <span className="min-w-0 flex-1">
              <span className="pg-eyebrow">Siguiente módulo</span>
              <strong className="mt-2 block text-[15px] font-semibold tracking-tight">
                {nextModule.title}
              </strong>
            </span>
            <ChevronRight className="pg-row-arrow" size={18} aria-hidden="true" />
          </Link>
        )}

        <footer className="mt-16">
          <div className="pg-rule" />
          <p className="pg-note mt-6 text-center">
            Play and Go by TAMV ONLINE <span aria-hidden>·</span> Orgullosamente Realmontenses
          </p>
        </footer>
      </div>
    </main>
  )
}
