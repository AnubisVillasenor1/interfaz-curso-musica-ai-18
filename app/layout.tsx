import { Analytics } from '@vercel/analytics/next'
import type { Metadata, Viewport } from 'next'
import { PRODUCTS } from '@/lib/products'
import { getAppUrl } from '@/lib/app-url'
import './globals.css'

const siteUrl = getAppUrl()
const description =
  'Play and Go de TAMV ONLINE: curso de música con inteligencia artificial, de cero a flujo profesional. 5 módulos, 16 sesiones, estudio de producción, biblioteca de prompts e insignias.'

export const metadata: Metadata = {
  metadataBase: siteUrl ? new URL(siteUrl) : undefined,
  title: {
    default: 'Play and Go by TAMV ONLINE — Música con IA',
    template: '%s · Play and Go by TAMV ONLINE',
  },
  description,
  applicationName: 'Play and Go',
  authors: [{ name: 'TAMV ONLINE' }],
  creator: 'TAMV ONLINE',
  publisher: 'TAMV ONLINE',
  keywords: [
    'curso de música con IA',
    'producir música con inteligencia artificial',
    'prompts musicales',
    'Play and Go',
    'TAMV ONLINE',
  ],
  category: 'education',
  openGraph: {
    type: 'website',
    locale: 'es_MX',
    url: siteUrl || undefined,
    siteName: 'Play and Go by TAMV ONLINE',
    title: 'Play and Go by TAMV ONLINE — Música con IA',
    description,
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Play and Go by TAMV ONLINE — Música con IA',
    description,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, 'max-image-preview': 'large' },
  },
  icons: {
    icon: [
      {
        url: '/icon-light-32x32.png',
        media: '(prefers-color-scheme: light)',
      },
      {
        url: '/icon-dark-32x32.png',
        media: '(prefers-color-scheme: dark)',
      },
      {
        url: '/icon.svg',
        type: 'image/svg+xml',
      },
    ],
    apple: '/apple-icon.png',
  },
}

export const viewport: Viewport = {
  // 'dark' fijo: la interfaz no tiene variante clara, y declarar 'light dark'
  // hacía que el navegador pintara el sobrellave en blanco antes del primer
  // fotograma, con el body oscuro ya montado.
  colorScheme: 'dark',
  themeColor: '#04101a',
}

/**
 * Datos estructurados del curso.
 *
 * Los precios se leen de `lib/products.ts`, el mismo objeto que consume
 * `/api/checkout`: un schema escrito a mano se desincroniza del cobro en el
 * primer cambio de tarifa, y ese desajuste es exactamente lo que Google penaliza.
 * Sin `NEXT_PUBLIC_APP_URL` no hay `@id` estable, así que se omite el bloque
 * antes que publicar una url falsa.
 */
function courseJsonLd() {
  if (!siteUrl) return null
  const course = PRODUCTS['play-and-go-course']
  return {
    '@context': 'https://schema.org',
    '@type': 'Course',
    name: course.name,
    description: course.description,
    provider: {
      '@type': 'Organization',
      name: 'TAMV ONLINE',
      url: siteUrl,
    },
    inLanguage: 'es-MX',
    isAccessibleForFree: false,
    offers: {
      '@type': 'Offer',
      url: `${siteUrl}/precios`,
      price: (course.priceInCents / 100).toFixed(2),
      priceCurrency: 'MXN',
      availability: 'https://schema.org/InStock',
    },
  }
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const schema = courseJsonLd()

  return (
    <html lang="es">
      <body className="antialiased">
        {children}
        {schema && (
          <script
            type="application/ld+json"
            // El objeto lo construye este archivo, no llega de un usuario.
            dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
          />
        )}
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
