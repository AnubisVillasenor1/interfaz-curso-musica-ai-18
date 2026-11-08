import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

import { AdvancedAudioExam } from '@/components/course/advanced-audio-exam'
import {
  ADVANCED_AUDIO_ASSESSMENT,
  advancedAudioModulePath,
  type AdvancedAudioModule,
} from '@/lib/advanced-audio-curriculum'

/**
 * Marco común de los seis exámenes. La página solo resuelve el módulo y este
 * componente dibuja encabezado, enlace de vuelta y el examen.
 */
export function AdvancedAudioExamPage({ module }: { module: AdvancedAudioModule }) {
  const examNumber = String(module.number).padStart(2, '0')

  return (
    <main className="pg-shell relative min-h-screen overflow-x-clip" style={{ background: 'var(--pg-bg)' }}>
      <div aria-hidden className="pg-glow pointer-events-none" />
      <header className="pg-container flex items-center justify-between gap-4 py-5">
        <Link href="/curso/laboratorio-audio/evaluacion" className="pg-navlink inline-flex items-center gap-2">
          <ArrowLeft size={14} aria-hidden="true" /> Evaluación técnica
        </Link>
        <Link href={advancedAudioModulePath(module)} className="pg-navlink">Contenido del módulo</Link>
      </header>
      <div className="pg-container pb-20">
        <section className="pg-section max-w-4xl">
          <p className="pg-eyebrow">TAMV Online Network · Examen técnico {examNumber}</p>
          <h1 className="pg-title pg-title-display">{module.title}</h1>
          <p className="pg-lede mt-3">Lee cada reactivo, elige una sola opción y envía cuando hayas contestado todas las preguntas. La aprobación teórica es {ADVANCED_AUDIO_ASSESSMENT.passPercent}/100.</p>
        </section>
        <div className="mt-8"><AdvancedAudioExam moduleId={module.id} /></div>
      </div>
    </main>
  )
}
