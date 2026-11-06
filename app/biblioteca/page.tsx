import type { Metadata } from 'next'

import { LibraryPanel } from '@/components/account/library-panel'

export const metadata: Metadata = {
  title: 'Mi biblioteca · Play and Go by TAMV ONLINE',
  description: 'Escucha, descarga y administra las canciones que has generado.',
}

export default function BibliotecaPage() {
  return (
    <main
      className="pg-shell relative min-h-screen overflow-x-clip"
      style={{ background: 'var(--pg-bg)' }}
    >
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 -z-10"
        style={{
          background:
            'radial-gradient(circle at 76% 2%, rgba(117,233,242,.13), transparent 33%), radial-gradient(circle at 14% 86%, rgba(192,158,255,.11), transparent 35%)',
        }}
      />

      <header className="pg-container py-5">
        <a href="/" className="pg-navlink inline-flex items-center gap-2">
          ← Volver a Play and Go
        </a>
      </header>

      <div className="pg-container max-w-4xl pb-20">
        <section className="pg-section pb-8">
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
