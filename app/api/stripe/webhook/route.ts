import { NextResponse } from 'next/server'
import Stripe from 'stripe'

import {
  claimEvent,
  deactivateSubscription,
  grantProduct,
  queuePendingPayment,
  releaseEventClaim,
  resolveUserId,
} from '@/lib/fulfilment'
import { findProduct } from '@/lib/products'
import { createAdminClient } from '@/lib/supabase/admin'

export const runtime = 'nodejs'

export async function POST(request: Request) {
  const secretKey = process.env.STRIPE_SECRET_KEY
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET

  if (!secretKey || !webhookSecret) {
    return NextResponse.json({ error: 'El webhook de Stripe no está configurado.' }, { status: 503 })
  }

  const admin = createAdminClient()
  if (!admin) {
    // Mensaje genérico al cliente: nombrar la variable que falta (como hacía
    // SERVICE_NOT_CONFIGURED) fingerprinta el estado de configuración ante
    // cualquier llamador no autenticado. El detalle va solo al log.
    console.error('[webhook] admin no configurado: falta service_role')
    return NextResponse.json({ error: 'El webhook no está configurado.' }, { status: 503 })
  }

  const signature = request.headers.get('stripe-signature')
  if (!signature) return NextResponse.json({ error: 'Falta la firma.' }, { status: 400 })

  const payload = await request.text()

  let event: Stripe.Event
  try {
    event = new Stripe(secretKey).webhooks.constructEvent(payload, signature, webhookSecret)
  } catch {
    return NextResponse.json({ error: 'Firma inválida.' }, { status: 400 })
  }

  const claim = await claimEvent(admin, event.id, event.type)
  if (claim === 'duplicate') return NextResponse.json({ received: true, duplicate: true })
  if (claim === 'error') return NextResponse.json({ error: 'No se pudo registrar el evento.' }, { status: 500 })

  try {
    let response: Response

    if (event.type === 'checkout.session.completed' || event.type === 'checkout.session.async_payment_succeeded') {
      response = await handleCheckoutCompleted(admin, event.data.object as Stripe.Checkout.Session, event.type)
    } else if (event.type === 'customer.subscription.deleted') {
      response = await handleSubscriptionDeleted(admin, event.data.object as Stripe.Subscription)
    } else if (event.type === 'invoice.payment_failed') {
      // Un intento de cobro fallido no significa que la suscripción haya
      // terminado: Stripe puede reintentar y el periodo de gracia sigue vigente.
      response = NextResponse.json({ received: true, deferred: 'subscription-not-deleted' })
    } else {
      response = NextResponse.json({ received: true, ignored: event.type })
    }

    if (response.status >= 500) await releaseEventClaim(admin, event.id)
    return response
  } catch (error) {
    console.error('[webhook] fallo inesperado al procesar evento', {
      eventId: event.id,
      type: event.type,
      message: error instanceof Error ? error.message : String(error),
    })
    await releaseEventClaim(admin, event.id)
    return NextResponse.json({ error: 'No se pudo procesar el evento.' }, { status: 500 })
  }
}

async function handleCheckoutCompleted(
  admin: NonNullable<ReturnType<typeof createAdminClient>>,
  session: Stripe.Checkout.Session,
  eventType: string,
) {
  // `async_payment_succeeded` ya implica pago confirmado: exigir además
  // `payment_status === 'paid'` descartaba la entrega en variantes de cobro
  // diferido donde Stripe reporta otro estado y la reclamación no se liberaba
  // (ni reintento ni entrega).
  const paid =
    eventType === 'checkout.session.async_payment_succeeded' ||
    session.payment_status === 'paid' ||
    session.payment_status === 'succeeded'
  if (!paid) return NextResponse.json({ received: true, pending: session.payment_status })

  const product = findProduct(session.metadata?.productId)
  if (!product) {
    console.error('[webhook] productId no reconocido en la Session', {
      sessionId: session.id,
      productId: session.metadata?.productId ?? null,
    })
    // Se reconoce el evento para evitar reintentos inútiles; requiere revisión
    // manual porque la metadata no permite identificar de forma segura el plan.
    return NextResponse.json({ received: true, unknownProduct: true })
  }

  // La entrega no depende solo de la metadata: si el precio de Stripe cambió
  // tras crear la Session, el monto cobrado no corresponde al producto. Se
  // verifica moneda y, en compras únicas sin cupón, el monto. Con cupón
  // (allow_promotion_codes) el monto puede ser menor de forma legítima, así
  // que solo se bloquea sin descuentos aplicados.
  const currency = (session.currency ?? '').toLowerCase()
  if (currency && currency !== 'mxn') {
    console.error('[webhook] moneda inesperada en la Session', { sessionId: session.id, currency })
    return NextResponse.json({ received: true, amountMismatch: true })
  }
  const hasDiscount =
    (session.total_details?.amount_discount ?? 0) > 0 ||
    (Array.isArray(session.discounts) && session.discounts.length > 0) ||
    (Array.isArray((session as unknown as { discounts?: unknown[] }).discounts) && (session as unknown as { discounts?: unknown[] }).discounts!.length > 0)
  const amountTotal = typeof session.amount_total === 'number' ? session.amount_total : null
  if (
    product.mode === 'payment' &&
    !product.stripePriceId &&
    !hasDiscount &&
    amountTotal !== null &&
    amountTotal !== product.priceInCents
  ) {
    console.error('[webhook] monto no coincide con el precio del catálogo', {
      sessionId: session.id,
      productId: product.id,
      amountTotal,
      expected: product.priceInCents,
    })
    return NextResponse.json({ received: true, amountMismatch: true })
  }

  const email = session.customer_details?.email ?? session.customer_email
  const userId = await resolveUserId(admin, {
    clientReferenceId: session.client_reference_id ?? session.metadata?.userId ?? null,
    email,
  })

  if (!userId) {
    if (!email) {
      // No retryable: ningún reintento de Stripe hace aparecer un correo.
      // Devolver 500 dejaba el endpoint en reintentos hasta que Stripe lo
      // deshabilita; se reconoce el evento y queda en log para revisión
      // manual con el sessionId.
      console.error('[webhook] pago sin correo ni referencia, no es reconciliable', { sessionId: session.id })
      return NextResponse.json({ received: true, unreconcilable: true })
    }
    const queued = await queuePendingPayment(admin, {
      sessionId: session.id,
      email,
      productId: product.id,
    })
    if (queued.status === 'error') {
      console.error('[webhook] no se pudo encolar la entrega', queued.detail)
      return NextResponse.json({ error: 'No se pudo registrar el pago.' }, { status: 500 })
    }
    return NextResponse.json({ received: true, queued: true })
  }

  const subscriptionId = typeof session.subscription === 'string' ? session.subscription : session.subscription?.id
  const delivered = await grantProduct(
    admin,
    userId,
    product,
    session.id,
    typeof session.customer === 'string' ? session.customer : session.customer?.id,
    subscriptionId,
  )
  if (delivered.status === 'error') {
    console.error('[webhook] la entrega falló, Stripe debe reintentar', delivered.detail)
    return NextResponse.json({ error: 'No se pudo activar el acceso.' }, { status: 500 })
  }

  return NextResponse.json({ received: true, granted: delivered.status, plan: product.grant.plan })
}

async function handleSubscriptionDeleted(
  admin: NonNullable<ReturnType<typeof createAdminClient>>,
  subscription: Stripe.Subscription,
) {
  const { data: row, error } = await admin
    .from('entitlements')
    .select('user_id')
    .eq('subscription_id', subscription.id)
    .maybeSingle()

  if (error) return NextResponse.json({ error: 'No se pudo localizar la suscripción.' }, { status: 500 })
  if (!row?.user_id) return NextResponse.json({ received: true, skipped: 'unknown-subscription' })

  const result = await deactivateSubscription(admin, row.user_id)
  if (result.status === 'error') {
    console.error('[webhook] no se pudo revocar la suscripción', result.detail)
    return NextResponse.json({ error: 'No se pudo revocar el acceso.' }, { status: 500 })
  }

  return NextResponse.json({ received: true, revoked: true })
}
