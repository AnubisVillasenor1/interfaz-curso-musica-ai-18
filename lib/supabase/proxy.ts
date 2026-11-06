import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

/**
 * Refresco de sesión en el borde.
 *
 * Dos guardas, y ambas existen para que el proyecto arranque sin credenciales:
 * sin `NEXT_PUBLIC_SUPABASE_URL` y su key no hay sesión que mantener, y un
 * fallo de red de `getUser()` no puede dejar la navegación en un 500. Un clon
 * recién bajado —o cualquier entorno sin `.env.local`— debe poder enseñar la
 * landing y el intro; la sesión es un extra, no un requisito de arranque.
 */
export async function updateSession(request: NextRequest): Promise<NextResponse> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY

  if (!url || !key) return NextResponse.next({ request })

  let response = NextResponse.next({ request })

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (cookies) => {
        cookies.forEach(({ name, value }) => request.cookies.set(name, value))
        response = NextResponse.next({ request })
        cookies.forEach(({ name, value, options }) => response.cookies.set(name, value, options))
      },
    },
  })

  try {
    await supabase.auth.getUser()
  } catch {
    // Sin sesión válida se sigue adelante: las páginas públicas no dependen de ella.
  }

  return response
}
