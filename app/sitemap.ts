import type { MetadataRoute } from 'next'
import { COURSE_MODULES } from '@/lib/course'
import { getSeoOrigin } from '@/lib/app-url'

/**
 * Rutas públicas que conviene indexar. Se construyen desde `COURSE_MODULES`,
 * no desde una lista escrita a mano: cuando el curso crezca o se reordene, el
 * sitemap se actualiza solo y deja de prometer lecciones que ya no existen.
 *
 * El origen viene de `getSeoOrigin()`, no de `getAppUrl()`: con la versión
 * estricta y sin `NEXT_PUBLIC_APP_URL` declarada, el archivo se generaba
 * vacío y el sitio desaparecía del índice sin ningún aviso.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  if (process.env.VERCEL_ENV && process.env.VERCEL_ENV !== 'production') return []

  const siteUrl = getSeoOrigin()

  const now = new Date()
  const entry = (path: string, priority: number, changeFrequency: 'weekly' | 'monthly' = 'weekly') => ({
    url: `${siteUrl}${path}`,
    lastModified: now,
    changeFrequency,
    priority,
  })

  const coursePages: MetadataRoute.Sitemap = [entry('/curso', 0.8, 'monthly')]

  for (const module of COURSE_MODULES) {
    coursePages.push(entry(`/curso/${module.id}`, 0.7, 'monthly'))
    for (const lessonId of module.lessonIds) {
      coursePages.push(entry(`/curso/${module.id}/${lessonId}`, 0.6, 'monthly'))
    }
  }

  return [
    entry('/', 1),
    entry('/precios', 0.9),
    entry('/comunidad', 0.7),
    entry('/curso/proyecto-final', 0.85, 'monthly'),
    entry('/informacion', 0.5, 'monthly'),
    ...coursePages,
  ]
}
