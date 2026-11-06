import type { Metadata } from 'next'

import { ProfilePanel } from '@/components/account/profile-panel'

export const metadata: Metadata = {
  title: 'Mi cuenta · Play and Go by TAMV ONLINE',
  description: 'Tu plan, tu cupo diario y tu progreso en el curso de música con IA.',
}

export default function PerfilPage() {
  return (
    <main className="min-h-screen bg-[#07121f] text-[#edfaff] selection:bg-[#6feaff]/30">
      <div className="relative mx-auto max-w-4xl px-5 py-12 sm:px-8">
        <div className="pointer-events-none absolute inset-0 -z-0 bg-[radial-gradient(circle_at_75%_5%,rgba(88,213,230,.14),transparent_32%),radial-gradient(circle_at_15%_80%,rgba(155,92,226,.12),transparent_34%)]" />
        <header className="relative z-10 mb-8">
          <a href="/" className="text-sm text-[#8cecf3] hover:underline">
            ← Volver a Play and Go
          </a>
        </header>
        <div className="relative z-10">
          <ProfilePanel />
        </div>
        <nav className="relative z-10 mt-8 flex flex-wrap justify-center gap-4 text-sm text-[#a9c0ca]">
          <a href="/biblioteca" className="hover:text-[#75e9f2] hover:underline">
            Mi biblioteca
          </a>
          <a href="/studio" className="hover:text-[#75e9f2] hover:underline">
            Ir al estudio
          </a>
          <a href="/precios" className="hover:text-[#75e9f2] hover:underline">
            Ver planes
          </a>
        </nav>
      </div>
    </main>
  )
}
