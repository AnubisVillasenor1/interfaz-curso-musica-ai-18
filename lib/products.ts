export interface CourseProduct {
  id: string
  name: string
  description: string
  priceInCents: number
}

export const COURSE_PRODUCT: CourseProduct = {
  id: 'play-and-go-pro',
  name: 'Play and Go — Música con IA Pro',
  description: 'Acceso completo al curso, biblioteca de prompts, ejercicios, audio, video e insignias.',
  priceInCents: 4900,
}
