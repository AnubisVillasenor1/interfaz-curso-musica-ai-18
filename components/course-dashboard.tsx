'use client'

import { useRef, useState } from 'react'
import {
  ArrowRight,
  Award,
  BadgeCheck,
  Check,
  ChevronRight,
  Copy,
  Headphones,
  LockKeyhole,
  Menu,
  MessageCircle,
  Music2,
  Pause,
  Play,
  Send,
  Sparkles,
  Trophy,
  X,
  Zap,
  type LucideIcon,
} from 'lucide-react'

import { Dialog } from '@/components/ui/dialog'
import { Reveal } from '@/components/reveal'
import { TamvQuote } from '@/components/tamv-quote'
import { COURSE_MODULES, COURSE_BADGES, COURSE_TOTAL_LESSONS, lessonsByModule } from '@/lib/course'
import { COURSE_PRODUCT } from '@/lib/products'

/**
 * Marca local.
 *
 * El comentario de la versión anterior prometía archivos locales y el JSX
 * seguía apuntando a `*.public.blob.vercel-storage.com`: un bucket ajeno al
 * proyecto que, si se limpia, deja la portada en blanco y el logotipo fuera.
 * `/brand/logo.svg` y `/brand/hero-studio.svg` están versionados con el código,
 * son vectoriales (nítidos en cualquier pantalla y pesan una fracción) y usan
 * los mismos colores que el resto de la interfaz. El lockup de TAMV vuelve a
 * ser tipografía real, no una JPG con el fondo recortado.
 */
const logoMark = 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/tamvlogo1-4wSYHNlhlHSVNIwFL7gOVmGkBaCeqA.jpg'
const playAndGoLogo = 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/logoplayandgo-EAG8du0GfFdQZUWxVmQQa5plKJDFSr.jpg'
const heroImage = 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/image-ggBlgonDJDNHatg1hRwzx1TFsT0h7C.png'
const heroBanner = 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/image-rwD1QPRMTzXqdzENNOyDxWuHJms4aw.png'
const sampleAudio = '/audio/pista2.mp3'

/**
 * Precio único de verdad: se lee de `lib/products.ts`, que es lo que cobra el
 * checkout. Estaba escrito a mano como "$490 MXN" mientras la pasarela pedía
 * $500, así que la landing anunciaba un precio que ningún pago podía cumplir.
 */
const coursePrice = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(COURSE_PRODUCT.priceInCents / 100)

function minutesLabel(minutes: number): string {
  if (minutes < 60) return `${minutes} min`
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return m ? `${h} h ${String(m).padStart(2, '0')} min` : `${h} h`
}

const totalMinutes = COURSE_MODULES.reduce(
  (sum, module) => sum + lessonsByModule(module.index).reduce((acc, lesson) => acc + lesson.minutes, 0),
  0,
)

const modules = COURSE_MODULES.map((module, index) => {
  const lessons = lessonsByModule(module.index)
  const minutes = lessons.reduce((sum, lesson) => sum + lesson.minutes, 0)
  const state = index === 0 ? 'done' as const : index === 1 ? 'current' as const : 'locked' as const
  return {
    number: String(module.index).padStart(2, '0'),
    title: module.title,
    meta: `${lessons.length} lecciones · ${minutesLabel(minutes)}`,
    state,
  }
})

const editorialVisuals = [
  { src: '/visuals/aurora-studio.png', alt: 'Estudio de ondas sonoras cristalinas' },
  { src: '/visuals/neural-melody.png', alt: 'Melodía convertida en caminos neuronales' },
  { src: '/visuals/crystal-synth.png', alt: 'Sintetizador de cristal futurista' },
  { src: '/visuals/sound-orbit.png', alt: 'Órbita de frecuencias musicales' },
  { src: '/visuals/golden-wave.png', alt: 'Onda sonora de oro líquido' },
  { src: '/visuals/vocal-atmosphere.png', alt: 'Atmósfera vocal inmersiva' },
  { src: '/visuals/mixing-console.png', alt: 'Consola de mezcla holográfica' },
  { src: '/visuals/playlist-night.png', alt: 'Escucha nocturna con prisma de cristal' },
  { src: '/visuals/sonic-architecture.png', alt: 'Arquitectura construida con ondas sonoras' },
  { src: '/visuals/creative-spark.png', alt: 'Chispa creativa de partículas musicales' },
]

const prompts = [
  { name: 'Pop cinematográfico', meta: '96 BPM · voz femenina íntima · piano felt', copy: 'Pop alternativo cinematográfico, 96 BPM, voz femenina íntima y aireada, versos minimalistas con piano felt, pre-coro ascendente, coro amplio con cuerdas y batería orgánica, mezcla cálida y dinámica.' },
  { name: 'Reggaetón nocturno', meta: '92 BPM · voz masculina suave · dembow profundo', copy: 'Reggaetón oscuro y elegante, 92 BPM, voz masculina suave con flow conversado, dembow profundo, synth bass cálido, percusión seca, atmósfera nocturna y hook memorable.' },
  { name: 'Lo-fi para estudiar', meta: '78 BPM · instrumental · Rhodes · swing', copy: 'Lo-fi hip hop instrumental, 78 BPM, acordes de jazz en Rhodes, batería con swing humano, textura de vinilo, bajo redondo, ambiente de cafetería y dinámica relajada.' },
]

const curriculum = COURSE_MODULES.map((module) => {
  const lessons = lessonsByModule(module.index)
  const minutes = lessons.reduce((sum, lesson) => sum + lesson.minutes, 0)
  return {
    module: `Módulo ${String(module.index).padStart(2, '0')}`,
    title: module.title,
    duration: minutesLabel(minutes),
    objective: module.summary,
    lessons: lessons.map((lesson) => `Sesión ${String(lesson.lessonNumber).padStart(2, '0')} · ${lesson.title}`),
    deliverable: module.outcome,
  }
})

/** Cifras antes que adjetivos: el visitante entiende el tamaño del curso de un vistazo. */
const metrics = [
  { value: String(COURSE_MODULES.length), label: 'módulos' },
  { value: String(COURSE_TOTAL_LESSONS), label: 'sesiones prácticas' },
  { value: minutesLabel(totalMinutes), label: 'de material' },
  { value: '2', label: 'canciones en tu portafolio' },
]

const BADGE_ICONS: LucideIcon[] = [Zap, Award, Trophy, Music2]
const badges = COURSE_BADGES.map((badge, index) => ({
  label: badge.name,
  requirement: badge.requirement,
  icon: BADGE_ICONS[index % BADGE_ICONS.length],
  tone: (['mint', 'violet', 'amber', 'mint'] as const)[index % 4],
}))

type ChatMessage = { from: 'user' | 'bot'; text: string; source: 'user' | 'model' | 'guide' }

/**
 * Qué dice la burbuja de su propio origen.
 *
 * El guía muchas veces respondía con contenido del curso sin que ningún modelo
 * estuviera implicado. `source` ya llegaba del servidor; lo que faltaba era
 * mostrarlo. Etiqueta corta para no competir con la respuesta.
 */
const PROVENANCE: Record<ChatMessage['source'], string> = {
  user: 'Tú',
  model: 'Respuesta de modelo',
  guide: 'Contenido del curso',
}

export function CourseDashboard() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [template, setTemplate] = useState<{ name: string; copy: string } | null>(null)
  const [copied, setCopied] = useState(false)
  const [showRegister, setShowRegister] = useState(false)
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState('')
  // El mismo `status` sirve para un aviso recuperable (el portapapeles bloqueado,
  // «preparando tu acceso») y para un fallo real (el error que devolvió /api/checkout).
  // El color no puede ser uno solo: el tono lo decide quien escribe el mensaje, no el
  // JSX, y viene del sistema (`--pg-amber` / `--pg-magenta`), no de un style en línea.
  const [statusTone, setStatusTone] = useState<'pending' | 'error'>('pending')
  const [playing, setPlaying] = useState(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [chatOpen, setChatOpen] = useState(false)
  const [chatInput, setChatInput] = useState('')
  const [chatBusy, setChatBusy] = useState(false)
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    { from: 'bot', text: 'Hola, soy el guía de Play and Go. Pregúntame por el curso, el precio, los pagos, tu idea musical o tus letras.', source: 'guide' },
  ])

  /**
   * Pregunta al guía del curso.
   *
   * `askCourseBot` era una cadena de `if` con palabras clave que se llamaba a
   * sí misma "asistente de IA" y nunca llamaba a un modelo. Ahora la respuesta
   * viene de `/api/agent`, que usa el proveedor configurado y, si falta o
   * falla, contesta con el contenido real del curso. La procedencia viaja en
   * `source` y la burbuja la imprime, en lugar de fingir IA.
   */
  async function sendChat(event: React.FormEvent) {
    event.preventDefault()
    const text = chatInput.trim()
    if (!text || chatBusy) return

    setChatBusy(true)
    setChatMessages((messages) => [...messages, { from: 'user', text, source: 'user' }])
    setChatInput('')

    const history = chatMessages.slice(-6).map((message) => ({
      role: message.from === 'user' ? 'user' : 'assistant',
      content: message.text,
    }))

    try {
      const response = await fetch('/api/agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, history }),
      })
      const data: { answer?: string; source?: string } | null = await response.json().catch(() => null)
      const answer = data?.answer ?? 'No pude responder ahora. Prueba otra vez en un minuto.'
      setChatMessages((messages) => [...messages, { from: 'bot', text: answer, source: data?.source === 'llm' ? 'model' : 'guide' }])
    } catch {
      setChatMessages((messages) => [...messages, { from: 'bot', text: 'Se cortó la conexión con el guía. Vuelve a preguntar.', source: 'guide' }])
    } finally {
      setChatBusy(false)
    }
  }

  /**
   * La muestra del hero antes solo movía una animación: el botón prometía audio
   * y no sonaba nada. Ahora reproduce la pista real del intro cinemático y el
   * ecualizador sigue el estado del elemento, no una promesa.
   */
  function toggleSample() {
    const el = audioRef.current
    if (!el) {
      setPlaying((value) => !value)
      return
    }
    if (el.paused) {
      el.play()
        .then(() => setPlaying(true))
        .catch(() => setPlaying(false))
    } else {
      el.pause()
      setPlaying(false)
    }
  }

  /**
   * Copiar y personalizar: el botón existía y no copiaba nada, sólo cerraba el
   * diálogo. Ahora escribe al portapapeles y lo confirma; si el navegador exige
   * un contexto seguro o un permiso y falla, el texto sigue seleccionable.
   */
  async function copyTemplate() {
    if (!template) return
    try {
      await navigator.clipboard.writeText(template.copy)
      setCopied(true)
      setStatus('')
      window.setTimeout(() => setCopied(false), 2400)
    } catch {
      setCopied(false)
      setStatusTone('pending')
      setStatus('Tu navegador no permitió copiar automáticamente: selecciona el texto y usa Ctrl+C.')
    }
  }

  async function startCheckout(event: React.FormEvent) {
    event.preventDefault()
    setStatus('Preparando tu acceso...')
    setStatusTone('pending')
    const response = await fetch('/api/checkout', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ productId: COURSE_PRODUCT.id }) })
    const data: { url?: string; error?: string } = await response.json()
    if (data.url) window.location.href = data.url
    else {
      setStatusTone('error')
      setStatus(data.error ?? 'Revisa tus datos e intenta de nuevo.')
    }
  }

  const navLinks = [
    ['Academia', '/curso'],
    ['Estudio', '/studio'],
    ['Biblioteca', '/biblioteca'],
    ['Comunidad', '/comunidad'],
    ['Membresías', '/precios'],
    ['Información', '/informacion'],
  ] as const

  return <main className="pg-shell relative min-h-screen overflow-x-clip" style={{ background: 'var(--pg-bg)' }}>
    <div aria-hidden="true" className="pg-glow" />

    <header className="sticky top-0 z-30 backdrop-blur-xl" style={{ borderBottom: '1px solid var(--pg-hairline)', background: 'color-mix(in srgb, var(--pg-bg) 78%, transparent)' }}>
      <div className="pg-container flex items-center justify-between py-4">
        <a href="/" className="flex items-center gap-3">
          <img src={logoMark} alt="" width={40} height={40} className="size-10 rounded-xl" />
          <span className="block">
            <span className="block text-sm font-semibold tracking-[0.14em]">PLAY <span style={{ color: 'var(--pg-cyan)' }}>AND GO</span></span>
            <span className="pg-eyebrow" style={{ letterSpacing: '.24em' }}>por TAMV ONLINE NETWORK</span>
          </span>
        </a>
        <nav aria-label="Navegación principal" className="hidden items-center gap-6 md:flex">
          {navLinks.map(([label, href]) => <a key={href} className="pg-navlink" href={href}>{label}</a>)}
          <a href="/studio" className="pg-btn pg-btn-primary" style={{ padding: '0.6rem 1.2rem' }}>Entrar al estudio</a>
        </nav>
        <button
          type="button"
          className="md:hidden"
          aria-label={menuOpen ? 'Cerrar menú' : 'Abrir menú'}
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((value) => !value)}
        >
          {menuOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>
      {menuOpen && (
        <nav aria-label="Navegación móvil" className="pg-container md:hidden" style={{ paddingBottom: '1.25rem' }}>
          <span className="pg-rule mb-4 block" />
          <ul className="flex flex-col gap-3">
            {navLinks.map(([label, href]) => <li key={href}><a className="pg-navlink" href={href}>{label}</a></li>)}
            <li><a className="pg-navlink" href="/ajustes">Ajustes</a></li>
          </ul>
          <button type="button" className="pg-btn pg-btn-primary mt-5 w-full" onClick={() => { setMenuOpen(false); setShowRegister(true) }}>Inscribirme</button>
        </nav>
      )}
    </header>

    {/* ---------------------------------------------------------- HERO */}
    <section className="pg-section">
      <div className="pg-container grid items-center gap-12 lg:grid-cols-[1.05fr_.95fr]">
        <div>
          <span className="pg-chip"><Sparkles size={12} /> Música aumentada por IA · Academia + Estudio + Portafolio</span>
          <h1 className="pg-title pg-title-display" style={{ marginTop: '1.25rem' }}>
            Tu próxima idea merece{' '}
            <span
              className="bg-clip-text text-transparent"
              style={{ backgroundImage: 'linear-gradient(96deg, var(--color-champagne), var(--color-circuit) 52%, var(--color-ice))' }}
            >
              convertirse en música.
            </span>
          </h1>
          <p className="pg-lede" style={{ maxWidth: '52ch' }}>
            Aprende, compón y desarrolla tu sonido con herramientas de inteligencia artificial y decisiones propias. De la primera idea a una obra propia: crear con inteligencia artificial, decidir con criterio humano.
          </p>
          <div className="mt-9 flex flex-wrap items-center gap-3">
            <button type="button" className="pg-btn pg-btn-primary" onClick={() => setShowRegister(true)}>
              Comenzar la ruta <ArrowRight size={15} />
            </button>
            <a href="/studio" className="pg-btn pg-btn-ghost">Crear mi primera canción <Music2 size={15} /></a>
            <a href="#ruta" className="pg-navlink" style={{ color: 'var(--pg-text)' }}>Explorar el programa</a>
          </div>
          <div className="mt-10 flex flex-wrap items-center gap-6" style={{ fontSize: 'var(--pg-step--1)', color: 'var(--pg-muted)' }}>
            <span className="flex items-center gap-2"><BadgeCheck size={15} style={{ color: 'var(--pg-cyan)' }} /> Constancia por participación (emitida por TAMV)</span>
            <span className="flex items-center gap-2"><Headphones size={15} style={{ color: 'var(--pg-violet)' }} /> Audio + guías</span>
            <span className="flex items-center gap-2 font-mono">{coursePrice} · pago único</span>
          </div>
        </div>

        <Reveal>
          <div className="pg-frame pg-hero-frame">
            <div className="pg-brand-lockup absolute left-5 top-5 z-10 flex items-center gap-3 rounded-2xl px-3 py-2 backdrop-blur-xl">
              <img src={playAndGoLogo} alt="Play and Go by TAMV ONLINE" width={44} height={44} className="size-11 rounded-xl object-cover" />
              <span className="hidden text-[10px] font-semibold uppercase tracking-[0.18em] text-white sm:block">Play and Go<br /><span className="font-normal text-cyan-100/80">by TAMV Online Network</span></span>
            </div>
            <img
              src={heroImage}
              alt="Play and Go by TAMV Online Network: creación musical con inteligencia artificial"
              width={1024}
              height={576}
              className="aspect-[16/9] w-full object-cover"
            />
            <div className="pg-banner-frame relative mt-5 overflow-hidden rounded-2xl">
              <img src={heroBanner} alt="Banner musical de Play and Go con ondas, notas y circuitos" width={1024} height={320} className="block h-auto max-h-40 w-full object-cover object-center" />
            </div>
            <audio ref={audioRef} src={sampleAudio} loop preload="none" onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} onEnded={() => setPlaying(false)} />
            <div
              className="absolute inset-x-5 bottom-5 flex items-center justify-between gap-4 rounded-2xl p-4 backdrop-blur-xl"
              style={{ border: '1px solid var(--pg-hairline)', background: 'var(--pg-veil)' }}
            >
              <span className="block">
                <span className="pg-eyebrow" style={{ letterSpacing: '.22em' }}>Ahora suena</span>
                <span className="mt-1 block text-sm font-medium">Diseña tu primer universo sonoro</span>
              </span>
              <button
                type="button"
                aria-label={playing ? 'Pausar muestra' : 'Reproducir muestra'}
                aria-pressed={playing}
                onClick={toggleSample}
                className="flex size-10 shrink-0 items-center justify-center rounded-full"
                style={{ background: 'var(--pg-cyan)', color: 'var(--pg-bg)' }}
              >
                {playing ? <Pause size={15} fill="currentColor" /> : <Play size={15} fill="currentColor" />}
              </button>
            </div>
            <div
              className="absolute right-5 -bottom-5 flex h-16 items-end gap-1 rounded-xl p-3"
              style={{ border: '1px solid var(--pg-hairline)', background: 'var(--pg-plinth)', boxShadow: '0 0 28px color-mix(in srgb, var(--pg-cyan) 16%, transparent)' }}
              aria-hidden="true"
            >
              {[3, 7, 5, 9, 4, 8, 6, 10, 5, 7].map((height, index) => (
                <span
                  key={index}
                  className={`equalizer-bar w-1 rounded-full ${playing ? 'equalizer-bar-active' : ''}`}
                  style={{
                    height: `${height * 4}px`,
                    animationDelay: `${index * 80}ms`,
                    backgroundImage: 'linear-gradient(to top, var(--pg-violet), var(--pg-cyan), var(--pg-amber))',
                  }}
                />
              ))}
            </div>
          </div>
        </Reveal>
      </div>

      <div className="pg-container mt-16">
        <TamvQuote variant="hero" />
      </div>

      <div className="pg-container mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {metrics.map((metric, index) => (
          <Reveal key={metric.label} delay={index * 70}>
            <div className="pg-metric">
              <b>{metric.value}</b>
              <span>{metric.label}</span>
            </div>
          </Reveal>
        ))}
      </div>
    </section>

    {/* ------------------------------------------------------ VISUALES */}
    <section id="visuales" className="pg-section pg-color-burst">
      <div className="pg-container">
        <div className="flex flex-wrap items-end justify-between gap-5">
          <div className="max-w-2xl"><p className="pg-eyebrow" style={{ color: 'var(--pg-cyan)' }}>Música · imagen · imaginación</p><h2 className="pg-title">Una interfaz que también se escucha con los ojos.</h2><p className="pg-lede">Cada módulo tiene una atmósfera: luz, frecuencia y materia visual para que la creación se sienta viva.</p></div>
          <span className="pg-chip" data-tone="violet">10 atmósferas originales</span>
        </div>
        <div className="visual-mosaic mt-10">
          {editorialVisuals.slice(3).map((visual, index) => <Reveal key={visual.src} delay={index * 55}><figure className={`visual-tile visual-tile-${index % 4}`}><img src={visual.src} alt={visual.alt} loading="lazy" /><figcaption><span>Frecuencia {String(index + 4).padStart(2, '0')}</span><b>{['Órbita', 'Oro líquido', 'Voz', 'Mezcla', 'Escucha', 'Arquitectura', 'Chispa'][index]}</b></figcaption></figure></Reveal>)}
        </div>
      </div>
    </section>

    {/* ---------------------------------------------------------- RUTA */}
    <section id="ruta" className="pg-section">
      <div className="pg-container">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="pg-eyebrow">Tu recorrido</p>
            <h2 className="pg-title">De la primera idea al release</h2>
          </div>
          <span className="pg-chip" data-tone="mint">{COURSE_MODULES.length} módulos · {COURSE_TOTAL_LESSONS} sesiones</span>
        </div>
        <div className="mt-9 grid gap-3">
          {modules.map((item, index) => (
            <Reveal key={item.number} delay={index * 60}>
              <a
                href={item.state === 'locked' ? '/precios' : '/curso'}
                className="pg-card pg-card-hover flex items-center gap-4 p-4"
                style={item.state === 'current' ? { borderColor: 'color-mix(in srgb, var(--pg-cyan) 45%, transparent)' } : undefined}
              >
                <span
                  className="pg-mark"
                  data-state={item.state === 'done' ? 'done' : item.state === 'current' ? 'part' : undefined}
                >
                  {item.state === 'done' ? <Check size={18} /> : item.state === 'locked' ? <LockKeyhole size={17} /> : item.number}
                </span>
                <span className="min-w-0 flex-1">
                  <strong className="block text-sm font-medium">{item.title}</strong>
                  <small className="mt-1 block" style={{ fontSize: 'var(--pg-step--1)', color: 'var(--pg-muted)' }}>{item.meta}</small>
                </span>
                {item.state === 'current' && <span className="pg-chip hidden sm:inline-flex">Siguiente</span>}
                <ChevronRight size={18} className="shrink-0" style={{ color: 'var(--pg-muted)' }} />
              </a>
            </Reveal>
          ))}
        </div>
      </div>
    </section>

    {/* ------------------------------------------------------ PROGRAMA */}
    <section id="sesiones" className="pg-section">
      <div className="pg-container">
        <div className="max-w-2xl">
          <p className="pg-eyebrow">Programa completo · 5 módulos</p>
          <h2 className="pg-title">Cada sesión termina en una práctica.</h2>
          <p className="pg-lede">
            Lecciones breves, ejemplos guiados y ejercicios con entregables para pasar de explorar herramientas a
            tomar decisiones de productor.
          </p>
        </div>
        <div className="mt-10 grid gap-4 lg:grid-cols-2">
          {curriculum.map((item, index) => (
            <Reveal key={item.module} delay={(index % 2) * 90}>
              <details className="pg-card group h-full p-5">
                <summary className="flex cursor-pointer list-none items-start gap-4">
                  <span className="pg-mark">
                    0{index + 1}
                  </span>
                  <span className="flex-1">
                    <span className="pg-eyebrow" style={{ color: 'var(--pg-magenta)', letterSpacing: '.2em' }}>
                      {item.module} · {item.duration}
                    </span>
                    <strong className="mt-1.5 block" style={{ fontSize: 'var(--pg-step-1)', fontWeight: 600 }}>{item.title}</strong>
                    <span className="mt-2 block leading-5" style={{ fontSize: 'var(--pg-step--1)', color: 'var(--pg-muted)' }}>{item.objective}</span>
                  </span>
                  <ChevronRight size={18} className="mt-1 shrink-0 transition group-open:rotate-90" style={{ color: 'var(--pg-cyan)' }} />
                </summary>
                <ol className="mt-5 flex flex-col gap-3 border-l pl-5" style={{ borderColor: 'var(--pg-hairline)' }}>
                  {item.lessons.map((lesson, lessonIndex) => (
                    <li key={lesson} className="leading-6" style={{ fontSize: 'var(--pg-step--1)', color: 'var(--pg-text)' }}>
                      <span className="mr-2 font-mono" style={{ color: 'var(--pg-cyan)' }}>{String(lessonIndex + 1).padStart(2, '0')}</span>
                      {lesson}
                    </li>
                  ))}
                </ol>
                <div className="pg-callout mt-5">
                  <strong>Entregable · </strong>{item.deliverable}
                </div>
              </details>
            </Reveal>
          ))}
        </div>
      </div>
    </section>

    {/* ------------------------------------------------------- PROMPTS */}
    <section id="prompts" className="pg-section">
      <div className="pg-container">
        <div className="max-w-2xl">
          <p className="pg-eyebrow" style={{ color: 'var(--pg-magenta)' }}>Laboratorio creativo</p>
          <h2 className="pg-title">Prompts que sí producen resultados</h2>
          <p className="pg-lede">
            Plantillas con dirección de voz, BPM, instrumentación, dinámica y mezcla. Ábrelas en el estudio local y
            modifícalas una variable a la vez.
          </p>
        </div>
        <div className="mt-10 grid gap-4 lg:grid-cols-3">
          {prompts.map((item, index) => (
            <Reveal key={item.name} delay={index * 80}>
              <button
                type="button"
                onClick={() => { setTemplate({ name: item.name, copy: item.copy }); setCopied(false); setStatus('') }}
                className="pg-card pg-card-hover relative h-full overflow-hidden p-5 text-left"
              >
                <img src={editorialVisuals[index + 1].src} alt="" aria-hidden="true" loading="lazy" className="prompt-visual absolute inset-0 h-full w-full object-cover" />
                <span className="relative z-10 flex items-center justify-between">
                  <span className="pg-chip" data-tone="violet">Plantilla</span>
                  <Music2 size={18} style={{ color: 'var(--pg-cyan)' }} />
                </span>
                <strong className="relative z-10 mt-7 block" style={{ fontSize: 'var(--pg-step-1)', fontWeight: 600, color: 'var(--pg-ink)' }}>{item.name}</strong>
                <span className="relative z-10 mt-2 block font-mono" style={{ fontSize: 'var(--pg-step--1)', color: 'var(--pg-cyan)' }}>{item.meta}</span>
                <span className="relative z-10 mt-4 line-clamp-2 block leading-5" style={{ fontSize: 'var(--pg-step--1)', color: 'var(--pg-muted)' }}>{item.copy}</span>
                <span className="relative z-10 mt-6 flex items-center gap-2" style={{ fontSize: 'var(--pg-step--1)', color: 'var(--pg-magenta)' }}>
                  Abrir plantilla <ArrowRight size={13} />
                </span>
              </button>
            </Reveal>
          ))}
        </div>
      </div>
    </section>

    {/* ------------------------------------------------------- ESTUDIO */}
    <section id="estudio" className="pg-section">
      <div className="pg-container">
        <Reveal>
          <div className="pg-card p-6 sm:p-10" style={{ borderColor: 'color-mix(in srgb, var(--pg-cyan) 30%, transparent)' }}>
            <div className="flex flex-wrap items-start justify-between gap-6">
              <div className="max-w-xl">
                <p className="pg-eyebrow">Estudio Play and Go</p>
                <h2 className="pg-title">Pon a prueba lo aprendido</h2>
                <p className="pg-lede">
                  El motor local compone y renderiza en tu navegador sin costo: tu dirección de voz, tempo, género e
                  instrumentación se convierte en audio descargable. Con inscripción activa se añaden voces y mezcla
                  completa.
                </p>
              </div>
              <div className="pg-metric items-center px-5 py-4 text-center" style={{ border: '1px solid color-mix(in srgb, var(--pg-amber) 24%, transparent)', background: 'color-mix(in srgb, var(--pg-amber) 7%, transparent)' }}>
                <b>2 / día</b>
                <span>Inscripción Pro</span>
              </div>
            </div>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <a href="/studio" className="pg-btn pg-btn-primary">Abrir el compositor <Music2 size={15} /></a>
              <a href="/biblioteca" className="pg-btn pg-btn-ghost">Ver mi biblioteca</a>
            </div>
          </div>
        </Reveal>
      </div>
    </section>

    {/* -------------------------------------------------------- LOGROS */}
    <section id="logros" className="pg-section">
      <div className="pg-container">
        <div className="grid gap-10 lg:grid-cols-[.85fr_1.15fr] lg:items-center">
          <div>
            <p className="pg-eyebrow" data-tone="amber">Progreso visible</p>
            <h2 className="pg-title">Cada práctica desbloquea una frecuencia nueva.</h2>
            <p className="pg-lede">
              Colecciona insignias, construye tu portafolio y demuestra que puedes dirigir una producción completa.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            {badges.map((badge, index) => (
              <Reveal key={badge.label} delay={index * 90}>
                <div className="pg-card h-full p-5 text-center">
                  <span
                    className="mx-auto flex size-12 items-center justify-center rounded-2xl"
                    style={{ background: 'color-mix(in srgb, var(--pg-amber) 13%, transparent)', color: 'var(--pg-amber)' }}
                  >
                    <badge.icon size={20} />
                  </span>
                  <p className="mt-4" style={{ fontSize: 'var(--pg-step-0)', fontWeight: 500, color: 'var(--pg-ink)' }}>{badge.label}</p>
                  <p className="mt-2"><span className="pg-chip" data-tone={badge.tone}>{badge.requirement}</span></p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </div>
    </section>

    <footer className="pg-section" style={{ paddingTop: '3.5rem' }}>
      <div className="pg-container">
        <TamvQuote variant="footer" />
        <span className="pg-rule mb-8 mt-10 block" />
        <div className="flex flex-wrap items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <img src={logoMark} alt="TAMV ONLINE Network" width={44} height={44} className="size-11 rounded-xl object-cover ring-1 ring-[#d8c99d]/40" />
            <span className="block">
              <strong className="pg-item-title block tracking-[0.18em]">TAMV ONLINE</strong>
              <span className="pg-eyebrow" style={{ letterSpacing: '.2em' }}>Tecnología · música · futuro</span>
            </span>
          </div>
          <p style={{ fontSize: 'var(--pg-step--1)', color: 'var(--pg-muted)' }}>
            Play and Go by TAMV ONLINE · Orgullosamente Realmontenses
          </p>
        </div>
      </div>
    </footer>

    {/* ------------------------------------------------------ ASISTENTE */}
    <button
      type="button"
      aria-label={chatOpen ? 'Cerrar asistente del curso' : 'Abrir asistente del curso'}
      aria-expanded={chatOpen}
      onClick={() => setChatOpen((value) => !value)}
      className="assistant-orb fixed bottom-5 right-5 z-40 flex items-center gap-2 rounded-full px-4 py-3 shadow-2xl backdrop-blur-xl transition hover:scale-[1.04]"
      style={{ border: '1px solid color-mix(in srgb, var(--pg-cyan) 55%, transparent)', background: 'var(--pg-orb)', color: 'var(--pg-cyan)' }}
    >
      <span className="hidden font-mono uppercase tracking-[.16em] sm:inline" style={{ fontSize: 'var(--pg-step--2)' }}>Pregúntale a la guía</span>
      <MessageCircle size={18} />
    </button>

    {chatOpen && (
      <aside
        aria-label="Asistente del curso"
        className="pg-shell fixed bottom-24 right-5 z-40 flex w-[min(92vw,380px)] flex-col overflow-hidden rounded-3xl shadow-2xl backdrop-blur-xl"
        style={{ border: '1px solid color-mix(in srgb, var(--pg-cyan) 32%, transparent)', background: 'var(--pg-console)' }}
      >
        <div className="flex items-center justify-between gap-4 p-4" style={{ borderBottom: '1px solid var(--pg-hairline)' }}>
          <div>
            <p className="pg-eyebrow">Guía Play and Go</p>
            <h2 className="mt-1 text-sm font-semibold">Asistente del curso</h2>
          </div>
          <button type="button" aria-label="Cerrar asistente" onClick={() => setChatOpen(false)} style={{ color: 'var(--pg-muted)' }}>
            <X size={18} />
          </button>
        </div>
        <div className="flex max-h-80 flex-col gap-3 overflow-y-auto p-4">
          {chatMessages.map((message, index) => (
            <div key={index} className="pg-bubble" data-from={message.from}>
              {message.text}
              <span className="pg-provenance">{PROVENANCE[message.source]}</span>
            </div>
          ))}
          {chatBusy && <p className="pg-provenance" style={{ margin: 0 }}>Consultando…</p>}
        </div>
        <form onSubmit={sendChat} className="flex items-center gap-2 p-3" style={{ borderTop: '1px solid var(--pg-hairline)' }}>
          <label className="sr-only" htmlFor="pg-chat-input">Pregunta al asistente</label>
          <input
            id="pg-chat-input"
            autoFocus
            value={chatInput}
            onChange={(event) => setChatInput(event.target.value)}
            placeholder="¿Qué quieres saber?"
            className="pg-field flex-1"
            style={{ fontSize: 'var(--pg-step--1)' }}
          />
          <button
            type="submit"
            aria-label="Enviar pregunta"
            disabled={chatBusy}
            className="flex size-10 shrink-0 items-center justify-center rounded-xl disabled:opacity-60"
            style={{ background: 'var(--pg-cyan)', color: 'var(--pg-bg)' }}
          >
            <Send size={16} />
          </button>
        </form>
      </aside>
    )}

    {/* --------------------------------------------------------- MODALES */}
    <Dialog
      open={Boolean(template)}
      onClose={() => setTemplate(null)}
      eyebrow="Prompt listo para adaptar"
      title={template?.name ?? 'Plantilla'}
      className="max-w-lg"
    >
      <p className="pg-code">
        {template?.copy}
      </p>
      <p className="mt-3" style={{ fontSize: 'var(--pg-step--1)', color: 'var(--pg-muted)' }}>
        Cinco decisiones: género, emoción, instrumentación, tempo y estructura. Cambia una sola por iteración para
        poder comparar.
      </p>
      <p role="status" aria-live="polite" className="pg-note mt-3 empty:hidden" data-tone={statusTone}>
        {status}
      </p>
      <div className="mt-5 flex flex-wrap gap-3">
        <button type="button" className="pg-btn pg-btn-ghost" onClick={copyTemplate}>
          {copied ? <><Check size={15} /> Copiado</> : <><Copy size={15} /> Copiar prompt</>}
        </button>
        <a className="pg-btn pg-btn-primary" href={`/studio?prompt=${encodeURIComponent(template?.copy ?? '')}`}>
          Abrir en el estudio <ArrowRight size={15} />
        </a>
      </div>
    </Dialog>

    <Dialog open={showRegister} onClose={() => setShowRegister(false)} eyebrow="Inscripción segura" title="Activa tu acceso Pro" className="max-w-md">
      <div className="pg-card p-4">
        <div className="flex items-baseline justify-between gap-4">
          <span style={{ fontSize: 'var(--pg-step-0)' }}>Curso completo</span>
          <strong style={{ fontSize: 'var(--pg-step-2)', letterSpacing: '-0.03em' }}>{coursePrice}</strong>
        </div>
        <p className="mt-2" style={{ fontSize: 'var(--pg-step--1)', color: 'var(--pg-muted)' }}>
          Acceso a lecciones, prompts, ejercicios, audio, video e insignias.
        </p>
      </div>
      <form onSubmit={startCheckout} className="mt-5 flex flex-col gap-3">
        <label htmlFor="pg-email" style={{ fontSize: 'var(--pg-step--1)', color: 'var(--pg-text)' }}>
          Tu correo electrónico
        </label>
        <input
          id="pg-email"
          type="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="tu@correo.com"
          className="pg-field"
        />
        <button type="submit" className="pg-btn pg-btn-primary w-full">
          Continuar al pago <ArrowRight size={15} />
        </button>
        {/* Región viva montada siempre: `aria-live` solo anuncia lo que cambia
            DENTRO de la región, así que un <p> que nace junto con el mensaje se
            queda mudo para un lector de pantalla. Sin estado, `empty:hidden` le
            quita el hueco del flex. */}
        <p role="status" aria-live="polite" className="pg-note text-center empty:hidden" data-tone={statusTone}>
          {status}
        </p>
      </form>
      <p className="mt-4 text-center" style={{ fontSize: 'var(--pg-step--2)', color: 'var(--pg-muted)' }}>
        Pago procesado de forma segura por Stripe.
      </p>
    </Dialog>
  </main>
}
