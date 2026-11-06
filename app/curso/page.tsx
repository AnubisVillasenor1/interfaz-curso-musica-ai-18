import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowLeft, BookOpen, Music2 } from 'lucide-react'

import { CourseModulesIndex } from '@/components/course/module-index'
import { COURSE_MODULES, COURSE_TOTAL_LESSONS, lessonsByModule } from '@/lib/course'
import { cn } from '@/lib/utils'

export const metadata: Metadata = {
  title: 'Programa del curso · Play and Go by TAMV ONLINE',
  description: `Índice del curso: ${COURSE_MODULES.length} módulos y ${COURSE_TOTAL_LESSONS} lecciones con prompts, ejercicios, escucha guiada e insignias.`,
}

/**
 * Foco visible sobre el fondo oscuro del shell. Se duplica aquí a propósito:
 * `components/course/progress-bar.tsx` es `'use client'` y desde un Server
 * Component solo se pueden usar sus componentes como JSX, no sus constantes.
 */
const focusRing = 'outline-none focus-visible:ring-2 focus-visible:ring-[#75e9f2] focus-visible:ring-offset-2 focus-visible:ring-offset-[#07121f]'

const totalMinutes = COURSE_MODULES.reduce(
  (sum, module) => sum + lessonsByModule(module.index).reduce((acc, lesson) => acc + lesson.minutes, 0),
  0,
)

export default function CursoPage() {
  return (
    <main className="min-h-screen bg-[#07121f] text-[#edfaff] selection:bg-[#75e9f2]/30">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_75%_5%,rgba(88,213,230,.16),transparent_30%),radial-gradient(circle_at_15%_80%,rgba(155,92,226,.14),transparent_32%)]" />

      <header className="relative z-20 mx-auto flex max-w-5xl items-center justify-between gap-4 px-5 py-5 lg:px-8">
        <Link href="/" className={cn('flex items-center gap-2 text-xs text-[#a9c0ca] hover:text-[#edfaff]', focusRing)}>
          <ArrowLeft size={15} aria-hidden="true" /> Inicio
        </Link>
        <p className="text-[10px] uppercase tracking-[.24em] text-[#9fb8c7]">
          Play <span className="text-[#75e9f2]">and Go</span> · TAMV ONLINE
        </p>
        <Link href="/studio" className={cn('flex items-center gap-2 text-xs text-[#a9c0ca] hover:text-[#edfaff]', focusRing)}>
          <Music2 size={15} aria-hidden="true" /> Estudio
        </Link>
      </header>

      <div className="relative z-10 mx-auto max-w-5xl px-5 pb-20 pt-6 lg:px-8">
        <section className="border-b border-white/10 pb-8">
          <p className="inline-flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[.24em] text-[#75e9f2]">
            <BookOpen size={13} aria-hidden="true" /> {COURSE_MODULES.length} módulos · {COURSE_TOTAL_LESSONS} lecciones ·{' '}
            {totalMinutes} min
          </p>
          <h1 className="mt-4 max-w-3xl text-4xl font-semibold leading-[1.05] tracking-[-.05em] sm:text-5xl">
            El programa completo
          </h1>
          <p className="mt-5 max-w-3xl text-base leading-8 text-[#a9c0ca]">
            Cada módulo tiene su título, su subtítulo, qué cubre y qué entregas al terminarlo. Abre un módulo para ver sus
            sesiones; cada sesión se lee completa y se marca como avanzada.
          </p>
        </section>

        <div className="mt-10">
          <CourseModulesIndex modules={COURSE_MODULES} />
        </div>
      </div>

      <footer className="relative z-10 border-t border-white/10 px-5 py-8 text-center text-xs text-[#78919d]">
        Play and Go by TAMV ONLINE <span className="mx-2 text-[#75e9f2]">•</span> Orgullosamente Realmontenses
      </footer>
    </main>
  )
}
