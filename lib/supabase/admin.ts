import { createClient, type SupabaseClient } from '@supabase/supabase-js'

import { readServiceEnv } from './config'

/**
 * Cliente con `service_role`.
 *
 * Solo dos cosas lo usan: el webhook de Stripe y el callback del proveedor.
 * Ambas escriben fuera de cualquier sesión de usuario, que es exactamente el
 * poder que la clave tiene; por eso no puede vivir en `lib/supabase/server.ts`,
 * donde un descuido la metería en el bundle del navegador.
 *
 * Devuelve `null` si faltan credenciales. Las rutas lo convierten en 503 en
 * lugar del 500 con stack trace que producía la aserción `!`.
 */
export function createAdminClient(): SupabaseClient | null {
  const env = readServiceEnv()
  if (!env) return null
  return createClient(env.url, env.serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

export const SERVICE_NOT_CONFIGURED =
  'Falta SUPABASE_SERVICE_ROLE_KEY: este endpoint no puede escribir fuera de una sesión de usuario.'
