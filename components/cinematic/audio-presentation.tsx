'use client'

import { useCallback, useEffect, useRef, useState, type KeyboardEvent } from 'react'
import { ArrowRight, AudioLines, Headphones } from 'lucide-react'

interface AudioPresentationProps {
  enabled: boolean
  onComplete: () => void
}

export function AudioPresentation({ enabled, onComplete }: AudioPresentationProps) {
  const audioRef = useRef<HTMLAudioElement>(null)
  const replayButtonRef = useRef<HTMLButtonElement>(null)
  const [audioState, setAudioState] = useState<'loading' | 'playing' | 'blocked' | 'error'>('loading')
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    if (!enabled) return
    const audio = audioRef.current
    if (!audio) return

    let mounted = true
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    replayButtonRef.current?.focus()
    void audio.play().then(() => {
      if (mounted) setAudioState('playing')
    }).catch(() => {
      if (mounted) setAudioState('blocked')
    })

    return () => {
      mounted = false
      audio.pause()
      document.body.style.overflow = previousOverflow
    }
  }, [enabled])

  const enterStudio = useCallback(() => {
    audioRef.current?.pause()
    onComplete()
  }, [onComplete])

  const replay = useCallback(() => {
    const audio = audioRef.current
    if (!audio) return
    audio.currentTime = 0
    void audio.play().then(() => setAudioState('playing')).catch(() => setAudioState('blocked'))
  }, [])

  function updateProgress(audio: HTMLAudioElement) {
    if (Number.isFinite(audio.duration) && audio.duration > 0) {
      setProgress((audio.currentTime / audio.duration) * 100)
    }
  }

  function handleKeyDown(event: KeyboardEvent<HTMLElement>) {
    if (event.key === 'Escape') {
      event.preventDefault()
      enterStudio()
      return
    }
    if (event.key !== 'Tab') return

    const controls = Array.from(event.currentTarget.querySelectorAll<HTMLElement>('button:not([disabled])'))
    const first = controls[0]
    const last = controls[controls.length - 1]
    if (!first || !last) return
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault()
      last.focus()
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault()
      first.focus()
    }
  }

  return (
    <section
      aria-labelledby="presentation-title"
      aria-modal="true"
      className="pg-presentation fixed inset-0 z-[70] flex min-h-[100svh] items-center overflow-hidden"
      role="dialog"
      onKeyDown={handleKeyDown}
    >
      <audio
        ref={audioRef}
        src="/audio/1110-audio.mp3"
        preload="auto"
        playsInline
        onPlay={() => setAudioState('playing')}
        onEnded={onComplete}
        onError={() => setAudioState('error')}
        onTimeUpdate={(event) => updateProgress(event.currentTarget)}
        onLoadedMetadata={(event) => updateProgress(event.currentTarget)}
      />

      <img
        src="/visuals/mixing-console.png"
        alt=""
        aria-hidden="true"
        className="absolute inset-0 size-full object-cover object-center"
      />
      <div className="pg-presentation-shade absolute inset-0" aria-hidden="true" />
      <div className="pg-presentation-grid absolute inset-0" aria-hidden="true" />

      <div className="relative z-10 mx-auto flex w-full max-w-[1440px] flex-col px-6 py-12 sm:px-12 lg:px-20">
        <header className="flex items-center gap-3">
          <img
            src="/brand/play-go-official.png"
            alt=""
            width={42}
            height={42}
            className="size-10 rounded-xl object-cover ring-1 ring-white/20"
          />
          <div>
            <p className="font-mono text-[10px] font-semibold uppercase tracking-[.23em] text-white/90">Play &amp; Go</p>
            <p className="mt-1 font-mono text-[9px] uppercase tracking-[.2em] text-white/50">Estudio musical · TAMV</p>
          </div>
        </header>

        <main className="mt-16 max-w-4xl sm:mt-20 lg:mt-24">
          <p className="pg-presentation-eyebrow">
            <span aria-hidden="true" className="pg-presentation-status-dot" />
            El estudio está abierto
          </p>
          <h1 id="presentation-title" className="mt-6 max-w-4xl text-5xl font-medium leading-[.98] tracking-[-.065em] text-white sm:text-6xl lg:text-[5.6rem]">
            Tu próxima canción
            <span className="pg-presentation-title-accent block">empieza aquí.</span>
          </h1>
          <p className="mt-6 max-w-xl text-base leading-7 text-white/72 sm:text-lg sm:leading-8">
            Explora Play &amp; Go y convierte tus ideas en música.
          </p>

          <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:items-center">
            <button ref={replayButtonRef} type="button" className="pg-presentation-secondary" onClick={replay}>
              <AudioLines size={17} aria-hidden="true" />
              Volver a escuchar
            </button>
            <button type="button" className="pg-presentation-primary" onClick={enterStudio}>
              Entrar al estudio
              <ArrowRight size={17} aria-hidden="true" />
            </button>
          </div>
        </main>

        <footer className="mt-16 flex max-w-2xl flex-col gap-4 sm:mt-20">
          <div className="flex items-center gap-3 text-[11px] text-white/60" aria-live="polite">
            <Headphones size={15} aria-hidden="true" className="shrink-0 text-[var(--tour-signal)]" />
            <p>
              {audioState === 'playing'
                ? 'La presentación continuará al terminar el audio.'
                : audioState === 'blocked'
                  ? 'Tu navegador bloqueó el audio. Pulsa «Volver a escuchar» para iniciarlo.'
                  : audioState === 'error'
                    ? 'No pudimos cargar el audio. Puedes entrar al estudio y explorar la plataforma.'
                    : 'Preparando la presentación sonora…'}
            </p>
          </div>
          <div
            className="pg-presentation-progress"
            role="progressbar"
            aria-label="Progreso del audio de presentación"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(progress)}
          >
            <span style={{ width: `${progress}%` }} />
          </div>
        </footer>
      </div>
    </section>
  )
}
