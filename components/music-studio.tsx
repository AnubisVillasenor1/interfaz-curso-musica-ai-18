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

  return <main className="min-h-screen bg-[#07121f] px-5 py-10 text-[#edfaff] sm:px-8">
    <div className="mx-auto max-w-5xl">
      <a href="/" className="text-sm text-cyan-200 hover:underline">← Volver a Sonora IA</a>
      <header className="my-8"><p className="text-xs uppercase tracking-[.25em] text-cyan-300">Taller musical libre</p><h1 className="mt-2 text-4xl font-semibold">Agente de composición</h1><p className="mt-3 max-w-2xl text-slate-300">Convierte una idea en un plan de arreglo y exporta un boceto MIDI descargable. Funciona sin API de pago; Ollama local mejora el análisis cuando está configurado.</p></header>
      <div className="grid gap-6 lg:grid-cols-[1.1fr_.9fr]">
        <section className="rounded-3xl border border-white/10 bg-white/[.04] p-6">
          <h2 className="text-xl font-medium">1. Diseña tu composición</h2>
          <form onSubmit={createPlan} className="mt-4 space-y-4">
            <label htmlFor="music-prompt" className="block text-sm text-slate-300">Describe estilo, emoción, instrumentos y tempo</label>
            <textarea id="music-prompt" value={prompt} onChange={(event) => setPrompt(event.target.value)} maxLength={1200} required rows={5} className="w-full rounded-xl border border-white/15 bg-slate-950/60 p-4 text-white outline-none focus:border-cyan-300" />
            <button disabled={busy} className="rounded-xl bg-cyan-300 px-5 py-3 font-semibold text-slate-950 disabled:opacity-50">{busy ? 'Procesando…' : 'Crear plan musical'}</button>
          </form>
          {message && <p role="status" className="mt-4 text-sm text-cyan-100">{message}</p>}
          {plan && <div className="mt-6 rounded-2xl border border-cyan-300/20 bg-cyan-300/5 p-5"><h3 className="text-lg font-semibold">{plan.title}</h3><dl className="mt-3 grid grid-cols-2 gap-3 text-sm"><div><dt className="text-slate-400">Género / ánimo</dt><dd>{plan.genre} · {plan.mood}</dd></div><div><dt className="text-slate-400">Tempo / tonalidad</dt><dd>{plan.tempo} BPM · {plan.key}</dd></div><div className="col-span-2"><dt className="text-slate-400">Instrumentos</dt><dd>{plan.instruments.join(', ')}</dd></div></dl><ul className="mt-4 space-y-1 text-sm text-slate-300">{plan.structure.map((item) => <li key={item}>♪ {item}</li>)}</ul><button onClick={exportMidi} disabled={busy} className="mt-5 rounded-xl border border-cyan-200/50 px-4 py-2 text-sm hover:bg-cyan-200/10 disabled:opacity-50">Descargar arreglo MIDI</button></div>}
        </section>
        <section className="rounded-3xl border border-white/10 bg-white/[.04] p-6">
          <h2 className="text-xl font-medium">2. Explora música reutilizable</h2><p className="mt-2 text-sm text-slate-300">Búsqueda en Internet Archive y, opcionalmente, Jamendo. La licencia varía por obra.</p>
          <form onSubmit={searchCatalog} className="mt-4 flex gap-2"><label htmlFor="catalog-query" className="sr-only">Buscar música</label><input id="catalog-query" value={query} onChange={(event) => setQuery(event.target.value)} minLength={2} maxLength={100} required placeholder="piano jazz, ambient…" className="min-w-0 flex-1 rounded-xl border border-white/15 bg-slate-950/60 px-3 py-3 outline-none focus:border-cyan-300" /><button className="rounded-xl bg-white/10 px-4 py-2 hover:bg-white/15">Buscar</button></form>
          {catalogMessage && <p role="status" className="mt-3 text-xs text-slate-300">{catalogMessage}</p>}
          <ul className="mt-4 space-y-3">{results.map((item) => <li key={item.id} className="rounded-xl border border-white/10 p-3"><a className="font-medium text-cyan-200 hover:underline" href={item.url} target="_blank" rel="noreferrer">{item.title}</a><p className="mt-1 text-xs text-slate-400">{item.creator} · {item.source}</p><p className="mt-1 break-all text-xs text-slate-500">Licencia: {item.license}</p></li>)}</ul>
        </section>
      </div>
      <aside className="mt-6 rounded-2xl border border-amber-300/20 bg-amber-300/5 p-4 text-sm text-amber-100"><strong>Alcance:</strong> el exportador crea MIDI procedural con melodía y acordes, no audio renderizado ni stems. Usa un DAW/sintetizador propio para producir audio. El planificador sin Ollama es determinista y no utiliza un modelo de IA.</aside>
    </div>
  </main>
}
