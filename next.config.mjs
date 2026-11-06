/**
 * Configuración de la app.
 *
 * `poweredByHeader` estaba activo por defecto: cada respuesta delataba la
 * versión exacta de Next, que es el dato que usa un atacante para casar un
 * CVE con el despliegue. Las cabeceras de abajo son las que se pueden afirmar
 * sin romper nada de lo que ya funciona.
 *
 * No se añade `Content-Security-Policy` aquí. El árbol monta WebGL, workers de
 * audio y `<script type="application/ld+json">` inyectados por el propio
 * layout; una CSP util sin nonce ni `strict-dynamic` se convertiría en un
 * 404 silencioso de recursos el día del deploy. Si se quiere, se introduce con
 * `Report-Only` primero y se mide antes de endurecer.
 */
/** @type {import('next').NextConfig} */
const nextConfig = {
  poweredByHeader: false,
  images: {
    unoptimized: true,
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          // SAMEORIGIN y no DENY: el panel de Vercel y las apps internas
          // previsualizan el deploy en un iframe propio; DENY cerraría la vista.
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(self), geolocation=(), payment=()' },
          { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
        ],
      },
      {
        // Las páginas son por usuario: una cachá intermedia que sirva el cupo
        // de otra persona es un error de privacidad, no de rendimiento.
        source: '/perfil',
        headers: [{ key: 'Cache-Control', value: 'private, no-store, max-age=0, must-revalidate' }],
      },
      {
        source: '/biblioteca',
        headers: [{ key: 'Cache-Control', value: 'private, no-store, max-age=0, must-revalidate' }],
      },
      {
        // Audio envejecido a propósito: el `<audio>` del hero y las muestras
        // se piden muchas veces por visita y cambian rara vez.
        source: '/audio/:path*',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=86400, stale-while-revalidate=604800' }],
      },
    ]
  },
}

export default nextConfig
