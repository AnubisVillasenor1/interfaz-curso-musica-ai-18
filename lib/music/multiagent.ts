/**
 * Orquestador multiagente determinista del estudio.
 *
 * No hay modelo de lenguaje detrás de esta ruta: sería fácil devolver una
 * confianza inventada y llamarlo IA, pero sería falso. Aquí cuatro roles
 * (intención, composición, DSP y validación) transforman el prompt con reglas
 * del compositor local, y el resultado declara `source: 'rules'`.
 *
 * El mismo contrato puede consumirse desde el navegador y desde una ruta de
 * servidor; no importa Tone.js ni toca Web Audio.
 */

import {
  chooseMode,
  chooseProgression,
  detectBpm,
  detectTonic,
  titleFrom,
} from './arrangement'
import { GENRES, findGenre, type GenreProfile } from './genres'
import { buildChord, keyFromSeed, seeded, type ChordRequest } from './theory'

export type AgentStageId = 'intent' | 'composition' | 'dsp' | 'validation'

export interface AgentStep {
  stage: AgentStageId
  role: string
  status: 'ok' | 'warning'
  summary: string
  details: string[]
}

export interface ValidationCheck {
  id: string
  label: string
  passed: boolean
  detail: string
}

export interface MultiAgentPlan {
  agent: 'TAMV-MultiAgent-Orchestrator'
  version: '2.0'
  /** `rules` = compositor local determinista; nunca se finge un modelo remoto. */
  source: 'rules'
  prompt: string
  seed: number
  intent: {
    genreId: string
    genreName: string
    family: string
    mood: string
    tempo: number
    key: string
    mode: string
    saturation: number
    instruments: string[]
  }
  composition: {
    title: string
    chordProgression: string[]
    romanNumerals: string[]
    suggestedKey: string
    timeSignature: string
    structure: Array<{ label: string; bars: number }>
    summary: string
  }
  dsp: {
    sampleRate: number
    fftSize: number
    hopSize: number
    melBands: number
    chromaBins: number
    targetLufs: number
    ceilingDb: number
    window: 'hann'
    /** El plan se ejecuta en el navegador; el servicio nativo es opcional. */
    profile: 'browser-tonejs'
    analysisEndpoint: '/api/music/analyze'
  }
  validation: {
    passed: boolean
    checks: ValidationCheck[]
  }
  steps: AgentStep[]
  message: string
}

export interface MultiAgentInput {
  prompt: string
  genreId?: string
  bpm?: number
}

const MAX_PROMPT_CHARS = 1200
const MIN_BPM = 40
const MAX_BPM = 200

const STRUCTURES: Record<string, Array<{ label: string; bars: number }>> = {
  club: [
    { label: 'Intro', bars: 8 },
    { label: 'Build', bars: 8 },
    { label: 'Drop', bars: 16 },
    { label: 'Break', bars: 8 },
    { label: 'Drop final', bars: 16 },
    { label: 'Outro', bars: 8 },
  ],
  urban: [
    { label: 'Intro', bars: 4 },
    { label: 'Verso', bars: 8 },
    { label: 'Coro', bars: 8 },
    { label: 'Verso 2', bars: 8 },
    { label: 'Coro', bars: 8 },
    { label: 'Outro', bars: 4 },
  ],
  focus: [
    { label: 'Intro', bars: 8 },
    { label: 'Loop A', bars: 16 },
    { label: 'Variación', bars: 16 },
    { label: 'Loop A', bars: 8 },
    { label: 'Outro', bars: 8 },
  ],
  song: [
    { label: 'Intro', bars: 4 },
    { label: 'Verso', bars: 8 },
    { label: 'Pre-coro', bars: 4 },
    { label: 'Coro', bars: 8 },
    { label: 'Verso 2', bars: 8 },
    { label: 'Puente', bars: 4 },
    { label: 'Coro final', bars: 8 },
    { label: 'Outro', bars: 4 },
  ],
}

function structureFor(genre: GenreProfile): Array<{ label: string; bars: number }> {
  if (['techno', 'house', 'edm', 'synthwave'].includes(genre.id)) return STRUCTURES.club
  if (['trap', 'drill', 'reggaeton', 'afrobeat', 'hip-hop'].includes(genre.id)) return STRUCTURES.urban
  if (['ambient', 'lofi', 'downtempo'].includes(genre.id)) return STRUCTURES.focus
  return STRUCTURES.song
}

function hash32(text: string): number {
  let hash = 2166136261
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}

function chordRequest(
  degree: number | { degree: number; chromatic?: number },
  quality: ChordRequest['quality'],
): ChordRequest {
  return typeof degree === 'number'
    ? { degree, quality }
    : { degree: degree.degree, chromatic: degree.chromatic, quality }
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

/**
 * Convierte un prompt en un plan de cuatro etapas.
 *
 * Lanza `RangeError` solo con entradas que la ruta debe rechazar antes de
 * llamar: prompt vacío o demasiado largo y BPM fuera de rango.
 */
export function planMultiAgent(input: MultiAgentInput): MultiAgentPlan {
  const prompt = input.prompt.trim()
  if (!prompt) throw new RangeError('Escribe una idea musical.')
  if (prompt.length > MAX_PROMPT_CHARS) {
    throw new RangeError(`La idea no puede superar ${MAX_PROMPT_CHARS} caracteres.`)
  }
  if (input.bpm !== undefined && (!Number.isInteger(input.bpm) || input.bpm < MIN_BPM || input.bpm > MAX_BPM)) {
    throw new RangeError(`El BPM debe ser un entero entre ${MIN_BPM} y ${MAX_BPM}.`)
  }

  const genre = (input.genreId && GENRES.find((item) => item.id === input.genreId)) || findGenre(prompt) || GENRES[0]
  const seed = hash32(`${prompt}:${genre.id}`)
  const rng = seeded(`${prompt}:${seed}`)
  const bpm = Math.round(input.bpm ?? detectBpm(prompt, genre))
  const mode = chooseMode(prompt, genre, rng)
  const key = keyFromSeed(detectTonic(prompt, rng), mode)
  const progression = chooseProgression(prompt, rng)
  const chordQuality = ['jazz', 'neosoul', 'lofi'].includes(genre.id) ? 'ninth' : 'seventh'
  const chords = progression.degrees.slice(0, 4).map((degree) => buildChord(key, chordRequest(degree, chordQuality), 48))

  const structure = structureFor(genre)
  const targetLufs = clamp(genre.mix.loudness, -18, -5)
  const fftSize = 2048
  const dsp = {
    sampleRate: 48_000,
    fftSize,
    hopSize: fftSize / 4,
    melBands: 128,
    chromaBins: 12,
    targetLufs,
    ceilingDb: -1,
    window: 'hann' as const,
    profile: 'browser-tonejs' as const,
    analysisEndpoint: '/api/music/analyze' as const,
  }

  const checks: ValidationCheck[] = [
    {
      id: 'prompt',
      label: 'Prompt acotado',
      passed: prompt.length <= MAX_PROMPT_CHARS,
      detail: `${prompt.length}/${MAX_PROMPT_CHARS} caracteres`,
    },
    {
      id: 'genre',
      label: 'Género del catálogo local',
      passed: GENRES.some((item) => item.id === genre.id),
      detail: `${genre.name} (${genre.id})`,
    },
    {
      id: 'bpm',
      label: 'Tempo dentro del rango del motor',
      passed: bpm >= MIN_BPM && bpm <= MAX_BPM,
      detail: `${bpm} BPM`,
    },
    {
      id: 'harmony',
      label: 'Progresión con al menos tres acordes',
      passed: chords.length >= 3,
      detail: chords.map((chord) => chord.label).join(' → '),
    },
    {
      id: 'dsp',
      label: 'Parámetros DSP coherentes',
      passed: [256, 512, 1024, 2048, 4096, 8192, 16_384].includes(fftSize) && dsp.hopSize > 0,
      detail: `FFT ${fftSize}, hop ${dsp.hopSize}, ventana ${dsp.window}`,
    },
    {
      id: 'loudness',
      label: 'Objetivo de loudness en rango seguro',
      passed: targetLufs >= -18 && targetLufs <= -5,
      detail: `${targetLufs} LUFS · techo ${dsp.ceilingDb} dBFS`,
    },
  ]
  const passed = checks.every((check) => check.passed)

  const steps: AgentStep[] = [
    {
      stage: 'intent',
      role: 'Agente de intención',
      status: 'ok',
      summary: `${genre.name} · ${bpm} BPM · ${key.tonic} ${key.mode}`,
      details: [`Ánimo base: ${genre.moods[0]}`, `Semilla determinista: ${seed}`, `Instrumentos: ${genre.instruments.slice(0, 4).join(', ')}`],
    },
    {
      stage: 'composition',
      role: 'Agente compositor',
      status: 'ok',
      summary: `${progression.id} en ${key.tonic} ${key.mode}`,
      details: [
        `Acordes: ${chords.map((chord) => chord.label).join(' → ')}`,
        `${structure.length} secciones · ${structure.reduce((sum, section) => sum + section.bars, 0)} compases`,
        'Sin notas de audio generadas en esta etapa',
      ],
    },
    {
      stage: 'dsp',
      role: 'Agente técnico DSP',
      status: 'ok',
      summary: `FFT ${fftSize} · hop ${dsp.hopSize} · ${dsp.sampleRate} Hz`,
      details: ['Chroma de 12 clases y contraste de 7 bandas', `Objetivo ${targetLufs} LUFS, techo ${dsp.ceilingDb} dBFS`, 'El análisis de navegador usa el Analyser de Tone.js'],
    },
    {
      stage: 'validation',
      role: 'Agente validador',
      status: passed ? 'ok' : 'warning',
      summary: passed ? `${checks.length}/${checks.length} comprobaciones superadas` : 'Hay comprobaciones pendientes',
      details: checks.filter((check) => !check.passed).map((check) => check.detail),
    },
  ]

  return {
    agent: 'TAMV-MultiAgent-Orchestrator',
    version: '2.0',
    source: 'rules',
    prompt,
    seed,
    intent: {
      genreId: genre.id,
      genreName: genre.name,
      family: genre.family,
      mood: genre.moods[0] ?? 'neutro',
      tempo: bpm,
      key: `${key.tonic} ${key.mode}`,
      mode: key.mode,
      saturation: genre.mix.saturation,
      instruments: genre.instruments,
    },
    composition: {
      title: titleFrom(prompt),
      chordProgression: chords.map((chord) => chord.label),
      romanNumerals: chords.map((chord) => chord.numeral),
      suggestedKey: `${key.tonic} ${key.mode}`,
      timeSignature: `${genre.beatsPerBar}/4`,
      structure,
      summary: `${progression.name}: ${progression.character}`,
    },
    dsp,
    validation: { passed, checks },
    steps,
    message: passed
      ? 'Plan multiagente calculado con reglas locales. No se llamó a un modelo de IA ni se inventó una confianza calibrada.'
      : 'El plan se calculó, pero una comprobación no pasó. Revisa el prompt o el tempo antes de exportar.',
  }
}

export const MULTI_AGENT_LIMITS = {
  promptChars: MAX_PROMPT_CHARS,
  minBpm: MIN_BPM,
  maxBpm: MAX_BPM,
} as const
