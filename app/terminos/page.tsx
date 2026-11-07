import type { Metadata } from 'next'
import Link from 'next/link'

import {
  TERMS_CONTACT,
  TERMS_EFFECTIVE_DATE,
  TERMS_SECTIONS,
  TERMS_VERSION,
  type LegalBlock,
} from '@/lib/legal/terms'

export const metadata: Metadata = {
  title: 'Términos y Condiciones',
  description:
    'Términos y Condiciones de uso de TAMMV Online Network: cuentas, identidad académica, comunidad, membresías, contenido generado con IA y protección de datos.',
}

/**
 * Los veinte artículos viven en `lib/legal/terms.ts` como datos. Aquí sólo se
 * decide la forma: párrafo, lista, tabla o bloque de código. Editar el texto
 * legal no debería obligar a tocar marcado.
 */
function Block({ block }: { block: LegalBlock }) {
  switch (block.kind) {
    case 'p':
      return <p className="pg-prose">{block.text}</p>

    case 'subheading':
      return <h3 className="pg-block-title mt-2">{block.text}</h3>

    case 'list':
      return (
        <ul className="pg-list">
          {block.items.map((item, index) => (
            <li key={`${index}-${item.slice(0, 24)}`}>
              <span className="pg-accent-cyan" aria-hidden>
                ·
              </span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
      )

    case 'table':
      return (
        <div className="pg-scroll">
          <table className="pg-table">
            <thead>
              <tr>
                {block.head.map((cell) => (
                  <th key={cell} scope="col">
                    {cell}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {block.rows.map((row, rowIndex) => (
                <tr key={`${rowIndex}-${row[0]}`}>
                  {row.map((cell, cellIndex) =>
                    cellIndex === 0 ? (
                      <th key={cellIndex} scope="row">
                        {cell}
                      </th>
                    ) : (
                      <td key={cellIndex}>{cell}</td>
                    ),
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )

    case 'code':
      return (
        <pre className="pg-code">
          <code>{block.text}</code>
        </pre>
      )

    case 'note':
      return (
        <p className="pg-callout p-4 text-[13px] leading-6" data-tone="violet">
          {block.text}
        </p>
      )
  }
}

export default function TerminosPage() {
  return (
    <main className="pg-shell relative min-h-screen overflow-x-clip" style={{ background: 'var(--pg-bg)' }}>
      <div aria-hidden className="pg-glow" />

      <div className="pg-container relative z-10 py-14 sm:py-20">
        <header>
          <Link href="/" className="pg-navlink">
            ← Volver a Play and Go
          </Link>

          <p className="pg-eyebrow mt-9">Legal · TAMMV Online Network</p>
          <h1 className="pg-title pg-title-display mt-5 max-w-4xl">Términos y Condiciones de Uso</h1>
          <p className="pg-lede mt-6 max-w-2xl">
            El marco de uso de la Red: cuentas e identidad académica, comunidad y moderación, membresías y
            pagos, contenido generado con inteligencia artificial, propiedad intelectual y protección de datos.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <span className="pg-pill" data-tone="cyan">
              Vigente desde el {TERMS_EFFECTIVE_DATE}
            </span>
            <span className="pg-pill" data-tone="amber">
              Versión {TERMS_VERSION} · pendiente de revisión legal
            </span>
          </div>

          <div className="pg-callout mt-10 max-w-3xl p-5">
            <p className="pg-label" data-tone="amber">
              Aviso de estado
            </p>
            <p className="mt-2 text-sm leading-6">
              Esta es la versión base {TERMS_VERSION} de los Términos. Debe ser revisada por un abogado
              mexicano antes de considerarse definitiva, en materia de protección de datos, menores,
              consumo, propiedad intelectual y responsabilidad.
            </p>
          </div>
        </header>

        <div className="pg-rule mt-14" />

        <div className="mt-14 grid gap-12 lg:grid-cols-[15rem_minmax(0,1fr)] lg:gap-16">
          <nav aria-label="Índice de los Términos" className="hidden lg:sticky lg:top-12 lg:block lg:self-start">
            <p className="pg-eyebrow">Índice</p>
            <ol className="mt-5 flex flex-col gap-1.5">
              {TERMS_SECTIONS.map((section, index) => (
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
            {TERMS_SECTIONS.map((section, index) => (
              <section key={section.id} id={section.id} className="scroll-mt-8">
                <h2 className="pg-section-title">
                  <span className="pg-num-inline">{String(index + 1).padStart(2, '0')}</span>
                  <span>{section.title}</span>
                </h2>
                <div className="mt-5 flex flex-col gap-4">
                  {section.blocks.map((block, blockIndex) => (
                    <Block key={`${section.id}-${blockIndex}`} block={block} />
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
              <p className="pg-eyebrow">Contacto institucional</p>
              <p className="pg-prose mt-4">
                TAMMV Online Network · {TERMS_CONTACT.location}
              </p>
              <p className="pg-note mt-3">
                {TERMS_CONTACT.institutional} · {TERMS_CONTACT.support} · {TERMS_CONTACT.legal} ·{' '}
                {TERMS_CONTACT.privacy}
              </p>
            </div>
            <div className="flex flex-wrap gap-3 md:justify-end">
              <Link href="/precios" className="pg-btn pg-btn-ghost pg-btn-sm">
                Ver membresías
              </Link>
              <Link href="/informacion" className="pg-btn pg-btn-ghost pg-btn-sm">
                Sobre la Red
              </Link>
            </div>
          </div>

          <p className="pg-note mt-10 text-center">
            Play and Go by TAMV ONLINE <span aria-hidden>·</span> Orgullosamente Realmontenses
          </p>
        </footer>
      </div>
    </main>
  )
}
