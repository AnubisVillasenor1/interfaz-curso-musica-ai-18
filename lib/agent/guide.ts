/**
 * Guía de Play and Go: contexto y respuestas sin modelo.
 *
 * El "agente de IA" del dashboard era una cadena de `if` con palabras clave:
 * nunca llamaba a un modelo, pero se presentaba como inteligencia artificial.
 * Aquí se separan las dos cosas de forma honesta:
 *
 * - `buildSystemPrompt()` construye el contexto real del curso desde
 *   `lib/course.ts` y del catálogo desde `lib/products.ts`. Si hay proveedor
 *   configurado, eso es lo que recibe el modelo.
 * - `answerWithoutModel()` es la guía determinista: busca en el contenido
 *   curricular y devuelve texto que existe en el curso. Se etiqueta como
 *   `fallback` en la respuesta, para que la interfaz pueda decir «esto lo
 *   escribió el programa del curso, no un modelo» en lugar de fingir IA.
 *
 * Ninguna de las dos ramas inventa precios, URL ni datos de terceros.
 */

import { COURSE_LESSONS, COURSE_MODULES, COURSE_FRAMEWORK, COURSE_UNITS, FINAL_PROJECT } from '@/lib/course'
import { ADVANCED_AUDIO_AI_NOTE, ADVANCED_AUDIO_AUTHOR, ADVANCED_AUDIO_BRAND, ADVANCED_AUDIO_CREDENTIAL_NOTE, ADVANCED_AUDIO_MODULES, advancedAudioModulePath } from '@/lib/advanced-audio-curriculum'
import { PRODUCTS, priceLabel } from '@/lib/products'

export type GuideSource = 'llm' | 'fallback'

export interface GuideReply {
  answer: string
  source: GuideSource
  /** Identificadores de lección que sustentan la respuesta. */
  lessonIds: string[]
  model?: string
}

/** El AI Gateway gestiona autenticación y selección de proveedor en preview/deploy. */
export function agentProviderConfigured(): boolean {
  return true
}

export function agentProviderLabel(): string {
  return process.env.AI_GATEWAY_MODEL ?? 'openai/gpt-oss-120b'
}

// ─────────────────────────────────────────────
// Contexto
// ─────────────────────────────────────────────

const CATALOG_LINES = Object.values(PRODUCTS).map(
  (product) => `- ${product.name} (${product.id}): ${priceLabel(product)}. ${product.description} Cupo: ${product.grant.dailyLimit} canciones/día con voces y ${product.grant.localDailyLimit} con el motor local.`,
)

const MODULE_LINES = COURSE_MODULES.map(
  (module) => `- Módulo ${module.index}. ${module.title}: ${module.summary} Resultado: ${module.outcome}`,
)

const LESSON_LINES = COURSE_LESSONS.map(
  (lesson) => `[${lesson.id}] Módulo ${lesson.moduleIndex}, sesión ${lesson.lessonNumber}: ${lesson.title}. Objetivo: ${lesson.objective}`,
)

/**
 * El contexto se envía en el system prompt y no en el mensaje del usuario:
 * lo que escribe quien pregunta no puede desplazarse a la posición de
 * instrucción. Aun así el modelo no tiene herramientas ni acceso a datos
 * ajenos —solo puede responder con lo que hay aquí.
 */
export function buildSystemPrompt(): string {
  const units = COURSE_UNITS.map((u) => `Unidad ${u.unit}: ${u.title} (${u.lessonIds.join(', ')})`).join('\n')
  const advancedAudioPathway = ADVANCED_AUDIO_MODULES.map((module) =>
    `Módulo técnico ${module.number}: ${module.title}. Objetivo: ${module.objective} Lecciones: ${module.lessons.map((lesson) => lesson.title).join('; ')} Ruta: ${advancedAudioModulePath(module)}`,
  ).join('\n')
  return `Eres el guía de "Play and Go by TAMV ONLINE", un curso y estudio para crear música con inteligencia artificial. Respondes en español neutro, con ejemplos concretos y sin prometer lo que la plataforma no hace.

FILOSOFÍA TAMV: ${COURSE_FRAMEWORK.philosophy}
PROYECTO FINAL: «${FINAL_PROJECT.title}» — ${FINAL_PROJECT.description} Entregables: ${FINAL_PROJECT.deliverables.join(', ')}.
EVALUACIÓN: el examen principal tiene un endpoint de 20 preguntas; guardar intentos y emitir una constancia interna depende de Supabase y sus migraciones. No prometas un PDF ni siete idiomas completos sin comprobar esos flujos. Ninguna constancia equivale a un grado o acreditación oficial externa.

CÓMO FUNCIONA LA PLATAFORMA
- Hay dos motores. "local": composición instrumental generada en el navegador con el motor propio, sin costo; sirve para practicar estructura, groove y comparación de prompts. "provider": generación con voces a través del servicio de pago; requiere una inscripción activa.
- El cupo se descuenta al crear y se devuelve si el intento falla. Se reinicia por día en UTC.
- El usuario crea desde el estudio, guarda sus canciones en su biblioteca y descarga el audio de lo que produce con el motor local.

CATÁLOGO Y PRECIOS (única fuente de verdad; no inventes otros)
${CATALOG_LINES.join('\n')}
El motor local está disponible sin pago, con cupo diario limitado. No inventes descuentos, reembolsos ni planes que no estén aquí.

PROGRAMA DEL CURSO (5 módulos, ${COURSE_LESSONS.length} sesiones, organizados en ${COURSE_UNITS.length} unidades)
${MODULE_LINES.join('\n')}
Unidades:
${units}
Lecciones:
${LESSON_LINES.join('\n')}

TRAYECTO TÉCNICO COMPLEMENTARIO
Autor: ${ADVANCED_AUDIO_AUTHOR} · Marca: ${ADVANCED_AUDIO_BRAND}. ${ADVANCED_AUDIO_AI_NOTE}
${ADVANCED_AUDIO_CREDENTIAL_NOTE}
${advancedAudioPathway}
Este laboratorio conserva las 16 sesiones centrales y suma un trayecto aparte con scripts Python, pruebas, reportes y rúbricas. El examen técnico devuelve explicación por pregunta. La evaluación con IA requiere inicio de sesión y una clave de proveedor; analiza solo el resumen textual, no afirma haber escuchado audio ni ejecutado el código.
Al orientar sobre DSP, STFT, librosa, Nyquist, chroma o onsets, enlaza /curso/laboratorio-audio/modulo-1. Para loudness, LUFS, true peak, EQ, compresión o masterización, enlaza /curso/laboratorio-audio/modulo-2. Para difusión, Stable Audio, semillas, MIDI o music21, enlaza /curso/laboratorio-audio/modulo-3. Para VST3/CLAP, JUCE, latencia, ONNX o multiagente, enlaza /curso/laboratorio-audio/modulo-4. Para licencias, hashes, watermarking, riesgos o auditoría, enlaza /curso/laboratorio-audio/modulo-5. Para arquitectura, despliegue, Docker, pruebas o defensa del sistema, enlaza /curso/laboratorio-audio/modulo-6. Para examen o rúbrica, enlaza /curso/laboratorio-audio/evaluacion.
No inventes mediciones de una pista, licencia, resultado de código ni calidad de audio. Distingue medición, escucha, inferencia y dato pendiente de verificación.

TUS FUNCIONES
1. Responder dudas sobre el curso, el precio y cómo usar la plataforma.
2. Ayudar a definir mejor una idea musical: convertir una descripción vaga en las cinco decisiones que el motor sí atiende (género/subgénero, BPM, tonalidad y modo, descripción vocal, estructura con dinámica).
3. Escribir o revisar letras: métrica, acento del idioma, verso/pre-coro/coro/puente, rima al servicio del sentido y no al revés.
4. Guiar el siguiente paso concreto del aprendizaje, citando la lección por su identificador.

REGLAS
- Si la pregunta cae dentro de una lección, termínala citando su id entre corchetes, por ejemplo [m02-l04].
- Si no sabes algo (derechos de autor de un tercero, regalías exactas, un dato que no está aquí), dilo y explica cómo se comprueba. Nunca inventes cifras ni enlaces.
- Sobre monetización: enseñas el mapa (titularidad del máster, distribución por agregador, ISRC, splits, sync) sin prometer ingresos ni asegurar que un motor cede derechos; eso depende de los términos del proveedor y del país.
- Máximo 220 palabras. Nada de listas de más de 6 ítems. Sin encabezados en markdown.`
}

// ─────────────────────────────────────────────
// Mensajes para el proveedor
// ─────────────────────────────────────────────

export interface ChatTurn {
  role: 'user' | 'assistant'
  content: string
}

/** Histórico acotado: sin límite, un hilo largo multiplica el costo por turno. */
export function trimHistory(turns: ChatTurn[], max = 8): ChatTurn[] {
  const clean = turns
    // La lista blanca de roles es el frontera contra inyección de prompt: el
    // cliente manda JSON sin validar y un `role: 'system'` en el historial se
    // colaba como segunda instrucción junto al `buildSystemPrompt()` de
    // confianza. Solo user/assistant sobreviven; el resto se descarta.
    .filter(
      (turn) =>
        (turn.role === 'user' || turn.role === 'assistant') &&
        typeof turn.content === 'string' &&
        turn.content.trim(),
    )
    .map((turn) => ({ role: turn.role, content: turn.content.trim().slice(0, turn.role === 'user' ? 2000 : 4000) }))
  return clean.slice(-max)
}

// ─────────────────────────────────────────────
// Guía determinista (sin modelo)
// ─────────────────────────────────────────────

const STOP_WORDS = new Set([
  'que', 'qué', 'como', 'cómo', 'cual', 'cuál', 'para', 'por', 'los', 'las', 'del', 'con', 'una', 'uno', 'son', 'es', 'la', 'el', 'de', 'en', 'y', 'o', 'me', 'mi', 'se', 'su', 'al', 'lo', 'tu', 'te', 'ya', 'hay', 'muy', 'pero', 'más', 'puedo', 'quiero', 'necesito', 'sobre', 'cuando', 'dónde', 'donde',
])

function tokens(text: string): string[] {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .split(/[^a-z0-9]+/)
    .filter((word) => word.length > 2 && !STOP_WORDS.has(word))
}

interface Scored {
  id: string
  score: number
}

/**
 * Búsqueda por coincidencia de términos sobre título, objetivo y técnicas.
 *
 * Deliberadamente simple: sin embeddings ni dependencias. Le basta para
 * devolver la lección correcta en las preguntas frecuentes, y una respuesta
 * sacada de una lección real es mejor que una inventada.
 */
function rankLessons(query: string): Scored[] {
  const words = tokens(query)
  if (!words.length) return []

  return COURSE_LESSONS.map((lesson) => {
    const haystack = tokens(
      [lesson.title, lesson.objective, lesson.kicker, lesson.takeaway, ...lesson.techniques, ...lesson.examples].join(' '),
    )
    let score = 0
    for (const word of words) {
      const hits = haystack.filter((token) => token === word).length
      if (hits) score += Math.min(hits, 3)
      // Coincidencia de raíz: "prompteo" encuentra "prompt".
      else if (haystack.some((token) => token.startsWith(word.slice(0, 5)))) score += 1
    }
    return { id: lesson.id, score }
  })
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
}

const PRICE_ANSWER = () =>
  `Los precios reales del catálogo son ${Object.values(PRODUCTS)
    .map((product) => `${product.name}: ${priceLabel(product)}`)
    .join('; ')}. El pago se hace con tarjeta a través de Stripe desde el botón de inscripción y el acceso se activa al confirmarse la transacción.`

const IDEA_ANSWER = () => {
  const lesson = COURSE_LESSONS[0]
  return `Convierte la idea en las cinco decisiones que el motor sí atiende: género y subgénero, tempo en BPM, tonalidad y modo, descripción vocal (registro, textura, articulación, acento) y estructura con dinámica. Todo lo demás es decoración.${lesson ? ` La base está en la sesión ${lesson.lessonNumber}: ${lesson.title}.` : ''} Escribe tu idea con esas cinco casillas llenas y te la reviso palabra por palabra.`
}

const LYRICS_ANSWER = () => {
  const match = COURSE_LESSONS.find((lesson) => lesson.id === 'm03-l09') ?? COURSE_LESSONS.find((lesson) => tokens(lesson.title).includes('letra'))
  return `Para la letra: define el hecho concreto que cuenta la canción, elige la perspectiva y el tiempo verbal, y arma la métrica antes de buscar la rima. Verso = información, pre-coro = tensión, coro = la frase que se recuerda, puente = giro.${match ? ` La lección ${match.id} ("${match.title}") trae el ejercicio con su checklist.` : ''} Pásame tu borrador y lo revisamos por sección.`
}

const MONETIZE_ANSWER = () => {
  const module5 = COURSE_MODULES.find((module) => module.index === 5)
  return `El mapa, sin prometer cifras: (1) primero verifica qué derechos te cede el motor que usaste, porque eso depende de sus términos y de si el material entró con voces o samples ajenos; (2) registra tu máster y súbelo por un agregador que asigne ISRC; (3) define splits por escrito con quien haya aportado letra o música; (4) abre una vía aparte para sync y licencias. ${module5 ? `El módulo ${module5.index} ("${module5.title}") trabaja esto sobre tus propias canciones.` : ''} No invento porcentajes ni nombres de servicios: esos se comprueban en el contrato del agregador.`
}

const NO_MATCH_ANSWER = (query: string) => {
  const modules = COURSE_MODULES.map((module) => `Módulo ${module.index}: ${module.title}`).join(' · ')
  return `No encontré eso en el programa, y prefiero decirlo antes que inventarlo. El curso cubre: ${modules}. Reformula tu pregunta apuntando a una de esas áreas, o dime qué quieres lograr con tu canción y te llevo a la sesión que corresponde. Pregunta también por precios, cupo diario o cómo funciona el estudio.`
}

/**
 * Respuesta sin proveedor.
 *
 * Cuatro intenciones que cubren la mayoría de las preguntas y, para el resto,
 * búsqueda sobre el contenido real del curso. Nunca devuelve texto que no
 * exista en `lib/course.ts` o en `lib/products.ts`.
 */
export function answerWithoutModel(query: string): GuideReply {
  const lower = query.toLowerCase()
  const has = (...words: string[]) => words.some((word) => lower.includes(word))

  if (has('precio', 'cuesta', 'costo', 'vale', 'cuánto', 'cuanto', 'descuento', 'plan', 'mensual', 'suscri')) {
    return { answer: PRICE_ANSWER(), source: 'fallback', lessonIds: [] }
  }
  if (has('stft', 'librosa', 'espectrograma', 'cromagrama', 'centroide espectral', 'onset', 'nyquist', 'aliasing', 'zcr', 'spectral flatness', 'dsp', 'tasa de muestreo')) {
    return {
      answer: 'El laboratorio técnico 1 cubre muestreo, Nyquist, STFT, espectrograma mel, chroma, RMS, centroide, rolloff, ZCR, flatness y onsets. Son características de señal, no etiquetas infalibles de instrumento o acorde. Abre el temario y ejecuta el análisis con un audio autorizado: /curso/laboratorio-audio/modulo-1',
      source: 'fallback',
      lessonIds: [],
    }
  }
  if (has('masterizar', 'masterización', 'masterizacion', 'lufs', 'true peak', 'dbtp', 'crest factor', 'pyloudnorm', 'compresión', 'compresion', 'ecualización', 'ecualizacion', 'enmascaramiento', 'loudness', 'headroom')) {
    return {
      answer: 'El laboratorio técnico 2 distingue peak sample-based, RMS, LUFS integrados, true peak estimado, correlación estéreo, EQ, dinámica y comparación A/B. No hay un objetivo LUFS universal; define el destino, conserva el original y compara a volumen igualado. Consulta el temario y los scripts aquí: /curso/laboratorio-audio/modulo-2',
      source: 'fallback',
      lessonIds: [],
    }
  }
  if (has('examen técnico', 'examen tecnico', 'rúbrica técnica', 'rubrica tecnica', 'evaluación con ia', 'evaluacion con ia', 'laboratorio de audio', 'laboratorio técnico', 'laboratorio tecnico')) {
    return {
      answer: 'El trayecto técnico tiene seis módulos, cada uno con un examen de 20 preguntas, rúbrica práctica de 100 puntos y retroalimentación asistida por IA sobre un resumen textual. La revisión de archivos y el dictamen final requieren evaluación humana. Accede a /curso/laboratorio-audio/evaluacion',
      source: 'fallback',
      lessonIds: [],
    }
  }
  if (has('difusión', 'difusion', 'stable audio', 'semilla', 'guidance', 'music21', 'midi', 'vae', 'generación musical', 'generacion musical')) {
    return {
      answer: 'El laboratorio técnico 3 trabaja difusión latente, prompts, negative prompt, semilla, pasos, guidance, MIDI editable con music21 y evaluación de cinco variantes. La semilla no garantiza igualdad bit a bit: registra modelo, versión, hardware y tasa real. Abre el temario aquí: /curso/laboratorio-audio/modulo-3',
      source: 'fallback',
      lessonIds: [],
    }
  }
  if (has('plugin', 'vst', 'vst3', 'clap', 'juce', 'onnx', 'latencia', 'tiempo real', 'multiagente', 'orquestador', 'orquestación', 'orquestacion')) {
    return {
      answer: 'El laboratorio técnico 4 separa el callback de audio del worker de inferencia, calcula el presupuesto de latencia y diseña un orquestador multiagente con roles, dependencias y trazas. Ningún modelo pesado debe cargarse dentro del callback. Consulta el módulo: /curso/laboratorio-audio/modulo-4',
      source: 'fallback',
      lessonIds: [],
    }
  }
  if (has('licencia', 'procedencia', 'watermark', 'marca de agua', 'fingerprint', 'gobernanza', 'metadato', 'auditoría', 'auditoria', 'nist')) {
    return {
      answer: 'El laboratorio técnico 5 distingue licencia del audio de entrada, del modelo/pesos y del servicio; construye un manifiesto de procedencia con SHA-256, declara el contenido sintético y evalúa riesgos. El hash demuestra integridad, no titularidad. Abre el módulo: /curso/laboratorio-audio/modulo-5',
      source: 'fallback',
      lessonIds: [],
    }
  }
  if (has('proyecto integrador', 'sistema completo', 'despliegue', 'docker', 'vps', 'nginx', 'capstone', 'estudio autónomo', 'estudio autonomo')) {
    return {
      answer: 'El laboratorio técnico 6 integra arquitectura, persistencia, colas idempotentes, Docker, Nginx con HTTPS, pruebas, monitoreo y defensa. El sistema debe declarar límites y probar la restauración; una demo sin fallo controlado no demuestra operación. Consulta el módulo: /curso/laboratorio-audio/modulo-6',
      source: 'fallback',
      lessonIds: [],
    }
  }

  if (has('letra', 'verso', 'coro', 'rima', 'métrica', 'metrica', 'puente', 'escrib')) {
    return { answer: LYRICS_ANSWER(), source: 'fallback', lessonIds: ['m03-l09'] }
  }
  if (has('monetiz', 'ganar', 'dinero', 'regalía', 'regalia', 'isrc', 'agregador', 'vender', 'derecho', 'spotify', 'sync')) {
    return { answer: MONETIZE_ANSWER(), source: 'fallback', lessonIds: ['m05-l16'] }
  }
  if (has('idea', 'prompt', 'dirigir', 'bpm', 'tono', 'tonalidad', 'género', 'genero', 'voz', 'estructura', 'estilo')) {
    return { answer: IDEA_ANSWER(), source: 'fallback', lessonIds: ['m01-l01', 'm02-l04'] }
  }

  const ranked = rankLessons(query)
  if (!ranked.length) return { answer: NO_MATCH_ANSWER(query), source: 'fallback', lessonIds: [] }

  const picked = ranked.map((entry) => COURSE_LESSONS.find((lesson) => lesson.id === entry.id)).filter(Boolean)
  const body = picked
    .map((lesson) => {
      const safe = lesson!
      const technique = safe.techniques[0] ? ` Técnica clave: ${safe.techniques[0]}.` : ''
      return `• [${safe.id}] ${safe.title} — ${safe.objective}${technique} Idea: ${safe.takeaway}`
    })
    .join('\n')

  return {
    answer: `Esto es lo que el curso dice sobre tu pregunta.\n\n${body}\n\nSi me dices qué canción estás haciendo, bajo al detalle de la sesión que te toca.`,
    source: 'fallback',
    lessonIds: ranked.map((entry) => entry.id),
  }
}
