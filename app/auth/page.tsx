import type { Metadata } from 'next'

import { AuthForm } from '@/components/auth-form'

export const metadata: Metadata = {
  title: 'Crear cuenta o entrar',
  description:
    'Crea tu cuenta gratuita de Play and Go o entra a tu estudio. Sin tarjeta: el curso se compra aparte cuando tú decidas.',
}

/**
 * Destino interno seguro.
 *
 * `startsWith('/')` no basta: `/\evil.com` y `/%5Cevil.com` los normalizan
 * algunos navegadores como `//evil.com`, y un salto de línea o un byte de
 * control puede partir la cabecera `Location`. Solo se acepta una ruta
 * absoluta del mismo origen, sin barra invertida ni caracteres de control.
 */
function safeNext(value: unknown): string {
  if (typeof value !== 'string') return '/'
  const candidate = value.trim()
  if (!candidate.startsWith('/') || candidate.startsWith('//')) return '/'
  if (candidate.includes('\\') || /[\u0000-\u001f\u007f]/.test(candidate)) return '/'
  return candidate
}

/**
 * Página de acceso.
 *
 * El modo y el destino se resuelven en el servidor: `/auth?mode=signup` ya
 * devuelve el formulario de alta en el HTML, sin el parpadeo de la versión que
 * cambiaba de formulario después de hidratar. `next` sólo acepta rutas internas
 * para que un enlace manipulado no pueda redirigir a otro dominio.
 */
export default async function AuthPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const params = await searchParams
  const rawMode = Array.isArray(params.mode) ? params.mode[0] : params.mode
  const rawNext = Array.isArray(params.next) ? params.next[0] : params.next

  return <AuthForm initialMode={rawMode === 'signup' ? 'signup' : 'login'} next={safeNext(rawNext)} />
}
