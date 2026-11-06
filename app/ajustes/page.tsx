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
  return <main className="min-h-screen bg-[#07121f] text-[#edfaff]"><div className="relative mx-auto max-w-4xl px-5 py-8 sm:px-8 lg:py-12"><header className="flex items-center justify-between"><Link href="/" className="nav-link text-sm text-cyan-200">← Volver al inicio</Link><SlidersHorizontal className="text-cyan-200" /></header><section className="pt-16"><p className="eyebrow text-cyan-200">Cuenta y sistema</p><h1 className="mt-3 text-4xl font-semibold tracking-tight">Ajustes</h1><p className="mt-3 max-w-xl text-sm leading-6 text-[#9fb8c7]">Configura tu espacio creativo para que la interfaz se sienta tan personal como tu sonido.</p></section><div className="crystal-divider my-10" /><section className="crystal-panel overflow-hidden rounded-3xl">{settings.map(([title, copy, Icon], index) => <button key={title as string} className={`flex w-full items-center gap-4 p-5 text-left transition hover:bg-white/[.06] ${index ? 'border-t border-white/10' : ''}`}><span className="flex size-11 items-center justify-center rounded-2xl bg-cyan-300/10 text-cyan-200"><Icon size={19} /></span><span className="flex-1"><strong className="block text-sm">{title as string}</strong><small className="mt-1 block text-xs text-[#849da9]">{copy as string}</small></span><ChevronRight size={18} className="text-[#6f8995]" /></button>)}</section><div className="mt-8 rounded-2xl border border-amber-200/20 bg-amber-100/5 p-5 text-sm text-[#d8c99d]"><strong className="text-amber-200">Tu espacio está protegido.</strong> Las preferencias se guardarán con tu cuenta cuando actives la sesión.</div></div></main>
}
