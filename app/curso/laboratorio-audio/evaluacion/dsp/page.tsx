import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { AdvancedAudioExam } from '@/components/course/advanced-audio-exam'

export const metadata: Metadata = {
  title: 'Examen DSP y extracción espectral',
  description: 'Examen teórico de 20 preguntas sobre muestreo, STFT, características y trazabilidad.',
}

export default function DspExamPage() {
  return (
    <main className="pg-shell relative min-h-screen overflow-x-clip" style={{ background: 'var(--pg-bg)' }}>
      <div aria-hidden className="pg-glow pointer-events-none" />
      <header className="pg-container flex items-center justify-between gap-4 py-5">
        <Link href="/curso/laboratorio-audio/evaluacion" className="pg-navlink inline-flex items-center gap-2"><ArrowLeft size={14} aria-hidden="true" /> Evaluación técnica</Link>
        <Link href="/curso/laboratorio-audio/modulo-1" className="pg-navlink">Contenido del módulo</Link>
      </header>
      <div className="pg-container pb-20">
        <section className="pg-section max-w-4xl">
          <p className="pg-eyebrow">TAMV Online Network · Examen técnico 01</p>
          <h1 className="pg-title pg-title-display">DSP y extracción espectral</h1>
          <p className="pg-lede mt-3">Lee cada reactivo, elige una sola opción y envía cuando hayas contestado todas las preguntas.</p>
        </section>
        <div className="mt-8"><AdvancedAudioExam moduleId="dsp" /></div>
      </div>
    </main>
  )
}
