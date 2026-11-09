'use client'

import { useState, type FormEvent } from 'react'
import { Bot, Cpu, LoaderCircle, Music2, Play, ShieldCheck, Sparkles, Terminal } from 'lucide-react'

import { GENRES } from '@/lib/music/genres'
import type { MultiAgentPlan } from '@/lib/music/multiagent'

type AgentResponse = {
  plan: MultiAgentPlan
  service: { nativeConfigured: boolean; analysisEndpoint: string }
}

const STAGE_LABEL: Record<MultiAgentPlan['steps'][number]['stage'], string> = {
  intent: 'Intención',
  composition: 'Composición',
  dsp: 'DSP',
  validation: 'Validación',
}

export function AgentControlPanel() {
  const [prompt, setPrompt] = useState('Corridos tumbados melódicos con guitarras sierreñas y bajo profundo, 92 BPM')
  const [genreId, setGenreId] = useState('')
  const [bpm, setBpm] = useState(96)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState<AgentResponse | null>(null)

  async function run(event: FormEvent) {
    event.preventDefault()
    setLoading(true)
    setError('')
    try {
      const response = await fetch('/api/music/agents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, genreId: genreId || undefined, bpm }),
      })
      const data = await response.json().catch(() => null)
      if (!response.ok || !data?.plan) {
        throw new Error(data?.error || 'El orquestador no respondió.')
      }
      setResult(data as AgentResponse)
    } catch (cause) {
      setResult(null)
      setError(cause instanceof Error ? cause.message : 'Fallo de red al consultar el orquestador.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="pg-card p-5 sm:p-7" aria-labelledby="agent-panel-title">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="pg-eyebrow">TAMV-AudioCore v2.0</p>
          <h3 id="agent-panel-title" className="pg-section-title mt-1.5">Control multiagente del estudio</h3>
          <p className="pg-note mt-2 max-w-2xl">
            Cuatro roles convierten tu idea en intención, progresión, parámetros DSP y una validación.
            El plan es determinista y local: no llama a un modelo de IA y no inventa una confianza.
          </p>
        </div>
        <span className="pg-chip" data-tone="cyan">
          <Bot size={14} aria-hidden /> Reglas locales
        </span>
      </header>

      <form onSubmit={run} className="mt-5 grid gap-4 lg:grid-cols-[1.4fr_.6fr_.6fr]">
        <label className="pg-label flex flex-col gap-1.5 lg:col-span-3">
          Intención creativa
          <textarea
            value={prompt}
            onChange={(event) => setPrompt(event.target.value)}
            maxLength={1200}
            required
            rows={3}
            className="pg-field p-3 text-sm leading-6"
            placeholder="Ej. Balada de piano con cuerdas cálidas, 72 BPM, intro y coro amplio"
          />
        </label>

        <label className="pg-label flex flex-col gap-1.5">
          Género base
          <select value={genreId} onChange={(event) => setGenreId(event.target.value)} className="pg-field h-11 text-sm">
            <option value="">Deducirlo del texto</option>
            {GENRES.map((genre) => (
              <option key={genre.id} value={genre.id}>{genre.name}</option>
            ))}
          </select>
        </label>

        <label className="pg-label flex flex-col gap-1.5">
          BPM objetivo
          <input
            type="number"
            min={40}
            max={200}
            value={bpm}
            onChange={(event) => setBpm(Number(event.target.value) || 96)}
            className="pg-field h-11 text-sm"
          />
        </label>

        <button type="submit" disabled={loading} className="pg-btn pg-btn-primary self-end">
          {loading ? <LoaderCircle size={16} className="animate-spin" /> : <Play size={16} />}
          {loading ? 'Orquestando…' : 'Ejecutar plan'}
        </button>
      </form>

      {error && (
        <p role="alert" className="pg-status mt-4" data-tone="error">
          <strong>Aviso:</strong> {error}
        </p>
      )}

      {result && (
        <div className="mt-6 grid gap-4" aria-live="polite">
          <div className="pg-inset">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="pg-item-meta inline-flex items-center gap-1.5">
                <Terminal size={14} aria-hidden /> {result.plan.agent} · v{result.plan.version}
              </span>
              <span className="pg-chip" data-tone={result.plan.validation.passed ? 'cyan' : 'violet'}>
                {result.plan.validation.passed ? 'Validación superada' : 'Revisar plan'}
              </span>
            </div>
            <h4 className="pg-block-title mt-3">{result.plan.composition.title}</h4>
            <p className="pg-note mt-1">
              {result.plan.intent.genreName} · {result.plan.intent.tempo} BPM · {result.plan.composition.suggestedKey} ·{' '}
              {result.plan.composition.timeSignature}
            </p>
            <p className="pg-note mt-2">{result.plan.composition.summary}</p>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <div className="pg-inset">
              <p className="pg-label inline-flex items-center gap-1.5" data-tone="muted">
                <Music2 size={14} aria-hidden /> Progresión armónica
              </p>
              <p className="mt-2 flex flex-wrap gap-2">
                {result.plan.composition.chordProgression.map((chord, index) => (
                  <span key={`${chord}-${index}`} className="pg-chip" data-tone="violet">{chord}</span>
                ))}
              </p>
              <p className="pg-note mt-3">
                {result.plan.composition.romanNumerals.join(' → ')} · {result.plan.composition.structure.reduce((sum, section) => sum + section.bars, 0)} compases
              </p>
              <ul className="pg-list mt-3">
                {result.plan.composition.structure.map((section) => (
                  <li key={`${section.label}-${section.bars}`}>{section.label} · {section.bars} compases</li>
                ))}
              </ul>
            </div>

            <div className="pg-inset">
              <p className="pg-label inline-flex items-center gap-1.5" data-tone="muted">
                <Cpu size={14} aria-hidden /> Parámetros DSP
              </p>
              <dl className="mt-2 grid grid-cols-2 gap-2 text-sm">
                <div><dt className="pg-note">Muestreo</dt><dd>{result.plan.dsp.sampleRate} Hz</dd></div>
                <div><dt className="pg-note">FFT / hop</dt><dd>{result.plan.dsp.fftSize} / {result.plan.dsp.hopSize}</dd></div>
                <div><dt className="pg-note">Mel / chroma</dt><dd>{result.plan.dsp.melBands} / {result.plan.dsp.chromaBins}</dd></div>
                <div><dt className="pg-note">Objetivo</dt><dd>{result.plan.dsp.targetLufs} LUFS</dd></div>
              </dl>
              <p className="pg-note mt-3">
                Perfil {result.plan.dsp.profile}. Servicio nativo{' '}
                {result.service.nativeConfigured ? 'configurado' : 'no configurado'}:
                {' '}{result.service.analysisEndpoint}.
              </p>
            </div>
          </div>

          <ol className="grid gap-2 md:grid-cols-2">
            {result.plan.steps.map((step, index) => (
              <li key={step.stage} className="pg-inset">
                <p className="pg-label" data-tone={step.status === 'ok' ? 'muted' : 'violet'}>
                  {index + 1}. {STAGE_LABEL[step.stage]} · {step.role}
                </p>
                <p className="mt-1 text-sm">{step.summary}</p>
                {step.details.length > 0 && (
                  <ul className="pg-list mt-2">
                    {step.details.map((detail) => <li key={detail}>{detail}</li>)}
                  </ul>
                )}
              </li>
            ))}
          </ol>

          <div className="pg-inset">
            <p className="pg-label inline-flex items-center gap-1.5" data-tone="muted">
              <ShieldCheck size={14} aria-hidden /> Comprobaciones del validador
            </p>
            <ul className="mt-2 grid gap-1.5 text-sm sm:grid-cols-2">
              {result.plan.validation.checks.map((check) => (
                <li key={check.id}>
                  <b>{check.passed ? '✓' : '×'} {check.label}</b> · <span className="pg-note">{check.detail}</span>
                </li>
              ))}
            </ul>
          </div>

          <p className="pg-note italic">{result.plan.message}</p>
        </div>
      )}

      <p className="pg-note mt-4 inline-flex items-center gap-1.5">
        <Sparkles size={13} aria-hidden /> El MIDI descargable y el audio local se generan en el compositor principal;
        este panel solo planifica y valida.
      </p>
    </section>
  )
}
