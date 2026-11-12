import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

import { AccountTabs } from '@/components/account/account-tabs'
import { VoiceIdentityWorkspace } from '@/components/voice-identity-workspace'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Voz sintética local',
  description: 'Crea perfiles de narración con Kokoro local, consentimiento explícito y audio privado.',
}

type VoiceProfile = {
  id: string
  name: string
  description: string | null
  language: string
  status: string
  is_consented: boolean
  created_at: string
}

export default async function VoicePage() {
  const supabase = await createClient()
  const { data: { user } } = (await supabase?.auth.getUser()) ?? { data: { user: null } }
  let profiles: VoiceProfile[] = []
  if (user) {
    const admin = createAdminClient()
    if (admin) {
      const { data } = await admin
        .from('voice_profiles')
        .select('id,name,description,language,status,is_consented,created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(20)
      profiles = (data ?? []) as VoiceProfile[]
    }
  }

  return <main className="pg-shell min-h-screen" style={{ background: 'var(--pg-bg)' }}>
    <div className="pg-container max-w-6xl py-10">
      <Link href="/" className="pg-navlink inline-flex items-center gap-2"><ArrowLeft size={14} aria-hidden="true" /> Volver a Play &amp; Go</Link>
      <header className="mb-7 mt-6">
        <p className="pg-eyebrow">PLAY &amp; GO · KOKORO OPEN SOURCE</p>
        <h1 className="pg-title">Voz Identity</h1>
        <p className="pg-lede mt-3 max-w-3xl">Narración local con controles de consentimiento, generación privada y trazabilidad por cuenta.</p>
      </header>
      <div className="mb-7"><AccountTabs active="voz" /></div>
      {user ? <VoiceIdentityWorkspace initialProfiles={profiles} /> : <section className="pg-card p-6">
        <h2 className="pg-block-title">Inicia sesión para crear una voz</h2>
        <p className="pg-note mt-2">Los perfiles y audios generados son privados y se asocian a tu cuenta.</p>
        <Link href="/auth?mode=login" className="pg-btn pg-btn-primary mt-5 inline-flex">Iniciar sesión</Link>
      </section>}
    </div>
  </main>
}
