import type { SupabaseClient } from '@supabase/supabase-js'

import type { Product } from '@/lib/products'

/** Precedencia de plan: una compra nueva nunca puede bajar lo ya pagado. */
const PLAN_RANK: Record<string, number> = { free: 0, enrolled: 1, extension: 2, pro: 3 }

export interface DeliveryResult {
  status: 'granted' | 'queued' | 'error'
  userId?: string
  detail?: string
}

/**
 * Encuentra al comprador. Primero por `client_reference_id` y, si falta,
 * recorre la lista paginada de usuarios.
 */
export async function resolveUserId(
  admin: SupabaseClient,
  hints: { clientReferenceId?: string | null; email?: string | null },
): Promise<string | null> {
  const { clientReferenceId, email } = hints

  if (clientReferenceId && /^[0-9a-f-]{36}$/i.test(clientReferenceId)) {
    const { data } = await admin.from('profiles').select('id').eq('id', clientReferenceId).maybeSingle()
    if (data?.id) return data.id
  }

  if (!email) return null

  const target = email.toLowerCase()
  // Supabase Auth Admin limita perPage a 50: pedir 1000 devuelve como máximo
  // 50 y `users.length < 1000` cortaba tras la primera página, dejando sin
  // entregar a todo usuario más allá de los ~50 primeros.
  for (let page = 1; page <= 20; page += 1) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 50 })
    if (error) return null
    const match = data.users.find((candidate) => candidate.email?.toLowerCase() === target)
    if (match) return match.id
    if (data.users.length < 50) break
  }

  return null
}

/** Concede el producto y mantiene los accesos/cupos que aún son válidos. */
export async function grantProduct(
  admin: SupabaseClient,
  userId: string,
  product: Product,
  sessionId: string,
  customerId?: string | null,
  subscriptionId?: string | null,
): Promise<DeliveryResult> {
  const { data: current, error: readError } = await admin
    .from('entitlements')
    .select('plan, daily_limit, local_daily_limit, active, stripe_customer_id, subscription_id, access_expires_at')
    .eq('user_id', userId)
    .maybeSingle()

  if (readError) return { status: 'error', detail: readError.message }

  const grant = product.grant
  const currentPlan = current?.plan ?? 'free'
  const keepPlan = PLAN_RANK[currentPlan] > PLAN_RANK[grant.plan] ? currentPlan : grant.plan
  const hadPermanentAccess =
    Boolean(current?.active) &&
    current?.access_expires_at === null &&
    PLAN_RANK[currentPlan] > PLAN_RANK.free

  // Una extensión se suma al vencimiento vigente, no lo reemplaza por una fecha
  // calculada desde hoy que pudiera acortar días ya comprados.
  const currentExpiry = current?.access_expires_at ? Date.parse(current.access_expires_at) : 0
  const accessExpiresAt =
    grant.accessDays === null || hadPermanentAccess
      ? null
      : new Date(Math.max(Date.now(), currentExpiry) + grant.accessDays * 86_400_000).toISOString()

  const payload = {
    user_id: userId,
    plan: keepPlan,
    active: true,
    daily_limit: Math.max(current?.daily_limit ?? 0, grant.dailyLimit),
    local_daily_limit: Math.max(current?.local_daily_limit ?? 0, grant.localDailyLimit),
    last_stripe_session_id: sessionId,
    stripe_customer_id: customerId ?? current?.stripe_customer_id ?? null,
    subscription_id: subscriptionId ?? current?.subscription_id ?? null,
    access_expires_at: accessExpiresAt,
  }

  const { error } = await admin.from('entitlements').upsert(payload, { onConflict: 'user_id' })
  if (error) return { status: 'error', detail: error.message }

  return { status: 'granted', userId }
}

/** El dinero entró y la cuenta todavía no existe: queda debiendo, no perdido. */
export async function queuePendingPayment(
  admin: SupabaseClient,
  input: { sessionId: string; email: string; productId: string },
): Promise<DeliveryResult> {
  const { error } = await admin.from('pending_fulfilments').upsert(
    {
      stripe_session_id: input.sessionId,
      email: input.email,
      product_id: input.productId,
    },
    { onConflict: 'stripe_session_id' },
  )
  if (error) return { status: 'error', detail: error.message }
  return { status: 'queued', detail: 'Pago registrado; se activará al crear la cuenta con ese correo.' }
}

export type EventClaimResult = 'claimed' | 'duplicate' | 'error'

/** Reclama un evento y no confunde fallos de base de datos con duplicados. */
export async function claimEvent(admin: SupabaseClient, id: string, type: string): Promise<EventClaimResult> {
  const { error } = await admin.from('stripe_events').insert({ id, type })
  if (!error) return 'claimed'
  if (error.code === '23505') return 'duplicate'
  console.error('[webhook] no se pudo reclamar el evento', { id, code: error.code, message: error.message })
  return 'error'
}

/** Libera la reclamación cuando falla la entrega para que Stripe pueda reintentar. */
export async function releaseEventClaim(admin: SupabaseClient, id: string): Promise<boolean> {
  const { error } = await admin.from('stripe_events').delete().eq('id', id)
  if (error) {
    console.error('[webhook] no se pudo liberar la reclamación del evento', { id, message: error.message })
    return false
  }
  return true
}

/** Revoca la suscripción que terminó, sin tocar compras permanentes. */
export async function deactivateSubscription(admin: SupabaseClient, userId: string): Promise<DeliveryResult> {
  const { data: current, error: readError } = await admin
    .from('entitlements')
    .select('plan, active, access_expires_at')
    .eq('user_id', userId)
    .maybeSingle()
  if (readError) return { status: 'error', detail: readError.message }
  if (!current) return { status: 'granted', userId }

  // Quien compró el curso (enrolled, acceso permanente sin vencimiento) no
  // pierde ese acceso si además tenía una suscripción mensual que termina.
  // `grantProduct` preserva el rango; aquí se hacía lo contrario: se pisaba
  // todo a free/daily 0 y se borraba un pago único ya cobrado.
  const permanent = Boolean(current.active) && current.access_expires_at === null && current.plan !== 'free'
  if (permanent && current.plan !== 'pro') {
    const { error } = await admin
      .from('entitlements')
      .update({
        subscription_id: null,
        current_period_end: null,
      })
      .eq('user_id', userId)
    if (error) return { status: 'error', detail: error.message }
    return { status: 'granted', userId }
  }

  const { error } = await admin
    .from('entitlements')
    .update({
      active: false,
      plan: 'free',
      daily_limit: 0,
      local_daily_limit: 10,
      subscription_id: null,
      current_period_end: null,
    })
    .eq('user_id', userId)
  if (error) return { status: 'error', detail: error.message }
  return { status: 'granted', userId }
}
