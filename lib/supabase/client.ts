import { createBrowserClient } from '@supabase/ssr'

import { readPublicEnv } from './config'

/**
 * Cliente de navegador. Devuelve `null` si el entorno no expone credenciales:
 * sin URL pública no hay sesión posible, y las pantallas que lo consumen deben
 * poder decirlo en palabras en vez de dejar la página en blanco.
 */
export function createClient() {
  const env = readPublicEnv()
  if (!env) return null
  return createBrowserClient(env.url, env.anonKey)
}
