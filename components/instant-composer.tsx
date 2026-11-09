'use client'

import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react'
import Link from 'next/link'
import {
  ArrowRight,
  AudioLines,
  LoaderCircle,
  Music2,
  Pause,
  Play,
  RotateCcw,
  Share2,
  ShieldCheck,
  Sparkles,
  Wand2,
} from 'lucide-react'

import { CuriosityDialog, type CuriosityReason } from '@/components/curiosity-dialog'
import { compose, type Arrangement } from '@/lib/music/arrangement'
import { engine } from '@/lib/music/engine'
import {
  HOOK_LIMITS,
  HOOK_PRESETS,
  assistantHref,
  interpretIdea,
  type IdeaInterpretation,
} from '@/lib/music/hook-bridge'

type Phase = 'idle' | 'composing' | 'playing' | 'paused' | 'ready' | 'error'

interface HookResult {
  interpretation: IdeaInterpretation
  arrangement: Arrangement
}

const PHASE_COPY: Record<Phase, string> = {
  idle: 'Escribe dos o tres palabras. El resto se sintetiza aquí.',
  composing: 'Interpretando la idea y construyendo el arreglo…',
  playing: 'Sonando en tu navegador. Nada de esto viaja a un servidor.',
  paused: 'Pausado. Puedes seguir cuando quieras.',
  ready: 'La pista terminó. Puedes repetirla o cambiar una decisión.',
  error: '',
}

/**
 * Visualizador de espectro del motor local.
 *
 * No crea un segundo grafo de audio: lee el mismo `Analyser` que usa el
 * compositor. Cuando no hay reproducción dibuja una onda lenta para que el
 * panel no parezca roto antes del primer gesto.
 */
function SpectrumCanvas({ active }: { active: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  useEffect(() => {
    let frame = 0
    const draw = () => {
      const canvas = canvasRef.current
      if (!canvas) {
        frame = requestAnimationFrame(draw)
        return
      }
      const context = canvas.getContext('2d')
      if (!context) return

      const rect = canvas.getBoundingClientRect()
      const dpr = Math.min(2, window.devicePixelRatio || 1)
      const width = Math.max(1, Math.floor(rect.width * dpr))
      const height = Math.max(1, Math.floor(rect.height * dpr))
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width
        canvas.height = height
      }
      context.setTransform(dpr, 0, 0, dpr, 0, 0)
      const w = width / dpr
      const h = height / dpr
      context.clearRect(0, 0, w, h)

      // Rejilla tenue: da referencia visual sin competir con las barras.
      context.strokeStyle = 'rgba(150, 214, 232, 0.12)'
      context.lineWidth = 1
      for (let line = 1; line < 4; line += 1) {
        const y = (h / 4) * line
        context.beginPath()
        context.moveTo(0, y)
        context.lineTo(w, y)
        context.stroke()
      }

      const data = active ? engine.analyserData() : null
      const bars = Math.max(36, Math.min(96, Math.floor(w / 7)))
      const gap = 2
      const barWidth = Math.max(2, (w - gap * (bars - 1)) / bars)
      const now = performance.now() / 1000
      const gradient = context.createLinearGradient(0, h, 0, 0)
      gradient.addColorStop(0, 'rgba(117, 233, 242, 0.5)')
      gradient.addColorStop(0.55, 'rgba(143, 240, 246, 0.9)')
      gradient.addColorStop(1, 'rgba(192, 158, 255, 0.95)')

      for (let index = 0; index < bars; index += 1) {
        let level = 0
        if (data?.length) {
          const normalized = index / bars
          const sampleIndex = Math.min(data.length - 1, Math.floor(Math.pow(normalized, 1.6) * data.length))
          const db = data[sampleIndex]
          level = Math.max(0, Math.min(1, (db + 100) / 90))
        }
        if (!active) {
          const wave = Math.sin(now * 1.4 + index * 0.42) * 0.5 + 0.5
          const envelope = Math.sin((index / bars) * Math.PI)
          level = 0.04 + wave * envelope * 0.09
        }
        const barHeight = Math.max(2, level * (h - 8))
        const x = index * (barWidth + gap)
        context.fillStyle = gradient
        context.globalAlpha = active ? 0.5 + level * 0.5 : 0.4
        context.fillRect(x, h - barHeight, barWidth, barHeight)
      }
      context.globalAlpha = 1
      frame = requestAnimationFrame(draw)
    }
    frame = requestAnimationFrame(draw)
    return () => cancelAnimationFrame(frame)
  }, [active])

  return <canvas ref={canvasRef} aria-hidden="true" className="h-28 w-full sm:h-36" />
}

export function InstantComposer({ initialIdea = '' }: { initialIdea?: string }) {
  const [idea, setIdea] = useState(initialIdea.slice(0, HOOK_LIMITS.maxChars))
  const [phase, setPhase] = useState<Phase>('idle')
  const [detail, setDetail] = useState('')
  const [result, setResult] = useState<HookResult | null>(null)
  const [version, setVersion] = useState(0)
  const [progress, setProgress] = useState(0)
  const [modalOpen, setModalOpen] = useState(false)
  const [reason, setReason] = useState<CuriosityReason>('end')

  const timerRef = useRef<number | null>(null)
  const hasPlayedRef = useRef(false)
  const curiosityShownRef = useRef(false)

  const clearCuriosityTimer = useCallback(() => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current)
      timerRef.current = null
    }
  }, [])

  const openCuriosity = useCallback(
    (nextReason: CuriosityReason, force = false) => {
      if (!hasPlayedRef.current) return
      if (!force && curiosityShownRef.current) return
      curiosityShownRef.current = true
      clearCuriosityTimer()
      setReason(nextReason)
      setModalOpen(true)
    },
    [clearCuriosityTimer],
  )

  const scheduleCuriosity = useCallback(() => {
    clearCuriosityTimer()
    if (curiosityShownRef.current) return
    const elapsedMs = engine.transportSeconds * 1000
    const remaining = Math.max(1500, HOOK_LIMITS.curiosityDelayMs - elapsedMs)
    timerRef.current = window.setTimeout(() => openCuriosity('timer'), remaining)
  }, [clearCuriosityTimer, openCuriosity])

  // El motor es un singleton: si se sale de la página, no puede quedar sonando.
  useEffect(
    () => () => {
      clearCuriosityTimer()
      engine.stop()
      engine.dispose()
    },
    [clearCuriosityTimer],
  )

  // Fin de la pista: el transporte de Tone sigue corriendo aunque el arreglo
  // haya terminado, así que el final se mide contra la duración del arreglo.
  useEffect(() => {
    if (phase !== 'playing') return
    const interval = window.setInterval(() => {
      const value = engine.progress()
      setProgress(value)
      if (value >= 0.999) {
        engine.stop()
        setProgress(1)
        setPhase('ready')
        openCuriosity('end')
      }
    }, 200)
    return () => window.clearInterval(interval)
  }, [phase, openCuriosity])

  async function generate(nextIdea?: string, isVariant = false) {
    const text = (nextIdea ?? idea).trim()
    if (text.length < HOOK_LIMITS.minChars) {
      setPhase('error')
      setDetail('Escribe al menos dos caracteres para tener una idea.')
      return
    }

    const sameIdea = result?.interpretation.idea === text
    const nextVersion = isVariant && sameIdea ? version + 1 : 1

    setPhase('composing')
    setDetail('')
    setProgress(0)
    setModalOpen(false)
    clearCuriosityTimer()
    engine.stop()

    try {
      const interpretation = interpretIdea(text, nextVersion)
      const arrangement = compose({
        prompt: text,
        title: interpretation.title,
        genreId: interpretation.genreId,
        bpm: interpretation.bpm,
        seed: interpretation.seed,
      })

      setResult({ interpretation, arrangement })
      setVersion(nextVersion)
      await engine.load(arrangement)
      await engine.play()

      hasPlayedRef.current = true
      curiosityShownRef.current = false
      setPhase('playing')
      scheduleCuriosity()
    } catch (error) {
      console.error('[hook-bridge] no se pudo crear la pista', error)
      setPhase('error')
      setDetail(
        error instanceof RangeError
          ? error.message
          : 'Tu navegador no pudo iniciar el audio. Prueba con Chrome o Edge actualizados y vuelve a intentarlo.',
      )
    }
  }

  function submit(event: FormEvent) {
    event.preventDefault()
    void generate()
  }

  async function togglePlayback() {
    if (!result || phase === 'composing') return
    try {
      if (phase === 'playing') {
        engine.pause()
        clearCuriosityTimer()
        setPhase('paused')
        openCuriosity('pause')
        return
      }
      await engine.play()
      setPhase('playing')
      scheduleCuriosity()
    } catch (error) {
      console.error('[hook-bridge] reproducción falló', error)
      setPhase('error')
      setDetail('El navegador bloqueó la reproducción. Vuelve a pulsar Reproducir.')
    }
  }

  function newVersion() {
    // Antes de pedir otra versión, el puente muestra lo que hay detrás. Si ya
    // se mostró, el botón del modal sigue funcionando sin repetir el diálogo.
    if (!curiosityShownRef.current) {
      openCuriosity('variant')
      return
    }
    setModalOpen(false)
    void generate(undefined, true)
  }

  function shareIdea() {
    if (!result) return
    openCuriosity('share', true)
  }

  const arrangement = result?.arrangement
  const interpretation = result?.interpretation
  const busy = phase === 'composing'
  const duration = arrangement ? Math.max(1, Math.round(arrangement.durationSeconds)) : 0
  const elapsed = Math.round(progress * duration)

  return (
    <>
      <section className="pg-card p-5 sm:p-7" aria-labelledby="instant-composer-title">
        <header className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-2xl">
            <p className="pg-eyebrow">Instant Composer · sin registro</p>
            <h2 id="instant-composer-title" className="pg-block-title mt-2" style={{ fontSize: 'var(--pg-step-2)' }}>
              ¿Qué canción quieres crear hoy?
            </h2>
            <p className="pg-note mt-2">
              Dos o tres palabras bastan. El motor local interpreta la idea, compone un arreglo y lo reproduce en tu
              navegador con Tone.js y Web Audio API. No se envía tu texto a un servidor.
            </p>
          </div>
          <span className="pg-chip" data-tone="mint">
            <ShieldCheck size={14} aria-hidden /> Local y determinista
          </span>
        </header>

        <form onSubmit={submit} className="mt-6 flex flex-col gap-3 sm:flex-row">
          <label className="sr-only" htmlFor="hook-idea">Describe tu idea musical</label>
          <input
            id="hook-idea"
            value={idea}
            onChange={(event) => setIdea(event.target.value.slice(0, HOOK_LIMITS.maxChars))}
            maxLength={HOOK_LIMITS.maxChars}
            placeholder="Ej. Electro chill armónico"
            autoComplete="off"
            className="pg-field h-12 min-w-0 flex-1 text-base"
          />
          <button type="submit" disabled={busy} className="pg-btn pg-btn-primary shrink-0">
            {busy ? <LoaderCircle size={16} className="animate-spin" aria-hidden /> : <Wand2 size={16} aria-hidden />}
            {busy ? 'Componiendo…' : 'Generar pista instantánea'}
          </button>
        </form>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="pg-label" data-tone="muted">O empieza con una idea</span>
          {HOOK_PRESETS.slice(0, 6).map((preset) => (
            <button
              key={preset.label}
              type="button"
              onClick={() => setIdea(preset.idea)}
              className="pg-chip transition-colors hover:text-[var(--pg-ink)]"
              data-tone="violet"
            >
              {preset.label}
            </button>
          ))}
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-[1.25fr_.75fr]">
          <div
            className="relative overflow-hidden rounded-2xl p-4"
            style={{ border: '1px solid var(--pg-hairline)', background: 'rgba(2, 8, 14, 0.42)' }}
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span className="pg-label inline-flex items-center gap-2" data-tone="cyan">
                <AudioLines size={14} aria-hidden /> Espectro en vivo
              </span>
              <span className="pg-meta">
                {arrangement ? `${arrangement.bpm} BPM · ${arrangement.key.tonic} ${arrangement.key.mode}` : 'Sin generar'}
              </span>
            </div>
            <div className="mt-3">
              <SpectrumCanvas active={phase === 'playing'} />
            </div>
            <div className="mt-2">
              <div className="pg-meter" role="progressbar" aria-valuenow={Math.round(progress * 100)} aria-valuemin={0} aria-valuemax={100} aria-label="Avance de la pista">
                <div className="pg-meter-fill" style={{ width: `${Math.round(progress * 100)}%` }} />
              </div>
              <p className="pg-meta mt-2">
                {arrangement ? `${elapsed} s / ${duration} s · versión ${version}` : 'La pista se genera al pulsar el botón'}
              </p>
            </div>
          </div>

          <div className="pg-inset flex flex-col gap-3">
            <div>
              <p className="pg-label" data-tone="muted">Tu pista</p>
              <p className="pg-item-title mt-1.5">{arrangement?.title ?? 'Todavía no hay una pista'}</p>
              <p className="pg-note mt-1">
                {interpretation
                  ? `${interpretation.genreName}${interpretation.approximate ? ' (aproximación del catálogo)' : ''}`
                  : 'La interpretación aparecerá aquí, con la razón de cada decisión.'}
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={togglePlayback}
                disabled={!arrangement || busy}
                className="pg-btn pg-btn-ghost pg-btn-sm"
                data-tone="cyan"
              >
                {phase === 'playing' ? <Pause size={15} aria-hidden /> : <Play size={15} aria-hidden />}
                {phase === 'playing' ? 'Pausar' : phase === 'paused' ? 'Reanudar' : phase === 'ready' ? 'Repetir' : 'Reproducir'}
              </button>
              <button
                type="button"
                onClick={newVersion}
                disabled={!arrangement || busy}
                className="pg-btn pg-btn-ghost pg-btn-sm"
              >
                <RotateCcw size={15} aria-hidden /> Otra versión
              </button>
              <button
                type="button"
                onClick={shareIdea}
                disabled={!arrangement}
                className="pg-btn pg-btn-ghost pg-btn-sm"
              >
                <Share2 size={15} aria-hidden /> Compartir idea
              </button>
            </div>

            <p className="pg-note flex-1">
              {phase === 'error' ? detail : PHASE_COPY[phase]}
            </p>

            {arrangement && (
              <Link
                href={`/studio?prompt=${encodeURIComponent(interpretation?.idea ?? idea)}`}
                className="pg-minilink inline-flex items-center gap-1.5"
              >
                Guardar en tu biblioteca y seguir en el estudio <ArrowRight size={13} aria-hidden />
              </Link>
            )}
          </div>
        </div>

        {interpretation && (
          <div className="pg-inset mt-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="pg-label" data-tone="violet">Cómo se interpretó tu idea</p>
                <p className="pg-note mt-2">{interpretation.rationale}</p>
              </div>
              <span className="pg-chip" data-tone="amber">
                <Music2 size={13} aria-hidden /> Semilla {interpretation.seed}
              </span>
            </div>
            {interpretation.matches.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {interpretation.matches.map((match) => (
                  <span key={`${match.token}-${match.genreId}`} className="pg-chip" data-tone="violet">
                    {match.token} → {match.genreName}
                  </span>
                ))}
              </div>
            )}
            {interpretation.moods.length > 0 && (
              <p className="pg-note mt-3">
                Emoción detectada: {interpretation.moods.join(' · ')}. La emoción orienta el modo y la densidad, pero no
                sustituye tu criterio.
              </p>
            )}
          </div>
        )}

        {phase === 'error' && detail && (
          <p role="alert" className="pg-status mt-3" data-tone="error">{detail}</p>
        )}

        <p className="pg-note mt-4 inline-flex items-start gap-2">
          <Sparkles size={14} className="pg-accent-cyan mt-0.5" aria-hidden />
          <span>
            Esta pista no usa IA remota ni consume tu cupo de voces. Es una composición procedural local. Si quieres
            letras, voces o un modelo generativo, el estudio te dirá qué proveedor interviene, cuánto tarda y qué cupo
            consume antes de gastarlo.
          </span>
        </p>
      </section>

      <CuriosityDialog
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        idea={interpretation?.idea ?? idea}
        reason={reason}
        onNewVersion={() => {
          setModalOpen(false)
          void generate(undefined, true)
        }}
      />

      {arrangement && (
        <p className="sr-only" aria-live="polite">
          Pista {arrangement.title}, {arrangement.bpm} BPM, tonalidad {arrangement.key.tonic} {arrangement.key.mode},
          duración {duration} segundos, versión {version}.
        </p>
      )}

      {/* Enlace estable para el handoff del asistente, aunque el modal no esté abierto. */}
      {interpretation && (
        <p className="sr-only">
          <Link href={assistantHref(interpretation.idea)}>Abrir el asistente con esta idea</Link>
        </p>
      )}
    </>
  )
}
