import Link from 'next/link'
import { BookOpen, CreditCard, Music2, Sparkles, TrendingUp, UserRound } from 'lucide-react'

/**
 * Navegación del área personal.
 *
 * Las cuatro pantallas que usa una cuenta —perfil, música, estudio y pago—
 * vivían aisladas: desde `/perfil` había que volver a la portada para llegar a
 * la biblioteca, y desde la biblioteca no existía un camino visible a los
 * planes. Esta barra es la misma en todas y marca dónde está la persona.
 */
const TABS = [
  { id: 'perfil', href: '/perfil', label: 'Mi perfil', icon: UserRound },
  { id: 'curso', href: '/curso', label: 'Curso', icon: BookOpen },
  { id: 'crecimiento', href: '/crecimiento', label: 'Crecimiento', icon: TrendingUp },
  { id: 'voz', href: '/voz', label: 'Voz', icon: Sparkles },
  { id: 'musica', href: '/biblioteca', label: 'Mi música', icon: Music2 },
  { id: 'estudio', href: '/studio', label: 'Estudio', icon: Sparkles },
  { id: 'pagos', href: '/precios', label: 'Planes y pago', icon: CreditCard },
] as const

export type AccountTab = (typeof TABS)[number]['id']

export function AccountTabs({ active }: { active: AccountTab }) {
  return (
    <nav aria-label="Área personal; desliza horizontalmente para ver todas las secciones" className="pg-scroll rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/70" tabIndex={0}>
      <div className="flex min-w-max items-center gap-2">
        {TABS.map((tab) => (
          <Link
            key={tab.href}
            href={tab.href}
            className="pg-seg"
            aria-current={tab.id === active ? 'page' : undefined}
          >
            <tab.icon size={14} aria-hidden />
            {tab.label}
          </Link>
        ))}
      </div>
    </nav>
  )
}
