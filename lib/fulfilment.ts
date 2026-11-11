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

type EntitlementSnapshot = {
  plan?: string | null
  base_plan?: string | null
  extension_expires_at?: string | null
  access_expires_at?: string | null
  active?: boolean | null
  subscription_id?: string | null
  subscription_status?: string | null
  current_period_end?: string | null
  entitlement_reconciliation_required?: boolean | null
}

type EffectiveState = {
  plan: 'free' | 'enrolled' | 'extension' | 'pro'
  active: boolean
  dailyLimit: number
  localDailyLimit: number
  extensionExpiresAt: string | null
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
 * El curso permanente, la extensión temporal y la suscripción son derechos
 * independientes. Nunca inferimos una compra permanente desde una extensión.
 */
function deriveEffectiveState(snapshot: EntitlementSnapshot, now = Date.now()): EffectiveState {
  const basePlan = snapshot.base_plan === 'enrolled'
    || (snapshot.base_plan == null && snapshot.plan === 'enrolled')
    ? 'enrolled'
    : 'free'
  const extensionExpiresAt = snapshot.extension_expires_at ?? snapshot.access_expires_at ?? null
  const reconciliationRequired = Boolean(snapshot.entitlement_reconciliation_required)
  const extensionActive = !reconciliationRequired && isFutureDate(extensionExpiresAt, now)
  const rawStatus = snapshot.subscription_status ?? ''
  const periodEndIsFuture = isFutureDate(snapshot.current_period_end, now)
  const proActive = Boolean(
    !reconciliationRequired
    && snapshot.subscription_id
    && PRO_ACTIVE_STATUSES.has(rawStatus)
    && periodEndIsFuture,
  )

  const plan: EffectiveState['plan'] = proActive
    ? 'pro'
    : basePlan === 'enrolled'
      ? 'enrolled'
      : extensionActive
        ? 'extension'
        : 'free'

  const dailyLimit = proActive
    ? 20
    : basePlan === 'enrolled' && extensionActive
      ? 10
      : basePlan === 'enrolled'
        ? 2
        : extensionActive
          ? 10
          : 0
  const localDailyLimit = proActive
    ? 100
    : basePlan === 'enrolled' && extensionActive
      ? 40
      : basePlan === 'enrolled'
        ? 20
        : extensionActive
          ? 40
          : 10

  return {
    plan,
    active: proActive || basePlan === 'enrolled' || extensionActive,
    dailyLimit,
    localDailyLimit,
    extensionExpiresAt,
  }
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
  const { data: current, error: readError } = await admin
    .from('entitlements')
    .select('plan, base_plan, extension_expires_at, daily_limit, local_daily_limit, active, stripe_customer_id, subscription_id, subscription_status, current_period_end, access_expires_at, entitlement_reconciliation_required')
    .eq('user_id', userId)
    .maybeSingle()

  if (readError) return { status: 'error', detail: readError.message }

  let basePlan = current?.base_plan ?? (current?.plan === 'enrolled' ? 'enrolled' : 'free')
  let extensionExpiresAt: string | null = current?.extension_expires_at ?? current?.access_expires_at ?? null
  let subscriptionId: string | null = current?.subscription_id ?? null
  let subscriptionStatus: string | null = current?.subscription_status ?? null
  let currentPeriodEnd: string | null = current?.current_period_end ?? null
  let reconciliationRequired = Boolean(current?.entitlement_reconciliation_required)

  if (product.id === 'play-and-go-course') {
    basePlan = 'enrolled'
  } else if (product.id === 'play-and-go-extension') {
    const days = product.grant.accessDays
    if (days === null || days <= 0) {
      return { status: 'error', detail: 'La extensión debe tener una duración temporal válida.' }
    }
    const priorTimestamp = extensionExpiresAt ? Date.parse(extensionExpiresAt) : 0
    extensionExpiresAt = new Date(Math.max(Date.now(), Number.isFinite(priorTimestamp) ? priorTimestamp : 0) + days * 86_400_000).toISOString()
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
    reconciliationRequired = false
  } else {
    return { status: 'error', detail: 'El producto no tiene una regla de entrega reconocida.' }
  }

  const state = deriveEffectiveState({
    plan: product.mode === 'subscription' ? 'pro' : current?.plan,
    base_plan: basePlan,
    extension_expires_at: extensionExpiresAt,
    access_expires_at: current?.access_expires_at,
    subscription_id: subscriptionId,
    subscription_status: subscriptionStatus,
    current_period_end: currentPeriodEnd,
    entitlement_reconciliation_required: reconciliationRequired,
  })

  const payload = {
    user_id: userId,
    base_plan: basePlan,
    extension_expires_at: extensionExpiresAt,
    plan: state.plan,
    active: state.active,
    daily_limit: state.dailyLimit,
    local_daily_limit: state.localDailyLimit,
    access_expires_at: state.plan === 'extension' ? extensionExpiresAt : null,
    last_stripe_session_id: sessionId,
    stripe_customer_id: customerId ?? current?.stripe_customer_id ?? null,
    subscription_id: subscriptionId,
    subscription_status: subscriptionStatus,
    current_period_end: currentPeriodEnd,
    entitlement_reconciliation_required: reconciliationRequired,
  }

  const { error } = await admin.from('entitlements').upsert(payload, { onConflict: 'user_id' })
  if (error) return { status: 'error', detail: error.message }

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
