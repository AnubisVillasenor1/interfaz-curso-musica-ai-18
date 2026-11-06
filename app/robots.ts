import type { MetadataRoute } from 'next'
import { getSeoOrigin } from '@/lib/app-url'

/**
 * Las rutas de sesión y de cobro se excluyen porque indexarlas no ayuda a
 * nadie: `/perfil` y `/biblioteca` responden distinto según quién las pide, y
 * un buscador que llegara a `/api/checkout` solo vería un 405.
 *
 * El cierre total sigue existiendo, pero ahora lo decide `VERCEL_ENV`: antes
 * se decidía por si `NEXT_PUBLIC_APP_URL` estaba declarada, así que un entorno
 * de producción sin esa variable quedaba expulsado del índice en silencio.
 */
export default function robots(): MetadataRoute.Robots {
  if (process.env.VERCEL_ENV && process.env.VERCEL_ENV !== 'production') {
    return { rules: { userAgent: '*', disallow: '/' } }
  }

  const siteUrl = getSeoOrigin()

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/api/', '/auth/callback', '/perfil', '/biblioteca', '/studio'],
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
    host: siteUrl,
  }
}
