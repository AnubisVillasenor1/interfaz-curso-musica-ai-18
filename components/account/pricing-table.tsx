'use client'

import { useState } from 'react'
import { ArrowRight, Check, Sparkles } from 'lucide-react'

import { Reveal } from '@/components/reveal'
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
 *
 * Las tarjetas van acompañadas de una comparativa en tabla real. Cuatro
 * columnas paralelas obligan a memorizar la anterior para poder comparar, y
 * comparar es justo lo que alguien hace cuando decide un precio. La tabla no
 * inventa cifras: reconstruye las mismas columnas desde el catálogo, así que un
 * cambio de precio se ve en los dos sitios o en ninguno.
 */

type Column = {
  id: string
  name: string
  price: string
  charge: string
  paid: number
  local: number
  duration: string
}

/**
 * Nombre corto para el encabezado de la comparativa. Se deriva de
 * `product.name` en lugar de escribir otro literal suelto: si el catálogo
 * renombra un plan, la tabla se renombra con él.
 */
function shortName(name: string): string {
  return name.replace(/^Play and Go — /, '').replace(/ \(mensual\)$/, '')
}
const COLUMNS: Column[] = [
  {
    id: 'free',
    name: 'Gratuito',
    price: formatPrice(0),
    charge: 'Sin cobro',
    paid: FREE_TIER.dailyLimit,
    local: FREE_TIER.localDailyLimit,
    duration: 'Permanente',
  },
  ...PRODUCT_IDS.map((id) => {
    const product = PRODUCTS[id]
    const isSub = product.mode === 'subscription'
    return {
      id,
      name: shortName(product.name),
      price: priceLabel(product),
      charge: isSub ? 'Mensual' : 'Pago único',
      paid: product.grant.dailyLimit,
      local: product.grant.localDailyLimit,
      duration:
        product.grant.accessDays === null
          ? isSub
            ? 'Mientras pague'
            : 'Sin vencimiento'
          : `${product.grant.accessDays} días`,
    }
  }),
]

const NOTES = [
  {
    title: 'Dónde se cobra',
    body: 'Stripe procesa el pago en pesos mexicanos. Play and Go no ve ni guarda tu tarjeta.',
  },
  {
    title: 'Qué se entrega',
    body: 'Al confirmarse el pago, el webhook escribe tu plan y tus cupos. Si la cuenta todavía no existe, el pago queda en cola y se activa al crearla con ese correo.',
  },
  {
    title: 'Qué no puede pasar',
    body: 'Una compra nueva nunca baja un plan ni un cupo ya pagado: se conserva el mayor de los dos, y el acceso permanente no se acorta por comprar una extensión.',
  },
]

/** Las dos cifras que deciden un plan, en formato ficha técnica. */
function QuotaStats({ paid, local }: { paid: number; local: number }) {
  return (
    <div className="mt-5 grid grid-cols-2 gap-4">
      <div className="pg-metric">
        <b>{paid}</b>
        <span>canciones con voces al día</span>
      </div>
      <div className="pg-metric">
        <b>{local}</b>
        <span>motor local al día</span>
      </div>
    </div>
  )
}

function FeatureList({ items }: { items: readonly string[] }) {
  return (
    <ul className="pg-list mt-5">
      {items.map((feature) => (
        <li key={feature}>
          <Check size={14} aria-hidden style={{ color: 'var(--pg-cyan)' }} />
          {feature}
        </li>
      ))}
    </ul>
  )
}

function ComparisonRow({ label, values }: { label: string; values: string[] }) {
  return (
    <tr>
      <th scope="row">{label}</th>
      {values.map((value, index) => (
        <td key={`${label}-${index}`}>{value}</td>
      ))}
    </tr>
  )
}

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
    <div className="flex flex-col gap-12">
      <div className="grid items-stretch gap-5 lg:grid-cols-4">
        {/* Plan gratuito: coincide con los defaults de la tabla entitlements. */}
        <Reveal as="article" className="pg-card pg-card-hover flex flex-col p-6">
          <p className="pg-eyebrow">Explora gratis</p>
          <h2 className="pg-title" data-size="xs">
            Plan gratuito
          </h2>
          <p className="pg-price mt-4">{formatPrice(0)}</p>
          <p className="pg-note mt-1">Sin cobro y sin tarjeta</p>
          <QuotaStats paid={FREE_TIER.dailyLimit} local={FREE_TIER.localDailyLimit} />
          <FeatureList items={FREE_TIER.features} />
          <div className="mt-auto pt-6">
            <a href="/studio" className="pg-btn pg-btn-ghost w-full">
              Probar el motor local
              <ArrowRight size={15} aria-hidden />
            </a>
          </div>
        </Reveal>

        {PRODUCT_IDS.map((id, index) => {
          const product = PRODUCTS[id]
          const isSub = product.mode === 'subscription'
          const featured = id === 'play-and-go-course'
          return (
            <Reveal
              key={product.id}
              as="article"
              delay={90 * (index + 1)}
              className={`pg-card pg-card-hover flex flex-col p-6${featured ? ' pg-card-featured' : ''}`}
            >
              <div className="flex items-start justify-between gap-3">
                <p className="pg-eyebrow">{isSub ? 'Mensual' : 'Pago único'}</p>
                {featured && (
                  <span className="pg-chip whitespace-nowrap">
                    <Sparkles size={11} aria-hidden />
                    Recomendado
                  </span>
                )}
              </div>
              <h2 className="pg-title" data-size="xs">
                {product.name}
              </h2>
              <p className="pg-price mt-4">{priceLabel(product)}</p>
              <p className="pg-note mt-1">
                {isSub ? 'Se cobra cada mes' : 'Se cobra una sola vez'} · pesos mexicanos
              </p>
              <p className="pg-note mt-4">{product.description}</p>
              <QuotaStats paid={product.grant.dailyLimit} local={product.grant.localDailyLimit} />
              <FeatureList items={product.features} />
              <div className="mt-auto pt-6">
                <button
                  type="button"
                  onClick={() => checkout(product.id)}
                  disabled={busyId !== null}
                  aria-label={`Elegir ${product.name}`}
                  className="pg-btn pg-btn-primary w-full"
                >
                  {busyId === product.id ? 'Preparando pago…' : isSub ? 'Suscribirme' : 'Inscribirme'}
                </button>
              </div>
            </Reveal>
          )
        })}
      </div>

      <p aria-live="polite" className="pg-note text-center" style={{ color: 'var(--pg-amber)' }}>
        {message}
      </p>

      <section aria-labelledby="comparativa-title">
        <Reveal>
          <h2 id="comparativa-title" className="pg-title" data-size="sm">
            Los cuatro planes, línea por línea
          </h2>
          <p className="pg-lede">
            Lo mismo que está arriba, puesto en filas para comparar sin memorizar la columna
            anterior.
          </p>
          <div className="pg-card mt-6">
            <div className="pg-scroll p-4 sm:p-6">
              <table className="pg-table">
                <caption className="sr-only">
                  Comparación de planes: precio, modalidad de cobro, cupo diario con voces, cupo
                  diario del motor local y duración del acceso.
                </caption>
                <thead>
                  <tr>
                    <th scope="col">Plan</th>
                    {COLUMNS.map((column) => (
                      <th key={column.id} scope="col">
                        {column.name}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <ComparisonRow label="Precio" values={COLUMNS.map((column) => column.price)} />
                  <ComparisonRow label="Cobro" values={COLUMNS.map((column) => column.charge)} />
                  <ComparisonRow
                    label="Canciones con voces / día"
                    values={COLUMNS.map((column) => String(column.paid))}
                  />
                  <ComparisonRow
                    label="Canciones en motor local / día"
                    values={COLUMNS.map((column) => String(column.local))}
                  />
                  <ComparisonRow
                    label="Duración del acceso"
                    values={COLUMNS.map((column) => column.duration)}
                  />
                </tbody>
              </table>
            </div>
          </div>
          <p className="pg-note mt-3 lg:hidden">
            Desliza la tabla en horizontal para ver los cuatro planes.
          </p>
        </Reveal>
      </section>

      <section aria-labelledby="letra-chica-title">
        <Reveal className="pg-card p-6 sm:p-7">
          <p className="pg-eyebrow">Letra chica, en claro</p>
          <h2 id="letra-chica-title" className="pg-title" data-size="xs">
            Qué pasa después de darle al botón
          </h2>
          <div className="mt-6 grid gap-6 sm:grid-cols-3">
            {NOTES.map((note) => (
              <div key={note.title} className="flex flex-col gap-2">
                <h3
                  className="font-mono uppercase"
                  style={{
                    fontSize: 'var(--pg-step--2)',
                    letterSpacing: '0.2em',
                    color: 'var(--pg-cyan-soft)',
                  }}
                >
                  {note.title}
                </h3>
                <p className="pg-note">{note.body}</p>
              </div>
            ))}
          </div>
        </Reveal>
      </section>
    </div>
  )
}
