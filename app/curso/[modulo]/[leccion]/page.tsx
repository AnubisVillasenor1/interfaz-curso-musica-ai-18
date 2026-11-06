import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'

import { LessonView, type LessonNavItem } from '@/components/course/lesson-view'
import { COURSE_LESSONS, COURSE_MODULES, lessonById, type CourseModule } from '@/lib/course'
import { cn } from '@/lib/utils'

type Props = { params: Promise<{ modulo: string; leccion: string }> }

/**
 * La lección se renderiza en cada request: el progreso es por usuario y se lee
 * con `GET /api/progress`, así que no conviene dejar en cache una marca de
 * «completada» ajena. El contenido, en cambio, sigue saliendo de
 * `COURSE_LESSONS` en memoria, sin fetch.
 */
export const dynamic = 'force-dynamic'

function findModule(value: string): CourseModule | undefined {
  const key = value.trim().toLowerCase()
  return COURSE_MODULES.find((module) => module.id === key || String(module.index) === key)
}

function moduleOf(lessonModuleIndex: number) {
  return COURSE_MODULES.find((module) => module.index === lessonModuleIndex)
}

function toNavItem(id: string): LessonNavItem | undefined {
  const lesson = COURSE_LESSONS.find((item) => item.id === id)
  const module = lesson && moduleOf(lesson.moduleIndex)
  if (!lesson || !module) return undefined
  return { id: lesson.id, title: lesson.title, kicker: lesson.kicker, moduleId: module.id }
}

async function resolve({ modulo, leccion }: { modulo: string; leccion: string }) {
  const module = findModule(modulo)
  const lesson = lessonById(leccion.trim().toLowerCase())
  // Una lección solo vive bajo su módulo: `/curso/m03/m01-l01` no existe.
  if (!module || !lesson || lesson.moduleIndex !== module.index) return null
  return { module, lesson }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { modulo, leccion } = await params
  const found = await resolve({ modulo, leccion })
  if (!found) return { title: 'Lección no disponible · Play and Go by TAMV ONLINE' }

  return {
    title: `${found.lesson.title} · ${found.module.title}`,
    description: found.lesson.objective,
  }
}

export default async function CursoLeccionPage({ params }: Props) {
  const { modulo, leccion } = await params
  const found = await resolve({ modulo, leccion })
  if (!found) return notFound()

  const { module, lesson } = found
  const ordered = [...COURSE_LESSONS].sort((a, b) => a.lessonNumber - b.lessonNumber)
  const position = ordered.findIndex((item) => item.id === lesson.id)

  return (
    <main className="min-h-screen bg-[#07121f] text-[#edfaff] selection:bg-[#75e9f2]/30">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_75%_5%,rgba(88,213,230,.14),transparent_30%),radial-gradient(circle_at_15%_80%,rgba(155,92,226,.12),transparent_32%)]" />

      <header className="relative z-20 mx-auto flex max-w-4xl items-center justify-between gap-4 px-5 py-5 lg:px-8">
        <Link
          href={`/curso/${module.id}`}
          className={cn(
            'flex items-center gap-2 text-xs text-[#a9c0ca] hover:text-[#edfaff]',
            'outline-none focus-visible:ring-2 focus-visible:ring-[#75e9f2] focus-visible:ring-offset-2 focus-visible:ring-offset-[#07121f]',
          )}
        >
          <ArrowLeft size={15} aria-hidden="true" /> {module.title}
        </Link>
        <Link
          href="/curso"
          className={cn(
            'text-[10px] uppercase tracking-[.24em] text-[#9fb8c7] hover:text-[#edfaff]',
            'outline-none focus-visible:ring-2 focus-visible:ring-[#75e9f2] focus-visible:ring-offset-2 focus-visible:ring-offset-[#07121f]',
          )}
        >
          Programa
        </Link>
      </header>

      <div className="relative z-10 mx-auto max-w-4xl px-5 pb-20 pt-4 lg:px-8">
        <LessonView
          lesson={lesson}
          courseModule={module}
          previous={position > 0 ? toNavItem(ordered[position - 1].id) : undefined}
          next={position >= 0 && position < ordered.length - 1 ? toNavItem(ordered[position + 1].id) : undefined}
        />
      </div>

      <footer className="relative z-10 border-t border-white/10 px-5 py-8 text-center text-xs text-[#78919d]">
        Play and Go by TAMV ONLINE <span className="mx-2 text-[#75e9f2]">•</span> Orgullosamente Realmontenses
      </footer>
    </main>
  )
}
