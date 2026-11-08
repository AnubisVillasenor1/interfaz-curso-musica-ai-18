import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowLeft, ArrowRight, AudioLines, BookOpen, Boxes, ClipboardCheck, Cpu, FileAudio, ShieldCheck, Sparkles } from 'lucide-react'

import { ADVANCED_AUDIO_AI_NOTE, ADVANCED_AUDIO_AUTHOR, ADVANCED_AUDIO_BRAND, ADVANCED_AUDIO_CREDENTIAL_NOTE, ADVANCED_AUDIO_MODULES, ADVANCED_AUDIO_PROGRAM, advancedAudioModulePath, type AdvancedAudioModuleId } from '@/lib/advanced-audio-curriculum'

const MODULE_ICONS: Record<AdvancedAudioModuleId, typeof AudioLines> = {
  dsp: AudioLines,
  mastering: FileAudio,
  generative: Sparkles,
  plugins: Cpu,
  governance: ShieldCheck,
  capstone: Boxes,
}

export const metadata: Metadata = {
  title: 'Laboratorio técnico de audio e IA musical',
  description: 'Trayecto complementario de seis módulos: DSP, mezcla y masterización, IA generativa, plugins, gobernanza y sistema integrador, con código reproducible y evaluación basada en evidencia.',
}

export default function AdvancedAudioLabIndexPage() {
  return (
    <main className="pg-shell relative min-h-screen overflow-x-clip" style={{ background: 'var(--pg-bg)' }}>
      <div aria-hidden className="pg-glow pointer-events-none" />
      <header className="pg-container flex items-center justify-between gap-4 py-5">
        <Link href="/curso" className="pg-navlink inline-flex items-center gap-2"><ArrowLeft size={14} aria-hidden="true" /> Programa principal</Link>
        <p className="pg-eyebrow hidden sm:block">{ADVANCED_AUDIO_BRAND}</p>
        <Link href="/curso/laboratorio-audio/evaluacion" className="pg-navlink">Evaluación</Link>
      </header>

      <div className="pg-container pb-20">
        <section className="pg-section max-w-4xl">
          <p className="pg-eyebrow">Trayecto técnico complementario · Python + DSP + escucha crítica</p>
          <h1 className="pg-title pg-title-display">{ADVANCED_AUDIO_PROGRAM}</h1>
          <p className="pg-lede mt-4">Del análisis reproducible de una señal al sistema de producción desplegado. Seis módulos conectan DSP, mezcla y masterización, generación controlada, plugins y agentes, gobernanza y un proyecto integrador para que cada decisión técnica pueda explicarse y volver a ejecutarse.</p>
          <p className="pg-prose mt-4">{ADVANCED_AUDIO_AI_NOTE}</p>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <div className="pg-card p-4"><p className="pg-label">Autor del curso</p><p className="pg-item-title mt-2">{ADVANCED_AUDIO_AUTHOR}</p><p className="pg-note mt-2">{ADVANCED_AUDIO_BRAND}</p></div>
            <div className="pg-card p-4"><p className="pg-label">Método formativo</p><p className="pg-item-title mt-2">Concepto → código → escucha → evidencia</p><p className="pg-note mt-2">La métrica informa el criterio; no lo reemplaza.</p></div>
          </div>
          <p className="pg-note mt-5">{ADVANCED_AUDIO_CREDENTIAL_NOTE}</p>
        </section>

        <section className="mt-12">
          <h2 className="pg-section-title">Mapa del trayecto</h2>
          <p className="pg-note mt-2 max-w-3xl">Este recorrido técnico se integra de forma aditiva con el curso original de 16 lecciones y 5 módulos. Conserva los identificadores de progreso, las insignias y el proyecto final “Mi Nodo Cero”; no sustituye ese contenido ni duplica sus contadores.</p>
          <div className="mt-6 grid gap-4 lg:grid-cols-2">
            {ADVANCED_AUDIO_MODULES.map((module) => (
              <article key={module.id} className="pg-card p-5 sm:p-7">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="pg-eyebrow">Módulo técnico {String(module.number).padStart(2, '0')}</p>
                    <h3 className="pg-block-title mt-2">{module.title}</h3>
                  </div>
                  {(() => {
                    const Icon = MODULE_ICONS[module.id]
                    return <Icon size={22} aria-hidden="true" />
                  })()}
                </div>
                <p className="pg-note mt-3">{module.subtitle}</p>
                <p className="pg-prose mt-4">{module.objective}</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <span className="pg-chip">{module.lessons.length} lecciones</span>
                  <span className="pg-chip">{module.estimatedHours}</span>
                  <span className="pg-chip">{module.level}</span>
                </div>
                <ul className="pg-list mt-5">
                  {module.outcomes.slice(0, 3).map((outcome) => <li key={outcome}>{outcome}</li>)}
                </ul>
                <Link href={advancedAudioModulePath(module)} className="pg-btn pg-btn-primary mt-6">
                  Abrir módulo <ArrowRight size={16} aria-hidden="true" />
                </Link>
              </article>
            ))}
          </div>
        </section>

        <section className="mt-14 grid gap-4 md:grid-cols-2">
          <article className="pg-card p-5">
            <div className="flex items-center gap-3"><BookOpen size={18} aria-hidden="true" /><h2 className="pg-item-title">Código y entregables reproducibles</h2></div>
            <p className="pg-prose mt-3">El repositorio incluye scripts Python, dependencias, reportes CSV/JSON, gráficos y pruebas con señales sintéticas. Demucs es opcional, puede requerir descargar pesos y no concede derechos comerciales sobre el audio procesado.</p>
            <a href="https://github.com/AnubisVillasenor1/interfaz-curso-musica-ai-18/tree/main/laboratorio-audio-ia" target="_blank" rel="noreferrer" className="pg-minilink mt-4 inline-flex items-center gap-2">Ver laboratorio en GitHub <ArrowRight size={14} aria-hidden="true" /></a>
          </article>
          <article className="pg-card p-5">
            <div className="flex items-center gap-3"><ClipboardCheck size={18} aria-hidden="true" /><h2 className="pg-item-title">Evaluación y retroalimentación</h2></div>
            <p className="pg-prose mt-3">Cada uno de los seis módulos tiene un examen de 20 preguntas y una rúbrica práctica de 100 puntos. La revisión asistida por IA produce retroalimentación provisional sobre el resumen textual que aportes; la práctica y el proyecto integrador requieren verificación humana.</p>
            <Link href="/curso/laboratorio-audio/evaluacion" className="pg-btn pg-btn-ghost mt-4">Abrir evaluación <ArrowRight size={15} aria-hidden="true" /></Link>
          </article>
        </section>

        <section className="pg-inset mt-10 p-5">
          <div className="flex items-start gap-3"><ShieldCheck className="mt-0.5 shrink-0" size={19} aria-hidden="true" /><div><h2 className="pg-item-title">Integridad académica</h2><p className="pg-prose mt-2">Las gráficas y las métricas no bastan como prueba de criterio: se exige un informe con fuente/licencia, método, marcas de tiempo, resultados y límites. No se promete grado académico oficial, certificación externa ni exactitud automática de los modelos.</p></div></div>
        </section>
      </div>
    </main>
  )
}
