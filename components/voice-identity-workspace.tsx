'use client'

import { useState } from 'react'
import { CheckCircle2, LoaderCircle, Mic2, Plus, ShieldCheck, Trash2 } from 'lucide-react'

type VoiceProfile = {
  id: string
  name: string
  description: string | null
  language: string
  status: string
  is_consented: boolean
  created_at: string
}

type GeneratedAudio = { taskId: string; audioUrl: string; text: string; contentHash?: string; engine?: string }

const GUIDED_TEXT = 'Hola, soy creador de Play & Go. Hoy quiero explorar nuevas ideas musicales, con claridad, emoción y propósito.'

export function VoiceIdentityWorkspace({ initialProfiles }: { initialProfiles: VoiceProfile[] }) {
  const [profiles, setProfiles] = useState(initialProfiles)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [consentAccepted, setConsentAccepted] = useState(false)
  const [text, setText] = useState(GUIDED_TEXT)
  const [creating, setCreating] = useState(false)
  const [generatingProfileId, setGeneratingProfileId] = useState<string | null>(null)
  const [pendingRevokeId, setPendingRevokeId] = useState<string | null>(null)
  const [audio, setAudio] = useState<GeneratedAudio | null>(null)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  async function createProfile(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setCreating(true)
    setError('')
    setNotice('')
    try {
      const response = await fetch('/api/voice/profiles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, description, language: 'es-MX', consentAccepted }),
      })
      const body = await response.json()
      if (!response.ok) throw new Error(body.error ?? 'No se pudo crear el perfil.')
      setProfiles((current) => [body.profile, ...current])
      setName('')
      setDescription('')
      setConsentAccepted(false)
      setNotice('Perfil sintético creado. El consentimiento quedó registrado en tu cuenta.')
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Ocurrió un error inesperado.')
    } finally {
      setCreating(false)
    }
  }

  async function generate(profile: VoiceProfile) {
    const cleanText = text.trim()
    if (cleanText.length < 3 || cleanText.length > 900) {
      setError('El texto debe tener entre 3 y 900 caracteres.')
      return
    }
    setGeneratingProfileId(profile.id)
    setError('')
    setNotice('')
    setAudio(null)
    const idempotencyKey = crypto.randomUUID()
    try {
      let response = await fetch('/api/voice/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Idempotency-Key': idempotencyKey },
        body: JSON.stringify({ voiceProfileId: profile.id, text: cleanText, language: profile.language, speed: 1 }),
      })
      let body = await response.json()
      if (!response.ok && response.status !== 202) throw new Error(body.error ?? 'No se pudo generar el audio.')

      for (let attempt = 0; response.status === 202 && attempt < 25; attempt += 1) {
        await new Promise((resolve) => window.setTimeout(resolve, 1200))
        response = await fetch(body.statusUrl, { cache: 'no-store' })
        body = await response.json()
        if (!response.ok) throw new Error(body.error ?? 'No se pudo consultar la generación.')
        if (body.status === 'failed' || body.status === 'cancelled') throw new Error(body.error ?? 'La generación no pudo completarse.')
      }
      if (body.status !== 'completed' || typeof body.audioUrl !== 'string') {
        throw new Error('La tarea sigue en curso. Revisa el perfil en un momento.')
      }
      setAudio({ taskId: body.taskId, audioUrl: body.audioUrl, text: cleanText, contentHash: body.contentHash, engine: body.engine })
      setNotice(body.engine === 'kokoro' ? 'Audio generado localmente con Kokoro y guardado de forma privada.' : 'Kokoro no respondió; se usó el respaldo de Vercel AI Gateway y el audio quedó privado.')
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Ocurrió un error inesperado.')
    } finally {
      setGeneratingProfileId(null)
    }
  }

  async function revoke(profileId: string) {
    setError('')
    setNotice('')
    try {
      const response = await fetch('/api/voice/profiles', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profileId }),
      })
      const body = await response.json()
      if (!response.ok) throw new Error(body.error ?? 'No se pudo revocar el perfil.')
      setProfiles((current) => current.filter((profile) => profile.id !== profileId))
      if (audio) setAudio(null)
      setPendingRevokeId(null)
      setNotice('Consentimiento revocado. El perfil quedó desactivado y se retiró el audio asociado.')
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Ocurrió un error inesperado.')
    }
  }

  return <div className="flex flex-col gap-6">
    <section className="pg-card overflow-hidden p-6 sm:p-8">
      <div className="flex items-start gap-4">
        <span className="pg-chip shrink-0" data-tone="cyan"><Mic2 size={15} aria-hidden="true" /></span>
        <div>
          <p className="pg-eyebrow">Kokoro local · voz sintética</p>
          <h2 className="pg-block-title mt-2">Crea un preset de narración</h2>
          <p className="pg-note mt-2 max-w-2xl">Guarda perfiles de narración asociados a tu cuenta y genera clips con el servicio abierto local. Los audios quedan privados y trazables.</p>
        </div>
      </div>

      <div className="pg-callout mt-6" data-tone="amber">
        <p className="font-semibold">Límite importante de esta versión</p>
        <p className="mt-1">Kokoro genera voz sintética con un preset; no crea una réplica de tu voz a partir de muestras. No presentes la salida como una grabación tuya ni como la voz de otra persona.</p>
      </div>

      <form onSubmit={createProfile} className="mt-6 grid gap-4 md:grid-cols-2">
        <label className="block">
          <span className="pg-label mb-2 block">Nombre del perfil</span>
          <input required minLength={2} maxLength={80} value={name} onChange={(event) => setName(event.target.value)} className="w-full rounded-xl border bg-transparent p-3" style={{ borderColor: 'var(--pg-line)', color: 'var(--pg-ink)' }} />
        </label>
        <label className="block">
          <span className="pg-label mb-2 block">Descripción (opcional)</span>
          <input maxLength={300} value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Ej. narración cálida para mis demos" className="w-full rounded-xl border bg-transparent p-3" style={{ borderColor: 'var(--pg-line)', color: 'var(--pg-ink)' }} />
        </label>
        <label className="flex items-start gap-3 rounded-xl border p-4 md:col-span-2" style={{ borderColor: 'var(--pg-line)' }}>
          <input type="checkbox" checked={consentAccepted} onChange={(event) => setConsentAccepted(event.target.checked)} className="mt-1 size-4 accent-cyan-500" />
          <span className="pg-note">Acepto usar únicamente el preset sintético configurado. Entiendo que no clona voces de personas reales ni autoriza la imitación de terceros. Puedo revocar este consentimiento cuando quiera.</span>
        </label>
        <button type="submit" disabled={creating || !consentAccepted} className="pg-btn pg-btn-primary inline-flex items-center justify-center gap-2 disabled:cursor-not-allowed disabled:opacity-60 md:col-span-2">
          {creating ? <LoaderCircle size={16} className="animate-spin" aria-hidden="true" /> : <Plus size={16} aria-hidden="true" />}
          {creating ? 'Guardando perfil…' : 'Crear perfil con consentimiento'}
        </button>
      </form>
    </section>

    <section className="pg-card p-6 sm:p-8">
      <div className="flex items-start gap-4">
        <ShieldCheck className="pg-accent-mint mt-1" aria-hidden="true" />
        <div className="min-w-0 flex-1">
          <p className="pg-eyebrow">Generación de audio</p>
          <h2 className="pg-block-title mt-2">Prueba una narración</h2>
          <label className="mt-4 block">
            <span className="pg-label mb-2 block">Texto a sintetizar (máximo 900 caracteres)</span>
            <textarea rows={4} maxLength={900} value={text} onChange={(event) => setText(event.target.value)} className="w-full resize-y rounded-xl border bg-transparent p-3" style={{ borderColor: 'var(--pg-line)', color: 'var(--pg-ink)' }} />
          </label>
          <p className="pg-note mt-2 text-right">{text.length}/900</p>
        </div>
      </div>

      {profiles.length ? <ul className="mt-6 grid gap-4 md:grid-cols-2">
        {profiles.map((profile) => <li key={profile.id} className="pg-inset flex flex-col gap-4 p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0"><h3 className="pg-item-title">{profile.name}</h3><p className="pg-note mt-1">{profile.description || 'Preset sintético Kokoro'} · Español (México)</p></div>
            <span className="pg-chip" data-tone={profile.is_consented && profile.status === 'active' ? 'mint' : 'ghost'}>{profile.status === 'active' && profile.is_consented ? 'Activo' : 'Revocado'}</span>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => void generate(profile)} disabled={generatingProfileId !== null || profile.status !== 'active' || !profile.is_consented} className="pg-btn pg-btn-primary inline-flex items-center gap-2 disabled:opacity-50">
              {generatingProfileId === profile.id ? <LoaderCircle size={15} className="animate-spin" aria-hidden="true" /> : <Mic2 size={15} aria-hidden="true" />}
              {generatingProfileId === profile.id ? 'Generando…' : 'Generar audio'}
            </button>
            {profile.status === 'active' && profile.is_consented && <button type="button" onClick={() => setPendingRevokeId(profile.id)} className="pg-btn pg-btn-ghost inline-flex items-center gap-2"><Trash2 size={15} aria-hidden="true" />Revocar</button>}
          </div>
          {pendingRevokeId === profile.id && <div className="rounded-xl border p-3" style={{ borderColor: 'var(--pg-line)' }}>
            <p className="pg-note">Se desactivará el perfil y se retirarán sus audios generados. Esta acción no se puede deshacer.</p>
            <div className="mt-3 flex gap-2"><button type="button" onClick={() => setPendingRevokeId(null)} className="pg-btn pg-btn-ghost pg-btn-sm">Cancelar</button><button type="button" onClick={() => void revoke(profile.id)} className="pg-btn pg-btn-primary pg-btn-sm">Confirmar revocación</button></div>
          </div>}
        </li>)}
      </ul> : <div className="pg-inset mt-6 p-4"><p className="pg-note">Aún no tienes perfiles. Crea uno con el consentimiento explícito para habilitar la generación.</p></div>}
    </section>

    {audio && <section className="pg-card p-6" aria-labelledby="audio-generated-title">
      <div className="flex items-center gap-2"><CheckCircle2 className="pg-accent-mint" aria-hidden="true" /><h2 id="audio-generated-title" className="pg-block-title">Audio listo</h2></div>
      <p className="pg-prose mt-3">{audio.text}</p>
      <audio className="mt-4 w-full" controls preload="none" src={audio.audioUrl} aria-label="Narración sintetizada con Kokoro">Tu navegador no puede reproducir audio.</audio>
      {audio.contentHash && <p className="pg-note mt-3 break-all">SHA-256: <code>{audio.contentHash}</code></p>}
      <p className="pg-note mt-2">ID de generación: <code>{audio.taskId}</code></p>
    </section>}

    <div aria-live="polite" className="flex flex-col gap-2">{error && <p role="alert" className="pg-status" data-tone="error">{error}</p>}{notice && <p role="status" className="pg-status">{notice}</p>}</div>
  </div>
}
