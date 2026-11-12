'use client'

import { useEffect, useRef, useState } from 'react'
import { AudioLines, LoaderCircle, Play, ShieldCheck } from 'lucide-react'

type TaskStatus = 'queued' | 'processing' | 'completed' | 'failed' | 'cancelled'
type TaskState = {
  taskId: string
  status: TaskStatus
  progress: number
  audioUrl: string | null
  error: string | null
  spectralMetadata: Record<string, unknown> | null
}

export function MusicGenQueueStudio() {
  const [prompt, setPrompt] = useState('')
  const [duration, setDuration] = useState(15)
  const [task, setTask] = useState<TaskState | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const polling = useRef(false)
  const idempotencyKey = useRef<string | null>(null)

  useEffect(() => {
    if (!task || !['queued', 'processing'].includes(task.status)) return
    let disposed = false
    let timer: ReturnType<typeof setTimeout> | undefined
    const poll = async () => {
      if (disposed) return
      if (polling.current) { timer = setTimeout(poll, 2000); return }
      polling.current = true
      try {
        const response = await fetch('/api/generation/' + task.taskId, { cache: 'no-store' })
        const body = await response.json() as TaskState & { error?: string }
        if (!response.ok) throw new Error(body.error ?? 'No se pudo consultar la tarea.')
        if (!disposed) setTask(body)
      } catch (cause) {
        if (!disposed) setError(cause instanceof Error ? cause.message : 'No se pudo consultar el estado.')
      } finally {
        polling.current = false
        if (!disposed) timer = setTimeout(poll, 2000)
      }
    }
    timer = setTimeout(poll, 1200)
    return () => {
      disposed = true
      if (timer) clearTimeout(timer)
    }
  }, [task?.taskId, task?.status])

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (busy) return
    setBusy(true)
    setError(null)
    setTask(null)
    idempotencyKey.current ??= crypto.randomUUID()
    let receivedResponse = false
    let preserveKeyForRetry = false
    try {
      const response = await fetch('/api/generation', {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'idempotency-key': idempotencyKey.current },
        body: JSON.stringify({
          prompt: prompt.trim(),
          mode: 'instrumental',
          parameters: { durationSeconds: duration, temperature: 1, guidanceScale: 3, sampleRate: 32000, spectralAnalysis: true },
        }),
      })
      receivedResponse = true
      const body = await response.json() as { taskId?: string; status?: TaskStatus; progress?: number; error?: string; code?: string }
      preserveKeyForRetry = body.code === 'enqueue_uncertain'
      if (!response.ok || !body.taskId) throw new Error(body.error ?? 'No se pudo iniciar la generación.')
      setTask({ taskId: body.taskId, status: body.status ?? 'queued', progress: body.progress ?? 0, audioUrl: null, error: null, spectralMetadata: null })
      idempotencyKey.current = null
    } catch (cause) {
      if (receivedResponse && !preserveKeyForRetry) idempotencyKey.current = null
      setError(cause instanceof Error ? cause.message : 'Error inesperado al generar audio.')
    } finally {
      setBusy(false)
    }
  }

  const running = task?.status === 'queued' || task?.status === 'processing'

  return (
    <section className="pg-card p-5 md:p-7" aria-labelledby="musicgen-queue-title">
      <div className="flex items-start gap-3">
        <span className="rounded-xl border p-3" style={{ borderColor: 'var(--pg-line)' }}><AudioLines size={22} className="pg-accent-cyan" /></span>
        <div className="min-w-0 flex-1">
          <p className="pg-eyebrow">Inferencia remota · worker self-hosted</p>
          <h2 id="musicgen-queue-title" className="pg-block-title mt-1">MusicGen en cola</h2>
          <p className="pg-note mt-2">La generación se procesa fuera de Next.js. El audio se guarda en almacenamiento privado y se entrega mediante un enlace temporal autenticado.</p>
        </div>
        <ShieldCheck size={18} className="pg-accent-muted shrink-0" aria-label="Acceso protegido" />
      </div>

      <form onSubmit={submit} className="mt-5 space-y-4">
        <label className="block">
          <span className="pg-label mb-2 block">Dirección musical</span>
          <textarea value={prompt} onChange={(event) => setPrompt(event.target.value)} minLength={3} maxLength={2000} required rows={4} placeholder="Ej. Instrumental cinematográfico con piano íntimo, cuerdas expansivas y percusión contenida..." className="w-full rounded-xl border bg-transparent p-3" style={{ borderColor: 'var(--pg-line)', color: 'var(--pg-ink)' }} />
        </label>
        <label className="block">
          <span className="pg-label mb-2 flex items-center justify-between"><span>Duración</span><strong>{duration} segundos</strong></span>
          <input type="range" min={5} max={30} step={5} value={duration} onChange={(event) => setDuration(Number(event.target.value))} className="w-full" />
          <span className="pg-note">Límite inicial de 30 segundos para controlar la memoria y el tiempo de GPU.</span>
        </label>
        <button type="submit" disabled={busy || running || prompt.trim().length < 3} className="pg-button-primary inline-flex w-full items-center justify-center gap-2 disabled:cursor-not-allowed disabled:opacity-50">
          {busy || running ? <LoaderCircle size={17} className="animate-spin" /> : <Play size={17} />}
          {busy ? 'Enviando trabajo…' : running ? 'Generación en proceso…' : 'Generar con MusicGen'}
        </button>
      </form>

      {error && <p role="alert" className="mt-4 rounded-lg border p-3 text-sm" style={{ borderColor: 'var(--pg-danger, #b91c1c)' }}>{error}</p>}
      {task && (
        <div className="mt-5 rounded-xl border p-4" style={{ borderColor: 'var(--pg-line)' }} aria-live="polite">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="pg-label">Tarea {task.taskId.slice(0, 8)}</span>
            <strong className="text-sm" style={{ color: 'var(--pg-ink)' }}>{task.status === 'queued' ? 'En cola' : task.status === 'processing' ? 'Procesando' : task.status === 'completed' ? 'Completada' : task.status === 'failed' ? 'Fallida' : 'Cancelada'}</strong>
          </div>
          <progress className="mt-3 w-full" value={task.progress} max={100} aria-label={'Progreso de generación: ' + task.progress + '%'} />
          <p className="pg-note mt-2">{task.progress}% · {task.status === 'queued' ? 'Esperando un worker disponible.' : task.status === 'processing' ? 'El modelo está generando el audio.' : task.status === 'completed' ? 'Audio guardado; el enlace de descarga es temporal.' : task.error ?? 'La tarea terminó sin audio.'}</p>
          {task.status === 'completed' && task.audioUrl && <div className="mt-4 space-y-3"><audio controls preload="none" src={task.audioUrl} className="w-full">Tu navegador no soporta reproducción de audio.</audio><a href={task.audioUrl} className="pg-minilink inline-flex" download>Descargar WAV</a></div>}
          {task.spectralMetadata && <details className="mt-4"><summary className="pg-minilink cursor-pointer">Metadatos de análisis</summary><pre className="mt-2 overflow-auto rounded-lg p-3 text-xs" style={{ background: 'var(--pg-surface, #111827)' }}>{JSON.stringify(task.spectralMetadata, null, 2)}</pre></details>}
        </div>
      )}
      <p className="pg-note mt-4">Nota: el motor MusicGen genera instrumentales. La síntesis de voz/canto requiere un motor compatible independiente y una licencia de modelo validada.</p>
    </section>
  )
}
