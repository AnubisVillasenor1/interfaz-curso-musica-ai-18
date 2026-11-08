import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowLeft, ArrowRight, ClipboardCheck, ShieldCheck } from 'lucide-react'
import { AdvancedAudioEvaluator } from '@/components/course/advanced-audio-evaluator'
import { ADVANCED_AUDIO_ASSESSMENT, ADVANCED_AUDIO_BRAND, ADVANCED_AUDIO_CREDENTIAL_NOTE, ADVANCED_AUDIO_MODULES, advancedAudioExamPath } from '@/lib/advanced-audio-curriculum'

export const metadata: Metadata = {
  title: 'Evaluación técnica y tutoría con IA',
  description: 'Seis exámenes técnicos, rúbricas prácticas y revisión provisional de evidencia con IA.',
}

export default function AdvancedAudioEvaluationPage() {
  return (
    <main className="pg-shell relative min-h-screen overflow-x-clip" style={{ background: 'var(--pg-bg)' }}>
      <div aria-hidden className="pg-glow pointer-events-none" />
      <header className="pg-container flex items-center justify-between gap-4 py-5">
        <Link href="/curso/laboratorio-audio" className="pg-navlink inline-flex items-center gap-2"><ArrowLeft size={14} aria-hidden="true" /> Laboratorio</Link>
        <p className="pg-eyebrow hidden sm:block">{ADVANCED_AUDIO_BRAND}</p>
        <Link href="/curso" className="pg-navlink">Programa</Link>
      </header>
      <div className="pg-container pb-20">
        <section className="pg-section max-w-4xl">
          <p className="pg-eyebrow">Evaluación formativa · un examen de 20 preguntas por módulo</p>
          <h1 className="pg-title pg-title-display">Examen, rúbrica y revisión de evidencia</h1>
          <p className="pg-lede mt-4">La evaluación teórica y la práctica tienen funciones distintas. El examen mide comprensión conceptual; la rúbrica examina código, resultados, escucha, toma de decisiones y trazabilidad.</p>
          <p className="pg-note mt-4">Aprobación teórica: {ADVANCED_AUDIO_ASSESSMENT.passPercent}/100 · Dominio teórico sólido: {ADVANCED_AUDIO_ASSESSMENT.masteryPercent}/100 · Tiempo estimado: {ADVANCED_AUDIO_ASSESSMENT.estimateMinutes} minutos por examen.</p>
        </section>

        <section className="mt-10 grid gap-4 md:grid-cols-2">
          {ADVANCED_AUDIO_MODULES.map((module) => (
            <article key={module.id} className="pg-card p-5">
              <p className="pg-eyebrow">Examen técnico {String(module.number).padStart(2, '0')}</p>
              <h2 className="pg-block-title mt-2">{module.title}</h2>
              <p className="pg-prose mt-3">{module.subtitle}. {module.lessons.length} lecciones y {ADVANCED_AUDIO_ASSESSMENT.questionCount} preguntas.</p>
              <Link href={advancedAudioExamPath(module)} className="pg-btn pg-btn-primary mt-5">Presentar examen <ArrowRight size={15} aria-hidden="true" /></Link>
            </article>
          ))}
        </section>

        <section className="mt-12">
          <div className="flex items-center gap-3"><ClipboardCheck size={19} aria-hidden="true" /><h2 className="pg-section-title">Revisión asistida por IA</h2></div>
          <p className="pg-note mt-2 max-w-3xl">Se evalúa únicamente el resumen textual que aportes. La IA no escucha el audio ni ejecuta los scripts, por lo que no puede certificar resultados sin evidencia independiente.</p>
          <div className="mt-5"><AdvancedAudioEvaluator /></div>
        </section>

        <section className="pg-inset mt-12 p-5">
          <div className="flex items-start gap-3"><ShieldCheck size={19} className="mt-0.5 shrink-0" aria-hidden="true" /><div><h2 className="pg-item-title">Límites del dictamen</h2><p className="pg-prose mt-2">{ADVANCED_AUDIO_ASSESSMENT.policy}</p><p className="pg-note mt-2">{ADVANCED_AUDIO_CREDENTIAL_NOTE}</p></div></div>
        </section>
      </div>
    </main>
  )
}
