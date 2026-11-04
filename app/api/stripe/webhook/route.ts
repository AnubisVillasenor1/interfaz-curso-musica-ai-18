import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'
import { COURSE_PRODUCT, EXTENSION_PRODUCT } from '@/lib/products'

export const runtime = 'nodejs'

function adminClient() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { autoRefreshToken: false, persistSession: false } })
}

export async function POST(request: Request) {
  const secret = process.env.STRIPE_SECRET_KEY
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET
  if (!secret || !webhookSecret) return NextResponse.json({ error: 'Stripe webhook no configurado.' }, { status: 503 })
  const signature = request.headers.get('stripe-signature')
  if (!signature) return NextResponse.json({ error: 'Firma requerida.' }, { status: 400 })
  const payload = await request.text()
  let event: Stripe.Event
  try { event = new Stripe(secret).webhooks.constructEvent(payload, signature, webhookSecret) } catch { return NextResponse.json({ error: 'Firma inválida.' }, { status: 400 }) }
  if (event.type !== 'checkout.session.completed' && event.type !== 'checkout.session.async_payment_succeeded') return NextResponse.json({ received: true })
  const session = event.data.object as Stripe.Checkout.Session
  if (session.payment_status !== 'paid') return NextResponse.json({ received: true })
  const email = session.customer_details?.email ?? session.customer_email
  if (!email) return NextResponse.json({ error: 'El pago no tiene correo.' }, { status: 422 })
  const supabase = adminClient()
  const { data: users } = await supabase.auth.admin.listUsers({ perPage: 1000 })
  const user = users.users.find(candidate => candidate.email?.toLowerCase() === email.toLowerCase())
  if (!user) return NextResponse.json({ received: true, pendingUser: true })
  const productId = session.metadata?.productId
  const product = productId === EXTENSION_PRODUCT.id ? EXTENSION_PRODUCT : COURSE_PRODUCT
  const { data: current } = await supabase.from('entitlements').select('daily_limit,active').eq('user_id', user.id).maybeSingle()
  const dailyLimit = product.id === EXTENSION_PRODUCT.id ? Math.max(current?.daily_limit ?? 0, 10) : Math.max(current?.daily_limit ?? 0, 2)
  await supabase.from('entitlements').upsert({ user_id: user.id, plan: product.id === EXTENSION_PRODUCT.id ? 'extension' : 'enrolled', daily_limit: dailyLimit, active: true, stripe_session_id: session.id }, { onConflict: 'user_id' })
  return NextResponse.json({ received: true })
}
