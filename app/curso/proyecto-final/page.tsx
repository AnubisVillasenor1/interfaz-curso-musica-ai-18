import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

import { COURSE_FRAMEWORK, FINAL_PROJECT } from '@/lib/course'
import { TamvQuote } from '@/components/tamv-quote'

export const metadata: Metadata = {
  title: 'Proyecto final «Mi Nodo Cero»',
  description: `Proyecto final del curso ${COURSE_FRAMEWORK.title}: ${FINAL_PROJECT.description}`,
}

export default function ProyectoFinalPage() {
  return (
    <main className="pg-shell relative min-h-screen overflow-x-clip" style={{ background: 'var(--pg-bg)' }}>
      <div aria-hidden className="pg-glow" />
      <header className="pg-container flex items-center justify-between gap-4 py-5">
        <Link href="/curso" className="pg-navlink inline-flex items-center gap-2">
          <ArrowLeft size={14} aria-hidden="true" /> Programa
        </Link>
        <p className="pg-eyebrow hidden sm:inline-flex">por TAMV Online Network</p>
        <Link href="/studio" className="pg-navlink">Estudio</Link>
      </header>

      <div className="pg-container pb-20">
        <section className="pg-section max-w-3xl">
          <p className="pg-eyebrow">{COURSE_FRAMEWORK.brand}</p>
          <h1 className="pg-title pg-title-display">“{FINAL_PROJECT.title}”</h1>
          <p className="pg-lede">{FINAL_PROJECT.description}</p>
          <p className="pg-note mt-4">{COURSE_FRAMEWORK.philosophy}</p>
        </section>

        <div className="mt-12">
          <TamvQuote variant="hero" />
        </div>

        <section className="mt-14 grid gap-8 md:grid-cols-2">
          <div>
            <h2 className="pg-section-title">Requisitos mínimos</h2>
            <ul className="pg-list mt-4">
              {FINAL_PROJECT.requirements.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
          <div>
            <h2 className="pg-section-title">Entrega</h2>
            <pre className="pg-inset mt-4 overflow-x-auto p-4 text-xs">
              {`/proyecto-final\n${FINAL_PROJECT.deliverables.map((d) => `├── ${d}`).join('\n')}`}
            </pre>
          </div>
        </section>

        <section className="mt-14">
          <h2 className="pg-section-title">Evaluación y constancia</h2>
          <p className="pg-lede mt-3">
            La evaluación del curso es tu proyecto final y tus entregas por lección (progreso e insignias).
            Al completarlo recibes constancia por participación emitida por TAMV Online Network con código verificable.
            El examen automático de {COURSE_FRAMEWORK.exam.questions} preguntas en {COURSE_FRAMEWORK.exam.minutes} minutos está en desarrollo: no se promete equivalencia con un título oficial ni idiomas aún no disponibles.
          </p>
        </section>

        <section className="mt-14">
          <h2 className="pg-section-title">Recursos incluidos</h2>
          <ul className="pg-list mt-4 md:columns-2">
            {COURSE_FRAMEWORK.resources.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>

        <section className="mt-14">
          <h2 className="pg-section-title">Metodología</h2>
          <ol className="mt-4 space-y-3">
            {COURSE_FRAMEWORK.methodology.map((m, i) => (
              <li key={m.step} className="pg-inset p-4">
                <strong>{i + 1}. {m.step}</strong>
                <span className="block text-sm opacity-80">{m.description}</span>
              </li>
            ))}
          </ol>
        </section>

        <p className="pg-note mt-14 text-center">
          {COURSE_FRAMEWORK.manifesto.map((line) => <span key={line} className="block">{line}</span>)}
        </p>
      </div>
    </main>
  )
}
