/**
 * Pruebas del motor del control de solicitudes.
 *
 * Se ejecutan con `node --test scripts/test-rate-limit.mjs`. No necesitan
 * Next, Redis ni red: el reloj y el almacén son inyectables. Cubren la
 * regresión del 11/11/2026 (CI con NODE_ENV=production y sin Redis), la
 * expiración de ventanas, el aislamiento entre claves, la concurrencia y los
 * contadores de diagnóstico.
 */

import assert from 'node:assert/strict'
import test from 'node:test'

import {
  DEFAULT_WINDOW_MS,
  RATE_LIMIT_POLICIES,
  createMemoryStore,
  createRateLimitMetrics,
  resolveRateLimitMode,
} from '../lib/rate-limit-engine.mjs'

test('CI y desarrollo sin Redis usan memoria aunque NODE_ENV sea production', () => {
  const mode = resolveRateLimitMode({ NODE_ENV: 'production' })
  assert.equal(mode.mode, 'memory')
  assert.equal(mode.production, false)
  assert.equal(mode.environment, 'local')
  assert.equal(mode.reason, 'non-production')
})

test('self-hosting declara producción con PLAY_AND_GO_ENV', () => {
  const mode = resolveRateLimitMode({ PLAY_AND_GO_ENV: 'production', NODE_ENV: 'production' })
  assert.equal(mode.mode, 'unavailable')
  assert.equal(mode.production, true)
  assert.equal(mode.environment, 'production')
})

test('preview de Vercel sin Redis usa memoria por proceso', () => {
  const mode = resolveRateLimitMode({ VERCEL_ENV: 'preview' })
  assert.equal(mode.mode, 'memory')
  assert.equal(mode.production, false)
})

test('producción declarada con credenciales usa Redis distribuido', () => {
  const mode = resolveRateLimitMode({
    VERCEL_ENV: 'production',
    KV_REST_API_URL: 'https://example.upstash.io',
    KV_REST_API_TOKEN: 'token',
  })
  assert.equal(mode.mode, 'distributed')
  assert.equal(mode.distributed, true)
  assert.equal(mode.production, true)
})

test('producción sin Redis falla cerrado, no abre el límite', () => {
  const mode = resolveRateLimitMode({ VERCEL_ENV: 'production' })
  assert.equal(mode.mode, 'unavailable')
  assert.equal(mode.production, true)
  assert.equal(mode.reason, 'production-without-redis')
})

test('producción sin Redis sólo usa memoria con autorización explícita', () => {
  const mode = resolveRateLimitMode({
    VERCEL_ENV: 'production',
    RATE_LIMIT_ALLOW_MEMORY_FALLBACK: 'true',
  })
  assert.equal(mode.mode, 'memory-degraded')
  assert.equal(mode.production, true)
})

test('acepta también nombres nativos de Upstash', () => {
  const mode = resolveRateLimitMode({
    UPSTASH_REDIS_REST_URL: 'https://example.upstash.io',
    UPSTASH_REDIS_REST_TOKEN: 'token',
  })
  assert.equal(mode.mode, 'distributed')
})

test('las políticas separan costo local, proveedor y servicio', () => {
  const scopes = Object.keys(RATE_LIMIT_POLICIES)
  assert.ok(scopes.length >= 10)
  assert.equal(RATE_LIMIT_POLICIES['music.plan'].cost, 'local')
  assert.equal(RATE_LIMIT_POLICIES['music.analyze'].cost, 'service')
  assert.equal(RATE_LIMIT_POLICIES['agent.chat.anonymous'].cost, 'provider')
  assert.ok(RATE_LIMIT_POLICIES['agent.chat.anonymous'].limit < RATE_LIMIT_POLICIES['agent.chat.authenticated'].limit)
  assert.equal(RATE_LIMIT_POLICIES['advanced-audio.evaluate'].limit, 4)
  assert.equal(RATE_LIMIT_POLICIES['checkout'].cost, 'external')
  assert.equal(RATE_LIMIT_POLICIES['exam.submit'].cost, 'local')
  assert.equal(RATE_LIMIT_POLICIES['songs.complete'].cost, 'service')
  assert.equal(RATE_LIMIT_POLICIES['growth.plan.create'].limit, 6)
  assert.equal(RATE_LIMIT_POLICIES['growth.step.update'].limit, 30)
  assert.ok(RATE_LIMIT_POLICIES['progress.write'].limit >= 10)
  for (const policy of Object.values(RATE_LIMIT_POLICIES)) {
    assert.ok(Number.isInteger(policy.limit) && policy.limit > 0)
    assert.ok(Number.isInteger(policy.windowMs) && policy.windowMs >= 1_000)
  }
})

test('la ventana permite exactamente el límite y bloquea el siguiente', () => {
  let now = 1_000_000
  const store = createMemoryStore({ now: () => now })
  const decisions = []
  for (let index = 0; index < 6; index += 1) {
    decisions.push(store.hit('ip:1.2.3.4', 5, DEFAULT_WINDOW_MS))
  }
  assert.deepEqual(decisions.map((entry) => entry.success), [true, true, true, true, true, false])
  assert.equal(decisions[0].remaining, 4)
  assert.equal(decisions[4].remaining, 0)
  assert.equal(decisions[5].remaining, 0)
  assert.equal(decisions[5].reset, now + DEFAULT_WINDOW_MS)
})

test('la ventana expira y vuelve a permitir', () => {
  let now = 2_000_000
  const store = createMemoryStore({ now: () => now })
  assert.equal(store.hit('ip:expiracion', 1, 1_000).success, true)
  assert.equal(store.hit('ip:expiracion', 1, 1_000).success, false)

  now += 1_001
  const after = store.hit('ip:expiracion', 1, 1_000)
  assert.equal(after.success, true)
  assert.equal(after.used, 1)
})

test('claves distintas no comparten cupo', () => {
  const store = createMemoryStore({ now: () => 3_000_000 })
  assert.equal(store.hit('u:alumno-a', 1, 60_000).success, true)
  assert.equal(store.hit('u:alumno-b', 1, 60_000).success, true)
  assert.equal(store.hit('u:alumno-a', 1, 60_000).success, false)
  assert.equal(store.hit('u:alumno-b', 1, 60_000).success, false)
})

test('cambiar la ventana reinicia el bucket en lugar de mezclar reglas', () => {
  const store = createMemoryStore({ now: () => 4_000_000 })
  assert.equal(store.hit('ip:ventana', 1, 60_000).success, true)
  assert.equal(store.hit('ip:ventana', 1, 120_000).success, true)
})

test('la concurrencia dentro del proceso no supera el límite', async () => {
  const store = createMemoryStore({ now: () => 5_000_000 })
  const results = await Promise.all(
    Array.from({ length: 40 }, () => Promise.resolve().then(() => store.hit('ip:concurrente', 7, 60_000))),
  )
  assert.equal(results.filter((entry) => entry.success).length, 7)
  assert.equal(results.filter((entry) => !entry.success).length, 33)
})

test('prune elimina buckets vencidos y respeta maxKeys sin borrar la clave activa', () => {
  let now = 6_000_000
  const store = createMemoryStore({ now: () => now, maxKeys: 2 })
  store.hit('key-a', 10, 1_000)
  store.hit('key-b', 10, 1_000)
  store.hit('key-c', 10, 1_000)
  assert.ok(store.size() <= 2)
  // La clave recién consultada sigue existiendo y conserva su cupo.
  assert.equal(store.hit('key-c', 1, 1_000).success, false)

  now += 2_000
  store.prune()
  assert.equal(store.size(), 0)
})

test('las métricas distinguen permitidas, bloqueadas y fallidas', () => {
  const metrics = createRateLimitMetrics()
  metrics.record('music.plan', 'allowed')
  metrics.record('music.plan', 'allowed')
  metrics.record('music.plan', 'limited')
  metrics.record('music.analyze', 'unavailable')
  assert.deepEqual(metrics.snapshot(), {
    'music.plan': { allowed: 2, limited: 1 },
    'music.analyze': { unavailable: 1 },
  })
  metrics.reset()
  assert.deepEqual(metrics.snapshot(), {})
})
