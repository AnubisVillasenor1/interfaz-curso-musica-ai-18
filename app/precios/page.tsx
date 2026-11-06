import type { Metadata } from 'next'

import { PricingTable } from '@/components/account/pricing-table'

export const metadata: Metadata = {
  title: 'Precios · Play and Go by TAMV ONLINE',
  description: 'Planes del curso de música con IA y del estudio de generación.',
}

/**
 * Página de precios.
 *
 * La capa de luz va fija y fuera del flujo (`-z-10`, `pointer-events-none`):
 * antes era un `absolute` con `-z-0` —un valor que Tailwind no genera— dentro de
 * un contenedor con padding, así que el degradado se cortaba en cuanto la
 * página crecía. Los dos colores salen de la paleta de marca, no de hexes
 * escritos a mano.
 */
export default function PreciosPage() {
  return (
    <main
      className="pg-shell relative min-h-screen overflow-x-clip"
      style={{ background: 'var(--pg-bg)', color: 'var(--pg-ink)' }}
    >
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 -z-10"
        style={{
          background:
            'radial-gradient(circle at 78% 4%, rgba(117,233,242,.13), transparent 34%), radial-gradient(circle at 12% 84%, rgba(192,158,255,.11), transparent 36%)',
        }}
      />

      <div className="pg-container py-14 sm:py-20">
        <header>
          <a href="/" className="pg-navlink">
            ← Volver a Play and Go
          </a>
          <p className="pg-eyebrow mt-9">Planes y acceso</p>
          <h1 className="pg-title">Elige cómo quieres aprender y crear</h1>
          <p className="pg-lede">
            Un solo precio por plan, leído del catálogo que cobra la pasarela. Empieza gratis con el
            motor local y sube de nivel cuando quieras composiciones con voces del proveedor de pago.
          </p>
        </header>

        <div className="mt-12">
          <PricingTable />
        </div>

        <footer className="mt-20">
          <div className="pg-rule" />
          <p className="pg-note mt-6 text-center">
            Play and Go by TAMV ONLINE <span aria-hidden>·</span> Orgullosamente Realmontenses
          </p>
        </footer>
      </div>
    </main>
  )
}
