'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { ArrowLeft, ArrowRight, AudioLines, BookOpen, Check, Compass, Music2, Sparkles } from 'lucide-react'

type Goal = 'learn' | 'create' | 'analyze' | 'explore'
type Level = 'beginner' | 'intermediate' | 'advanced' | 'exploring'
type Objective = 'first-track' | 'mixing' | 'ai' | 'producer'
type Experience = 'studio' | 'audiocore' | 'academy' | 'ai-lab'

const goals: { id: Goal; title: string; detail: string; icon: typeof Music2 }[] = [
  { id: 'learn', title: 'Aprender producción musical', detail: 'Fundamentos, práctica y una ruta clara.', icon: BookOpen },
  { id: 'create', title: 'Crear mi primera idea', detail: 'Pasa de una descripción a una primera pista.', icon: Music2 },
  { id: 'analyze', title: 'Analizar una canción', detail: 'Explora el audio y aprende a leer sus características.', icon: AudioLines },
  { id: 'explore', title: 'Explorar Play & Go', detail: 'Conoce las herramientas antes de decidir.', icon: Compass },
]

const levels: { id: Level; title: string; detail: string }[] = [
  { id: 'beginner', title: 'Principiante', detail: 'Quiero entender los fundamentos.' },
  { id: 'intermediate', title: 'Intermedio', detail: 'Ya produzco y quiero mejorar.' },
  { id: 'advanced', title: 'Avanzado', detail: 'Busco análisis técnico e IA aplicada.' },
  { id: 'exploring', title: 'Solo explorando', detail: 'Quiero descubrir qué puedo hacer.' },
]

const objectives: { id: Objective; title: string; detail: string }[] = [
  { id: 'first-track', title: 'Mi primera producción', detail: 'Construir una idea musical desde cero.' },
  { id: 'mixing', title: 'Mejorar mis mezclas', detail: 'Entender frecuencia, dinámica y balance.' },
  { id: 'ai', title: 'Usar IA musical', detail: 'Explorar generación y asistencia creativa.' },
  { id: 'producer', title: 'Convertirme en productor', detail: 'Seguir una ruta de aprendizaje completa.' },
]

const experiences: { id: Experience; title: string; detail: string; icon: typeof Music2; href: string; action: string }[] = [
  { id: 'studio', title: 'Crear una idea musical', detail: 'Abre Studio y empieza a construir una pista.', icon: Music2, href: '/studio', action: 'Abrir Studio' },
  { id: 'audiocore', title: 'Explorar AudioCore', detail: 'Conoce el contrato técnico y las capacidades de análisis disponibles.', icon: AudioLines, href: '/audiocore', action: 'Explorar AudioCore' },
  { id: 'academy', title: 'Comenzar Academy', detail: 'Entra al curso y elige tu primera lección.', icon: BookOpen, href: '/academy', action: 'Comenzar Academy' },
  { id: 'ai-lab', title: 'Conocer AI Lab', detail: 'Revisa los principios y las herramientas de IA musical.', icon: Sparkles, href: '/ai-lab', action: 'Conocer AI Lab' },
]

function ChoiceCard({ selected, title, detail, onClick, icon: Icon }: {
  selected: boolean
  title: string
  detail: string
  onClick: () => void
  icon?: typeof Music2
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={`group flex h-full w-full items-start gap-3 rounded-2xl border p-4 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 ${selected ? 'border-cyan-300/70 bg-cyan-300/[.09]' : 'border-white/10 bg-white/[.025] hover:border-white/25 hover:bg-white/[.05]'}`}
    >
      {Icon ? <Icon size={19} className={selected ? 'mt-0.5 shrink-0 text-cyan-200' : 'mt-0.5 shrink-0 text-white/50'} aria-hidden /> : null}
      <span className="min-w-0 flex-1">
        <span className="flex items-center justify-between gap-3 font-medium text-white">{title}{selected ? <Check size={16} className="shrink-0 text-cyan-200" aria-hidden /> : null}</span>
        <span className="mt-1 block text-sm leading-5 text-white/55">{detail}</span>
      </span>
    </button>
  )
}

export function ActivationFlow() {
  const [step, setStep] = useState(0)
  const [goal, setGoal] = useState<Goal>('create')
  const [level, setLevel] = useState<Level>('beginner')
  const [objective, setObjective] = useState<Objective>('first-track')
  const [experience, setExperience] = useState<Experience>('studio')

  const selectedExperience = useMemo(
    () => experiences.find((item) => item.id === experience) ?? experiences[0],
    [experience],
  )

  const steps = [
    { eyebrow: 'TU PUNTO DE PARTIDA', title: '¿Qué quieres lograr primero?' },
    { eyebrow: 'TU NIVEL', title: '¿Dónde estás hoy?' },
    { eyebrow: 'TU OBJETIVO', title: '¿Qué quieres construir?' },
    { eyebrow: 'TU PRIMERA EXPERIENCIA', title: 'Elige una acción real' },
  ]

  return (
    <main className="pg-shell min-h-screen overflow-x-clip" style={{ background: 'var(--pg-bg)' }}>
      <div aria-hidden className="pg-glow" />
      <div className="pg-container relative z-10 max-w-4xl py-8 sm:py-14">
        <Link href="/" className="pg-navlink inline-flex items-center gap-2"><ArrowLeft size={14} aria-hidden /> PLAY &amp; GO</Link>
        <div className="mt-10 grid gap-8 md:grid-cols-[.75fr_1.25fr] md:items-start">
          <aside className="md:sticky md:top-8">
            <p className="pg-eyebrow">Onboarding · menos de 3 minutos</p>
            <h1 className="pg-title mt-4">Tu música comienza con una idea.</h1>
            <p className="pg-lede mt-4">Personaliza tu punto de partida y entra directamente a aprender, crear o analizar. No necesitas completar un tutorial largo para empezar.</p>
            <div className="mt-7 flex gap-2" aria-label={`Paso ${step + 1} de ${steps.length}`}>
              {steps.map((item, index) => <span key={item.eyebrow} className={`h-1.5 flex-1 rounded-full ${index <= step ? 'bg-cyan-300' : 'bg-white/10'}`} />)}
            </div>
            <p className="pg-note mt-3">Paso {step + 1} de {steps.length}</p>
          </aside>

          <section className="pg-card p-5 sm:p-8" aria-live="polite">
            <p className="pg-eyebrow">{steps[step].eyebrow}</p>
            <h2 className="pg-block-title mt-2">{steps[step].title}</h2>

            {step === 0 ? (
              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                {goals.map((item) => <ChoiceCard key={item.id} selected={goal === item.id} title={item.title} detail={item.detail} icon={item.icon} onClick={() => setGoal(item.id)} />)}
              </div>
            ) : null}

            {step === 1 ? (
              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                {levels.map((item) => <ChoiceCard key={item.id} selected={level === item.id} title={item.title} detail={item.detail} onClick={() => setLevel(item.id)} />)}
              </div>
            ) : null}

            {step === 2 ? (
              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                {objectives.map((item) => <ChoiceCard key={item.id} selected={objective === item.id} title={item.title} detail={item.detail} onClick={() => setObjective(item.id)} />)}
              </div>
            ) : null}

            {step === 3 ? (
              <>
                <p className="mt-3 text-sm leading-6 text-white/60">Selecciona el destino que mejor se ajuste a lo que buscas. Te llevaremos a la herramienta existente, sin simular una generación ni un análisis que aún no se haya ejecutado.</p>
                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  {experiences.map((item) => <ChoiceCard key={item.id} selected={experience === item.id} title={item.title} detail={item.detail} icon={item.icon} onClick={() => setExperience(item.id)} />)}
                </div>
                <div className="mt-5 rounded-xl border border-white/10 bg-white/[.025] p-4">
                  <p className="pg-eyebrow">Tu ruta seleccionada</p>
                  <p className="mt-2 text-sm text-white/80">{goals.find((item) => item.id === goal)?.title} · {levels.find((item) => item.id === level)?.title} · {objectives.find((item) => item.id === objective)?.title}</p>
                </div>
              </>
            ) : null}

            <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-5">
              <button type="button" onClick={() => setStep((value) => Math.max(0, value - 1))} disabled={step === 0} className="pg-btn pg-btn-ghost disabled:cursor-not-allowed disabled:opacity-30">
                <ArrowLeft size={14} aria-hidden /> Atrás
              </button>
              {step < 3 ? (
                <button type="button" onClick={() => setStep((value) => Math.min(3, value + 1))} className="pg-btn pg-btn-primary">
                  Continuar <ArrowRight size={14} aria-hidden />
                </button>
              ) : (
                <Link href={selectedExperience.href} className="pg-btn pg-btn-primary">
                  {selectedExperience.action} <ArrowRight size={14} aria-hidden />
                </Link>
              )}
            </div>
          </section>
        </div>
      </div>
    </main>
  )
}
