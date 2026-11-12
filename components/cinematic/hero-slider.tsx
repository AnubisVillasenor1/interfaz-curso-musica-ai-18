'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import {
  ArrowDown,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Code2,
  Cpu,
  Music2,
  Pause,
  Play,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  type LucideIcon,
} from 'lucide-react'

import { COURSE_MODULES, COURSE_TOTAL_LESSONS } from '@/lib/course'

type SlideAction = {
  href: string
  label: string
  primary?: boolean
}

type Slide = {
  kicker: string
  title: string
  body: string
  image: string
  imageAlt: string
  badges: { icon: LucideIcon; label: string }[]
  actions: SlideAction[]
}

/**
 * Los tres discursos de la portada. No son diapositivas decorativas: cada una
 * responde a una pregunta distinta —qué es esto, de dónde viene y cuál es la
 * primera acción— y todas llevan a rutas reales del proyecto.
 */
const SLIDES: Slide[] = [
  {
    kicker: 'PLAY & GO · CREATOR OPERATING SYSTEM™',
    title: 'El sistema operativo del creador musical.',
    body: 'Aprende producción musical con inteligencia artificial, crea desde tu navegador y entiende el sonido con herramientas de análisis técnico. Una ruta clara: aprende, crea, analiza y evoluciona.',
    image: '/visuals/aurora-studio.png',
    imageAlt: 'Ondas sonoras y núcleo digital de Play & Go',
    badges: [
      { icon: Sparkles, label: 'Empieza con una idea' },
      { icon: ShieldCheck, label: 'Sin tarjeta para crear cuenta' },
      { icon: Music2, label: `${COURSE_MODULES.length} módulos · ${COURSE_TOTAL_LESSONS} sesiones` },
    ],
    actions: [
      { href: '/onboarding', label: 'Comenzar gratis', primary: true },
      { href: '/presentacion', label: 'Ver demostración' },
    ],
  },
  {
    kicker: 'Orgullosamente Realmontenses',
    title: 'Desde Mineral del Monte para el mundo.',
    body: 'Tecnología latinoamericana con criterio: el conocimiento técnico se posee, no se alquila. Aprende qué decide el motor, qué decides tú y cómo defenderlo con evidencia.',
    image: '/visuals/golden-wave.png',
    imageAlt: 'Onda sonora de oro líquido sobre fondo mineral',
    badges: [
      { icon: Cpu, label: 'DSP y análisis explicables' },
      { icon: ShieldCheck, label: 'Soberanía técnica, sin humo' },
      { icon: TrendingUp, label: 'Rutas éticas, sin ingresos garantizados' },
    ],
    actions: [
      { href: '#manifiesto', label: 'Leer el manifiesto', primary: true },
      { href: '/curso/laboratorio-audio', label: 'Ver el laboratorio técnico' },
    ],
  },
  {
    kicker: 'Hook & Bridge · Instant Composer',
    title: 'Escribe una idea. Escucha una pista. Decide después.',
    body: 'El Instant Composer sintetiza en tu dispositivo, sin cuenta y sin enviar tu idea a un servidor. Al terminar, tres rutas: producir, programar o convertir la habilidad en producto.',
    image: '/visuals/crystal-synth.png',
    imageAlt: 'Sintetizador de cristal futurista con luz cian',
    badges: [
      { icon: Code2, label: 'Web Audio API + Tone.js' },
      { icon: ShieldCheck, label: 'Sin IA remota en esta versión' },
      { icon: Sparkles, label: 'Tres rutas, un reto de 5 minutos' },
    ],
    actions: [
      { href: '/crear', label: 'Probar el Instant Composer', primary: true },
      { href: '#asistente', label: 'Preguntar a la guía' },
    ],
  },
]

const ROTATION_MS = 9_000

function Action({ action }: { action: SlideAction }) {
  const className = `pg-btn ${action.primary ? 'pg-btn-primary' : 'pg-btn-ghost'} pg-btn-sm`
  if (action.href.startsWith('#')) {
    return (
      <a href={action.href} className={className}>
        {action.label}
        {action.primary ? <ArrowDown size={14} aria-hidden /> : <ArrowRight size={14} aria-hidden />}
      </a>
    )
  }
  return (
    <Link href={action.href} className={className}>
      {action.label}
      <ArrowRight size={14} aria-hidden />
    </Link>
  )
}

/**
 * Hero con carrusel.
 *
 * Se pausa al pasar el ratón o al entrar con teclado para que nadie pierda el
 * texto que está leyendo. Con movimiento reducido no hay rotación automática:
 * las flechas siguen funcionando y los controles son botones reales.
 */
export function HeroSlider() {
  const [active, setActive] = useState(0)
  const [paused, setPaused] = useState(false)
  const [playing, setPlaying] = useState(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  const go = useCallback((direction: number) => {
    setActive((current) => (current + direction + SLIDES.length) % SLIDES.length)
  }, [])

  useEffect(() => {
    if (paused) return
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return
    const timer = window.setInterval(() => {
      setActive((current) => (current + 1) % SLIDES.length)
    }, ROTATION_MS)
    return () => window.clearInterval(timer)
  }, [paused])

  function toggleAudio() {
    const element = audioRef.current
    if (!element) return
    if (element.paused) {
      element
        .play()
        .then(() => setPlaying(true))
        .catch(() => setPlaying(false))
    } else {
      element.pause()
      setPlaying(false)
    }
  }

  const slide = SLIDES[active]

  return (
    <section
      className="cinema-hero"
      aria-roledescription="carrusel"
      aria-label="Presentación de Play and Go"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setPaused(false)
      }}
    >
      <div className="cinema-hero-media" aria-hidden="true">
        {SLIDES.map((item, index) => (
          <img
            key={item.image}
            src={item.image}
            alt=""
            loading={index === 0 ? 'eager' : 'lazy'}
            className={`cinema-hero-image${index === active ? ' is-active' : ''}`}
          />
        ))}
      </div>
      <div className="cinema-hero-wash" aria-hidden="true" />
      <div className="cinema-hero-ornament cinema-hero-ornament-cyan" aria-hidden="true" />
      <div className="cinema-hero-ornament cinema-hero-ornament-terracotta" aria-hidden="true" />

      <div className="cinema-hero-inner">
        <div className="cinema-hero-copy" aria-live="polite">
          <p className="cinema-kicker">
            <span className="cinema-kicker-dot" aria-hidden="true" />
            {slide.kicker}
          </p>
          <h1 className="cinema-title">{slide.title}</h1>
          <p className="cinema-lede">{slide.body}</p>

          <ul className="cinema-badges" aria-label="Características de la portada">
            {slide.badges.map((badge) => (
              <li key={badge.label} className="cinema-badge">
                <badge.icon size={14} aria-hidden />
                <span>{badge.label}</span>
              </li>
            ))}
          </ul>

          <div className="cinema-actions">
            {slide.actions.map((action) => (
              <Action key={action.label} action={action} />
            ))}
            <button
              type="button"
              onClick={toggleAudio}
              aria-pressed={playing}
              className="cinema-audio-button"
            >
              {playing ? <Pause size={14} aria-hidden /> : <Play size={14} aria-hidden />}
              <span>{playing ? 'Pausar muestra' : 'Escuchar muestra'}</span>
            </button>
          </div>
        </div>

        <aside className="cinema-hero-aside" aria-label="Reproductor de muestra">
          <p className="cinema-aside-label">Ahora suena</p>
          <p className="cinema-aside-title">Pista de muestra · TAMV</p>
          <div className={`cinema-eq${playing ? ' is-playing' : ''}`} aria-hidden="true">
            {[3, 7, 5, 9, 4, 8, 6, 10, 5, 7].map((height, index) => (
              <span key={index} style={{ height: `${height * 5}px`, animationDelay: `${index * 80}ms` }} />
            ))}
          </div>
          <p className="cinema-aside-note">Render local · sin voces sintéticas</p>
          <a href="/crear" className="cinema-aside-link">
            Crear la mía <ArrowRight size={13} aria-hidden />
          </a>
        </aside>
      </div>

      <div className="cinema-controls">
        <button type="button" onClick={() => go(-1)} aria-label="Diapositiva anterior" className="cinema-control">
          <ChevronLeft size={16} aria-hidden />
        </button>
        <span className="cinema-counter" aria-hidden="true">
          {String(active + 1).padStart(2, '0')} <i>/</i> {String(SLIDES.length).padStart(2, '0')}
        </span>
        <button type="button" onClick={() => go(1)} aria-label="Diapositiva siguiente" className="cinema-control">
          <ChevronRight size={16} aria-hidden />
        </button>
        <div className="cinema-dots" aria-hidden="true">
          {SLIDES.map((item, index) => (
            <span key={item.image} className={index === active ? 'is-active' : undefined} />
          ))}
        </div>
      </div>

      <audio
        ref={audioRef}
        src="/audio/pista2.mp3"
        loop
        preload="none"
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => setPlaying(false)}
      />
    </section>
  )
}
