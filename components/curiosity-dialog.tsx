'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Code2,
  Copy,
  Lightbulb,
  Music2,
  Share2,
  ShieldCheck,
  TrendingUp,
} from 'lucide-react'

import { Dialog } from '@/components/ui/dialog'
import {
  HOOK_ROUTES,
  assistantHref,
  hookRouteById,
  type HookRouteId,
} from '@/lib/music/hook-bridge'

export type CuriosityReason = 'timer' | 'end' | 'pause' | 'variant' | 'share'

const ROUTE_ICON: Record<HookRouteId, typeof Music2> = {
  producer: Music2,
  developer: Code2,
  business: TrendingUp,
}

const REASON_COPY: Record<CuriosityReason, { title: string; lead: string }> = {
  timer: {
    title: 'Llevas unos segundos escuchando algo que se creó aquí mismo.',
    lead: 'No hubo un servidor corporativo generando la pista. Tu navegador organizó sintetizadores, tempo y notas en tiempo real.',
  },
  end: {
    title: 'La pista terminó. Lo interesante es lo que puedes hacer después.',
    lead: 'Acabas de escuchar un arreglo construido en tu dispositivo. Puedes quedarte con la canción o aprender a controlar cada decisión que la hizo sonar así.',
  },
  pause: {
    title: 'Pausaste para escuchar con atención. Eso ya es una decisión de productor.',
    lead: 'La pista no vino de una caja negra: es un grafo de audio que puedes entender, modificar y reconstruir.',
  },
  variant: {
    title: 'Antes de pedir otra versión, mira lo que hay detrás de la primera.',
    lead: 'Cambiar una palabra produce otra semilla, otro tempo y otra armonía. Entender por qué es la diferencia entre probar botones y producir.',
  },
  share: {
    title: 'Compartir la idea es más honesto que compartir un audio que solo existe en tu navegador.',
    lead: 'La pista se sintetiza localmente. Si compartes el enlace de la idea, otra persona puede generarla en su propio dispositivo y ver el mismo proceso.',
  },
}

export function CuriosityDialog({
  open,
  onClose,
  idea,
  reason,
  onNewVersion,
}: {
  open: boolean
  onClose: () => void
  idea: string
  reason: CuriosityReason
  onNewVersion: () => void
}) {
  const [routeId, setRouteId] = useState<HookRouteId | null>(null)
  const [shareUrl, setShareUrl] = useState('/crear')
  const [shareStatus, setShareStatus] = useState('')

  useEffect(() => {
    if (!open) return
    setRouteId(null)
    setShareStatus('')
  }, [open])

  useEffect(() => {
    if (typeof window === 'undefined') return
    const params = new URLSearchParams({ idea: idea.slice(0, 80) })
    setShareUrl(`${window.location.origin}/crear?${params.toString()}`)
  }, [idea])

  const selected = hookRouteById(routeId)
  const copy = REASON_COPY[reason]

  async function copyShare() {
    try {
      await navigator.clipboard.writeText(shareUrl)
      setShareStatus('Enlace de la idea copiado. La pista se generará en el navegador de quien lo abra.')
    } catch {
      setShareStatus('Tu navegador no permitió copiar automáticamente. Selecciona el enlace y usa Ctrl+C.')
    }
  }

  async function shareNow() {
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: 'Play & Go · Instant Composer',
          text: `Mi idea para una pista: «${idea}». Se genera en el navegador, sin registro.`,
          url: shareUrl,
        })
        return
      } catch (error) {
        // Cancelar el menú del sistema no es un fallo: no se copia nada a la fuerza.
        if (error instanceof Error && error.name === 'AbortError') return
      }
    }
    await copyShare()
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      eyebrow="Hook & Bridge · después de escuchar"
      title={selected ? selected.headline : copy.title}
      className="max-w-3xl"
    >
      {!selected ? (
        <>
          <p className="pg-lede">{copy.lead}</p>

          <div className="pg-inset mt-5">
            <p className="pg-label inline-flex items-center gap-2" data-tone="muted">
              <ShieldCheck size={14} aria-hidden /> Transparencia de esta pista
            </p>
            <p className="pg-note mt-2">
              «{idea || 'tu idea'}» se sintetizó en tu navegador con Web Audio API y Tone.js. No se envió tu texto a un
              servidor para generar este audio y no se usó un modelo de IA remoto. La semilla es determinista: la misma
              idea y la misma versión producen el mismo arreglo.
            </p>
          </div>

          <p className="pg-label mt-6" data-tone="muted">Elige por dónde quieres seguir</p>
          <div className="mt-2 grid gap-3 md:grid-cols-3">
            {HOOK_ROUTES.map((route) => {
              const Icon = ROUTE_ICON[route.id]
              return (
                <button
                  key={route.id}
                  type="button"
                  onClick={() => setRouteId(route.id)}
                  className="pg-card pg-card-hover flex h-full flex-col p-4 text-left"
                >
                  <span className="pg-mark">
                    <Icon size={17} aria-hidden />
                  </span>
                  <span className="pg-eyebrow mt-4">{route.eyebrow}</span>
                  <strong className="mt-1.5 block text-sm leading-5" style={{ color: 'var(--pg-ink)' }}>
                    {route.cardTitle}
                  </strong>
                  <span className="pg-note mt-2 flex-1">{route.cardCopy}</span>
                  <span className="pg-minilink mt-4 inline-flex items-center gap-1.5">
                    {route.cta} <ArrowRight size={13} aria-hidden />
                  </span>
                </button>
              )
            })}
          </div>

          <div className="mt-6 rounded-2xl p-4" style={{ border: '1px solid var(--pg-hairline)', background: 'rgba(117, 233, 242, 0.05)' }}>
            <p className="pg-label inline-flex items-center gap-2" data-tone="cyan">
              <Share2 size={14} aria-hidden /> Compartir sin enviar audio
            </p>
            <p className="pg-note mt-2">
              Esta pista vive en tu navegador. El enlace comparte la idea para que otra persona la genere localmente.
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <button type="button" onClick={shareNow} className="pg-btn pg-btn-ghost pg-btn-sm">
                <Share2 size={15} aria-hidden /> Compartir idea
              </button>
              <button type="button" onClick={copyShare} className="pg-btn pg-btn-ghost pg-btn-sm" data-tone="cyan">
                <Copy size={15} aria-hidden /> Copiar enlace
              </button>
            </div>
            {shareStatus && <p role="status" className="pg-note mt-2">{shareStatus}</p>}
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <Link href={assistantHref(idea)} className="pg-btn pg-btn-primary">
              Hablar con el asistente <ArrowRight size={15} aria-hidden />
            </Link>
            <button type="button" onClick={onNewVersion} className="pg-btn pg-btn-ghost">
              Crear otra versión
            </button>
            <button type="button" onClick={onClose} className="pg-navlink">
              Seguir explorando
            </button>
          </div>
        </>
      ) : (
        <>
          <button type="button" onClick={() => setRouteId(null)} className="pg-navlink inline-flex items-center gap-1.5">
            <ArrowLeft size={14} aria-hidden /> Volver a las tres rutas
          </button>

          <p className="pg-lede mt-4">{selected.body}</p>

          <div className="mt-5 grid gap-3 md:grid-cols-2">
            <div className="pg-inset">
              <p className="pg-label inline-flex items-center gap-2" data-tone="muted">
                <Lightbulb size={14} aria-hidden /> Lo que vas a aprender
              </p>
              <ul className="pg-list mt-2">
                {selected.learn.map((item) => (
                  <li key={item}>
                    <span className="pg-accent-cyan" aria-hidden>·</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="pg-inset">
              <p className="pg-label" data-tone="violet">Primer reto · 5 minutos</p>
              <p className="mt-2 text-sm leading-6" style={{ color: 'var(--pg-text)' }}>{selected.challenge}</p>
              <p className="pg-note mt-3">
                No hay una respuesta única. El objetivo es que puedas explicar qué cambió y por qué.
              </p>
            </div>
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-3">
            {selected.actions.map((action) => (
              <Link
                key={action.href}
                href={action.href}
                className={action.tone === 'primary' ? 'pg-btn pg-btn-primary' : 'pg-btn pg-btn-ghost'}
              >
                {action.label} <ArrowRight size={15} aria-hidden />
              </Link>
            ))}
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <Link href={assistantHref(idea, selected.id)} className="pg-minilink inline-flex items-center gap-1.5">
              Llevar este contexto al asistente <ArrowRight size={13} aria-hidden />
            </Link>
            <span className="pg-note inline-flex items-center gap-1.5">
              <Check size={13} className="pg-accent-mint" aria-hidden /> Sin promesas de ingresos ni urgencia artificial.
            </span>
          </div>
        </>
      )}
    </Dialog>
  )
}
