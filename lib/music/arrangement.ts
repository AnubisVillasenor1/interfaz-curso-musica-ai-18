/**
 * Compositor determinista: plan de agente + ADN de género → arreglo reproducible.
 * Produce una estructura completa (secciones, armonía, melodía, bajo, batería,
 * capas) que el motor Tone.js puede reproducir y el exportador MIDI puede volcar.
 * Mismo prompt + misma semilla ⇒ mismo arreglo (clave para enseñar y comparar).
 */

import {
  DRUM_PATTERNS,
  PROGRESSIONS,
  buildChord,
  bassLine,
  melodyContour,
  keyFromSeed,
  normalize,
  pickFrom,
  seeded,
  type ChordSpec,
  type DrumVoice,
  type KeySpec,
  type ModeName,
} from './theory'
import { GENRES, findGenre, type GenreProfile, type LayerSpec } from './genres'

export type SectionKind = 'intro' | 'verse' | 'prechorus' | 'chorus' | 'bridge' | 'break' | 'outro' | 'drop'

export interface Section {
  kind: SectionKind
  label: string
  startBar: number
  bars: number
  /** 0-1 destino de energía de la sección */
  energy: number
  /** capas activas en esta sección */
  activeRoles: LayerSpec['role'][]
  /** variación armónica respecto del loop base */
  progressionOffset: number
  /** descriptor para el prompt de modelos de audio */
  direction: string
}

export interface NoteEvent {
  midi: number
  /** beat absoluto desde el inicio de la canción */
  beat: number
  duration: number
  velocity: number
}

export interface DrumEvent {
  voice: DrumVoice
  beat: number
  velocity: number
}

export interface ArrangementTrack {
  id: string
  role: LayerSpec['role']
  voice: LayerSpec['voice']
  name: string
  notes: NoteEvent[]
  level: number
  pan: number
  cutoff: number
  reverb: number
  delay: number
  color: string
}

export interface Arrangement {
  title: string
  concept: string
  seed: number
  bpm: number
  beatsPerBar: number
  key: KeySpec
  genre: GenreProfile
  sections: Section[]
  chords: ChordSpec[]
  tracks: ArrangementTrack[]
  drums: DrumEvent[]
  totalBars: number
  totalBeats: number
  durationSeconds: number
  energyCurve: number[]
  /** instrucciones de mezcla heredadas del género, ajustadas por sección */
  mix: GenreProfile['mix']
  prompt: string
}

const ROLE_COLOR: Record<LayerSpec['role'], string> = {
  'harmonic-pad': '#8b7bf0',
  'harmonic-keyboard': '#5ad2e8',
  'harmonic-pluck': '#68e6b0',
  'harmonic-guitar': '#f2b45a',
  'bass-sub': '#ff6f91',
  'bass-mid': '#ff9d5c',
  lead: '#ffd166',
  'counter-melody': '#7dd3fc',
  texture: '#94a3b8',
  air: '#c4b5fd',
  'drums-main': '#f472b6',
  percussion: '#fb923c',
  vocal: '#a3e635',
  sfx: '#e879f9',
}

const SECTION_TEMPLATES: Array<{ kind: SectionKind; bars: number; energy: number; label: string; direction: string }> = [
  { kind: 'intro', bars: 4, energy: 0.2, label: 'Intro', direction: 'presentar el motivo, pocas capas, aire' },
  { kind: 'verse', bars: 8, energy: 0.42, label: 'Verso', direction: 'baja densidad, voz narrativa, espacio' },
  { kind: 'prechorus', bars: 4, energy: 0.62, label: 'Pre-coro', direction: 'tensión ascendente, ritmo de apoyo' },
  { kind: 'chorus', bars: 8, energy: 0.9, label: 'Coro', direction: 'máxima apertura, todas las capas, hook' },
  { kind: 'verse', bars: 8, energy: 0.46, label: 'Verso 2', direction: 'variar melodía, añadir contra melodía' },
  { kind: 'bridge', bars: 4, energy: 0.58, label: 'Puente', direction: 'cambio de color, retirar batería' },
  { kind: 'chorus', bars: 8, energy: 1, label: 'Coro final', direction: 'la versión más grande, coros y capas altas' },
  { kind: 'outro', bars: 4, energy: 0.28, label: 'Outro', direction: 'desmontar capas, dejar eco' },
]

function rolesForEnergy(energy: number, layers: LayerSpec[]): LayerSpec['role'][] {
  const roles: LayerSpec['role'][] = ['drums-main', 'bass-sub', 'bass-mid', 'harmonic-keyboard', 'harmonic-pad']
  const active: LayerSpec['role'][] = []
  for (const l of layers) {
    const threshold = energy > 0.8 ? 0.2 : energy > 0.55 ? 0.4 : energy > 0.32 ? 0.6 : 0.8
    if (l.level >= threshold || roles.includes(l.role)) active.push(l.role)
  }
  if (energy > 0.75) active.push('lead', 'air')
  if (energy > 0.5) active.push('counter-melody', 'percussion')
  return [...new Set(active)]
}

/** Elige progresión según palabras del prompt; si no hay señal, usa la semilla. */
export function chooseProgression(prompt: string, rng: () => number) {
  const t = normalize(prompt)
  if (/(sad|melanc|triste|llorar|duelo)/.test(t)) return PROGRESSIONS.find((p) => p.id === 'i-VI-III-VII') ?? PROGRESSIONS[0]
  if (/(epic|hero|cinema|trailer|batalla)/.test(t)) return PROGRESSIONS.find((p) => p.id === 'i-VI-III-VII') ?? PROGRESSIONS[4]
  if (/(jazz|swing|bar|sofistic)/.test(t)) return PROGRESSIONS.find((p) => p.id === 'ii-V-I') ?? PROGRESSIONS[2]
  if ((/dark|oscuro|nocturn|calle|drill|amenaz/.test(t))) return PROGRESSIONS.find((p) => p.id === 'v-IV-III-II') ?? PROGRESSIONS[8]
  if (/(happy|feliz|verano|solead|bright|eufor)/.test(t)) return PROGRESSIONS.find((p) => p.id === 'I-V-vi-IV') ?? PROGRESSIONS[0]
  if (/(nostalg|recuerd|vinilo|retro|vapor)/.test(t)) return PROGRESSIONS.find((p) => p.id === 'vi-IV-I-V') ?? PROGRESSIONS[1]
  if (/(sensual|romant|beso|intimo)/.test(t)) return PROGRESSIONS.find((p) => p.id === 'iv-I-v-III') ?? PROGRESSIONS[6]
  if (/(salsa|sonider|cumbia|guaracha|merengue|bachata)/.test(t)) return PROGRESSIONS.find((p) => p.id === 'i-iv-v-i') ?? PROGRESSIONS[9]
  if (/(baile|club|groove|fiesta|bailar)/.test(t)) return PROGRESSIONS.find((p) => p.id === 'i-iv-v-i') ?? PROGRESSIONS[9]
  return pickFrom(rng, PROGRESSIONS)
}

export function chooseMode(prompt: string, genre: GenreProfile, rng: () => number): ModeName {
  const t = normalize(prompt)
  if (/(menor|minor|oscur|sad|melanc)/.test(t)) return 'aeolian'
  if (/(mayor|major|bright|feliz|happy|luminos)/.test(t)) return 'ionian'
  if (/(modal|dorian|hipnot|loop)/.test(t)) return 'dorian'
  if (/(espan|flamenco|arab|mediterr|duende)/.test(t)) return 'hijaz'
  if (/(lyd|sonador|dreamy|fantas|magia)/.test(t)) return 'lydian'
  return pickFrom(rng, genre.modes)
}

export function detectBpm(prompt: string, genre: GenreProfile): number {
  const m = prompt.match(/(\d{2,3})\s*(?:bpm|beat)/i)
  if (m) {
    const v = Number(m[1])
    if (v >= 40 && v <= 200) return v
  }
  const t = normalize(prompt)
  if (/(lento|slow|balada|calm|dormir|medit)/.test(t)) return genre.bpm[0]
  if (/(rapido|fast|energia|drop|fiesta|club|correr)/.test(t)) return genre.bpm[1]
  return genre.defaultBpm
}

export function detectTonic(prompt: string, rng: () => number): number {
  const m = prompt.match(/\b([A-G])([#b]?)\b/)
  if (m) {
    const base: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }
    return (base[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? 11 : 0)) % 12
  }
  const t = normalize(prompt)
  // Registro emocional por tonalidad: semitonos altos = brillante, bajos = grave.
  if (/(brillante|alto|agudo|celestial)/.test(t)) return 7
  if (/(grave|hondo|profundo|oscuro)/.test(t)) return 2
  return Math.floor(rng() * 12)
}

/**
 * Construye el arreglo completo.
 * `structure` permite al agente de dirección imponer su propio mapa de secciones.
 */
export function compose(opts: {
  prompt: string
  title?: string
  genreId?: string
  bpm?: number
  seed?: number | string
  bars?: number
  sections?: Array<{ kind: SectionKind; bars: number }>
  concept?: string
}): Arrangement {
  const prompt = opts.prompt.trim() || 'una canción nueva'
  const seedValue = typeof opts.seed === 'number' ? opts.seed : hash32(opts.seed ?? prompt)
  const rng = seeded(`${prompt}:${seedValue}`)
  const genre = (opts.genreId && GENRES.find((g) => g.id === opts.genreId)) || findGenre(prompt) || pickFrom(rng, GENRES)
  const bpm = Math.round(opts.bpm ?? detectBpm(prompt, genre))
  const beatsPerBar = genre.beatsPerBar
  const mode = chooseMode(prompt, genre, rng)
  const key = keyFromSeed(detectTonic(prompt, rng), mode)
  const progression = chooseProgression(prompt, rng)

  type BlueprintItem = { kind: SectionKind; bars?: number; energy?: number }
  const blueprint: BlueprintItem[] = opts.sections?.map((s) => ({ kind: s.kind, bars: s.bars })) ?? SECTION_TEMPLATES
  const requestedBars = opts.bars
  const sections: Section[] = []
  let cursor = 0
  for (const item of blueprint) {
    const template = typeof item.kind === 'string' ? SECTION_TEMPLATES.find((t) => t.kind === item.kind) : undefined
    const bars = item.bars ?? template?.bars ?? 8
    const energy = item.energy ?? template?.energy ?? 0.5
    sections.push({
      kind: item.kind,
      label: template?.label ?? labelFor(item.kind),
      startBar: cursor,
      bars,
      energy,
      activeRoles: rolesForEnergy(energy, genre.layers),
      progressionOffset: cursor / 4,
      direction: template?.direction ?? 'mantener caracter',
    })
    cursor += bars
  }
  const totalBars = requestedBars && requestedBars > 0 ? requestedBars : cursor

  // Armonía base: 4 acordes por progresión, expandida a lo largo de la canción.
  const baseChords: ChordSpec[] = progression.degrees.map((d) =>
    buildChord(key, typeof d === 'number'
      ? { degree: d, quality: genre.id === 'jazz' || genre.id === 'neosoul' || genre.id === 'lofi' ? 'ninth' : 'seventh' }
      : { degree: d.degree, chromatic: d.chromatic, quality: d.quality ?? 'seventh' }, 48),
  )

  const chords: ChordSpec[] = []
  for (let bar = 0; bar < totalBars; bar += 1) {
    const section = sectionAt(sections, bar)
    const idx = (bar + (section ? Math.floor(section.progressionOffset) : 0)) % baseChords.length
    chords.push(baseChords[idx])
  }

  const tracks: ArrangementTrack[] = []

  // Capas armónicas (pads/teclados/plucks) — sostenido por acorde.
  for (const layer of genre.layers) {
    if (layer.role === 'drums-main' || layer.role === 'bass-sub' || layer.role === 'bass-mid') continue
    if (layer.role === 'lead' || layer.role === 'counter-melody') continue
    const notes: NoteEvent[] = []
    for (let bar = 0; bar < totalBars; bar += 1) {
      const section = sectionAt(sections, bar)
      if (!section || !section.activeRoles.includes(layer.role)) continue
      const chord = chords[bar]
      const gain = 0.55 + section.energy * 0.55
      const steps = Math.max(1, Math.round(beatsPerBar * layer.density))
      for (let s = 0; s < steps; s += 1) {
        const beat = bar * beatsPerBar + (s * beatsPerBar) / steps
        const voiceNote = chord.notes[s % chord.notes.length] + 12 * layer.octave
        const long = layer.role === 'harmonic-pad' || layer.role === 'texture'
        notes.push({
          midi: clamp(voiceNote, 36, 96),
          beat: long ? bar * beatsPerBar : beat,
          duration: long ? beatsPerBar * (section.kind === 'chorus' || section.kind === 'drop' ? 1 : 0.95) : (beatsPerBar / steps) * 0.9,
          velocity: Math.min(1, (0.42 + rng() * 0.3) * gain),
        })
        if (long) break
      }
    }
    if (!notes.length) continue
    tracks.push({
      id: `${layer.role}-${layer.voice}`,
      role: layer.role,
      voice: layer.voice,
      name: nameForLayer(layer),
      notes,
      level: layer.level,
      pan: layer.pan,
      cutoff: layer.cutoff,
      reverb: layer.reverb,
      delay: layer.delay,
      color: ROLE_COLOR[layer.role],
    })
  }

  // Bajo
  const bassLayer = genre.layers.find((l) => l.role === 'bass-sub' || l.role === 'bass-mid')
  if (bassLayer) {
    const bassStyle = bassStyleFor(genre.id)
    const raw = bassLine(rng, chords, beatsPerBar, bassStyle)
    const notes: NoteEvent[] = []
    for (const n of raw) {
      const bar = Math.floor(n.beat / beatsPerBar)
      const section = sectionAt(sections, bar)
      if (!section || !section.activeRoles.includes(bassLayer.role)) continue
      notes.push({ midi: clamp(n.midi, 24, 55), beat: n.beat, duration: n.duration, velocity: Math.min(1, 0.6 + section.energy * 0.4) })
    }
    if (notes.length) {
      tracks.push({
        id: `bass-${bassLayer.voice}`,
        role: bassLayer.role,
        voice: bassLayer.voice,
        name: bassLayer.role === 'bass-sub' ? 'Sub / 808' : 'Bajo',
        notes,
        level: bassLayer.level,
        pan: 0,
        cutoff: bassLayer.cutoff,
        reverb: 0,
        delay: 0,
        color: ROLE_COLOR[bassLayer.role],
      })
    }
  }

  // Melodía principal (lead / contra melodía) sobre la escala, anclada al acorde
  const leadLayer = genre.layers.find((l) => l.role === 'lead') ?? {
    role: 'lead' as const, voice: 'lead-soft' as const, level: 0.7, octave: 0, density: 0.5, cutoff: 4200, reverb: 0.3, delay: 0.15, pan: 0.1,
  }
  const counterLayer = genre.layers.find((l) => l.role === 'counter-melody')
  const leadSections = sections.filter((s) => s.activeRoles.includes('lead') && (s.kind === 'chorus' || s.kind === 'drop' || s.kind === 'bridge'))
  const leadNotes: NoteEvent[] = []
  for (const section of leadSections) {
    const chordDegrees = Array.from({ length: section.bars }, (_, i) => chords[(section.startBar + i) % chords.length].degree)
    const local = melodyContour(rng, key, section.bars, beatsPerBar, {
      density: 0.55 + section.energy * 0.3,
      register: 4,
      chordDegrees,
      climaxBar: Math.floor(section.bars * 0.5),
    })
    for (const n of local) {
      leadNotes.push({ midi: clamp(n.midi + 12 * leadLayer.octave, 55, 96), beat: section.startBar * beatsPerBar + n.beat, duration: n.duration * 0.9, velocity: Math.min(1, (n.accent ? 0.82 : 0.58) * (0.6 + section.energy * 0.45)) })
    }
  }
  if (leadNotes.length) {
    tracks.push({
      id: 'lead',
      role: 'lead',
      voice: leadLayer.voice,
      name: 'Melodía / Hook',
      notes: leadNotes.sort((a, b) => a.beat - b.beat),
      level: leadLayer.level,
      pan: leadLayer.pan,
      cutoff: leadLayer.cutoff,
      reverb: leadLayer.reverb,
      delay: leadLayer.delay,
      color: ROLE_COLOR.lead,
    })
  }

  if (counterLayer) {
    const notes: NoteEvent[] = []
    for (const section of sections) {
      if (!section.activeRoles.includes('counter-melody') || section.kind === 'chorus') continue
      const local = melodyContour(rng, key, section.bars, beatsPerBar, { density: 0.28, register: 3, chordDegrees: degreesForSection(chords, section) })
      for (const n of local) notes.push({ midi: clamp(n.midi + 12 * counterLayer.octave, 60, 100), beat: section.startBar * beatsPerBar + n.beat, duration: n.duration * 0.7, velocity: 0.38 + section.energy * 0.22 })
    }
    if (notes.length) {
      tracks.push({
        id: 'counter',
        role: 'counter-melody',
        voice: counterLayer.voice,
        name: 'Contra melodía',
        notes: notes.sort((a, b) => a.beat - b.beat),
        level: counterLayer.level * 0.8,
        pan: counterLayer.pan,
        cutoff: counterLayer.cutoff,
        reverb: counterLayer.reverb,
        delay: counterLayer.delay,
        color: ROLE_COLOR['counter-melody'],
      })
    }
  }

  // Batería
  const pattern = DRUM_PATTERNS[genre.drums]
  const drums: DrumEvent[] = []
  if (pattern) {
    for (let bar = 0; bar < totalBars; bar += 1) {
      const section = sectionAt(sections, bar)
      const start = bar * beatsPerBar
      const intensity = section?.energy ?? 0.5
      const fill = section && bar === section.startBar + section.bars - 1
      for (const [voiceName, steps] of Object.entries(pattern.voices) as Array<[DrumVoice, number[]]>) {
        for (let i = 0; i < 16; i += 1) {
          const hit = steps[i] ?? 0
          if (!hit) continue
          const gate = hit === 3 ? true : hit === 2 ? intensity > 0.3 : intensity > 0.55
          if (!gate) continue
          if ((section?.kind === 'intro' || section?.kind === 'outro') && (voiceName === 'snare' || voiceName === 'clap') && rng() < 0.7) continue
          const beat = start + (i / 16) * beatsPerBar
          drums.push({ voice: voiceName, beat, velocity: Math.min(1, (0.35 + hit * 0.18) * (0.6 + intensity * 0.5)) })
          if (fill && voiceName === 'snare' && i >= 12) {
            drums.push({ voice: 'snare', beat: beat + 0.25, velocity: 0.5 })
            drums.push({ voice: 'snare', beat: beat + 0.5, velocity: 0.4 })
          }
        }
      }
    }
  }

  const totalBeats = totalBars * beatsPerBar
  const energyCurve = Array.from({ length: totalBars }, (_, bar) => {
    const s = sectionAt(sections, bar)
    return s ? s.energy : 0.5
  })

  return {
    title: opts.title?.trim() || titleFrom(prompt),
    concept: opts.concept ?? '',
    seed: seedValue,
    bpm,
    beatsPerBar,
    key,
    genre,
    sections,
    chords,
    tracks,
    drums,
    totalBars,
    totalBeats,
    durationSeconds: (totalBeats / bpm) * 60,
    energyCurve,
    mix: genre.mix,
    prompt,
  }
}

/** Grados de los acordes que caen dentro de una sección. */
function degreesForSection(chords: ChordSpec[], section: Section): number[] {
  return Array.from({ length: section.bars }, (_, i) => chords[(section.startBar + i) % chords.length].degree)
}

function labelFor(kind: SectionKind): string {
  const map: Record<SectionKind, string> = {
    intro: 'Intro', verse: 'Verso', prechorus: 'Pre-coro', chorus: 'Coro',
    bridge: 'Puente', break: 'Quiebre', outro: 'Outro', drop: 'Drop',
  }
  return map[kind]
}

function nameForLayer(layer: LayerSpec): string {
  const map: Record<string, string> = {
    'harmonic-pad': 'Pads', 'harmonic-keyboard': 'Teclados', 'harmonic-pluck': 'Arpegios / Plucks',
    'harmonic-guitar': 'Guitarras', texture: 'Textura', air: 'Aire', sfx: 'FX', vocal: 'Coros',
  }
  return map[layer.role] ?? layer.role
}

function bassStyleFor(genreId: string): 'root' | 'walk' | 'syncopated' | 'offbeat' | 'octave' {
  if (['jazz', 'bossa', 'funk', 'neosoul'].includes(genreId)) return 'walk'
  if (['house', 'techno', 'edm', 'synthwave'].includes(genreId)) return 'offbeat'
  if (['trap', 'drill', 'reggaeton', 'afrobeat', 'cumbia-sonidera', 'salsaton', 'guaracha', 'industrial-hiphop'].includes(genreId)) return 'syncopated'
  if (['corrido', 'sierreño', 'norteño', 'mariachi', 'country', 'folk'].includes(genreId)) return 'octave'
  return 'root'
}

function sectionAt(sections: Section[], bar: number): Section | null {
  for (const s of sections) {
    if (bar >= s.startBar && bar < s.startBar + s.bars) return s
  }
  return sections[sections.length - 1] ?? null
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, Math.round(v)))
}

function hash32(text: string): number {
  let h = 2166136261
  for (let i = 0; i < text.length; i += 1) {
    h ^= text.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

const TITLES = ['Neón', 'Bruma', 'Cardinal', 'Órbita', 'Sal y hierro', 'Frecuencia', 'Umbral', 'Marea', 'Vértigo', 'Aurora', 'Ceniza', 'Deriva', 'Halo', 'Latido', 'Plomo', 'Sirena', 'Témpano', 'Zafiro']
const CONNECTORS = ['bajo', 'después de', 'antes del', 'contra', 'sin', 'con']

/** Título conceptual generado: evita "Canción sin título 3". */
export function titleFrom(prompt: string): string {
  const first = prompt.split(/[.!?\n,]/)[0]?.trim() ?? ''
  if (first && first.length >= 3 && first.length <= 42) {
    const words = first.split(/\s+/).slice(0, 4).join(' ')
    return words.charAt(0).toUpperCase() + words.slice(1)
  }
  const rng = seeded(prompt)
  return `${pickFrom(rng, TITLES)} ${pickFrom(rng, CONNECTORS)} ${pickFrom(rng, TITLES)}`
}

/** Vocabulario de prompt reutilizable para modelos de audio externos. */
export function promptForAudio(arr: Arrangement): string {
  const sectionNames = [...new Set(arr.sections.map((s) => s.kind))].join(', ')
  return [
    arr.genre.promptTokens[0],
    `${arr.bpm} BPM`,
    `${arr.key.tonic} ${arr.key.mode}`,
    ...arr.genre.promptTokens.slice(1, 3),
    `estructura ${sectionNames}`,
    arr.genre.moods[0],
  ].join(', ')
}
