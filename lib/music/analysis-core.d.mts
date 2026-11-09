/**
 * Declaraciones del núcleo DSP de navegador.
 *
 * `analysis-core.mjs` es JavaScript puro para poder ejecutarse en Node sin
 * transpilador y dentro del bundle del navegador. Estas declaraciones son el
 * contrato tipado que consumen `lib/music/analysis.ts` y `MusicEngine`.
 */

export interface SpectrumOptions {
  /** Frecuencia de muestreo del contexto de audio. Por defecto 48000. */
  sampleRate?: number
  /** Tamaño de FFT usado para calcular el ancho de bin. Por defecto `bins * 2`. */
  fftSize?: number
}

export interface ChromaOptions extends SpectrumOptions {
  /** Afinación de referencia. Por defecto 440 Hz. */
  a4?: number
  /** Límite inferior del análisis armónico. Por defecto 32.7 Hz (C1). */
  minHz?: number
  /** Límite superior del análisis armónico. Por defecto 10000 Hz. */
  maxHz?: number
  /** Ancho de la ventana gaussiana en semitonos. Por defecto 0.5. */
  sigmaSemitones?: number
}

export interface KeyCandidate {
  key: string
  confidence: number
}

export interface KeyEstimate {
  key: string | null
  tonic: string | null
  mode: 'major' | 'minor' | null
  /**
   * Heurística acotada que combina correlación de perfiles y afinidad de
   * tríada. No es una probabilidad calibrada.
   */
  confidence: number
  candidates: KeyCandidate[]
}

export interface SpectralBand {
  lowHz: number
  highHz: number
  peakDb: number | null
  valleyDb: number | null
  contrastDb: number | null
}

export interface SpectralContrast {
  bands: SpectralBand[]
  meanDb: number | null
}

export interface SpectrumAnalysis {
  /** 12 clases de altura normalizadas L2. */
  chroma: number[]
  key: KeyEstimate
  contrast: SpectralContrast
  /** Energía media lineal aproximada, 0..1. */
  level: number
  binHz: number
}

export function chromaFromSpectrum(spectrumDb: ArrayLike<number>, options?: ChromaOptions): number[]

export function estimateKey(chroma: ArrayLike<number>): KeyEstimate

export function spectralContrast(spectrumDb: ArrayLike<number>, options?: SpectrumOptions): SpectralContrast

export function analyseSpectrum(spectrumDb: ArrayLike<number>, options?: SpectrumOptions): SpectrumAnalysis

export const NOTE_NAMES_LIST: readonly string[]

export const SPECTRAL_BANDS_HZ: ReadonlyArray<readonly [number, number]>
