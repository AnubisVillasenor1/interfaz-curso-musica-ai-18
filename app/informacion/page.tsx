import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowRight, Headphones, Layers3, Sparkles, WandSparkles } from 'lucide-react'

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
  return <main className="min-h-screen overflow-hidden bg-[#07121f] text-[#edfaff]">
    <div className="pointer-events-none fixed inset-0 -z-0 overflow-hidden bg-[#07121f]"><div className="aurora-blob left-[8%] top-[12%] size-72 bg-cyan-400/15" /><div className="aurora-blob right-[4%] top-[42%] size-96 bg-violet-500/15" /></div>
    <div className="relative z-10 mx-auto max-w-6xl px-5 py-8 sm:px-8 lg:py-12">
      <header className="flex items-center justify-between"><Link href="/" className="nav-link text-sm text-cyan-200">← Volver al inicio</Link><Link href="/precios" className="crystal-button rounded-full px-4 py-2 text-xs font-semibold text-[#06131e]">Ver membresías</Link></header>
      <section className="pt-20 lg:pt-28"><p className="eyebrow text-cyan-200">TAMV ONLINE · visión</p><h1 className="display-hero mt-5 max-w-4xl">La música del futuro necesita <span className="aurora-text">mejores decisiones.</span></h1><p className="mt-8 max-w-2xl text-lg leading-8 text-[#aac3ce]">Play and Go une una academia de criterio musical con un estudio de creación asistida. No es un generador aislado: es un sistema para imaginar, dirigir, iterar y publicar.</p><div className="crystal-divider mt-12" /></section>
      <section className="grid gap-4 py-16 md:grid-cols-3">{pillars.map(([title, copy, Icon]) => <article key={title as string} className="crystal-panel rounded-3xl p-6"><Icon className="text-cyan-200" size={26} /><h2 className="mt-8 text-xl font-semibold">{title as string}</h2><p className="mt-3 text-sm leading-6 text-[#9fb8c7]">{copy as string}</p></article>)}</section>
      <section className="crystal-panel rounded-[2rem] p-7 sm:p-10"><p className="eyebrow text-amber-200">Diferencial Play and Go</p><div className="mt-4 grid gap-8 lg:grid-cols-[1.1fr_.9fr] lg:items-end"><h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">Un laboratorio con lenguaje visual de instrumento, no de formulario.</h2><div><p className="text-sm leading-6 text-[#a9c0ca]">Tomamos referencias de los mejores patrones de Suno, Udio, AIVA, Soundraw, Stable Audio y Mubert: exploración rápida, control por capas, historial, exportación y descubrimiento. Los convertimos en una experiencia guiada por aprendizaje, identidad y comunidad.</p><Link href="/studio" className="crystal-button mt-6 inline-flex rounded-full px-5 py-3 text-sm font-semibold text-[#06131e]">Entrar al estudio <ArrowRight size={16} /></Link></div></div></section>
      <footer className="py-12 text-xs text-[#78919d]">Play and Go by TAMV ONLINE · Tecnología, música y futuro.</footer>
    </div>
  </main>
}
