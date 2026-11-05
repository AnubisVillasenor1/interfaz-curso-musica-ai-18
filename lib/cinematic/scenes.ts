import type { ModeName } from '@/lib/music/theory'

/**
 * Guion de la experiencia cinemática.
 *
 * Cada acto es a la vez una escena 3D y un campo armónico: el intro puede
 * puntuarse solo con el motor musical local (Tone.js) sin llamadas de red,
 * así que el color visual y el color sonoro salen del mismo dato.
 */
export interface CinematicAct {
  id: string
  kicker: string
  /** Líneas del título principal; se pintan en el DOM, no en WebGL. */
  title: string[]
  body: string
  /** Etiqueta corta del indicador de progreso. */
  chip: string
  palette: {
    /** Luz principal / borde de los anillos. */
    key: string
    /** Relleno del núcleo holográfico. */
    core: string
    /** Niebla y fondo del nebula. */
    fog: string
    /** Acento cálido para partículas dispersas. */
    ember: string
  }
  camera: {
    position: [number, number, number]
    target: [number, number, number]
    fov: number
  }
  /** Duración en modo automático (segundos). */
  duration: number
  /** Campo armónico para la cama sonora del acto. */
  music: {
    tonicPc: number
    mode: ModeName
    bpm: number
    /** Textura: 'pad' sostenido o 'pulse' rítmico suave. */
    texture: 'pad' | 'pulse'
  }
  /** Densidad relativa del campo de partículas (0-1). */
  density: number
  /** Fuerza del vórtice en la transición (0-1). */
  vortex: number
}

export const CINEMATIC_ACTS: CinematicAct[] = [
  {
    id: 'origenes',
    kicker: 'ORÍGENES · REAL DEL MONTE',
    title: ['Entre montaña', 'y neblina'],
    body: 'Oculto entre mitos y leyendas, nace una nueva forma de transmitir ideas.',
    chip: 'Orígenes',
    palette: {
      key: '#8ef2ff',
      core: '#12435c',
      fog: '#03101a',
      ember: '#ffcf8f',
    },
    camera: { position: [0.4, 1.1, 13.2], target: [0, 0.15, 0], fov: 46 },
    duration: 9,
    music: { tonicPc: 2, mode: 'aeolian', bpm: 68, texture: 'pad' },
    density: 0.42,
    vortex: 0.12,
  },
  {
    id: 'infraestructura',
    kicker: 'INFRAESTRUCTURA SOBERANA',
    title: ['TAMV ONLINE', 'NETWORK'],
    body: 'Tecnología Avanzada Mexicana Versátil. Libertad y arquitectura de sistemas.',
    chip: 'Red',
    palette: {
      key: '#7ff0d6',
      core: '#0d5a58',
      fog: '#02131b',
      ember: '#ffb765',
    },
    camera: { position: [-2.6, 0.6, 9.4], target: [0.2, 0, 0], fov: 52 },
    duration: 9,
    music: { tonicPc: 7, mode: 'dorian', bpm: 84, texture: 'pulse' },
    density: 0.72,
    vortex: 0.34,
  },
  {
    id: 'manifiesto',
    kicker: 'MANIFIESTO DIGITAL',
    title: ['Ritmo latino y', 'memoria digital'],
    body: 'Para dar vida y sentimiento a todo aquello que merece ser grabado para siempre.',
    chip: 'Manifiesto',
    palette: {
      key: '#ff9ecb',
      core: '#5c1f6e',
      fog: '#0a0518',
      ember: '#ffd7a1',
    },
    camera: { position: [1.9, -0.5, 7.8], target: [-0.1, 0.1, 0], fov: 56 },
    duration: 9,
    music: { tonicPc: 9, mode: 'phrygian-dominant', bpm: 96, texture: 'pulse' },
    density: 0.88,
    vortex: 0.58,
  },
  {
    id: 'estudio',
    kicker: 'ESTUDIO · IA MUSICAL',
    title: ['Tu primera canción', 'empieza aquí'],
    body: 'Compón, aprende y publica. El motor trabaja en tu navegador, sin licencias ajenas.',
    chip: 'Estudio',
    palette: {
      key: '#8ceafc',
      core: '#1b5f86',
      fog: '#041220',
      ember: '#ffd28a',
    },
    camera: { position: [0, 0.2, 8.2], target: [0, 0, 0], fov: 52 },
    duration: 7,
    music: { tonicPc: 0, mode: 'ionian', bpm: 104, texture: 'pad' },
    density: 1,
    vortex: 0.78,
  },
]

/** Paleta usada por el fallback sin WebGL y por el andamiaje de la página. */
export const CINEMATIC_BASE_FOG = '#020408'

export function actAt(index: number): CinematicAct {
  const max = CINEMATIC_ACTS.length - 1
  return CINEMATIC_ACTS[Math.max(0, Math.min(max, index))]
}
