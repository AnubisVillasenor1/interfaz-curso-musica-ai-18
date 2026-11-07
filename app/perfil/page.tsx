import type { Metadata } from 'next'

import { AccountTabs } from '@/components/account/account-tabs'
import { ProfilePanel } from '@/components/account/profile-panel'

export const metadata: Metadata = {
  robots: { index: false, follow: false },
  title: 'Mi cuenta',
  description: 'Tu plan, tu cupo diario y tu progreso en el curso de música con IA.',
}

export default function PerfilPage() {
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

      <div className="pg-container max-w-4xl pt-6 pb-20">
        <AccountTabs active="perfil" />

        <div className="mt-6">
          <ProfilePanel />
        </div>
      </div>
    </main>
  )
}
