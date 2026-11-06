'use client'

import { useEffect, useRef, useState, type ElementType, type ReactNode } from 'react'

/**
 * Revelado al hacer scroll.
 *
 * La regla del sistema visual es discreta: 8 px y opacidad, nada de saltos.
 * Por eso este componente es un solo atributo (`data-shown`) más un retardo
 * opcional, y no una librería de animación.
 *
 * Dos cosas lo hacen honrado con quien navega:
 *
 * - Con `prefers-reduced-motion: reduce` no observa nada: pinta el contenido
 *   visible desde el principio. Un usuario con movimiento reducido no debería
 *   tener que hacer scroll para que el texto aparezca.
 * - Si el navegador no tiene `IntersectionObserver`, tampoco bloquea: se
 *   muestra de una.
 */
export function Reveal({
  children,
  className = '',
  delay = 0,
  as: Tag = 'div',
}: {
  children: ReactNode
  className?: string
  /** Milisegundos de escalonado entre hermanos del mismo bloque. */
  delay?: number
  as?: ElementType
}) {
  const ref = useRef<HTMLElement | null>(null)
  const [shown, setShown] = useState(false)

  useEffect(() => {
    const node = ref.current
    if (!node) return

    const gentle = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    if (gentle || typeof IntersectionObserver === 'undefined') {
      setShown(true)
      return
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setShown(true)
            observer.disconnect()
          }
        }
      },
      { rootMargin: '0px 0px -8% 0px', threshold: 0.08 },
    )
    observer.observe(node)
    return () => observer.disconnect()
  }, [])

  return (
    <Tag
      ref={ref as never}
      data-shown={shown ? 'true' : 'false'}
      className={`pg-reveal ${className}`.trim()}
      style={delay ? ({ '--pg-reveal-delay': `${delay}ms` } as never) : undefined}
    >
      {children}
    </Tag>
  )
}
