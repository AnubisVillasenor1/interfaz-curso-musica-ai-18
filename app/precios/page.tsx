import type { Metadata } from 'next'

import { PricingTable } from '@/components/account/pricing-table'

export const metadata: Metadata = {
  title: 'Precios · Play and Go by TAMV ONLINE',
  description: 'Planes del curso de música con IA y del estudio de generación.',
}

export default function PreciosPage() {
  return (
    <main className="min-h-screen bg-[#07121f] text-[#edfaff] selection:bg-[#6feaff]/30">
      <div className="relative mx-auto max-w-6xl px-5 py-12 sm:px-8">
        <div className="pointer-events-none absolute inset-0 -z-0 bg-[radial-gradient(circle_at_75%_5%,rgba(88,213,230,.14),transparent_32%),radial-gradient(circle_at_15%_80%,rgba(155,92,226,.12),transparent_34%)]" />

        <header className="relative z-10 mb-10">
          <a href="/" className="text-sm text-[#8cecf3] hover:underline">
            ← Volver a Play and Go
          </a>
          <p className="mt-6 text-[10px] uppercase tracking-[.24em] text-[#75e9f2]">
            Planes y acceso
          </p>
          <h1 className="mt-2 text-4xl font-semibold tracking-tight sm:text-5xl">
            Elige cómo quieres aprender y crear
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-6 text-[#9fb8c7]">
            Un solo precio por plan, leído del catálogo que cobra la pasarela. Empieza gratis con el
            motor local y sube de nivel cuando quieras composiciones con voces del proveedor de pago.
          </p>
        </header>

        <div className="relative z-10">
          <PricingTable />
        </div>

        <footer className="relative z-10 mt-14 border-t border-white/10 pt-6 text-center text-xs text-[#78919d]">
          Play and Go by TAMV ONLINE <span className="mx-2 text-[#75e9f2]">•</span> Orgullosamente
          Realmontenses
        </footer>
      </div>
    </main>
  )
}
