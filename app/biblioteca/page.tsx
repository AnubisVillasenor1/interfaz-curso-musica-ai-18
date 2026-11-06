import type { Metadata } from 'next'

import { LibraryPanel } from '@/components/account/library-panel'

export const metadata: Metadata = {
  title: 'Mi biblioteca · Play and Go by TAMV ONLINE',
  description: 'Escucha, descarga y administra las canciones que has generado.',
}

export default function BibliotecaPage() {
  return (
    <main className="min-h-screen bg-[#07121f] text-[#edfaff] selection:bg-[#6feaff]/30">
      <div className="relative mx-auto max-w-4xl px-5 py-12 sm:px-8">
        <div className="pointer-events-none absolute inset-0 -z-0 bg-[radial-gradient(circle_at_75%_5%,rgba(88,213,230,.14),transparent_32%),radial-gradient(circle_at_15%_80%,rgba(155,92,226,.12),transparent_34%)]" />
        <header className="relative z-10 mb-8">
          <a href="/" className="text-sm text-[#8cecf3] hover:underline">
            ← Volver a Play and Go
          </a>
          <p className="mt-6 text-[10px] uppercase tracking-[.24em] text-[#75e9f2]">
            Tu biblioteca
          </p>
          <h1 className="mt-2 text-4xl font-semibold tracking-tight">Tus canciones</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-[#9fb8c7]">
            Reproduce, descarga y organiza todo lo que has generado en el estudio.
          </p>
        </header>
        <div className="relative z-10">
          <LibraryPanel />
        </div>
        <div className="relative z-10 mt-8 flex justify-center">
          <a
            href="/studio"
            className="inline-flex items-center gap-2 rounded-full border border-[#75e9f2]/30 px-5 py-2.5 text-sm text-[#8cecf3] transition hover:bg-white/5 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-[#75e9f2]/50"
          >
            Crear más canciones en el estudio →
          </a>
        </div>
      </div>
    </main>
  )
}
