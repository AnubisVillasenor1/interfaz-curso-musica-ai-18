import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowRight, Headphones, Layers3, WandSparkles } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Información · Play and Go',
  description: 'Conoce la propuesta de Play and Go: academia y estudio creativo de música con IA de TAMV ONLINE.',
}

const pillars = [
  ['Dirección humana', 'La IA acelera el boceto, pero la intención, el criterio y la firma siguen siendo tuyos.', Headphones],
  ['Flujo profesional', 'De la idea al release: prompt, estructura, interpretación, revisión y biblioteca en una sola ruta.', Layers3],
  ['Aprendizaje accionable', 'Cada módulo termina en una pieza, una decisión de producción o un activo reutilizable.', WandSparkles],
]

export default function InformacionPage() {
  return <main className="pg-shell relative min-h-screen overflow-x-clip" style={{ background: 'var(--pg-bg)' }}>
    <div aria-hidden className="pg-glow" />
    <div className="pg-container relative z-10 py-8 lg:py-12">
      <header className="flex items-center justify-between"><Link href="/" className="pg-navlink">← Volver al inicio</Link><Link href="/precios" className="pg-btn pg-btn-primary pg-btn-sm">Ver membresías</Link></header>
      <section className="pt-20 lg:pt-28"><p className="pg-eyebrow">TAMV ONLINE · visión</p><h1 className="pg-title pg-title-display mt-5 max-w-4xl">La música del futuro necesita <span className="pg-accent-cyan">mejores decisiones.</span></h1><p className="pg-lede mt-8 max-w-2xl">Play and Go une una academia de criterio musical con un estudio de creación asistida. No es un generador aislado: es un sistema para imaginar, dirigir, iterar y publicar.</p><div className="pg-rule mt-12" /></section>
      <section className="grid gap-4 py-16 md:grid-cols-3">{pillars.map(([title, copy, Icon]) => <article key={title as string} className="pg-card p-6"><Icon className="pg-accent-cyan" size={26} /><h2 className="pg-block-title mt-8">{title as string}</h2><p className="pg-lede">{copy as string}</p></article>)}</section>
      <section className="pg-card p-7 sm:p-10"><p className="pg-eyebrow" data-tone="amber">Diferencial Play and Go</p><div className="mt-4 grid gap-8 lg:grid-cols-[1.1fr_.9fr] lg:items-end"><h2 className="pg-title mt-0">Un laboratorio con lenguaje visual de instrumento, no de formulario.</h2><div><p className="pg-prose">Tomamos referencias de los mejores patrones de Suno, Udio, AIVA, Soundraw, Stable Audio y Mubert: exploración rápida, control por capas, historial, exportación y descubrimiento. Los convertimos en una experiencia guiada por aprendizaje, identidad y comunidad.</p><Link href="/studio" className="pg-btn pg-btn-primary mt-6">Entrar al estudio <ArrowRight size={16} /></Link></div></div></section>
      <footer className="pg-note py-12">Play and Go by TAMV ONLINE · Tecnología, música y futuro.</footer>
    </div>
  </main>
}
