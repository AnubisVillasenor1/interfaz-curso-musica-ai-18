import Link from 'next/link'
import { ArrowRight, AudioLines, Mic2, MousePointerClick, UserPlus } from 'lucide-react'

import { LocalComposer } from '@/components/local-composer'
import { MusicStudio } from '@/components/music-studio'
import { RealAudioStudio } from '@/components/real-audio-studio'
import { FREE_TIER, PRODUCTS, formatPrice } from '@/lib/products'

/**
 * Estudio.
 *
 * La versión anterior apilaba tres herramientas con la misma jerarquía visual:
 * el compositor, un planificador MIDI y un analizador FFT. Quien entraba no
 * sabía cuál era «la buena» ni qué botón producía una canción. Ahora hay una
 * ruta explícita de tres pasos y un compositor principal; el resto vive dentro
 * de «Herramientas adicionales», cerrado por defecto.
 *
 * `?prompt=` se conserva porque las plantillas de la portada enlazan aquí.
 * Se limita a los 2.000 caracteres del campo para que un enlace manipulable no
 * inyecte un texto infinito.
 */
export default async function StudioPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const params = await searchParams
  const raw = Array.isArray(params.prompt) ? params.prompt[0] : params.prompt
  const initialPrompt = typeof raw === 'string' ? raw.slice(0, 2000) : ''

  const pro = PRODUCTS['play-and-go-pro']

  const steps = [
    {
      icon: UserPlus,
      title: 'Crea tu cuenta',
      body: `Es gratis y no pide tarjeta. Con la cuenta guardas tus canciones y tienes ${FREE_TIER.localDailyLimit} composiciones locales al día.`,
      action: { label: 'Crear cuenta gratis', href: '/auth?mode=signup' },
    },
    {
      icon: MousePointerClick,
      title: 'Describe la canción',
      body: 'Un título y una frase con las cinco decisiones: género, emoción, instrumentos, tempo y estructura. Si no sabes qué escribir, elige un ejemplo.',
      action: null,
    },
    {
      icon: AudioLines,
      title: 'Compón, escucha y guarda',
      body: 'El audio se renderiza en tu navegador y queda en tu biblioteca como WAV. Las voces del proveedor son opcionales y consumen tu cupo de pago.',
      action: null,
    },
  ] as const

  return (
    <main className="pg-shell min-h-screen" style={{ background: 'var(--pg-bg)' }}>
      <div className="pg-container" style={{ maxWidth: '68rem', paddingTop: '2.5rem' }}>
        <a href="/" className="pg-navlink">
          ← Volver a Play and Go
        </a>

        <header className="mb-8 mt-6">
          <p className="pg-eyebrow">Estudio · TAMV Online Network</p>
          <h1 className="pg-title">Una canción, tres pasos</h1>
          <p className="pg-lede">
            No necesitas saber producción ni leer un manual. Crea tu cuenta, describe lo que quieres oír y guarda el
            resultado. El motor local es gratuito; las voces del proveedor se activan con el curso o el plan mensual.
          </p>
        </header>

        <ol className="mb-8 grid gap-4 md:grid-cols-3">
          {steps.map((step, index) => (
            <li key={step.title} className="pg-card flex flex-col p-5">
              <span className="flex items-center gap-2">
                <step.icon size={17} className="pg-accent-cyan" />
                <span className="pg-label" data-tone="muted">
                  Paso {index + 1}
                </span>
              </span>
              <strong className="mt-3 block" style={{ color: 'var(--pg-ink)' }}>
                {step.title}
              </strong>
              <p className="pg-note mt-2 flex-1">{step.body}</p>
              {step.action && (
                <Link href={step.action.href} className="pg-minilink mt-4 inline-flex items-center gap-1.5">
                  {step.action.label} <ArrowRight size={13} />
                </Link>
              )}
            </li>
          ))}
        </ol>

        {initialPrompt && (
          <p className="pg-chip mb-5" data-tone="mint" style={{ letterSpacing: '.14em' }}>
            Plantilla cargada desde la biblioteca
          </p>
        )}

        <LocalComposer initialPrompt={initialPrompt} />

        <section className="mt-8 grid gap-4 md:grid-cols-2">
          <div className="pg-card p-5">
            <p className="pg-eyebrow">Gratis · motor local</p>
            <h2 className="pg-block-title mt-2">Componer y guardar</h2>
            <ul className="pg-list mt-3">
              <li>
                <span className="pg-accent-cyan" aria-hidden>·</span>
                <span>{FREE_TIER.localDailyLimit} canciones al día sin pagar.</span>
              </li>
              <li>
                <span className="pg-accent-cyan" aria-hidden>·</span>
                <span>El audio se genera en tu navegador; sólo se sube a tu biblioteca privada cuando lo guardas.</span>
              </li>
              <li>
                <span className="pg-accent-cyan" aria-hidden>·</span>
                <span>Guarda el WAV en tu biblioteca privada.</span>
              </li>
            </ul>
          </div>
          <div className="pg-card p-5" style={{ borderColor: 'color-mix(in srgb, var(--pg-violet) 32%, transparent)' }}>
            <p className="pg-eyebrow" style={{ color: 'var(--pg-violet)' }}>Opcional · proveedor</p>
            <h2 className="pg-block-title mt-2">Con voces</h2>
            <ul className="pg-list mt-3">
              <li>
                <span className="pg-accent-violet" aria-hidden>·</span>
                <span>Envía la descripción al proveedor y devuelve una canción cantada.</span>
              </li>
              <li>
                <span className="pg-accent-violet" aria-hidden>·</span>
                <span>Consume una generación diaria de tu plan. No es el mismo cupo que el motor local.</span>
              </li>
              <li>
                <span className="pg-accent-violet" aria-hidden>·</span>
                <span>
                  Se activa con el curso ({formatPrice(PRODUCTS['play-and-go-course'].priceInCents)}, pago único) o
                  con Estudio abierto ({formatPrice(pro.priceInCents)}/mes).
                </span>
              </li>
            </ul>
            <Link href="/precios" className="pg-minilink mt-4 inline-flex items-center gap-1.5">
              Comparar planes <ArrowRight size={13} />
            </Link>
          </div>
        </section>

        <div className="mt-6 flex items-center gap-2">
          <Mic2 size={16} className="pg-accent-muted" />
          <p className="pg-note">
            El compositor con voces puede tardar; el motor local devuelve la canción en segundos.
          </p>
        </div>
      </div>

      <section className="mt-14">
        <div className="pg-container" style={{ maxWidth: '68rem' }}>
          <div className="pg-rule" />
          <p className="pg-eyebrow mt-10">Herramientas adicionales</p>
          <h2 className="pg-title mt-2">Para las sesiones de escucha</h2>
          <p className="pg-lede">
            No son necesarias para crear una canción. Sirven para planificar un arreglo y exportarlo como MIDI, y
            para analizar el espectro de un audio durante el curso.
          </p>
        </div>

        <MusicStudio />

        <div className="pg-container" style={{ maxWidth: '68rem', paddingBottom: '3rem' }}>
          <RealAudioStudio />
        </div>
      </section>
    </main>
  )
}
