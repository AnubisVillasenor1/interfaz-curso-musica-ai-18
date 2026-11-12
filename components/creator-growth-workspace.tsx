'use client'

import { useState } from 'react'
import { Activity, ArrowUpRight, CheckCircle2, Clock3, Compass, LoaderCircle, Sparkles, Target } from 'lucide-react'

type Profile = { stage: string; primary_goal: string | null; genre: string | null; skills: string[]; available_hours_per_week: number | null; budget_level: string | null; audience_size: number }
type Plan = { id: string; horizon_days: number; focus_area: string; ai_summary: string | null; plan: { steps?: Array<{ id: string; week: number; phase: string; title: string; description: string; actions: string[]; completed?: boolean }> }; created_at: string }
type Opportunity = { id: string; title: string; description: string; category: string; difficulty: string; time_to_first_result: string | null; recommended_actions: string[] }
type InitialData = { profile: Profile | null; plans: Plan[]; opportunities: Opportunity[] }

const focusLabels: Record<string, string> = { audience: 'Audiencia', catalog: 'Catálogo', income: 'Ingresos creativos', craft: 'Oficio musical' }
const stageLabels: Record<string, string> = { explorer: 'Exploración', developing: 'Desarrollo', launching: 'Lanzamiento', professional: 'Profesional' }

export function CreatorGrowthWorkspace({ initialData }: { initialData: InitialData }) {
  const [profile, setProfile] = useState<Profile | null>(initialData.profile)
  const [plans, setPlans] = useState(initialData.plans)
  const [opportunities, setOpportunities] = useState(initialData.opportunities)
  const [busy, setBusy] = useState(false)
  const [busyStepId, setBusyStepId] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [form, setForm] = useState({ stage: profile?.stage ?? 'explorer', primaryGoal: profile?.primary_goal ?? '', genre: profile?.genre ?? '', skills: profile?.skills?.join(', ') ?? '', availableHoursPerWeek: String(profile?.available_hours_per_week ?? 5), budgetLevel: profile?.budget_level ?? 'low', audienceSize: String(profile?.audience_size ?? 0), horizonDays: 30, focusArea: 'audience' })
  const activePlan = plans[0]

  async function toggleStep(planId: string, stepId: string, completed: boolean) {
    setBusyStepId(stepId)
    setError('')
    setNotice('')
    try {
      const response = await fetch('/api/growth', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ planId, stepId, completed }),
      })
      const body = await response.json()
      if (!response.ok) throw new Error(body.error ?? 'No se pudo guardar el avance.')
      setPlans((current) => current.map((item) => item.id === planId ? { ...item, plan: body.plan } : item))
      setNotice(completed ? 'Paso guardado como completado.' : 'Paso marcado como pendiente.')
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Ocurrió un error inesperado.')
    } finally {
      setBusyStepId(null)
    }
  }

  async function createPlan(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setBusy(true); setError(''); setNotice('')
    try {
      const response = await fetch('/api/growth', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ ...form, availableHoursPerWeek: Number(form.availableHoursPerWeek), audienceSize: Number(form.audienceSize), skills: form.skills.split(',').map((item) => item.trim()).filter(Boolean) }) })
      const body = await response.json()
      if (!response.ok) throw new Error(body.error ?? 'No se pudo crear el plan.')
      setProfile(body.profile); setPlans((current) => [body.plan, ...current].slice(0, 5)); setOpportunities((current) => [...body.opportunities, ...current].slice(0, 8)); setNotice('Tu perfil y nueva ruta quedaron guardados en tu cuenta.')
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Ocurrió un error inesperado.') }
    finally { setBusy(false) }
  }

  return <div className="space-y-6">
    <section className="pg-card overflow-hidden p-6 md:p-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div><p className="pg-eyebrow">Creator Operating System · crecimiento</p><h2 className="pg-block-title mt-2">Tu siguiente etapa, con un plan realista</h2><p className="pg-note mt-2 max-w-2xl">Cuéntanos dónde estás y qué quieres construir. La ruta distribuye acciones pequeñas según tu tiempo, presupuesto y prioridades; no promete audiencia ni ingresos.</p></div>
        <span className="pg-chip" data-tone="mint"><Activity size={14} className="mr-1 inline"/>Plan personal</span>
      </div>
      <form onSubmit={createPlan} className="mt-7 grid gap-4 md:grid-cols-2">
        <label className="block md:col-span-2"><span className="pg-label mb-2 block">¿Qué quieres lograr primero?</span><input required maxLength={240} value={form.primaryGoal} onChange={(event) => setForm({ ...form, primaryGoal: event.target.value })} placeholder="Ej. terminar mi primer EP y compartirlo con una audiencia propia" className="w-full rounded-xl border bg-transparent p-3" style={{ borderColor: 'var(--pg-line)', color: 'var(--pg-ink)' }}/></label>
        <label className="block"><span className="pg-label mb-2 block">Etapa actual</span><select value={form.stage} onChange={(event) => setForm({ ...form, stage: event.target.value })} className="w-full rounded-xl border bg-transparent p-3" style={{ borderColor: 'var(--pg-line)', color: 'var(--pg-ink)' }}><option value="explorer">Exploración</option><option value="developing">Desarrollo</option><option value="launching">Lanzamiento</option><option value="professional">Profesional</option></select></label>
        <label className="block"><span className="pg-label mb-2 block">Género o escena</span><input required maxLength={80} value={form.genre} onChange={(event) => setForm({ ...form, genre: event.target.value })} placeholder="Ej. electrónica ambiental" className="w-full rounded-xl border bg-transparent p-3" style={{ borderColor: 'var(--pg-line)', color: 'var(--pg-ink)' }}/></label>
        <label className="block"><span className="pg-label mb-2 block">Habilidades (separadas por coma)</span><input required value={form.skills} onChange={(event) => setForm({ ...form, skills: event.target.value })} placeholder="Composición, mezcla, teclado" className="w-full rounded-xl border bg-transparent p-3" style={{ borderColor: 'var(--pg-line)', color: 'var(--pg-ink)' }}/></label>
        <label className="block"><span className="pg-label mb-2 block">Enfoque de la ruta</span><select value={form.focusArea} onChange={(event) => setForm({ ...form, focusArea: event.target.value })} className="w-full rounded-xl border bg-transparent p-3" style={{ borderColor: 'var(--pg-line)', color: 'var(--pg-ink)' }}><option value="audience">Audiencia y comunidad</option><option value="catalog">Catálogo y lanzamientos</option><option value="income">Ingresos creativos</option><option value="craft">Oficio y práctica</option></select></label>
        <label className="block"><span className="pg-label mb-2 block">Horas disponibles por semana</span><input type="number" min={1} max={80} required value={form.availableHoursPerWeek} onChange={(event) => setForm({ ...form, availableHoursPerWeek: event.target.value })} className="w-full rounded-xl border bg-transparent p-3" style={{ borderColor: 'var(--pg-line)', color: 'var(--pg-ink)' }}/></label>
        <label className="block"><span className="pg-label mb-2 block">Presupuesto de trabajo</span><select value={form.budgetLevel} onChange={(event) => setForm({ ...form, budgetLevel: event.target.value })} className="w-full rounded-xl border bg-transparent p-3" style={{ borderColor: 'var(--pg-line)', color: 'var(--pg-ink)' }}><option value="none">Sin presupuesto</option><option value="low">Limitado</option><option value="medium">Moderado</option><option value="high">Flexible</option></select></label>
        <label className="block"><span className="pg-label mb-2 block">Tamaño de audiencia actual</span><input type="number" min={0} max={100000000} value={form.audienceSize} onChange={(event) => setForm({ ...form, audienceSize: event.target.value })} className="w-full rounded-xl border bg-transparent p-3" style={{ borderColor: 'var(--pg-line)', color: 'var(--pg-ink)' }}/></label>
        <label className="block"><span className="pg-label mb-2 block">Horizonte</span><select value={form.horizonDays} onChange={(event) => setForm({ ...form, horizonDays: Number(event.target.value) })} className="w-full rounded-xl border bg-transparent p-3" style={{ borderColor: 'var(--pg-line)', color: 'var(--pg-ink)' }}><option value={30}>30 días</option><option value={60}>60 días</option><option value={90}>90 días</option></select></label>
        <div className="flex items-end"><button type="submit" disabled={busy} className="pg-btn pg-btn-primary inline-flex w-full items-center justify-center gap-2 disabled:opacity-60">{busy ? <LoaderCircle size={16} className="animate-spin"/> : <Sparkles size={16}/>} {busy ? 'Creando ruta…' : 'Guardar perfil y crear ruta'}</button></div>
      </form>
      {error && <p role="alert" className="mt-4 rounded-lg border p-3 text-sm">{error}</p>}{notice && <p role="status" className="mt-4 rounded-lg border p-3 text-sm">{notice}</p>}
    </section>

    {activePlan ? <section className="pg-card p-6 md:p-8"><div className="flex flex-wrap items-start justify-between gap-4"><div><p className="pg-eyebrow">Ruta activa · {activePlan.horizon_days} días</p><h2 className="pg-block-title mt-2">{focusLabels[activePlan.focus_area] ?? activePlan.focus_area}</h2><p className="pg-note mt-2 max-w-2xl">{activePlan.ai_summary}</p></div><span className="pg-chip" data-tone="cyan"><Target size={14} className="mr-1 inline"/>{stageLabels[profile?.stage ?? 'explorer'] ?? 'Tu etapa'}</span></div><ol className="mt-6 grid gap-3 md:grid-cols-2">{(activePlan.plan?.steps ?? []).map((step) => <li key={step.id} className="rounded-xl border p-4" style={{ borderColor: 'var(--pg-line)' }}><div className="flex items-center justify-between gap-3"><span className="pg-label">{step.phase} · Semana {step.week}</span><Clock3 size={15} className="pg-accent-muted"/></div><h3 className="mt-2 font-semibold" style={{ color: 'var(--pg-ink)' }}>{step.title}</h3><p className="pg-note mt-2">{step.description}</p><button type="button" disabled={busyStepId === step.id} aria-pressed={Boolean(step.completed)} aria-label={step.completed ? `Marcar ${step.title} como pendiente` : `Marcar ${step.title} como completado`} onClick={() => void toggleStep(activePlan.id, step.id, !step.completed)} className="pg-btn pg-btn-ghost pg-btn-sm mt-3 inline-flex items-center gap-2 disabled:opacity-50"><CheckCircle2 size={14} aria-hidden="true" />{busyStepId === step.id ? 'Guardando…' : step.completed ? 'Completado · deshacer' : 'Marcar como completado'}</button><ul className="mt-3 space-y-2">{step.actions.map((action) => <li key={action} className="pg-note flex gap-2"><CheckCircle2 size={15} className="pg-accent-cyan mt-0.5 shrink-0"/>{action}</li>)}</ul></li>)}</ol></section> : <section className="pg-card flex items-center gap-4 p-6"><Compass className="pg-accent-cyan"/><div><h2 className="pg-block-title">Tu ruta aparecerá aquí</h2><p className="pg-note mt-1">Completa el perfil para crear y guardar tu primer plan de crecimiento.</p></div></section>}

    <section><div className="mb-4 flex items-end justify-between gap-3"><div><p className="pg-eyebrow">Oportunidades sugeridas</p><h2 className="pg-block-title mt-1">Acciones que encajan contigo</h2></div><span className="pg-note">Orientación, no garantías</span></div>{opportunities.length ? <div className="grid gap-4 md:grid-cols-2">{opportunities.map((item) => <article key={item.id + item.title} className="pg-card p-5"><span className="pg-chip" data-tone="violet">{focusLabels[item.category] ?? item.category}</span><h3 className="mt-3 font-semibold" style={{ color: 'var(--pg-ink)' }}>{item.title}</h3><p className="pg-note mt-2">{item.description}</p><p className="pg-note mt-3">Dificultad {item.difficulty} · Primer resultado: {item.time_to_first_result ?? 'a tu ritmo'}</p><ul className="mt-3 space-y-2">{item.recommended_actions?.map((action) => <li key={action} className="pg-note flex gap-2"><ArrowUpRight size={14} className="pg-accent-violet mt-0.5 shrink-0"/>{action}</li>)}</ul></article>)}</div> : <p className="pg-card pg-note p-5">Crea una ruta para recibir oportunidades alineadas con tu perfil.</p>}</section>
  </div>
}
