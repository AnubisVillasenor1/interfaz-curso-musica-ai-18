'use client'

import { FormEvent, useState } from 'react'

type Plan = { title: string; genre: string; mood: string; tempo: number; key: string; instruments: string[]; structure: string[]; engine: string }
type Result = { id: string; title: string; creator: string; source: string; license?: string; url: string }

export function MusicStudio() {
  const [prompt, setPrompt] = useState('Lo-fi jazz para estudiar, 82 BPM, piano y bajo cálido')
  const [plan, setPlan] = useState<Plan | null>(null)
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Result[]>([])
  const [catalogMessage, setCatalogMessage] = useState('')

  async function createPlan(event: FormEvent) {
    event.preventDefault()
    setBusy(true); setMessage('Diseñando arreglo…')
    try {
      const response = await fetch('/api/agent', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ prompt }) })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'No se pudo crear el plan.')
      setPlan(data.plan); setMessage(data.message)
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Error de red.') }
    finally { setBusy(false) }
  }

  async function exportMidi() {
    if (!plan) return
    setBusy(true); setMessage('Creando archivo MIDI…')
    try {
      const response = await fetch('/api/music/compose', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ prompt, tempo: plan.tempo, key: plan.key }) })
      if (!response.ok) { const data = await response.json(); throw new Error(data.error || 'No se pudo exportar MIDI.') }
      const blob = await response.blob(); const objectUrl = URL.createObjectURL(blob)
      const link = document.createElement('a'); link.href = objectUrl; link.download = `${plan.title.replace(/[^\p{L}\p{N}-]+/gu, '-').slice(0, 40) || 'composicion'}.mid`; link.click()
      URL.revokeObjectURL(objectUrl); setMessage('MIDI descargado. Ábrelo en tu DAW o editor musical.')
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Error de red.') }
    finally { setBusy(false) }
  }

  async function searchCatalog(event: FormEvent) {
    event.preventDefault(); setCatalogMessage('Buscando en catálogos…')
    try {
      const response = await fetch(`/api/music/search?q=${encodeURIComponent(query)}`)
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'No se pudo buscar.')
      setResults(data.results); setCatalogMessage(data.notice)
    } catch (error) { setCatalogMessage(error instanceof Error ? error.message : 'Error de red.') }
  }

  return <main className="pg-shell min-h-screen px-5 py-10 sm:px-8" style={{ background: 'var(--pg-bg)' }}>
    <div className="pg-container max-w-5xl">
      <a href="/" className="pg-navlink">← Volver a Play and Go</a>
      <header className="my-8"><p className="pg-eyebrow">Taller musical libre</p><h1 className="pg-title">Agente de composición</h1><p className="pg-lede">Convierte una idea en un plan de arreglo y exporta un boceto MIDI descargable. Funciona sin API de pago; Ollama local mejora el análisis cuando está configurado.</p></header>
      <div className="grid gap-6 lg:grid-cols-[1.1fr_.9fr]">
        <section className="pg-card p-6">
          <h2 className="pg-section-title">1. Diseña tu composición</h2>
          <form onSubmit={createPlan} className="mt-4 space-y-4">
            <label htmlFor="music-prompt" className="pg-label block">Describe estilo, emoción, instrumentos y tempo</label>
            <textarea id="music-prompt" value={prompt} onChange={(event) => setPrompt(event.target.value)} maxLength={1200} required rows={5} className="pg-field leading-6" />
            <button disabled={busy} className="pg-btn pg-btn-primary">{busy ? 'Procesando…' : 'Crear plan musical'}</button>
          </form>
          {message && <p role="status" className="pg-status mt-4">{message}</p>}
          {plan && <div className="pg-inset mt-6"><h3 className="pg-block-title">{plan.title}</h3><dl className="mt-3 grid grid-cols-2 gap-3 text-sm"><div><dt className="pg-label" data-tone="muted">Género / ánimo</dt><dd>{plan.genre} · {plan.mood}</dd></div><div><dt className="pg-label" data-tone="muted">Tempo / tonalidad</dt><dd>{plan.tempo} BPM · {plan.key}</dd></div><div className="col-span-2"><dt className="pg-label" data-tone="muted">Instrumentos</dt><dd>{plan.instruments.join(', ')}</dd></div></dl><ul className="pg-list mt-4">{plan.structure.map((item) => <li key={item}>♪ {item}</li>)}</ul><button onClick={exportMidi} disabled={busy} className="pg-btn pg-btn-ghost pg-btn-sm mt-5">Descargar arreglo MIDI</button></div>}
        </section>
        <section className="pg-card p-6">
          <h2 className="pg-section-title">2. Explora música reutilizable</h2><p className="pg-note mt-2">Búsqueda en Internet Archive y, opcionalmente, Jamendo. La licencia varía por obra.</p>
          <form onSubmit={searchCatalog} className="mt-4 flex gap-2"><label htmlFor="catalog-query" className="sr-only">Buscar música</label><input id="catalog-query" value={query} onChange={(event) => setQuery(event.target.value)} minLength={2} maxLength={100} required placeholder="piano jazz, ambient…" className="pg-field min-w-0 flex-1" /><button className="pg-btn pg-btn-ghost pg-btn-sm">Buscar</button></form>
          {catalogMessage && <p role="status" className="pg-note mt-3">{catalogMessage}</p>}
          <ul className="mt-4 space-y-3">{results.map((item) => <li key={item.id} className="pg-inset"><a className="pg-minilink" href={item.url} target="_blank" rel="noreferrer">{item.title}</a><p className="pg-note mt-1">{item.creator} · {item.source}</p><p className="pg-note mt-1 break-all">Licencia: {item.license}</p></li>)}</ul>
        </section>
      </div>
      <aside className="pg-callout mt-6"><strong>Alcance:</strong> el exportador crea MIDI procedural con melodía y acordes, no audio renderizado ni stems. Usa un DAW/sintetizador propio para producir audio. El planificador sin Ollama es determinista y no utiliza un modelo de IA.</aside>
    </div>
  </main>
}
