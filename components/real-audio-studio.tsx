'use client'

import { useCallback, useEffect, useRef, useState, type ChangeEvent, type FormEvent } from 'react'

type Track = {
  title: string
  url: string
  origin: 'Archivo local' | 'URL externa'
  objectUrl?: string
}

type ViewMode = 'bars' | 'line'

type FrequencySnapshot = {
  timestamp: string
  track: string
  fftSize: number
  sampleRate: number
  frequencies: number[]
  magnitudes: number[]
}

function audioContextConstructor() {
  return window.AudioContext ?? (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
}

function csvEscape(value: string) {
  return `"${value.replaceAll('"', '""')}"`
}

function getTrackTitle(url: URL) {
  const segment = url.pathname.split('/').filter(Boolean).at(-1)
  if (!segment) return 'Audio externo'
  try { return decodeURIComponent(segment) } catch { return segment }
}

export function RealAudioStudio() {
  const [track, setTrack] = useState<Track | null>(null)
  const [urlInput, setUrlInput] = useState('')
  const [error, setError] = useState('')
  const [isPlaying, setIsPlaying] = useState(false)
  const [volume, setVolume] = useState(0.8)
  const [mode, setMode] = useState<ViewMode>('bars')
  const [analyser, setAnalyser] = useState<AnalyserNode | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const contextRef = useRef<AudioContext | null>(null)
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null)
  const rafRef = useRef<number | null>(null)
  const trackRef = useRef<Track | null>(null)
  // El canvas se sujeta por referencia, no por `document.querySelector`: con dos
  // estudios en la misma página (o con este componente montado dos veces en el
  // árbol de vistas previas) la consulta devuelve el primero y el espectro se pinta
  // en el sitio equivocado, sin error.
  const fftCanvasRef = useRef<HTMLCanvasElement | null>(null)

  const replaceTrack = useCallback((next: Track | null) => {
    const previous = trackRef.current
    if (previous?.objectUrl) URL.revokeObjectURL(previous.objectUrl)
    trackRef.current = next
    setTrack(next)
    setError('')
    setIsPlaying(false)
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.currentTime = 0
    }
  }, [])

  const ensureGraph = useCallback(async () => {
    const audio = audioRef.current
    if (!audio) throw new Error('El reproductor de audio aún no está listo.')
    if (!contextRef.current) {
      const AudioContextClass = audioContextConstructor()
      if (!AudioContextClass) throw new Error('Este navegador no es compatible con Web Audio API.')
      const context = new AudioContextClass()
      const nextAnalyser = context.createAnalyser()
      nextAnalyser.fftSize = 2048
      nextAnalyser.smoothingTimeConstant = 0.82
      const source = context.createMediaElementSource(audio)
      source.connect(nextAnalyser)
      nextAnalyser.connect(context.destination)
      contextRef.current = context
      sourceRef.current = source
      setAnalyser(nextAnalyser)
    }
    if (contextRef.current.state === 'suspended') await contextRef.current.resume()
  }, [])

  const onFile = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    if (!file.type.startsWith('audio/')) {
      setError('Selecciona un archivo de audio válido.')
      return
    }
    const objectUrl = URL.createObjectURL(file)
    replaceTrack({ title: file.name, url: objectUrl, origin: 'Archivo local', objectUrl })
  }

  const onUrl = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    try {
      const parsed = new URL(urlInput.trim())
      if (!['http:', 'https:'].includes(parsed.protocol) || parsed.username || parsed.password) {
        throw new Error('Usa una URL http(s) sin credenciales.')
      }
      replaceTrack({ title: getTrackTitle(parsed), url: parsed.toString(), origin: 'URL externa' })
    } catch (cause) {
      setError(cause instanceof Error && cause.message.startsWith('Usa') ? cause.message : 'La URL no es válida.')
    }
  }

  const onVolume = (event: ChangeEvent<HTMLInputElement>) => {
    const next = Number(event.target.value)
    setVolume(next)
    if (audioRef.current) audioRef.current.volume = next
  }

  const saveSnapshot = () => {
    if (!track || !analyser || !contextRef.current) {
      setError('Carga y reproduce una pista antes de guardar su espectro.')
      return
    }
    const values = new Uint8Array(analyser.frequencyBinCount)
    analyser.getByteFrequencyData(values)
    const snapshot: FrequencySnapshot = {
      timestamp: new Date().toISOString(),
      track: track.title,
      fftSize: analyser.fftSize,
      sampleRate: contextRef.current.sampleRate,
      frequencies: Array.from(values, (_, index) => Number(((index * contextRef.current!.sampleRate) / analyser.fftSize).toFixed(2))),
      magnitudes: Array.from(values),
    }
    const csv = [
      `# FFT Audio Studio — captura espectral`,
      `# Fecha: ${snapshot.timestamp}`,
      `# Pista: ${csvEscape(snapshot.track)}`,
      `# fftSize: ${snapshot.fftSize}`,
      `# sampleRate: ${snapshot.sampleRate} Hz`,
      'frecuencia_hz,magnitud_0_255',
      ...snapshot.frequencies.map((frequency, index) => `${frequency},${snapshot.magnitudes[index]}`),
    ].join('\n')
    const objectUrl = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
    const link = document.createElement('a')
    link.href = objectUrl
    link.download = `fft-${new Date().toISOString().replace(/[:.]/g, '-')}.csv`
    link.click()
    window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000)
    setError('')
  }

  useEffect(() => {
    const audio = audioRef.current
    if (audio) audio.volume = volume
  }, [volume, track])

  useEffect(() => {
    const canvas = fftCanvasRef.current
    const context2d = canvas ? canvas.getContext('2d') : null
    if (!canvas || !context2d) return
    let animationFrame = 0
    const data = new Uint8Array(analyser?.frequencyBinCount ?? 1024)

    // El canvas no puede heredar el color por CSS: pinta sobre mapa de bits. Se
    // leen los tokens de la shell una sola vez, al montar, y cada lectura lleva
    // su respaldo por si el componente viviera fuera de `.pg-shell`. Así el
    // espectro cambia de color cuando cambia la marca, no cuando alguien edite
    // este archivo.
    //
    // La validación no es decoración: `fillStyle` con una cadena que el navegador
    // no entiende NO lanza nada, deja el color del trazo anterior. Un token roto o
    // sin resolver (`var(--x)` vacío) se vería como un especto con el color
    // equivocado y nadie sabría qué paso. Se comprueba con `CSS.supports` y, si
    // falla, se usa el literal de la marca, que es el mismo valor que hay hoy en
    // `app/globals.css`.
    const literals: Record<string, string> = {
      '--pg-bg': '#07121f',
      '--pg-muted': '#7f9aa7',
      '--pg-violet': '#c09eff',
      '--pg-cyan': '#75e9f2',
      '--pg-amber': '#ffcf72',
      '--pg-cyan-soft': '#8cecf3',
    }
    const tone = (name: string) => {
      const raw = getComputedStyle(canvas).getPropertyValue(name).trim()
      return raw && CSS.supports('color', raw) ? raw : literals[name]
    }
    const ink = tone('--pg-bg')
    const muted = tone('--pg-muted')
    const deep = tone('--pg-violet')
    const mid = tone('--pg-cyan')
    const peak = tone('--pg-amber')
    const trace = tone('--pg-cyan-soft')

    // 72 barras x 60 fps eran 4 320 objetos CanvasGradient por segundo, y el
    // recolector de basura lo cobra en cuadros. La gradación solo depende del alto
    // útil del lienzo y de un percentil de altura, así que se tabula en 24 pasos y
    // se rehace únicamente cuando cambia el tamaño: el coste pasa por cuadro es una
    // lectura de array.
    const BAR_STEPS = 24
    let gradientHeight = 0
    let gradientLUT: CanvasGradient[] = []
    const barGradient = (height: number, barHeight: number) => {
      if (gradientHeight !== height) {
        gradientHeight = height
        gradientLUT = Array.from({ length: BAR_STEPS }, (_unused, step) => {
          const span = (height * (step + 1)) / BAR_STEPS
          const gradient = context2d.createLinearGradient(0, height, 0, height - span)
          gradient.addColorStop(0, deep)
          gradient.addColorStop(0.55, mid)
          gradient.addColorStop(1, peak)
          return gradient
        })
      }
      const step = Math.min(BAR_STEPS - 1, Math.max(0, Math.floor((barHeight / height) * BAR_STEPS) - 1))
      return gradientLUT[step]
    }

    const render = () => {
      animationFrame = requestAnimationFrame(render)
      const rect = canvas.getBoundingClientRect()
      const ratio = Math.min(window.devicePixelRatio || 1, 2)
      const width = Math.max(1, Math.floor(rect.width * ratio))
      const height = Math.max(1, Math.floor(rect.height * ratio))
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width
        canvas.height = height
      }
      context2d.fillStyle = ink
      context2d.fillRect(0, 0, width, height)
      if (!analyser) {
        context2d.fillStyle = muted
        context2d.font = `${14 * ratio}px monospace`
        context2d.textAlign = 'center'
        context2d.fillText('Carga y reproduce un audio', width / 2, height / 2)
        return
      }
      analyser.getByteFrequencyData(data)
      if (mode === 'bars') {
        const bars = 72
        const barWidth = width / bars
        for (let index = 0; index < bars; index += 1) {
          const start = Math.floor(index * data.length / bars)
          const end = Math.max(start + 1, Math.floor((index + 1) * data.length / bars))
          let sum = 0
          for (let bin = start; bin < end; bin += 1) sum += data[bin]
          const amplitude = sum / (end - start) / 255
          const barHeight = Math.max(2 * ratio, amplitude * height * 0.92)
          context2d.fillStyle = barGradient(height, barHeight)
          context2d.fillRect(index * barWidth + ratio, height - barHeight, Math.max(1, barWidth - 2 * ratio), barHeight)
        }
      } else {
        context2d.beginPath()
        context2d.lineWidth = 2 * ratio
        context2d.strokeStyle = trace
        const points = Math.min(256, data.length)
        for (let index = 0; index < points; index += 1) {
          const bin = Math.floor(index * data.length / points)
          const x = (index / (points - 1)) * width
          const y = height - (data[bin] / 255) * height * 0.9
          if (index === 0) context2d.moveTo(x, y)
          else context2d.lineTo(x, y)
        }
        context2d.stroke()
      }
    }
    render()
    return () => cancelAnimationFrame(animationFrame)
  }, [analyser, mode, isPlaying, track])

  useEffect(() => () => {
    if (trackRef.current?.objectUrl) URL.revokeObjectURL(trackRef.current.objectUrl)
    if (contextRef.current && contextRef.current.state !== 'closed') void contextRef.current.close()
    if (sourceRef.current) sourceRef.current.disconnect()
    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current)
  }, [])

  const startPlayback = async () => {
    if (!audioRef.current || !track) return
    try {
      await ensureGraph()
      await audioRef.current.play()
      setError('')
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo reproducir el audio.')
    }
  }

  return <section id="audio-analyzer" className="pg-card mt-8 p-5 sm:p-8">
    <header className="mb-6 flex flex-wrap items-start justify-between gap-4">
      <div><p className="pg-eyebrow">Web Audio API · FFT real</p><h2 className="pg-section-title mt-2">Reproductor y analizador</h2><p className="pg-lede">Escucha un archivo propio o una URL directa y visualiza los bins reales del AnalyserNode. También puedes exportar la captura espectral actual como CSV.</p></div>
      <span className="pg-chip" data-tone="mint">FFT {analyser?.fftSize ?? 2048} · {isPlaying ? 'ACTIVO' : 'EN ESPERA'}</span>
    </header>
    <div className="grid gap-6 lg:grid-cols-[.8fr_1.2fr]">
      <div className="pg-inset space-y-5 p-5">
        <label className="pg-label block">Archivo de audio<input className="pg-field mt-2 block w-full cursor-pointer text-xs file:mr-3 file:rounded-full file:border-0 file:bg-[var(--pg-cyan)] file:px-3 file:py-2 file:font-semibold file:text-[var(--pg-bg)]" type="file" accept="audio/*" onChange={onFile} /></label>
        <form onSubmit={onUrl} className="space-y-2"><label htmlFor="external-audio-url" className="pg-label block">URL directa de audio</label><div className="flex gap-2"><input id="external-audio-url" type="url" inputMode="url" value={urlInput} onChange={(event) => setUrlInput(event.target.value)} placeholder="https://dominio.com/audio.mp3" className="pg-field min-w-0 flex-1" /><button className="pg-btn pg-btn-primary pg-btn-sm">Cargar</button></div></form>
        {error && <p role="alert" className="pg-status" data-tone="error">{error}</p>}
        <div className="pg-inset text-sm"><p className="pg-item-title truncate">{track?.title ?? 'Sin pista cargada'}</p><p className="pg-note mt-1">{track?.origin ?? 'Audio local o URL externa compatible'}</p></div>
        <button type="button" onClick={startPlayback} disabled={!track} className="pg-btn pg-btn-primary w-full">▶ Reproducir y analizar</button>
        <label className="pg-label flex items-center gap-3">Volumen<input aria-label="Volumen" type="range" min="0" max="1" step="0.01" value={volume} onChange={onVolume} className="w-full accent-[var(--pg-cyan)]" /></label>
        <button type="button" onClick={saveSnapshot} disabled={!track} className="pg-btn pg-btn-ghost pg-btn-sm w-full">Descargar espectro CSV</button>
      </div>
      <div className="pg-inset p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3"><h3 className="pg-block-title">Espectro de frecuencias</h3><div className="pg-inset flex gap-1.5 p-1.5">{(['bars', 'line'] as const).map((option) => <button key={option} type="button" aria-pressed={mode === option} onClick={() => setMode(option)} className="pg-seg">{option === 'bars' ? 'Barras' : 'Línea'}</button>)}</div></div>
        <div className="pg-frame relative h-56 sm:h-64">
          <canvas
            ref={fftCanvasRef}
            data-audio-fft-canvas
            className="h-full w-full"
            role="img"
            // El lienzo es el único sitio donde vive esta información: sin etiqueta,
            // un lector de pantalla anuncia una imagen vacía. La descripción cambia
            // con la vista activa porque barras y línea muestran la misma fuente de
            // formas distintas, y dice el tamaño real de la FFT en lugar de fingir
            // una precisión que no se puede leer de un mapa de bits.
            aria-label={
              analyser
                ? `Espectro de frecuencias en vivo, vista de ${mode === 'bars' ? 'barras' : 'línea'}, FFT de ${analyser.fftSize} puntos`
                : 'Espectro de frecuencias: sin pista cargada'
            }
          />
        </div>
        <audio ref={audioRef} src={track?.url} controls crossOrigin="anonymous" onPlay={() => setIsPlaying(true)} onPause={() => setIsPlaying(false)} onEnded={() => setIsPlaying(false)} onError={() => { if (track) setError('No se pudo cargar el audio. Comprueba el formato, la URL y, para audio externo, que el servidor permita CORS.') }} className="mt-5 h-12 w-full accent-[var(--pg-cyan)]" />
        <p className="pg-note mt-3">Las URLs externas necesitan servir un archivo de audio y permitir CORS para que el navegador pueda analizar el espectro. El audio local funciona sin conexión externa. El analizador procesa el sonido en el navegador; no sube ni almacena el archivo.</p>
      </div>
    </div>
  </section>
}
