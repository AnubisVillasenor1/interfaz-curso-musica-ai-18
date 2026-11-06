import type { Metadata } from 'next'

import { ProfilePanel } from '@/components/account/profile-panel'

export const metadata: Metadata = {
  title: 'Mi cuenta · Play and Go by TAMV ONLINE',
  description: 'Tu plan, tu cupo diario y tu progreso en el curso de música con IA.',
}

export default function PerfilPage() {
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

      <div className="pg-container max-w-4xl pt-6 pb-20">
        <ProfilePanel />

        <div className="mt-8">
          <div className="pg-rule" />
        </div>
        <nav className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-3">
          <a href="/biblioteca" className="pg-navlink">
            Mi biblioteca
          </a>
          <a href="/studio" className="pg-navlink">
            Ir al estudio
          </a>
          <a href="/precios" className="pg-navlink">
            Ver planes
          </a>
        </nav>
      </div>
    </main>
  )
}
