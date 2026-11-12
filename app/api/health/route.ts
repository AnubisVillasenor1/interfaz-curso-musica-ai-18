import { NextResponse } from 'next/server'

import { getRateLimitDiagnostics } from '@/lib/rate-limit'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * Estado operativo mínimo, sin secretos.
 *
 * `ok` significa que el proceso responde. `degraded` indica que faltan
 * dependencias necesarias para las capacidades de producción declaradas.
 * Solo se publica presencia/configuración, nunca valores, IDs, correos ni claves.
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

  // Mantiene la misma precedencia que getMusicProviderId() para que el panel
  // operativo no declare listo un proveedor distinto al que ejecutará la API.
  const explicitProvider = process.env.MUSIC_PROVIDER?.trim().toLowerCase()
  const musicProvider =
    explicitProvider ||
    (process.env.API_KEY
      ? 'suno'
      : process.env.LOCAL_MUSIC_API_URL
        ? 'local'
        : process.env.HUGGINGFACEHUB_API_TOKEN
          ? 'huggingface'
          : process.env.REPLICATE_API_TOKEN
            ? 'replicate'
            : process.env.FAL_KEY
              ? 'fal'
              : 'local')

  const providerConfigured = (() => {
    switch (musicProvider) {
      case 'suno':
        return Boolean(process.env.API_KEY?.trim())
      case 'huggingface':
        return Boolean(process.env.HUGGINGFACEHUB_API_TOKEN?.trim())
      case 'replicate':
        return Boolean(
          process.env.REPLICATE_API_TOKEN?.trim() &&
            process.env.REPLICATE_ACE_STEP_MODEL?.trim(),
        )
      case 'fal':
        return Boolean(process.env.FAL_KEY?.trim() && process.env.FAL_ACE_STEP_MODEL?.trim())
      case 'local':
        return Boolean(process.env.LOCAL_MUSIC_API_URL?.trim())
      default:
        return false
    }
  })()
  const providerNeedsCallback = ['suno', 'replicate', 'fal', 'local'].includes(musicProvider)
  let musicProviderUrlProductionSafe = musicProvider !== 'local'
  if (musicProvider === 'local') {
    try {
      const providerUrl = new URL(process.env.LOCAL_MUSIC_API_URL?.trim() || '')
      musicProviderUrlProductionSafe =
        providerUrl.protocol === 'https:' &&
        !['localhost', '127.0.0.1', '0.0.0.0', '::1'].includes(providerUrl.hostname.toLowerCase())
    } catch {
      musicProviderUrlProductionSafe = false
    }
  }

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
    musicProviderConfigured: providerConfigured,
    musicProviderUrlProductionSafe: !production || musicProviderUrlProductionSafe,
    musicCallbackReady: !providerNeedsCallback || Boolean(process.env.GENERATOR_CALLBACK_SECRET?.trim()),
    aiAgent: Boolean(process.env.AI_AGENT_API_KEY?.trim()),
    audioCore: Boolean(process.env.TAMV_AUDIO_CORE_URL?.trim()),
    rateLimitDistributed: rateLimit.distributed,
  }

  const serverMusicGenerationReady =
    checks.musicProviderConfigured &&
    checks.musicCallbackReady &&
    checks.supabaseAdmin &&
    appUrlConfigured &&
    (!production || (appUrlProductionSafe && musicProviderUrlProductionSafe))
  const degraded =
    !checks.appUrlConfigured ||
    (production && (!appUrlProductionSafe || !musicProviderUrlProductionSafe)) ||
    !checks.supabaseAuth ||
    !checks.supabaseAdmin ||
    !checks.stripe ||
    !checks.stripeWebhook ||
    !serverMusicGenerationReady ||
    !checks.rateLimitDistributed

  const response = NextResponse.json(
    {
      service: 'play-and-go',
      ok: true,
      degraded,
      checks,
      capabilities: {
        localMusic: true,
        externalMusic: true,
        externalMusicReady: serverMusicGenerationReady,
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
