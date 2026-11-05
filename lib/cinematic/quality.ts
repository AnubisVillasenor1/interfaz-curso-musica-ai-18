/**
 * Detección de capacidades y presupuesto de render.
 *
 * El intro elige un tier antes de montar el canvas y lo degrada en caliente si
 * el FPS cae; nunca deja al usuario con una pantalla negra ni con 12 fps.
 */

export type QualityTier = 'low' | 'medium' | 'high'

/** Estado compartido por frame, fuera de React para no re-renderizar. */
export interface CinematicEnv {
  /** Nivel de audio objetivo (0-1) escrito por la cama sonora o por el simulador. */
  target: number
  /** Nivel amortiguado que consumen los shaders. */
  level: number
  /** Graves (0-1): golpean el núcleo y los anillos. */
  bass: number
  /** Agudos (0-1): hacen chispear el campo de partículas. */
  treble: number
  /** 0-1 fuerza del vórtice durante la transición entre actos. */
  warp: number
}

export function createEnv(): CinematicEnv {
  return { target: 0, level: 0, bass: 0, treble: 0, warp: 0 }
}

/** ¿Hay WebGL utilizable? three r187 exige WebGL2 en la práctica. */
export function hasWebGL(): boolean {
  if (typeof window === 'undefined') return false
  try {
    const canvas = document.createElement('canvas')
    const gl2 = canvas.getContext('webgl2')
    if (gl2) {
      const lose = gl2.getExtension('WEBGL_lose_context')
      lose?.loseContext()
      return true
    }
    const gl1 = canvas.getContext('webgl') || canvas.getContext('experimental-webgl')
    if (gl1) {
      const lose = (gl1 as WebGLRenderingContext).getExtension('WEBGL_lose_context')
      lose?.loseContext()
      return true
    }
    return false
  } catch {
    return false
  }
}

export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) return false
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

interface Probe {
  dpr: number
  cores: number
  viewportWidth: number
  deviceMemory: number
  touch: boolean
}

function probe(): Probe {
  const nav = navigator as Navigator & { deviceMemory?: number; maxTouchPoints?: number }
  return {
    dpr: Math.min(window.devicePixelRatio || 1, 3),
    cores: nav.hardwareConcurrency ?? 4,
    viewportWidth: window.innerWidth,
    deviceMemory: nav.deviceMemory ?? 4,
    touch: (nav.maxTouchPoints ?? 0) > 0 || 'ontouchstart' in window,
  }
}

/** Presupuesto inicial de calidad; el gobernador de FPS lo ajustará después. */
export function detectTier(): QualityTier {
  if (typeof window === 'undefined') return 'medium'
  const p = probe()
  const small = p.viewportWidth < 820
  const weak = p.cores <= 4 || p.deviceMemory <= 4

  if (small && weak) return 'low'
  if (small || weak) return 'medium'
  if (p.cores >= 8 && p.dpr >= 1.75) return 'high'
  return 'medium'
}

/** DPR que se le entrega al Canvas para cada tier. */
export function dprFor(tier: QualityTier): [number, number] {
  if (tier === 'high') return [1, 2]
  if (tier === 'medium') return [1, 1.6]
  return [0.75, 1.1]
}

export function nextTier(tier: QualityTier): QualityTier {
  if (tier === 'high') return 'medium'
  if (tier === 'medium') return 'low'
  return 'low'
}
