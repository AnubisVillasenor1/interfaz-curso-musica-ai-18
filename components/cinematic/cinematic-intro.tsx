'use client'

import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import {
  Bloom,
  ChromaticAberration,
  DepthOfField,
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
/*  Cámara cinematográfica: respiración, parallax y micro-sacadas             */
/* -------------------------------------------------------------------------- */

function CinematicCamera({
  env,
  reducedMotion,
}: {
  env: React.MutableRefObject<CinematicEnv>
  reducedMotion: boolean
}) {
  const { camera } = useThree()
  const target = useRef(new THREE.Vector3(0, 0.25, 0))

  useFrame((state, delta) => {
    const time = state.clock.elapsedTime
    const e = env.current

    const breathe = reducedMotion ? 0 : 1
    const bass = e.bass ?? 0
    const treble = e.treble ?? 0

    const driftX = Math.sin(time * 0.23) * 0.55 * breathe
    const driftY = Math.cos(time * 0.19) * 0.32 * breathe
    const push = 13.2 - bass * 0.9 - Math.sin(time * 0.17) * 0.35 * breathe

    camera.position.x += (driftX - camera.position.x) * Math.min(1, delta * 1.8)
    camera.position.y += (0.4 + driftY + treble * 0.18 - camera.position.y) * Math.min(1, delta * 1.8)
    camera.position.z += (push - camera.position.z) * Math.min(1, delta * 1.4)

    target.current.x = Math.sin(time * 0.11) * 0.22 * breathe
    target.current.y = 0.18 + Math.cos(time * 0.13) * 0.1 * breathe
    camera.lookAt(target.current)
  })

  return null
}

/* -------------------------------------------------------------------------- */
/*  Postprocesado adaptativo                                                   */
/* -------------------------------------------------------------------------- */

function CinematicPost({
  tier,
  reducedMotion,
  env,
  accent,
}: {
  tier: QualityTier
  reducedMotion: boolean
  env: React.MutableRefObject<CinematicEnv>
  accent: string
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

  if (tier === 'low' || reducedMotion) {
    return (
      <>
        <Vignette eskil={false} offset={0.24} darkness={0.72} />
        <Noise premultiply blendFunction={BlendFunction.SOFT_LIGHT} opacity={0.16} />
      </>
    )
  }

  return (
    <>
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
    </>
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
      delaySeconds: 0.09,
      mainGain: 0.82,
      echoGain: 0.34,
      tapMix: [0.42, 0.5, 0.22],
      tapDampHz: [5200, 3400, 2200],
      trim: 0.2,
      master: 1.35,
      fadeIn: 0.6,
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

  const washVars =
