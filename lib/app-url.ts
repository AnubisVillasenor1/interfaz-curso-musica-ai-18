/**
 * Origen canónico de la aplicación.
 *
 * `app/api/checkout/route.ts` construía `success_url` a partir del header
 * `Origin` de la petición. Stripe exige que ese destino sea un dominio
 * permitido en el Dashboard: con un `Origin` cualquiera la Session fallaba, y
 * si el dominio estaba abierto con comodín, cualquiera podía conseguir una
 * redirección a `?checkout=success` en un subdominio propio. Aquí el origen se
 * configura, no se le cree.
 */

function normalize(value: string): string {
  const withScheme = /^https?:\/\//i.test(value) ? value : `https://${value}`
  return withScheme.replace(/\/+$/, '')
}

/**
 * Orden deliberado: la variable explícita manda siempre. En Vercel se añade la
 * URL de producción del proyecto como respaldo, porque el header `Origin` de
 * una petición server-side no es fiable (lo reescribe el proxy de la plataforma).
 */
export function getAppUrl(request?: Request): string {
  // Nunca dejar que un Preview herede el origen de producción. Vercel puede
  // exponer las mismas variables en ambos entornos y un checkout/callback
  // podría regresar a producción aunque la petición naciera en Preview.
  // PREVIEW_APP_URL permite fijar un dominio estable; VERCEL_URL es el fallback
  // de la URL del deployment actual y evita confiar en un NEXT_PUBLIC_APP_URL
  // compartido que apunte al dominio de producción.
  const isPreview = process.env.VERCEL_ENV === 'preview'
  if (isPreview) {
    const previewOrigin = process.env.PREVIEW_APP_URL || process.env.VERCEL_URL
    // Fail closed: no production-origin fallback in Preview, even if Vercel
    // does not provide VERCEL_URL or a branch-specific URL was misconfigured.
    return previewOrigin ? normalize(previewOrigin) : ''
  }

  const configured =
    process.env.NEXT_PUBLIC_APP_URL ??
    process.env.APP_URL ??
    process.env.NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL ??
    process.env.VERCEL_PROJECT_PRODUCTION_URL

  if (configured) return normalize(configured)

  // Sin configuración explícita solo se admite el origen de la propia petición
  // cuando es local: en cualquier otro entorno preferimos decirlo antes que
  // redirigir a un destino que nadie autorizó.
  if (request) {
    const origin = new URL(request.url).origin
    if (/^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/.test(origin)) return origin
  }

  return ''
}

/**
 * Origen canónico de producción, declarado en el código.
 *
 * Existe porque las superficies de visibilidad (metadataBase, sitemap.xml,
 * robots.txt, datos estructurados) no pueden permitirse el lujo de quedarse
 * vacías: sin `NEXT_PUBLIC_APP_URL` declarada, `getAppUrl()` devuelve "" y el
 * resultado medido era un sitemap vacío y un robots que cerraba todo el sitio
 * al índice. Un dominio equivocado en una tarjeta social es corregible; un
 * sitio invisible para los buscadores, no.
 */
export const PRODUCTION_ORIGIN = 'https://interfaz-curso-musica-ai.vercel.app'

/**
 * Igual que `getAppUrl()`, pero con el dominio de producción como último
 * recurso. Solo para lectura pública de URLs canónicas: el retorno de pago
 * sigue pasando por `requireAppUrl()`, donde adivinar sí es un riesgo.
 */
export function getSeoOrigin(): string {
  return getAppUrl() || PRODUCTION_ORIGIN
}

/**
 * Devuelve la URL base o un mensaje que la ruta traduce a 503. Distinto de
 * "" es un contrato: un despliegue sin `NEXT_PUBLIC_APP_URL` no puede prometer
 * un retorno de pago, y eso hay que decirlo en la cara, no cobrar y perder al
 * cliente en un limbo.
 */
export function requireAppUrl(request?: Request): { url: string } | { error: string } {
  const url = getAppUrl(request)
  if (url) return { url }
  return {
    error:
      'El retorno de pago no está configurado en este entorno. Inténtalo de nuevo en unos minutos.',
  }
}
