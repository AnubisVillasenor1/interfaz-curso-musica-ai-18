import type { ModeName } from '@/lib/music/theory'

/**
 * Guion de la experiencia cinemática.
 *
 * Cada acto es a la vez una escena 3D y un campo armónico: el intro puede
 * puntuarse solo con el motor musical local (Tone.js) sin llamadas de red,
 * así que el color visual y el color sonoro salen del mismo dato.
 *
 * Seis actos de diez segundos exactos = 60 s, la duración del bed recortado.
 * El arco no es decorativo: niebla → red → oficio → memoria → agentes → canción,
 * con la cámara, la paleta y la densidad subiendo juntas hacia el final.
 */

/** Trayectoria continua de la cámara dentro del acto (ver CameraRig). */
export type CameraPath = 'orbit' | 'arc' | 'crane' | 'push' | 'pull' | 'rise'

/** Qué capa domina la composición en cada acto; el resto se retrae. */
export interface ActFocus {
  /** Núcleo holográfico. */
  core: number
  /** Anillos de energía. */
  rings: number
  /** Campo de partículas. */
  field: number
  /** Filetes orbitales. */
  arcs: number
  /** Destello anamórfico. */
  streak: number
}

/** Grade de color por acto, aplicado como filtro CSS sobre la capa WebGL. */
export interface ActGrade {
  /** Multiplicador de saturación (1 = neutro). */
  saturation: number
  /** Multiplicador de contraste suave. */
  contrast: number
  /** Luminosidad percibida; 1.02 ya "levanta" un acto nocturno. */
  brightness: number
  /** Desplazamiento cromático en grados de tinte; negativo enfría. */
  hue: number
  /** Opacidad de la vela de color que tiñe las luces. */
  veil: number
  /** Intensidad del bloom dentro del EffectComposer. */
  bloom: number
  /** Exposición del tone mapping de ACES. */
  exposure: number
}

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
    /** Radio de barrido de la trayectoria continua, en unidades de escena. */
    swing: number
    /** Velocidad angular del barrido, en rad/s. 0.05 = un grado por segundo. */
    rate: number
    /** Desplazamiento de dolly a lo largo del acto; positivo acerca al sujeto. */
    dolly: number
    /** Elevación de grúa acumulada durante el acto. */
    rise: number
    /** Trayectoria. */
    path: CameraPath
    /** Amplitud del micro-temblor de operador, en unidades. 0 = trípode. */
    handheld: number
    /** Balanceo máximo de alabeo en radianes (0.012 ≈ 0.7°). */
    roll: number
    /** Rigidez del muelle de cámara; 1.1 = travelling largo y suave. */
    stiffness: number
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
  focus: ActFocus
  grade: ActGrade
}

export const CINEMATIC_ACTS: CinematicAct[] = [
  {
    id: 'origenes',
    kicker: 'ORÍGENES · REAL DEL MONTE',
    title: ['Entre montaña', 'y neblina'],
    body: 'Desde la niebla mineral de Real del Monte, una nueva escena creativa convierte memoria, tecnología y sonido en una experiencia propia.',
    chip: 'Orígenes',
    palette: {
      key: '#8ef2ff',
      core: '#12435c',
      fog: '#03101a',
      ember: '#ffcf8f',
    },
    camera: {
      position: [0.4, 1.1, 13.2],
      target: [0, 0.15, 0],
      fov: 46,
      // Apertura: travelling lento de costado, todavía lejos del sujeto.
      path: 'orbit',
      swing: 2.1,
      rate: 0.055,
      dolly: 1.1,
      rise: 0.25,
      handheld: 0.05,
      roll: 0.011,
      stiffness: 0.95,
    },
    duration: 10,
    music: { tonicPc: 2, mode: 'aeolian', bpm: 66, texture: 'pad' },
    density: 0.4,
    vortex: 0.12,
    focus: { core: 0.5, rings: 0.35, field: 0.85, arcs: 0.4, streak: 0.3 },
    grade: { saturation: 0.92, contrast: 1.04, brightness: 0.97, hue: -3, veil: 0.34, bloom: 0.78, exposure: 1.05 },
  },
  {
    id: 'infraestructura',
    kicker: 'INFRAESTRUCTURA SOBERANA',
    title: ['TAMV ONLINE', 'NETWORK'],
    body: 'Una infraestructura creativa nacida en Latinoamérica: abierta al conocimiento, diseñada para conectar personas, herramientas y posibilidades.',
    chip: 'Red',
    palette: {
      key: '#7ff0d6',
      core: '#0d5a58',
      fog: '#02131b',
      ember: '#ffb765',
    },
    camera: {
      position: [-2.6, 0.6, 9.4],
      target: [0.2, 0, 0],
      fov: 52,
      // Ascenso de grúa: la red se descubre desde abajo hacia arriba.
      path: 'crane',
      swing: 1.4,
      rate: 0.075,
      dolly: 1.6,
      rise: 1.5,
      handheld: 0.04,
      roll: 0.014,
      stiffness: 1.05,
    },
    duration: 10,
    music: { tonicPc: 7, mode: 'dorian', bpm: 76, texture: 'pulse' },
    density: 0.66,
    vortex: 0.3,
    focus: { core: 0.7, rings: 0.85, field: 0.7, arcs: 0.75, streak: 0.45 },
    grade: { saturation: 1.0, contrast: 1.06, brightness: 1.0, hue: 0, veil: 0.3, bloom: 0.9, exposure: 1.1 },
  },
  {
    id: 'método',
    kicker: 'MÉTODO · APRENDER HACIENDO',
    title: ['Del oído', 'al instrumento'],
    body: 'Aprende con intención. Comprende el lenguaje musical, prueba cada decisión y transforma la práctica en criterio creativo.',
    chip: 'Método',
    palette: {
      key: '#ffd489',
      core: '#6b3a12',
      fog: '#0d0a12',
      ember: '#ffe9c4',
    },
    camera: {
      position: [3.1, -0.4, 8.4],
      target: [-0.15, 0.1, 0],
      fov: 50,
      // Arco cerrado alrededor del núcleo: examinar el oficio desde otro ángulo.
      path: 'arc',
      swing: 2.4,
      rate: -0.09,
      dolly: 0.8,
      rise: -0.5,
      handheld: 0.06,
      roll: 0.016,
      stiffness: 1.1,
    },
    duration: 10,
    music: { tonicPc: 4, mode: 'lydian', bpm: 84, texture: 'pad' },
    density: 0.72,
    vortex: 0.42,
    focus: { core: 0.95, rings: 0.6, field: 0.6, arcs: 0.95, streak: 0.55 },
    grade: { saturation: 1.06, contrast: 1.05, brightness: 1.04, hue: 4, veil: 0.36, bloom: 0.86, exposure: 1.14 },
  },
  {
    id: 'manifiesto',
    kicker: 'MANIFIESTO DIGITAL',
    title: ['Ritmo latino', 'y memoria', 'perpetua'],
    body: 'La tecnología amplifica las posibilidades; la sensibilidad humana decide qué merece ser escuchado, compartido y recordado.',
    chip: 'Manifiesto',
    palette: {
      key: '#ff9ecb',
      core: '#5c1f6e',
      fog: '#0a0518',
      ember: '#ffd7a1',
    },
    camera: {
      position: [1.9, -0.5, 7.8],
      target: [-0.1, 0.1, 0],
      fov: 56,
      // Empuje: la cámara entra hacia el pecho del núcleo al compás.
      path: 'push',
      swing: 1.1,
      rate: 0.11,
      dolly: 2.4,
      rise: 0.4,
      handheld: 0.075,
      roll: 0.02,
      stiffness: 1.2,
    },
    duration: 10,
    music: { tonicPc: 9, mode: 'phrygian-dominant', bpm: 92, texture: 'pulse' },
    density: 0.86,
    vortex: 0.56,
    focus: { core: 1, rings: 0.8, field: 0.85, arcs: 0.7, streak: 0.9 },
    grade: { saturation: 1.14, contrast: 1.08, brightness: 1.03, hue: -6, veil: 0.42, bloom: 1.05, exposure: 1.18 },
  },
  {
    id: 'agentes',
    kicker: 'ORQUESTA DE AGENTES',
    title: ['Muchas manos,', 'una sola', 'canción'],
    body: 'Del primer boceto a la entrega final: composición, producción y publicación reunidas en un flujo que mantiene tus decisiones en el centro.',
    chip: 'Agentes',
    palette: {
      key: '#a9b8ff',
      core: '#241f6b',
      fog: '#050417',
      ember: '#8ff0ff',
    },
    camera: {
      position: [-3.4, 1.8, 7.2],
      target: [0.25, -0.1, 0],
      fov: 58,
      // Orbita rápida y alta: el enjambre se ve como sistema, no como detalle.
      path: 'orbit',
      swing: 2.8,
      rate: 0.14,
      dolly: 1.2,
      rise: 1.0,
      handheld: 0.05,
      roll: 0.022,
      stiffness: 1.3,
    },
    duration: 10,
    music: { tonicPc: 10, mode: 'mixolydian', bpm: 100, texture: 'pulse' },
    density: 0.95,
    vortex: 0.68,
    focus: { core: 0.8, rings: 1, field: 1, arcs: 0.85, streak: 0.75 },
    grade: { saturation: 1.1, contrast: 1.1, brightness: 1.05, hue: 6, veil: 0.38, bloom: 1.12, exposure: 1.2 },
  },
  {
    id: 'estudio',
    kicker: 'ESTUDIO · IA MUSICAL',
    title: ['Tu primera canción', 'empieza aquí'],
    body: 'Tu próxima canción empieza con una idea. Aprende, experimenta y construye una obra propia con herramientas accesibles y decisiones conscientes.',
    chip: 'Estudio',
    palette: {
      key: '#8ceafc',
      core: '#1b5f86',
      fog: '#041220',
      ember: '#ffd28a',
    },
    camera: {
      position: [0, 0.2, 8.2],
      target: [0, 0, 0],
      fov: 52,
      // Cierre: se retira a una pose frontal y estable, lista para el botón.
      path: 'pull',
      swing: 1.6,
      rate: -0.06,
      dolly: -2.2,
      rise: -0.3,
      handheld: 0.03,
      roll: 0.009,
      stiffness: 1.0,
    },
    duration: 10,
    music: { tonicPc: 0, mode: 'ionian', bpm: 108, texture: 'pad' },
    density: 1,
    vortex: 0.78,
    focus: { core: 1, rings: 0.9, field: 0.95, arcs: 1, streak: 1 },
    grade: { saturation: 1.08, contrast: 1.05, brightness: 1.08, hue: 0, veil: 0.3, bloom: 1.18, exposure: 1.24 },
  },
]

/** Paleta usada por el fallback sin WebGL y por el andamiaje de la página. */
export const CINEMATIC_BASE_FOG = '#020408'

/** Duración total de la presentación en modo automático: 60 s, el largo del bed. */
export const CINEMATIC_TOTAL_SECONDS = CINEMATIC_ACTS.reduce((sum, act) => sum + act.duration, 0)

export function actAt(index: number): CinematicAct {
  const max = CINEMATIC_ACTS.length - 1
  return CINEMATIC_ACTS[Math.max(0, Math.min(max, index))]
}

/** Filtro CSS de un grade, interpolable entre actos si el navegador lo anima. */
export function gradeFilter(grade: ActGrade): string {
  return `saturate(${grade.saturation.toFixed(3)}) contrast(${grade.contrast.toFixed(3)}) brightness(${grade.brightness.toFixed(3)}) hue-rotate(${grade.hue}deg)`
}

/**
 * Hex → `rgba()`, para las geles del DOM.
 *
 * Se calcula aquí y no con `color-mix()` porque la vela se transiciona en CSS:
 * con un color concreto el navegador puede interpolar, con una función dependiente
 * de una variable no siempre.
 */
export function withAlpha(hex: string, alpha: number): string {
  const value = hex.replace('#', '')
  const full = value.length === 3 ? value.split('').map((char) => char + char).join('') : value
  const num = Number.parseInt(full, 16)
  if (!Number.isFinite(num)) return hex
  const r = (num >> 16) & 255
  const g = (num >> 8) & 255
  const b = num & 255
  return `rgba(${r}, ${g}, ${b}, ${Math.max(0, Math.min(1, alpha)).toFixed(3)})`
}
