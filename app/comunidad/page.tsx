import type { Metadata } from 'next'
import Link from 'next/link'

import { TamvQuote } from '@/components/tamv-quote'

export const metadata: Metadata = {
  title: 'Comunidad',
  description: 'Retos creativos y espacio de aprendizaje de Play and Go por TAMV Online Network.',
}

const RETOS = [
  { title: 'Mi territorio suena', copy: 'Una canción que cuente un lugar que conoces: su calle, su ritmo, su gente.' },
  { title: 'Una historia de mi barrio', copy: 'De una escena real a cinco decisiones musicales y una primera pieza.' },
  { title: 'Tradición y futuro', copy: 'Un sonido de tu origen dialogue con un lenguaje nuevo.' },
  { title: 'Mi primera banda sonora', copy: 'Pista instrumental de 60 segundos para un video que cuentas tú.' },
  { title: 'Mi Nodo Cero', copy: 'Tu obra final: historia personal, estructura completa y créditos honestos.' },
]

export default function ComunidadPage() {
  return (
    <main className="pg-shell min-h-screen px-5 py-12" style={{ background: 'var(--pg-bg)' }}>
      <div className="pg-container max-w-4xl">
        <p className="pg-eyebrow">Academia + Estudio + Portafolio</p>
        <h1 className="pg-title mt-2">Comunidad</h1>
        <p className="pg-lede mt-3">Retos creativos para aprender en público, con créditos y acuerdos claros. La publicación de tus obras es siempre voluntaria.</p>
        <div className="mt-8 grid gap-4 md:grid-cols-2">
          {RETOS.map((reto) => (
            <article key={reto.title} className="pg-card p-5">
              <h2 className="pg-section-title">{reto.title}</h2>
              <p className="pg-note mt-2">{reto.copy}</p>
              <Link href="/studio" className="pg-minilink mt-3 inline-block">Crear en el estudio →</Link>
            </article>
          ))}
        </div>
        <div className="mt-12">
          <TamvQuote variant="section" />
        </div>
      </div>
    </main>
  )
}
