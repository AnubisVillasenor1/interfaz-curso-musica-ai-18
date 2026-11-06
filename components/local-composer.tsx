'use client'

import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react'
import { AudioLines, Download, LoaderCircle, Music2, Save, Sparkles } from 'lucide-react'

import { compose, type Arrangement } from '@/lib/music/arrangement'
import { GENRES } from '@/lib/music/genres'
import { engine } from '@/lib/music/engine'

type Phase = 'idle' | 'sending' | 'composing' | 'rendering' | 'uploading' | 'done' | 'error'

interface Recipe {
  songId: string
  prompt: string
  seed: string
  genreId?: string
  bpm?: number
  title: string
}

const PHASE_COPY: Record<Phase, string> = {
  idle: '',
  sending: 'Reservando tu cupo…',
  composing: 'Escribiendo el arreglo…',
  rendering: 'Renderizando el audio en tu navegador…',
  uploading: 'Guardándolo en tu biblioteca…',
  done: 'Canción lista. Suenen y descárgala.',
  error: '',
}

/**
 * Estudio con el motor local.
 *
 * Este componente es lo que convierte 1.719 líneas de compositor y motor
 * Tone.js en algo que un visitante puede usar sin pagar. El flujo parte en
 * dos porque renderizar necesita un AudioContext y eso solo existe del lado
 * del navegador:
 *
 * 1. `/api/generate` reserva el cupo, guarda la fila y devuelve la receta
 *    (prompt + semilla + género + BPM). La semilla se deriva del `songId`, así
 *    que el arreglo es reproducible: el mismo id siempre da la misma música.
 * 2. Aquí se componen y se renderizan los compases; el WAV resultante sube por
 *    `/api/songs/complete` al Storage privado del usuario.
 *
 * Si el paso 2 falla, `/api/generate` ya devuelve la unidad de cupo: un error
 * de red no puede costarle una canción a nadie.
 */
export function LocalComposer({ initialPrompt = '' }: { initialPrompt?: string }) {
  const [title, setTitle] = useState('')
  const [prompt, setPrompt] = useState(initialPrompt)
  const [genreId, setGenreId] = useState('')
  const [bpm, setBpm] = useState(0)
  const [phase, setPhase] = useState<Phase>('idle')
  const [detail, setDetail] = useState('')
  const [progress, setProgress] = useState(0)
  const [recipe, setRecipe] = useState<Recipe | null>(null)
  const [arrangement, setArrangement] = useState<Arrangement | null>(null)
  const [audioUrl, setAudioUrl] = useState<string | null>(null)
  const [playing, setPlaying] = useState(false)
  const objectUrlRef = useRef<string | null>(null)

  const busy = phase === 'sending' || phase === 'composing' || phase === 'rendering' || phase === 'uploading'

  const fail = useCallback((message: string) => {
    setPhase('error')
    setDetail(message)
  }, [])

  // El motor es un singleton: si este componente se desmonta dejando la
  // reproducción abierta, el hilo de Tone sigue sonando en la próxima página.
  useEffect(
    () => () => {
      engine.stop()
      engine.dispose()
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current)
    },
    [],
  )

  const replaceObjectUrl = useCallback((blob: Blob) => {
    if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current)
    const next = URL.createObjectURL(blob)
    objectUrlRef.current = next
    return next
  }, [])

  async function create(event: FormEvent) {
    event.preventDefault()
    setAudioUrl(null)
    setProgress(0)

    if (!title.trim() || !prompt.trim()) {
      fail('Ponle título y describe la canción.')
      return
    }

    setPhase('sending')
    let next: Recipe
    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          engine: 'local',
          title: title.trim(),
          prompt: prompt.trim(),
          genreId: genreId || undefined,
          genre: GENRES.find((genre) => genre.id === genreId)?.name ?? null,
          tempo: bpm || undefined,
        }),
      })
      const data = await response.json().catch(() => null)
      if (!response.ok || !data?.render) throw new Error(data?.error ?? 'No se pudo iniciar la composición.')
      next = {
        songId: String(data.song.id),
        prompt: String(data.render.prompt),
        seed: String(data.render.seed),
        genreId: data.render.genreId ?? undefined,
        bpm: typeof data.render.bpm === 'number' ? data.render.bpm : undefined,
        title: String(data.render.title ?? title),
      }
    } catch (error) {
      fail(error instanceof Error ? error.message : 'Fallo de red al pedir la composición.')
      return
    }

    setRecipe(next)
    setPhase('composing')

    // El arreglo es síncrono y determinista; el await solo da aire a la UI.
    let arrangement: Arrangement
    try {
      arrangement = compose({
        prompt: next.prompt,
        seed: next.seed,
        genreId: next.genreId,
        bpm: next.bpm,
        title: next.title,
      })
      setArrangement(arrangement)
    } catch (error) {
      console.error('[composer] el compositor falló', error)
      fail('El compositor no pudo generar el arreglo. Tu cupo no se descontó.')
      return
    }

    setPhase('rendering')
    let blob: Blob
    try {
      blob = await engine.renderToFile(arrangement, setProgress)
    } catch (error) {
      console.error('[composer] render local falló', error)
      fail('Tu navegador no pudo renderizar el audio. Prueba en Chrome o Edge actualizados.')
      return
    }

    // Vista previa inmediata: aunque la subida falle después, la canción ya
    // suena, y el usuario no se queda mirando una barra sin resultado.
    setAudioUrl(replaceObjectUrl(blob))
    setProgress(0)
    setPhase('uploading')

    try {
      const form = new FormData()
      form.set('songId', next.songId)
      form.set('duration', String(Math.round(arrangement.durationSeconds)))
      form.set('audio', blob, `${next.title.slice(0, 40) || 'cancion'}.wav`)

      const response = await fetch('/api/songs/complete', { method: 'POST', body: form })
      const data = await response.json().catch(() => null)
      if (!response.ok) throw new Error(data?.error ?? 'No se pudo guardar en tu biblioteca.')
      setPhase('done')
      setDetail('Guardada en tu biblioteca. Puedes descargar el WAV.')
    } catch (error) {
      // El audio existe en pantalla: perderlo por un fallo de Storage sería
      // peor que avisar. Se deja la descarga y se dice lo que no pasó.
      console.error('[composer] la subida falló', error)
      setPhase('done')
      setDetail(
        error instanceof Error
          ? `Sonó, pero no pudimos guardarlo: ${error.message}`
          : 'Sonó, pero no pudimos guardarlo en la biblioteca.',
      )
    }
  }

  /** Vista previa en vivo con el motor interactivo, sin esperar al render. */
  async function preview() {
    if (!arrangement) return
    try {
      if (playing) {
        engine.stop()
        setPlaying(false)
        return
      }
      await engine.load(arrangement)
      await engine.play()
      setPlaying(true)
    } catch (error) {
      console.error('[composer] preview falló', error)
      setDetail('El navegador bloqueó la reproducción; vuelve a intentarlo con el audio ya generado.')
    }
  }

  function download() {
    if (!audioUrl || !recipe) return
    const link = document.createElement('a')
    link.href = audioUrl
    link.download = `${recipe.title.replace(/[^\p{L}\p{N}-]+/gu, '-').slice(0, 40) || 'cancion'}.wav`
    link.click()
  }

  return <form onSubmit={create} className="pg-card flex flex-col gap-4 p-5 sm:p-6" style={{ borderColor: 'color-mix(in srgb, var(--pg-cyan) 25%, transparent)' }}>
    <div className="flex items-start justify-between gap-4">
      <div>
        <p className="pg-eyebrow">Motor local · sin costo</p>
        <h3 className="pg-block-title mt-1.5">Escribe tu primera dirección musical</h3>
        <p className="pg-note mt-1.5 max-w-xl">
          El arreglo se compone aquí y el audio se renderiza en tu navegador. No usa el servicio de pago, así que
          puedes practicar cuantas veces te permita tu cupo gratuito.
        </p>
      </div>
      <Music2 className="pg-accent-cyan hidden shrink-0 opacity-70 sm:block" size={22} />
    </div>

    <label className="pg-label flex flex-col gap-1.5">
      Título
      <input value={title} onChange={(event) => setTitle(event.target.value)} maxLength={80} required
        placeholder="Ej. Mapa sonoro nº1"
        className="pg-field h-11 text-sm" />
    </label>

    <label className="pg-label flex flex-col gap-1.5">
      Dirección musical
      <textarea value={prompt} onChange={(event) => setPrompt(event.target.value)} maxLength={2000} required rows={4}
        placeholder="Género, emoción, instrumentación, tempo y estructura. Sé específico: el motor atiende cinco decisiones, no adjetivos."
        className="pg-field p-3 text-sm leading-6" />
    </label>

    <div className="grid gap-3 sm:grid-cols-2">
      <label className="pg-label flex flex-col gap-1.5">
        ADN de género (opcional)
        <select value={genreId} onChange={(event) => setGenreId(event.target.value)}
          className="pg-field h-11 text-sm">
          <option value="">Que lo decida el prompt</option>
          {GENRES.map((genre) => <option key={genre.id} value={genre.id}>{genre.name}</option>)}
        </select>
      </label>
      <label className="pg-label flex flex-col gap-1.5">
        BPM (opcional, 40–200)
        <input type="number" min={40} max={200} value={bpm || ''}
          onChange={(event) => setBpm(Number(event.target.value) || 0)}
          placeholder="Auto"
          className="pg-field h-11 text-sm" />
      </label>
    </div>

    <div className="flex flex-wrap items-center gap-3">
      <button type="submit" disabled={busy}
        className="pg-btn pg-btn-primary" style={{ padding: '0.7rem 1.3rem' }}>
        {busy ? <LoaderCircle className="animate-spin" size={16} /> : <Sparkles size={16} />}
        {busy ? PHASE_COPY[phase] : 'Componer y guardar'}
      </button>
      {arrangement && <button type="button" onClick={preview}
        className="pg-btn pg-btn-ghost pg-btn-sm">
        <AudioLines size={16} /> {playing ? 'Detener vista previa' : 'Escuchar en vivo'}
      </button>}
      {audioUrl && <button type="button" onClick={download}
        className="pg-btn pg-btn-ghost pg-btn-sm" data-tone="cyan">
        <Download size={16} /> Descargar WAV
      </button>}
    </div>

    {phase === 'rendering' && progress > 0 && (
      <div>
        <div className="pg-meter" role="progressbar" aria-valuenow={Math.round(progress * 100)} aria-valuemin={0} aria-valuemax={100} aria-label="Renderizado del audio">
          <div className="pg-meter-fill" style={{ width: `${Math.round(progress * 100)}%` }} />
        </div>
        <p className="pg-meta mt-2">
          Renderizando · {Math.round(progress * 100)}%
        </p>
      </div>
    )}

    {arrangement && <p className="pg-item-meta">
      {arrangement.sections.length} secciones · {Math.round(arrangement.durationSeconds)} s · {arrangement.bpm} BPM · {arrangement.key.tonic} {arrangement.key.mode}
    </p>}

    {audioUrl && phase !== 'error' && <audio controls src={audioUrl} className="w-full" onPlay={() => setPlaying(false)} />}

    {(detail || phase === 'error') && (
      <p role={phase === 'error' ? 'alert' : 'status'} data-tone={phase === 'error' ? 'error' : undefined} className="pg-status flex items-center gap-2">
        {phase === 'done' && <Save size={14} />} {detail || PHASE_COPY[phase]}
      </p>
    )}
  </form>
}
