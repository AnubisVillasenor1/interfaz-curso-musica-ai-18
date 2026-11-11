/**
 * Biblioteca de "ADN de género" — 28 perfiles musicales reutilizables.
 * Cada perfil define las decisiones que un productor tomaría: tempo, modo,
 * patrón rítmico, capas instrumentales, sintes, mezcla, referencias de mood
 * y vocabulario de prompt. Es la base de conocimiento de los agentes.
 */

import type { DrumPattern, StepPattern } from './theory'
import type { ModeName } from './theory'
import { DRUM_PATTERNS, normalize } from './theory'

export type LayerRole =
  | 'harmonic-pad' | 'harmonic-keyboard' | 'harmonic-pluck' | 'harmonic-guitar'
  | 'bass-sub' | 'bass-mid'
  | 'lead' | 'counter-melody' | 'texture' | 'air'
  | 'drums-main' | 'percussion' | 'vocal' | 'sfx'

export type VoiceKind =
  | 'felt-piano' | 'epiano' | 'organ' | 'pad' | 'pluck' | 'bass-sub' | 'bass-mid'
  | 'lead-sync' | 'lead-soft' | 'strings' | 'brass' | 'choir' | 'pluck-world'
  | 'guitar-clean' | 'noise' | 'bell' | 'wind'

export interface LayerSpec {
  role: LayerRole
  voice: VoiceKind
  /** 0-1 importancia en la mezcla */
  level: number
  /** Octava relativa respecto del registro base */
  octave: number
  /** Densidad rítmica 0-1 */
  density: number
  cutoff: number
  reverb: number
  delay: number
  /** Paneo -1..1 */
  pan: number
}

export interface MixTarget {
  /** dBFS objetivo del máster */
  loudness: number
  eqLow: number
  eqMid: number
  eqHigh: number
  compression: 'light' | 'glue' | 'aggressive' | 'none'
  width: number
  saturation: number
}

export interface GenreProfile {
  id: string
  name: string
  family: string
  bpm: [number, number]
  defaultBpm: number
  beatsPerBar: number
  swing: number
  modes: ModeName[]
  drums: string
  extraPerc?: StepPattern
  layers: LayerSpec[]
  mix: MixTarget
  moods: string[]
  /** Tokens que mejor funcionan en prompts de modelos de audio */
  promptTokens: string[]
  instruments: string[]
  /** Referencias de "vibra" para el agente conceptual */
  imagery: string[]
  audience: string
  /** Dónde se consume / vende mejor esta música */
  placements: string[]
  culturalNotes: string
  tags: string[]
}

const L = (
  role: LayerRole, voice: VoiceKind, level: number, octave: number, density: number,
  cutoff: number, reverb: number, delay: number, pan = 0,
): LayerSpec => ({ role, voice, level, octave, density, cutoff, reverb, delay, pan })

export const GENRES: GenreProfile[] = [
  {
    id: 'pop', name: 'Pop contemporáneo', family: 'Pop & mainstream',
    bpm: [92, 124], defaultBpm: 104, beatsPerBar: 4, swing: 0,
    modes: ['ionian', 'lydian', 'mixolydian'], drums: 'fourOnFloor',
    layers: [
      L('harmonic-keyboard', 'felt-piano', 0.7, 0, 0.5, 3200, 0.18, 0.05),
      L('harmonic-pad', 'pad', 0.4, 1, 0.2, 2400, 0.4, 0.1, -0.2),
      L('bass-sub', 'bass-sub', 0.85, -1, 0.35, 180, 0, 0),
      L('lead', 'lead-soft', 0.72, 1, 0.55, 4200, 0.22, 0.14),
      L('air', 'noise', 0.16, 2, 0.1, 9000, 0.5, 0, 0.3),
    ],
    mix: { loudness: -9, eqLow: 2, eqMid: -1, eqHigh: 2.5, compression: 'glue', width: 0.65, saturation: 0.12 },
    moods: ['esperanzado', 'luminoso', 'romántico', 'eufórico', 'nostálgico'],
    promptTokens: ['clean modern pop', 'radio-ready mix', 'wide chorus', 'intimate verse', 'hook-first arrangement'],
    instruments: ['piano felt', 'sintes suaves', 'bajo pop', 'coros apilados', 'guitarra limpia'],
    imagery: ['atardecer en azotea', 'luces de ciudad', 'verano que se acaba'],
    audience: 'Streaming general, playlists editoriales, reels',
    placements: ['sync publicidad', 'playlist editorial', 'reels/TikTok', 'radio'],
    culturalNotes: 'Estructura verso-coro muy legible; el hook debe vivir en las primeras 8 s.',
    tags: ['pop', 'mainstream'],
  },
  {
    id: 'reggaeton', name: 'Reggaetón', family: 'Música caribeña',
    bpm: [88, 100], defaultBpm: 94, beatsPerBar: 4, swing: 0,
    modes: ['aeolian', 'dorian', 'phrygian'], drums: 'dembow',
    layers: [
      L('bass-sub', 'bass-sub', 0.92, -1, 0.4, 130, 0, 0),
      L('harmonic-pluck', 'pluck', 0.6, 0, 0.55, 2600, 0.12, 0.18),
      L('harmonic-pad', 'pad', 0.32, 1, 0.15, 1800, 0.42, 0.05, 0.25),
      L('percussion', 'pluck-world', 0.45, 1, 0.6, 5200, 0.08, 0.1, -0.35),
      L('air', 'noise', 0.12, 2, 0.08, 8000, 0.35, 0, -0.2),
    ],
    mix: { loudness: -7, eqLow: 4.5, eqMid: -2, eqHigh: 1.5, compression: 'aggressive', width: 0.55, saturation: 0.25 },
    moods: ['nocturno', 'sensual', 'fiesta', 'confiado', 'melancólico de discoteca'],
    promptTokens: ['dembow groove', 'deep sub bass', 'nightclub energy', 'reggaeton perreo suave', 'spanish vocal flow'],
    instruments: ['dembow', 'sub 808', 'synth pluck', 'percusión latina', 'fx de discoteca'],
    imagery: ['neón sobre asfalto mojado', 'azotea en San Juan', 'taxi de madrugada'],
    audience: 'Latinoamérica, mercados hispanos de EE. UU., clubs',
    placements: ['club', 'playlist urbana', 'reels de baile', 'sync deporte'],
    culturalNotes: 'El dembow es sagrado: cualquier variante debe preservar el acento en el 3er golpe.',
    tags: ['reggaeton', 'urbano', 'latin'],
  },
  {
    id: 'lofi', name: 'Lo-fi hip hop', family: 'Chill & focus',
    bpm: [68, 88], defaultBpm: 78, beatsPerBar: 4, swing: 0.22,
    modes: ['dorian', 'aeolian', 'mixolydian'], drums: 'lofi',
    layers: [
      L('harmonic-keyboard', 'epiano', 0.75, 0, 0.4, 2200, 0.3, 0.16),
      L('harmonic-pluck', 'pluck', 0.35, 1, 0.3, 1800, 0.35, 0.2, 0.3),
      L('bass-mid', 'bass-mid', 0.7, -1, 0.3, 220, 0, 0),
      L('texture', 'noise', 0.28, 0, 0.9, 3000, 0.55, 0, 0),
      L('counter-melody', 'wind', 0.3, 1, 0.22, 3200, 0.42, 0.12, -0.35),
    ],
    mix: { loudness: -14, eqLow: 1.5, eqMid: 1, eqHigh: -3, compression: 'light', width: 0.75, saturation: 0.35 },
    moods: ['nostálgico', 'lluvioso', 'íntimo', 'estudio nocturno', 'soñador'],
    promptTokens: ['lo-fi hip hop', 'vinyl crackle', 'tape saturation', 'jazzy rhodes', 'rain ambience', 'dusty drums'],
    instruments: ['rhodes', 'cinta saturada', 'vinilo', 'bajo redondo', 'escobillas'],
    imagery: ['ventana empañada', 'cafetería vacía', 'apuntes a las 2 a.m.'],
    audience: 'Estudio, trabajo profundo, sueño ligero',
    placements: ['streams 24/7', 'podcast bed', 'app de foco', 'sync lifestyle'],
    culturalNotes: 'La imperfección es el producto: ruido, wow/flutter y dynamic range bajo son deseados.',
    tags: ['lofi', 'chill', 'study'],
  },
  {
    id: 'trap', name: 'Trap / Latin trap', family: 'Urbano',
    bpm: [130, 160], defaultBpm: 140, beatsPerBar: 4, swing: 0.06,
    modes: ['aeolian', 'phrygian', 'locrian'], drums: 'trap',
    layers: [
      L('bass-sub', 'bass-sub', 0.98, -2, 0.25, 90, 0, 0),
      L('harmonic-pluck', 'bell', 0.5, 1, 0.35, 3200, 0.3, 0.12, -0.2),
      L('harmonic-pad', 'pad', 0.3, 0, 0.12, 1400, 0.5, 0.05, 0.3),
      L('air', 'noise', 0.2, 2, 0.3, 7000, 0.4, 0.08),
    ],
    mix: { loudness: -6, eqLow: 6, eqMid: -3, eqHigh: 2, compression: 'aggressive', width: 0.45, saturation: 0.3 },
    moods: ['oscuro', 'amenazante', 'triunfal', 'nocturno', 'street'],
    promptTokens: ['hard 808 slides', 'rapid hat rolls', 'dark minor bells', 'trap hi-hat triplet rolls'],
    instruments: ['808', 'bells', 'hats en tresillos', 'stabs de sintetizador'],
    imagery: ['calle iluminada a medias', 'vidrio polarizado', 'cadena de oro'],
    audience: 'Urbano global, gym, gaming',
    placements: ['playlist urbana', 'gym', 'gaming', 'sync tráiler'],
    culturalNotes: 'El 808 hace de bajo y de percusión; el espacio entre golpes es parte del groove.',
    tags: ['trap', 'hip-hop', 'urbano'],
  },
  {
    id: 'house', name: 'House', family: 'Dance electrónica',
    bpm: [118, 128], defaultBpm: 124, beatsPerBar: 4, swing: 0,
    modes: ['minor-pentatonic', 'dorian', 'aeolian'], drums: 'house',
    layers: [
      L('bass-sub', 'bass-mid', 0.88, -1, 0.5, 260, 0, 0),
      L('harmonic-pluck', 'pluck', 0.55, 0, 0.6, 3400, 0.15, 0.22, 0.3),
      L('harmonic-pad', 'organ', 0.4, 1, 0.3, 2600, 0.3, 0.1, -0.3),
      L('air', 'noise', 0.18, 2, 0.2, 9500, 0.4, 0.05),
    ],
    mix: { loudness: -6.5, eqLow: 4, eqMid: -1.5, eqHigh: 3, compression: 'glue', width: 0.7, saturation: 0.2 },
    moods: ['hipnótico', 'eufórico', 'club', 'sunset', 'groove'],
    promptTokens: ['four to the floor', 'deep house groove', 'warm analog bass', 'diva vocal chop'],
    instruments: ['909', 'bajo de disco', 'organo', 'chops vocales'],
    imagery: ['pista de baile', 'azotea al atardecer', 'humo y láser'],
    audience: 'Clubes, fiestas, fitness',
    placements: ['club DJ', 'sync moda', 'eventos', 'playlist de entrenamiento'],
    culturalNotes: 'El kick es el reloj de la pieza; todo lo demás flota alrededor del 1.',
    tags: ['house', 'electronic', 'dance'],
  },
  {
    id: 'techno', name: 'Techno', family: 'Dance electrónica',
    bpm: [126, 145], defaultBpm: 134, beatsPerBar: 4, swing: 0,
    modes: ['aeolian', 'phrygian', 'minor-pentatonic'], drums: 'techno',
    layers: [
      L('bass-sub', 'bass-sub', 0.95, -2, 0.4, 110, 0, 0),
      L('texture', 'noise', 0.42, 0, 0.85, 6000, 0.2, 0.16),
      L('harmonic-pluck', 'pluck', 0.4, 0, 0.7, 4200, 0.12, 0.28, -0.4),
      L('percussion', 'pluck-world', 0.38, 1, 0.75, 6500, 0.1, 0.2, 0.45),
    ],
    mix: { loudness: -5.5, eqLow: 3, eqMid: -2, eqHigh: 4, compression: 'aggressive', width: 0.5, saturation: 0.4 },
    moods: ['industrial', 'frío', 'hipnótico', 'máquina', 'de madrugada'],
    promptTokens: ['driving techno', 'metallic percussion', 'acid 303 line', 'warehouse reverb'],
    instruments: ['909 distorsionado', 'acid', 'ruido blanco rítmico'],
    imagery: ['nave industrial', 'hormigón', 'luz estroboscópica'],
    audience: 'Clubes underground, gaming, foco de alta intensidad',
    placements: ['club', 'gaming', 'sync deporte electrónico'],
    culturalNotes: 'Menos acordes, más textura. La progresión es de timbre, no de armonía.',
    tags: ['techno', 'electronic'],
  },
  {
    id: 'synthwave', name: 'Synthwave / Retrowave', family: 'Retro-futurismo',
    bpm: [96, 120], defaultBpm: 108, beatsPerBar: 4, swing: 0,
    modes: ['aeolian', 'dorian', 'harmonic-minor'], drums: 'rock',
    layers: [
      L('harmonic-pad', 'pad', 0.6, 0, 0.2, 2200, 0.45, 0.18),
      L('lead', 'lead-sync', 0.7, 1, 0.45, 4800, 0.35, 0.3, 0.15),
      L('bass-mid', 'bass-mid', 0.85, -1, 0.6, 320, 0, 0),
      L('harmonic-pluck', 'pluck', 0.35, 1, 0.4, 3600, 0.3, 0.24, -0.35),
    ],
    mix: { loudness: -8, eqLow: 3, eqMid: 0, eqHigh: 2, compression: 'glue', width: 0.85, saturation: 0.3 },
    moods: ['nostalgia futura', 'nocturno', 'carretera', 'neón'],
    promptTokens: ['analog synth pads', 'gated reverb drums', 'arpeggiated bass', '1984 neon'],
    instruments: ['Juno', 'DX7', 'LinnDrum', 'cuerdas sintéticas'],
    imagery: ['camino de neón', 'rejilla púrpura', 'coche sin conductor'],
    audience: 'Gaming, nostalgia 80, running',
    placements: ['tráiler indie', 'gaming', 'sync tecnología'],
    culturalNotes: 'Todo el género es un recuerdo inventado: prioriza el color sobre el realismo.',
    tags: ['synthwave', 'retrowave', 'electronic'],
  },
  {
    id: 'cinematic', name: 'Cinematic / Score', family: 'Orquestal',
    bpm: [60, 100], defaultBpm: 76, beatsPerBar: 4, swing: 0,
    modes: ['aeolian', 'harmonic-minor', 'ionian', 'lydian'], drums: 'orchestral',
    layers: [
      L('harmonic-pad', 'strings', 0.8, 0, 0.25, 2600, 0.6, 0.1),
      L('harmonic-pluck', 'bell', 0.4, 1, 0.3, 4200, 0.5, 0.2, -0.3),
      L('bass-sub', 'bass-sub', 0.7, -2, 0.2, 120, 0.2, 0),
      L('lead', 'choir', 0.5, 1, 0.2, 3000, 0.7, 0.05),
      L('sfx', 'noise', 0.25, 0, 0.4, 5000, 0.65, 0),
    ],
    mix: { loudness: -13, eqLow: 2, eqMid: 0, eqHigh: 1, compression: 'light', width: 0.95, saturation: 0.05 },
    moods: ['éptico', 'melancólico', 'sublime', 'tensión', 'esperanza'],
    promptTokens: ['cinematic score', 'legato strings', 'hybrid trailer percussion', 'huge hall reverb'],
    instruments: ['cuerdas', 'coro', 'metales', 'percusión híbrida', 'preparado piano'],
    imagery: ['horizonte después de la tormenta', 'ruinas', 'vuelo bajo'],
    audience: 'Creadores de video, indie games, tráilers',
    placements: ['tráiler', 'cortometraje', 'video game', 'documental'],
    culturalNotes: 'La dinámica cuenta la historia: el silencio es parte del arreglo.',
    tags: ['cinematic', 'score', 'orchestral'],
  },
  {
    id: 'ambient', name: 'Ambient / Drone', family: 'Chill & focus',
    bpm: [50, 75], defaultBpm: 60, beatsPerBar: 4, swing: 0,
    modes: ['lydian', 'ionian', 'dorian'], drums: 'ambient',
    layers: [
      L('harmonic-pad', 'pad', 0.9, 0, 0.1, 1800, 0.8, 0.25),
      L('texture', 'noise', 0.32, 1, 0.9, 4000, 0.75, 0.1),
      L('counter-melody', 'bell', 0.35, 2, 0.12, 3600, 0.85, 0.35, -0.4),
      L('air', 'wind', 0.3, 1, 0.7, 6500, 0.7, 0.05),
    ],
    mix: { loudness: -18, eqLow: 0, eqMid: 0, eqHigh: 1.5, compression: 'none', width: 1, saturation: 0.05 },
    moods: ['inmenso', 'meditativo', 'nocturno', 'sanador', 'suspendido'],
    promptTokens: ['ambient drone', 'evolving pads', 'field recording', 'long reverb tails'],
    instruments: ['pads modulares', 'grabación de campo', 'arpa procesada'],
    imagery: ['niebla sobre el lago', 'habitación vacía al amanecer', 'glaciar'],
    audience: 'Meditación, sueño, spas, lectura',
    placements: ['app de sueño', 'wellness', 'museo', 'sync documental'],
    culturalNotes: 'Sin pulso fuerte: la pieza se sostiene con evolución tímbrica, no con armonía.',
    tags: ['ambient', 'drone', 'meditation'],
  },
  {
    id: 'jazz', name: 'Jazz / Neo-bop', family: 'Jazz & soul',
    bpm: [96, 168], defaultBpm: 126, beatsPerBar: 4, swing: 0.25,
    modes: ['dorian', 'mixolydian', 'ionian', 'harmonic-minor', 'dorian-bebop'], drums: 'boomBap',
    layers: [
      L('harmonic-keyboard', 'epiano', 0.72, 0, 0.45, 3000, 0.2, 0.08),
      L('bass-mid', 'bass-mid', 0.8, -1, 0.6, 300, 0, 0),
      L('lead', 'wind', 0.62, 1, 0.5, 4400, 0.28, 0.1, 0.2),
      L('harmonic-pluck', 'guitar-clean', 0.35, 0, 0.3, 2600, 0.3, 0.12, -0.3),
    ],
    mix: { loudness: -15, eqLow: 0.5, eqMid: 1.5, eqHigh: 0.5, compression: 'light', width: 0.8, saturation: 0.1 },
    moods: ['sofisticado', 'blue', 'café de medianoche', 'improvisación'],
    promptTokens: ['upright bass walking', 'brushed drums', 'jazzy voicings', 'smoke-filled room'],
    instruments: ['contrabajo', 'piano acústico', 'saxo', 'escobillas'],
    imagery: ['sótano con humo', 'vaso de whisky', 'micrófono vintage'],
    audience: 'Oyentes adultos, hotel/lounge, sync premium',
    placements: ['lounge', 'sync premium', 'podcast', 'radio de jazz'],
    culturalNotes: 'Las notas a evitar (avoid notes) se usan como paso cromático, nunca como apoyo.',
    tags: ['jazz', 'swing', 'instrumental'],
  },
  {
    id: 'neosoul', name: 'Neo-soul / R&B', family: 'Jazz & soul',
    bpm: [72, 100], defaultBpm: 84, beatsPerBar: 4, swing: 0.14,
    modes: ['dorian', 'aeolian', 'mixolydian', 'lydian'], drums: 'rnb',
    layers: [
      L('harmonic-keyboard', 'epiano', 0.78, 0, 0.42, 2800, 0.24, 0.14),
      L('harmonic-pluck', 'guitar-clean', 0.5, 0, 0.45, 3200, 0.2, 0.18, 0.3),
      L('bass-mid', 'bass-mid', 0.9, -1, 0.5, 240, 0, 0),
      L('vocal', 'choir', 0.35, 1, 0.2, 2600, 0.45, 0.1),
    ],
    mix: { loudness: -11, eqLow: 2.5, eqMid: 1, eqHigh: 1.5, compression: 'glue', width: 0.7, saturation: 0.18 },
    moods: ['sedoso', 'íntimo', 'soñador', 'tarde de domingo'],
    promptTokens: ['neo soul chords', 'dtx rhodes', 'lazy pocket drums', 'layered harmonies'],
    instruments: ['rhodes DTX', 'bajo slap suave', 'guitarra con chorus', 'coros'],
    imagery: ['sábanas blancas', 'ventana con luz de tarde', 'taza de café'],
    audience: 'R&B global, café de especialidad, sync premium',
    placements: ['sync lifestyle', 'café', 'playlist chill R&B'],
    culturalNotes: 'El "detrás del beat" (lag) es el estilo; cuantizar todo lo destruye.',
    tags: ['rnb', 'soul', 'neo-soul'],
  },
  {
    id: 'funk', name: 'Funk / Disco', family: 'Jazz & soul',
    bpm: [98, 120], defaultBpm: 110, beatsPerBar: 4, swing: 0.12,
    modes: ['dorian', 'mixolydian', 'minor-pentatonic'], drums: 'funk',
    layers: [
      L('bass-mid', 'bass-mid', 0.92, -1, 0.7, 380, 0, 0),
      L('harmonic-pluck', 'guitar-clean', 0.6, 0, 0.75, 4200, 0.1, 0.12, 0.35),
      L('harmonic-keyboard', 'organ', 0.45, 0, 0.35, 2800, 0.2, 0.08, -0.3),
      L('percussion', 'pluck-world', 0.4, 1, 0.6, 6000, 0.1, 0.1),
    ],
    mix: { loudness: -9, eqLow: 2, eqMid: 2, eqHigh: 2, compression: 'glue', width: 0.7, saturation: 0.25 },
    moods: ['bailable', 'picante', 'groove', 'fiesta setentera'],
    promptTokens: ['slap bass', 'chicken scratch guitar', 'funky wah clavinet', 'disco strings stabs'],
    instruments: ['slap bass', 'clavinet', 'guitarra ritmica', 'cuerdas staccato'],
    imagery: ['pista de bolera', 'botas platform', 'espejo de bola'],
    audience: 'Fiestas, sync retro, sampling',
    placements: ['sync retro', 'club', 'playlist groove'],
    culturalNotes: 'La síncopa del bajo define todo; el resto responde al bajo.',
    tags: ['funk', 'disco', 'groove'],
  },
  {
    id: 'rock', name: 'Rock alternativo', family: 'Guitarras',
    bpm: [104, 148], defaultBpm: 122, beatsPerBar: 4, swing: 0,
    modes: ['mixolydian', 'ionian', 'aeolian'], drums: 'rock',
    layers: [
      L('harmonic-guitar', 'guitar-clean', 0.7, 0, 0.5, 3600, 0.15, 0.08, -0.4),
      L('harmonic-guitar', 'noise', 0.62, 0, 0.5, 2600, 0.12, 0.05, 0.4),
      L('bass-mid', 'bass-mid', 0.82, -1, 0.5, 300, 0, 0),
      L('lead', 'wind', 0.4, 1, 0.35, 4000, 0.3, 0.1),
    ],
    mix: { loudness: -8, eqLow: 2, eqMid: 2.5, eqHigh: 1, compression: 'glue', width: 0.8, saturation: 0.4 },
    moods: ['rebelde', 'catártico', 'abierto', 'ruido hermoso'],
    promptTokens: ['driven guitars', 'live drum room', 'analog bass tone', 'loud-quiet-loud dynamics'],
    instruments: ['guitarras', 'bajo P', 'bateria de sala'],
    imagery: ['galpón', 'carretera', 'amplificador al 10'],
    audience: 'Festival, sync deporte, gaming',
    placements: ['sync deporte', 'gaming', 'radio indie'],
    culturalNotes: 'La dinámica loud-quiet-loud es la firma del género.',
    tags: ['rock', 'indie', 'alternative'],
  },
  {
    id: 'edm', name: 'EDM / Festival', family: 'Dance electrónica',
    bpm: [126, 150], defaultBpm: 128, beatsPerBar: 4, swing: 0,
    modes: ['aeolian', 'ionian', 'minor-pentatonic'], drums: 'fourOnFloor',
    layers: [
      L('harmonic-pad', 'lead-sync', 0.85, 0, 0.35, 4600, 0.3, 0.12),
      L('bass-sub', 'bass-sub', 0.95, -1, 0.4, 120, 0, 0),
      L('harmonic-pluck', 'pluck', 0.55, 1, 0.6, 4200, 0.2, 0.24, -0.3),
      L('air', 'noise', 0.3, 2, 0.5, 8000, 0.5, 0.05),
    ],
    mix: { loudness: -5, eqLow: 5, eqMid: -2.5, eqHigh: 4, compression: 'aggressive', width: 0.9, saturation: 0.2 },
    moods: ['eufórico', 'drop', 'masa', 'fuego artificial'],
    promptTokens: ['festival edm drop', 'supersaw chords', 'sidechained bass', 'white noise riser'],
    instruments: ['supersaw', '808 largo', 'risers', 'plucks'],
    imagery: ['escenario gigante', 'confeti', 'mano al cielo'],
    audience: 'Festivales, gaming, sync deporte',
    placements: ['festival', 'gaming', 'playlist de energía'],
    culturalNotes: 'Todo el arreglo existe para el drop: construir tensión y liberarla exacta.',
    tags: ['edm', 'electronic', 'festival'],
  },
  {
    id: 'afrobeat', name: 'Afrobeats', family: 'Música caribeña & africana',
    bpm: [98, 118], defaultBpm: 106, beatsPerBar: 4, swing: 0.08,
    modes: ['major-pentatonic', 'mixolydian', 'ionian'], drums: 'afrobeat',
    layers: [
      L('bass-mid', 'bass-mid', 0.88, -1, 0.55, 260, 0, 0),
      L('harmonic-pluck', 'pluck-world', 0.55, 0, 0.6, 3400, 0.15, 0.2, 0.35),
      L('harmonic-keyboard', 'epiano', 0.45, 0, 0.35, 2800, 0.25, 0.14, -0.3),
      L('percussion', 'pluck-world', 0.5, 1, 0.75, 5200, 0.1, 0.12, -0.45),
      L('air', 'wind', 0.2, 2, 0.3, 6000, 0.4, 0.05),
    ],
    mix: { loudness: -7.5, eqLow: 3, eqMid: 0.5, eqHigh: 2.5, compression: 'glue', width: 0.75, saturation: 0.15 },
    moods: ['soleado', 'celebración', 'baile', 'calor'],
    promptTokens: ['afrobeat percussion', 'log drum', 'bright marimba', 'warm tropical groove'],
    instruments: ['log drum', 'marimba', 'shakers', 'bajo melodico'],
    imagery: ['mercado al atardecer', 'arena', 'luces de guirnalda'],
    audience: 'Global, playlist de verano, baile',
    placements: ['playlist global', 'sync travel', 'fitness'],
    culturalNotes: 'Polirritmia: la percusión y el bajo llevan ciclos distintos que se cruzan.',
    tags: ['afrobeats', 'latin', 'global'],
  },
  {
    id: 'bossa', name: 'Bossa nova / Latin jazz', family: 'Música caribeña & africana',
    bpm: [110, 140], defaultBpm: 126, beatsPerBar: 4, swing: 0,
    modes: ['ionian', 'dorian', 'lydian'], drums: 'bossa',
    layers: [
      L('harmonic-guitar', 'guitar-clean', 0.75, 0, 0.55, 3400, 0.22, 0.1),
      L('harmonic-keyboard', 'epiano', 0.4, 0, 0.35, 2800, 0.3, 0.14, 0.3),
      L('bass-mid', 'bass-mid', 0.7, -1, 0.4, 280, 0, 0),
      L('counter-melody', 'wind', 0.42, 1, 0.35, 4000, 0.35, 0.15, -0.35),
    ],
    mix: { loudness: -14, eqLow: 0.5, eqMid: 1, eqHigh: 1, compression: 'light', width: 0.85, saturation: 0.08 },
    moods: ['elegante', 'brisa', 'romántico', 'atardecer'],
    promptTokens: ['bossa nova guitar', 'soft brushed percussion', 'warm upright bass', 'coffee shop latin'],
    instruments: ['guitarra nylon', 'flauta', 'contrabajo', 'percusión suave'],
    imagery: ['playa de Río', 'ventilador de techo', 'café con leche'],
    audience: 'Restaurantes, hotels, sync lifestyle',
    placements: ['hospitality', 'sync travel', 'podcast'],
    culturalNotes: 'Armonía de jazz con ritmo de samba simplificado: la "反beat" del rimshot.',
    tags: ['bossa', 'latin', 'jazz'],
  },
  {
    id: 'flamenco', name: 'Flamenco fusión', family: 'Música caribeña & africana',
    bpm: [92, 132], defaultBpm: 112, beatsPerBar: 12, swing: 0,
    modes: ['hijaz', 'phrygian-dominant', 'aeolian'], drums: 'bossa',
    layers: [
      L('harmonic-guitar', 'guitar-clean', 0.85, 0, 0.65, 3800, 0.18, 0.1),
      L('bass-mid', 'bass-mid', 0.65, -1, 0.35, 260, 0, 0),
      L('percussion', 'pluck-world', 0.55, 1, 0.8, 5000, 0.12, 0.08, 0.4),
      L('counter-melody', 'wind', 0.35, 1, 0.4, 4400, 0.3, 0.16, -0.4),
    ],
    mix: { loudness: -12, eqLow: 0.5, eqMid: 2, eqHigh: 1.5, compression: 'light', width: 0.7, saturation: 0.12 },
    moods: ['duende', 'quejío', 'fuego', 'tierra'],
    promptTokens: ['flamenco guitar', 'palmas percussion', 'andalusian cadence', 'cajón groove'],
    instruments: ['guitarra flamenca', 'cajón', 'palmas', 'violeta'],
    imagery: ['patio de Sevilla', 'madera vieja', 'polvo y luz'],
    audience: 'Sync cultural, hospitality, world music',
    placements: ['sync cultural', 'hospitality', 'world playlists'],
    culturalNotes: 'Compás de 12 con acentos en 3-6-8-10; romper el acento es romper el género.',
    tags: ['flamenco', 'espanol', 'world'],
  },
  {
    id: 'drill', name: 'Drill', family: 'Urbano',
    bpm: [136, 148], defaultBpm: 142, beatsPerBar: 4, swing: 0.1,
    modes: ['aeolian', 'harmonic-minor', 'phrygian'], drums: 'drill',
    layers: [
      L('bass-sub', 'bass-sub', 1, -2, 0.35, 80, 0, 0),
      L('harmonic-pluck', 'bell', 0.45, 1, 0.35, 3000, 0.35, 0.14, -0.25),
      L('harmonic-pad', 'strings', 0.4, 0, 0.2, 2200, 0.45, 0.05, 0.3),
      L('air', 'noise', 0.22, 2, 0.35, 7500, 0.4, 0.1),
    ],
    mix: { loudness: -5, eqLow: 6.5, eqMid: -3.5, eqHigh: 2.5, compression: 'aggressive', width: 0.4, saturation: 0.35 },
    moods: ['hostil', 'frío', 'calle', 'tensión'],
    promptTokens: ['sliding 808', 'dark drill strings', 'cold bell melody', 'hard-hitting snare'],
    instruments: ['808 con glides', 'cuerdas oscuras', 'bells'],
    imagery: ['concreto gris', 'invierno', 'vidrio roto'],
    audience: 'Urbano, UK/Chicago/Latam drill',
    placements: ['playlist urbana', 'sync drama'],
    culturalNotes: 'Los glides del 808 funcionan como segunda melodía; hay que escribirlos, no dejarlos al azar.',
    tags: ['drill', 'hip-hop', 'urbano'],
  },
  {
    id: 'downtempo', name: 'Downtempo / Trip-hop', family: 'Chill & focus',
    bpm: [78, 96], defaultBpm: 88, beatsPerBar: 4, swing: 0.16,
    modes: ['dorian', 'aeolian', 'minor-pentatonic'], drums: 'boomBap',
    layers: [
      L('harmonic-pad', 'pad', 0.6, 0, 0.2, 2000, 0.55, 0.14),
      L('harmonic-keyboard', 'epiano', 0.5, 0, 0.35, 2600, 0.35, 0.18, 0.25),
      L('bass-sub', 'bass-sub', 0.8, -1, 0.3, 150, 0, 0),
      L('texture', 'noise', 0.24, 1, 0.7, 3800, 0.6, 0.05),
    ],
    mix: { loudness: -12, eqLow: 3, eqMid: 0.5, eqHigh: 0.5, compression: 'glue', width: 0.9, saturation: 0.25 },
    moods: ['cinematográfico', 'bruma', 'melancolía elegante', 'de madrugada'],
    promptTokens: ['downtempo trip-hop', 'cinematic soul', 'dusty textures', 'slow broken beat'],
    instruments: ['pads de cine', 'rhodes', 'beat roto'],
    imagery: ['lluvia sobre cristal', 'habitación azul', 'tren nocturno'],
    audience: 'Sync cine, series, café de diseño',
    placements: ['sync drama', 'hospitality', 'playlist chill'],
    culturalNotes: 'Groove deliberadamente descoyuntado: el "no estar en su sitio" es el atractivo.',
    tags: ['downtempo', 'trip-hop', 'chill'],
  },
  {
    id: 'metal', name: 'Metal moderno', family: 'Guitarras',
    bpm: [110, 180], defaultBpm: 138, beatsPerBar: 4, swing: 0,
    modes: ['aeolian', 'harmonic-minor', 'phrygian', 'locrian'], drums: 'rock',
    layers: [
      L('harmonic-guitar', 'noise', 0.9, 0, 0.8, 3000, 0.06, 0.02, -0.45),
      L('harmonic-guitar', 'noise', 0.82, 0, 0.8, 3200, 0.06, 0.02, 0.45),
      L('bass-mid', 'bass-mid', 0.8, -1, 0.8, 320, 0, 0),
      L('lead', 'lead-sync', 0.3, 1, 0.4, 5000, 0.3, 0.1),
    ],
    mix: { loudness: -6, eqLow: 3, eqMid: 3, eqHigh: 3, compression: 'aggressive', width: 0.85, saturation: 0.6 },
    moods: ['agresivo', 'épico', 'catártico', 'potente'],
    promptTokens: ['palm-muted guitars', 'double kick', 'high gain rhythm', 'wide guitar stack'],
    instruments: ['guitarras alta ganancia', 'doble bombo', 'bajo de 5'],
    imagery: ['acero', 'tormenta', 'arena'],
    audience: 'Gaming, gym, sync tráiler',
    placements: ['gaming', 'gym', 'sync tráiler'],
    culturalNotes: 'Riff = ritmo + armonía simultáneamente; los silencios de palm mute son la métrica.',
    tags: ['metal', 'rock', 'heavy'],
  },
  {
    id: 'country', name: 'Country / Americana', family: 'Guitarras',
    bpm: [84, 124], defaultBpm: 100, beatsPerBar: 4, swing: 0.08,
    modes: ['ionian', 'mixolydian', 'major-pentatonic'], drums: 'boomBap',
    layers: [
      L('harmonic-guitar', 'guitar-clean', 0.75, 0, 0.55, 3800, 0.14, 0.1, -0.3),
      L('harmonic-keyboard', 'organ', 0.4, 0, 0.3, 2600, 0.2, 0.08, 0.3),
      L('bass-mid', 'bass-mid', 0.72, -1, 0.4, 280, 0, 0),
      L('counter-melody', 'wind', 0.45, 1, 0.4, 4200, 0.25, 0.14, 0.4),
    ],
    mix: { loudness: -10, eqLow: 1.5, eqMid: 1.5, eqHigh: 2, compression: 'glue', width: 0.75, saturation: 0.15 },
    moods: ['honesto', 'carretera', 'nostalgia', 'raíces'],
    promptTokens: ['acoustic guitar strum', 'pedal steel', 'twang lead', 'live band feel'],
    instruments: ['acústica', 'pedal steel', 'banjo', 'bateria de sala'],
    imagery: ['carretera secundaria', 'porche', 'camioneta'],
    audience: 'Mercado anglosajón, sync travel',
    placements: ['sync travel', 'radio', 'playlist de carretera'],
    culturalNotes: 'La letra manda: la melodía debe dejar hablar.',
    tags: ['country', 'americana', 'folk'],
  },
  {
    id: 'classical', name: 'Neoclásico / Piano', family: 'Orquestal',
    bpm: [56, 92], defaultBpm: 72, beatsPerBar: 4, swing: 0,
    modes: ['ionian', 'aeolian', 'dorian', 'harmonic-minor'], drums: 'ambient',
    layers: [
      L('harmonic-keyboard', 'felt-piano', 0.95, 0, 0.55, 3400, 0.42, 0.12),
      L('harmonic-pad', 'strings', 0.55, 0, 0.15, 2400, 0.65, 0.05, -0.25),
      L('counter-melody', 'wind', 0.35, 1, 0.3, 3800, 0.55, 0.18, 0.35),
      L('air', 'noise', 0.1, 1, 0.3, 5000, 0.7, 0),
    ],
    mix: { loudness: -17, eqLow: 0, eqMid: 0.5, eqHigh: 1, compression: 'none', width: 0.9, saturation: 0.03 },
    moods: ['íntimo', 'contemplativo', 'duelo', 'claridad'],
    promptTokens: ['neoclassical piano', 'felt piano recordings', 'intimate string quartet', 'concert hall ambience'],
    instruments: ['piano preparado', 'cuarteto de cuerdas', 'soplo'],
    imagery: ['sala vacía', 'madera y luz', 'invierno interior'],
    audience: 'Sync cine, lectura, bienestar premium',
    placements: ['sync cine', 'wellness', 'playlist de foco'],
    culturalNotes: 'El ruido de mecanismo (pedales, teclas) es parte de la estética.',
    tags: ['classical', 'neoclassical', 'piano'],
  },
  {
    id: 'vaporwave', name: 'Vaporwave / Future funk', family: 'Retro-futurismo',
    bpm: [70, 110], defaultBpm: 86, beatsPerBar: 4, swing: 0,
    modes: ['ionian', 'lydian', 'dorian'], drums: 'lofi',
    layers: [
      L('harmonic-pad', 'pad', 0.7, 0, 0.2, 2400, 0.6, 0.2),
      L('harmonic-keyboard', 'epiano', 0.5, 0, 0.35, 3000, 0.5, 0.24, 0.25),
      L('bass-mid', 'bass-mid', 0.62, -1, 0.4, 320, 0, 0),
      L('texture', 'noise', 0.2, 1, 0.8, 4500, 0.55, 0.05),
    ],
    mix: { loudness: -13, eqLow: 1, eqMid: 1, eqHigh: -1, compression: 'light', width: 0.95, saturation: 0.3 },
    moods: ['nostalgia falsa', 'plástico', 'ensueño', 'mall de 1995'],
    promptTokens: ['vaporwave slowed', 'chopped and screwed', '80s mall muzak', 'tape warp pitch drift'],
    instruments: ['pads de los 80', 'vox chops', 'bajo de funk'],
    imagery: ['atrio de centro comercial', 'palmeras de vinilo', 'Windows 95'],
    audience: 'Internet-native, sync retro-tech',
    placements: ['sync retro-tech', 'playlist de nostalgia', 'stream'],
    culturalNotes: 'La deriva de pitch y el time-stretch son el lenguaje, no errores.',
    tags: ['vaporwave', 'electronic', 'nostalgia'],
  },
  {
    id: 'hiphop', name: 'Boom bap / Hip hop clásico', family: 'Urbano',
    bpm: [82, 98], defaultBpm: 90, beatsPerBar: 4, swing: 0.2,
    modes: ['dorian', 'aeolian', 'minor-pentatonic'], drums: 'boomBap',
    layers: [
      L('harmonic-keyboard', 'epiano', 0.62, 0, 0.4, 2600, 0.25, 0.12),
      L('bass-mid', 'bass-mid', 0.85, -1, 0.4, 260, 0, 0),
      L('harmonic-pluck', 'guitar-clean', 0.38, 0, 0.3, 3000, 0.25, 0.14, 0.3),
      L('texture', 'noise', 0.26, 0, 0.9, 3200, 0.5, 0),
    ],
    mix: { loudness: -10, eqLow: 3, eqMid: 1.5, eqHigh: -0.5, compression: 'glue', width: 0.6, saturation: 0.3 },
    moods: ['calle', 'confesión', 'polvo', 'loop hipnótico'],
    promptTokens: ['boom bap drums', 'dusty sample', 'vinyl crackle', 'jazzy hip hop loop'],
    instruments: ['SP-1200', 'rhodes', 'bajo de sample'],
    imagery: ['bloque de apartamentos', 'turntable', 'invierno en la ciudad'],
    audience: 'Hip hop purista, sync urbano',
    placements: ['playlist hip hop', 'sync documental'],
    culturalNotes: 'El loop es el producto: cuatro compases que se sostienen por carácter, no por desarrollo.',
    tags: ['hip-hop', 'boom-bap', 'urbano'],
  },
  {
    id: 'kpop', name: 'K-pop / Hyperpop', family: 'Pop & mainstream',
    bpm: [110, 132], defaultBpm: 120, beatsPerBar: 4, swing: 0,
    modes: ['ionian', 'aeolian', 'lydian', 'minor-pentatonic'], drums: 'fourOnFloor',
    layers: [
      L('harmonic-pluck', 'pluck', 0.62, 0, 0.6, 4200, 0.15, 0.2),
      L('lead', 'lead-sync', 0.75, 1, 0.5, 5200, 0.25, 0.22, 0.2),
      L('bass-sub', 'bass-sub', 0.9, -1, 0.45, 140, 0, 0),
      L('harmonic-pad', 'pad', 0.35, 1, 0.15, 2400, 0.45, 0.08, -0.3),
      L('sfx', 'bell', 0.3, 2, 0.4, 7000, 0.35, 0.15, 0.4),
    ],
    mix: { loudness: -6, eqLow: 3.5, eqMid: -1, eqHigh: 4, compression: 'aggressive', width: 0.9, saturation: 0.18 },
    moods: ['colorido', 'adictivo', 'coreografía', 'cambio de color'],
    promptTokens: ['k-pop bright synths', 'song switch drop', 'hyperpop sparkle fx', 'sharp vocal chops'],
    instruments: ['synths brillantes', 'vocal chops', '808 corto'],
    imagery: ['neón pastel', 'vestuario de colores', 'coreografía simétrica'],
    audience: 'Global fandom, baile, sync fashion',
    placements: ['playlist global', 'sync moda', 'danza'],
    culturalNotes: 'Estructura "song switch": el coro cambia de género dentro de la misma canción.',
    tags: ['kpop', 'pop', 'hyperpop'],
  },
  {
    id: 'corrido', name: 'Corrido tumbado / Regional mexicano', family: 'Regional mexicano',
    bpm: [100, 130], defaultBpm: 118, beatsPerBar: 3, swing: 0,
    modes: ['aeolian', 'dorian', 'harmonic-minor'], drums: 'sierreño',
    layers: [
      L('harmonic-guitar', 'guitar-clean', 0.8, 0, 0.6, 3600, 0.12, 0.1, -0.35),
      L('harmonic-guitar', 'pluck-world', 0.6, 1, 0.65, 4400, 0.12, 0.14, 0.35),
      L('bass-mid', 'bass-mid', 0.78, -1, 0.5, 300, 0, 0),
      L('percussion', 'pluck-world', 0.3, 1, 0.5, 5000, 0.1, 0.08),
    ],
    mix: { loudness: -9, eqLow: 2, eqMid: 2, eqHigh: 2.5, compression: 'glue', width: 0.8, saturation: 0.2 },
    moods: ['narrativo', 'orgullo', 'frontera', 'noche de carretera'],
    promptTokens: ['requinto melody', 'tololoche bass', 'regional mexicano 3/4', 'corrido tumbado groove'],
    instruments: ['requinto', 'guitarra séptima', 'tololoche', 'charchetas'],
    imagery: ['carretera de tierra', 'botas', 'camión de madrugada'],
    audience: 'México y mercado hispano de EE. UU.',
    placements: ['playlist regional', 'sync', 'fiesta'],
    culturalNotes: 'Tres por cuatro con requinto que responde a la voz: conversación, no acompañamiento.',
    tags: ['regional', 'mexicano', 'corrido'],
  },
  {
    id: 'gamemusic', name: 'Video game / Chip tune', family: 'Retro-futurismo',
    bpm: [120, 160], defaultBpm: 140, beatsPerBar: 4, swing: 0,
    modes: ['ionian', 'aeolian', 'dorian', 'harmonic-minor'], drums: 'techno',
    layers: [
      L('lead', 'lead-sync', 0.75, 1, 0.7, 6000, 0.18, 0.14),
      L('harmonic-pluck', 'pluck', 0.5, 0, 0.7, 4600, 0.2, 0.16, -0.3),
      L('bass-mid', 'bass-mid', 0.72, -1, 0.7, 400, 0, 0),
      L('harmonic-pad', 'pad', 0.28, 1, 0.15, 2600, 0.4, 0.05, 0.3),
    ],
    mix: { loudness: -9, eqLow: 1, eqMid: 0, eqHigh: 3, compression: 'glue', width: 0.6, saturation: 0.2 },
    moods: ['aventura', 'pixel', 'urgencia', 'victoria'],
    promptTokens: ['chiptune arpeggios', '16-bit adventure theme', 'square wave lead', 'boss battle energy'],
    instruments: ['ondas cuadradas', 'triángulo', 'ruido blanco percusivo'],
    imagery: ['pixel art', 'jefe final', 'mapa de mundo'],
    audience: 'Gaming, streamers, sync tecnología',
    placements: ['indie game', 'stream', 'sync app'],
    culturalNotes: 'Arpegios rápidos sustituyen acordes: pocas notas, mucha velocidad.',
    tags: ['chiptune', 'gaming', 'electronic'],
  },
  {
    id: 'worship', name: 'Ambiente espiritual / Worship', family: 'Orquestal',
    bpm: [64, 92], defaultBpm: 74, beatsPerBar: 4, swing: 0,
    modes: ['ionian', 'lydian', 'mixolydian'], drums: 'orchestral',
    layers: [
      L('harmonic-pad', 'pad', 0.7, 0, 0.18, 2600, 0.7, 0.2),
      L('harmonic-keyboard', 'felt-piano', 0.55, 0, 0.4, 3000, 0.4, 0.12),
      L('bass-sub', 'bass-sub', 0.62, -1, 0.25, 160, 0, 0),
      L('counter-melody', 'bell', 0.3, 2, 0.25, 4200, 0.6, 0.3, 0.35),
      L('air', 'wind', 0.2, 1, 0.5, 6000, 0.7, 0.05),
    ],
    mix: { loudness: -15, eqLow: 1, eqMid: 0, eqHigh: 2, compression: 'light', width: 1, saturation: 0.05 },
    moods: ['trascendente', 'esperanza', 'silencio', 'luz'],
    promptTokens: ['worship ambient', 'shimmer reverbs', 'swelling pads', 'gentle building dynamics'],
    instruments: ['pads shimmer', 'piano', 'cuerdas suaves'],
    imagery: ['luz por ventana', 'montaña', 'vela'],
    audience: 'Bienestar, comunidades de fe, sync inspiracional',
    placements: ['sync inspiracional', 'wellness', 'eventos'],
    culturalNotes: 'Crescendo lento sin drop: la tensión se sostiene, no se suelta.',
    tags: ['worship', 'ambient', 'inspirational'],
  },
]

interface NativeGenreSpec {
  id: string; name: string; family: string; bpm: [number, number]; defaultBpm: number; beatsPerBar: number
  modes: ModeName[]; drums: string; instruments: string[]; moods: string[]; promptTokens: string[]
  imagery: string[]; culturalNotes: string; tags: string[]; guitar?: VoiceKind; keyboard?: VoiceKind; bass?: VoiceKind; lead?: VoiceKind
}

function createNativeGenre(spec: NativeGenreSpec): GenreProfile {
  const danceMix = spec.defaultBpm >= 115
  return {
    ...spec, swing: 0.04,
    layers: [
      L('harmonic-guitar', spec.guitar ?? 'guitar-clean', 0.76, 0, 0.58, 3600, 0.2, 0.1, -0.3),
      L('harmonic-keyboard', spec.keyboard ?? 'organ', 0.42, 0, 0.35, 3000, 0.24, 0.12, 0.24),
      L('bass-mid', spec.bass ?? 'bass-mid', 0.78, -1, 0.48, 300, 0.04, 0.02),
      L('percussion', spec.lead ?? 'pluck-world', 0.5, 1, 0.7, 5200, 0.14, 0.08, 0.32),
      L('lead', 'lead-soft', 0.58, 1, 0.42, 4200, 0.25, 0.14),
      L('air', 'noise', 0.12, 2, 0.16, 7600, 0.38, 0.05, -0.2),
    ],
    mix: { loudness: danceMix ? -8 : -10, eqLow: 2.2, eqMid: 0.8, eqHigh: 1.8, compression: 'glue', width: 0.72, saturation: 0.16 },
    audience: 'Creación musical y aprendizaje con contexto cultural editable',
    placements: ['composición', 'producción independiente', 'biblioteca creativa'],
  }
}

const NATIVE_GENRES: NativeGenreSpec[] = [
  { id: 'sierreño', name: 'Sierreño acústico', family: 'Regional mexicano', bpm: [76,112], defaultBpm: 92, beatsPerBar: 3, modes: ['aeolian','dorian','harmonic-minor'], drums: 'sierreño', instruments: ['requinto acústico','guitarra de armonía','bajo acústico','palmas suaves'], moods: ['íntimo','campirano','nostálgico'], promptTokens: ['sierreño acústico','requinto melódico','guitarras de madera','compás ternario'], imagery: ['sala de ensayo','madera cálida','carretera serrana'], culturalNotes: 'Diálogo entre requinto y voz; el arreglo acústico debe respirar y dejar espacio a la interpretación.', tags: ['sierreño','sierreno','regional mexicano'] },
  { id: 'banda', name: 'Banda sinaloense', family: 'Regional mexicano', bpm: [92,132], defaultBpm: 116, beatsPerBar: 2, modes: ['ionian','mixolydian','aeolian'], drums: 'rock', guitar: 'brass', lead: 'brass', instruments: ['tuba','trompetas','clarinetes','tarola','armonía de metales'], moods: ['festivo','potente','comunitario'], promptTokens: ['banda sinaloense','metales en respuesta','tuba con pulso','tarola de banda'], imagery: ['plaza abierta','fiesta de pueblo','metales al sol'], culturalNotes: 'Guía de arreglo, no definición universal: las bandas regionales y sus fraseos varían.', tags: ['banda','sinaloense','regional','mexicano'] },
  { id: 'norteño', name: 'Norteño', family: 'Regional mexicano', bpm: [92,132], defaultBpm: 112, beatsPerBar: 2, modes: ['ionian','mixolydian','aeolian'], drums: 'sierreño', keyboard: 'organ', instruments: ['acordeón','bajo sexto','bajo eléctrico','tarola'], moods: ['fronterizo','bailable','nostálgico'], promptTokens: ['norteño mexicano','acordeón al frente','bajo sexto rítmico','pulso norteño'], imagery: ['baile de salón','frontera al amanecer','acordeón en primer plano'], culturalNotes: 'Deja espacio para la respuesta del acordeón; el fraseo y la instrumentación varían por región.', tags: ['norteño','norteno','acordeón','regional mexicano'] },
  { id: 'cumbia-sonidera', name: 'Cumbia sonidera', family: 'Cumbia & Caribe', bpm: [88,108], defaultBpm: 96, beatsPerBar: 4, modes: ['aeolian','dorian','mixolydian'], drums: 'sonidera', guitar: 'pluck-world', keyboard: 'organ', instruments: ['güiro','congas','bajo eléctrico','órgano','metales de respuesta'], moods: ['barrial','festivo','hipnótico'], promptTokens: ['cumbia sonidera','güiro constante','órgano cumbiero','bajo sincopado'], imagery: ['pista de barrio','luces de sonidero','bocinas al aire libre'], culturalNotes: 'Conserva el vaivén y deja espacio a variantes y fraseos locales.', tags: ['cumbia sonidera','sonidera','cumbia','mexico'] },
  { id: 'salsa-colombiana', name: 'Salsa colombiana', family: 'Salsa & música afrocaribeña', bpm: [88,112], defaultBpm: 102, beatsPerBar: 4, modes: ['mixolydian','ionian','dorian'], drums: 'salsaClave', guitar: 'pluck-world', keyboard: 'organ', lead: 'brass', instruments: ['congas','campana','timbal','bajo tumbao','piano montuno','metales'], moods: ['celebratorio','virtuoso','callejero'], promptTokens: ['salsa colombiana','clave y campana','tumbao de bajo','montuno de piano'], imagery: ['salón caleño','bailadores en rueda','metales en vivo'], culturalNotes: 'La clave orienta el arreglo; evita fijar una sola escuela o acento como universal.', tags: ['salsa colombiana','salsa caleña','salsa','colombia'] },
  { id: 'guaracha', name: 'Guaracha', family: 'Cumbia & Caribe', bpm: [124,148], defaultBpm: 136, beatsPerBar: 4, modes: ['mixolydian','dorian','aeolian'], drums: 'guaracha', guitar: 'pluck-world', keyboard: 'organ', bass: 'bass-sub', lead: 'lead-sync', instruments: ['congas','timbales','campana','piano montuno','bajo percusivo'], moods: ['vertiginoso','festivo','luminoso'], promptTokens: ['guaracha latina','percusión rápida','campana al frente','montuno energético'], imagery: ['salón lleno','destellos cromáticos','rueda de baile'], culturalNotes: 'Tempo y arreglos varían entre escenas; usa el perfil como punto de partida, no como norma fija.', tags: ['guaracha','guaracha latina','latin dance'] },
  { id: 'salsaton', name: 'Salsatón', family: 'Salsa & música urbana', bpm: [88,104], defaultBpm: 96, beatsPerBar: 4, modes: ['dorian','aeolian','mixolydian'], drums: 'dembow', guitar: 'pluck-world', keyboard: 'organ', bass: 'bass-sub', lead: 'lead-sync', instruments: ['dembow','congas','campana','piano montuno','sub bass','metales'], moods: ['urbano','bailable','atrevido'], promptTokens: ['salsatón original','fusión de clave y dembow','montuno con sub bass','percusión latina híbrida'], imagery: ['neón tropical','cabina de DJ','pista de baile contemporánea'], culturalNotes: 'Cruza los acentos de salsa y urbano sin borrar sus raíces; permite cambiar la proporción.', tags: ['salsatón','salsaton','salsa urbana','latin fusion'] },
  { id: 'rap-barrio', name: 'Rap de barrio', family: 'Hip hop & rap', bpm: [76,100], defaultBpm: 88, beatsPerBar: 4, modes: ['aeolian','dorian','minor-pentatonic'], drums: 'boomBap', keyboard: 'epiano', instruments: ['batería boom bap','bajo seco','piano eléctrico','percusión de mano','textura de cinta'], moods: ['narrativo','crudo','reflexivo'], promptTokens: ['rap de barrio original','boom bap con swing','voz narrativa al frente','bajo firme y discreto'], imagery: ['esquina al atardecer','mural comunitario','libreta de rimas'], culturalNotes: 'La voz y el contexto pertenecen a quien crea; evita caricaturizar o glorificar violencia como atajo.', tags: ['rap de barrio','rap','hip hop latino','hip-hop'] },
  { id: 'industrial-hiphop', name: 'Hip hop industrial', family: 'Hip hop & rap', bpm: [82,112], defaultBpm: 96, beatsPerBar: 4, modes: ['phrygian','aeolian','locrian'], drums: 'industrialHipHop', guitar: 'noise', keyboard: 'epiano', bass: 'bass-sub', lead: 'lead-sync', instruments: ['percusión metálica','808 saturado controlado','texturas mecánicas','sintes ásperos'], moods: ['mecánico','tenso','urbano'], promptTokens: ['hip hop industrial','percusión metálica','808 saturado controlado','textura mecánica con groove'], imagery: ['taller nocturno','acero cepillado','luces de fábrica'], culturalNotes: 'Construye aspereza con dinámica y textura, conserva espacio para la voz y controla el subgrave.', tags: ['industrial hip hop','hip hop industrial','hip-hop industrial','industrial'] },
  { id: 'trova', name: 'Trova acústica', family: 'Canción de autor', bpm: [64,96], defaultBpm: 78, beatsPerBar: 4, modes: ['ionian','dorian','aeolian'], drums: 'bossa', keyboard: 'felt-piano', lead: 'wind', instruments: ['guitarra de nylon','voz cercana','contrabajo ligero','percusión con escobillas'], moods: ['íntimo','poético','contemplativo'], promptTokens: ['trova acústica','guitarra de nylon','letra narrativa al frente','arreglo con espacio'], imagery: ['café pequeño','cuaderno manuscrito','luz de ventana'], culturalNotes: 'La letra y la interpretación guían la canción; acompaña sin imponer un estilo vocal único.', tags: ['trova','canción de autor','cancion de autor','acústico'] },
  { id: 'pop-ballad', name: 'Balada pop', family: 'Pop & canción', bpm: [66,94], defaultBpm: 78, beatsPerBar: 4, modes: ['ionian','aeolian','harmonic-minor'], drums: 'rnb', keyboard: 'felt-piano', lead: 'strings', instruments: ['piano','guitarra limpia','cuerdas suaves','batería contenida','coros'], moods: ['romántico','vulnerable','esperanzador'], promptTokens: ['balada pop contemporánea','piano íntimo','coro expansivo','crecimiento dinámico'], imagery: ['escenario en penumbra','lluvia en la ventana','última luz del día'], culturalNotes: 'Construye el clímax con dinámica y arreglo; protege el espacio de la voz y evita sobrecomprimir.', tags: ['balada pop','pop ballad','balada','romántico'] },
  { id: 'remix-fusion', name: 'Remix fusión latina', family: 'Fusión & electrónica', bpm: [100,128], defaultBpm: 116, beatsPerBar: 4, modes: ['dorian','mixolydian','aeolian'], drums: 'dembow', guitar: 'pluck-world', keyboard: 'lead-sync', bass: 'bass-sub', lead: 'bell', instruments: ['percusión latina','sintes modulados','bajo electrónico','guitarra procesada','voces propias'], moods: ['experimental','bailable','cinemático'], promptTokens: ['remix fusión original','cambio de textura por secciones','percusión latina híbrida','transiciones limpias'], imagery: ['collage de luces','cabina híbrida','paisaje urbano tropical'], culturalNotes: 'Usa material propio o autorizado; una mezcla no sustituye licencias de samples o grabaciones ajenas.', tags: ['remix fusión','remix fusion','fusión latina','latin remix'] },
  { id: 'mariachi', name: 'Mariachi contemporáneo', family: 'Regional mexicano', bpm: [76,124], defaultBpm: 96, beatsPerBar: 3, modes: ['ionian','mixolydian','harmonic-minor'], drums: 'sierreño', guitar: 'guitar-clean', keyboard: 'brass', lead: 'brass', instruments: ['violines','trompetas','vihuela','guitarrón','guitarra'], moods: ['solemne','festivo','apasionado'], promptTokens: ['mariachi contemporáneo','violines y trompetas','vihuela rítmica','guitarrón profundo'], imagery: ['plaza al anochecer','arco de violín','traje de gala'], culturalNotes: 'Respeta la instrumentación de conjunto; este perfil no sustituye arreglos hechos por músicos.', tags: ['mariachi','regional mexicano','mexicano'] },
  { id: 'bolero', name: 'Bolero latino', family: 'Canción romántica', bpm: [60,88], defaultBpm: 72, beatsPerBar: 4, modes: ['ionian','aeolian','harmonic-minor'], drums: 'bossa', keyboard: 'felt-piano', lead: 'strings', instruments: ['guitarra de nylon','piano','contrabajo','cuerdas suaves','percusión ligera'], moods: ['íntimo','nostálgico','romántico'], promptTokens: ['bolero latino','guitarra de nylon expresiva','fraseo rubato','armonía romántica cálida'], imagery: ['club de escucha','micrófono antiguo','luz ámbar'], culturalNotes: 'Permite fraseo flexible y variantes regionales; la interpretación humana es central.', tags: ['bolero','bolero latino','romántico'] },
  { id: 'bachata', name: 'Bachata moderna', family: 'Cumbia & Caribe', bpm: [112,136], defaultBpm: 124, beatsPerBar: 4, modes: ['aeolian','dorian','ionian'], drums: 'salsaClave', keyboard: 'epiano', instruments: ['guitarra líder','güira','bongó','bajo','requinto'], moods: ['romántico','bailable','nostálgico'], promptTokens: ['bachata moderna','requinto sincopado','güira y bongó','bajo con anticipaciones'], imagery: ['salón íntimo','cuerdas brillantes','pareja en movimiento'], culturalNotes: 'No reduzcas la bachata a un patrón; articula la guitarra y deja margen a cada artista.', tags: ['bachata','bachata moderna','caribe'] },
  { id: 'merengue', name: 'Merengue', family: 'Cumbia & Caribe', bpm: [116,148], defaultBpm: 132, beatsPerBar: 4, modes: ['ionian','mixolydian','dorian'], drums: 'guaracha', guitar: 'pluck-world', keyboard: 'organ', lead: 'brass', instruments: ['tambora','güira','acordeón','metales','bajo'], moods: ['festivo','enérgico','comunitario'], promptTokens: ['merengue bailable','tambora y güira','acordeón protagonista','metales en llamada y respuesta'], imagery: ['baile de salón','banda en vivo','colores caribeños'], culturalNotes: 'Mantén el pulso y fraseo vivos sin asumir una sola variante de merengue.', tags: ['merengue','merengue típico','caribe'] },
]

GENRES.push(...NATIVE_GENRES.map(createNativeGenre))

export const GENRE_BY_ID: Record<string, GenreProfile> = Object.fromEntries(GENRES.map((g) => [g.id, g]))

export function findGenre(text: string): GenreProfile | null {
  const t = normalize(text)
  let best: { g: GenreProfile; score: number } | null = null
  for (const g of GENRES) {
    let score = 0
    if (t.includes(normalize(g.id))) score += 6
    if (t.includes(normalize(g.name))) score += 5
    for (const tag of g.tags) if (t.includes(normalize(tag))) score += 3
    for (const inst of g.instruments) if (t.includes(normalize(inst.split(' ')[0]))) score += 0.5
    if (score > 0 && (!best || score > best.score)) best = { g, score }
  }
  return best?.g ?? null
}

export function genreDrum(name: string): DrumPattern | undefined {
  return DRUM_PATTERNS[name]
}
