/**
 * Hook & Bridge: interpretación local de una idea corta y rutas de salida.
 *
 * Este módulo no genera audio ni llama a un modelo. Traduce dos o tres palabras
 * al vocabulario que ya entiende `compose()` (género, tempo, semilla) y devuelve
 * las tres rutas que el asistente puede ofrecer. Es determinista y se puede
 * probar en Node sin Web Audio.
 *
 * La regla editorial es la misma del resto del producto: nada de confianzas
 * inventadas ni de promesas de ingresos. Cuando el catálogo local no tiene un
 * género exacto (por ejemplo, cumbia), se dice que es una aproximación.
 */

import { titleFrom } from './arrangement'
import { GENRES, findGenre } from './genres'

export type HookRouteId = 'producer' | 'developer' | 'business'

export interface HookRouteAction {
  label: string
  href: string
  /** `primary` es la acción recomendada; `ghost` es una salida secundaria. */
  tone?: 'primary' | 'ghost'
}

export interface HookRoute {
  id: HookRouteId
  eyebrow: string
  cardTitle: string
  cardCopy: string
  cta: string
  headline: string
  body: string
  learn: string[]
  challenge: string
  actions: HookRouteAction[]
  assistantReply: string
  assistantQuestion: string
}

export const HOOK_ROUTES: HookRoute[] = [
  {
    id: 'producer',
    eyebrow: 'Ruta musical',
    cardTitle: 'Quiero producir mi propio sonido',
    cardCopy:
      'Aprende a decidir frecuencia, envolvente, acordes y mezcla. El botón te dio una pista; el criterio te convierte en productor.',
    cta: 'Ver la ruta de productor',
    headline: 'De escuchar una pista a dirigir cada decisión',
    body:
      'El curso base empieza por las cinco decisiones que sí cambian un arreglo: género, emoción, instrumentos, tempo y estructura. No necesitas saber leer música para empezar.',
    learn: [
      'Diseñar un sonido desde la oscilación y la envolvente.',
      'Construir acordes y progresiones que sostengan una emoción.',
      'Mezclar voces, bajo y percusión sin tapar la idea.',
      'Preparar un WAV para publicar o compartir con criterio.',
    ],
    challenge:
      'Abre la primera sesión y cambia una sola decisión del arreglo que acabas de escuchar. Escribe qué cambió en el carácter.',
    actions: [
      { label: 'Empezar la sesión 1', href: '/curso/m01/m01-l01', tone: 'primary' },
      { label: 'Ver el programa completo', href: '/curso', tone: 'ghost' },
    ],
    assistantReply:
      'Tu primera pista ya existe. La ruta de productor te enseña a controlar lo que acabas de oír en lugar de volver a presionar el botón.',
    assistantQuestion: 'Quiero aprender a producir. ¿Cuál es mi primer paso?',
  },
  {
    id: 'developer',
    eyebrow: 'Ruta técnica',
    cardTitle: 'Quiero construir mi propia app de música',
    cardCopy:
      'La pista se sintetizó con Web Audio API y Tone.js dentro de tu navegador. Ese mismo mecanismo se puede programar, medir y extender.',
    cta: 'Ver la ruta de desarrollador',
    headline: 'El navegador ya es tu estudio; ahora aprende a programarlo',
    body:
      'El laboratorio técnico conecta TypeScript, Web Audio, DSP y Python. Empiezas con una señal y terminas con una herramienta que puedes desplegar.',
    learn: [
      'Programar sintetizadores y transporte con TypeScript y Tone.js.',
      'Leer un espectro, un chroma y una estimación de tonalidad.',
      'Separar la lógica de audio de la interfaz y probarla.',
      'Publicar una app musical con límites y transparencia.',
    ],
    challenge:
      'Abre el laboratorio y localiza el tempo y la forma de onda de la pista. Cambia uno y escucha la diferencia antes de tocar el otro.',
    actions: [
      { label: 'Abrir el laboratorio técnico', href: '/curso/laboratorio-audio', tone: 'primary' },
      { label: 'Ver el plan de módulos', href: '/curso/laboratorio-audio#modulos', tone: 'ghost' },
    ],
    assistantReply:
      'La pista que escuchaste es un grafo de audio construido en tu navegador. La ruta técnica te enseña a construir ese grafo tú mismo.',
    assistantQuestion: 'Quiero aprender a programar apps musicales. ¿Por dónde empiezo?',
  },
  {
    id: 'business',
    eyebrow: 'Ruta de producto',
    cardTitle: 'Quiero convertir esta habilidad en valor real',
    cardCopy:
      'Herramientas musicales, plantillas, servicios de producción o micro-SaaS. Sin prometer ingresos: con problemas reales, costos claros y trabajo verificable.',
    cta: 'Ver la ruta de producto',
    headline: 'Aprende a resolver un problema musical, no a vender humo',
    body:
      'La ruta de producto parte de una necesidad concreta de un artista, una escuela o un estudio. El curso y el laboratorio te dan la capacidad; el proyecto y el portafolio la hacen visible.',
    learn: [
      'Detectar un problema que alguien ya está intentando resolver.',
      'Elegir entre servicio, plantilla, licencia o suscripción.',
      'Calcular costos, límites y precio antes de prometer.',
      'Publicar un proyecto pequeño y medir si ayuda de verdad.',
    ],
    challenge:
      'Escribe una herramienta musical que resolvería un problema de una persona real que conozcas. Una frase, sin adornos.',
    actions: [
      { label: 'Ver planes y qué incluye cada uno', href: '/precios', tone: 'primary' },
      { label: 'Leer el proyecto final del curso', href: '/curso/proyecto-final', tone: 'ghost' },
    ],
    assistantReply:
      'No puedo prometerte ingresos. Sí puedo mostrarte qué habilidad se vende, qué costos existen y cómo construir un proyecto pequeño que puedas defender con evidencia.',
    assistantQuestion: 'Quiero convertir mi habilidad musical en un producto. ¿Qué puedo hacer sin prometer ingresos?',
  },
]

export function hookRouteById(id: string | null | undefined): HookRoute | undefined {
  return HOOK_ROUTES.find((route) => route.id === id)
}

export interface HookPreset {
  label: string
  idea: string
}

/** Puntos de partida cortos: una idea por tarjeta, no un formulario. */
export const HOOK_PRESETS: HookPreset[] = [
  { label: 'Electro chill armónico', idea: 'Electro chill armónico' },
  { label: 'Jazz suave nocturno', idea: 'Jazz suave nocturno' },
  { label: 'Synthwave retro 80s', idea: 'Synthwave retro 80s' },
  { label: 'Lo-fi para estudiar', idea: 'Lo-fi para estudiar' },
  { label: 'Trap oscuro cinematográfico', idea: 'Trap oscuro cinematográfico' },
  { label: 'Piano melancólico lluvia', idea: 'Piano melancólico lluvia' },
  { label: 'Beat motivacional épico', idea: 'Beat motivacional épico' },
  { label: 'Ambient espacial relajante', idea: 'Ambient espacial relajante' },
  { label: 'Reggaetón romántico', idea: 'Reggaetón romántico' },
  { label: 'Cumbia moderna festiva', idea: 'Cumbia moderna festiva' },
]

export interface HookMatch {
  token: string
  genreId: string
  genreName: string
  note: string
}

export interface IdeaInterpretation {
  idea: string
  title: string
  genreId: string
  genreName: string
  /** Tempo sugerido por las palabras; `undefined` deja que `compose` lo decida. */
  bpm?: number
  matches: HookMatch[]
  moods: string[]
  rationale: string
  seed: string
  /** `true` cuando el género es una aproximación del catálogo, no el exacto. */
  approximate: boolean
}

interface GenreRule {
  token: string
  pattern: RegExp
  genreId: string
  weight: number
  bpm?: number
  note: string
  approximate?: boolean
}

/**
 * El orden no decide el resultado: gana el peso. Las combinaciones conocidas
 * pesan más que una palabra suelta para que «electro chill» no se convierta en
 * un EDM de festival solo porque «electro» aparezca primero.
 */
const GENRE_RULES: GenreRule[] = [
  {
    token: 'electro chill',
    pattern: /electro[^.]{0,24}chill|chill[^.]{0,24}electro/i,
    genreId: 'downtempo',
    weight: 8,
    bpm: 88,
    note: 'electrónica suave, más cercana a downtempo que a un drop de festival',
  },
  {
    token: 'trap oscuro',
    pattern: /trap[^.]{0,24}oscur|oscur[^.]{0,24}trap/i,
    genreId: 'trap',
    weight: 8,
    bpm: 140,
    note: 'trap con espacio para graves y una atmósfera tensa',
  },
  {
    token: 'piano melancólico',
    pattern: /piano[^.]{0,24}melanc|melanc[^.]{0,24}piano|lluvia/i,
    genreId: 'classical',
    weight: 8,
    bpm: 70,
    note: 'piano y cuerdas como centro, sin batería dominante',
  },
  {
    token: 'synthwave retro',
    pattern: /synthwave|retro[^.]{0,16}80|80[^.]{0,16}retro/i,
    genreId: 'synthwave',
    weight: 7,
    bpm: 100,
    note: 'sintes analógicos, pulso retro y brillo ochentero',
  },
  {
    token: 'reggaetón romántico',
    pattern: /reggaet[oó]n[^.]{0,24}romant|romant[^.]{0,24}reggaet/i,
    genreId: 'reggaeton',
    weight: 7,
    bpm: 92,
    note: 'dembow suave con armonía cálida',
  },
  {
    token: 'cumbia',
    pattern: /cumbia/i,
    genreId: 'afrobeat',
    weight: 6,
    bpm: 96,
    note: 'aproximación rítmica del catálogo caribeño/africano; no es una cumbia auténtica',
    approximate: true,
  },
  {
    token: 'motivacional épico',
    pattern: /motivacion[^.]{0,24}epic|epic[^.]{0,24}motivacion/i,
    genreId: 'cinematic',
    weight: 7,
    bpm: 90,
    note: 'cuerdas, tambores y un ascenso claro',
  },
  {
    token: 'lo-fi',
    pattern: /lo-?fi|chill|estudiar|concentr|focus/i,
    genreId: 'lofi',
    weight: 5,
    bpm: 78,
    note: 'textura cálida, poca densidad y ruido de vinilo',
  },
  {
    token: 'jazz',
    pattern: /jazz|swing|bop/i,
    genreId: 'jazz',
    weight: 6,
    bpm: 96,
    note: 'acordes extendidos y una cadencia de swing',
  },
  {
    token: 'synthwave',
    pattern: /synthwave|retrowave|vapor/i,
    genreId: 'synthwave',
    weight: 6,
    bpm: 100,
    note: 'sintes anchos y pulso retro',
  },
  {
    token: 'reggaetón',
    pattern: /reggaet[oó]n|dembow/i,
    genreId: 'reggaeton',
    weight: 6,
    bpm: 92,
    note: 'dembow y bajo cálido',
  },
  {
    token: 'trap',
    pattern: /trap/i,
    genreId: 'trap',
    weight: 6,
    bpm: 140,
    note: 'hi-hats rápidos y 808',
  },
  {
    token: 'drill',
    pattern: /drill/i,
    genreId: 'drill',
    weight: 6,
    bpm: 142,
    note: 'deslizamientos de 808 y hi-hats con swing',
  },
  {
    token: 'house',
    pattern: /house/i,
    genreId: 'house',
    weight: 6,
    bpm: 124,
    note: 'cuatro por cuatro y bajo con filtro',
  },
  {
    token: 'techno',
    pattern: /techno/i,
    genreId: 'techno',
    weight: 6,
    bpm: 132,
    note: 'pulso hipnótico y percusión seca',
  },
  {
    token: 'ambient',
    pattern: /ambient|espacial|drone|relajante|meditaci/i,
    genreId: 'ambient',
    weight: 5,
    bpm: 64,
    note: 'capas sostenidas y ausencia de urgencia rítmica',
  },
  {
    token: 'cinemático',
    pattern: /cinemat|trailer|banda sonora|orquest|épic|epic/i,
    genreId: 'cinematic',
    weight: 5,
    bpm: 82,
    note: 'capas orquestales y dinámica de escena',
  },
  {
    token: 'piano',
    pattern: /piano|balada|neoclás|neoclas/i,
    genreId: 'classical',
    weight: 5,
    bpm: 72,
    note: 'piano como voz principal',
  },
  {
    token: 'corrido',
    pattern: /corrido|tumbado|regional mexicano|sierreñ/i,
    genreId: 'corrido',
    weight: 6,
    bpm: 92,
    note: 'guitarra acústica, requinto y un tono narrativo',
  },
  {
    token: 'rock',
    pattern: /rock|indie/i,
    genreId: 'rock',
    weight: 5,
    bpm: 118,
    note: 'guitarras y batería orgánica',
  },
  {
    token: 'metal',
    pattern: /metal|metalcore/i,
    genreId: 'metal',
    weight: 6,
    bpm: 150,
    note: 'guitarras distorsionadas y percusión densa',
  },
  {
    token: 'pop',
    pattern: /pop/i,
    genreId: 'pop',
    weight: 4,
    bpm: 104,
    note: 'estructura clara y hook repetible',
  },
  {
    token: 'bossa',
    pattern: /bossa|brasil/i,
    genreId: 'bossa',
    weight: 5,
    bpm: 96,
    note: 'guitarra nylon y armonía suave',
  },
  {
    token: 'flamenco',
    pattern: /flamenco|rumba|duende/i,
    genreId: 'flamenco',
    weight: 6,
    bpm: 100,
    note: 'compás y tensión mediterránea',
  },
  {
    token: 'funk',
    pattern: /funk|disco/i,
    genreId: 'funk',
    weight: 6,
    bpm: 108,
    note: 'groove en la subdivisión y bajo activo',
  },
  {
    token: 'neo-soul',
    pattern: /neo-?soul|r&b|soul/i,
    genreId: 'neosoul',
    weight: 5,
    bpm: 88,
    note: 'acordes extendidos y batería relajada',
  },
  {
    token: 'afrobeat',
    pattern: /afrobeat|afro/i,
    genreId: 'afrobeat',
    weight: 6,
    bpm: 104,
    note: 'polirritmia y percusión de apoyo',
  },
  {
    token: 'k-pop',
    pattern: /k-?pop|hyperpop/i,
    genreId: 'kpop',
    weight: 6,
    bpm: 120,
    note: 'secciones contrastantes y brillo pop',
  },
  {
    token: 'country',
    pattern: /country|americana/i,
    genreId: 'country',
    weight: 6,
    bpm: 92,
    note: 'guitarra acústica y narrativa directa',
  },
  {
    token: 'videojuego',
    pattern: /videojuego|chip ?tune|8-?bit|gamer/i,
    genreId: 'gamemusic',
    weight: 6,
    bpm: 128,
    note: 'sintes de chip y melodía protagonista',
  },
  {
    token: 'worship',
    pattern: /worship|espiritual|gospel/i,
    genreId: 'worship',
    weight: 6,
    bpm: 72,
    note: 'capas amplias y resolución lenta',
  },
  {
    token: 'downtempo',
    pattern: /downtempo|trip-?hop/i,
    genreId: 'downtempo',
    weight: 6,
    bpm: 88,
    note: 'graves lentos y textura de sample',
  },
  {
    token: 'electro',
    pattern: /electro|electrónica|electronica|edm|festival/i,
    genreId: 'edm',
    weight: 4,
    bpm: 126,
    note: 'sintes de festival y un pulso explícito',
  },
]

const MOOD_RULES: Array<{ label: string; pattern: RegExp }> = [
  { label: 'oscuro', pattern: /oscur|dark|tensi[oó]n|nocturn/i },
  { label: 'cálido', pattern: /c[aá]lid|warm|suave|acogedor/i },
  { label: 'melancólico', pattern: /melanc|triste|lluvia|nostalg/i },
  { label: 'épico', pattern: /[eé]pic|heroic|motivacion|ascenso/i },
  { label: 'relajante', pattern: /relaj|calm|medit|dormir|chill/i },
  { label: 'bailable', pattern: /bailable|fiesta|baile|club|dembow/i },
  { label: 'romántico', pattern: /rom[aá]ntic|amor|intim/i },
  { label: 'brillante', pattern: /brillante|luminos|feliz|alegre|solead/i },
]

function hash32(text: string): number {
  let hash = 2166136261
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}

function clampBpm(value: number): number {
  return Math.min(200, Math.max(40, Math.round(value)))
}

/**
 * Interpreta una idea corta. Lanza `RangeError` solo con entradas que la
 * interfaz ya debería bloquear: vacías o mayores que el campo.
 */
export function interpretIdea(idea: string, variant = 1): IdeaInterpretation {
  const text = idea.trim().replace(/\s+/g, ' ')
  if (text.length < 2) throw new RangeError('Escribe al menos dos caracteres.')
  if (text.length > 80) throw new RangeError('La idea no puede superar 80 caracteres.')

  const matches: HookMatch[] = []
  let winner: { rule: GenreRule; genreName: string } | null = null

  for (const rule of GENRE_RULES) {
    if (!rule.pattern.test(text)) continue
    const genre = GENRES.find((item) => item.id === rule.genreId)
    if (!genre) continue
    matches.push({
      token: rule.token,
      genreId: rule.genreId,
      genreName: genre.name,
      note: rule.note,
    })
    if (!winner || rule.weight > winner.rule.weight) winner = { rule, genreName: genre.name }
  }

  const fallback = findGenre(text)
  const fallbackGenre = fallback ?? GENRES[hash32(text) % GENRES.length]
  const genreId = winner?.rule.genreId ?? fallbackGenre.id
  const genreName = winner?.genreName ?? fallbackGenre.name

  const moods = MOOD_RULES.filter((mood) => mood.pattern.test(text)).map((mood) => mood.label)

  const explicitBpm = text.match(/(\d{2,3})\s*(?:bpm|pulsos?)/i)
  const bpm = explicitBpm
    ? clampBpm(Number(explicitBpm[1]))
    : winner?.rule.bpm ?? (text.match(/lento|slow|calm|dormir|medit/i) ? fallbackGenre.bpm[0] : undefined)

  const rationale = winner
    ? `«${winner.rule.token}» → ${genreName}. ${winner.rule.note}.`
    : `Sin una palabra de género reconocible: el catálogo local usó «${genreName}» y una semilla determinista.`

  return {
    idea: text,
    title: titleFrom(text),
    genreId,
    genreName,
    bpm,
    matches,
    moods,
    rationale,
    seed: `${text}:v${Math.max(1, Math.trunc(variant))}`,
    approximate: Boolean(winner?.rule.approximate),
  }
}

/** Enlace al asistente del curso con el contexto del Instant Composer. */
export function assistantHref(idea: string, routeId?: HookRouteId): string {
  const params = new URLSearchParams()
  if (routeId) params.set('asistente', routeId)
  if (idea.trim()) params.set('idea', idea.trim().slice(0, 80))
  const query = params.toString()
  return `/${query ? `?${query}` : ''}#asistente`
}

export const HOOK_LIMITS = {
  minChars: 2,
  maxChars: 80,
  curiosityDelayMs: 15_000,
} as const
