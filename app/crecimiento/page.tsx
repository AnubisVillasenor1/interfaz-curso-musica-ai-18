import Link from 'next/link'
import { AccountTabs } from '@/components/account/account-tabs'
import { CreatorGrowthWorkspace } from '@/components/creator-growth-workspace'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

type Profile = { stage: string; primary_goal: string | null; genre: string | null; skills: string[]; available_hours_per_week: number | null; budget_level: string | null; audience_size: number }
type Plan = { id: string; horizon_days: number; focus_area: string; ai_summary: string | null; plan: { steps?: Array<{ id: string; week: number; phase: string; title: string; description: string; actions: string[] }> }; created_at: string }
type Opportunity = { id: string; title: string; description: string; category: string; difficulty: string; time_to_first_result: string | null; recommended_actions: string[] }

export default async function CreatorGrowthPage() {
  const supabase = await createClient()
  const { data: { user } } = (await supabase?.auth.getUser()) ?? { data: { user: null } }
  let initialData = { profile: null as Profile | null, plans: [] as Plan[], opportunities: [] as Opportunity[] }
  if (user) {
    const admin = createAdminClient()
    if (admin) {
      const [profile, plans, opportunities] = await Promise.all([
        admin.from('creator_profiles').select('stage,primary_goal,genre,skills,available_hours_per_week,budget_level,audience_size').eq('user_id', user.id).maybeSingle(),
        admin.from('growth_plans').select('id,horizon_days,focus_area,ai_summary,plan,created_at').eq('user_id', user.id).order('created_at', { ascending: false }).limit(5),
        admin.from('monetization_opportunities').select('id,title,description,category,difficulty,time_to_first_result,recommended_actions').eq('user_id', user.id).order('created_at', { ascending: false }).limit(8),
      ])
      initialData = { profile: profile.data as Profile | null, plans: (plans.data ?? []) as Plan[], opportunities: (opportunities.data ?? []) as Opportunity[] }
    }
  }
  return <main className="pg-shell min-h-screen" style={{ background: 'var(--pg-bg)' }}><div className="pg-container max-w-6xl py-10"><Link href="/" className="pg-navlink">← Volver a Play and Go</Link><header className="mb-7 mt-6"><p className="pg-eyebrow">PLAY &amp; GO · Creator Operating System</p><h1 className="pg-title">Crece con intención</h1><p className="pg-lede mt-3 max-w-3xl">Una ruta práctica para desarrollar tu proyecto musical con objetivos, tiempo y recursos reales. Tus datos permanecen asociados a tu cuenta.</p></header><div className="mb-7"><AccountTabs active="crecimiento"/></div>{user ? <CreatorGrowthWorkspace initialData={initialData}/> : <section className="pg-card p-6"><h2 className="pg-block-title">Inicia sesión para guardar tu ruta</h2><p className="pg-note mt-2">Tu perfil, plan y oportunidades se guardan de forma privada en tu cuenta.</p><Link href="/auth?mode=login" className="pg-btn pg-btn-primary mt-5 inline-flex">Iniciar sesión</Link></section>}</div></main>
}
