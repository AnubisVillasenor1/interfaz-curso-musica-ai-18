/**
 * Análisis espectral determinista para el motor local.
 *
 * Este archivo es JavaScript puro a propósito: lo usa el navegador desde
 * `MusicEngine`, lo prueba Node en CI sin transpilador y no depende de Tone.js.
 * El núcleo nativo de C++ implementa el mismo contrato para el servicio de
 * servidor; si ambos discrepan, el contrato de `scripts/verify-audio-core.mjs`
 * lo detecta en los casos sintéticos.
 */

const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']

// Perfiles de Krumhansl-Schmuckler. No son una verdad musicológica: son una
// heurística que se contrasta con la escucha y con el MIDI editable.
const MAJOR_PROFILE = [6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88]
const MINOR_PROFILE = [6.33, 2.68, 3.52, 5.38, 2.6, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17]

const BANDS_HZ = [
  [0, 200],
  [200, 400],
  [400, 800],
  [800, 1600],
  [1600, 3200],
  [3200, 6400],
  [6400, 12000],
]

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value))
}

function dbToAmplitude(db, floorDb = -100) {
  if (!Number.isFinite(db) || db <= floorDb) return 0
  return Math.pow(10, Math.min(0, db) / 20)
}

function normalizeL2(vector) {
  let sum = 0
  for (let index = 0; index < vector.length; index += 1) sum += vector[index] * vector[index]
  const norm = Math.sqrt(sum)
  if (!Number.isFinite(norm) || norm <= 1e-12) return new Array(vector.length).fill(0)
  return vector.map((value) => value / norm)
}

function pearson(x, y) {
  const length = Math.min(x.length, y.length)
  if (!length) return 0
  let meanX = 0
  let meanY = 0
  for (let index = 0; index < length; index += 1) {
    meanX += x[index]
    meanY += y[index]
  }
  meanX /= length
  meanY /= length
  let numerator = 0
  let denomX = 0
  let denomY = 0
  for (let index = 0; index < length; index += 1) {
    const dx = x[index] - meanX
    const dy = y[index] - meanY
    numerator += dx * dy
    denomX += dx * dx
    denomY += dy * dy
  }
  const denominator = Math.sqrt(denomX * denomY)
  return denominator <= 1e-12 ? 0 : numerator / denominator
}

function rotate(profile, tonic) {
  const rotated = new Array(12)
  for (let index = 0; index < 12; index += 1) rotated[(index + tonic) % 12] = profile[index]
  return rotated
}

const MAJOR_SCALE_PCS = [0, 2, 4, 5, 7, 9, 11]
const MINOR_SCALE_PCS = [0, 2, 3, 5, 7, 8, 10]

/**
 * Afinidad con la tríada estable de una tonalidad.
 *
 * La correlación de Krumhansl sola confunde tríadas aisladas: Do mayor y Mi
 * menor comparten dos notas. Esta plantilla pesa tónica, tercera y quinta, y
 * deja el resto de la escala en un peso menor. No es una probabilidad; es una
 * regla transparente que el panel puede explicar.
 */
function keyAffinity(chroma, tonic, mode) {
  const scale = mode === 'major' ? MAJOR_SCALE_PCS : MINOR_SCALE_PCS
  const third = mode === 'major' ? 4 : 3
  const weights = new Map()
  for (const pc of scale) weights.set(pc, 0.25)
  weights.set(0, 1)
  weights.set(third, 0.8)
  weights.set(7, 0.7)

  let score = 0
  let total = 0
  for (let pc = 0; pc < 12; pc += 1) {
    const weight = weights.get((((pc - tonic) % 12) + 12) % 12) ?? 0
    score += chroma[pc] * weight
    total += weight
  }
  return total > 0 ? score / total : 0
}

/**
 * Convierte un espectro en dB a un vector cromático de 12 clases.
 *
 * @param {ArrayLike<number>} spectrumDb magnitudes en dB (0..-100 típico)
 * @param {{ sampleRate?: number, fftSize?: number, a4?: number, minHz?: number, maxHz?: number, sigmaSemitones?: number }} [options]
 * @returns {number[]} 12 valores normalizados L2
 */
export function chromaFromSpectrum(spectrumDb, options = {}) {
  const size = spectrumDb?.length ?? 0
  if (!size) return new Array(12).fill(0)

  const sampleRate = Number(options.sampleRate) > 0 ? Number(options.sampleRate) : 48000
  const fftSize = Number(options.fftSize) > 0 ? Number(options.fftSize) : size * 2
  const a4 = Number(options.a4) > 0 ? Number(options.a4) : 440
  const minHz = Number(options.minHz) > 0 ? Number(options.minHz) : 32.7
  const maxHz = Number(options.maxHz) > 0 ? Number(options.maxHz) : 10000
  const sigma = Number(options.sigmaSemitones) > 0 ? Number(options.sigmaSemitones) : 0.5

  const binHz = sampleRate / fftSize
  const chroma = new Array(12).fill(0)

  for (let bin = 1; bin < size; bin += 1) {
    const frequency = bin * binHz
    if (frequency < minHz || frequency > maxHz) continue
    const amplitude = dbToAmplitude(spectrumDb[bin])
    if (amplitude <= 0) continue

    // Cada bin aporta a la clase de altura más cercana, no a las doce. Con
    // bins de 23 Hz en C4 un reparto gaussiano amplio inventaba clases
    // vecinas y la tonalidad salía relativa (C mayor se leía como E menor).
    const midi = 69 + 12 * Math.log2(frequency / a4)
    const nearest = Math.round(midi)
    const distance = Math.abs(midi - nearest)
    if (distance > sigma * 3) continue
    const weight = Math.exp(-0.5 * (distance / sigma) * (distance / sigma))
    if (weight <= 1e-4) continue
    const pitchClass = ((nearest % 12) + 12) % 12
    chroma[pitchClass] += amplitude * weight
  }

  return normalizeL2(chroma)
}

/**
 * Estima tonalidad combinando la correlación de Krumhansl con una afinidad de
 * tríada (tónica, tercera y quinta). La confianza es una heurística acotada,
 * no una probabilidad calibrada.
 *
 * @param {ArrayLike<number>} chroma
 * @returns {{ key: string | null, tonic: string | null, mode: 'major' | 'minor' | null, confidence: number, candidates: Array<{ key: string, confidence: number }> }}
 */
export function estimateKey(chroma) {
  const values = Array.from(chroma ?? [], (value) => (Number.isFinite(value) ? Math.max(0, value) : 0))
  if (values.length !== 12) {
    return { key: null, tonic: null, mode: null, confidence: 0, candidates: [] }
  }
  const energy = values.reduce((sum, value) => sum + value, 0)
  if (energy <= 1e-9) {
    return { key: null, tonic: null, mode: null, confidence: 0, candidates: [] }
  }

  const candidates = []
  for (let tonic = 0; tonic < 12; tonic += 1) {
    for (const [mode, profile] of [
      ['major', MAJOR_PROFILE],
      ['minor', MINOR_PROFILE],
    ]) {
      const correlation = clamp(pearson(values, rotate(profile, tonic)), 0, 1)
      const affinity = clamp(keyAffinity(values, tonic, mode) * 2.5, 0, 1)
      candidates.push({
        key: `${NOTE_NAMES[tonic]} ${mode}`,
        tonic: NOTE_NAMES[tonic],
        mode,
        confidence: clamp(0.35 * correlation + 0.65 * affinity, 0, 1),
      })
    }
  }

  candidates.sort((a, b) => b.confidence - a.confidence)
  const best = candidates[0]
  return {
    key: best.key,
    tonic: best.tonic,
    mode: best.mode,
    confidence: Number(best.confidence.toFixed(4)),
    candidates: candidates.slice(0, 3).map((candidate) => ({
      key: candidate.key,
      confidence: Number(candidate.confidence.toFixed(4)),
    })),
  }
}

/**
 * Contraste espectral por bandas: diferencia media entre picos y valles.
 *
 * @param {ArrayLike<number>} spectrumDb
 * @param {{ sampleRate?: number, fftSize?: number }} [options]
 */
export function spectralContrast(spectrumDb, options = {}) {
  const size = spectrumDb?.length ?? 0
  const sampleRate = Number(options.sampleRate) > 0 ? Number(options.sampleRate) : 48000
  const fftSize = Number(options.fftSize) > 0 ? Number(options.fftSize) : size * 2
  const binHz = fftSize > 0 ? sampleRate / fftSize : 0

  const bands = BANDS_HZ.map(([lowHz, highHz]) => {
    const values = []
    for (let bin = 1; bin < size; bin += 1) {
      const frequency = bin * binHz
      if (frequency >= lowHz && frequency < highHz && Number.isFinite(spectrumDb[bin])) {
        values.push(spectrumDb[bin])
      }
    }
    if (values.length < 3) {
      return { lowHz, highHz, peakDb: null, valleyDb: null, contrastDb: null }
    }
    values.sort((a, b) => a - b)
    const edge = Math.max(1, Math.floor(values.length * 0.1))
    const valley = values.slice(0, edge).reduce((sum, value) => sum + value, 0) / edge
    const peak = values.slice(-edge).reduce((sum, value) => sum + value, 0) / edge
    return {
      lowHz,
      highHz,
      peakDb: Number(peak.toFixed(2)),
      valleyDb: Number(valley.toFixed(2)),
      contrastDb: Number((peak - valley).toFixed(2)),
    }
  })

  const defined = bands.filter((band) => band.contrastDb !== null)
  const meanDb = defined.length
    ? Number((defined.reduce((sum, band) => sum + band.contrastDb, 0) / defined.length).toFixed(2))
    : null

  return { bands, meanDb }
}

/**
 * Contrato completo que consume el estudio y el panel de agentes.
 *
 * @param {ArrayLike<number>} spectrumDb
 * @param {{ sampleRate?: number, fftSize?: number }} [options]
 */
export function analyseSpectrum(spectrumDb, options = {}) {
  const size = spectrumDb?.length ?? 0
  const sampleRate = Number(options.sampleRate) > 0 ? Number(options.sampleRate) : 48000
  const fftSize = Number(options.fftSize) > 0 ? Number(options.fftSize) : size * 2
  const chroma = chromaFromSpectrum(spectrumDb, { sampleRate, fftSize })
  const key = estimateKey(chroma)
  const contrast = spectralContrast(spectrumDb, { sampleRate, fftSize })

  let linearSum = 0
  let count = 0
  for (let bin = 1; bin < size; bin += 1) {
    linearSum += dbToAmplitude(spectrumDb[bin])
    count += 1
  }

  return {
    chroma: chroma.map((value) => Number(value.toFixed(6))),
    key,
    contrast,
    level: count ? Number(clamp(linearSum / count, 0, 1).toFixed(4)) : 0,
    binHz: Number((sampleRate / fftSize).toFixed(4)),
  }
}

export const NOTE_NAMES_LIST = NOTE_NAMES
export const SPECTRAL_BANDS_HZ = BANDS_HZ
