import { NextResponse } from 'next/server'

import { getRateLimitDiagnostics } from '@/lib/rate-limit'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * Estado operativo mínimo, sin secretos.
 *
 * `ok` significa que el proceso responde. `degraded` indica que faltan
 * dependencias necesarias para las capacidades declaradas. El endpoint solo
 * expone presencia/configuración, nunca valores, IDs, correos ni credenciales.
 */
export async function GET() {
  const supabaseUrl = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL?.trim())
  const supabaseKey = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ||
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim(),
  )
  const rateLimit = getRateLimitDiagnostics()
  const production =
    process.env.VERCEL_ENV === 'production' ||
    process.env.PLAY_AND_GO_ENV === 'production'
  const musicProvider = (process.env.MUSIC_PROVIDER?.trim() || 'local').toLowerCase()
  const externalMusicGeneration = musicProvider !== 'local'

  let appUrlConfigured = false
  let appUrlProductionSafe = false
  try {
    const appUrl = new URL(process.env.NEXT_PUBLIC_APP_URL?.trim() || '')
    appUrlConfigured = appUrl.protocol === 'https:' || appUrl.protocol === 'http:'
    appUrlProductionSafe =
      appUrl.protocol === 'https:' &&
      !['localhost', '127.0.0.1', '0.0.0.0', '::1'].includes(appUrl.hostname.toLowerCase())
  } catch {
    // Una URL vacía o inválida es configuración ausente, no una excepción de salud.
  }

  const checks = {
    appUrlConfigured,
    appUrlProductionSafe: !production || appUrlProductionSafe,
    supabaseAuth: supabaseUrl && supabaseKey,
    supabaseAdmin: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()),
    stripe: Boolean(process.env.STRIPE_SECRET_KEY?.trim()),
    stripeWebhook: Boolean(process.env.STRIPE_WEBHOOK_SECRET?.trim()),
    generatorCallback: Boolean(process.env.GENERATOR_CALLBACK_SECRET?.trim()),
    aiAgent: Boolean(process.env.AI_AGENT_API_KEY?.trim()),
    audioCore: Boolean(process.env.TAMV_AUDIO_CORE_URL?.trim()),
    rateLimitDistributed: rateLimit.distributed,
  }

  const degraded =
    !checks.appUrlConfigured ||
    (production && !appUrlProductionSafe) ||
    !checks.supabaseAuth ||
    !checks.supabaseAdmin ||
    !checks.stripe ||
    !checks.stripeWebhook ||
    (externalMusicGeneration && !checks.generatorCallback) ||
    !checks.rateLimitDistributed

  const response = NextResponse.json(
    {
      service: 'play-and-go',
      ok: true,
      degraded,
      checks,
      capabilities: {
        localMusic: true,
        externalMusic: externalMusicGeneration,
        externalMusicReady: !externalMusicGeneration || checks.generatorCallback,
        configuredMusicProvider: musicProvider,
      },
      rateLimit: {
        mode: rateLimit.mode,
        environment: rateLimit.environment,
        production: rateLimit.production,
        reason: rateLimit.reason,
        metrics: rateLimit.metrics,
      },
      timestamp: new Date().toISOString(),
    },
    { headers: { 'Cache-Control': 'no-store' } },
  )
  response.headers.set('X-Robots-Tag', 'noindex')
  return response
}
