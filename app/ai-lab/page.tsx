import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowRight, BookOpen, AudioLines, ShieldCheck, Sparkles } from 'lucide-react'

export const metadata: Metadata = {
  title: 'AI Lab',
  description: 'Explora la IA musical de Play & Go con control creativo, análisis técnico y límites transparentes.',
}

const capabilities = [
  { icon: Sparkles, title: 'Asistencia creativa', body: 'Convierte una idea inicial en decisiones musicales más concretas: estilo, emoción, instrumentación y estructura.' },
  { icon: AudioLines, title: 'Análisis de audio', body: 'Consulta la arquitectura y los contratos técnicos de AudioCore. La disponibilidad de cada métrica depende del servicio y del formato de entrada.' },
  { icon: BookOpen, title: 'Aprendizaje guiado', body: 'Relaciona las decisiones de producción con fundamentos de audio, DSP y práctica musical.' },
]

export default function AiLabPage() {
  return (
    <main className="pg-shell min-h-screen overflow-x-clip" style={{ background: 'var(--pg-bg)' }}>
      <div aria-hidden className="pg-glow" />
      <div className="pg-container relative z-10 py-10 sm:py-16">
        <Link href="/" className="pg-navlink">← Volver a Play &amp; Go</Link>
        <section className="max-w-4xl py-16 sm:py-24">
          <p className="pg-eyebrow">AI Lab · IA que explica, no que reemplaza</p>
          <h1 className="pg-title mt-4">Experimenta con IA musical. Conserva el criterio creativo.</h1>
          <p className="pg-lede mt-5">Play &amp; Go reúne herramientas de creación, formación y análisis. Cada función debe distinguir entre una capacidad disponible, una demostración y una integración pendiente; esta página no presenta agentes experimentales como si fueran un sistema autónomo ya desplegado.</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/studio" className="pg-btn pg-btn-primary">Abrir Studio <ArrowRight size={15} aria-hidden /></Link>
            <Link href="/academy" className="pg-btn pg-btn-ghost">Explorar Academy <ArrowRight size={15} aria-hidden /></Link>
          </div>
        </section>
        <section className="grid gap-4 md:grid-cols-3" aria-label="Áreas de AI Lab">
          {capabilities.map(({ icon: Icon, title, body }) => (
            <article key={title} className="pg-card p-6">
              <Icon size={22} className="pg-accent-cyan" aria-hidden />
              <h2 className="pg-block-title mt-5">{title}</h2>
              <p className="pg-note mt-3">{body}</p>
            </article>
          ))}
        </section>
        <section className="pg-card mt-6 flex items-start gap-3 p-5">
          <ShieldCheck size={20} className="pg-accent-mint mt-0.5 shrink-0" aria-hidden />
          <div><h2 className="font-semibold text-white">Transparencia de capacidades</h2><p className="pg-note mt-2">Los resultados deben mostrar su origen y método. La generación remota depende de la disponibilidad del worker y de su configuración; el análisis avanzado depende de los servicios activos. No se prometen derechos comerciales ni calidad de publicación sin verificar licencias y resultados.</p></div>
        </section>
      </div>
    </main>
  )
}
