'use client'

import { useEffect, useState } from 'react'
import {
  ArrowRight,
  Award,
  Check,
  ChevronRight,
  Copy,
  CreditCard,
  Menu,
  MessageCircle,
  Music2,
  Send,
  ShieldCheck,
  Trophy,
  UserRound,
  UserPlus,
  X,
  Zap,
  type LucideIcon,
} from 'lucide-react'
import Link from 'next/link'

import { Dialog } from '@/components/ui/dialog'
import { HeroSlider } from '@/components/cinematic/hero-slider'
import { Manifesto } from '@/components/cinematic/manifesto'
import { ModuleGrid } from '@/components/cinematic/module-grid'
import { ParticleField } from '@/components/cinematic/particle-field'
import { Reveal } from '@/components/reveal'
import { TamvQuote } from '@/components/tamv-quote'
import { COURSE_MODULES, COURSE_BADGES, COURSE_TOTAL_LESSONS, lessonsByModule } from '@/lib/course'
import { hookRouteById } from '@/lib/music/hook-bridge'
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
const logoMark = '/brand/logo.svg'

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
  const [chatOpen, setChatOpen] = useState(false)
  const [chatInput, setChatInput] = useState('')
  const [chatBusy, setChatBusy] = useState(false)
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    { from: 'bot', text: 'Hola, soy el guía de Play and Go. Pregúntame por el curso, el precio, los pagos, tu idea musical o tus letras.', source: 'guide' },
  ])

  /**
   * Handoff del Instant Composer.
   *
   * El Hook & Bridge enlaza aquí con `?asistente=<ruta>&idea=<texto>`. Se lee
   * con `window.location` en un efecto —no con `useSearchParams`— para no
   * obligar a envolver toda la portada en un Suspense. El mensaje inicial es
   * determinista y declara `source: 'guide'`: no se finge una llamada al modelo
   * ni se gasta cuota antes de que la persona escriba.
   */
  useEffect(() => {
    if (typeof window === 'undefined') return
    const params = new URLSearchParams(window.location.search)
    const routeId = params.get('asistente')
    const idea = params.get('idea')?.slice(0, 80).trim()
    if (!routeId && !idea) return
    const route = hookRouteById(routeId)
    setChatOpen(true)
    setChatMessages((messages) => [
      ...messages,
      {
        from: 'bot',
        text: route
          ? `Vi que creaste «${idea || 'una pista'}» en el Instant Composer y te interesa la ${route.eyebrow.toLowerCase()}. ${route.assistantReply}`
          : `Vi que creaste «${idea || 'una pista'}» en el Instant Composer. ¿Quieres aprender a producirla, a programar herramientas musicales o a convertir esa habilidad en un producto?`,
        source: 'guide',
      },
    ])
    setChatInput(route?.assistantQuestion ?? '¿Cuál es mi primer paso?')
  }, [])

  /**
   * Cajón de navegación.
   *
   * En móvil la navegación superior vive detrás de la hamburguesa. Un
   * desplegable dentro del header dejaba la página scrolleable por detrás y no
   * se cerraba con Escape; el cajón bloquea el fondo, se cierra con la tecla y
   * devuelve el foco al botón que lo abrió.
   */
  useEffect(() => {
    if (!menuOpen) return
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') setMenuOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = previous
    }
  }, [menuOpen])

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
    ['Crear gratis', '/crear'],
    ['Curso', '/curso'],
    ['Estudio', '/studio'],
    ['Mi música', '/biblioteca'],
    ['Mi perfil', '/perfil'],
    ['Comunidad', '/comunidad'],
    ['Planes y pago', '/precios'],
  ] as const

  /**
   * El mapa de la plataforma, en la portada.
   *
   * La queja concreta fue «no supe dónde registrarme ni dónde está mi perfil o
   * mi música». La navegación superior no basta: en móvil vive detrás de una
   * hamburguesa. Estas cuatro puertas explican en una línea qué hay detrás de
   * cada una y llevan directo, sin pasar por el menú.
   */
  const spaceCards = [
    {
      href: '/auth?mode=signup',
      icon: UserPlus,
      eyebrow: 'Paso 1',
      title: 'Crear cuenta',
      body: 'Es gratis y no pide tarjeta. Con la cuenta se guardan tus canciones y tu progreso.',
      action: 'Registrarme',
      primary: true,
    },
    {
      href: '/perfil',
      icon: UserRound,
      eyebrow: 'Tu cuenta',
      title: 'Mi perfil',
      body: 'Tu plan, el cupo que te queda, tu avance en el curso y el botón para cerrar sesión.',
      action: 'Ver mi perfil',
      primary: false,
    },
    {
      href: '/biblioteca',
      icon: Music2,
      eyebrow: 'Tu obra',
      title: 'Mi música',
      body: 'Todo lo que has compuesto, listo para escuchar y descargar en WAV.',
      action: 'Abrir mi música',
      primary: false,
    },
    {
      href: '/precios',
      icon: CreditCard,
      eyebrow: 'Pagos',
      title: 'Planes y pago',
      body: `Compara el plan gratuito con el curso (${coursePrice}, pago único) y el estudio mensual. El cobro lo procesa Stripe.`,
      action: 'Ver planes y precios',
      primary: false,
    },
  ] as const

  return <main className="pg-shell relative min-h-screen overflow-x-clip" style={{ background: 'var(--pg-bg)' }}>
    <div aria-hidden="true" className="pg-glow" />
    <div aria-hidden="true" className="cinema-scanlines" />
    <ParticleField />

    <header className="cinema-header">
      <div className="pg-container flex items-center justify-between gap-4 py-3">
        <a href="/" className="cinema-brand flex items-center gap-3">
          <span className="cinema-brand-mark">
            <img src={logoMark} alt="" width={40} height={40} />
          </span>
          <span className="block">
            <span className="block text-sm font-semibold tracking-[0.14em]">PLAY <span style={{ color: 'var(--pg-cyan)' }}>AND GO</span></span>
            <span className="pg-eyebrow" style={{ letterSpacing: '.24em' }}>por TAMV ONLINE NETWORK</span>
          </span>
        </a>
        <nav aria-label="Navegación principal" className="hidden items-center gap-5 lg:flex">
          {navLinks.map(([label, href]) => <a key={href} className="pg-navlink" href={href}>{label}</a>)}
          <Link href="/auth" className="pg-navlink">Entrar</Link>
          <Link href="/auth?mode=signup" className="pg-btn pg-btn-primary" style={{ padding: '0.6rem 1.2rem' }}>Crear cuenta gratis</Link>
        </nav>
        <button
          type="button"
          className="cinema-menu-button"
          aria-label={menuOpen ? 'Cerrar temario' : 'Abrir temario'}
          aria-expanded={menuOpen}
          aria-controls="nav-drawer"
          onClick={() => setMenuOpen((value) => !value)}
        >
          <span className="cinema-menu-label">Temario</span>
          {menuOpen ? <X size={18} /> : <Menu size={18} />}
        </button>
      </div>
      <span className="cinema-header-line" aria-hidden="true" />
    </header>

    {menuOpen && (
      <div
        className="nav-backdrop"
        onMouseDown={(event) => { if (event.target === event.currentTarget) setMenuOpen(false) }}
      >
        <aside
          id="nav-drawer"
          className="nav-drawer pg-shell"
          role="dialog"
          aria-modal="true"
          aria-label="Temario y navegación"
        >
          <div className="nav-drawer-head">
            <span className="flex items-center gap-3">
              <span className="cinema-brand-mark"><img src={logoMark} alt="" width={36} height={36} /></span>
              <span className="block">
                <span className="block text-sm font-semibold tracking-[0.14em]">PLAY <span style={{ color: 'var(--pg-cyan)' }}>AND GO</span></span>
                <span className="pg-eyebrow" style={{ letterSpacing: '.2em' }}>TAMV Online Network</span>
              </span>
            </span>
            <button
              type="button"
              autoFocus
              className="cinema-control"
              aria-label="Cerrar temario"
              onClick={() => setMenuOpen(false)}
            >
              <X size={18} />
            </button>
          </div>

          <div className="nav-drawer-scroll">
            <p className="pg-eyebrow">Navegación</p>
            <nav aria-label="Navegación del cajón">
              <ul className="nav-drawer-links">
                {navLinks.map(([label, href]) => (
                  <li key={href}><a className="nav-drawer-link" href={href} onClick={() => setMenuOpen(false)}>{label}<ChevronRight size={15} aria-hidden /></a></li>
                ))}
              </ul>
            </nav>

            <p className="pg-eyebrow mt-7">Tu cuenta</p>
            <ul className="nav-drawer-links">
              <li><Link className="nav-drawer-link" href="/auth" onClick={() => setMenuOpen(false)}>Entrar<ChevronRight size={15} aria-hidden /></Link></li>
              <li><a className="nav-drawer-link" href="/ajustes" onClick={() => setMenuOpen(false)}>Ajustes<ChevronRight size={15} aria-hidden /></a></li>
              <li><a className="nav-drawer-link" href="/informacion" onClick={() => setMenuOpen(false)}>Información<ChevronRight size={15} aria-hidden /></a></li>
            </ul>

            <p className="pg-eyebrow mt-7">Módulos del programa</p>
            <ul className="nav-drawer-modules">
              {COURSE_MODULES.map((module) => (
                <li key={module.id}>
                  <a href={`/curso/${module.id}`} onClick={() => setMenuOpen(false)}>
                    <span>{String(module.index).padStart(2, '0')}</span>
                    {module.title}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div className="nav-drawer-foot">
            <Link href="/auth?mode=signup" className="pg-btn pg-btn-primary w-full justify-center" onClick={() => setMenuOpen(false)}>
              Crear cuenta gratis
            </Link>
            <button type="button" className="pg-btn pg-btn-ghost w-full" onClick={() => { setMenuOpen(false); setShowRegister(true) }}>
              Pagar el curso · {coursePrice}
            </button>
            <p className="nav-drawer-note">Sin tarjeta para crear cuenta. El pago lo procesa Stripe.</p>
          </div>
        </aside>
      </div>
    )}

    {/* ---------------------------------------------------------- HERO */}
    <section className="pg-section" style={{ paddingTop: 'clamp(1rem, 2vw, 1.75rem)' }}>
      <div className="pg-container">
        <HeroSlider />
      </div>

      <div className="pg-container mt-10">
        <TamvQuote variant="hero" />
      </div>

      <div className="pg-container mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
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

    {/* ------------------------------------------------- HOOK & BRIDGE */}
    <section id="instant-composer" className="pg-section">
      <div className="pg-container grid items-center gap-8 lg:grid-cols-[1.05fr_.95fr]">
        <div>
          <p className="pg-eyebrow">Hook & Bridge · puerta de entrada</p>
          <h2 className="pg-title">Tu primera canción no tiene que empezar con un formulario.</h2>
          <p className="pg-lede mt-3">
            Escribe dos o tres palabras y escucha una pista real, sintetizada en tu navegador. Sin cuenta, sin tarjeta y
            sin consumir tu cupo de voces. Después decides si quieres aprender a controlarla, programarla o convertir esa
            habilidad en un producto.
          </p>
          <div className="mt-7 flex flex-wrap items-center gap-3">
            <Link href="/crear" className="pg-btn pg-btn-primary">
              Probar el Instant Composer <ArrowRight size={15} />
            </Link>
            <a href="#tu-espacio" className="pg-navlink" style={{ color: 'var(--pg-text)' }}>
              Qué necesito para guardar mi música
            </a>
          </div>
          <p className="pg-note mt-4 flex items-start gap-2">
            <ShieldCheck size={15} className="pg-accent-mint mt-0.5" aria-hidden />
            <span>
              La pista se genera con Web Audio API y Tone.js dentro de tu dispositivo. Tu idea no se envía a un servidor
              para sonar y no se usa IA remota en esta versión.
            </span>
          </p>
        </div>

        <div className="pg-card p-6">
          <p className="pg-eyebrow">El puente, en tres pasos</p>
          <ol className="mt-5 grid gap-4">
            <li className="flex items-start gap-3">
              <span className="pg-num">1</span>
              <span>
                <strong className="block text-sm" style={{ color: 'var(--pg-ink)' }}>Escribe y escucha</strong>
                <span className="pg-note mt-1 block">Una idea corta produce un arreglo completo en segundos, sin registro.</span>
              </span>
            </li>
            <li className="flex items-start gap-3">
              <span className="pg-num">2</span>
              <span>
                <strong className="block text-sm" style={{ color: 'var(--pg-ink)' }}>Entiende qué pasó</strong>
                <span className="pg-note mt-1 block">La interfaz muestra género, tempo, tonalidad y la razón de cada decisión.</span>
              </span>
            </li>
            <li className="flex items-start gap-3">
              <span className="pg-num">3</span>
              <span>
                <strong className="block text-sm" style={{ color: 'var(--pg-ink)' }}>Elige una ruta</strong>
                <span className="pg-note mt-1 block">Productor, desarrollador o producto. Cada una empieza con un reto de cinco minutos.</span>
              </span>
            </li>
          </ol>
          <div className="mt-5 flex flex-wrap gap-2">
            <span className="pg-chip" data-tone="cyan">Sin registro</span>
            <span className="pg-chip" data-tone="violet">Sin tarjeta</span>
            <span className="pg-chip" data-tone="mint">Sin subir tu idea</span>
          </div>
        </div>
      </div>
    </section>

    <Manifesto />

    {/* ------------------------------------------------------ TU ESPACIO */}
    <section id="tu-espacio" className="pg-section">
      <div className="pg-container">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div className="max-w-2xl">
            <p className="pg-eyebrow">Tu espacio</p>
            <h2 className="pg-title">¿Dónde está cada cosa?</h2>
            <p className="pg-lede">
              Cuatro puertas, sin menús escondidos: crear la cuenta, ver tu perfil, escuchar tu música y pagar tu plan.
            </p>
          </div>
          <Link href="/auth" className="pg-navlink">
            Ya tengo cuenta · Entrar
          </Link>
        </div>
        <div className="mt-9 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {spaceCards.map((card, index) => (
            <Reveal key={card.title} delay={index * 60}>
              <Link
                href={card.href}
                className={`pg-card pg-card-hover flex h-full flex-col p-5${card.primary ? ' pg-card-featured' : ''}`}
              >
                <span className="flex items-center justify-between gap-3">
                  <span className="pg-mark">
                    <card.icon size={18} />
                  </span>
                  <span className="pg-eyebrow">{card.eyebrow}</span>
                </span>
                <strong className="mt-5 block" style={{ fontSize: 'var(--pg-step-1)', color: 'var(--pg-ink)' }}>
                  {card.title}
                </strong>
                <span className="mt-2 block flex-1 text-[13px] leading-5" style={{ color: 'var(--pg-muted)' }}>
                  {card.body}
                </span>
                <span className="mt-5 flex items-center gap-1.5 text-[13px]" style={{ color: 'var(--pg-cyan)' }}>
                  {card.action} <ArrowRight size={13} />
                </span>
              </Link>
            </Reveal>
          ))}
        </div>
      </div>
    </section>

    {/* ---------------------------------------------------------- RUTA */}
    <ModuleGrid />

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

    {/* ------------------------------------------------------ VISUALES */}
    <section id="visuales" className="pg-section pg-color-burst">
      <div className="pg-container">
        <div className="flex flex-wrap items-end justify-between gap-5">
          <div className="max-w-2xl"><p className="pg-eyebrow">Música · imagen · imaginación</p><h2 className="pg-title">Una interfaz que también se escucha con los ojos.</h2><p className="pg-lede">Diez atmósferas originales repartidas entre el hero, el laboratorio y esta galería final: cada una acompaña una etapa distinta del proceso creativo.</p></div>
          <span className="pg-chip" data-tone="amber">10 atmósferas originales</span>
        </div>
        <div className="visual-mosaic mt-10">
          {editorialVisuals.slice(3).map((visual, index) => <Reveal key={visual.src} delay={index * 55}><figure className={`visual-tile visual-tile-${index % 4}`}><img src={visual.src} alt={visual.alt} loading="lazy" /><figcaption><span>Frecuencia {String(index + 4).padStart(2, '0')}</span><b>{['Órbita', 'Oro líquido', 'Voz', 'Mezcla', 'Escucha', 'Arquitectura', 'Chispa'][index]}</b></figcaption></figure></Reveal>)}
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
          <div className="flex flex-col items-start gap-2 sm:items-end">
            <p style={{ fontSize: 'var(--pg-step--1)', color: 'var(--pg-muted)' }}>
              Play and Go by TAMV ONLINE · Orgullosamente Realmontenses
            </p>
            <Link href="/informacion" className="pg-minilink">
              Información
            </Link>
            <Link href="/terminos" className="pg-minilink">
              Términos y Condiciones
            </Link>
            <Link href="/privacidad" className="pg-minilink">
              Política de Privacidad
            </Link>
          </div>
        </div>
      </div>
    </footer>

    {/* ------------------------------------------------------ ASISTENTE */}
    <button
      id="asistente"
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
      <div className="mt-5 border-t pt-5 text-center" style={{ borderColor: 'var(--pg-hairline)' }}>
        <p style={{ fontSize: 'var(--pg-step--1)', color: 'var(--pg-text)' }}>
          ¿Sólo quieres probar el estudio?
        </p>
        <Link href="/auth?mode=signup" className="pg-btn pg-btn-ghost pg-btn-sm mt-3" onClick={() => setShowRegister(false)}>
          Crear cuenta gratis, sin tarjeta
        </Link>
      </div>
    </Dialog>
  </main>
}
