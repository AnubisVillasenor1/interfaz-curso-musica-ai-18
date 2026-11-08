import { TamvQuote } from '@/components/tamv-quote'
import { Analytics } from '@vercel/analytics/next'
import type { Metadata, Viewport } from 'next'
import Link from 'next/link'
import { PRODUCTS } from '@/lib/products'
import { getSeoOrigin } from '@/lib/app-url'
import './globals.css'

/**
 * Base para las URLs absolutas de metadatos (Open Graph, Twitter, canonical).
 *
 * `getAppUrl()` devuelve "" cuando el entorno no declara `NEXT_PUBLIC_APP_URL`,
 * y eso es correcto para una redirección de pago: ahí un destino adivinado es
 * un riesgo. En metadatos el riesgo es el inverso —sin base, Next resuelve
 * `http://localhost:3000/og.png` y la tarjeta social nace muerta—, por eso el
 * default vive en `lib/app-url.ts`, compartido con robots y sitemap. Un
 * `NEXT_PUBLIC_APP_URL` explícito siempre gana.
 */
const metadataUrl = getSeoOrigin()
const description =
  'Play and Go de TAMV Online Network: creación musical con IA, 16 sesiones originales y un laboratorio técnico complementario de DSP, análisis espectral, mezcla y masterización con apoyo de IA declarado.'

export const metadata: Metadata = {
  metadataBase: new URL(metadataUrl),
  title: {
    default: 'Play and Go by TAMV ONLINE — Música con IA',
    template: '%s · Play and Go by TAMV ONLINE',
  },
  description,
  applicationName: 'Play and Go by TAMV ONLINE',
  generator: 'Play and Go by TAMV ONLINE',
  authors: [{ name: 'Edwin Oswaldo Castillo Trejo', url: metadataUrl }, { name: 'TAMV Online Network', url: metadataUrl }],
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
    url: metadataUrl,
    siteName: 'Play and Go by TAMV ONLINE',
    title: 'Play and Go by TAMV ONLINE — Música con IA',
    description,
    images: [`${metadataUrl}/opengraph-image`],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Play and Go by TAMV ONLINE — Música con IA',
    description,
    images: [`${metadataUrl}/opengraph-image`],
  },
  alternates: { canonical: metadataUrl },
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
 * Sin `NEXT_PUBLIC_APP_URL` el `@id` usa el dominio de producción declarado en
 * el código: seguir omitiendo el bloque dejaba el curso sin datos estructurados
 * en el entorno real, que es justo donde importan.
 */
function courseJsonLd() {
  const course = PRODUCTS['play-and-go-course']
  return {
    '@context': 'https://schema.org',
    '@type': 'Course',
    name: course.name,
    description: course.description,
    provider: {
      '@type': 'Organization',
      name: 'TAMV ONLINE',
      url: metadataUrl,
    },
    inLanguage: 'es-MX',
    isAccessibleForFree: false,
    offers: {
      '@type': 'Offer',
      url: `${metadataUrl}/precios`,
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
        {/* Pie institucional visible en TODAS las páginas (frase estratégica §1) */}
        <footer className="pg-container pb-12 pt-4">
          <TamvQuote variant="footer" />
          {/* Mapa mínimo repetido en cada página: desde una lección, una factura
              o los términos siempre hay un camino de vuelta al área personal. */}
          <nav aria-label="Área personal y planes" className="mt-6 flex flex-wrap items-center justify-center gap-x-6 gap-y-3">
            <Link href="/curso" className="pg-navlink">Curso</Link>
            <Link href="/vision" className="pg-navlink">Visión</Link>
            <Link href="/studio" className="pg-navlink">Estudio</Link>
            <Link href="/biblioteca" className="pg-navlink">Mi música</Link>
            <Link href="/perfil" className="pg-navlink">Mi perfil</Link>
            <Link href="/precios" className="pg-navlink">Planes y pago</Link>
          </nav>
          <div className="mt-8 flex items-center justify-center gap-4" aria-label="Marcas oficiales">
            <img src="/brand/play-go-official.png" alt="Play & Go" width="112" height="112" className="size-14 rounded-xl object-cover object-center ring-1 ring-[#d8c99d]/40" />
            <img src="/brand/tamv-official.jpg" alt="TAMV Online Network" width="112" height="112" className="size-14 rounded-xl object-cover object-top ring-1 ring-[#d8c99d]/40" />
          </div>
          <p className="pg-note mt-4 text-center">Play &amp; Go · Crea. Aprende. Hazlo tuyo. Una plataforma de TAMV Online Network.</p>
        </footer>
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
