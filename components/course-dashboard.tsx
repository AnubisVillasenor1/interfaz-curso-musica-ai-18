'use client'

import { useState } from 'react'
import {
  ArrowRight,
  BookOpen,
  Check,
  ChevronDown,
  Clock3,
  FileText,
  Headphones,
  Layers3,
  LayoutDashboard,
  LockKeyhole,
  Menu,
  Music2,
  Play,
  Search,
  Sparkles,
  Target,
  Trophy,
  Video,
  X,
  Zap,
} from 'lucide-react'
import { Button } from '@/components/ui/button'

const modules = [
  { number: '01', title: 'El mapa de la música con IA', lessons: 3, duration: '42 min', status: 'done' },
  { number: '02', title: 'Tu primer prompt musical', lessons: 4, duration: '1 h 15 min', status: 'current' },
  { number: '03', title: 'Voces, letras y emoción', lessons: 3, duration: '58 min', status: 'locked' },
  { number: '04', title: 'Géneros, instrumentación y tempo', lessons: 3, duration: '1 h 08 min', status: 'locked' },
  { number: '05', title: 'Producción: de idea a canción', lessons: 3, duration: '1 h 20 min', status: 'locked' },
]

const promptTemplates = [
  { title: 'Pop cinematográfico', tag: 'Voz + emoción', color: 'coral', prompt: 'Pop alternativo cinematográfico, 96 BPM, voz femenina íntima y aireada, versos minimalistas con piano felt, pre-coro ascendente, coro amplio con cuerdas y batería orgánica...' },
  { title: 'Reggaetón nocturno', tag: 'Ritmo + groove', color: 'violet', prompt: 'Reggaetón oscuro y elegante, 92 BPM, voz masculina suave con flow conversado, dembow profundo, synth bass cálido, percusión seca, atmósfera nocturna...' },
  { title: 'Lo-fi para estudiar', tag: 'Instrumental', color: 'amber', prompt: 'Lo-fi hip hop instrumental, 78 BPM, acordes de jazz en Rhodes, batería con swing humano, textura de vinilo, bajo redondo, ambiente de cafetería...' },
]

export function CourseDashboard() {
  const [activeNav, setActiveNav] = useState('Inicio')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [activeTemplate, setActiveTemplate] = useState<string | null>(null)
  const [showAllModules, setShowAllModules] = useState(false)

  const navItems = [
    { label: 'Inicio', icon: LayoutDashboard },
    { label: 'Mi ruta', icon: BookOpen },
    { label: 'Biblioteca de prompts', icon: Sparkles },
    { label: 'Recursos', icon: Layers3 },
  ]

  return (
    <div className="min-h-screen bg-[#0d0d12] text-[#f7f3ee]">
      <div className="flex min-h-screen">
        {sidebarOpen && <button aria-label="Cerrar menú" className="fixed inset-0 z-30 bg-black/60 lg:hidden" onClick={() => setSidebarOpen(false)} />}
        <aside className={`fixed inset-y-0 left-0 z-40 flex w-[250px] flex-col border-r border-white/8 bg-[#121218] transition-transform duration-200 lg:static lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
          <div className="flex h-[84px] items-center justify-between px-7">
            <div className="flex items-center gap-3">
              <div className="flex size-9 items-center justify-center rounded-xl bg-[#ef725f] text-[#211319]"><Music2 size={20} strokeWidth={2.5} /></div>
              <div><div className="font-semibold tracking-[-0.03em]">Sonora <span className="text-[#ef725f]">IA</span></div><div className="text-[10px] uppercase tracking-[0.2em] text-white/35">Academia musical</div></div>
            </div>
            <button className="text-white/50 lg:hidden" onClick={() => setSidebarOpen(false)} aria-label="Cerrar menú"><X size={19} /></button>
          </div>
          <div className="px-4 pt-8">
            <p className="px-3 pb-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-white/25">Aprende</p>
            <nav className="flex flex-col gap-1">
              {navItems.map(({ label, icon: Icon }) => <button key={label} onClick={() => { setActiveNav(label); setSidebarOpen(false) }} className={`flex items-center gap-3 rounded-xl px-3 py-3 text-sm transition ${activeNav === label ? 'bg-[#ef725f]/12 font-medium text-[#ff907d]' : 'text-white/50 hover:bg-white/5 hover:text-white/80'}`}><Icon size={17} /><span>{label}</span>{label === 'Biblioteca de prompts' && <span className="ml-auto rounded-full bg-[#ef725f]/15 px-1.5 py-0.5 text-[9px] text-[#ff907d]">12</span>}</button>)}
            </nav>
          </div>
          <div className="mt-auto p-4">
            <div className="rounded-2xl border border-white/8 bg-[#1a1a22] p-4">
              <div className="mb-3 flex items-center justify-between"><span className="text-[11px] font-medium text-white/50">Tu progreso</span><span className="text-xs font-semibold text-[#ff907d]">24%</span></div>
              <div className="mb-3 h-1.5 overflow-hidden rounded-full bg-white/8"><div className="h-full w-[24%] rounded-full bg-[#ef725f]" /></div>
              <p className="text-[11px] leading-relaxed text-white/40">Vas muy bien. Completa una lección más para desbloquear tu próxima insignia.</p>
            </div>
            <div className="mt-5 flex items-center gap-3 border-t border-white/8 pt-5"><div className="flex size-8 items-center justify-center rounded-full bg-[#d9a671] text-xs font-semibold text-[#31201a]">AV</div><div className="min-w-0"><p className="truncate text-xs font-medium">Anubis Villaseñor</p><p className="text-[10px] text-white/35">Estudiante Pro</p></div><ChevronDown className="ml-auto text-white/30" size={15} /></div>
          </div>
        </aside>

        <main className="min-w-0 flex-1">
          <header className="flex h-[84px] items-center justify-between border-b border-white/8 px-5 sm:px-8 lg:px-12">
            <button className="text-white/60 lg:hidden" onClick={() => setSidebarOpen(true)} aria-label="Abrir menú"><Menu size={21} /></button>
            <div className="relative hidden max-w-[310px] flex-1 sm:block"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-white/25" size={16} /><input aria-label="Buscar en el curso" placeholder="Buscar una lección, tema o prompt..." className="h-10 w-full rounded-xl border border-white/8 bg-white/[0.03] pl-10 pr-4 text-xs text-white outline-none placeholder:text-white/25 focus:border-[#ef725f]/60" /></div>
            <div className="ml-auto flex items-center gap-3 sm:gap-5"><button className="relative text-white/50 hover:text-white" aria-label="Notificaciones"><Zap size={18} /><span className="absolute -right-1 -top-1 size-1.5 rounded-full bg-[#ef725f]" /></button><div className="hidden h-5 w-px bg-white/10 sm:block" /><span className="text-xs text-white/45">Nivel 1</span><div className="flex size-8 items-center justify-center rounded-full bg-[#d9a671] text-[10px] font-semibold text-[#31201a]">AV</div></div>
          </header>

          <div className="mx-auto max-w-[1260px] px-5 py-9 sm:px-8 lg:px-12 lg:py-12">
            <section className="mb-10 flex flex-col justify-between gap-6 md:flex-row md:items-end"><div><p className="mb-3 text-xs font-medium uppercase tracking-[0.18em] text-[#ef725f]">Martes, 20 de octubre</p><h1 className="text-3xl font-semibold tracking-[-0.04em] sm:text-[38px]">Buenas tardes, Anubis <span className="text-[#ef725f]">↗</span></h1><p className="mt-3 text-sm text-white/45">Continúa construyendo tu sonido. Hoy es un buen día para crear.</p></div><Button onClick={() => setActiveNav('Mi ruta')} className="w-fit rounded-xl bg-[#ef725f] px-5 text-sm font-semibold text-[#281418] hover:bg-[#ff8b76]">Continuar aprendiendo <ArrowRight data-icon="inline-end" /></Button></section>

            <section className="mb-10 grid gap-4 md:grid-cols-[1.55fr_1fr_1fr]">
              <div className="relative overflow-hidden rounded-2xl border border-[#ef725f]/25 bg-gradient-to-br from-[#342229] to-[#1b171f] p-6 sm:p-7"><div className="absolute -right-8 -top-10 size-40 rounded-full bg-[#ef725f]/15 blur-3xl" /><div className="relative"><div className="mb-8 flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.16em] text-[#ff9788]"><Play size={12} fill="currentColor" /> En curso</div><h2 className="max-w-[300px] text-[22px] font-semibold leading-tight tracking-[-0.03em]">Tu primer prompt musical</h2><p className="mt-2 text-xs text-white/45">Módulo 02 · Lección 2 de 4</p><div className="mt-7 flex items-center gap-3"><div className="h-1.5 w-32 overflow-hidden rounded-full bg-white/10"><div className="h-full w-[50%] rounded-full bg-[#ef725f]" /></div><span className="text-[11px] text-white/45">50% completado</span></div></div></div>
              <div className="rounded-2xl border border-white/8 bg-[#15151c] p-6"><div className="mb-8 flex size-9 items-center justify-center rounded-xl bg-[#d9a671]/12 text-[#e5b47d]"><Trophy size={18} /></div><p className="text-3xl font-semibold tracking-[-0.04em]">24%</p><p className="mt-1 text-xs text-white/40">Progreso total</p><div className="mt-5 text-[11px] text-white/30">2 de 9 módulos</div></div>
              <div className="rounded-2xl border border-white/8 bg-[#15151c] p-6"><div className="mb-8 flex size-9 items-center justify-center rounded-xl bg-[#9b8ce7]/12 text-[#b7aef5]"><Clock3 size={18} /></div><p className="text-3xl font-semibold tracking-[-0.04em]">3.5h</p><p className="mt-1 text-xs text-white/40">Tiempo aprendido</p><div className="mt-5 text-[11px] text-[#9b8ce7]">+45 min esta semana</div></div>
            </section>

            <section className="mb-12"><div className="mb-5 flex items-end justify-between"><div><p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-white/30">Tu camino</p><h2 className="text-xl font-semibold tracking-[-0.03em]">Ruta de aprendizaje</h2></div><button onClick={() => setShowAllModules(!showAllModules)} className="flex items-center gap-1 text-xs text-[#ff907d] hover:text-[#ffad9e]">{showAllModules ? 'Ver menos' : 'Ver todos'} <ArrowRight size={13} /></button></div><div className="grid gap-2"><div className="mb-1 flex items-center gap-2"><div className="h-px flex-1 bg-[#ef725f]/25" /><span className="text-[10px] text-[#ef725f]">EN PROGRESO</span><div className="h-px flex-1 bg-[#ef725f]/25" /></div>{modules.slice(0, showAllModules ? modules.length : 4).map((module) => <button key={module.number} onClick={() => module.status !== 'locked' && setActiveNav('Mi ruta')} className={`group flex items-center gap-4 rounded-2xl border p-4 text-left transition ${module.status === 'current' ? 'border-[#ef725f]/35 bg-[#ef725f]/[0.06]' : 'border-white/7 bg-[#15151c] hover:border-white/15'} ${module.status === 'locked' ? 'cursor-default opacity-60' : ''}`}><div className={`flex size-10 shrink-0 items-center justify-center rounded-xl text-xs font-semibold ${module.status === 'done' ? 'bg-[#8bbd9c]/15 text-[#9ed7ae]' : module.status === 'current' ? 'bg-[#ef725f] text-[#2a1617]' : 'bg-white/6 text-white/30'}`}>{module.status === 'done' ? <Check size={17} /> : module.status === 'locked' ? <LockKeyhole size={15} /> : module.number}</div><div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{module.title}</p><div className="mt-1 flex gap-3 text-[11px] text-white/35"><span>{module.lessons} lecciones</span><span>·</span><span>{module.duration}</span></div></div>{module.status === 'current' && <span className="hidden rounded-full bg-[#ef725f]/12 px-2.5 py-1 text-[10px] text-[#ff907d] sm:block">Siguiente</span>}<ArrowRight className="text-white/20 transition group-hover:translate-x-0.5 group-hover:text-white/50" size={16} /></button>)}</div></section>

            <section><div className="mb-5 flex items-end justify-between"><div><p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-white/30">Para inspirarte</p><h2 className="text-xl font-semibold tracking-[-0.03em]">Plantillas de prompts</h2></div><button onClick={() => setActiveNav('Biblioteca de prompts')} className="flex items-center gap-1 text-xs text-[#ff907d] hover:text-[#ffad9e]">Explorar biblioteca <ArrowRight size={13} /></button></div><div className="grid gap-4 lg:grid-cols-3">{promptTemplates.map((template) => <button key={template.title} onClick={() => setActiveTemplate(template.title)} className="group overflow-hidden rounded-2xl border border-white/8 bg-[#15151c] text-left transition hover:-translate-y-0.5 hover:border-white/20"><div className={`relative h-28 overflow-hidden ${template.color === 'coral' ? 'bg-gradient-to-br from-[#49302d] via-[#8c5045] to-[#22202c]' : template.color === 'violet' ? 'bg-gradient-to-br from-[#28223d] via-[#514479] to-[#171723]' : 'bg-gradient-to-br from-[#493b2b] via-[#91734e] to-[#242027]'}`}><div className="absolute inset-0 opacity-40" style={{ backgroundImage: 'radial-gradient(ellipse at 20% 80%, transparent 20%, rgba(10,8,14,.6) 70%), repeating-radial-gradient(ellipse at 80% 30%, transparent 0 8px, rgba(255,255,255,.12) 9px 10px)' }} /><span className="absolute left-4 top-4 rounded-full border border-white/15 bg-black/15 px-2.5 py-1 text-[9px] font-medium uppercase tracking-[0.12em] text-white/75">{template.tag}</span><Music2 className="absolute bottom-4 right-5 text-white/25" size={31} /></div><div className="p-4"><h3 className="text-sm font-medium">{template.title}</h3><p className="mt-2 line-clamp-2 text-[11px] leading-relaxed text-white/35">{template.prompt}</p><div className="mt-4 flex items-center gap-1.5 text-[10px] text-[#ff907d]">Usar plantilla <ArrowRight size={12} /></div></div></button>)}</div></section>
          </div>
        </main>
      </div>
      {activeTemplate && <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={() => setActiveTemplate(null)}><div className="w-full max-w-lg rounded-2xl border border-white/10 bg-[#1a1a22] p-6 shadow-2xl" onClick={(event) => event.stopPropagation()}><div className="mb-5 flex items-start justify-between"><div><p className="mb-2 text-[10px] uppercase tracking-[0.18em] text-[#ef725f]">Plantilla de prompt</p><h2 className="text-xl font-semibold">{activeTemplate}</h2></div><button onClick={() => setActiveTemplate(null)} className="text-white/40 hover:text-white" aria-label="Cerrar"><X size={18} /></button></div><p className="rounded-xl border border-white/8 bg-black/15 p-4 text-sm leading-relaxed text-white/65">{promptTemplates.find((item) => item.title === activeTemplate)?.prompt}</p><Button onClick={() => setActiveTemplate(null)} className="mt-5 w-full rounded-xl bg-[#ef725f] text-[#281418] hover:bg-[#ff8b76]">Copiar y personalizar <FileText data-icon="inline-end" /></Button></div></div>}
    </div>
  )
}
