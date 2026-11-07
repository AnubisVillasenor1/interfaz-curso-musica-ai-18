import type { Metadata } from 'next'

import { AccountTabs } from '@/components/account/account-tabs'
import { LibraryPanel } from '@/components/account/library-panel'

export const metadata: Metadata = {
  robots: { index: false, follow: false },
  title: 'Mi biblioteca',
  description: 'Escucha, descarga y administra las canciones que has generado.',
}

export default function BibliotecaPage() {
  return (
    <main
      className="pg-shell relative min-h-screen overflow-x-clip"
      style={{ background: 'var(--pg-bg)' }}
    >
      <div aria-hidden className="pg-glow" />

      <header className="pg-container py-5">
        <a href="/" className="pg-navlink inline-flex items-center gap-2">
          ← Volver a Play and Go
        </a>
      </header>

      <div className="pg-container max-w-4xl pb-20">
        <AccountTabs active="musica" />

        <section className="pg-section pb-8 pt-8">
          <p className="pg-eyebrow">Tu biblioteca</p>
          <h1 className="pg-title">Tus canciones</h1>
          <p className="pg-lede">
            Reproduce, descarga y organiza todo lo que has generado en el estudio.
          </p>
        </section>

        <LibraryPanel />

        <div className="mt-8">
          <div className="pg-rule" />
        </div>
        <div className="mt-8 flex justify-center">
          <a href="/studio" className="pg-btn pg-btn-ghost">
            Crear más canciones en el estudio →
          </a>
        </div>
      </div>
    </main>
  )
}
