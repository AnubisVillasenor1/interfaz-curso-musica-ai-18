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

  // Redirección relativa: construir el destino desde `request.url` confía en
  // el header Host (`X-Forwarded-Host`), que un llamador puede fijar para
  // producir un `Location: https://evil.com/` (phishing). `/` relativo queda
  // en el mismo origen sin mirar cabeceras.
  return new NextResponse(null, { status: 302, headers: { Location: '/' } })
}
