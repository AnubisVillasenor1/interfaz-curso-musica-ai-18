/**
 * Lectura única de las variables de Supabase.
 *
 * Existe por un motivo: `createServerClient` y `createBrowserClient` lanzan un
 * TypeError seco si la URL o la key llegan vacías, y eso convertía cualquier
 * ruta de API en un 500 incomprensible en cuanto el entorno venía sin
 * `.env.local`. Aquí medimos la configuración una vez y la exponemos como
 * predicado, para que las rutas puedan responder 503 con una frase accionable
 * en lugar de un stack trace.
 *
 * La key pública acepta indistintamente la anon legada (`eyJ...`) o su relevo
 * `sb_publishable_...`; basta con definir una de las dos.
 */
export interface SupabaseEnv {
  url: string
  anonKey: string
}

export function readPublicEnv(): SupabaseEnv | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  if (!url || !anonKey) return null
  return { url, anonKey }
}

/** Credenciales de navegador: sirven para sesión y lectura bajo RLS. */
export function isSupabaseConfigured(): boolean {
  return readPublicEnv() !== null
}

/**
 * Clave `service_role`: solo servidor. La necesitan el webhook de Stripe y el
 * callback del proveedor, que escriben fuera de cualquier sesión de usuario.
 * Sin ella, esos flujos no pueden cumplir su promesa y deben declararse
 * no configurados antes de tocar la base de datos.
 */
export function readServiceEnv(): (SupabaseEnv & { serviceRoleKey: string }) | null {
  const publicEnv = readPublicEnv()
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!publicEnv || !serviceRoleKey) return null
  return { ...publicEnv, serviceRoleKey }
}

/** Mensaje único para las rutas que dependen de Supabase y no pueden funcionar. */
export const SUPABASE_NOT_CONFIGURED =
  'La base de datos todavía no está configurada en este entorno. Faltan NEXT_PUBLIC_SUPABASE_URL y su clave pública.'
