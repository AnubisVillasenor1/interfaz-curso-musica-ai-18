import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

import { readPublicEnv } from './config'

/**
 * Cliente de servidor con la sesión en las cookies.
 *
 * Devuelve `null` cuando el entorno no trae credenciales. Antes lanzaba un
 * TypeError desde `createServerClient`, y eso convertía `/api/generate` y
 * `/api/checkout` en un 500 sin explicación en cualquier despliegue al que se
 * le olvidara configurar Supabase. Un `null` explícito permite que la ruta
 * responda 503 con una frase accionable.
 */
export async function createClient() {
  const env = readPublicEnv()
  if (!env) return null

  const cookieStore = await cookies()
  return createServerClient(env.url, env.anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
        } catch {
          // Llamada desde un Server Component: las cookies ya son de solo lectura
          // y la sesión la mantiene el proxy.
        }
      },
    },
  })
}
