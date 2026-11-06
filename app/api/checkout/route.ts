import { NextResponse } from 'next/server'
import Stripe from 'stripe'

import { requireAppUrl } from '@/lib/app-url'
import { findProduct, PRODUCTS, type ProductId } from '@/lib/products'
import { SUPABASE_NOT_CONFIGURED } from '@/lib/supabase/config'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

/**
 * Inicia el cobro.
 *
 * Tres cosas estaban rotas aquí y ninguna se veía en el código:
 *
 * 1. El único llamador mandaba `{ email }` y esta ruta exigía `productId`, así
 *    que el 100 % de los checkout respondía 400. Nadie podía pagar.
 * 2. `mode` estaba fijo en `'payment'`, aunque el producto se vende como acceso
 *    continuo: no existía la suscripción que el propio proyecto promete.
 * 3. No había `Idempotency-Key`, así que un doble clic creaba dos Sessions y
 *    dos cobros del mismo curso.
 *
 * El correo ya no se acepta del cuerpo: se lee de la sesión verificada. Aceptar
 * un email arbitrario era dejar que alguien iniciara un pago a nombre de otro.
 */
export async function POST(request: Request) {
  const supabase = await createClient()
  if (!supabase) return NextResponse.json({ error: SUPABASE_NOT_CONFIGURED, code: 'not_configured' }, { status: 503 })

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user?.email) {
    return NextResponse.json({ error: 'Inicia sesión para inscribirte.', code: 'unauthorized' }, { status: 401 })
  }

  const body = (await request.json().catch(() => null)) as { productId?: unknown } | null
  const product = findProduct(body?.productId)
  if (!product) {
    return NextResponse.json(
      { error: 'Producto no válido.', code: 'invalid_request', available: Object.keys(PRODUCTS) },
      { status: 400 },
    )
  }

  const secretKey = process.env.STRIPE_SECRET_KEY
  if (!secretKey) {
    return NextResponse.json(
      { error: 'Los pagos todavía no están configurados en este entorno.', code: 'not_configured' },
      { status: 503 },
    )
  }

  const app = requireAppUrl(request)
  if ('error' in app) return NextResponse.json({ error: app.error, code: 'not_configured' }, { status: 503 })

  // Ventana de un minuto por usuario y producto: mata el doble clic sin
  // impedir que alguien compre la extensión después del curso.
  const idempotencyKey = `pg:${user.id}:${product.id}:${Math.floor(Date.now() / 60_000)}`

  const stripe = new Stripe(secretKey)

  try {
    const session = await stripe.checkout.sessions.create(
      {
        mode: product.mode,
        customer_email: user.email,
        line_items: product.stripePriceId
          ? [{ price: product.stripePriceId, quantity: 1 }]
          : [
              {
                price_data: {
                  currency: 'mxn',
                  product_data: { name: product.name, description: product.description },
                  unit_amount: product.priceInCents,
                  ...(product.mode === 'subscription' && product.interval
                    ? { recurring: { interval: product.interval } }
                    : {}),
                },
                quantity: 1,
              },
            ],
        success_url: `${app.url}/?checkout=success&productId=${product.id}`,
        cancel_url: `${app.url}/?checkout=cancelled`,
        metadata: { productId: product.id, userId: user.id },
        // El webhook no siempre recibe el userId si la cuenta cambia de correo;
        // con esto la entrega puede reconciliarse sin enumerar usuarios.
        client_reference_id: user.id,
        allow_promotion_codes: true,
      },
      { idempotencyKey },
    )

    if (!session.url) {
      return NextResponse.json({ error: 'Stripe no devolvió una URL de pago.', code: 'provider_unreachable' }, { status: 502 })
    }

    return NextResponse.json({ url: session.url, sessionId: session.id })
  } catch (error) {
    // El detalle técnico se queda en el servidor; el usuario recibe una frase
    // que no filtra configuración interna.
    console.error('[checkout] Stripe rechazó la sesión', {
      message: error instanceof Error ? error.message : String(error),
      productId: product.id,
    })
    return NextResponse.json(
      { error: 'No pudimos iniciar el pago. Intenta nuevamente o escríbenos.', code: 'provider_unreachable' },
      { status: 502 },
    )
  }
}

export type { ProductId }
