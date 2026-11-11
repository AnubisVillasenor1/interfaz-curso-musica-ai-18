import { NextResponse } from 'next/server'

import { getRateLimitDiagnostics } from '@/lib/rate-limit'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * Estado operativo mínimo, sin secretos.
 *
 * Un despliegue degradado debe poder detectarse desde fuera sin abrir un panel
 * ni consultar variables privadas. Aquí sólo se publica presencia/ausencia de
 * configuración y el modo del limitador; nunca valores, IDs ni correos.
 *
 * `ok` significa "el proceso responde". `degraded` significa "responde, pero
 * alguna pieza de producción no está configurada y el producto lo notará".
 */
export async function GET() {
  const supabaseUrl = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL?.trim())
  const supabaseKey = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ||
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim(),
  )
  const rateLimit = getRateLimitDiagnostics()

  const checks = {
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
    !checks.supabaseAuth ||
    !checks.supabaseAdmin ||
    !checks.stripe ||
    !checks.stripeWebhook ||
    !checks.rateLimitDistributed

  const response = NextResponse.json(
    {
      service: 'play-and-go',
      ok: true,
      degraded,
      checks,
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
