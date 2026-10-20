import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { COURSE_PRODUCT } from '@/lib/products'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const email = typeof body.email === 'string' ? body.email.trim() : ''
    if (!email || !email.includes('@')) return NextResponse.json({ error: 'Ingresa un correo válido.' }, { status: 400 })

    const secretKey = process.env.STRIPE_SECRET_KEY
    if (!secretKey) return NextResponse.json({ error: 'Stripe aún no está configurado en este entorno.' }, { status: 503 })

    const stripe = new Stripe(secretKey)
    const origin = request.headers.get('origin') ?? 'http://localhost:3000'
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      customer_email: email,
      line_items: [{ price_data: { currency: 'mxn', product_data: { name: COURSE_PRODUCT.name, description: COURSE_PRODUCT.description }, unit_amount: COURSE_PRODUCT.priceInCents }, quantity: 1 }],
      success_url: `${origin}/?checkout=success`,
      cancel_url: `${origin}/?checkout=cancelled`,
      metadata: { productId: COURSE_PRODUCT.id },
      integration_identifier: `playandgo_${Math.random().toString(36).slice(2, 10)}`,
    })

    return NextResponse.json({ url: session.url })
  } catch {
    return NextResponse.json({ error: 'No pudimos iniciar el pago. Intenta nuevamente.' }, { status: 500 })
  }
}
