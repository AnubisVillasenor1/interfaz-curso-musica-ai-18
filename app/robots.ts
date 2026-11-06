import type { MetadataRoute } from 'next'
import { getAppUrl } from '@/lib/app-url'

/**
 * Las rutas de sesión y de cobro se excluyen porque indexarlas no ayuda a
 * nadie: `/perfil` y `/biblioteca` responden distinto según quién las pide, y
 * un buscador que llegara a `/api/checkout` solo vería un 405.
 */
export default function robots(): MetadataRoute.Robots {
  const siteUrl = getAppUrl()
  if (!siteUrl) {
    // Sin dominio canónico no hay sitemap que anunciar, y preferimos cerrar el
    // paso en un entorno provisional antes que indexar un staging.
    return { rules: { userAgent: '*', disallow: '/' } }
  }

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
