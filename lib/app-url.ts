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
      'El retorno de pago no está configurado. Define NEXT_PUBLIC_APP_URL con el dominio público de la aplicación.',
  }
}
