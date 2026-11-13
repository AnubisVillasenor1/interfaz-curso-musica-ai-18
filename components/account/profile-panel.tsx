'use client'

import { useCallback, useEffect, useState } from 'react'
import { ArrowRight, LogOut, Music2, Sparkles } from 'lucide-react'

import { PRODUCTS, PRODUCT_IDS, priceLabel, type ProductId } from '@/lib/products'
import { LicenseManager } from '@/components/account/license-manager'

/**
 * Espejo de lo que devuelve `GET /api/entitlement`. Las claves vienen en
 * snake_case desde la RPC `read_entitlement()`; aquí solo se tipan, no se
 * inventan.
 */
interface Entitlement {
  plan: string
  active: boolean
  daily_limit: number
  used_today: number
  local_daily_limit: number
  local_used_today: number
  role: string
  songs_total: number
  songs_ready: number
  lessons_done: number
  entitlement_reconciliation_required: boolean
}

interface EntitlementResponse {
  entitlement: Entitlement
  userId: string
  email: string | null
}

type LoadState = 'loading' | 'ready' | 'unauthorized' | 'unconfigured' | 'error'

function remaining(total: number, used: number): number {
  return Math.max(0, total - used)
}

export function ProfilePanel() {
  const [state, setState] = useState<LoadState>('loading')
  const [notice, setNotice] = useState<string | null>(null)
  const [data, setData] = useState<EntitlementResponse | null>(null)
  const [upgradeId, setUpgradeId] = useState<ProductId>('play-and-go-pro')
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    setState('loading')
    setNotice(null)
    try {
      const response = await fetch('/api/entitlement', { cache: 'no-store' })
      const payload = (await response.json().catch(() => null)) as
        | (Partial<EntitlementResponse> & { error?: string })
        | null

      if (response.ok && payload?.entitlement) {
        setData(payload as EntitlementResponse)
        setState('ready')
        return
      }
      if (response.status === 401) {
        setNotice(payload?.error ?? 'Inicia sesión para ver tu plan.')
        setState('unauthorized')
        return
      }
      if (response.status === 503) {
        setNotice(
          payload?.error ??
            'El acceso a tus datos no está disponible en este entorno. Inténtalo de nuevo en unos minutos.',
        )
        setState('unconfigured')
        return
      }
      setNotice(payload?.error ?? 'No pudimos leer tu plan.')
      setState('error')
    } catch {
      setNotice('Se perdió la conexión al cargar tu plan. Revisa tu red.')
      setState('error')
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  async function logout() {
    setBusy(true)
    try {
      const response = await fetch('/api/auth/logout', { method: 'POST' })
      // La ruta redirige (302) con fetch: follow-redirects deja el HTML en el
      // cuerpo, así que tras un OK movemos la ventana a la home sin parsear.
      if (response.ok || response.status === 302) {
        window.location.href = '/'
        return
      }
      const payload = (await response.json().catch(() => null)) as { error?: string } | null
      setBusy(false)
      setNotice(payload?.error ?? 'No pudimos cerrar sesión.')
    } catch {
      setBusy(false)
      setNotice('Se cortó la conexión al cerrar sesión.')
    }
  }

  async function upgrade() {
    if (busy) return
    setBusy(true)
    setNotice(null)
    try {
      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId: upgradeId }),
      })
      const payload = (await response.json().catch(() => null)) as
        | { url?: string; error?: string }
        | null
      if (response.ok && payload?.url) {
        window.location.href = payload.url
        return
      }
      if (response.status === 401) {
        window.location.href = '/auth?next=/perfil'
        return
      }
      setNotice(
        payload?.error ??
          (response.status === 503
            ? 'Los pagos todavía no están configurados en este entorno.'
            : 'No pudimos iniciar el pago. Intenta nuevamente.'),
      )
    } catch {
      setNotice('Se perdió la conexión al iniciar el pago. Inténtalo otra vez.')
    } finally {
      setBusy(false)
    }
  }

  if (state === 'loading') {
    return (
      <div className="pg-panel pg-note text-sm p-8">Cargando tu plan…</div>
    )
  }

  if (state !== 'ready' || !data) {
    return (
      <div className="pg-notice">
        <h2 className="pg-card-title" data-tone="amber">
          {state === 'unauthorized'
            ? 'Necesitas iniciar sesión'
            : state === 'unconfigured'
              ? 'Servicio de cuenta sin configurar'
              : 'No pudimos mostrar tu cuenta'}
        </h2>
        <p className="pg-prose mt-3">{notice}</p>
        <div className="mt-6 flex flex-wrap gap-3">
          {state === 'unauthorized' && (
            <button
              type="button"
              onClick={() => {
                window.location.href = '/auth?next=/perfil'
              }}
              className="pg-btn pg-btn-primary"
            >
              Iniciar sesión <ArrowRight size={15} aria-hidden="true" />
            </button>
          )}
          {state === 'unauthorized' && (
            <a href="/auth?mode=signup&next=/perfil" className="pg-btn pg-btn-ghost">
              Crear cuenta gratis
            </a>
          )}
          <button
            type="button"
            onClick={() => void load()}
            className="pg-btn pg-btn-ghost"
          >
            Reintentar
          </button>
        </div>
      </div>
    )
  }

  const { entitlement } = data
  const planLabel: Record<string, string> = {
    free: 'Gratuito',
    enrolled: 'Curso inscrito',
    extension: 'Extensión',
    pro: 'Pro mensual',
  }

  return (
    <div className="flex flex-col gap-5">
      <section className="pg-card pg-card-featured p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="pg-eyebrow">Tu cuenta</p>
            <h1 className="pg-title mt-2" data-size="sm">
              {data.email ?? 'Cuenta iniciada'}
            </h1>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className="pg-pill" data-tone="cyan">
                {planLabel[entitlement.plan] ?? entitlement.plan}
              </span>
              <span className="pg-pill" data-tone={entitlement.active ? 'mint' : undefined}>
                {entitlement.active ? 'Acceso activo' : 'Acceso inactivo'}
              </span>
              <span className="pg-pill">Rol: {entitlement.role}</span>
            </div>
          </div>
          <button
            type="button"
            onClick={logout}
            disabled={busy}
            aria-label="Cerrar sesión"
            className="pg-btn pg-btn-ghost pg-btn-sm"
          >
            <LogOut size={15} aria-hidden="true" /> Cerrar sesión
          </button>
        </div>
      </section>

      {entitlement.entitlement_reconciliation_required && (
        <section className="pg-notice" role="status" aria-live="polite">
          <h2 className="pg-card-title" data-tone="amber">Verificación de acceso pendiente</h2>
          <p className="pg-prose mt-3">
            Las generaciones con proveedor asociadas a un pago no verificado están pausadas. El acceso del curso confirmado y las composiciones locales disponibles no cambian.
          </p>
        </section>
      )}

      <div className="grid gap-5 sm:grid-cols-2">
        <section className="pg-card p-6">
          <h2 className="pg-card-title" data-tone="violet">
            Cupo con proveedor de pago
          </h2>
          <p className="pg-figure" data-tone="violet">
            {remaining(entitlement.daily_limit, entitlement.used_today)}{' '}
            <span>/ {entitlement.daily_limit} disponibles</span>
          </p>
          <p className="pg-note mt-2">
            Usadas hoy: {entitlement.used_today} de {entitlement.daily_limit}.
          </p>
        </section>

        <section className="pg-card p-6">
          <h2 className="pg-card-title" data-tone="cyan">
            Cupo motor local
          </h2>
          <p className="pg-figure" data-tone="cyan">
            {remaining(entitlement.local_daily_limit, entitlement.local_used_today)}{' '}
            <span>/ {entitlement.local_daily_limit} disponibles</span>
          </p>
          <p className="pg-note mt-2">
            Usadas hoy: {entitlement.local_used_today} de {entitlement.local_daily_limit}. Sin costo.
          </p>
        </section>
      </div>

      <section className="pg-panel grid gap-4 p-6 sm:grid-cols-3">
        <div>
          <p className="pg-label" data-tone="muted">
            Canciones
          </p>
          <p className="pg-figure mt-1">
            {entitlement.songs_total}
            <span>total</span>
          </p>
          <p className="pg-accent-mint mt-1 text-xs">{entitlement.songs_ready} listas</p>
        </div>
        <div>
          <p className="pg-label" data-tone="muted">
            Listas para reproducir
          </p>
          <p className="pg-figure mt-1" data-tone="amber">
            {entitlement.songs_ready}
          </p>
        </div>
        <div>
          <p className="pg-label" data-tone="muted">
            Lecciones completadas
          </p>
          <p className="pg-figure mt-1">{entitlement.lessons_done}</p>
        </div>
      </section>

      <LicenseManager />

      <section className="pg-card p-6">
        <h2 className="pg-card-title">
          <Sparkles size={16} className="pg-accent-cyan" aria-hidden="true" /> Mejora tu acceso
        </h2>
        <p className="pg-note mt-2 leading-5">
          Elige un plan y continúa el pago con Stripe. El precio se muestra desde el mismo catálogo
          que cobra la pasarela.
        </p>
        <div className="mt-5 flex flex-wrap items-center gap-3">
          <label className="sr-only" htmlFor="upgrade-plan">
            Plan al que subir
          </label>
          <select
            id="upgrade-plan"
            value={upgradeId}
            onChange={(event) => setUpgradeId(event.target.value as ProductId)}
            className="pg-field w-auto max-w-xs"
          >
            {PRODUCT_IDS.map((id) => (
              <option key={id} value={id}>
                {PRODUCTS[id].name} — {priceLabel(PRODUCTS[id])}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={upgrade}
            disabled={busy}
            className="pg-btn pg-btn-primary"
          >
            {busy ? 'Preparando pago…' : 'Subir de plan'}{' '}
            <Music2 size={15} aria-hidden="true" />
          </button>
        </div>
      </section>

      <p aria-live="polite" data-tone="error" className="pg-status mx-auto text-center text-xs">
        {notice}
      </p>
    </div>
  )
}
