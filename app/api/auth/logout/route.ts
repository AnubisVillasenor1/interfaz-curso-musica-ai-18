import { NextResponse } from 'next/server'

import { SUPABASE_NOT_CONFIGURED } from '@/lib/supabase/config'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

/**
 * Cierre de sesión.
 *
 * No existía: la única forma de salir era borrar las cookies a mano. `signOut`
 * necesita el cliente con cookies de servidor para invalidar la sesión local,
 * y redirigir al origen de la petición solo funciona en desarrollo —en
 * producción el origen lo reescribe el proxy de la plataforma.
 */
export async function POST(request: Request) {
  const supabase = await createClient()
  if (!supabase) return NextResponse.json({ error: SUPABASE_NOT_CONFIGURED, code: 'not_configured' }, { status: 503 })

  await supabase.auth.signOut()

  const origin = new URL(request.url).origin
  const target = /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/.test(origin)
    ? origin
    : process.env.NEXT_PUBLIC_APP_URL ?? process.env.NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL ?? origin

  return NextResponse.redirect(`${target}/`, { status: 302 })
}
