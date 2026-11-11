import type { SupabaseClient } from '@supabase/supabase-js'

import type { Product } from '@/lib/products'

export interface DeliveryResult {
  status: 'granted' | 'queued' | 'error'
  userId?: string
  detail?: string
}

/** Snapshot verificado desde la API de Stripe; currentPeriodEnd usa epoch seconds. */
export interface SubscriptionSnapshot {
  id: string
  status: string
  currentPeriodEnd: number | null
}

const PRO_ACTIVE_STATUSES = new Set(['active', 'trialing', 'past_due'])

function isFutureDate(value: string | null | undefined, now = Date.now()): boolean {
  if (!value) return false
  const timestamp = Date.parse(value)
  return Number.isFinite(timestamp) && timestamp > now
}

function periodEndIso(seconds: number | null | undefined): string | null {
  if (typeof seconds !== 'number' || !Number.isFinite(seconds) || seconds <= 0) return null
  return new Date(seconds * 1000).toISOString()
}

/**
 * Encuentra al comprador. Primero por client_reference_id y, si falta,
 * recorre las páginas de usuarios de Supabase Auth.
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
  for (let page = 1; page <= 20; page += 1) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 50 })
    if (error) return null
    const match = data.users.find((candidate) => candidate.email?.toLowerCase() === target)
    if (match) return match.id
    if (data.users.length < 50) break
  }

  return null
}

/** Concede el producto actual sin borrar derechos independientes ya adquiridos. */
export async function grantProduct(
  admin: SupabaseClient,
  userId: string,
  product: Product,
  sessionId: string,
  customerId?: string | null,
  subscription?: SubscriptionSnapshot | null,
): Promise<DeliveryResult> {
  let extensionDays: number | null = null
  let subscriptionId: string | null = null
  let subscriptionStatus: string | null = null
  let currentPeriodEnd: string | null = null

  if (product.id === 'play-and-go-course') {
    // Sin datos adicionales: la compra permanente sólo cambia `base_plan`.
  } else if (product.id === 'play-and-go-extension') {
    const days = product.grant.accessDays
    if (days === null || days <= 0) {
      return { status: 'error', detail: 'La extensión debe tener una duración temporal válida.' }
    }
    extensionDays = days
  } else if (product.id === 'play-and-go-pro') {
    if (!subscription || !subscription.id || !PRO_ACTIVE_STATUSES.has(subscription.status)) {
      return { status: 'error', detail: 'No existe un snapshot activo y verificado de la suscripción.' }
    }
    const verifiedPeriodEnd = periodEndIso(subscription.currentPeriodEnd)
    if (!verifiedPeriodEnd || !isFutureDate(verifiedPeriodEnd)) {
      return { status: 'error', detail: 'La suscripción no tiene una fecha de vigencia futura verificada.' }
    }
    subscriptionId = subscription.id
    subscriptionStatus = subscription.status
    currentPeriodEnd = verifiedPeriodEnd
  } else {
    return { status: 'error', detail: 'El producto no tiene una regla de entrega reconocida.' }
  }

  // La lectura-cálculo-escritura anterior permitía que dos webhooks
  // concurrentes se pisaran. La transacción en Postgres bloquea por usuario y
  // registra la sesión de Checkout para que un evento reenviado no vuelva a
  // conceder una extensión. Requiere la migración
  // 20261111170000_transactional_fulfilment.sql aplicada.
  const { data, error } = await admin.rpc('grant_product_entitlement', {
    p_user_id: userId,
    p_product_id: product.id,
    p_session_id: sessionId,
    p_customer_id: customerId ?? null,
    p_subscription_id: subscriptionId,
    p_subscription_status: subscriptionStatus,
    p_current_period_end: currentPeriodEnd,
    p_extension_days: extensionDays,
  })

  if (error) {
    // PGRST202 significa que la función no existe todavía: la migración no se
    // aplicó en este entorno. Se devuelve error para que Stripe reintente y no
    // se conceda nada a medias.
    console.error('[fulfilment] grant_product_entitlement falló', {
      code: error.code,
      message: error.message,
      userId,
      product: product.id,
    })
    return { status: 'error', detail: error.message }
  }

  const result = data as { status?: string } | null
  if (result?.status === 'duplicate') {
    return { status: 'granted', userId, detail: 'duplicate_session' }
  }
  if (result?.status !== 'granted') {
    return { status: 'error', detail: 'La concesión no devolvió un estado reconocido.' }
  }

  return { status: 'granted', userId }
}

/** El pago se guarda con todos los datos de suscripción, incluso si no hay cuenta. */
export async function queuePendingPayment(
  admin: SupabaseClient,
  input: {
    sessionId: string
    email: string
    productId: string
    stripeCustomerId?: string | null
    subscription?: SubscriptionSnapshot | null
  },
): Promise<DeliveryResult> {
  if (input.productId === 'play-and-go-pro' && !input.subscription?.id) {
    return { status: 'error', detail: 'No se puede encolar una suscripción sin su identificador de Stripe.' }
  }

  const { error } = await admin.from('pending_fulfilments').upsert(
    {
      stripe_session_id: input.sessionId,
      email: input.email,
      product_id: input.productId,
      stripe_customer_id: input.stripeCustomerId ?? null,
      subscription_id: input.subscription?.id ?? null,
      subscription_status: input.subscription?.status ?? null,
      current_period_end: periodEndIso(input.subscription?.currentPeriodEnd),
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

/**
 * Revoca únicamente la suscripción indicada. Un webhook retrasado de una
 * suscripción anterior nunca puede revocar la suscripción que la reemplazó.
 */
export async function deactivateSubscription(
  admin: SupabaseClient,
  userId: string,
  subscriptionId: string,
): Promise<DeliveryResult> {
  const { data: current, error: readError } = await admin
    .from('entitlements')
    .select('subscription_id')
    .eq('user_id', userId)
    .maybeSingle()

  if (readError) return { status: 'error', detail: readError.message }
  if (!current || current.subscription_id !== subscriptionId) {
    return { status: 'granted', userId, detail: 'stale_subscription' }
  }

  const { data: updated, error: updateError } = await admin
    .from('entitlements')
    .update({
      subscription_id: null,
      subscription_status: 'canceled',
      current_period_end: null,
      entitlement_reconciliation_required: false,
    })
    .eq('user_id', userId)
    .eq('subscription_id', subscriptionId)
    .select('user_id')
    .maybeSingle()

  if (updateError) return { status: 'error', detail: updateError.message }
  if (!updated) return { status: 'granted', userId, detail: 'stale_subscription' }

  const { error: syncError } = await admin.rpc('sync_entitlement_effective_state', { p_owner: userId })
  if (syncError) return { status: 'error', detail: syncError.message }

  return { status: 'granted', userId }
}
