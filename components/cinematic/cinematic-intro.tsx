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

const FOCUSABLE = 'button:not([disabled]), [href], input, [tabindex]:not([tabindex="-1"])'

/** Variables CSS por elemento, sin pelearse con el tipo de `style` de React. */
const cssVars = (vars: Record<string, string>): CSSProperties => vars as unknown as CSSProperties

export default function CinematicIntro({ onComplete, onSkip, autoAdvance = true }: Props) {
  const [capabilities, setCapabilities] = useState<{ webgl: boolean; reduced: boolean; tier: QualityTier } | null>(null)
  const [act, setAct] = useState(0)
  const [warping, setWarping] = useState(false)
  const [bedState, setBedState] = useState<BedState>('idle')
  const [progressKey, setProgressKey] = useState(0)

  const env = useRef<CinematicEnv>(createEnv())
  const shellRef = useRef<HTMLDivElement>(null)
  const restoreFocus = useRef<Element | null>(null)
  const bedRef = useRef<SoundBed | null>(null)

  /* --- capacidades: se miden después del montaje, nunca durante el render --- */
  useEffect(() => {
    setCapabilities({ webgl: hasWebGL(), reduced: prefersReducedMotion(), tier: detectTier() })
  }, [])

  /* --- diálogo modal: scroll bloqueado y foco al entrar -------------------- */
  useEffect(() => {
    restoreFocus.current = document.activeElement
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const timer = window.setTimeout(() => {
      shellRef.current?.querySelector<HTMLElement>('[data-first-control]')?.focus()
    }, 80)
    return () => {
      window.clearTimeout(timer)
      document.body.style.overflow = previous
    }
  }, [])

  /* --- audio: pista recortada a la duración de la presentación ----------- */
  useEffect(() => {
    const bed = new SoundBed(INTRO_TRACK, {
      // Eco pedido: 0.11 s exactos, réplica baja y oscurecida.
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

    // El navegador exige un gesto antes de dejar sonar nada: se intenta ya y
    // se reintenta en el primer toque/tecla, sin molestar con un modal.
    void bed.enable()
    const retry = () => {
      if (bed.playState !== 'playing') void bed.enable()
    }
    window.addEventListener('pointerdown', retry, { passive: true })
    window.addEventListener('keydown', retry)

    return () => {
      unsubscribe()
      window.removeEventListener('pointerdown', retry)
      window.removeEventListener('keydown', retry)
      bed.dispose()
      bedRef.current = null
    }
  }, [])

  useEffect(() => () => {
    bedRef.current?.dispose()
    bedRef.current = null
  }, [])

  const finish = useCallback((skipped: boolean) => {
    markIntroSeen()
    // Fundido de salida de 0.5 s: el eco de 0.11 s se apaga con la música.
    bedRef.current?.disable()
    const target = skipped ? onSkip : onComplete
    target?.()
    const element = restoreFocus.current as HTMLElement | null
    element?.focus?.({ preventScroll: true })
  }, [onComplete, onSkip])

  /* --- transición entre actos: warp en GPU, no opacity+setTimeout hack ----- */
  const goTo = useCallback((index: number) => {
    if (index === act || warping) return
    setWarping(true)
    env.current.warp = 1
    window.setTimeout(() => {
      setAct(index)
      setProgressKey((key) => key + 1)
      env.current.warp = 0.12
      window.setTimeout(() => setWarping(false), 260)
    }, 520)
  }, [act, warping])

  const advance = useCallback(() => {
    if (act < CINEMATIC_ACTS.length - 1) goTo(act + 1)
    else finish(false)
  }, [act, finish, goTo])

  /* --- línea de tiempo automática ------------------------------------------ */
  useEffect(() => {
    if (!autoAdvance || warping || !capabilities || capabilities.reduced) return
    const id = window.setTimeout(advance, actAt(act).duration * 1000)
    return () => window.clearTimeout(id)
  }, [act, advance, autoAdvance, capabilities, progressKey, warping])

  /* --- teclado + trampa de foco -------------------------------------------- */
  useEffect(() => {
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
        if (act > 0) goTo(act - 1)
      } else if (event.key === 'Tab') {
        const nodes = shellRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE)
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
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [act, advance, finish, goTo])

  /* --- nivel visual: la canción real manda; si no hay audio, respira solo --- */
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
        const density = actAt(act).density
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
  }, [act])

  /* --- el botón sólo hace falta si el navegador bloqueó el autoplay --------- */
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
      {/* Capa WebGL */}
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

      {/* Profundidad óptica: halos de pantalla, grano y marcas de encuadre */}
      <div className="intro-veil" aria-hidden="true" />
      <div className="intro-grain" aria-hidden="true" />
      <div className="intro-marks" aria-hidden="true">
        <span /><span /><span /><span />
      </div>
      <div className="intro-flash" data-on={warping} aria-hidden="true" />

      {/* Composición: cabecera / bloque editorial + riel / línea de tiempo */}
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
          {/* Tipografía en DOM: texto real, seleccionable, accesible e indexable */}
          <div key={current.id} aria-live="polite" className="intro-copy">
            <p className="intro-kicker">{current.kicker}</p>
            <h1 className="intro-title mt-6">
              {current.title.map((line, index) => (
                <span
                  key={line}
                  className="intro-line"
                  style={cssVars({ '--line': String(index) })}
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

          {/* Riel de capítulos: jerarquía tipográfica en lugar de puntitos */}
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
