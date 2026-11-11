/**
 * Declaraciones del motor puro del control de solicitudes.
 *
 * La implementación vive en `rate-limit-engine.mjs` para que `node --test`
 * pueda importarla sin transpilador. Estas declaraciones son el contrato que
 * consume `lib/rate-limit.ts`.
 */

export type RateLimitCost = 'local' | 'provider' | 'service' | 'external'

export interface RateLimitPolicy {
  readonly limit: number
  readonly windowMs: number
  readonly cost: RateLimitCost
}

export type RateLimitScope =
  | 'music.plan'
  | 'music.agents'
  | 'music.compose'
  | 'music.analyze'
  | 'music.search'
  | 'agent.chat.anonymous'
  | 'agent.chat.authenticated'
  | 'advanced-audio.exam'
  | 'advanced-audio.evaluate'
  | 'tts'
  | 'checkout'
  | 'exam.submit'
  | 'progress.write'
  | 'songs.complete'
  | 'public'

export const DEFAULT_WINDOW_MS: number
export const RATE_LIMIT_POLICIES: Readonly<Record<RateLimitScope, RateLimitPolicy>>

export type RateLimitMode = 'distributed' | 'memory' | 'memory-degraded' | 'unavailable'

export interface RateLimitModeInfo {
  mode: RateLimitMode
  environment: string
  production: boolean
  reason: string
  distributed: boolean
}

export function resolveRateLimitMode(env?: Record<string, string | undefined>): RateLimitModeInfo

export interface MemoryStoreHit {
  success: boolean
  limit: number
  remaining: number
  reset: number
  used: number
  source: 'memory'
}

export interface MemoryStore {
  hit(key: string, limit: number, windowMs: number): MemoryStoreHit
  prune(): void
  size(): number
  clear(): void
}

export function createMemoryStore(options?: { now?: () => number; maxKeys?: number }): MemoryStore

export interface RateLimitMetrics {
  record(scope: string, outcome: string): void
  snapshot(): Record<string, Record<string, number>>
  reset(): void
}

export function createRateLimitMetrics(): RateLimitMetrics
