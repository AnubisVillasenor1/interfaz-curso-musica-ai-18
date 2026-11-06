/**
 * Examen del curso: 20 preguntas sobre contenido real de las 16 sesiones.
 * La calificación mínima es 70%. Las respuestas correctas viven solo en el
 * servidor: el cliente recibe los índices de opciones, nunca la clave.
 */

export interface ExamQuestion {
  id: string
  question: string
  options: [string, string, string]
  /** Índice (0-2) de la opción correcta. Solo servidor. */
  correct: number
}

export interface PublicQuestion {
  id: string
  question: string
  options: [string, string, string]
}

export const EXAM_PASS_PERCENT = 70

export const EXAM_QUESTIONS: ExamQuestion[] = [
  { id: 'q01', question: '¿Cuáles son las cinco decisiones que siempre diriges?', options: ['Género, tempo, tonalidad, voz y estructura', 'Fama, ingresos, distribución y premios', 'Fecha de lanzamiento y portada'], correct: 0 },
  { id: 'q02', question: 'Si el prompt dice «triste» sin más, ¿qué creas?', options: ['Una canción precisa y auditable', 'Un vecindario estadístico amplio y vago', 'La misma canción siempre'], correct: 1 },
  { id: 'q03', question: '¿Qué mide el BPM?', options: ['El volumen de la mezcla', 'Las pulsaciones por minuto', 'El número de capas'], correct: 1 },
  { id: 'q04', question: '¿Cuál es la mejor forma de iterar un prompt?', options: ['Reescribir todo cada vez', 'Cambiar una sola variable y comparar', 'Añadir más adjetivos'], correct: 1 },
  { id: 'q05', question: 'Un prompt bien documentado permite:', options: ['Decir qué instrucción produjo qué fragmento', 'Garantizar un éxito', 'Evitar escuchar el audio'], correct: 0 },
  { id: 'q06', question: 'En la descripción vocal, ¿qué cuatro ejes diriges?', options: ['Precio, país, idioma y marca', 'Registro, textura, articulación y acento', 'Fecha, lugar, público y horario'], correct: 1 },
  { id: 'q07', question: '¿Dónde se vuelve auditable una letra?', options: ['En la métrica y la interpretación anotada', 'En la cantidad de palabras', 'En el nombre del archivo'], correct: 0 },
  { id: 'q08', question: '¿Qué significa «modo mayor» frente a «menor»?', options: ['Velocidad contra lentitud', 'Apertura/resuelto contra tensión/melancolía', 'Loudness contra silencio'], correct: 1 },
  { id: 'q09', question: 'Cada instrumento entra en un arreglo por:', options: ['Decoración y cantidad', 'Una función en la mezcla', 'La moda del momento'], correct: 1 },
  { id: 'q10', question: '¿Qué es el groove?', options: ['El patrón rítmico que sostiene el tema', 'Un efecto de reverberación', 'La portada de la canción'], correct: 0 },
  { id: 'q11', question: 'Antes de publicar, ¿qué revisas de derechos?', options: ['Nada, el pago lo cubre todo', 'Licencia del motor, voces, muestras y ISRC', 'Solo el título'], correct: 1 },
  { id: 'q12', question: '¿Qué es un ISRC?', options: ['Una clave de Stripe', 'Un código que identifica una grabación', 'Un tipo de plugin'], correct: 1 },
  { id: 'q13', question: 'Una matriz comparativa de arreglos sirve para:', options: ['Elegir con criterio entre versiones', 'Eliminar la necesidad de escuchar', 'Inventar precios'], correct: 0 },
  { id: 'q14', question: 'En el control de versiones, cada entrega guarda:', options: ['Solo el audio final', 'Ficha, prompt y decisión documentada', 'El nombre del servidor'], correct: 1 },
  { id: 'q15', question: '¿Qué NO debes prometer con un portafolio?', options: ['Dos canciones explicables con decisiones', 'Ingresos garantizados por streaming', 'Evidencia de aprendizaje'], correct: 1 },
  { id: 'q16', question: 'La escucha crítica antes de compartir implica:', options: ['Oír la canción completa dos veces', 'Juzgar en 15 segundos', 'Señalar solo el coro'], correct: 0 },
  { id: 'q17', question: 'Un brief de escena responde primero:', options: ['El color de la portada', 'Tempo, modo, voz, instrumentación y energía', 'El precio del curso'], correct: 1 },
  { id: 'q18', question: 'El papel de la IA en este curso es:', options: ['Sustituir al creador', 'Acompañar, proponer y devolver el control', 'Firmar la obra por el alumno'], correct: 1 },
  { id: 'q19', question: '¿Qué valida el cuestionario de la sesión?', options: ['Solo la asistencia', 'La capacidad de dirigir con las cinco decisiones', 'La cuenta de palabras'], correct: 1 },
  { id: 'q20', question: '«Mi Nodo Cero» se entrega con:', options: ['Solo el audio final', 'Audio, instrumental, prompt maestro, letra, estructura, créditos y portada', 'Un enlace roto'], correct: 1 },
]

export function examPublicQuestions(): PublicQuestion[] {
  return EXAM_QUESTIONS.map((q) => ({ id: q.id, question: q.question, options: q.options }))
}

export function gradeExam(answers: Record<string, number>): { score: number; passed: boolean; correct: number } {
  let hits = 0
  for (const q of EXAM_QUESTIONS) {
    if (answers[q.id] === q.correct) hits += 1
  }
  const score = Math.round((hits / EXAM_QUESTIONS.length) * 100)
  return { score, passed: score >= EXAM_PASS_PERCENT, correct: hits }
}
