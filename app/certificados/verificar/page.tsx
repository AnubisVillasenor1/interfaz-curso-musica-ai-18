'use client'

import { FormEvent, useState } from 'react'

export default function VerifyPage() {
  const [code, setCode] = useState('')
  const [result, setResult] = useState<string>('')
  const [busy, setBusy] = useState(false)

  async function verify(event: FormEvent) {
    event.preventDefault()
    setBusy(true); setResult('Verificando…')
    try {
      const response = await fetch(`/api/certificates/verify?code=${encodeURIComponent(code.trim())}`)
      const data = await response.json().catch(() => null)
      if (!response.ok || !data) throw new Error(data?.error ?? 'No se pudo verificar.')
      setResult(data.valid ? `Válida. Emitida por ${data.issuer} el ${String(data.issuedAt).slice(0, 10)} · puntaje ${data.score}. ${data.note}` : 'Este código no corresponde a ninguna constancia.')
    } catch (error) {
      setResult(error instanceof Error ? error.message : 'Fallo de red.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="pg-shell min-h-screen px-5 py-12" style={{ background: 'var(--pg-bg)' }}>
      <div className="pg-card mx-auto max-w-lg p-6 sm:p-8">
        <p className="pg-eyebrow">TAMV Online Network</p>
        <h1 className="pg-title mt-2">Verifica una constancia</h1>
        <form onSubmit={verify} className="mt-6 flex flex-col gap-3">
          <label className="pg-label">
            Código de la constancia
            <input value={code} onChange={(e) => setCode(e.target.value)} required maxLength={24}
              placeholder="Ej. A1B2C3D4E5F6" className="pg-field mt-1 h-11 uppercase" autoComplete="off" />
          </label>
          <button disabled={busy} className="pg-btn pg-btn-primary">{busy ? 'Verificando…' : 'Verificar'}</button>
        </form>
        {result && <p role="status" className="pg-note mt-4">{result}</p>}
      </div>
    </main>
  )
}
