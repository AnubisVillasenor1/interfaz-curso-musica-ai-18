export interface CourseProduct {
  id: string
  name: string
  description: string
  priceInCents: number
}

export const EXTENSION_PRODUCT: CourseProduct = {
  id: 'play-and-go-extension',
  name: 'Play and Go — Extensión de canciones',
  description: 'Añade capacidad para crear más canciones durante tu ciclo de aprendizaje.',
  priceInCents: 22900,
}

export const COURSE_PRODUCT: CourseProduct = {
  id: 'play-and-go-pro',
  name: 'Play and Go — Música con IA Pro',
  description: 'Acceso completo al curso, biblioteca de prompts, ejercicios, audio, video e insignias.',
  priceInCents: 50000,
}
