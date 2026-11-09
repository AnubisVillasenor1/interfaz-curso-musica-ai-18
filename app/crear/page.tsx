import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowLeft, ArrowRight, AudioLines, Code2, Cpu, Music2, ShieldCheck, TrendingUp } from 'lucide-react'

import { InstantComposer } from '@/components/instant-composer'
import { ParticleField } from '@/components/cinematic/particle-field'
import { HOOK_ROUTES, assistantHref, type HookRouteId } from '@/lib/music/hook-bridge'

export const metadata: Metadata = {
  title: 'Instant Composer · Crea una pista gratis en tu navegador',
  description:
    'Escribe dos o tres palabras y escucha una pista sintetizada en tu navegador con Web Audio API y Tone.js. Sin registro, sin servidor y sin consumir tu cupo de voces.',
}

const ROUTE_ICON: Record<HookRouteId, typeof Music2> = {
  producer: Music2,
  developer: Code2,
  business: TrendingUp,
}

const EXPLAINERS = [
  {
    icon: AudioLines,
    title: 'Un grafo de audio, no una caja negra',
    body: 'Tone.js programa notas, tempo y sintetizadores; Web Audio API los conecta y los reproduce. La pista existe porque tu dispositivo la está calculando.',
  },
  {
    icon: Cpu,
    title: 'La misma idea, el mismo arreglo',
    body: 'La semilla se deriva del texto y de la versión. Puedes volver a generar la misma pista o pedir una variación y comparar qué cambió.',
  },
  {
    icon: ShieldCheck,
    title: 'Tu idea no se envía para sonar',
    body: 'La generación local no manda tu texto a un servidor ni usa un modelo remoto. Si más adelante eliges voces, el estudio muestra proveedor, tiempo y costo.',
  },
]

export default async function CrearPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const params = await searchParams
  const raw = Array.isArray(params.idea) ? params.idea[0] : params.idea
  const initialIdea = typeof raw === 'string' ? raw.slice(0, 80) : ''

  return (
    <main className="pg-shell relative min-h-screen overflow-x-clip" style={{ background: 'var(--pg-bg)' }}>
      <div aria-hidden="true" className="pg-glow" />
      <div aria-hidden="true" className="cinema-scanlines" />
      <ParticleField />

      <header className="cinema-header">
        <div className="pg-container flex items-center justify-between gap-4 py-3">
          <Link href="/" className="pg-navlink inline-flex items-center gap-2">
            <ArrowLeft size={14} aria-hidden /> Play and Go
          </Link>
          <div className="flex items-center gap-4">
            <Link href="/curso" className="pg-navlink hidden sm:inline">Curso</Link>
            <Link href="/studio" className="pg-navlink hidden sm:inline">Estudio</Link>
            <Link href="/auth?mode=signup" className="pg-btn pg-btn-ghost pg-btn-sm">Crear cuenta</Link>
          </div>
        </div>
        <span className="cinema-header-line" aria-hidden="true" />
      </header>

      <div className="pg-container" style={{ maxWidth: '72rem', paddingTop: '2.5rem', paddingBottom: '4rem' }}>
        <section className="mb-8 max-w-3xl">
          <p className="pg-eyebrow">Hook & Bridge · TAMV Online Network</p>
          <h1 className="pg-title mt-3">Crea una pista antes de decidir si esto es para ti.</h1>
          <p className="pg-lede mt-3">
            Sin registro, sin tarjeta y sin formularios. Escribe una idea corta, escucha lo que tu navegador puede
            sintetizar y, si te da curiosidad, descubre cómo se construyó y qué puedes aprender después.
          </p>
          {initialIdea && (
            <p className="pg-chip mt-4" data-tone="mint" style={{ letterSpacing: '.12em' }}>
              Idea cargada desde un enlace compartido
            </p>
          )}
        </section>

        <InstantComposer initialIdea={initialIdea} />

        <section className="mt-12" aria-labelledby="que-paso-title">
          <p className="pg-eyebrow">Lo que acaba de pasar</p>
          <h2 id="que-paso-title" className="pg-title mt-2">Entender el resultado es parte del resultado</h2>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {EXPLAINERS.map((item) => (
              <article key={item.title} className="pg-card p-5">
                <span className="pg-mark">
                  <item.icon size={17} aria-hidden />
                </span>
                <h3 className="pg-block-title mt-4">{item.title}</h3>
                <p className="pg-note mt-2">{item.body}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="mt-12" aria-labelledby="rutas-title">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="max-w-2xl">
              <p className="pg-eyebrow">El puente</p>
              <h2 id="rutas-title" className="pg-title mt-2">Tres formas de seguir, sin promesas vacías</h2>
              <p className="pg-lede mt-2">
                Ninguna ruta exige registrarte para leerla. La cuenta solo hace falta cuando quieres guardar tu música,
                tu progreso o tus proyectos.
              </p>
            </div>
            <Link href="/precios" className="pg-navlink inline-flex items-center gap-1.5">
              Ver qué cuesta cada cosa <ArrowRight size={13} aria-hidden />
            </Link>
          </div>

          <div className="mt-6 grid gap-4 lg:grid-cols-3">
            {HOOK_ROUTES.map((route) => {
              const Icon = ROUTE_ICON[route.id]
              return (
                <article key={route.id} className="pg-card flex h-full flex-col p-5">
                  <span className="pg-mark">
                    <Icon size={18} aria-hidden />
                  </span>
                  <p className="pg-eyebrow mt-4">{route.eyebrow}</p>
                  <h3 className="pg-block-title mt-1.5">{route.cardTitle}</h3>
                  <p className="pg-note mt-2 flex-1">{route.cardCopy}</p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Link href={assistantHref(initialIdea, route.id)} className="pg-btn pg-btn-ghost pg-btn-sm" data-tone="cyan">
                      Hablar con el asistente <ArrowRight size={13} aria-hidden />
                    </Link>
                  </div>
                  <ul className="pg-list mt-4">
                    {route.learn.slice(0, 2).map((item) => (
                      <li key={item}>
                        <span className="pg-accent-cyan" aria-hidden>·</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                  <Link href={route.actions[0].href} className="pg-minilink mt-4 inline-flex items-center gap-1.5">
                    {route.actions[0].label} <ArrowRight size={13} aria-hidden />
                  </Link>
                </article>
              )
            })}
          </div>
        </section>

        <section className="mt-12 grid gap-4 md:grid-cols-2" aria-labelledby="limites-title">
          <div className="pg-callout rounded-2xl p-5" data-tone="violet">
            <p className="pg-label" data-tone="violet">Lo que esta pista no es</p>
            <h2 id="limites-title" className="pg-block-title mt-2">No es una grabación con voces ni una promesa de ingresos</h2>
            <p className="pg-note mt-2">
              Es una composición procedural: sintetizadores, notas y batería generados por código. No imita artistas
              protegidos y no sustituye una mezcla profesional. Las rutas de monetización hablan de trabajo, costos y
              problemas reales; no de ganancias garantizadas.
            </p>
          </div>
          <div className="pg-card p-5">
            <p className="pg-label" data-tone="muted">Si ya quieres guardar tu obra</p>
            <h2 className="pg-block-title mt-2">El estudio añade cuenta, biblioteca y WAV</h2>
            <p className="pg-note mt-2">
              El Instant Composer no pide cuenta. Para conservar una canción en tu biblioteca privada, descargarla o
              trabajar con más control, entra al estudio. El motor local sigue siendo gratuito dentro del cupo diario.
            </p>
            <div className="mt-4 flex flex-wrap gap-3">
              <Link href="/studio" className="pg-btn pg-btn-primary">
                Abrir el estudio <ArrowRight size={15} aria-hidden />
              </Link>
              <Link href="/curso" className="pg-btn pg-btn-ghost">
                Ver el curso
              </Link>
            </div>
          </div>
        </section>
      </div>
    </main>
  )
}
