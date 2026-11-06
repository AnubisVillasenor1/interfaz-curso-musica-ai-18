import { TAMV_QUOTE, TAMV_QUOTE_AUTHOR, TAMV_QUOTE_ROLE } from '@/lib/tamv-identity'

/**
 * La cita fundacional de TAMV, en los tres tamaños estratégicos:
 * `hero` (portada/curso), `section` (subsecciones) y `footer` (todas las páginas).
 */
export function TamvQuote({ variant = 'section' }: { variant?: 'hero' | 'section' | 'footer' }) {
  const sizes = {
    hero: 'text-xl sm:text-2xl leading-snug',
    section: 'text-base sm:text-lg leading-relaxed',
    footer: 'text-sm sm:text-base leading-relaxed',
  }
  return (
    <figure className="pg-card p-6 sm:p-8" style={{ borderColor: 'var(--pg-hairline)' }}>
      <span aria-hidden="true" className="pg-eyebrow" style={{ color: 'var(--pg-cyan)' }}>TAMV Online Network</span>
      <blockquote className={`${sizes[variant]} mt-4 font-medium`} style={{ color: 'var(--pg-text)' }}>
        “{TAMV_QUOTE}”
      </blockquote>
      <figcaption className="pg-note mt-4">
        — {TAMV_QUOTE_AUTHOR}, {TAMV_QUOTE_ROLE}
      </figcaption>
    </figure>
  )
}
