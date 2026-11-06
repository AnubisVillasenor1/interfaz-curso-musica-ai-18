import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowLeft, Music2, ArrowRight } from 'lucide-react'

import { CourseModulesIndex } from '@/components/course/module-index'
import { TamvQuote } from '@/components/tamv-quote'
import { COURSE_FRAMEWORK, COURSE_MODULES, COURSE_TOTAL_LESSONS, COURSE_UNITS, FINAL_PROJECT, lessonsByModule } from '@/lib/course'

export const metadata: Metadata = {
  title: 'Programa del curso',
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
      <div aria-hidden className="pg-glow" />

      <header className="pg-container flex items-center justify-between gap-4 py-5">
        <Link href="/" className="pg-navlink inline-flex items-center gap-2">
          <ArrowLeft size={14} aria-hidden="true" /> Inicio
        </Link>
        <p className="pg-eyebrow hidden sm:inline-flex">por TAMV Online Network</p>
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
            <strong>{COURSE_FRAMEWORK.title}:</strong> {COURSE_FRAMEWORK.subtitle.toLowerCase()}. {COURSE_FRAMEWORK.philosophy}
          </p>
          <p className="pg-note mt-4">{COURSE_FRAMEWORK.hybridNote}</p>
          <p className="pg-note mt-3">
            {COURSE_FRAMEWORK.manifesto.map((line) => <span key={line} className="block">{line}</span>)}
          </p>
        </section>

        <div className="mt-12">
          <TamvQuote variant="hero" />
        </div>

        <section className="mt-16">
          <p className="pg-eyebrow">Las 14 unidades</p>
          <h2 className="pg-section-title">El camino completo (≈14 h)</h2>
          <ol className="mt-6 space-y-0">
            {COURSE_UNITS.map((unit) => (
              <li key={unit.unit} className="pg-rule flex flex-wrap items-baseline gap-x-4 gap-y-1 py-3">
                <span className="pg-chip" data-tone={unit.unit === 14 ? 'amber' : 'ghost'}>Unidad {String(unit.unit).padStart(2, '0')}</span>
                <span className="min-w-0 flex-1 text-sm font-medium">{unit.title}</span>
                <span className="pg-note">
                  {unit.lessonIds.map((id) => {
                    const moduleId = `m${String(COURSE_MODULES.find((m) => m.lessonIds.includes(id))?.index ?? 1).padStart(2, '0')}`
                    return (
                      <Link key={id} href={`/curso/${moduleId}/${id}`} className="pg-minilink">
                        {id}
                      </Link>
                    )
                  })}
                </span>
              </li>
            ))}
          </ol>
          <p className="pg-note mt-4">
            Metodología: {COURSE_FRAMEWORK.methodology.map((m) => m.step).join(' → ')}. Cada unidad termina en práctica con entregable; la 14ª es el proyecto final.
          </p>
        </section>

        <section className="pg-callout mt-12 p-6">
          <p className="pg-eyebrow">Proyecto final</p>
          <h2 className="pg-section-title mt-2">“{FINAL_PROJECT.title}”</h2>
          <p className="pg-lede mt-3">{FINAL_PROJECT.description}</p>
          <Link href="/curso/proyecto-final" className="pg-btn pg-btn-primary mt-5">
            Ver requisitos y entregables <ArrowRight size={16} aria-hidden="true" />
          </Link>
        </section>

        <div className="mt-16">
          <p className="pg-eyebrow">Detalle por módulos</p>
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
