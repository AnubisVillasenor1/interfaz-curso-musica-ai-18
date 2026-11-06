'use client'

import { useEffect, useRef, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'

/**
 * Diálogo con las cuatro cosas que a los modales de esta landing les faltaban.
 *
 * Antes cada modal era un `<div>` suelto dentro del `<main>`: sin `role`, sin
 * Escape, sin foco atrapado y con la página siguiéndose moviendo detrás. Eso
 * no es sólo incomodidad —para quien navega con teclado o lector de pantalla
 * el contenido de fondo sigue siendo alcanzable y el diálogo es invisible.
 *
 * Este componente pone lo mínimo exigible:
 *
 * - portal a `document.body` (nada de toparse con un `overflow` o un
 *   `transform` del contenedor) y `pg-shell` en el fondo, porque los tokens
 *   del sistema viven ahí y fuera de esa clase el panel no tiene colores;
 * - `role="dialog"` + `aria-modal` + título asociado;
 * - Escape y clic en el fondo cierran;
 * - el foco entra al panel al abrir y vuelve al disparador al cerrar;
 * - Tab no se escapa del diálogo;
 * - el `body` deja de hacer scroll mientras está abierto.
 */
export function Dialog({
  open,
  onClose,
  title,
  eyebrow,
  children,
  className = '',
}: {
  open: boolean
  onClose: () => void
  /** Texto visible en la cabecera y nombre accesible del diálogo. */
  title: string
  eyebrow?: string
  children: ReactNode
  className?: string
}) {
  const panelRef = useRef<HTMLDivElement | null>(null)
  const restoreRef = useRef<Element | null>(null)

  useEffect(() => {
    if (!open) return
    restoreRef.current = document.activeElement
    const panel = panelRef.current
    // El primer elemento enfocable si lo hay (un formulario), si no el propio
    // panel: un lector de pantalla necesita aterrizar en algún sitio.
    const target = panel?.querySelector<HTMLElement>(
      'input, textarea, select, button:not([data-dialog-close]), a[href]',
    )
    const focusTarget = target ?? panel
    focusTarget?.focus()

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.stopPropagation()
        onClose()
        return
      }
      if (event.key !== 'Tab' || !panel) return
      const items = Array.from(
        panel.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
      ).filter((item) => item.offsetParent !== null || item === document.activeElement)
      if (items.length === 0) {
        event.preventDefault()
        panel.focus()
        return
      }
      const first = items[0]
      const last = items[items.length - 1]
      const active = document.activeElement as HTMLElement | null
      const inside = panel.contains(active)
      if (event.shiftKey && (active === first || !inside)) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && (active === last || !inside)) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = previousOverflow
      const back = restoreRef.current
      if (back instanceof HTMLElement) back.focus()
    }
  }, [open, onClose])

  if (!open || typeof document === 'undefined') return null

  return createPortal(
    <div className="pg-shell pg-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}>
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        className={`pg-panel outline-none ${className}`.trim()}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            {eyebrow && <p className="pg-eyebrow">{eyebrow}</p>}
            <h2 className="pg-title mt-2" data-size="sm">{title}</h2>
          </div>
          <button
            type="button"
            data-dialog-close
            onClick={onClose}
            aria-label={`Cerrar ${title.toLowerCase()}`}
            className="pg-btn pg-btn-ghost shrink-0 rounded-full p-2 text-[var(--pg-muted)]"
            style={{ padding: '0.45rem' }}
          >
            <X size={16} />
          </button>
        </div>
        <div className="mt-5">{children}</div>
      </div>
    </div>,
    document.body,
  )
}
