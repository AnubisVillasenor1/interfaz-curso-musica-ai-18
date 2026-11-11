/**
 * Teoría musical determinista — sin dependencias externas.
 * Isomórfico: corre igual en el servidor (agentes, exportación) y en el navegador
 * (motor Tone.js, visualizadores). Todo lo que el motor y los agentes tocan pasa
 * por aquí, así el resultado siempre es musicalmente coherente.
 */

export type ModeName =
  | 'ionian' | 'dorian' | 'phrygian' | 'lydian' | 'mixolydian' | 'aeolian' | 'locrian'
  | 'harmonic-minor' | 'melodic-minor' | 'major-pentatonic' | 'minor-pentatonic'
  | 'blues' | 'dorian-bebop' | 'hijaz' | 'phrygian-dominant' | 'mixolydian-bebop'

export const MODES: Record<ModeName, number[]> = {
  ionian: [0, 2, 4, 5, 7, 9, 11],
  dorian: [0, 2, 3, 5, 7, 9, 10],
  phrygian: [0, 1, 3, 5, 7, 8, 10],
  lydian: [0, 2, 4, 6, 7, 9, 11],
  mixolydian: [0, 2, 4, 5, 7, 9, 10],
  aeolian: [0, 2, 3, 5, 7, 8, 10],
  locrian: [0, 1, 3, 5, 6, 8, 10],
  'harmonic-minor': [0, 2, 3, 5, 7, 8, 11],
  'melodic-minor': [0, 2, 3, 5, 7, 9, 11],
  'major-pentatonic': [0, 2, 4, 7, 9],
  'minor-pentatonic': [0, 3, 5, 7, 10],
  blues: [0, 3, 5, 6, 7, 10],
  'dorian-bebop': [0, 2, 3, 5, 7, 9, 10, 11],
  hijaz: [0, 1, 4, 5, 7, 8, 11],
  'phrygian-dominant': [0, 1, 4, 5, 7, 8, 10],
  'mixolydian-bebop': [0, 2, 4, 5, 6, 7, 9, 10],
}

/** Cada grado del modo: calidad de acorde + tensión de color disponible. */
export type ChordQuality = 'maj' | 'min' | 'dim' | 'aug' | 'sus2' | 'sus4' | 'maj7' | 'min7' | 'dom7' | 'm7b5' | 'minmaj7'


export interface ChordSpec {
  /** Grado romano en notación funcional, p. ej. "iv", "V7", "bVII" */
  numeral: string
  /** Índice de grado dentro del modo (0 = tónica) */
  degree: number
  /** Semitonos sobre la fundamental de la tonalidad */
  rootOffset: number
  /** MIDI de la fundamental absoluta */
  rootMidi: number
  /** Notas MIDI del acorde, voicing cerrado por defecto */
  notes: number[]
  /** Etiquetas legibles, p. ej. "Fm9" */
  label: string
  quality: ChordQuality | string
  /** Función armónica para el agente de crítica */
  function: 'tónica' | 'subdominante' | 'dominante' | 'predominante' | 'de prestamo'
  /** Cuánta tensión aporta (0 estable … 1 máxima) */
  tension: number
}

const FLAT_ROOTS = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B']
const SHARP_ROOTS = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']

export function pcName(pitchClass: number, preferSharp = false): string {
  const table = preferSharp ? SHARP_ROOTS : FLAT_ROOTS
  return table[((pitchClass % 12) + 12) % 12]
}

/** Frecuencia A4 = 440 Hz para afinaciones alternativas. */
export function midiToFreq(midi: number, a4 = 440): number {
  return a4 * Math.pow(2, (midi - 69) / 12)
}

export function isFlatKey(tonicPc: number, mode: ModeName): boolean {
  // Regla práctica de armadura: los modos oscuros y las tonalidades <= 4 usan bemol.
  if (mode === 'aeolian' || mode === 'dorian' || mode === 'harmonic-minor' || mode === 'minor-pentatonic' || mode === 'blues') {
    return ![0, 7, 2].includes(tonicPc)
  }
  return [3, 5, 8, 10, 1].includes(tonicPc)
}

export interface KeySpec {
  tonicPc: number
  tonic: string
  /** Letra de la tónica (A-G) para deletrear los grados por letra, no por tabla */
  tonicLetter: number
  mode: ModeName
  scale: number[]
  preferSharp: boolean
}

const LETTER_PC = [0, 2, 4, 5, 7, 9, 11]
const LETTER_NAMES = ['C', 'D', 'E', 'F', 'G', 'A', 'B']
/** Índice de letra_canónica (0=C,1=D,…6=B) para cada pitch class, preferring bemol. */
const PC_TO_LETTER = [0, 1, 1, 2, 2, 3, 4, 4, 5, 5, 6, 6]

/** Deletrea una nota a partir de la tónica y el grado diatónico: G en Re menor
 *  sale "G", no "F#" — cada grado del modo ocupa una letra distinta. */
export function spellFromTonic(tonicLetter: number, degreeIndex: number, absPc: number): string {
  const letterIdx = ((tonicLetter + degreeIndex) % 7 + 7) % 7
  const letter = LETTER_NAMES[letterIdx]
  const naturalPc = LETTER_PC[letterIdx]
  let deviation = (((absPc - naturalPc) % 12) + 12) % 12
  if (deviation > 6) deviation -= 12
  const accidental = deviation > 0 ? '#'.repeat(deviation) : deviation < 0 ? 'b'.repeat(-deviation) : ''
  return `${letter}${accidental}`
}

export function parseKey(input: string, fallback: KeySpec | null = null): KeySpec | null {
  const raw = input.trim()
  const match = raw.match(/^([A-G])([#b]?)\s*(.*)$/)
  if (!match) return fallback
  const letter = match[1]
  const accidental = match[2]
  const rest = match[3].toLowerCase()
  const basePc: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }
  const tonicPc = (basePc[letter] + (accidental === '#' ? 1 : accidental === 'b' ? 11 : 0)) % 12
  let mode: ModeName = 'ionian'
  if (/min(or)?\b/.test(rest) || rest.includes('aeolian')) mode = 'aeolian'
  if (rest.includes('dorian')) mode = 'dorian'
  if (rest.includes('phryg')) mode = rest.includes('dominant') ? 'phrygian-dominant' : 'phrygian'
  if (rest.includes('lyd')) mode = 'lydian'
  if (rest.includes('mix')) mode = rest.includes('bebop') ? 'mixolydian-bebop' : 'mixolydian'
  if (rest.includes('locrian')) mode = 'locrian'
  if (rest.includes('harmonic')) mode = 'harmonic-minor'
  if (rest.includes('melodic')) mode = 'melodic-minor'
  if (rest.includes('blues')) mode = 'blues'
  if (rest.includes('pentatonic')) mode = rest.includes('maj') ? 'major-pentatonic' : 'minor-pentatonic'
  if (rest.includes('hijaz') || rest.includes('hispan')) mode = 'hijaz'
  if (/^maj(or)?$/.test(rest.trim())) mode = 'ionian'
  const preferSharp = !isFlatKey(tonicPc, mode)
  return {
    tonicPc,
    tonic: pcName(tonicPc, preferSharp),
    tonicLetter: Math.max(0, LETTER_NAMES.indexOf(letter)),
    mode,
    scale: MODES[mode],
    preferSharp,
  }
}

export function keyFromSeed(tonicPc: number, mode: ModeName): KeySpec {
  const preferSharp = !isFlatKey(tonicPc, mode)
  return { tonicPc, tonic: pcName(tonicPc, preferSharp), tonicLetter: PC_TO_LETTER[tonicPc], mode, scale: MODES[mode], preferSharp }
}

/** Nota MIDI de un grado del modo (0 = tónica), con octavas opcionales. */
export function degreeMidi(key: KeySpec, degree: number, octave = 0, tonicMidi = 48): number {
  const len = key.scale.length
  const wrap = Math.floor(degree / len)
  const idx = ((degree % len) + len) % len
  return tonicMidi + 12 * (octave + wrap) + key.scale[idx]
}

const NUMERALS = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII']

/** Semitonos de los grados de la escala mayor; base del intercambio modal. */
const IONIAN_DEGREES = [0, 2, 4, 5, 7, 9, 11]

const QUALITY_SUFFIX: Record<string, string> = { min: 'm', dim: 'dim', aug: 'aug', m7b5: 'ø' }

export interface ChordRequest {
  /** Grado diatónico 0-6 (o 7 = octava de la tónica) */
  degree: number
  quality?: 'triad' | 'seventh' | 'ninth' | 'sus' | 'add9' | 'power'
  /** Inversión 0-2 */
  inversion?: number
  octave?: number
  /** Alteración cromática del grado, p. ej. -2 para bVII */
  chromatic?: number
}

/** Construye un acorde diatónico o cromáticamente prestado sobre el modo. */
export function buildChord(key: KeySpec, request: ChordRequest, tonicMidi = 48): ChordSpec {
  const len = key.scale.length
  const degree = ((request.degree % len) + len) % len
  const chromatic = request.chromatic ?? 0
  const octave = request.octave ?? 0
  const rootOffset = key.scale[degree] + chromatic
  const cleanRoot = tonicMidi + 12 * (octave + 2) + rootOffset
  const mode = request.quality ?? 'triad'

  // Apilamos terceras SOBRE LA ESCALA DEL PROPIO MODO: la calidad del acorde
  // (mayor/menor/disminuido) emerge de la escala, no de una tabla ionia.
  // Para acordes prestados (chromatic !== 0) apilamos sobre la escala mayor,
  // que es el origen habitual del intercambio modal (bVII, IV, #iv°, bVI…).
  const stackScale = chromatic !== 0 ? MODES.ionian : key.scale
  const stackLen = stackScale.length
  const baseSemitones = chromatic !== 0 ? IONIAN_DEGREES[degree % stackLen] : key.scale[degree]
  const intervalAt = (stackIndex: number): number => {
    const oct = Math.floor(stackIndex / stackLen)
    const i = ((stackIndex % stackLen) + stackLen) % stackLen
    return 12 * oct + stackScale[i] - baseSemitones
  }

  const third = intervalAt(degree + 2)
  const fifth = intervalAt(degree + 4)
  const seventh = intervalAt(degree + 6)
  const ninth = intervalAt(degree + 8)
  const fourth = intervalAt(degree + 3)

  const quality: ChordQuality =
    fifth === 6 && third === 3 ? 'dim'
      : fifth === 8 && third === 4 ? 'aug'
        : fifth === 7 ? (third >= 4 ? 'maj' : 'min')
          : (third >= 4 ? 'maj' : 'min')

  let intervals: number[]
  if (mode === 'power') intervals = [0, fifth, fifth + 12]
  else if (mode === 'sus') intervals = [0, fourth === 5 || fourth === 6 ? fourth : 5, fifth]
  else if (mode === 'add9') intervals = [0, third, fifth, ninth]
  else if (mode === 'seventh') intervals = [0, third, fifth, seventh]
  else if (mode === 'ninth') intervals = [0, third, fifth, seventh, ninth]
  else intervals = [0, third, fifth]

  const notes = intervals.map((interval) => cleanRoot + interval)

  const inversion = request.inversion ?? 0
  const voiced = invert(notes, inversion)

  // Etiqueta de extensión derivada del intervalo REAL de séptima, no del grado.
  const seventhTag = seventh === 11 ? 'maj7'
    : seventh === 10 ? (quality === 'dim' ? 'ø7' : '7')
      : seventh === 9 ? 'o7' : '7'
  let extension = ''
  if (mode === 'sus') extension = 'sus4'
  else if (mode === 'add9') extension = 'add9'
  else if (mode === 'power') extension = '5'
  else if (mode === 'seventh') extension = seventhTag
  else if (mode === 'ninth') extension = seventh === 11 ? 'maj9' : quality === 'dim' ? 'ø9' : '9'

  let numeral = NUMERALS[degree]
  if (chromatic < 0) numeral = `b${numeral}`
  if (chromatic > 0) numeral = `#${numeral}`
  if (quality === 'min' || quality === 'dim') numeral = numeral.toLowerCase()
  if (quality === 'dim' && mode !== 'seventh' && mode !== 'ninth') numeral += '°'
  numeral += extension

  const tensionTable: Record<number, number> = { 0: 0.05, 1: 0.42, 2: 0.24, 3: 0.2, 4: 0.72, 5: 0.34, 6: 0.5 }
  let tension = tensionTable[degree] ?? 0.3
  if (mode === 'seventh') tension += 0.1
  if (mode === 'ninth') tension += 0.14
  if (mode === 'sus') tension += 0.06
  if (quality === 'dim' || quality === 'aug') tension += 0.2
  if (chromatic !== 0) tension += 0.16

  const fn: ChordSpec['function'] = chromatic !== 0 ? 'de prestamo'
    : degree === 0 ? 'tónica'
      : degree === 4 || degree === 6 ? 'dominante'
        : degree === 1 || degree === 2 ? 'subdominante'
          : 'predominante'

  const suffix = quality === 'min' ? 'm' : (QUALITY_SUFFIX[quality] ?? '')
  const rootName = spellFromTonic(key.tonicLetter, degree, ((key.tonicPc + rootOffset) % 12 + 12) % 12)
  let label = rootName
  if (mode === 'seventh' || mode === 'ninth') {
    const num = mode === 'ninth' ? '9' : '7'
    if (quality === 'maj') label += seventh === 11 ? `maj${num}` : num
    else if (quality === 'min') label += seventh === 11 ? `m(maj${num})` : `m${num}`
    else if (quality === 'dim') label += seventh === 9 ? `o${num}` : `ø${num}`
    else label += seventh === 11 ? `aug${num}` : num
  } else {
    label += suffix + extension
  }

  return { numeral, degree, rootOffset, rootMidi: cleanRoot, notes: voiced, label, quality, function: fn, tension: Math.min(1, tension) }
}

function invert(notes: number[], inversion: number): number[] {
  if (!inversion || notes.length < 2) return notes
  const out = [...notes]
  for (let i = 0; i < inversion % out.length; i += 1) {
    const lowest = out.reduce((min, n, idx) => (n < out[min] ? idx : min), 0)
    const [moved] = out.splice(lowest, 1)
    out.push(moved + 12)
  }
  return out.sort((a, b) => a - b)
}

/* -------------------------------------------------------------------------- */
/* Progresiones                                                              */
/* -------------------------------------------------------------------------- */

export interface ProgressionTemplate {
  id: string
  name: string
  /** Grados diatónicos; objeto para prestamos cromáticos */
  degrees: Array<number | { degree: number; chromatic?: number; quality?: ChordRequest['quality'] }>
  character: string
  genres: string[]
  /** Curva de tensión esperada 0-1 por compás */
  arc: number[]
}

export const PROGRESSIONS: ProgressionTemplate[] = [
  { id: 'I-V-vi-IV', name: 'Anthem pop', degrees: [0, 4, 5, 3], character: 'eufórica, familiar, infinita', genres: ['pop', 'rock', 'country', 'dance'], arc: [0.15, 0.45, 0.7, 0.5] },
  { id: 'vi-IV-I-V', name: 'Sensitive pop', degrees: [5, 3, 0, 4], character: 'nostalgia que se abre a esperanza', genres: ['pop', 'lo-fi', 'soundtrack'], arc: [0.6, 0.35, 0.15, 0.5] },
  { id: 'ii-V-I', name: 'Jazz turnaround', degrees: [1, 4, 0], character: 'resolución elegante', genres: ['jazz', 'bossa', 'lo-fi'], arc: [0.4, 0.75, 0.1] },
  { id: 'i-VII-VI-V', name: 'Andaluz oscuro', degrees: [0, { degree: 6, chromatic: 0 }, 5, 4], character: 'drama flamenco, tensión flamenca', genres: ['latin', 'flamenco', 'trap', 'rock'], arc: [0.2, 0.5, 0.7, 0.85] },
  { id: 'i-VI-III-VII', name: 'Epic minor', degrees: [0, 5, 2, 6], character: 'heroico melancólico', genres: ['soundtrack', 'rock', 'edm', 'synthwave'], arc: [0.3, 0.5, 0.65, 0.8] },
  { id: 'I-bVII-IV-I', name: 'Mixolydian rock', degrees: [0, { degree: 6, chromatic: -1 }, 3, 0], character: 'groove de garaje', genres: ['rock', 'reggae', 'funk'], arc: [0.25, 0.6, 0.45, 0.2] },
  { id: 'iv-I-v-III', name: 'Neo-soul loop', degrees: [{ degree: 3, chromatic: 0 }, 0, 4, 2], character: 'soñador, jazzístico', genres: ['r&b', 'neo-soul', 'lo-fi'], arc: [0.45, 0.2, 0.5, 0.35] },
  { id: 'I-IV-♯iv-V', name: 'Cliché ascendente', degrees: [0, 3, { degree: 3, chromatic: 1 }, 4], character: 'melancolia de cine clásico', genres: ['soundtrack', 'classical', 'ambient'], arc: [0.15, 0.4, 0.75, 0.55] },
  { id: 'v-IV-III-II', name: 'Descent trap', degrees: [4, 3, 2, 1], character: 'oscuro, descendente, callejero', genres: ['trap', 'hip-hop', 'drill'], arc: [0.6, 0.55, 0.5, 0.75] },
  { id: 'i-iv-v-i', name: 'Dorian groove', degrees: [0, 3, 4, 0], character: 'modal hipnótico', genres: ['house', 'techno', 'funk'], arc: [0.3, 0.5, 0.6, 0.2] },
  { id: 'I-VI-II-V', name: '50s doo-wop', degrees: [0, 5, 1, 4], character: 'retro dulce', genres: ['doo-wop', 'pop', 'rockabilly'], arc: [0.15, 0.45, 0.4, 0.6] },
  { id: 'bd-IV-I-V', name: 'Blues de 12', degrees: [0, 3, 0, 4], character: 'swing de confesión', genres: ['blues', 'jazz', 'rock'], arc: [0.3, 0.55, 0.3, 0.7] },
]

/* -------------------------------------------------------------------------- */
/* Ritmo                                                                     */
/* -------------------------------------------------------------------------- */

export type DrumVoice = 'kick' | 'snare' | 'hat' | 'openhat' | 'clap' | 'ride' | 'tom' | 'rim' | 'perc'

/**Patrón de 16 pasos por compás (0 = silencio, 1 = acento suave, 2 = golpe, 3 = acento). */
export type StepPattern = number[]

export interface DrumPattern {
  id: string
  name: string
  swing: number
  voices: Partial<Record<DrumVoice, StepPattern>>
}

const P = (s: string): StepPattern => s.split('').map((c) => (c === '-' ? 0 : c === 'o' ? 1 : c === 'O' ? 2 : 3))

export const DRUM_PATTERNS: Record<string, DrumPattern> = {
  fourOnFloor: { id: 'fourOnFloor', name: 'Four to the floor', swing: 0, voices: { kick: P('O---O---O---O---'), hat: P('-o-o-o-o-o-o-o-o'), clap: P('----O-------O---'), openhat: P('--o-----o-----o-') } },
  trap: { id: 'trap', name: 'Trap halftime', swing: 0.06, voices: { kick: P('O---O-OO--O---'), snare: P('----O-------O---'), hat: P('OOoOOoOOOOoOOoO'.slice(0, 16)), perc: P('--------o-------') } },
  dembow: { id: 'dembow', name: 'Dembow', swing: 0, voices: { kick: P('O-----O-O-----O-'), snare: P('----O-----O-----'), hat: P('o-o-o-o-o-o-o-o-'), perc: P('--O-----O-------') } },
  boomBap: { id: 'boomBap', name: 'Boom bap', swing: 0.18, voices: { kick: P('O-----O---O---'), snare: P('----O-------O-'), hat: P('o-o-o-o-o-o-o-o-'), ride: P('o---o---o---o--o') } },
  rock: { id: 'rock', name: 'Rock straight', swing: 0, voices: { kick: P('O-------O-O---'), snare: P('----O-------O-'), hat: P('O-O-O-O-O-O-O-') } },
  funk: { id: 'funk', name: 'Funk ghost notes', swing: 0.12, voices: { kick: P('O--O--O---O---'), snare: P('--o-O---o-o-O-'), hat: P('o-o-o-o-o-o-o-o-'), rim: P('----o-------o-') } },
  house: { id: 'house', name: 'House groove', swing: 0, voices: { kick: P('O---O---O---O---'), clap: P('----O-------O---'), openhat: P('--o---o---o---o-'), hat: P('o-o-o-o-o-o-o-oo') } },
  techno: { id: 'techno', name: 'Techno driving', swing: 0, voices: { kick: P('O---O---O---O---'), rim: P('--o-o-o-o-o-o-o-'), hat: P('----o-------o-o-'), perc: P('o---------o---o-') } },
  lofi: { id: 'lofi', name: 'Lo-fi sleepy', swing: 0.22, voices: { kick: P('O-----O-------'), snare: P('----O-------O-'), hat: P('o-o-o-o-o-ooo-o-') } },
  bossa: { id: 'bossa', name: 'Bossa nova', swing: 0, voices: { rim: P('O--O--O-O--O--'), hat: P('o-o-o-o-o-o-o-o-'), kick: P('O-------O---O-') } },
  rnb: { id: 'rnb', name: 'R&B pocket', swing: 0.14, voices: { kick: P('O-----O---O--O'), snare: P('----O-------O-'), hat: P('oo-ooo-ooo-ooo-') } },
  ambient: { id: 'ambient', name: 'Ambient pulse', swing: 0, voices: { perc: P('O-----------O---'), hat: P('--------o-------') } },
  reggaetonOld: { id: 'reggaetonOld', name: 'Reggaetón clásico', swing: 0, voices: { kick: P('O---O---O---O---'), snare: P('--O-----O-------'), hat: P('o-o-o-o-o-o-o-o-') } },
  drill: { id: 'drill', name: 'Drill slide', swing: 0.1, voices: { kick: P('O---O-----O-OO'), snare: P('----O---o---O-'), hat: P('OOoOOOoOOOoOOo'.slice(0, 16)) } },
  afrobeat: { id: 'afrobeat', name: 'Afrobeat', swing: 0.08, voices: { kick: P('O--O--O-O--O--'), perc: P('--O-o-O--O-o-O'), hat: P('o-o-o-o-o-o-o-o-'), rim: P('----o-------o-') } },
  orchestral: { id: 'orchestral', name: 'Orchestral hits', swing: 0, voices: { tom: P('O-------O-------'), perc: P('--------O-----O-') } },
  sierreño: { id: 'sierreño', name: 'Sierreño acústico', swing: 0.04, voices: { kick: P('O---O-----O---O-'), rim: P('----O-------O---'), hat: P('o---o---o---o---'), perc: P('--o-----o---o---') } },
  sonidera: { id: 'sonidera', name: 'Cumbia sonidera', swing: 0.08, voices: { kick: P('O-----O---O-----'), snare: P('----O-------O---'), hat: P('o-o-o-o-o-o-o-o-'), perc: P('--O---O---O---O-') } },
  salsaClave: { id: 'salsaClave', name: 'Salsa con clave', swing: 0.02, voices: { kick: P('O-----O-----O---'), rim: P('O---O-----O--O--'), hat: P('o-o-o-o-o-o-o-o-'), perc: P('--o---O---o---O-') } },
  guaracha: { id: 'guaracha', name: 'Guaracha', swing: 0.03, voices: { kick: P('O---O---O--O----'), snare: P('----O-------O---'), hat: P('o-o-o-o-o-o-o-o-'), perc: P('--O-o---O---o-O-') } },
  industrialHipHop: { id: 'industrialHipHop', name: 'Hip hop industrial', swing: 0.08, voices: { kick: P('O-----O--O--O---'), snare: P('----O-------O---'), hat: P('O---o-o-O---o-o-'), perc: P('--O-----o-O-----') } },
}

/* -------------------------------------------------------------------------- */
/* Generador determinista                                                     */
/* -------------------------------------------------------------------------- */

/** PRNG con semilla: mismo prompt → misma canción, reproducible y ensenable. */
export function seeded(seedText: string): () => number {
  let h = 2166136261
  for (let i = 0; i < seedText.length; i += 1) {
    h ^= seedText.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  let state = h >>> 0 || 1
  return () => {
    // xorshift32
    state ^= state << 13
    state >>>= 0
    state ^= state >>> 17
    state ^= state << 5
    state >>>= 0
    return state / 4294967296
  }
}

export function pickFrom<T>(rng: () => number, list: readonly T[]): T {
  return list[Math.floor(rng() * list.length) % list.length]
}

/** Caminata melódica por la escala con peso de intervalos (los saltos grandes son raros). */
export function melodyContour(
  rng: () => number,
  key: KeySpec,
  bars: number,
  beatsPerBar: number,
  opts: { density?: number; register?: number; chordDegrees?: number[]; climaxBar?: number } = {},
): Array<{ midi: number; beat: number; duration: number; accent: boolean }> {
  const density = opts.density ?? 0.55
  const register = opts.register ?? 5
  const totalBeats = bars * beatsPerBar
  const scalePcs = key.scale
  const out: Array<{ midi: number; beat: number; duration: number; accent: boolean }> = []
  let step = 0 // índice de grado, puede ser negativo/positivo fuera de la octava
  const climax = opts.climaxBar ?? Math.floor(bars * 0.62)

  for (let beat = 0; beat < totalBeats;) {
    const bar = Math.floor(beat / beatsPerBar)
    const onBarHead = beat % beatsPerBar === 0
    const play = onBarHead || rng() < density
    const remainingInBar = beatsPerBar - (beat % beatsPerBar)
    const longOption = bar === climax || onBarHead
    const duration = Math.min(
      remainingInBar,
      longOption ? (rng() < 0.4 ? 2 : 1) : rng() < 0.25 ? 0.5 : 1,
    )

    if (play) {
      // Moverse por grados vecinos con sesgo ascendente hacia el clímax.
      const bias = bar < climax ? 0.62 : 0.38
      const moveOptions = [-2, -1, -1, 0, 1, 1, 2, 3]
      let move = pickFrom(rng, moveOptions)
      if (rng() > bias && move < 0) move = -move
      if (onBarHead) {
        // Los tiempos fuertes caen en notas del acorde → melodía que "entonan" con la armonía.
        const degrees = opts.chordDegrees
        const chordDegree = degrees && degrees.length ? degrees[bar % degrees.length] : 0
        const chordTones = [chordDegree, chordDegree + 2, chordDegree + 4]
        step = chordTones[Math.floor(rng() * chordTones.length)]
      } else {
        step += move
      }
      step = Math.max(-4, Math.min(9, step))
      const octaveShift = register - 3
      const midi = degreeMidi(key, step, octaveShift, 48)
      const accent = onBarHead || bar === climax
      out.push({ midi: clampNote(midi), beat: beat + (rng() < 0.12 ? 0.06 : 0), duration: duration * (rng() < 0.15 ? 0.66 : 1), accent })
    }
    beat += duration
  }
  return out
}

function clampNote(midi: number): number {
  return Math.max(45, Math.min(88, midi))
}

/** Bajo: sigue la fundamental del acorde con patrones por género. */
export function bassLine(
  rng: () => number,
  chords: ChordSpec[],
  beatsPerBar: number,
  style: 'root' | 'walk' | 'syncopated' | 'offbeat' | 'octave' = 'root',
): Array<{ midi: number; beat: number; duration: number }> {
  const out: Array<{ midi: number; beat: number; duration: number }> = []
  chords.forEach((chord, bar) => {
    const root = chord.rootMidi - 24
    const start = bar * beatsPerBar
    if (style === 'walk') {
      for (let b = 0; b < beatsPerBar; b += 1) {
        const nextRoot = chords[(bar + 1) % chords.length].rootMidi - 24
        out.push({ midi: Math.round(root + (nextRoot - root) * (b / beatsPerBar)) + (b === 0 ? 0 : pickFrom(rng, [0, 0, 7, 12])), beat: start + b, duration: 0.9 })
      }
    } else if (style === 'syncopated') {
      out.push({ midi: root, beat: start, duration: 0.75 })
      out.push({ midi: root, beat: start + beatsPerBar / 2, duration: 0.5 })
      if (rng() < 0.6) out.push({ midi: root + (rng() < 0.5 ? 7 : 12), beat: start + beatsPerBar * 0.75, duration: 0.4 })
    } else if (style === 'offbeat') {
      for (let b = 0.5; b < beatsPerBar; b += 1) out.push({ midi: root, beat: start + b, duration: 0.45 })
    } else if (style === 'octave') {
      out.push({ midi: root, beat: start, duration: beatsPerBar * 0.5 })
      out.push({ midi: root + 12, beat: start + beatsPerBar * 0.5, duration: beatsPerBar * 0.4 })
    } else {
      out.push({ midi: root, beat: start, duration: beatsPerBar * 0.9 })
    }
  })
  return out
}

export function normalize(text: string): string {
  return text.toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').trim()
}
