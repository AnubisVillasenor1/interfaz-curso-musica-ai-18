import Link from 'next/link'
import type { ReactNode } from 'react'

import { LegalBlockView } from '@/components/legal/legal-blocks'
import type { LegalSection } from '@/lib/legal/terms'

/**
 * Armazón común de las páginas legales (Términos y Privacidad).
 *
 * El índice lateral, la numeración, el ancho de lectura y las tablas
 * desplazables estaban duplicados en dos archivos. Cuando cambia el tono de un
 * aviso o el espaciado, tiene que cambiar en un solo sitio.
 */
export function LegalPage({
  eyebrow,
  title,
  lede,
  effectiveDate,
  version,
  notice,
  sections,
  contact,
  footer,
}: {
  eyebrow: string
  title: string
  lede: string
  effectiveDate: string
  version: string
  notice: { title: string; text: string }
  sections: LegalSection[]
  contact: { title: string; lines: string[] }
  footer?: ReactNode
}) {
  return (
    <main className="pg-shell relative min-h-screen overflow-x-clip" style={{ background: 'var(--pg-bg)' }}>
      <div aria-hidden className="pg-glow" />

      <div className="pg-container relative z-10 py-14 sm:py-20">
        <header>
          <Link href="/" className="pg-navlink">
            ← Volver a Play and Go
          </Link>

          <p className="pg-eyebrow mt-9">{eyebrow}</p>
          <h1 className="pg-title pg-title-display mt-5 max-w-4xl">{title}</h1>
          <p className="pg-lede mt-6 max-w-2xl">{lede}</p>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <span className="pg-pill" data-tone="cyan">
              Vigente desde el {effectiveDate}
            </span>
            <span className="pg-pill" data-tone="amber">
              Versión {version} · pendiente de revisión legal
            </span>
          </div>

          <div className="pg-callout mt-10 max-w-3xl p-5">
            <p className="pg-label" data-tone="amber">
              {notice.title}
            </p>
            <p className="mt-2 text-sm leading-6">{notice.text}</p>
          </div>
        </header>

        <div className="pg-rule mt-14" />

        <div className="mt-14 grid gap-12 lg:grid-cols-[15rem_minmax(0,1fr)] lg:gap-16">
          <nav aria-label={`Índice de ${title}`} className="hidden lg:sticky lg:top-12 lg:block lg:self-start">
            <p className="pg-eyebrow">Índice</p>
            <ol className="mt-5 flex flex-col gap-1.5">
              {sections.map((section, index) => (
                <li key={section.id}>
                  <a
                    href={`#${section.id}`}
                    className="flex gap-2.5 text-[13px] leading-5 text-[var(--pg-muted)] transition-colors hover:text-[var(--pg-ink)]"
                  >
                    <span className="pg-num-inline">{String(index + 1).padStart(2, '0')}</span>
                    <span>{section.title}</span>
                  </a>
                </li>
              ))}
            </ol>
          </nav>

          <div className="flex min-w-0 flex-col gap-14">
            {sections.map((section, index) => (
              <section key={section.id} id={section.id} className="scroll-mt-8">
                <h2 className="pg-section-title">
                  <span className="pg-num-inline">{String(index + 1).padStart(2, '0')}</span>
                  <span>{section.title}</span>
                </h2>
                <div className="mt-5 flex flex-col gap-4">
                  {section.blocks.map((block, blockIndex) => (
                    <LegalBlockView key={`${section.id}-${blockIndex}`} block={block} />
                  ))}
                </div>
              </section>
            ))}
          </div>
        </div>

        <footer className="mt-20">
          <div className="pg-rule" />

          <div className="mt-10 grid gap-8 md:grid-cols-[1.2fr_1fr] md:items-start">
            <div>
              <p className="pg-eyebrow">{contact.title}</p>
              {contact.lines.map((line) => (
                <p key={line} className="pg-prose mt-3 text-sm">
                  {line}
                </p>
              ))}
            </div>
            {footer ? <div className="flex flex-wrap gap-3 md:justify-end">{footer}</div> : null}
          </div>

          <p className="pg-note mt-10 text-center">
            Play and Go by TAMV ONLINE <span aria-hidden>·</span> Orgullosamente Realmontenses
          </p>
        </footer>
      </div>
    </main>
  )
}
