'use client'

import { useState } from 'react'
import { Check, Sparkles } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  FREE_TIER,
  PRODUCTS,
  PRODUCT_IDS,
  formatPrice,
  priceLabel,
  type ProductId,
} from '@/lib/products'
import { createClient } from '@/lib/supabase/client'

/**
 * Tabla de precios.
 *
 * Todo se lee de `lib/products.ts`, la única fuente de verdad. No hay un solo
 * número escrito a mano aquí: antes la landing decía $490, el chat $500 y la
 * pasarela cobraba 50000 centavos. Aquí lo que se anuncia es literalmente lo
 * que `/api/checkout` va a cobrar, porque ambos leen el mismo objeto.
 */
export function PricingTable() {
  const [busyId, setBusyId] = useState<ProductId | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  async function checkout(productId: ProductId) {
    if (busyId) return
    setMessage(null)

    // Sin credenciales públicas no hay sesión que verificar: lo decimos en
    // palabras en lugar de mandar un POST que rebotaría.
    const supabase = createClient()
    if (!supabase) {
      setMessage('Los pagos no están configurados en este entorno. Intenta más tarde.')
      return
    }

    // Flujo honesto: sin sesión no disparamos un POST que devolvería 401. Lo
    // mandamos a /auth y, al volver, regresa a /precios.
    const { data } = await supabase.auth.getUser()
    if (!data.user) {
      window.location.href = `/auth?next=/precios`
      return
    }

    setBusyId(productId)
    try {
      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId }),
      })
      const result = (await response.json().catch(() => null)) as
        | { url?: string; sessionId?: string; error?: string }
        | null

      if (response.ok && result?.url) {
        window.location.href = result.url
        return
      }
      if (response.status === 503) {
        setMessage(result?.error ?? 'Los pagos todavía no están configurados en este entorno.')
      } else {
        setMessage(result?.error ?? 'No pudimos iniciar el pago. Intenta nuevamente.')
      }
    } catch {
      setMessage('Se perdió la conexión al iniciar el pago. Revisa tu red e inténtalo otra vez.')
    } finally {
      setBusyId(null)
    }
  }

  return (
    <section className="mx-auto w-full max-w-6xl">
      <div className="grid gap-5 lg:grid-cols-4">
        {/* Plan gratuito: coincide con los defaults de la tabla entitlements. */}
        <article className="flex flex-col rounded-3xl border border-white/10 bg-white/[.035] p-6">
          <p className="text-[10px] uppercase tracking-[.2em] text-[#8cecf3]">Explora gratis</p>
          <h2 className="mt-2 text-lg font-semibold">{FREE_TIER.plan === 'free' ? 'Plan gratuito' : FREE_TIER.plan}</h2>
          <p className="mt-3 text-3xl font-semibold">{formatPrice(0)}</p>
          <p className="mt-2 text-xs leading-5 text-[#8fa9b5]">
            Conoce el motor local sin pagar. Sin composiciones con el proveedor de pago.
          </p>
          <ul className="mt-5 flex flex-col gap-2 text-xs text-[#b5cbd4]">
            <li className="flex items-center gap-2">
              <Check className="text-[#75e9f2]" size={15} />
              {FREE_TIER.localDailyLimit} canciones locales al día
            </li>
            <li className="flex items-center gap-2">
              <Check className="text-[#75e9f2]" size={15} />
              {FREE_TIER.dailyLimit} canciones con proveedor de pago
            </li>
          </ul>
          <div className="mt-auto pt-6">
            <a
              href="/studio"
              className="flex h-11 items-center justify-center rounded-full border border-white/15 text-sm text-[#c4d8df] transition hover:bg-white/5 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-[#75e9f2]/50"
            >
              Probar el motor local
            </a>
          </div>
        </article>

        {PRODUCT_IDS.map((id) => {
          const product = PRODUCTS[id]
          const isSub = product.mode === 'subscription'
          return (
            <article
              key={product.id}
              className={`relative flex flex-col rounded-3xl border p-6 ${
                id === 'play-and-go-course'
                  ? 'border-[#75e9f2]/40 bg-[#75e9f2]/[.06]'
                  : 'border-white/10 bg-white/[.035]'
              }`}
            >
              {id === 'play-and-go-course' && (
                <span className="absolute -top-3 left-6 inline-flex items-center gap-1 rounded-full bg-[#75e9f2] px-3 py-1 text-[10px] font-semibold uppercase tracking-[.16em] text-[#06131e]">
                  <Sparkles size={12} /> Recomendado
                </span>
              )}
              <p className="text-[10px] uppercase tracking-[.2em] text-[#ff9eea]">
                {isSub ? 'Mensual' : 'Pago único'}
              </p>
              <h2 className="mt-2 text-base font-semibold leading-tight">{product.name}</h2>
              <p className="mt-3 text-3xl font-semibold tracking-tight">{priceLabel(product)}</p>
              <p className="mt-2 min-h-10 text-xs leading-5 text-[#8fa9b5]">{product.description}</p>
              <ul className="mt-5 flex flex-col gap-2 text-xs text-[#b5cbd4]">
                <li className="flex items-center gap-2">
                  <Check className="text-[#75e9f2]" size={15} />
                  {product.grant.dailyLimit} canciones/día con proveedor de pago
                </li>
                <li className="flex items-center gap-2">
                  <Check className="text-[#c09eff]" size={15} />
                  {product.grant.localDailyLimit} canciones/día en motor local
                </li>
                <li className="flex items-center gap-2">
                  <Check className="text-[#ffcf72]" size={15} />
                  {product.grant.accessDays === null
                    ? 'Acceso permanente mientras la suscripción aguante'
                    : `Acceso por ${product.grant.accessDays} días`}
                </li>
              </ul>
              <div className="mt-auto pt-6">
                <Button
                  onClick={() => checkout(product.id)}
                  disabled={busyId !== null}
                  aria-label={`Elegir ${product.name}`}
                  className="h-11 w-full rounded-full bg-[#75e9f2] font-semibold text-[#06131e] hover:bg-[#a0f4f9] disabled:opacity-60"
                >
                  {busyId === product.id ? 'Preparando pago…' : isSub ? 'Suscribirme' : 'Inscribirme'}
                </Button>
              </div>
            </article>
          )
        })}
      </div>

      <p aria-live="polite" className="mt-6 text-center text-xs text-[#ffcf72]">
        {message}
      </p>
      <p className="mt-4 text-center text-[10px] text-[#6f8995]">
        Pagos procesados de forma segura por Stripe. Los precios están en pesos mexicanos.
      </p>
    </section>
  )
}
