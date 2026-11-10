'use client'

import { LoaderCircle, Pause, Play } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

export function AudioSectionButton({ text, label = 'Escuchar con IA' }: { text: string; label?: string }) {
  const [state, setState] = useState<'idle' | 'loading' | 'playing'>('idle')
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const urlRef = useRef<string | null>(null)

  useEffect(() => () => {
    audioRef.current?.pause()
    if (urlRef.current) URL.revokeObjectURL(urlRef.current)
  }, [])

  async function toggle() {
    if (state === 'playing') {
      audioRef.current?.pause()
      window.speechSynthesis?.cancel()
      setState('idle')
      return
    }

    if (audioRef.current && urlRef.current) {
      await audioRef.current.play()
      setState('playing')
      return
    }

    setState('loading')
    try {
      const response = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: text.slice(0, 900) }),
      })
      if (!response.ok) throw new Error('tts_unavailable')
      const audio = new Audio(URL.createObjectURL(await response.blob()))
      urlRef.current = audio.src
      audioRef.current = audio
      audio.onended = () => setState('idle')
      await audio.play()
      setState('playing')
    } catch {
      if ('speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance(text.slice(0, 900))
        utterance.lang = 'es-MX'
        utterance.onend = () => setState('idle')
        window.speechSynthesis.cancel()
        window.speechSynthesis.speak(utterance)
        setState('playing')
      } else {
        setState('idle')
      }
    }
  }

  return (
    <button type="button" onClick={toggle} disabled={state === 'loading'} className="pg-btn pg-btn-ghost pg-btn-sm" aria-label={label}>
      {state === 'loading' ? <LoaderCircle size={14} className="animate-spin" aria-hidden="true" /> : state === 'playing' ? <Pause size={14} aria-hidden="true" /> : <Play size={14} aria-hidden="true" />}
      {state === 'loading' ? 'Preparando audio…' : state === 'playing' ? 'Pausar audio' : label}
    </button>
  )
}
