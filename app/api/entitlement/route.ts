import { NextResponse } from 'next/server'

import { FREE_TIER } from '@/lib/products'
import { SUPABASE_NOT_CONFIGURED } from '@/lib/supabase/config'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

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
  if (!supabase) return NextResponse.json({ error: SUPABASE_NOT_CONFIGURED }, { status: 503 })

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Inicia sesión para ver tu plan.' }, { status: 401 })

  const { data, error } = await supabase.rpc('read_entitlement')

  if (error) {
    console.error('[entitlement] RPC falló', error.message)
    return NextResponse.json({ error: 'No pudimos leer tu plan.' }, { status: 500 })
  }

  // `read_entitlement` devuelve null cuando no hay fila de entitlements, es
  // decir, una cuenta recién creada a la que el trigger aún no le llegó. Se
  // responde el plan gratuito explícito para que la UI no tenga que adivinar.
  return NextResponse.json({
    entitlement: data ?? {
      plan: FREE_TIER.plan,
      active: FREE_TIER.active,
      daily_limit: FREE_TIER.dailyLimit,
      used_today: 0,
      local_daily_limit: FREE_TIER.localDailyLimit,
      local_used_today: 0,
      role: 'user',
      songs_total: 0,
      songs_ready: 0,
      lessons_done: 0,
    },
    userId: user.id,
    email: user.email ?? null,
  })
}
