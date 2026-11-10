'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowRight, BookOpen, CreditCard, Music2, Sparkles, X } from 'lucide-react'

const SEEN_KEY = 'play-and-go:tutorial-seen'

const STEPS = [
  {
    icon: Sparkles,
    eyebrow: '01 · EMPIEZA AQUÍ',
    title: 'Convierte una idea en música',
    body: 'Mira la barra superior y presiona Crear. En esa sección escribe tu idea en el campo principal, elige género, tempo e instrumentos y pulsa Generar para escuchar una pista local.',
    href: '/crear',
    action: 'Abrir creador',
  },
  {
    icon: BookOpen,
    eyebrow: '02 · APRENDE PRODUCCIÓN',
    title: 'Sigue el curso paso a paso',
    body: 'En la barra superior presiona Curso. Abre el primer módulo, entra a una sesión y completa el ejercicio de la página antes de pasar a la siguiente lección.',
    href: '/curso',
    action: 'Ver cursos',
  },
  {
    icon: Music2,
    eyebrow: '03 · GUARDA TU OBRA',
    title: 'Usa el Estudio y tu biblioteca',
    body: 'En la barra superior presiona Estudio. Usa el botón Nuevo proyecto para generar una pista; después usa los controles de reproducción y Guardar para conservarla en tu Biblioteca.',
    href: '/studio',
    action: 'Ir al estudio',
  },
  {
    icon: CreditCard,
    eyebrow: '04 · AMPLÍA EL ACCESO',
    title: 'Compra solo cuando lo necesites',
    body: 'En la barra superior presiona Planes y pago. Compara los accesos y, si necesitas ampliar tu uso, presiona Comprar ahora; el checkout seguro se abre en la siguiente pantalla.',
    href: '/precios',
    action: 'Ver planes y pago',
  },
] as const

export function PlatformTutorial({ enabled = true }: { enabled?: boolean }) {
  const [open, setOpen] = useState(enabled)
  const [step, setStep] = useState(0)

  useEffect(() => {
    if (!enabled) return

    try {
      setOpen(window.sessionStorage.getItem(SEEN_KEY) !== '1')
    } catch {
      setOpen(true)
    }
  }, [enabled])

  function close() {
    try {
      window.sessionStorage.setItem(SEEN_KEY, '1')
    } catch {
      // El tutorial sigue siendo descartable aunque el navegador bloquee storage.
    }
    setOpen(false)
  }

  if (!open) return null
  const current = STEPS[step]
  const Icon = current.icon

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center bg-black/55 p-3 backdrop-blur-sm sm:items-center sm:p-6" role="dialog" aria-modal="true" aria-labelledby="platform-tutorial-title">
      <div className="pg-card w-full max-w-2xl overflow-hidden border-[color:var(--pg-cyan)]/30 p-5 shadow-2xl sm:p-7">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="pg-eyebrow">Guía rápida · Play and Go</p>
            <p className="pg-note mt-2">Tu mapa para saber qué hacer después de entrar.</p>
          </div>
          <button type="button" onClick={close} className="pg-btn pg-btn-ghost pg-btn-sm" aria-label="Cerrar tutorial">
            <X size={16} aria-hidden="true" />
          </button>
        </div>

        <div className="mt-7 grid gap-5 sm:grid-cols-[auto_1fr] sm:items-start">
          <span className="pg-mark flex size-14 items-center justify-center" data-tone="cyan"><Icon size={25} aria-hidden="true" /></span>
          <div>
            <p className="pg-label" data-tone="cyan">{current.eyebrow}</p>
            <h2 id="platform-tutorial-title" className="pg-title mt-2 text-2xl sm:text-3xl">{current.title}</h2>
            <p className="pg-lede mt-3 text-sm leading-6">{current.body}</p>
            <div className="mt-5 flex flex-wrap gap-3">
              <Link href={current.href} onClick={close} className="pg-btn pg-btn-primary">
                {current.action} <ArrowRight size={15} aria-hidden="true" />
              </Link>
              <button type="button" onClick={close} className="pg-btn pg-btn-ghost">Explorar por mi cuenta</button>
            </div>
          </div>
        </div>

        <div className="mt-7 flex items-center justify-between gap-4 border-t border-white/10 pt-4">
          <div className="flex gap-1.5" aria-label={`Paso ${step + 1} de ${STEPS.length}`}>
            {STEPS.map((item, index) => (
              <button key={item.eyebrow} type="button" onClick={() => setStep(index)} aria-label={`Ir al paso ${index + 1}`} aria-current={index === step ? 'step' : undefined} className={`h-1.5 rounded-full transition-all ${index === step ? 'w-8 bg-[var(--pg-cyan)]' : 'w-3 bg-white/25'}`} />
            ))}
          </div>
          {step < STEPS.length - 1 ? (
            <button type="button" onClick={() => setStep((value) => value + 1)} className="pg-minilink">Siguiente <ArrowRight size={13} aria-hidden="true" /></button>
          ) : (
            <button type="button" onClick={close} className="pg-minilink">Terminar guía</button>
          )}
        </div>
      </div>
    </div>
  )
}
