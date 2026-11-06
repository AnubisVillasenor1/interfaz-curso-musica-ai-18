import { NextResponse } from 'next/server'

import { createClient } from '@/lib/supabase/server'

/**
 * Destino del enlace mágico / del alta con confirmación por correo.
 *
 * Intercambia el `code` por la sesión y escribe las cookies. Si Supabase no
 * está configurado en este entorno no hay código que intercambiar: se redirige
 * igual, porque dejar un 500 en el enlace que el usuario acaba de abrir desde
 * su correo es la peor forma de contarle que falta una variable.
 */
export async function GET(request: Request) {
  const url = new URL(request.url)
  const code = url.searchParams.get('code')
  if (code) {
    const supabase = await createClient()
    if (supabase) await supabase.auth.exchangeCodeForSession(code)
  }
  // Relativo a propósito: `new URL('/', request.url)` refleja el Host del
  // header y convierte el callback en una redirección abierta. `/` queda en
  // el mismo origen sin cabeceras.
  return new NextResponse(null, { status: 302, headers: { Location: '/' } })
}
