'use client'

import { useState } from 'react'
import useSWR from 'swr'
import { Ban, Check, Copy, KeyRound, RefreshCw, ShieldCheck } from 'lucide-react'

type LicenseRecord = {
  jti: string
  plan: string
  status: 'active' | 'revoked' | 'expired'
  issued_at: string
  expires_at: string
  revoked_at: string | null
  device_id: string
  token: string
}

type LicenseResponse = { licenses: LicenseRecord[] }
type ActivationResponse = { license: string; licenseId: string; reused?: boolean }

async function fetchLicenses(url: string): Promise<LicenseResponse> {
  const response = await fetch(url, { cache: 'no-store' })
  const payload = await response.json().catch(() => null) as { licenses?: LicenseRecord[]; error?: string } | null
  if (!response.ok) throw new Error(payload?.error ?? 'No se pudieron cargar tus licencias.')
  return { licenses: payload?.licenses ?? [] }
}

function dateLabel(value: string) {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? 'Fecha no disponible' : new Intl.DateTimeFormat('es-MX', { dateStyle: 'medium' }).format(date)
}

export function LicenseManager() {
  const { data, error, isLoading, mutate } = useSWR<LicenseResponse>('/api/licensing', fetchLicenses, { revalidateOnFocus: true })
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const [issuedLicense, setIssuedLicense] = useState<string | null>(null)
  const licenses = data?.licenses ?? []

  async function activate() {
    if (busy) return
    setBusy(true)
    setNotice(null)
    try {
      const response = await fetch('/api/licensing/activate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deviceLabel: 'Este navegador' }),
      })
      const payload = await response.json().catch(() => null) as (ActivationResponse & { error?: string }) | null
      if (!response.ok || !payload?.license) {
        setNotice(payload?.error ?? 'No se pudo activar la licencia.')
        return
      }
      setIssuedLicense(payload.license)
      setNotice(payload.reused ? 'Recuperamos la licencia activa de este navegador.' : 'Licencia activada en este navegador.')
      await mutate()
    } catch {
      setNotice('No se pudo conectar con el servicio de licencias.')
    } finally {
      setBusy(false)
    }
  }

  async function revoke(licenseId: string) {
    if (busy) return
    setBusy(true)
    setNotice(null)
    try {
      const response = await fetch('/api/licensing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ licenseId }),
      })
      const payload = await response.json().catch(() => null) as { error?: string } | null
      if (!response.ok) {
        setNotice(payload?.error ?? 'No se pudo desactivar la licencia.')
        return
      }
      if (issuedLicense === licenses.find((license) => license.jti === licenseId)?.token) setIssuedLicense(null)
      setNotice('La licencia se desactivó.')
      await mutate()
    } catch {
      setNotice('No se pudo conectar con el servicio de licencias.')
    } finally {
      setBusy(false)
    }
  }

  async function copyLicense(token: string) {
    try {
      await navigator.clipboard.writeText(token)
      setNotice('Licencia copiada.')
    } catch {
      setNotice('No se pudo copiar automáticamente. Selecciona el texto para copiarlo.')
    }
  }

  return (
    <section className="pg-card p-6" aria-labelledby="license-manager-title">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="max-w-2xl">
          <p className="pg-eyebrow">TAMV License Authority</p>
          <h2 id="license-manager-title" className="pg-card-title mt-2">
            Licencias y dispositivos
          </h2>
          <p className="pg-note mt-2 leading-5">
            Activa tu licencia comercial en este navegador. La clave privada permanece en Vault; la licencia firmada se vincula a tu cuenta y a un máximo de tres dispositivos.
          </p>
        </div>
        <ShieldCheck className="pg-accent-cyan" aria-hidden="true" />
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <button type="button" onClick={() => void activate()} disabled={busy} className="pg-btn pg-btn-primary">
          <KeyRound size={15} aria-hidden="true" /> {busy ? 'Procesando…' : 'Activar este navegador'}
        </button>
        <button type="button" onClick={() => void mutate()} disabled={isLoading || busy} className="pg-btn pg-btn-ghost">
          <RefreshCw size={15} aria-hidden="true" /> Actualizar
        </button>
      </div>

      {issuedLicense && (
        <div className="mt-5 rounded-xl border border-cyan-400/20 bg-cyan-400/5 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 className="pg-label">Licencia firmada</h3>
            <button type="button" onClick={() => void copyLicense(issuedLicense)} className="pg-btn pg-btn-ghost pg-btn-sm">
              <Copy size={14} aria-hidden="true" /> Copiar
            </button>
          </div>
          <textarea aria-label="Token de licencia firmado" readOnly value={issuedLicense} rows={3} className="pg-field mt-3 w-full resize-y font-mono text-xs" />
          <p className="pg-note mt-2">Guárdala en un lugar seguro. Solo se muestra aquí después de activarla.</p>
        </div>
      )}

      <div className="mt-6 border-t border-white/10 pt-5">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h3 className="pg-label">Dispositivos registrados</h3>
          <span className="pg-pill" data-tone="cyan">{licenses.filter((license) => license.status === 'active').length} activas</span>
        </div>

        {isLoading && <p className="pg-note">Cargando licencias…</p>}
        {error && <p className="pg-note" role="alert">{error.message}</p>}
        {!isLoading && !error && licenses.length === 0 && (
          <p className="pg-note rounded-lg border border-white/10 p-4">Todavía no hay licencias activadas en tu cuenta.</p>
        )}
        {licenses.length > 0 && (
          <ul className="flex flex-col gap-3">
            {licenses.map((license) => (
              <li key={license.jti} className="pg-inset flex flex-wrap items-center justify-between gap-3 p-4">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="pg-label">Plan {license.plan}</span>
                    <span className="pg-pill" data-tone={license.status === 'active' ? 'mint' : undefined}>
                      {license.status === 'active' ? 'Activa' : license.status === 'revoked' ? 'Revocada' : 'Expirada'}
                    </span>
                  </div>
                  <p className="pg-note mt-1">Vence: {dateLabel(license.expires_at)}</p>
                  <p className="pg-note mt-1 font-mono text-xs">ID: {license.jti}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {license.status === 'active' && (
                    <>
                      <button type="button" onClick={() => void copyLicense(license.token)} className="pg-btn pg-btn-ghost pg-btn-sm">
                        <Copy size={14} aria-hidden="true" /> Copiar
                      </button>
                      <button type="button" onClick={() => void revoke(license.jti)} disabled={busy} className="pg-btn pg-btn-ghost pg-btn-sm" aria-label={`Desactivar licencia ${license.jti}`}>
                        <Ban size={14} aria-hidden="true" /> Desactivar
                      </button>
                    </>
                  )}
                  {license.status === 'revoked' && <Check size={16} className="pg-accent-mint" aria-label="Licencia desactivada" />}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <p aria-live="polite" className="pg-status mt-4 text-xs" data-tone={notice ? 'muted' : undefined}>
        {notice}
      </p>
    </section>
  )
}
