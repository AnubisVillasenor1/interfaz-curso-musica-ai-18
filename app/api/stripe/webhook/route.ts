import { NextResponse } from 'next/server'
import Stripe from 'stripe'

import {
  claimEvent,
  deactivateSubscription,
  grantProduct,
  queuePendingPayment,
  resolveUserId,
} from '@/lib/fulfilment'
import { findProduct } from '@/lib/products'
import { SERVICE_NOT_CONFIGURED, createAdminClient } from '@/lib/supabase/admin'

export const runtime = 'nodejs'

/**
 * Webhook de Stripe.
 *
 * Reglas que este handler ahora respeta y antes no:
 *
 * - Un evento se procesa una vez (`stripe_events`), porque Stripe reintenta.
 * - `payment_status` admite `paid` y `succeeded`; lo otro era anular el propio
 *   evento `checkout.session.async_payment_succeeded` que se declaraba soportado.
 * - `productId` se valida contra la lista blanca: sin ella, un metadata
 *   mal escrito o manipulado entregaba el plan caro pagando el barato.
 * - Cualquier fallo real de entrega devuelve 500 a propósito, para que Stripe
 *   reintente. Responder 200 sobre un error era borrar la evidencia del dinero.
 */
export async function POST(request: Request) {
  const secretKey = process.env.STRIPE_SECRET_KEY
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET

  if (!secretKey || !webhookSecret) {
    return NextResponse.json({ error: 'El webhook de Stripe no está configurado.' }, { status: 503 })
  }

  const admin = createAdminClient()
  if (!admin) return NextResponse.json({ error: SERVICE_NOT_CONFIGURED }, { status: 503 })

  const signature = request.headers.get('stripe-signature')
  if (!signature) return NextResponse.json({ error: 'Falta la firma.' }, { status: 400 })

  const payload = await request.text()

  let event: Stripe.Event
  try {
    event = new Stripe(secretKey).webhooks.constructEvent(payload, signature, webhookSecret)
  } catch {
    return NextResponse.json({ error: 'Firma inválida.' }, { status: 400 })
  }

  const isNew = await claimEvent(admin, event.id, event.type)
  if (!isNew) return NextResponse.json({ received: true, duplicate: true })

  if (event.type === 'checkout.session.completed' || event.type === 'checkout.session.async_payment_succeeded') {
    return handleCheckoutCompleted(admin, event.data.object as Stripe.Checkout.Session)
  }

  if (event.type === 'customer.subscription.deleted' || event.type === 'invoice.payment_failed') {
    return handleSubscriptionLost(admin, event.data.object as Stripe.Subscription | Stripe.Invoice)
  }

  return NextResponse.json({ received: true, ignored: event.type })
}

async function handleCheckoutCompleted(
  admin: ReturnType<typeof createAdminClient>,
  session: Stripe.Checkout.Session,
) {
  if (!admin) return NextResponse.json({ error: 'admin no disponible' }, { status: 503 })

  const paid = session.payment_status === 'paid' || session.payment_status === 'succeeded'
  if (!paid) return NextResponse.json({ received: true, pending: session.payment_status })

  const product = findProduct(session.metadata?.productId)
  if (!product) {
    // Un `productId` desconocido no puede interpretarse: se registra y se
    // avisa, en vez de regalar el plan más caro.
    console.error('[webhook] productId no reconocido en la Session', {
      sessionId: session.id,
      productId: session.metadata?.productId ?? null,
    })
    return NextResponse.json({ received: true, unknownProduct: true })
  }

  const email = session.customer_details?.email ?? session.customer_email
  const userId = await resolveUserId(admin, {
    clientReferenceId: session.client_reference_id ?? session.metadata?.userId ?? null,
    email,
  })

  if (!userId) {
    if (!email) {
      console.error('[webhook] pago sin correo ni referencia, no es reconciliable', { sessionId: session.id })
      return NextResponse.json({ error: 'El pago no tiene correo ni referencia.' }, { status: 422 })
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

  const delivered = await grantProduct(
    admin,
    userId,
    product,
    session.id,
    typeof session.customer === 'string' ? session.customer : null,
  )
  if (delivered.status === 'error') {
    console.error('[webhook] la entrega falló, Stripe debe reintentar', delivered.detail)
    return NextResponse.json({ error: 'No se pudo activar el acceso.' }, { status: 500 })
  }

  return NextResponse.json({ received: true, granted: delivered.status, plan: product.grant.plan })
}

async function handleSubscriptionLost(
  admin: ReturnType<typeof createAdminClient>,
  object: Stripe.Subscription | Stripe.Invoice,
) {
  if (!admin) return NextResponse.json({ error: 'admin no disponible' }, { status: 503 })

  const customerId = object.customer as string | null
  if (!customerId) return NextResponse.json({ received: true, skipped: 'no-customer' })

  const { data: row } = await admin
    .from('entitlements')
    .select('user_id')
    .eq('stripe_customer_id', customerId)
    .maybeSingle()

  if (!row?.user_id) return NextResponse.json({ received: true, skipped: 'unknown-customer' })

  const result = await deactivateSubscription(admin, row.user_id)
  if (result.status === 'error') {
    return NextResponse.json({ error: 'No se pudo revocar el acceso.' }, { status: 500 })
  }

  return NextResponse.json({ received: true, revoked: true })
}
