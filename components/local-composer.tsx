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
  done: 'Canción lista. Escúchala y descárgala.',
  error: '',
}

/**
 * Puntos de partida, no plantillas cerradas.
 *
 * El campo de descripción pedía «sé específico» sin decir específico sobre qué.
 * Un ejemplo completo por estilo muestra las cinco decisiones de un golpe y
 * deja el texto editable: quien no sabe qué escribir elige uno y cambia una
 * palabra, que es exactamente el ejercicio del curso.
 */
const FEATURED_PRESETS = new Set(['Corrido tumbado', 'Cumbia sonidera', 'Salsa colombiana', 'Balada pop'])

const PRESET_VISUALS: Record<string, string> = {
  'Corrido tumbado': '/visuals/golden-wave.png',
  'Cumbia sonidera': '/visuals/playlist-night.png',
  'Salsa colombiana': '/visuals/mixing-console.png',
  'Balada pop': '/visuals/vocal-atmosphere.png',
}

const PRESETS = [
  {
    label: 'Lo-fi para estudiar',
    genreId: 'lofi',
    bpm: 78,
    prompt:
      'Lo-fi hip hop cálido y melancólico. Piano con textura de vinilo, batería suave y bajo redondo. 78 BPM, compás de 4/4. Estructura: intro, loop principal, puente y outro.',
  },
  {
    label: 'Corrido tumbado',
    genreId: 'corrido',
    bpm: 92,
    prompt:
      'Corrido tumbado con guitarra acústica, requinto y bajo eléctrico. Tono narrativo y orgulloso. 92 BPM, compás de 3/4. Estructura: intro de requinto, verso, coro, verso y outro.',
  },
  {
    label: 'Cine épico',
    genreId: 'cinematic',
    bpm: 70,
    prompt:
      'Pieza cinematográfica épica y esperanzadora. Cuerdas en capas, metales suaves, tambores graves y coro. 70 BPM. Estructura: introducción tensa, ascenso, clímax y resolución.',
  },
  {
    label: 'House de festival',
    genreId: 'house',
    bpm: 124,
    prompt:
      'House de festival, enérgico y luminoso. Bombo four-on-the-floor, bajo con filtro, pads abiertos y plucks. 124 BPM. Estructura: intro, build, drop, breakdown y drop final.',
  },
  {
    label: 'Neo-soul vocal',
    genreId: 'neosoul',
    bpm: 84,
    prompt:
      'Neo-soul íntimo con voz principal cálida, coros de respuesta, Rhodes, guitarra con chorus y bajo redondo. 84 BPM, pocket detrás del beat. Estructura: verso, pre-coro, coro y puente.',
  },
  {
    label: 'Techno industrial',
    genreId: 'techno',
    bpm: 134,
    prompt:
      'Techno industrial hipnótico con kick profundo, hats mecánicos, percusión metálica, bajo ácido y textura de warehouse. 134 BPM. Build gradual, break de tensión y drop contundente.',
  },
  {
    label: 'Ambient cinematográfico',
    genreId: 'ambient',
    bpm: 60,
    prompt:
      'Ambient cinematográfico suspendido con pads evolutivos, piano distante, arpa procesada, grabación de campo y cola de reverb larga. 60 BPM. Sin batería constante: silencio, ascenso y resolución.',
  },
    {
      label: 'Jazz nocturno',
      genreId: 'jazz',
      bpm: 126,
      prompt:
        'Jazz neo-bop nocturno con contrabajo caminante, piano acústico con voicings extendidos, saxo improvisado y batería con escobillas. 126 BPM, swing humano. Tema, solo y reprise.',
    },
    { label: 'Sierreño acústico', genreId: 'sierreño', bpm: 92, prompt: 'Sierreño acústico íntimo en 3/4, con requinto melódico, guitarras de madera, bajo cálido y espacio para una voz narrativa. Intro, verso, coro y outro.' },
    { label: 'Cumbia sonidera', genreId: 'cumbia-sonidera', bpm: 96, prompt: 'Cumbia sonidera bailable con güiro, órgano cumbiero, congas y bajo sincopado. 96 BPM, vaivén hipnótico y llamada-respuesta.' },
    { label: 'Salsa colombiana', genreId: 'salsa-colombiana', bpm: 102, prompt: 'Salsa colombiana con clave, campana, tumbao de bajo, montuno de piano y metales en respuesta. 102 BPM y espacio para improvisación.' },
    { label: 'Rap de barrio', genreId: 'rap-barrio', bpm: 88, prompt: 'Rap de barrio reflexivo con batería boom bap, piano eléctrico, bajo firme y textura de cinta. 88 BPM, voz narrativa al frente y coro breve.' },
    { label: 'Balada pop', genreId: 'pop-ballad', bpm: 78, prompt: 'Balada pop vulnerable con piano íntimo, guitarra limpia, cuerdas suaves y batería contenida. 78 BPM, verso cercano, coro expansivo y clímax dinámico.' },
    { label: 'Trova acústica', genreId: 'trova', bpm: 78, prompt: 'Trova acústica poética con guitarra de nylon, voz cercana y arreglo con espacio. 78 BPM, letra narrativa, puente instrumental y cierre íntimo.' },
  ] as const

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

  async function createWithVoices() {
    if (!title.trim() || !prompt.trim() || busy) return
    setPhase('sending'); setDetail('Enviando al estudio con voces…')
    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ engine: 'provider', title: title.trim(), prompt: prompt.trim(), genre: GENRES.find((g) => g.id === genreId)?.name ?? null, tempo: bpm || undefined }),
      })
      const data = await response.json().catch(() => null)
      if (!response.ok) throw new Error(data?.error ?? 'El estudio con voces no está disponible ahora.')
      const taskId = String(data.taskId ?? data.data?.taskId ?? '')
      if (!taskId) throw new Error('El proveedor no devolvió tarea.')
      setDetail('Generando con voces… vuelve a este panel en un momento.')
      for (let i = 0; i < 40; i += 1) {
        await new Promise((r) => setTimeout(r, 3000))
        const polled = await fetch(`/api/task/${encodeURIComponent(taskId)}`).then((r) => r.json().catch(() => null)).catch(() => null)
        const status = polled?.data?.status as string | undefined
        if (status === 'completed' || status === 'failed') {
          setDetail(status === 'completed' ? 'Lista: revisa tu biblioteca.' : 'La generación con voces falló; tu cupo no se descontó.')
          setPhase(status === 'completed' ? 'done' : 'error')
          break
        }
      }
    } catch (error) {
      setDetail(error instanceof Error ? error.message : 'Fallo de red.')
      setPhase('error')
    }
  }

  return <form onSubmit={create} className="pg-card flex flex-col gap-5 p-5 sm:p-7" style={{ borderColor: 'color-mix(in srgb, var(--pg-cyan) 25%, transparent)' }}>
    <div className="flex items-start justify-between gap-4">
      <div>
        <p className="pg-eyebrow">Paso 2 · Componer</p>
        <h2 className="pg-block-title mt-1.5">Describe la canción</h2>
        <p className="pg-note mt-1.5 max-w-xl" aria-live="polite">
          Escribe la idea en una frase. El motor local la convierte en arreglo y renderiza el audio en tu navegador:
          no usa el servicio de pago y no descuenta tu cupo con voces.
        </p>
      </div>
      <Music2 className="pg-accent-cyan hidden shrink-0 opacity-70 sm:block" size={22} />
    </div>

    <div>
      <p className="pg-label">Empieza con un ejemplo y cámbialo</p>
      <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {PRESETS.filter((preset) => FEATURED_PRESETS.has(preset.label)).map((preset) => (
          <button key={preset.label} type="button" aria-label={`Usar ejemplo: ${preset.label}`}
            onClick={() => { setPrompt(preset.prompt); setGenreId(preset.genreId); setBpm(preset.bpm); if (!title.trim()) setTitle(preset.label) }}
            className="group relative flex min-h-24 items-end overflow-hidden rounded-xl border border-white/10 bg-cover bg-center p-3 text-left text-sm font-medium text-white transition duration-200 hover:-translate-y-0.5 hover:border-cyan-200/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300"
            style={{ backgroundImage: `linear-gradient(0deg, rgba(7, 13, 22, .92), rgba(7, 13, 22, .08)), url(${PRESET_VISUALS[preset.label]})` }}>
            <span className="relative z-10">{preset.label}</span>
          </button>
        ))}
      </div>
      <div className="mt-3 flex flex-wrap gap-2" aria-label="Más ejemplos musicales">
        {PRESETS.filter((preset) => !FEATURED_PRESETS.has(preset.label)).map((preset) => (
          <button key={preset.label} type="button"
            onClick={() => { setPrompt(preset.prompt); setGenreId(preset.genreId); setBpm(preset.bpm); if (!title.trim()) setTitle(preset.label) }}
            className="pg-chip transition-colors hover:text-[var(--pg-ink)]" data-tone="violet">{preset.label}</button>
        ))}
      </div>
    </div>

    <label className="pg-label flex flex-col gap-1.5">
      1. Título de la canción
      <input name="song-title" autoComplete="off" value={title} onChange={(event) => setTitle(event.target.value)} maxLength={80} required
        placeholder="Ej. Mapa sonoro nº1…"
        className="pg-field h-11 text-sm" />
    </label>

    <label className="pg-label flex flex-col gap-1.5">
      2. Describe la canción
      <textarea name="music-prompt" autoComplete="off" value={prompt} onChange={(event) => setPrompt(event.target.value)} maxLength={2000} required rows={5}
        placeholder="Ej. Balada de piano melancólica, cuerdas cálidas y batería suave. 72 BPM…"
        className="pg-field p-3 text-sm leading-6" />
    </label>

    <div className="pg-inset p-4">
      <p className="pg-label" data-tone="muted">Las cinco decisiones que sí escucha el motor</p>
      <ul className="mt-2 grid gap-x-5 gap-y-1.5 text-[13px] leading-5 sm:grid-cols-2" style={{ color: 'var(--pg-text)' }}>
        <li><b className="pg-accent-cyan">Género</b> · qué familia rítmica</li>
        <li><b className="pg-accent-cyan">Emoción</b> · qué debe sentir quien escucha</li>
        <li><b className="pg-accent-cyan">Instrumentos</b> · qué voces suenan</li>
        <li><b className="pg-accent-cyan">Tempo</b> · BPM o sensación (lento, bailable)</li>
        <li><b className="pg-accent-cyan">Estructura</b> · intro, verso, coro, puente, outro</li>
      </ul>
      <p className="pg-note mt-2">
        Los adjetivos sueltos («épico», «bonito») no cambian el arreglo. Una decisión concreta por línea sí.
      </p>
    </div>

    <div className="grid gap-3 sm:grid-cols-2">
      <label className="pg-label flex flex-col gap-1.5">
        3. Género (opcional)
        <select value={genreId} onChange={(event) => setGenreId(event.target.value)}
          className="pg-field h-11 text-sm">
          <option value="">Que lo deduzca de la descripción</option>
          {GENRES.map((genre) => <option key={genre.id} value={genre.id}>{genre.name}</option>)}
        </select>
      </label>
      <label className="pg-label flex flex-col gap-1.5">
        4. BPM (opcional, 40–200)
        <input name="tempo" type="number" min={40} max={200} inputMode="numeric" value={bpm || ''}
          onChange={(event) => setBpm(Number(event.target.value) || 0)}
          placeholder="Automático…"
          className="pg-field h-11 text-sm" />
      </label>
    </div>

    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" disabled={busy}
          className="pg-btn pg-btn-primary" style={{ padding: '0.7rem 1.3rem' }}>
          {busy ? <LoaderCircle className="animate-spin" size={16} /> : <Sparkles size={16} />}
          {busy ? PHASE_COPY[phase] : 'Componer y guardar (gratis)'}
        </button>
        <button type="button" onClick={createWithVoices} disabled={busy || !title.trim() || !prompt.trim()}
          className="pg-btn pg-btn-ghost pg-btn-sm">
          Con voces · usa tu cupo diario
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
      <p className="pg-note">
        <b>Componer y guardar</b> es gratis y local: hasta 10 canciones al día con tu cuenta. <b>Con voces</b> envía
        la descripción al proveedor, descuenta una generación de tu plan y tarda más.
      </p>
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
