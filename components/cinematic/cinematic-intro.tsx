'use client'

import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import { Canvas } from '@react-three/fiber'
import * as THREE from 'three'

import CinematicStage from './cinematic-stage'
import { actAt, CINEMATIC_ACTS } from '@/lib/cinematic/scenes'
import { markIntroSeen } from '@/lib/cinematic/gate'
import { INTRO_TRACK, SoundBed, type BedState } from '@/lib/cinematic/soundbed'
import {
  createEnv,
  detectTier,
  dprFor,
  hasWebGL,
  nextTier,
  prefersReducedMotion,
  type CinematicEnv,
  type QualityTier,
} from '@/lib/cinematic/quality'

interface Props {
  onComplete?: () => void
  onSkip?: () => void
  autoAdvance?: boolean
}

const FOCUSABLE_SELECTOR = 'button:not([disabled]), [href], input, [tabindex]:not([tabindex="-1"])'

/** Utilidad tipada para inyección de CSS Custom Properties sin romper el tipado de React. */
const cssVars = (vars: Record<string, string | number>): CSSProperties => vars as unknown as CSSProperties

export default function CinematicIntro({ onComplete, onSkip, autoAdvance = true }: Props) {
  const [capabilities, setCapabilities] = useState<{ webgl: boolean; reduced: boolean; tier: QualityTier } | null>(null)
  const [act, setAct] = useState(0)
  const [warping, setWarping] = useState(false)
  const [bedState, setBedState] = useState<BedState>('idle')
  const [progressKey, setProgressKey] = useState(0)

  // Referencias estables para evitar closures obsoletas (stale closures) y re-renders innecesarios
  const actRef = useRef(act)
  actRef.current = act

  const env = useRef<CinematicEnv>(createEnv())
  const shellRef = useRef<HTMLDivElement>(null)
  const restoreFocus = useRef<Element | null>(null)
  const bedRef = useRef<SoundBed | null>(null)
  const timeoutIds = useRef<number[]>([])

  // Gestor seguro de timeouts con autolimpieza al desmontar
  const safeTimeout = useCallback((callback: () => void, delay: number) => {
    const id = window.setTimeout(callback, delay)
    timeoutIds.current.push(id)
    return id
  }, [])

  useEffect(() => {
    return () => {
      timeoutIds.current.forEach(window.clearTimeout)
      timeoutIds.current = []
    }
  }, [])

  /* --- Detección inicial de capacidades del cliente --- */
  useEffect(() => {
    setCapabilities({
      webgl: hasWebGL(),
      reduced: prefersReducedMotion(),
      tier: detectTier(),
    })
  }, [])

  /* --- Bloqueo de scroll y gestión de foco modal accesible --- */
  useEffect(() => {
    restoreFocus.current = document.activeElement
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const timer = safeTimeout(() => {
      shellRef.current?.querySelector<HTMLElement>('[data-first-control]')?.focus()
    }, 80)

    return () => {
      window.clearTimeout(timer)
      document.body.style.overflow = previousOverflow
    }
  }, [safeTimeout])

  /* --- Inicialización y ciclo de vida del motor de audio (SoundBed) --- */
  useEffect(() => {
    const bed = new SoundBed(INTRO_TRACK, {
      delaySeconds: 0.11,
      wet: 0.3,
      feedback: 0.26,
      dampHz: 2600,
      master: 0.72,
      fadeIn: 1.4,
    })
    bedRef.current = bed
    bed.prime()
    const unsubscribe = bed.onState(setBedState)

    void bed.enable()

    const controller = new AbortController()
    const retry = () => {
      if (bed.playState !== 'playing') void bed.enable()
    }

    window.addEventListener('pointerdown', retry, { passive: true, signal: controller.signal })
    window.addEventListener('keydown', retry, { signal: controller.signal })

    return () => {
      unsubscribe()
      controller.abort()
      bed.dispose()
      bedRef.current = null
    }
  }, [])

  const finish = useCallback((skipped: boolean) => {
    markIntroSeen()
    bedRef.current?.disable()
    const target = skipped ? onSkip : onComplete
    target?.()
    const element = restoreFocus.current as HTMLElement | null
    element?.focus?.({ preventScroll: true })
  }, [onComplete, onSkip])

  /* --- Transición fluida entre actos con efecto Warp en GPU --- */
  const goTo = useCallback((index: number) => {
    if (index === actRef.current || warping) return
    setWarping(true)
    env.current.warp = 1

    safeTimeout(() => {
      setAct(index)
      setProgressKey((key) => key + 1)
      env.current.warp = 0.12
      safeTimeout(() => setWarping(false), 260)
    }, 520)
  }, [warping, safeTimeout])

  const advance = useCallback(() => {
    if (actRef.current < CINEMATIC_ACTS.length - 1) {
      goTo(actRef.current + 1)
    } else {
      finish(false)
    }
  }, [finish, goTo])

  /* --- Automatización de la línea de tiempo temporal --- */
  useEffect(() => {
    if (!autoAdvance || warping || !capabilities || capabilities.reduced) return
    const durationMs = actAt(act).duration * 1000
    const id = safeTimeout(advance, durationMs)
    return () => {
      window.clearTimeout(id)
    }
  }, [act, advance, autoAdvance, capabilities, progressKey, warping, safeTimeout])

  /* --- Gestión de teclado y trampa de foco (Focus Trap) con AbortController --- */
  useEffect(() => {
    const controller = new AbortController()

    function onKeyDown(event: KeyboardEvent) {
      const tag = (event.target as HTMLElement | null)?.tagName
      if (event.key === 'Escape') {
        event.preventDefault()
        finish(true)
      } else if (event.key === 'ArrowRight' || (event.key === ' ' && tag !== 'BUTTON')) {
        event.preventDefault()
        advance()
      } else if (event.key === 'ArrowLeft') {
        event.preventDefault()
        if (actRef.current > 0) goTo(actRef.current - 1)
      } else if (event.key === 'Tab') {
        const nodes = shellRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)
        if (!nodes?.length) return
        const list = Array.from(nodes).filter((node) => node.offsetParent !== null)
        const first = list[0]
        const last = list[list.length - 1]
        if (!first || !last) return
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault()
          last.focus()
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault()
          first.focus()
        }
      }
    }

    window.addEventListener('keydown', onKeyDown, { signal: controller.signal })
    return () => controller.abort()
  }, [advance, finish, goTo])

  /* --- Loop visual reactivo acoplado a la frecuencia de audio / rAF --- */
  useEffect(() => {
    let frame = 0
    let cancelled = false

    const tick = () => {
      if (cancelled) return
      const bed = bedRef.current
      if (bed && bed.playState === 'playing') {
        const bands = bed.bands()
        env.current.target = bed.level()
        env.current.bass = bands.low
        env.current.treble = bands.high
      } else {
        const t = performance.now() / 1000
        const density = actAt(actRef.current).density
        env.current.target = Math.max(0, (0.12 + 0.1 * Math.sin(t * 0.7) + 0.05 * Math.sin(t * 2.3)) * (0.5 + density))
        env.current.bass = Math.max(0, 0.1 + 0.09 * Math.sin(t * 0.9))
        env.current.treble = Math.max(0, 0.08 + 0.07 * Math.sin(t * 1.7 + 1.2))
      }
      frame = requestAnimationFrame(tick)
    }

    frame = requestAnimationFrame(tick)
    return () => {
      cancelled = true
      cancelAnimationFrame(frame)
    }
  }, [])

  const toggleAudio = useCallback(() => {
    const bed = bedRef.current
    if (!bed) return
    if (bed.playState === 'playing') bed.disable()
    else void bed.enable()
  }, [])

  const current = actAt(act)
  const ready = capabilities !== null
  const reduced = capabilities?.reduced ?? false
  const tier = capabilities?.tier ?? 'medium'
  const playing = bedState === 'playing'

  const rail = useMemo(
    () => CINEMATIC_ACTS.map((item, index) => ({ id: item.id, name: item.chip, index })),
    [],
  )

  return (
    <div
      ref={shellRef}
      role="dialog"
      aria-modal="true"
      aria-label="Intro cinemática de Play and Go"
      className="intro-shell"
    >
      {/* Capa WebGL / Respaldo de Aurora */}
      <div className="absolute inset-0" aria-hidden="true">
        {ready && capabilities?.webgl ? (
          <Canvas
            dpr={dprFor(tier)}
            frameloop={reduced ? 'demand' : 'always'}
            gl={{
              antialias: false,
              alpha: false,
              stencil: false,
              powerPreference: 'high-performance',
              toneMapping: reduced ? THREE.NoToneMapping : THREE.ACESFilmicToneMapping,
              toneMappingExposure: 1.12,
            }}
            camera={{ position: [0, 0.4, 13.2], fov: 48, near: 0.1, far: 140 }}
          >
            <CinematicStage
              actIndex={act}
              quality={tier}
              reducedMotion={reduced}
              env={env}
              onQualityDecline={() => setCapabilities((c) => (c ? { ...c, tier: nextTier(c.tier) } : c))}
            />
          </Canvas>
        ) : (
          <div className="aurora-field absolute inset-0">
            <span className="aurora-blob" style={{ background: current.palette.key }} />
            <span className="aurora-blob" style={{ background: current.palette.ember, transform: 'translate3d(16%, 22%, 0)' }} />
          </div>
        )}
      </div>

      {/* Capas de profundidad óptica y grano */}
      <div className="intro-veil" aria-hidden="true" />
      <div className="intro-grain" aria-hidden="true" />
      <div className="intro-marks" aria-hidden="true">
        <span /><span /><span /><span />
      </div>
      <div className="intro-flash" data-on={warping} aria-hidden="true" />

      {/* Interfaz de usuario principal */}
      <div className="relative z-20 flex h-full flex-col justify-between px-7 py-8 sm:px-12 sm:py-10 lg:px-20 lg:py-14">
        <header className="flex items-start justify-between gap-6">
          <div className="intro-monogram intro-fade" style={cssVars({ animationDelay: '120ms' })}>
            <i aria-hidden="true">TAMV</i>
            <span>Play and Go</span>
          </div>

          <div className="intro-fade flex items-center gap-2.5" style={cssVars({ animationDelay: '260ms' })}>
            <button
              type="button"
              data-first-control
              onClick={toggleAudio}
              aria-pressed={playing}
              className="intro-pill"
            >
              <span className="intro-eq" data-idle={!playing} aria-hidden="true">
                <i /><i /><i /><i />
              </span>
              <span className="hidden sm:inline">
                {playing ? 'Audio' : bedState === 'blocked' ? 'Activar audio' : 'Silencio'}
              </span>
            </button>
            <button type="button" onClick={() => finish(true)} className="intro-pill">
              Saltar
            </button>
          </div>
        </header>

        <div className="flex items-end justify-between gap-10">
          <div key={current.id} aria-live="polite" className="intro-copy">
            <p className="intro-kicker">{current.kicker}</p>
            <h1 className="intro-title mt-6">
              {current.title.map((line, index) => (
                <span
                  key={line}
                  className="intro-line"
                  style={cssVars({ '--line': index })}
                >
                  <span className="shimmer-text">{line}</span>
                </span>
              ))}
            </h1>
            <p
              className="intro-body intro-fade mt-7"
              style={cssVars({ animationDelay: `${current.title.length * 115 + 320}ms` })}
            >
              {current.body}
            </p>
          </div>

          <nav aria-label="Capítulos de la intro" className="intro-rail hidden md:block">
            {rail.map((item) => {
              const isCurrent = item.index === act
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => goTo(item.index)}
                  data-current={isCurrent}
                  aria-label={`Ir al capítulo ${item.index + 1}: ${item.name}`}
                  aria-current={isCurrent ? 'step' : undefined}
                >
                  <span className="rail-num">{String(item.index + 1).padStart(2, '0')}</span>
                  <span className="rail-name">{item.name}</span>
                </button>
              )
            })}
          </nav>
        </div>

        <footer className="intro-fade flex flex-col gap-5" style={cssVars({ animationDelay: '520ms' })}>
          <div className="intro-time" aria-hidden="true">
            <i key={progressKey} style={cssVars({ '--act-seconds': `${current.duration}s` })} />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-5">
            <p className="font-mono text-[9.5px] uppercase tracking-[0.3em] text-[rgba(176,203,214,0.6)]">
              {autoAdvance && !reduced ? 'Auto' : 'Manual'} · ← → navegar · esc salir
            </p>

            <button type="button" onClick={advance} className="intro-cta">
              <span>{act === CINEMATIC_ACTS.length - 1 ? 'Iniciar experiencia' : 'Siguiente secuencia'}</span>
              <svg width="18" height="10" viewBox="0 0 18 10" fill="none" aria-hidden="true">
                <path d="M0 5h16M12 1l4 4-4 4" stroke="currentColor" strokeWidth="1" strokeLinecap="square" />
              </svg>
            </button>
          </div>
        </footer>
      </div>
    </div>
  )
}
