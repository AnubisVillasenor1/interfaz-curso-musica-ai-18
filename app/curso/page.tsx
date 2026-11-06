import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowLeft, Music2 } from 'lucide-react'

import { CourseModulesIndex } from '@/components/course/module-index'
import { COURSE_MODULES, COURSE_TOTAL_LESSONS, lessonsByModule } from '@/lib/course'

export const metadata: Metadata = {
  title: 'Programa del curso · Play and Go by TAMV ONLINE',
  description: `Índice del curso: ${COURSE_MODULES.length} módulos y ${COURSE_TOTAL_LESSONS} lecciones con prompts, ejercicios, escucha guiada e insignias.`,
}

const totalMinutes = COURSE_MODULES.reduce(
  (sum, module) => sum + lessonsByModule(module.index).reduce((acc, lesson) => acc + lesson.minutes, 0),
  0,
)

/**
 * Índice del programa.
 *
 * La cabecera fija anterior usaba `z-20` / `z-10` sobre un degradado `fixed`
 * sin `pointer-events-none`, así que la capa decorativa se interponía entre el
 * cursor y los enlaces de la barra en algunas alturas de ventana. Aquí la capa
 * está fuera del flujo y no recibe punteros.
 */
export default function CursoPage() {
  return (
    <main
      className="pg-shell relative min-h-screen overflow-x-clip"
      style={{ background: 'var(--pg-bg)' }}
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
        <Link href="/" className="pg-navlink inline-flex items-center gap-2">
          <ArrowLeft size={14} aria-hidden="true" /> Inicio
        </Link>
        <p className="pg-eyebrow hidden sm:inline-flex">Play and Go · TAMV ONLINE</p>
        <Link href="/studio" className="pg-navlink inline-flex items-center gap-2">
          <Music2 size={14} aria-hidden="true" /> Estudio
        </Link>
      </header>

      <div className="pg-container pb-20">
        <section className="pg-section">
          <p className="pg-eyebrow">
            {COURSE_MODULES.length} módulos · {COURSE_TOTAL_LESSONS} lecciones · {totalMinutes} min
          </p>
          <h1 className="pg-title pg-title-display">El programa completo</h1>
          <p className="pg-lede">
            Cada módulo tiene su título, su subtítulo, qué cubre y qué entregas al terminarlo. Abre
            un módulo para ver sus sesiones; cada sesión se lee completa y se marca como avanzada.
          </p>
        </section>

        <div>
          <CourseModulesIndex modules={COURSE_MODULES} />
        </div>

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
