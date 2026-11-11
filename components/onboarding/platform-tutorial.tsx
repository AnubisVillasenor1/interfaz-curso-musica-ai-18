'use client'

import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import Link from 'next/link'
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  CreditCard,
  Home,
  Library,
  MessageCircle,
  Music2,
  PanelTop,
  Sparkles,
  UserRound,
  UsersRound,
  WandSparkles,
  X,
  type LucideIcon,
} from 'lucide-react'

const SEEN_KEY = 'play-and-go:tutorial-seen'
const FOCUSABLE = 'button:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])'

const STEPS: { icon: LucideIcon; eyebrow: string; title: string; body: string; href: string; action: string }[] = [
  {
    icon: Home,
    eyebrow: '01 · INICIO',
    title: 'Tu punto de partida',
    body: 'El inicio reúne las novedades y las puertas principales de la plataforma. El logotipo te devuelve aquí; desplázate para recorrer el curso, las plantillas creativas, el estudio, tus logros y la galería.',
    href: '/',
    action: 'Explorar el inicio',
  },
  {
    icon: PanelTop,
    eyebrow: '02 · NAVEGACIÓN',
    title: 'Encuentra cada sección',
    body: 'En escritorio, la barra superior abre Crear gratis, Curso, Estudio, Mi música, Mi perfil, Comunidad y Planes y pago. En móvil, el botón «Temario» abre el mismo menú; toca una opción para ir a esa sección o la X para cerrarlo.',
    href: '/',
    action: 'Ver navegación',
  },
  {
    icon: WandSparkles,
    eyebrow: '03 · CREA',
    title: 'Da forma a una idea',
    body: 'En Crear gratis escribe una descripción musical y ajusta las opciones disponibles para generar una pista. También puedes partir de una plantilla de género, voz e instrumentación y personalizarla antes de crear.',
    href: '/crear',
    action: 'Abrir Crear gratis',
  },
  {
    icon: BookOpen,
    eyebrow: '04 · APRENDE',
    title: 'Avanza por el curso',
    body: 'Curso organiza el aprendizaje en módulos y sesiones. Abre un módulo, entra a una lección y sigue sus ejercicios; el temario te ayuda a volver a otras lecciones y el área de evaluación reúne las prácticas técnicas.',
    href: '/curso',
    action: 'Ver el curso',
  },
  {
    icon: Music2,
    eyebrow: '05 · PRODUCE',
    title: 'Trabaja en el estudio',
    body: 'Estudio abre el compositor musical. Describe el sonido que buscas, configura género, tempo e instrumentos y usa los controles de reproducción para escuchar el resultado. Desde ahí puedes continuar la creación o preparar una descarga.',
    href: '/studio',
    action: 'Abrir el estudio',
  },
  {
    icon: Library,
    eyebrow: '06 · TU MÚSICA',
    title: 'Escucha y gestiona tus pistas',
    body: 'Mi música reúne las canciones de tu biblioteca. Usa los controles de cada pista para reproducirla y las acciones disponibles para revisar o descargar tus creaciones.',
    href: '/biblioteca',
    action: 'Abrir mi música',
  },
  {
    icon: UserRound,
    eyebrow: '07 · TU CUENTA',
    title: 'Revisa tu perfil',
    body: 'Mi perfil concentra los datos de tu cuenta, tu plan, el cupo disponible y el avance del curso. Desde el perfil también puedes administrar tu sesión y revisar tu actividad.',
    href: '/perfil',
    action: 'Ver mi perfil',
  },
  {
    icon: UsersRound,
    eyebrow: '08 · COMUNIDAD',
    title: 'Conecta con otros creadores',
    body: 'Comunidad es el espacio para descubrir el lado colectivo de Play & Go y compartir el camino creativo con otras personas. Entra desde el menú principal cuando quieras recorrerlo.',
    href: '/comunidad',
    action: 'Visitar comunidad',
  },
  {
    icon: CreditCard,
    eyebrow: '09 · PLANES Y PAGO',
    title: 'Elige el acceso que necesitas',
    body: 'Planes y pago explica las opciones gratuitas, el curso y el acceso al estudio. Revisa el alcance y el precio de cada plan; si eliges uno, el botón de compra abre el checkout seguro para completar el proceso.',
    href: '/precios',
    action: 'Comparar planes',
  },
  {
    icon: Sparkles,
    eyebrow: '10 · SECCIONES DEL INICIO',
    title: 'Prueba plantillas y descubre tu progreso',
    body: 'En «Prompts que sí producen resultados», abre una tarjeta para ver una plantilla y usa Copiar para llevar su texto al portapapeles. Más abajo, Estudio abre el compositor, Logros muestra tus insignias y la galería reúne las atmósferas visuales.',
    href: '/#prompts',
    action: 'Ver las plantillas',
  },
  {
    icon: MessageCircle,
    eyebrow: '11 · ASISTENTE',
    title: 'Pregunta cuando necesites ayuda',
    body: 'El botón flotante «Pregúntale a la guía» abre el asistente del curso. Escribe una pregunta y usa el botón Enviar; el botón X cierra el panel. Puedes volver a abrirlo desde cualquier momento en el inicio.',
    href: '/#asistente',
    action: 'Ver la guía',
  },
  {
    icon: MessageCircle,
    eyebrow: '12 · LISTO PARA EXPLORAR',
    title: 'La plataforma es tuya',
    body: '«Entrar» abre el acceso a tu cuenta y «Crear cuenta gratis» inicia el registro. También puedes regresar a la presentación sonora desde «Ver presentación». Ya conoces las secciones: explora a tu ritmo.',
    href: '/auth?mode=signup',
    action: 'Crear cuenta gratis',
  },
]

export function PlatformTutorial({ enabled = true }: { enabled?: boolean }) {
  const [open, setOpen] = useState(false)
  const [step, setStep] = useState(0)
  const closeButtonRef = useRef<HTMLButtonElement>(null)
  const restoreFocusRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    if (!enabled) return

    let seen = false
    try {
      seen = window.sessionStorage.getItem(SEEN_KEY) === '1'
    } catch {
      seen = false
    }
    if (seen) return

    const timer = window.setTimeout(() => setOpen(true), 2500)
    return () => window.clearTimeout(timer)
  }, [enabled])

  useEffect(() => {
    if (!open) return

    restoreFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    closeButtonRef.current?.focus()

    return () => {
      document.body.style.overflow = previousOverflow
      if (restoreFocusRef.current?.isConnected) restoreFocusRef.current.focus()
    }
  }, [open])

  function close() {
    try {
      window.sessionStorage.setItem(SEEN_KEY, '1')
    } catch {
      // El tutorial sigue siendo descartable aunque el navegador bloquee storage.
    }
    setOpen(false)
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === 'Escape') {
      event.preventDefault()
      close()
      return
    }
    if (event.key === 'ArrowRight' && step < STEPS.length - 1) {
      event.preventDefault()
      setStep((current) => current + 1)
      return
    }
    if (event.key === 'ArrowLeft' && step > 0) {
      event.preventDefault()
      setStep((current) => current - 1)
      return
    }
    if (event.key !== 'Tab') return

    const items = Array.from(event.currentTarget.querySelectorAll<HTMLElement>(FOCUSABLE))
      .filter((item) => item.getClientRects().length > 0)
    const first = items[0]
    const last = items[items.length - 1]
    if (!first || !last) return

    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault()
      last.focus()
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault()
      first.focus()
    }
  }

  if (!open) return null
  const current = STEPS[step]
  const Icon = current.icon

  return (
    <div className="pg-tutorial-overlay" onKeyDown={handleKeyDown}>
      <section
        className="pg-tutorial-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="platform-tutorial-title"
        aria-describedby="platform-tutorial-description"
      >
        <div className="flex items-start justify-between gap-5">
          <div>
            <p className="pg-tutorial-eyebrow">Recorrido guiado · Play &amp; Go</p>
            <p className="mt-2 text-sm text-[var(--tour-muted)]">Una guía completa de secciones, accesos y controles.</p>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={close}
            className="pg-tutorial-icon-button"
            aria-label="Cerrar y explorar la plataforma"
          >
            <X size={18} aria-hidden="true" />
          </button>
        </div>

        <div className="mt-8 grid gap-5 sm:grid-cols-[3.5rem_minmax(0,1fr)] sm:items-start">
          <span className="pg-tutorial-icon" aria-hidden="true"><Icon size={24} /></span>
          <div>
            <p className="pg-tutorial-step-label">{current.eyebrow}</p>
            <h2 id="platform-tutorial-title" className="mt-2 text-2xl font-medium leading-tight tracking-[-.04em] text-[var(--tour-foreground)] sm:text-3xl">
              {current.title}
            </h2>
            <p id="platform-tutorial-description" className="mt-3 max-w-xl text-sm leading-6 text-[var(--tour-muted)] sm:text-base sm:leading-7">
              {current.body}
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link href={current.href} onClick={close} className="pg-tutorial-primary">
                {current.action} <ArrowRight size={15} aria-hidden="true" />
              </Link>
              <button type="button" onClick={close} className="pg-tutorial-secondary">
                Explorar por mi cuenta
              </button>
            </div>
          </div>
        </div>

        <div className="mt-8 flex flex-wrap items-center justify-between gap-4 border-t border-[var(--tour-hairline)] pt-5">
          <div className="flex items-center gap-4">
            <button
              type="button"
              className="pg-tutorial-stepper"
              onClick={() => setStep((currentStep) => Math.max(0, currentStep - 1))}
              disabled={step === 0}
              aria-label="Paso anterior"
            >
              <ArrowLeft size={16} aria-hidden="true" />
            </button>
            <div className="flex gap-1.5" role="group" aria-label={`Paso ${step + 1} de ${STEPS.length}`}>
              {STEPS.map((item, index) => (
                <button
                  key={item.eyebrow}
                  type="button"
                  onClick={() => setStep(index)}
                  aria-label={`Ir al paso ${index + 1}: ${item.title}`}
                  aria-current={index === step ? 'step' : undefined}
                  className={`pg-tutorial-progress-dot${index === step ? ' is-active' : ''}`}
                />
              ))}
            </div>
            <span className="font-mono text-[10px] tabular-nums text-[var(--tour-muted)]">{String(step + 1).padStart(2, '0')} / {STEPS.length}</span>
          </div>
          {step < STEPS.length - 1 ? (
            <button type="button" onClick={() => setStep((currentStep) => currentStep + 1)} className="pg-tutorial-next">
              Siguiente <ArrowRight size={14} aria-hidden="true" />
            </button>
          ) : (
            <button type="button" onClick={close} className="pg-tutorial-next">
              Terminar recorrido <ArrowRight size={14} aria-hidden="true" />
            </button>
          )}
        </div>
      </section>
    </div>
  )
}
