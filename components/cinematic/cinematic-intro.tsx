'use client'

import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import {
  Bloom,
  ChromaticAberration,
  DepthOfField,
  EffectComposer,
  Noise,
  Vignette,
} from '@react-three/postprocessing'
import { BlendFunction } from 'postprocessing'

import CinematicStage from './cinematic-stage'
import { actAt, CINEMATIC_ACTS, gradeFilter, withAlpha } from '@/lib/cinematic/scenes'
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

const FOCUSABLE =
  'button:not([disabled]), [href], input, [tabindex]:not([tabindex="-1"])'

const cssVars = (vars: Record<string, string>): CSSProperties =>
  vars as unknown as CSSProperties

/* -------------------------------------------------------------------------- */
/*  Postprocesado adaptativo                                                   */
/* -------------------------------------------------------------------------- */

function CinematicPost({
  tier,
  reducedMotion,
  env,
}: {
  tier: QualityTier
  reducedMotion: boolean
  env: React.RefObject<CinematicEnv>
}) {
  const aberration = useRef<{ offset: THREE.Vector2 } | null>(null)

  useFrame((state) => {
    const e = env.current
    const level = e.level ?? 0
    const pulse = reducedMotion ? 0 : level * 0.0016

    if (aberration.current) {
      aberration.current.offset.set(
        0.00075 + pulse + Math.sin(state.clock.elapsedTime * 1.7) * 0.00018,
        0.00045 + pulse * 0.65,
      )
    }
  })

  // El composer siempre envuelve a los efectos: fuera de él no se aplican.
  // En tier bajo o con movimiento reducido se queda sólo el cierre y el grano,
  // que son los dos que no cuestan fotogramas.
  if (tier === 'low' || reducedMotion) {
    return (
      <EffectComposer multisampling={0} frameBufferType={THREE.HalfFloatType}>
        <Vignette eskil={false} offset={0.24} darkness={0.72} />
        <Noise premultiply blendFunction={BlendFunction.SOFT_LIGHT} opacity={0.16} />
      </EffectComposer>
    )
  }

  return (
    <EffectComposer
      multisampling={tier === 'high' ? 4 : 0}
      frameBufferType={THREE.HalfFloatType}
    >
      <Bloom
        intensity={0.85}
        luminanceThreshold={0.22}
        luminanceSmoothing={0.28}
        mipmapBlur
        radius={0.72}
      />

      <DepthOfField
        focusDistance={0.012}
        focalLength={0.055}
        bokehScale={2.6}
        height={tier === 'high' ? 720 : 480}
      />

      <ChromaticAberration
        ref={aberration as never}
        blendFunction={BlendFunction.NORMAL}
        offset={new THREE.Vector2(0.0008, 0.0005)}
        radialModulation
        modulationOffset={0.42}
      />

      <Vignette eskil={false} offset={0.22} darkness={0.82} />

      <Noise premultiply blendFunction={BlendFunction.SOFT_LIGHT} opacity={0.2} />
    </EffectComposer>
  )
}

/* -------------------------------------------------------------------------- */
/*  Componente principal                                                       */
/* -------------------------------------------------------------------------- */

export default function CinematicIntro({
  onComplete,
  onSkip,
  autoAdvance = true,
}: Props) {
  const [capabilities, setCapabilities] = useState<{
    webgl: boolean
    reduced: boolean
    tier: QualityTier
  } | null>(null)

  const [act, setAct] = useState(0)
  const [warping, setWarping] = useState(false)
  const [bedState, setBedState] = useState<BedState>('idle')
  const [progressKey, setProgressKey] = useState(0)
  const [frozen, setFrozen] = useState(false)

  const env = useRef<CinematicEnv>(createEnv())
  const shellRef = useRef<HTMLDivElement>(null)
  const restoreFocus = useRef<Element | null>(null)
  const bedRef = useRef<SoundBed | null>(null)
  const transitionTimers = useRef<number[]>([])

  useEffect(() => {
    setCapabilities({
      webgl: hasWebGL(),
      reduced: prefersReducedMotion(),
      tier: detectTier(),
    })
  }, [])

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const raw = params.get('act')

    if (raw !== null) {
      const index = Number.parseInt(raw, 10)
      if (Number.isFinite(index)) {
        setAct(Math.max(0, Math.min(CINEMATIC_ACTS.length - 1, index)))
      }
    }

    if (params.get('freeze') === '1') setFrozen(true)
  }, [])

  useEffect(() => {
    restoreFocus.current = document.activeElement
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const timer = window.setTimeout(() => {
      shellRef.current
        ?.querySelector<HTMLElement>('[data-first-control]')
        ?.focus()
    }, 80)

    return () => {
      window.clearTimeout(timer)
      document.body.style.overflow = previous
    }
  }, [])

  useEffect(() => {
    const bed = new SoundBed(INTRO_TRACK, {
      // Eco pedido: 0.12 s base, pista a 2 y serie de ecos a 4, degradada en
      // tres tomas que se atenúan y se oscurecen una tras otra.
      delaySeconds: 0.12,
      mainGain: 2,
      echoGain: 4,
      tapMix: [0.5, 0.3, 0.2],
      tapDampHz: [5200, 3400, 2200],
      trim: 0.2,
      master: 1,
      fadeIn: 1.2,
      fadeOut: 0.5,
    })

    bedRef.current = bed
    bed.prime()

    const unsubscribe = bed.onState(setBedState)

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

  useEffect(
    () => () => {
      bedRef.current?.dispose()
      bedRef.current = null
    },
    [],
  )

  const finish = useCallback(
    (skipped: boolean) => {
      markIntroSeen()
      bedRef.current?.disable()

      const target = skipped ? onSkip : onComplete
      target?.()

      const element = restoreFocus.current as HTMLElement | null
      element?.focus?.({ preventScroll: true })
    },
    [onComplete, onSkip],
  )

  const goTo = useCallback(
    (index: number) => {
      if (index === act || warping) return

      transitionTimers.current.forEach((id) => window.clearTimeout(id))
      transitionTimers.current = []

      setWarping(true)
      env.current.warp = 1

      transitionTimers.current.push(
        window.setTimeout(() => {
          setAct(index)
          setProgressKey((key) => key + 1)
          env.current.warp = 0.09

          transitionTimers.current.push(
            window.setTimeout(() => setWarping(false), 320),
          )
        }, 520),
      )
    },
    [act, warping],
  )

  useEffect(
    () => () => {
      transitionTimers.current.forEach((id) => window.clearTimeout(id))
      transitionTimers.current = []
    },
    [],
  )

  const advance = useCallback(() => {
    if (act < CINEMATIC_ACTS.length - 1) goTo(act + 1)
    else finish(false)
  }, [act, finish, goTo])

  useEffect(() => {
    if (!autoAdvance || frozen || warping || !capabilities || capabilities.reduced) {
      return
    }

    const id = window.setTimeout(advance, actAt(act).duration * 1000)

    return () => window.clearTimeout(id)
  }, [act, advance, autoAdvance, capabilities, frozen, progressKey, warping])

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
      } else if (/^[1-9]$/.test(event.key)) {
        const index = Number.parseInt(event.key, 10) - 1
        if (index < CINEMATIC_ACTS.length) {
          event.preventDefault()
          goTo(index)
        }
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
        const time = performance.now() / 1000
        const density = actAt(act).density

        env.current.target =
          Math.max(
            0,
            (0.12 + 0.1 * Math.sin(time * 0.7) + 0.05 * Math.sin(time * 2.3)) *
              (0.5 + density),
          )

        env.current.bass = Math.max(0, 0.1 + 0.09 * Math.sin(time * 0.9))
        env.current.treble = Math.max(
          0,
          0.08 + 0.07 * Math.sin(time * 1.7 + 1.2),
        )
      }

      frame = requestAnimationFrame(tick)
    }

    frame = requestAnimationFrame(tick)

    return () => {
      cancelled = true
      cancelAnimationFrame(frame)
    }
  }, [act])

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
    () =>
      CINEMATIC_ACTS.map((item, index) => ({
        id: item.id,
        name: item.chip,
        index,
      })),
    [],
  )

  const grade = current.grade

  const stageVars = useMemo(
    () =>
      cssVars({
        '--grade-filter':
          tier === 'low'
            ? `saturate(${grade.saturation.toFixed(3)}) brightness(${grade.brightness.toFixed(3)})`
            : gradeFilter(grade),
      }),
    [grade, tier],
  )

  const washVars = useMemo(
    () =>
      cssVars({
        '--wash': String(grade.veil),
        '--wash-a': withAlpha(current.palette.key, 0.5),
        '--wash-b': withAlpha(current.palette.ember, 0.42),
      }),
    [grade.veil, current.palette.key, current.palette.ember],
  )

  return (
    <div
      ref={shellRef}
      role="dialog"
      aria-modal="true"
      aria-label="Intro cinemática de Play and Go"
      className="intro-shell"
    >
      {/* Capa WebGL: el grade del acto se funde en CSS, no en el corte */}
      <div className="intro-stage absolute inset-0" style={stageVars} aria-hidden="true">
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
            {/* La cámara vive solo en CameraRig (CinematicStage): el antiguo
                CinematicCamera escribía position/lookAt cada frame y CameraRig
                lo sobrescribía después en el mismo orden de montaje, con lo que
                la "respiración" nunca se veía y dos rigs peleaban. */}
            <CinematicStage
              actIndex={act}
              quality={tier}
              reducedMotion={reduced}
              env={env}
              onQualityDecline={() => setCapabilities((c) => (c ? { ...c, tier: nextTier(c.tier) } : c))}
            />
            <CinematicPost tier={tier} reducedMotion={reduced} env={env} />
          </Canvas>
        ) : (
          <div className="aurora-field absolute inset-0">
            <span className="aurora-blob" style={{ background: current.palette.key }} />
            <span className="aurora-blob" style={{ background: current.palette.ember, transform: 'translate3d(16%, 22%, 0)' }} />
          </div>
        )}
      </div>

      {/* Profundidad óptica: halos de pantalla, gele de color, barrido, grano y marcas */}
      <div className="intro-veil" aria-hidden="true" />
      <div className="intro-wash" style={washVars} aria-hidden="true" />
      <div className="intro-scanline" aria-hidden="true" />
      <div className="intro-grain" aria-hidden="true" />
      <div className="intro-marks" aria-hidden="true">
        <span /><span /><span /><span />
      </div>
      <div
        className="intro-flash"
        data-on={warping}
        aria-hidden="true"
        style={cssVars({ '--flash-color': withAlpha(current.palette.key, 0.34) })}
      />

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

          {/* Riel de capítulos: jerarquía tipográfica en lugar de puntitos.
              Seis entradas sólo caben holgadas a partir de lg. */}
          <nav aria-label="Capítulos de la intro" className="intro-rail hidden lg:block">
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
          <div className="flex items-center gap-6">
            <div className="intro-time flex-1" aria-hidden="true">
              <i
                key={progressKey}
                style={cssVars({
                  '--act-seconds': `${current.duration}s`,
                  '--time-a': withAlpha(current.palette.key, 0.32),
                  '--time-b': current.palette.key,
                  '--time-c': current.palette.ember,
                  '--time-glow': withAlpha(current.palette.key, 0.8),
                })}
              />
            </div>
            <p className="intro-count">
              <b style={cssVars({ '--count-color': current.palette.key })}>
                {String(act + 1).padStart(2, '0')}
              </b>
              <span aria-hidden="true">/ {String(CINEMATIC_ACTS.length).padStart(2, '0')}</span>
              <em>{current.chip}</em>
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-5">
            <p className="font-mono text-[9.5px] uppercase tracking-[0.3em] text-[rgba(176,203,214,0.6)]">
              {autoAdvance && !reduced && !frozen ? 'Auto' : 'Manual'} · ← → navegar · 1–{CINEMATIC_ACTS.length} capítulo · esc salir
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

export const ACT_COUNT = CINEMATIC_ACTS.length
