import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'
import { NextResponse } from 'next/server'

import {
  DEFAULT_WINDOW_MS,
  RATE_LIMIT_POLICIES,
  createMemoryStore,
  createRateLimitMetrics,
  resolveRateLimitMode,
  type RateLimitModeInfo,
  type RateLimitScope,
} from './rate-limit-engine.mjs'

/**
 * Control de solicitudes de Play & Go.
 *
 * La regresión de la auditoría del 11/11/2026 fue castigar el desarrollo por no
 * tener Redis: `rateLimitPublic` devolvía `unavailable`, las rutas lo traducían
 * a 503 y tres endpoints deterministas dejaban de funcionar en CI. El arreglo
 * no es "permitir todo sin Redis": es elegir el backend según el entorno.
 *
 * - Producción (Vercel Production o `PLAY_AND_GO_ENV=production`) exige Redis
 *   distribuido. Sin credenciales falla cerrado con 503 y lo registra.
 * - Desarrollo, preview, CI y pruebas usan un limitador en memoria por proceso.
 * - Si Redis falla en producción, tampoco se abre la puerta: 503 explícito.
 * - El modo `memory-degraded` sólo existe con `RATE_LIMIT_ALLOW_MEMORY_FALLBACK=true`.
 *
 * Las métricas cuentan permitidas, bloqueadas y fallidas. Nunca se registra la
 * IP ni el identificador del usuario: la clave se hash-ea antes de salir del
 * proceso hacia Redis y los logs sólo llevan el ámbito.
 */

export type RateLimitDecision =
  | { status: 'allowed'; limit: number; remaining: number; reset: number; source: 'redis' | 'memory' }
  | { status: 'limited'; limit: number; remaining: 0; reset: number; source: 'redis' | 'memory' }
  | { status: 'unavailable'; source: 'none' }

export { RATE_LIMIT_POLICIES }

export interface RateLimitOptions {
  scope?: RateLimitScope | string
  windowMs?: number
}

const modeInfo: RateLimitModeInfo = resolveRateLimitMode(process.env as Record<string, string | undefined>)
const metrics = createRateLimitMetrics()
const limiters = new Map<string, Ratelimit>()

let redis: Redis | null = null
if (modeInfo.mode === 'distributed') {
  redis = new Redis({
    url: (process.env.KV_REST_API_URL ?? process.env.UPSTASH_REDIS_REST_URL ?? '').trim(),
    token: (process.env.KV_REST_API_TOKEN ?? process.env.UPSTASH_REDIS_REST_TOKEN ?? '').trim(),
  })
}

let memoryStore: ReturnType<typeof createMemoryStore> | null = null
function getMemoryStore() {
  if (!memoryStore) memoryStore = createMemoryStore()
  return memoryStore
}

if (modeInfo.mode === 'unavailable') {
  console.error(
    JSON.stringify({
      ts: new Date().toISOString(),
      event: 'rate_limit_misconfigured',
      mode: modeInfo.mode,
      reason: modeInfo.reason,
      message:
        'Producción sin KV_REST_API_URL/KV_REST_API_TOKEN. Las rutas protegidas responderán 503 hasta configurar Redis o RATE_LIMIT_ALLOW_MEMORY_FALLBACK=true.',
    }),
  )
} else if (modeInfo.mode === 'memory-degraded') {
  console.warn(
    JSON.stringify({
      ts: new Date().toISOString(),
      event: 'rate_limit_degraded',
      mode: modeInfo.mode,
      reason: modeInfo.reason,
      message: 'Producción usa memoria local por decisión explícita; el límite no es global entre instancias.',
    }),
  )
}

function getLimiter(limit: number, windowMs: number) {
  if (!redis) throw new Error('Redis no está configurado')
  const windowSeconds = Math.max(1, Math.ceil(windowMs / 1000))
  const key = `${limit}:${windowSeconds}`
  const cached = limiters.get(key)
  if (cached) return cached

  const limiter = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(limit, `${windowSeconds} s`),
    prefix: `play-and-go:${modeInfo.environment}:${key}`,
    analytics: false,
  })
  limiters.set(key, limiter)
  return limiter
}

async function fingerprint(identifier: string) {
  const digest = await globalThis.crypto.subtle.digest('SHA-256', new TextEncoder().encode(identifier))
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('')
}

function logDecision(outcome: 'limited' | 'unavailable' | 'error', scope: string) {
  const entry = JSON.stringify({
    ts: new Date().toISOString(),
    event: 'rate_limit',
    scope,
    outcome,
    mode: modeInfo.mode,
  })
  if (outcome === 'limited') console.warn(entry)
  else console.error(entry)
}

async function distributedDecision(
  identifier: string,
  limit: number,
  windowMs: number,
  scope: string,
): Promise<RateLimitDecision> {
  try {
    const limiter = getLimiter(limit, windowMs)
    const result = await limiter.limit(await fingerprint(identifier))
    // La promesa de analítica es opcional; un fallo al vaciarla no invalida el
    // cupo ya decidido por Redis.
    await Promise.resolve(result.pending).catch(() => undefined)

    if (!result.success) {
      return {
        status: 'limited',
        limit,
        remaining: 0,
        reset: result.reset,
        source: 'redis',
      }
    }
    return {
      status: 'allowed',
      limit,
      remaining: result.remaining,
      reset: result.reset,
      source: 'redis',
    }
  } catch (error) {
    logDecision('error', scope)
    // En producción no se cambia Redis por memoria local sin autorización
    // explícita. En local/CI/preview la memoria mantiene el límite activo.
    if (modeInfo.production) {
      return { status: 'unavailable', source: 'none' }
    }
    return memoryDecision(identifier, limit, windowMs)
  }
}

function memoryDecision(identifier: string, limit: number, windowMs: number): RateLimitDecision {
  const result = getMemoryStore().hit(identifier, limit, windowMs)
  if (!result.success) {
    return { status: 'limited', limit, remaining: 0, reset: result.reset, source: 'memory' }
  }
  return {
    status: 'allowed',
    limit,
    remaining: result.remaining,
    reset: result.reset,
    source: 'memory',
  }
}

/**
 * Comprueba un cupo con el backend que corresponda al entorno.
 *
 * Se conserva la firma histórica `(identifier, limit, windowMs)` para no romper
 * consumidores internos; el ámbito es sólo para métricas y logs.
 */
export async function rateLimitPublic(
  identifier: string,
  limit: number,
  windowMs = DEFAULT_WINDOW_MS,
  scope = 'public',
): Promise<RateLimitDecision> {
  let decision: RateLimitDecision

  if (modeInfo.mode === 'distributed') {
    decision = await distributedDecision(identifier, limit, windowMs, scope)
  } else if (modeInfo.mode === 'memory' || modeInfo.mode === 'memory-degraded') {
    decision = memoryDecision(identifier, limit, windowMs)
  } else {
    decision = { status: 'unavailable', source: 'none' }
  }

  metrics.record(scope, decision.status)
  if (decision.status === 'limited') logDecision('limited', scope)
  if (decision.status === 'unavailable') logDecision('unavailable', scope)
  return decision
}

/**
 * Comprueba el cupo de un ámbito declarado en `RATE_LIMIT_POLICIES`.
 * Prefiere el `userId` cuando existe; si no, usa la IP del proxy de confianza.
 */
export async function checkPolicy(
  request: Request,
  scope: RateLimitScope,
  userId: string | null = null,
): Promise<RateLimitDecision> {
  const policy = RATE_LIMIT_POLICIES[scope]
  return rateLimitPublic(`${scope}:${rateLimitSubject(request, userId)}`, policy.limit, policy.windowMs, scope)
}

export function retryAfterSeconds(reset: number) {
  return Math.max(1, Math.ceil((reset - Date.now()) / 1000))
}

export async function enforceRateLimit(
  identifier: string,
  limit: number,
  message: string,
  extraHeaders: Record<string, string> = {},
  options: RateLimitOptions = {},
) {
  const scope = options.scope ?? 'public'
  const decision = await rateLimitPublic(identifier, limit, options.windowMs ?? DEFAULT_WINDOW_MS, scope)
  if (decision.status === 'allowed') return null

  const status = decision.status === 'limited' ? 429 : 503
  const headers = new Headers(extraHeaders)
  headers.set('Cache-Control', 'no-store')
  headers.set('X-RateLimit-Mode', modeInfo.mode)
  headers.set(
    'Retry-After',
    decision.status === 'limited' ? String(retryAfterSeconds(decision.reset)) : '5',
  )

  if (decision.status !== 'unavailable') {
    headers.set('X-RateLimit-Limit', String(decision.limit))
    headers.set('X-RateLimit-Remaining', String(decision.remaining))
    headers.set('X-RateLimit-Reset', String(Math.ceil(decision.reset / 1000)))
  }

  return NextResponse.json(
    {
      error:
        decision.status === 'limited'
          ? message
          : 'El control de solicitudes no está disponible temporalmente. Inténtalo de nuevo.',
      code: decision.status === 'limited' ? 'rate_limited' : 'rate_limit_unavailable',
      ...(decision.status === 'limited' ? { retryAfter: retryAfterSeconds(decision.reset) } : {}),
    },
    { status, headers },
  )
}

/**
 * Atajo para rutas: resuelve el ámbito, la identidad y la ventana en un solo
 * lugar. Mantiene los límites separados por endpoint y por costo.
 */
export async function enforcePolicy(
  request: Request,
  scope: RateLimitScope,
  message: string,
  extraHeaders: Record<string, string> = {},
  userId: string | null = null,
) {
  const policy = RATE_LIMIT_POLICIES[scope]
  return enforceRateLimit(
    `${scope}:${rateLimitSubject(request, userId)}`,
    policy.limit,
    message,
    extraHeaders,
    { scope, windowMs: policy.windowMs },
  )
}

/**
 * Identidad estable del solicitante.
 *
 * `x-real-ip` lo escribe la plataforma; en `x-forwarded-for` la primera entrada
 * la controla el cliente, por eso se toma la última (la que añade el proxy de
 * confianza). Un usuario autenticado se identifica por su id aunque comparta
 * IP con un aula entera.
 */
export function rateLimitSubject(request: Request, userId: string | null = null): string {
  return userId ? `u:${userId}` : `ip:${ipOf(request)}`
}

export function ipOf(request: Request): string {
  const realIp = request.headers.get('x-real-ip')?.trim()
  if (realIp) return realIp.slice(0, 120)

  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) {
    const parts = forwarded.split(',').map((part) => part.trim()).filter(Boolean)
    if (parts.length) return parts[parts.length - 1].slice(0, 120)
  }

  return 'sin-ip'
}

/** Diagnóstico sin secretos: modo, motivo y contadores de esta instancia. */
export function getRateLimitDiagnostics() {
  return {
    mode: modeInfo.mode,
    environment: modeInfo.environment,
    production: modeInfo.production,
    reason: modeInfo.reason,
    distributed: modeInfo.distributed,
    metrics: metrics.snapshot(),
  }
}
