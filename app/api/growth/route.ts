import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { SUPABASE_NOT_CONFIGURED } from '@/lib/supabase/config'
import { enforcePolicy } from '@/lib/rate-limit'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const stages = ['explorer', 'developing', 'launching', 'professional'] as const
const budgetLevels = ['none', 'low', 'medium', 'high'] as const
const horizons = [30, 60, 90] as const
const focusAreas = ['audience', 'catalog', 'income', 'craft'] as const
const recommendations = [
  { category: 'audience', title: 'Publica una pieza de proceso', description: 'Comparte una decisión concreta de producción y termina con una pregunta que invite a conversar.', difficulty: 'low', time_to_first_result: '1 semana', required_assets: ['fragmento de audio', 'breve explicación'], recommended_actions: ['Elige un fragmento de 15–30 segundos', 'Explica una decisión creativa', 'Responde a los comentarios'] },
  { category: 'catalog', title: 'Prepara un lanzamiento pequeño', description: 'Convierte una idea terminada en un lanzamiento con metadatos, portada y una fecha realista.', difficulty: 'medium', time_to_first_result: '2–4 semanas', required_assets: ['master final', 'portada', 'metadatos'], recommended_actions: ['Revisa mezcla y master', 'Confirma titularidad y permisos', 'Define fecha y canales'] },
  { category: 'income', title: 'Diseña una oferta de servicio', description: 'Empaqueta una habilidad que ya tienes en una oferta concreta y fácil de evaluar.', difficulty: 'medium', time_to_first_result: '2–3 semanas', required_assets: ['portafolio', 'alcance del servicio'], recommended_actions: ['Define entregables y revisiones', 'Prepara dos ejemplos', 'Solicita opinión antes de publicar'] },
  { category: 'craft', title: 'Completa un ciclo de práctica', description: 'Practica una habilidad puntual y documenta qué cambió entre el primer y el último intento.', difficulty: 'low', time_to_first_result: '1 semana', required_assets: ['sesión de proyecto'], recommended_actions: ['Elige una técnica', 'Practica en sesiones breves', 'Compara antes y después'] },
] as const

function isChoice<T extends readonly string[]>(value: unknown, choices: T): value is T[number] {
  return typeof value === 'string' && choices.includes(value)
}
function isText(value: unknown, max: number): value is string {
  return typeof value === 'string' && value.trim().length <= max
}
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export async function GET() {
  const supabase = await createClient()
  if (!supabase) return NextResponse.json({ error: SUPABASE_NOT_CONFIGURED }, { status: 503 })
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Inicia sesión para ver tu ruta de crecimiento.' }, { status: 401 })
  const admin = createAdminClient()
  if (!admin) return NextResponse.json({ error: 'El servicio de crecimiento no está configurado.' }, { status: 503 })
  const [profile, plans, opportunities] = await Promise.all([
    admin.from('creator_profiles').select('id,stage,primary_goal,genre,skills,available_hours_per_week,budget_level,audience_size,monetization_interest,created_at,updated_at').eq('user_id', user.id).maybeSingle(),
    admin.from('growth_plans').select('id,horizon_days,focus_area,status,plan,ai_summary,created_at').eq('user_id', user.id).order('created_at', { ascending: false }).limit(5),
    admin.from('monetization_opportunities').select('id,title,description,category,difficulty,time_to_first_result,required_assets,recommended_actions,fit_score,created_at').eq('user_id', user.id).order('created_at', { ascending: false }).limit(8),
  ])
  const failure = profile.error ?? plans.error ?? opportunities.error
  if (failure) return NextResponse.json({ error: 'No se pudieron cargar tus datos de crecimiento.' }, { status: 503 })
  return NextResponse.json({ profile: profile.data, plans: plans.data ?? [], opportunities: opportunities.data ?? [] }, { headers: { 'Cache-Control': 'private, no-store' } })
}

export async function POST(request: Request) {
  const supabase = await createClient()
  if (!supabase) return NextResponse.json({ error: SUPABASE_NOT_CONFIGURED }, { status: 503 })
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Inicia sesión para guardar tu ruta.' }, { status: 401 })
  const limited = await enforcePolicy(request, 'growth.plan.create', 'Has creado varias rutas recientemente. Espera antes de intentarlo de nuevo.', {}, user.id)
  if (limited) return limited
  const contentLength = Number(request.headers.get('content-length') ?? 0)
  if (contentLength > 16_000) return NextResponse.json({ error: 'La solicitud es demasiado grande.' }, { status: 413 })
  const body: unknown = await request.json().catch(() => null)
  if (!isRecord(body)) return NextResponse.json({ error: 'Solicitud inválida.' }, { status: 400 })
  const stage = isChoice(body.stage, stages) ? body.stage : null
  const budgetLevel = isChoice(body.budgetLevel, budgetLevels) ? body.budgetLevel : null
  const horizonDays = horizons.includes(body.horizonDays as (typeof horizons)[number]) ? body.horizonDays as number : null
  const focusArea = isChoice(body.focusArea, focusAreas) ? body.focusArea : null
  if (!stage || !budgetLevel || !horizonDays || !focusArea || !isText(body.primaryGoal, 240) || !body.primaryGoal.trim() || !isText(body.genre, 80) || !Array.isArray(body.skills) || !body.skills.length || body.skills.length > 8 || body.skills.some((skill) => !isText(skill, 60) || !skill.trim())) {
    return NextResponse.json({ error: 'Completa objetivo, etapa, género, habilidades, presupuesto y enfoque.' }, { status: 400 })
  }
  const hours = Number(body.availableHoursPerWeek)
  const audience = Number(body.audienceSize ?? 0)
  if (!Number.isInteger(hours) || hours < 1 || hours > 80 || !Number.isInteger(audience) || audience < 0 || audience > 100_000_000) {
    return NextResponse.json({ error: 'Revisa las horas semanales y el tamaño de audiencia.' }, { status: 400 })
  }
  const admin = createAdminClient()
  if (!admin) return NextResponse.json({ error: 'El servicio de crecimiento no está configurado.' }, { status: 503 })
  const profilePayload = {
    user_id: user.id,
    stage,
    primary_goal: body.primaryGoal.trim(),
    genre: body.genre.trim(),
    skills: (body.skills as string[]).map((skill) => skill.trim()),
    available_hours_per_week: hours,
    budget_level: budgetLevel,
    audience_size: audience,
    monetization_interest: Array.isArray(body.monetizationInterest)
      ? body.monetizationInterest.filter((item): item is string => typeof item === 'string' && item.trim().length <= 60).slice(0, 6).map((item) => item.trim())
      : [],
    updated_at: new Date().toISOString(),
  }
  const { data: profile, error: profileError } = await admin.from('creator_profiles').upsert(profilePayload, { onConflict: 'user_id' }).select('id').single()
  if (profileError || !profile) return NextResponse.json({ error: 'No se pudo guardar tu perfil.' }, { status: 503 })

  const stepCount = horizonDays === 30 ? 4 : horizonDays === 60 ? 6 : 8
  const steps = Array.from({ length: stepCount }, (_, index) => {
    const action = recommendations[(index + focusAreas.indexOf(focusArea)) % recommendations.length]
    const month = Math.floor(index / Math.max(1, Math.ceil(stepCount / 3))) + 1
    return { id: `step-${index + 1}`, week: index + 1, phase: `Fase ${month}`, title: action.title, description: action.description, actions: action.recommended_actions, category: action.category, completed: false }
  })
  const plan = { horizonDays, focusArea, steps, weeklyHours: hours, generatedAt: new Date().toISOString(), source: 'open-rules' }
  const summary = `Ruta de ${horizonDays} días para ${profilePayload.primary_goal}, diseñada alrededor de ${hours} horas semanales y tu etapa ${stage}.`
  const { data: savedPlan, error: planError } = await admin.from('growth_plans').insert({
    user_id: user.id,
    creator_profile_id: profile.id,
    horizon_days: horizonDays,
    focus_area: focusArea,
    plan,
    ai_summary: summary,
  }).select('id,horizon_days,focus_area,status,plan,ai_summary,created_at').single()
  if (planError || !savedPlan) return NextResponse.json({ error: 'El perfil quedó guardado, pero no se pudo crear el plan. Puedes volver a intentarlo.' }, { status: 503 })

  const opportunities = recommendations.filter((item) => item.category === focusArea || focusArea === 'income' && item.category === 'catalog').slice(0, 2).map((item) => ({
    user_id: user.id,
    creator_profile_id: profile.id,
    category: item.category,
    title: item.title,
    description: item.description,
    difficulty: item.difficulty,
    time_to_first_result: item.time_to_first_result,
    required_assets: item.required_assets,
    recommended_actions: item.recommended_actions,
    fit_score: Math.min(0.95, 0.62 + Math.min(audience, 10_000) / 50_000 + hours / 400),
  }))
  const { data: savedOpportunities, error: opportunityError } = opportunities.length
    ? await admin.from('monetization_opportunities').insert(opportunities).select('id,title,description,category,difficulty,time_to_first_result,required_assets,recommended_actions,fit_score,created_at')
    : { data: [], error: null }
  if (opportunityError) return NextResponse.json({ error: 'El plan se guardó, pero no fue posible guardar las oportunidades.' }, { status: 503 })
  return NextResponse.json({ profile: { ...profilePayload, id: profile.id }, plan: savedPlan, opportunities: savedOpportunities ?? [] }, { status: 201, headers: { 'Cache-Control': 'private, no-store' } })
}

export async function PATCH(request: Request) {
  const supabase = await createClient()
  if (!supabase) return NextResponse.json({ error: SUPABASE_NOT_CONFIGURED }, { status: 503 })
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Inicia sesión para actualizar tu ruta.' }, { status: 401 })
  const limited = await enforcePolicy(request, 'growth.step.update', 'Has actualizado varios pasos. Espera un momento.', {}, user.id)
  if (limited) return limited
  const body: unknown = await request.json().catch(() => null)
  if (!isRecord(body) || typeof body.planId !== 'string' || typeof body.stepId !== 'string' || typeof body.completed !== 'boolean') {
    return NextResponse.json({ error: 'Solicitud de progreso inválida.' }, { status: 400 })
  }
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(body.planId) || !/^step-[1-8]$/.test(body.stepId)) {
    return NextResponse.json({ error: 'Identificador de plan o paso inválido.' }, { status: 400 })
  }
  const admin = createAdminClient()
  if (!admin) return NextResponse.json({ error: 'El servicio de crecimiento no está configurado.' }, { status: 503 })
  const { data: row, error: readError } = await admin.from('growth_plans').select('id,plan').eq('id', body.planId).eq('user_id', user.id).maybeSingle()
  if (readError) return NextResponse.json({ error: 'No se pudo cargar el plan.' }, { status: 503 })
  if (!row || !isRecord(row.plan) || !Array.isArray(row.plan.steps)) return NextResponse.json({ error: 'Plan no encontrado.' }, { status: 404 })
  const steps = row.plan.steps as unknown[]
  const found = steps.some((item) => isRecord(item) && item.id === body.stepId)
  if (!found) return NextResponse.json({ error: 'Paso no encontrado.' }, { status: 404 })
  const updatedPlan = {
    ...row.plan,
    steps: steps.map((item) => isRecord(item) && item.id === body.stepId ? { ...item, completed: body.completed } : item),
  }
  const { error: updateError } = await admin.from('growth_plans').update({ plan: updatedPlan }).eq('id', body.planId).eq('user_id', user.id)
  if (updateError) return NextResponse.json({ error: 'No se pudo guardar el avance.' }, { status: 503 })
  return NextResponse.json({ plan: updatedPlan }, { headers: { 'Cache-Control': 'private, no-store' } })
}
