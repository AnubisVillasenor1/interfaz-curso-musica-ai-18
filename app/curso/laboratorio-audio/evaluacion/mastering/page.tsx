import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { AdvancedAudioExam } from '@/components/course/advanced-audio-exam'

export const metadata: Metadata = {
  title: 'Examen de mezcla y masterización',
  description: 'Examen teórico de 20 preguntas sobre loudness, pico, EQ, compresión y entrega.',
}

export default function MasteringExamPage() {
  return (
    <main className="pg-shell relative min-h-screen overflow-x-clip" style={{ background: 'var(--pg-bg)' }}>
      <div aria-hidden className="pg-glow pointer-events-none" />
      <header className="pg-container flex items-center justify-between gap-4 py-5">
        <Link href="/curso/laboratorio-audio/evaluacion" className="pg-navlink inline-flex items-center gap-2"><ArrowLeft size={14} aria-hidden="true" /> Evaluación técnica</Link>
        <Link href="/curso/laboratorio-audio/modulo-2" className="pg-navlink">Contenido del módulo</Link>
      </header>
      <div className="pg-container pb-20">
        <section className="pg-section max-w-4xl">
          <p className="pg-eyebrow">TAMV Online Network · Examen técnico 02</p>
          <h1 className="pg-title pg-title-display">Mezcla y masterización</h1>
          <p className="pg-lede mt-3">Lee cada reactivo, elige una sola opción y envía cuando hayas contestado todas las preguntas.</p>
        </section>
        <div className="mt-8"><AdvancedAudioExam moduleId="mastering" /></div>
      </div>
    </main>
  )
}
