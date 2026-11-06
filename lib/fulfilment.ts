import type { SupabaseClient } from '@supabase/supabase-js'

import type { Product } from '@/lib/products'

/**
 * Entrega de accesos.
 *
 * Vive separado del webhook porque el webhook tiene cuatro salidas distintas y
 * ninguna era correcta antes de esto:
 *
 * - Buscaba al comprador enumerando `listUsers({ perPage: 1000 })` en una sola
 *   página. Desde el usuario 1001 el correo nunca aparecía y el pago se
 *   descartaba devolviendo 200, o sea, "todo bien, no cobramos nada más".
 * - Trataba cualquier `productId` desconocido como el curso, así que una
 *   Session de $229 podía entregar el plan de $500.
 * - Filtraba `payment_status !== 'paid'`, lo que cancelaba de hecho la rama de
 *   `async_payment_succeeded`, cuyo estado es `succeeded`: OXXO, SPEI y
 *   cualquier pago diferido nunca activaba nada.
 * - Ignoraba el error del upsert y devolvía 200 igualmente, eliminando el
 *   reintento de Stripe sobre un fallo real de base de datos.
 */

/** Precedencia de plan: una compra nueva nunca puede bajar lo ya pagado. */
const PLAN_RANK: Record<string, number> = { free: 0, enrolled: 1, extension: 2, pro: 3 }

export interface DeliveryResult {
  status: 'granted' | 'queued' | 'error'
  userId?: string
  detail?: string
}

/**
 * Encuentra al comprador. Primero por `client_reference_id` (el userId que
 * metimos en la Session, que no depende de que el correo coincida), y solo si
 * falta recorre la lista de usuarios paginada.
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

  // Paginado de verdad: `listUsers` da 1000 por página y antes se tomaba solo
  // la primera, sin `page`.
  const target = email.toLowerCase()
  for (let page = 1; page <= 20; page += 1) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 })
    if (error) return null
    const match = data.users.find((candidate) => candidate.email?.toLowerCase() === target)
    if (match) return match.id
    if (data.users.length < 1000) break
  }

  return null
}

/** Concede el producto. Lee, compara rangos y escribe: un solo escritor por evento. */
export async function grantProduct(
  admin: SupabaseClient,
  userId: string,
  product: Product,
  sessionId: string,
  customerId?: string | null,
): Promise<DeliveryResult> {
  const { data: current, error: readError } = await admin
    .from('entitlements')
    .select('plan, daily_limit, local_daily_limit, active, stripe_customer_id')
    .eq('user_id', userId)
    .maybeSingle()

  if (readError) return { status: 'error', detail: readError.message }

  const grant = product.grant
  const keepPlan =
    PLAN_RANK[current?.plan ?? 'free'] > PLAN_RANK[grant.plan] ? (current?.plan ?? 'enrolled') : grant.plan

  const payload = {
    user_id: userId,
    plan: keepPlan,
    active: true,
    daily_limit: Math.max(current?.daily_limit ?? 0, grant.dailyLimit),
    local_daily_limit: Math.max(current?.local_daily_limit ?? 0, grant.localDailyLimit),
    last_stripe_session_id: sessionId,
    // Se guarda el cliente: es la única forma de revocar el acceso cuando la
    // suscripción deja de pagar, porque ese evento no lleva userId.
    stripe_customer_id: customerId ?? current?.stripe_customer_id ?? null,
    access_expires_at: grant.accessDays
      ? new Date(Date.now() + grant.accessDays * 86_400_000).toISOString()
      : null,
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

/**
 * Idempotencia de eventos. Stripe reintenta hasta 3 días; sin esta tabla cada
 * reintento reescribía el plan y pisaba `stripe_session_id`.
 *
 * Devuelve `false` si el evento ya se procesó, para que el webhook responda
 * 200 sin repetir la entrega.
 */
export async function claimEvent(admin: SupabaseClient, id: string, type: string): Promise<boolean> {
  const { error } = await admin.from('stripe_events').insert({ id, type })
  // 23505 = unique_violation: otro intento lo reclamó primero. No es un fallo.
  if (error && error.code !== '23505') return false
  return !error
}

/** Suelta la cuota cuando la suscripción deja de pagar. */
export async function deactivateSubscription(admin: SupabaseClient, userId: string): Promise<DeliveryResult> {
  const { error } = await admin
    .from('entitlements')
    .update({ active: false, plan: 'free', daily_limit: 0, local_daily_limit: 10 })
    .eq('user_id', userId)
  if (error) return { status: 'error', detail: error.message }
  return { status: 'granted', userId }
}
