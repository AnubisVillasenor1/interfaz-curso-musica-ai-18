import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowLeft, Cpu, Gauge, Layers3, LockKeyhole, Radio, ShieldCheck } from 'lucide-react'
import { AUDIOCORE_CONTRACTS, AUDIOCORE_IDENTITY, AUDIOCORE_LAYERS, AUDIOCORE_STATUS } from '@/lib/tamv-audiocore'
import { TAMV_BRAND, TAMV_LEGAL_OWNER, TAMV_LEGAL_NOTICE } from '@/lib/tamv-identity'

export const metadata: Metadata = {
  title: 'Arquitectura TAMV-AudioCore',
  description: 'Contrato técnico propietario de TAMV-AudioCore / LibGenAudio para creación y análisis musical con IA.',
}

const icons = [Layers3, Radio, Cpu, Gauge, ShieldCheck]

export default function ArquitecturaPage() {
  return (
    <main className="pg-shell min-h-screen overflow-x-clip" style={{ background: 'var(--pg-bg)' }}>
      <div aria-hidden className="pg-glow" />
      <div className="pg-container relative z-10 py-8 lg:py-12">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <Link href="/" className="pg-navlink inline-flex items-center gap-2"><ArrowLeft size={15} /> Volver al inicio</Link>
          <span className="pg-eyebrow">{TAMV_BRAND} · propiedad técnica</span>
        </header>

        <section className="pt-20 lg:pt-28">
          <p className="pg-eyebrow" data-tone="amber">{AUDIOCORE_IDENTITY.alias} · contrato {AUDIOCORE_IDENTITY.version}</p>
          <h1 className="pg-title pg-title-display mt-5 max-w-5xl">Un núcleo de audio para crear con criterio, no una caja negra.</h1>
          <p className="pg-lede mt-8 max-w-3xl">{AUDIOCORE_IDENTITY.name} unifica I/O, DSP, tensors, inferencia y streaming bajo una arquitectura trazable. Esta interfaz expone el contrato web; el runtime nativo C++20/CUDA se despliega por separado cuando el entorno lo autoriza.</p>
          <div className="pg-rule mt-12" />
        </section>

        <section className="grid gap-4 py-16 md:grid-cols-3">
          <article className="pg-card p-6"><LockKeyhole className="pg-accent-cyan" size={24} /><p className="pg-eyebrow mt-8">Procedencia</p><h2 className="pg-block-title mt-2">Cada render deja evidencia.</h2><p className="pg-prose mt-3">Modelo, versión, prompt, parámetros, plan, licencia verificada y hash. El sistema no promete derechos que no pueda demostrar.</p></article>
          <article className="pg-card p-6"><Radio className="pg-accent-cyan" size={24} /><p className="pg-eyebrow mt-8">Tiempo real</p><h2 className="pg-block-title mt-2">Audio thread predecible.</h2><p className="pg-prose mt-3">Bloques de 256, 512 o 1024 muestras, ring buffer y separación estricta entre captura, inferencia y salida.</p></article>
          <article className="pg-card p-6"><ShieldCheck className="pg-accent-cyan" size={24} /><p className="pg-eyebrow mt-8">Gobernanza</p><h2 className="pg-block-title mt-2">La IA no sustituye la autoría.</h2><p className="pg-prose mt-3">Las decisiones humanas, permisos, licencias y contribuciones se registran antes de publicar o compartir.</p></article>
        </section>

        <section className="pg-card p-7 sm:p-10">
          <p className="pg-eyebrow" data-tone="amber">Capas del motor</p>
          <div className="mt-7 grid gap-3 lg:grid-cols-2">
            {AUDIOCORE_LAYERS.map((layer, index) => {
              const Icon = icons[index]
              return <article key={layer.id} className="rounded-2xl border border-white/10 bg-white/[.03] p-5"><Icon className="pg-accent-cyan" size={20} /><h2 className="mt-4 text-lg font-semibold text-white">{layer.name}</h2><p className="mt-2 text-sm leading-6 text-white/60">{layer.scope}</p></article>
            })}
          </div>
        </section>

        <section className="grid gap-8 py-16 lg:grid-cols-[.8fr_1.2fr]">
          <div><p className="pg-eyebrow">Contratos verificables</p><h2 className="pg-title mt-4">Interfaces simples, controles explícitos.</h2><p className="pg-prose mt-5">El contrato evita que una optimización de GPU rompa la trazabilidad del producto musical o la seguridad del usuario.</p></div>
          <div className="space-y-3">{AUDIOCORE_CONTRACTS.map(([name, description]) => <div key={name} className="pg-card flex gap-4 p-5"><span className="pg-accent-cyan font-mono text-sm">{name}</span><p className="text-sm leading-6 text-white/70">{description}</p></div>)}</div>
        </section>

        <section className="pg-card border-[color:var(--color-champagne)]/20 p-7 sm:p-10"><p className="pg-eyebrow" data-tone="amber">Estado de implementación</p><div className="mt-6 grid gap-4 sm:grid-cols-3">{Object.entries(AUDIOCORE_STATUS).map(([key, value]) => <div key={key}><p className="font-mono text-xs uppercase tracking-[.18em] text-white/45">{key}</p><p className="mt-2 text-sm leading-6 text-white/80">{value}</p></div>)}</div></section>

        <footer className="py-12 text-center"><p className="text-xs leading-5 text-white/45">{TAMV_LEGAL_NOTICE}</p><p className="mt-2 text-xs text-white/35">Autoría y titularidad declarada: {TAMV_LEGAL_OWNER}. Revisión técnica sujeta a licencias de terceros y jurisdicción aplicable.</p></footer>
      </div>
    </main>
  )
}
