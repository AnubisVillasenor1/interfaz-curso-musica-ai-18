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
    const canvas = document.querySelector<HTMLCanvasElement>('[data-audio-fft-canvas]')
    const context2d = canvas?.getContext('2d')
    if (!canvas || !context2d) return
    let animationFrame = 0
    const data = new Uint8Array(analyser?.frequencyBinCount ?? 1024)

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
      context2d.fillStyle = '#050508'
      context2d.fillRect(0, 0, width, height)
      if (!analyser) {
        context2d.fillStyle = '#737373'
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
          const gradient = context2d.createLinearGradient(0, height, 0, height - barHeight)
          gradient.addColorStop(0, '#065f46')
          gradient.addColorStop(0.55, '#10b981')
          gradient.addColorStop(1, '#6366f1')
          context2d.fillStyle = gradient
          context2d.fillRect(index * barWidth + ratio, height - barHeight, Math.max(1, barWidth - 2 * ratio), barHeight)
        }
      } else {
        context2d.beginPath()
        context2d.lineWidth = 2 * ratio
        context2d.strokeStyle = '#34d399'
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

  return <section id="audio-analyzer" className="mt-8 rounded-3xl border border-emerald-900/50 bg-[#090d12] p-5 text-neutral-100 shadow-2xl sm:p-8">
    <header className="mb-6 flex flex-wrap items-start justify-between gap-4">
      <div><p className="text-[10px] uppercase tracking-[.24em] text-emerald-400">Web Audio API · FFT real</p><h2 className="mt-2 text-2xl font-semibold">Reproductor y analizador</h2><p className="mt-2 max-w-2xl text-sm text-neutral-400">Escucha un archivo propio o una URL directa y visualiza los bins reales del AnalyserNode. También puedes exportar la captura espectral actual como CSV.</p></div>
      <span className="rounded-full border border-emerald-800/60 bg-emerald-950/60 px-3 py-1 font-mono text-[10px] text-emerald-300">FFT {analyser?.fftSize ?? 2048} · {isPlaying ? 'ACTIVO' : 'EN ESPERA'}</span>
    </header>
    <div className="grid gap-6 lg:grid-cols-[.8fr_1.2fr]">
      <div className="space-y-5 rounded-2xl border border-white/10 bg-white/[.025] p-5">
        <label className="block text-sm text-neutral-300">Archivo de audio<input className="mt-2 block w-full cursor-pointer rounded-xl border border-white/10 bg-black/40 p-3 text-xs file:mr-3 file:rounded-lg file:border-0 file:bg-emerald-500 file:px-3 file:py-2 file:font-semibold file:text-black" type="file" accept="audio/*" onChange={onFile} /></label>
        <form onSubmit={onUrl} className="space-y-2"><label htmlFor="external-audio-url" className="block text-sm text-neutral-300">URL directa de audio</label><div className="flex gap-2"><input id="external-audio-url" type="url" inputMode="url" value={urlInput} onChange={(event) => setUrlInput(event.target.value)} placeholder="https://dominio.com/audio.mp3" className="min-w-0 flex-1 rounded-xl border border-white/10 bg-black/40 px-3 py-3 text-sm outline-none focus:border-emerald-400" /><button className="rounded-xl bg-emerald-500 px-4 font-semibold text-black hover:bg-emerald-400">Cargar</button></div></form>
        {error && <p role="alert" className="rounded-xl border border-red-900/60 bg-red-950/30 p-3 text-sm text-red-200">{error}</p>}
        <div className="rounded-xl border border-white/10 bg-black/30 p-3 text-sm"><p className="truncate text-white">{track?.title ?? 'Sin pista cargada'}</p><p className="mt-1 text-xs text-neutral-500">{track?.origin ?? 'Audio local o URL externa compatible'}</p></div>
        <button type="button" onClick={startPlayback} disabled={!track} className="w-full rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 px-4 py-3 font-semibold text-black disabled:cursor-not-allowed disabled:opacity-40">▶ Reproducir y analizar</button>
        <label className="flex items-center gap-3 text-sm text-neutral-400">Volumen<input aria-label="Volumen" type="range" min="0" max="1" step="0.01" value={volume} onChange={onVolume} className="w-full accent-emerald-500" /></label>
        <button type="button" onClick={saveSnapshot} disabled={!track} className="w-full rounded-xl border border-emerald-800 px-4 py-3 text-sm text-emerald-200 hover:bg-emerald-950/40 disabled:cursor-not-allowed disabled:opacity-40">Descargar espectro CSV</button>
      </div>
      <div className="rounded-2xl border border-white/10 bg-white/[.025] p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3"><h3 className="font-medium">Espectro de frecuencias</h3><div className="flex rounded-lg border border-white/10 p-1">{(['bars', 'line'] as const).map((option) => <button key={option} type="button" aria-pressed={mode === option} onClick={() => setMode(option)} className={`rounded-md px-3 py-1.5 text-xs ${mode === option ? 'bg-emerald-500 font-semibold text-black' : 'text-neutral-400 hover:text-white'}`}>{option === 'bars' ? 'Barras' : 'Línea'}</button>)}</div></div>
        <div className="relative h-56 overflow-hidden rounded-xl border border-neutral-800 bg-[#050508] sm:h-64"><canvas data-audio-fft-canvas className="h-full w-full" /></div>
        <audio ref={audioRef} src={track?.url} controls crossOrigin="anonymous" onPlay={() => setIsPlaying(true)} onPause={() => setIsPlaying(false)} onEnded={() => setIsPlaying(false)} onError={() => { if (track) setError('No se pudo cargar el audio. Comprueba el formato, la URL y, para audio externo, que el servidor permita CORS.') }} className="mt-5 h-12 w-full accent-emerald-500" />
        <p className="mt-3 text-xs leading-relaxed text-neutral-500">Las URLs externas necesitan servir un archivo de audio y permitir CORS para que el navegador pueda analizar el espectro. El audio local funciona sin conexión externa. El analizador procesa el sonido en el navegador; no sube ni almacena el archivo.</p>
      </div>
    </div>
  </section>
}
