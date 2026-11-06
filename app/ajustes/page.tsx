'use client'

import Link from 'next/link'
import { Bell, ChevronRight, Moon, ShieldCheck, SlidersHorizontal, Volume2 } from 'lucide-react'

const settings = [
  ['Experiencia visual', 'Modo oscuro cinematográfico', Moon],
  ['Reproducción', 'Ecualizador y muestra del intro', Volume2],
  ['Notificaciones', 'Recordatorios de práctica y lanzamientos', Bell],
  ['Privacidad', 'Sesiones, datos y seguridad de cuenta', ShieldCheck],
]

export default function AjustesPage() {
  return <main className="pg-shell relative min-h-screen" style={{ background: 'var(--pg-bg)' }}><div className="pg-container relative max-w-4xl py-8 lg:py-12"><header className="flex items-center justify-between"><Link href="/" className="pg-navlink">← Volver al inicio</Link><SlidersHorizontal className="pg-accent-cyan" /></header><section className="pt-16"><p className="pg-eyebrow">Cuenta y sistema</p><h1 className="pg-title">Ajustes</h1><p className="pg-lede">Configura tu espacio creativo para que la interfaz se sienta tan personal como tu sonido.</p></section><div className="pg-rule my-10" /><section className="pg-panel overflow-hidden p-0">{settings.map(([title, copy, Icon], index) => <button key={title as string} className={`flex w-full items-center gap-4 p-5 text-left transition hover:bg-white/[.06] ${index ? 'border-t border-white/10' : ''}`}><span className="pg-mark"><Icon size={19} /></span><span className="flex-1"><strong className="pg-item-title block">{title as string}</strong><small className="pg-note mt-1 block">{copy as string}</small></span><ChevronRight size={18} className="pg-accent-muted" /></button>)}</section><div className="pg-callout mt-8 p-5 text-sm leading-6"><strong className="pg-accent-amber">Tu espacio está protegido.</strong> Las preferencias se guardarán con tu cuenta cuando actives la sesión.</div></div></main>
}
