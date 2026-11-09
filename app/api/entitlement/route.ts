import { NextResponse } from 'next/server'

import { FREE_TIER, PRO_PRODUCT } from '@/lib/products'
import { isAdminUser } from '@/lib/admin-access'
import { SUPABASE_NOT_CONFIGURED } from '@/lib/supabase/config'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

/** Respuesta con datos de una sola cuenta: ver el comentario de `app/api/progress/route.ts`. */
const PRIVATE_HEADERS = { 'Cache-Control': 'private, no-store' } as const

/**
 * Plan, cupo y progreso de quien llama.
 *
 * Lo necesita la interfaz para saber cuántas canciones quedan y qué botón
 * ofrecer. Se resuelve en una sola RPC en lugar de tres consultas desde el
 * cliente: tres lecturas seguidas de escritura concurrente pueden devolver un
 * plan viejo junto a un cupo nuevo, y la UI discutiría consigo misma.
 *
 * `read_entitlement()` es `security definer` y filtra por `auth.uid()`: no
 * acepta parámetros, así que no existe forma de preguntar por otra cuenta.
 */
export async function GET() {
  const supabase = await createClient()
  if (!supabase) return NextResponse.json({ error: SUPABASE_NOT_CONFIGURED, code: 'not_configured' }, { status: 503 })

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Inicia sesión para ver tu plan.', code: 'unauthorized' }, { status: 401 })

  const adminAccount = isAdminUser(user)
  const { data, error } = adminAccount ? { data: null, error: null } : await supabase.rpc('read_entitlement')

  if (error) {
    console.error('[entitlement] RPC falló', error.message)
    return NextResponse.json({ error: 'No pudimos leer tu plan.', code: 'read_failed' }, { status: 500 })
  }

  // `read_entitlement` devuelve null cuando no hay fila de entitlements, es
  // decir, una cuenta recién creada a la que el trigger aún no le llegó. Se
  // responde el plan gratuito explícito para que la UI no tenga que adivinar.
  return NextResponse.json(
    {
      entitlement: data ?? {
        plan: adminAccount ? PRO_PRODUCT.grant.plan : FREE_TIER.plan,
        active: adminAccount || FREE_TIER.active,
        daily_limit: adminAccount ? 999999 : FREE_TIER.dailyLimit,
        used_today: 0,
        local_daily_limit: adminAccount ? 999999 : FREE_TIER.localDailyLimit,
        local_used_today: 0,
        role: adminAccount ? 'admin' : 'user',
        songs_total: 0,
        songs_ready: 0,
        is_admin: adminAccount,
      },
      userId: user.id,
      email: user.email ?? null,
    },
    { headers: PRIVATE_HEADERS },
  )
}
