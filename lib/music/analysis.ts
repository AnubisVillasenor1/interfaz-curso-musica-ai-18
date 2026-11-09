/**
 * Puente tipado entre el analizador FFT de Tone.js y el núcleo DSP puro.
 *
 * El navegador entrega magnitudes en dB; este módulo las convierte en chroma,
 * tonalidad estimada, contraste espectral y nivel. El servicio Python y el
 * núcleo C++ implementan el mismo contrato, para que el panel de agentes no
 * tenga que saber dónde se calculó.
 */

import {
  analyseSpectrum,
  chromaFromSpectrum,
  estimateKey,
  spectralContrast,
  NOTE_NAMES_LIST,
  SPECTRAL_BANDS_HZ,
  type ChromaOptions,
  type KeyCandidate,
  type KeyEstimate,
  type SpectralBand,
  type SpectralContrast,
  type SpectrumAnalysis,
  type SpectrumOptions,
} from './analysis-core.mjs'

export {
  analyseSpectrum,
  chromaFromSpectrum,
  estimateKey,
  spectralContrast,
  NOTE_NAMES_LIST,
  SPECTRAL_BANDS_HZ,
}
export type {
  ChromaOptions,
  KeyCandidate,
  KeyEstimate,
  SpectralBand,
  SpectralContrast,
  SpectrumAnalysis,
  SpectrumOptions,
}

/** Bins que devuelve `Tone.Analyser('fft', 1024)`. */
export const TONE_FFT_BINS = 1024
/** Frecuencia de muestreo de reserva si el contexto aún no está disponible. */
export const FALLBACK_SAMPLE_RATE = 48_000

/**
 * Analiza un frame del analizador de Tone.js.
 *
 * Tone entrega 1024 bins para un FFT de 2048 muestras. El llamador puede
 * imponer otro tamaño si cambia `Analyser.size`; el ancho de bin siempre se
 * calcula desde `sampleRate / fftSize`, nunca se supone 44.1 kHz.
 */
export function analysisFromAnalyser(
  data: ArrayLike<number> | null | undefined,
  sampleRate = FALLBACK_SAMPLE_RATE,
  fftSize?: number,
): SpectrumAnalysis | null {
  const bins = data?.length ?? 0
  if (!bins) return null
  const safeRate = Number.isFinite(sampleRate) && sampleRate > 0 ? sampleRate : FALLBACK_SAMPLE_RATE
  const safeFft = Number.isFinite(fftSize) && (fftSize ?? 0) > 0 ? Number(fftSize) : bins * 2
  return analyseSpectrum(data as ArrayLike<number>, { sampleRate: safeRate, fftSize: safeFft })
}

/** Texto corto y explícito para la UI. Sin confianza inventada. */
export function describeKey(key: KeyEstimate): string {
  if (!key.key) return 'Sin tonalidad detectable'
  const percent = Math.round(key.confidence * 100)
  return `${key.key} · correlación ${percent}%`
}

/** Etiqueta de la banda con mayor contraste; útil para resumir el análisis. */
export function strongestBand(contrast: SpectralContrast): SpectralBand | null {
  const defined = contrast.bands.filter((band) => band.contrastDb !== null)
  if (!defined.length) return null
  return defined.reduce((best, band) => ((band.contrastDb ?? 0) > (best.contrastDb ?? 0) ? band : best))
}

/** Huella estable del análisis para comparar frames sin guardar todo el objeto. */
export function analysisFingerprint(analysis: SpectrumAnalysis): string {
  const chroma = analysis.chroma.map((value) => value.toFixed(2)).join(',')
  const band = strongestBand(analysis.contrast)
  return `${analysis.key.key ?? 'none'}|${analysis.level.toFixed(3)}|${band?.contrastDb ?? 'n/a'}|${chroma}`
}
