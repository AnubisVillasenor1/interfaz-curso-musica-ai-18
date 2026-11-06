'use client'

import { useCallback, useEffect, useState } from 'react'
import { ArrowRight, LogOut, Music2, Sparkles } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { PRODUCTS, PRODUCT_IDS, priceLabel, type ProductId } from '@/lib/products'

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
            'Falta la configuración de Supabase en este entorno (NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY).',
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
      <div className="rounded-3xl border border-white/10 bg-white/[.035] p-8 text-sm text-[#8fa9b5]">
        Cargando tu plan…
      </div>
    )
  }

  if (state !== 'ready' || !data) {
    return (
      <div className="rounded-3xl border border-[#ffcf72]/25 bg-[#ffcf72]/5 p-8">
        <h2 className="text-lg font-semibold text-[#ffcf72]">
          {state === 'unauthorized'
            ? 'Necesitas iniciar sesión'
            : state === 'unconfigured'
              ? 'Servicio de cuenta sin configurar'
              : 'No pudimos mostrar tu cuenta'}
        </h2>
        <p className="mt-3 text-sm leading-6 text-[#c4d8df]">{notice}</p>
        <div className="mt-6 flex flex-wrap gap-3">
          {state === 'unauthorized' && (
            <Button
              onClick={() => {
                window.location.href = '/auth?next=/perfil'
              }}
              className="rounded-full bg-[#75e9f2] px-5 font-semibold text-[#06131e] hover:bg-[#a0f4f9]"
            >
              Iniciar sesión <ArrowRight data-icon="inline-end" />
            </Button>
          )}
          <Button
            variant="outline"
            onClick={() => void load()}
            className="rounded-full border-white/15 text-[#c4d8df]"
          >
            Reintentar
          </Button>
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
      <section className="rounded-3xl border border-[#75e9f2]/25 bg-[#0c2432]/70 p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-[10px] uppercase tracking-[.24em] text-[#75e9f2]">Tu cuenta</p>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight">
              {data.email ?? 'Cuenta iniciada'}
            </h1>
            <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
              <span className="rounded-full bg-[#75e9f2]/15 px-3 py-1 text-[#8cecf3]">
                {planLabel[entitlement.plan] ?? entitlement.plan}
              </span>
              <span
                className={`rounded-full px-3 py-1 ${
                  entitlement.active
                    ? 'bg-[#83d7b4]/15 text-[#83d7b4]'
                    : 'bg-white/10 text-[#a9c0ca]'
                }`}
              >
                {entitlement.active ? 'Acceso activo' : 'Acceso inactivo'}
              </span>
              <span className="rounded-full bg-white/10 px-3 py-1 text-[#a9c0ca]">
                Rol: {entitlement.role}
              </span>
            </div>
          </div>
          <Button
            variant="outline"
            onClick={logout}
            disabled={busy}
            aria-label="Cerrar sesión"
            className="rounded-full border-white/15 text-[#c4d8df] hover:bg-white/5"
          >
            <LogOut data-icon="inline-start" /> Cerrar sesión
          </Button>
        </div>
      </section>

      <div className="grid gap-5 sm:grid-cols-2">
        <section className="rounded-3xl border border-white/10 bg-white/[.035] p-6">
          <h2 className="text-sm font-semibold text-[#d4c7ff]">Cupo con proveedor de pago</h2>
          <p className="mt-4 text-3xl font-semibold text-[#c09eff]">
            {remaining(entitlement.daily_limit, entitlement.used_today)}{' '}
            <span className="text-sm font-normal text-[#8fa9b5]">
              / {entitlement.daily_limit} disponibles
            </span>
          </p>
          <p className="mt-2 text-xs text-[#8fa9b5]">
            Usadas hoy: {entitlement.used_today} de {entitlement.daily_limit}.
          </p>
        </section>

        <section className="rounded-3xl border border-white/10 bg-white/[.035] p-6">
          <h2 className="text-sm font-semibold text-[#8cecf3]">Cupo motor local</h2>
          <p className="mt-4 text-3xl font-semibold text-[#75e9f2]">
            {remaining(entitlement.local_daily_limit, entitlement.local_used_today)}{' '}
            <span className="text-sm font-normal text-[#8fa9b5]">
              / {entitlement.local_daily_limit} disponibles
            </span>
          </p>
          <p className="mt-2 text-xs text-[#8fa9b5]">
            Usadas hoy: {entitlement.local_used_today} de {entitlement.local_daily_limit}. Sin costo.
          </p>
        </section>
      </div>

      <section className="grid gap-4 rounded-3xl border border-white/10 bg-white/[.035] p-6 sm:grid-cols-3">
        <div>
          <p className="text-xs text-[#7f9aa7]">Canciones</p>
          <p className="mt-1 text-2xl font-semibold">
            {entitlement.songs_total}
            <span className="ml-1 text-xs font-normal text-[#8fa9b5]">total</span>
          </p>
          <p className="mt-1 text-xs text-[#83d7b4]">{entitlement.songs_ready} listas</p>
        </div>
        <div>
          <p className="text-xs text-[#7f9aa7]">Listas para reproducir</p>
          <p className="mt-1 text-2xl font-semibold text-[#ffcf72]">{entitlement.songs_ready}</p>
        </div>
        <div>
          <p className="text-xs text-[#7f9aa7]">Lecciones completadas</p>
          <p className="mt-1 text-2xl font-semibold">{entitlement.lessons_done}</p>
        </div>
      </section>

      <section className="rounded-3xl border border-white/10 bg-[#0b1f2e]/80 p-6">
        <h2 className="flex items-center gap-2 text-sm font-semibold">
          <Sparkles className="text-[#75e9f2]" size={16} /> Mejora tu acceso
        </h2>
        <p className="mt-2 text-xs leading-5 text-[#8fa9b5]">
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
            className="h-11 rounded-xl border border-white/10 bg-black/25 px-3 text-sm text-[#c4d8df] outline-none focus-visible:border-[#75e9f2] focus-visible:ring-3 focus-visible:ring-[#75e9f2]/40"
          >
            {PRODUCT_IDS.map((id) => (
              <option key={id} value={id}>
                {PRODUCTS[id].name} — {priceLabel(PRODUCTS[id])}
              </option>
            ))}
          </select>
          <Button
            onClick={upgrade}
            disabled={busy}
            className="h-11 rounded-full bg-[#75e9f2] px-5 font-semibold text-[#06131e] hover:bg-[#a0f4f9] disabled:opacity-60"
          >
            {busy ? 'Preparando pago…' : 'Subir de plan'} <Music2 data-icon="inline-end" />
          </Button>
        </div>
      </section>

      <p aria-live="polite" className="text-center text-xs text-[#ffcf72]">
        {notice}
      </p>
    </div>
  )
}
