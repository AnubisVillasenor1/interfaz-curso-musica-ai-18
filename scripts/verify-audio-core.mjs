/**
 * Verificación del contrato TAMV-AudioCore v2.0.
 *
 * Node ejecuta el DSP de navegador sin transpilador; el resto son comprobaciones
 * de fuente para que una ruta, una migración o un panel no desaparezcan sin que
 * CI lo note. Las pruebas numéricas del servicio Python viven en
 * `services/audiocore/tests/`, y el núcleo C++ se compila en su propio job.
 */

import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

import {
  analyseSpectrum,
  chromaFromSpectrum,
  estimateKey,
  spectralContrast,
  NOTE_NAMES_LIST,
  SPECTRAL_BANDS_HZ,
} from '../lib/music/analysis-core.mjs'

const SAMPLE_RATE = 48_000
const FFT_SIZE = 2048
const BINS = FFT_SIZE / 2

/** Espectro sintético: picos gaussianos en las frecuencias pedidas. */
function spectrumAt(frequencies, { sampleRate = SAMPLE_RATE, fftSize = FFT_SIZE } = {}) {
  const bins = fftSize / 2
  const out = new Float32Array(bins).fill(-100)
  const binHz = sampleRate / fftSize
  for (const frequency of frequencies) {
    const center = frequency / binHz
    for (let bin = 1; bin < bins; bin += 1) {
      const db = -100 + 100 * Math.exp(-0.5 * ((bin - center) / 1.2) ** 2)
      if (db > out[bin]) out[bin] = db
    }
  }
  return out
}

function argmax(values) {
  return values.indexOf(Math.max(...values))
}

const failures = []
function check(label, run) {
  try {
    run()
    console.log(`PASS ${label}`)
  } catch (error) {
    failures.push(label)
    console.error(`FAIL ${label}: ${error instanceof Error ? error.message : String(error)}`)
  }
}

check('note names and spectral bands expose the shared contract', () => {
  assert.deepEqual(NOTE_NAMES_LIST, ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'])
  assert.equal(SPECTRAL_BANDS_HZ.length, 7)
  assert.equal(SPECTRAL_BANDS_HZ[0][0], 0)
  assert.equal(SPECTRAL_BANDS_HZ.at(-1)[1], 12_000)
})

check('A4 energy lands on pitch class A (9)', () => {
  const analysis = analyseSpectrum(spectrumAt([440]))
  assert.equal(argmax(analysis.chroma), 9)
  assert.equal(analysis.key.tonic, 'A')
  assert.ok(analysis.key.confidence > 0.5, `confidence was ${analysis.key.confidence}`)
})

check('C major triad is detected as C major', () => {
  const analysis = analyseSpectrum(spectrumAt([261.63, 329.63, 392.0]))
  assert.deepEqual(
    analysis.chroma.map((value, index) => (value > 0.2 ? index : null)).filter((value) => value !== null).sort((a, b) => a - b),
    [0, 4, 7],
  )
  assert.equal(analysis.key.key, 'C major')
  assert.ok(analysis.key.candidates.length === 3)
})

check('G major triad is detected as G major', () => {
  const analysis = analyseSpectrum(spectrumAt([392.0, 493.88, 587.33]))
  assert.equal(analysis.key.key, 'G major')
})

check('A minor triad is detected as A minor', () => {
  const analysis = analyseSpectrum(spectrumAt([440.0, 523.25, 659.25]))
  assert.equal(analysis.key.key, 'A minor')
})

check('silence returns no invented key', () => {
  const analysis = analyseSpectrum(new Float32Array(BINS).fill(-100))
  assert.equal(analysis.key.key, null)
  assert.equal(analysis.key.confidence, 0)
  assert.deepEqual(analysis.chroma, new Array(12).fill(0))
  assert.equal(analysis.level, 0)
})

check('chroma is L2-normalized and handles empty input', () => {
  const chroma = chromaFromSpectrum(spectrumAt([261.63, 329.63, 392.0]))
  const norm = Math.sqrt(chroma.reduce((sum, value) => sum + value * value, 0))
  assert.ok(Math.abs(norm - 1) < 1e-6, `norm was ${norm}`)
  assert.deepEqual(chromaFromSpectrum([]), new Array(12).fill(0))
})

check('spectral contrast stays finite and positive for tonal content', () => {
  const contrast = spectralContrast(spectrumAt([261.63, 329.63, 392.0]))
  assert.equal(contrast.bands.length, 7)
  assert.ok(contrast.meanDb !== null && contrast.meanDb > 0)
  for (const band of contrast.bands) {
    if (band.contrastDb === null) continue
    assert.ok(Number.isFinite(band.contrastDb))
    assert.ok(band.peakDb >= band.valleyDb)
  }
})

check('analysis level is bounded and deterministic', () => {
  const first = analyseSpectrum(spectrumAt([440, 880, 1320]))
  const second = analyseSpectrum(spectrumAt([440, 880, 1320]))
  assert.deepEqual(first, second)
  assert.ok(first.level >= 0 && first.level <= 1)
  assert.ok(Number.isFinite(first.binHz) && first.binHz > 0)
  assert.equal(first.binHz, SAMPLE_RATE / FFT_SIZE)
})

check('a different sample rate changes the bin width, not the promise of 12 chroma classes', () => {
  const spectrum = spectrumAt([440], { sampleRate: 44_100 })
  const analysis = analyseSpectrum(spectrum, { sampleRate: 44_100, fftSize: FFT_SIZE })
  assert.equal(analysis.chroma.length, 12)
  assert.equal(argmax(analysis.chroma), 9)
  assert.ok(Math.abs(analysis.binHz - 44_100 / FFT_SIZE) < 1e-3)
})

const [engine, route, analyzeRoute, multiagent, panel, studio, migration, dts, analysisTs] = await Promise.all([
  readFile(new URL('../lib/music/engine.ts', import.meta.url), 'utf8'),
  readFile(new URL('../app/api/music/agents/route.ts', import.meta.url), 'utf8'),
  readFile(new URL('../app/api/music/analyze/route.ts', import.meta.url), 'utf8'),
  readFile(new URL('../lib/music/multiagent.ts', import.meta.url), 'utf8'),
  readFile(new URL('../components/agent-control-panel.tsx', import.meta.url), 'utf8'),
  readFile(new URL('../components/music-studio.tsx', import.meta.url), 'utf8'),
  readFile(new URL('../supabase/migrations/20261108200000_audio_core.sql', import.meta.url), 'utf8'),
  readFile(new URL('../lib/music/analysis-core.d.mts', import.meta.url), 'utf8'),
  readFile(new URL('../lib/music/analysis.ts', import.meta.url), 'utf8'),
])

check('engine exposes hybrid analysis without a second audio graph', () => {
  assert.match(engine, /hybridAnalysis\(\): SpectrumAnalysis \| null/)
  assert.match(engine, /analysisFromAnalyser\(data, sampleRate, data\.length \* 2\)/)
  assert.match(engine, /this\.Tone\?\.getContext\(\)\.sampleRate/)
})

check('analysis wrapper keeps a typed contract and honest labels', () => {
  assert.match(dts, /export interface SpectrumAnalysis/)
  assert.match(dts, /export function analyseSpectrum/)
  assert.match(analysisTs, /describeKey/)
  assert.match(analysisTs, /correlación/)
})

check('multi-agent route is separate from the course assistant and rate-limited', () => {
  assert.match(route, /rateLimitPublic\(`agents:/)
  assert.match(route, /planMultiAgent/)
  assert.match(route, /status: 400/)
  assert.doesNotMatch(route, /app\/api\/agent/)
  assert.doesNotMatch(route, /confidence\s*:\s*0\.\d+/)
})

check('native analysis proxy fails closed without a configured service', () => {
  assert.match(analyzeRoute, /TAMV_AUDIO_CORE_URL/)
  assert.match(analyzeRoute, /audio_core_not_configured/)
  assert.match(analyzeRoute, /fail\(\s*503|status:\s*503/)
  assert.match(analyzeRoute, /AbortSignal\.timeout/)
  assert.doesNotMatch(analyzeRoute, /child_process|exec\(|spawn\(/)
})

check('multi-agent rules are deterministic and declare their source', () => {
  assert.match(multiagent, /source: 'rules'/)
  assert.match(multiagent, /export function planMultiAgent/)
  assert.match(multiagent, /chooseProgression/)
  assert.match(multiagent, /validation/)
  assert.match(multiagent, /fftSize/)
  assert.doesNotMatch(multiagent, /confidence\s*:\s*0\.\d+/)
})

check('agent panel uses the project design system and is mounted in the studio', () => {
  assert.match(panel, /pg-card/)
  assert.match(panel, /pg-btn/)
  assert.match(panel, /\/api\/music\/agents/)
  assert.doesNotMatch(panel, /bg-neutral-9/)
  assert.match(studio, /AgentControlPanel/)
})

check('audio core migration extends songs and protects analysis jobs', () => {
  assert.match(migration, /alter table public\.songs/)
  assert.match(migration, /musical_key/)
  assert.match(migration, /create table if not exists public\.audio_analysis_jobs/)
  assert.match(migration, /enable row level security/)
  assert.match(migration, /revoke all privileges on table public\.audio_analysis_jobs/)
  assert.match(migration, /grant select on table public\.audio_analysis_jobs to authenticated/)
  assert.match(migration, /grant all privileges on table public\.audio_analysis_jobs to service_role/)
  assert.doesNotMatch(migration, /create table[^;]*public\.generated_tracks/i)
})

check('unknown key names are not fabricated', () => {
  const result = estimateKey([0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0])
  assert.equal(result.key, null)
})

if (failures.length) {
  console.error(`Audio core checks failed: ${failures.length}`)
  process.exitCode = 1
} else {
  console.log('Audio core contracts passed')
}
