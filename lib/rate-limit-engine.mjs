/**
 * Motor puro del control de solicitudes.
 *
 * Vive en JavaScript sin dependencias de Next ni de Redis para que las pruebas
 * puedan ejecutarlo con Node directamente y con un reloj inyectable. El
 * adaptador (`lib/rate-limit.ts`) decide entre Redis distribuido y memoria
 * local; aquí sólo están las reglas que no cambian entre entornos.
 *
 * Regla de oro: un fallo del limitador nunca significa "sin límite".
 * - desarrollo, preview y CI pueden usar memoria (por proceso);
 * - producción sin Redis responde cerrado salvo autorización explícita;
 * - el fallback nunca es silencioso: se registra y se expone en diagnóstico.
 */

/** Ventana por defecto de los límites públicos. */
export const DEFAULT_WINDOW_MS = 60_000

/**
 * Límites por endpoint y por costo real.
 *
 * `local` no cuesta dinero ni llama a terceros; `provider` sí consume cuota de
 * un modelo o de un proveedor musical; `service` llama a un servicio externo
 * propio. Separarlos evita castigar igual una composición local que una
 * generación de pago.
 *
 * @type {Readonly<Record<string, Readonly<{limit: number, windowMs: number, cost: 'local'|'provider'|'service'|'external'}>>>}
 */
export const RATE_LIMIT_POLICIES = Object.freeze({
  'music.plan': Object.freeze({ limit: 20, windowMs: 60_000, cost: 'local' }),
  'music.agents': Object.freeze({ limit: 20, windowMs: 60_000, cost: 'local' }),
  'music.compose': Object.freeze({ limit: 20, windowMs: 60_000, cost: 'local' }),
  'music.analyze': Object.freeze({ limit: 20, windowMs: 60_000, cost: 'service' }),
  'music.search': Object.freeze({ limit: 30, windowMs: 60_000, cost: 'external' }),
  'agent.chat.anonymous': Object.freeze({ limit: 6, windowMs: 60_000, cost: 'provider' }),
  'agent.chat.authenticated': Object.freeze({ limit: 20, windowMs: 60_000, cost: 'provider' }),
  'advanced-audio.exam': Object.freeze({ limit: 20, windowMs: 60_000, cost: 'local' }),
  'advanced-audio.evaluate': Object.freeze({ limit: 4, windowMs: 60_000, cost: 'provider' }),
  tts: Object.freeze({ limit: 10, windowMs: 60_000, cost: 'provider' }),
  'growth.plan.create': Object.freeze({ limit: 6, windowMs: 60_000, cost: 'local' }),
  'growth.step.update': Object.freeze({ limit: 30, windowMs: 60_000, cost: 'local' }),
  'licensing.activate': Object.freeze({ limit: 5, windowMs: 60_000, cost: 'service' }),
  'licensing.revoke': Object.freeze({ limit: 10, windowMs: 60_000, cost: 'service' }),
  checkout: Object.freeze({ limit: 10, windowMs: 60_000, cost: 'external' }),
  'exam.submit': Object.freeze({ limit: 10, windowMs: 60_000, cost: 'local' }),
  'progress.write': Object.freeze({ limit: 30, windowMs: 60_000, cost: 'local' }),
  'songs.complete': Object.freeze({ limit: 12, windowMs: 60_000, cost: 'service' }),
  public: Object.freeze({ limit: 60, windowMs: 60_000, cost: 'local' }),
})

function nonEmpty(value) {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null
}

function isExplicitTrue(value) {
  return String(value ?? '').trim().toLowerCase() === 'true'
}

/**
 * Decide el modo del limitador sin crear clientes ni tocar la red.
 *
 * `VERCEL_ENV` es la señal de despliegue. En local y en CI no existe (o no es
 * `production`), así que la memoria es legítima. Un servidor propio fuera de
 * Vercel declara producción con `PLAY_AND_GO_ENV=production`.
 *
 * @param {Record<string, string|undefined>} [env]
 * @returns {{mode: 'distributed'|'memory'|'memory-degraded'|'unavailable', environment: string, production: boolean, reason: string, distributed: boolean}}
 */
export function resolveRateLimitMode(env = {}) {
  const url = nonEmpty(env.KV_REST_API_URL) ?? nonEmpty(env.UPSTASH_REDIS_REST_URL)
  const token = nonEmpty(env.KV_REST_API_TOKEN) ?? nonEmpty(env.UPSTASH_REDIS_REST_TOKEN)
  // `NODE_ENV=production` también lo pone `next start` en local y en CI; no es
  // prueba de que exista un despliegue real. Producción se declara con la
  // variable de la plataforma (Vercel) o con PLAY_AND_GO_ENV en self-hosting.
  const declaredEnvironment = nonEmpty(env.PLAY_AND_GO_ENV) ?? nonEmpty(env.VERCEL_ENV)
  const nodeEnvironment = nonEmpty(env.NODE_ENV) ?? 'development'
  // Sin declaración de despliegue, `NODE_ENV=production` sólo significa que se
  // ejecutó `next start` (local o CI). Etiquetarlo como "local" evita que el
  // diagnóstico parezca un despliegue real y que las claves de Redis de un
  // hipotético self-hosting sin declarar colisionen con producción.
  const environment = (
    declaredEnvironment ?? (nodeEnvironment === 'production' ? 'local' : nodeEnvironment)
  ).toLowerCase()
  const isProduction = declaredEnvironment?.toLowerCase() === 'production'

  if (url && token) {
    return { mode: 'distributed', environment, production: isProduction, reason: 'redis-configured', distributed: true }
  }
  if (!isProduction) {
    return { mode: 'memory', environment, production: false, reason: 'non-production', distributed: false }
  }
  if (isExplicitTrue(env.RATE_LIMIT_ALLOW_MEMORY_FALLBACK)) {
    return { mode: 'memory-degraded', environment, production: true, reason: 'explicit-memory-opt-in', distributed: false }
  }
  return { mode: 'unavailable', environment, production: true, reason: 'production-without-redis', distributed: false }
}

/**
 * Almacén de ventana deslizante en memoria.
 *
 * Cada instancia serverless tiene su propio mapa; por eso no sustituye a Redis
 * en producción, pero sí hace deterministas las pruebas y el desarrollo.
 * `hit()` es síncrono: dentro de un proceso no hay dos escrituras concurrentes
 * sobre el mismo bucket.
 *
 * @param {{now?: () => number, maxKeys?: number}} [options]
 */
export function createMemoryStore(options = {}) {
  const now = typeof options.now === 'function' ? options.now : () => Date.now()
  const maxKeys = Number.isInteger(options.maxKeys) && options.maxKeys > 0 ? options.maxKeys : 5_000
  /** @type {Map<string, {windowMs: number, timestamps: number[]}>} */
  const buckets = new Map()

  function prune(instant = now()) {
    for (const [key, bucket] of buckets) {
      const latest = bucket.timestamps[bucket.timestamps.length - 1]
      if (latest === undefined || latest <= instant - bucket.windowMs) {
        buckets.delete(key)
      }
    }
  }

  function hit(key, limit, windowMs) {
    if (typeof key !== 'string' || !key) throw new TypeError('La clave del limitador es obligatoria.')
    if (!Number.isInteger(limit) || limit < 1) throw new TypeError('El límite debe ser un entero positivo.')
    if (!Number.isInteger(windowMs) || windowMs < 1) throw new TypeError('La ventana debe ser un entero positivo.')

    const instant = now()
    let bucket = buckets.get(key)
    if (!bucket || bucket.windowMs !== windowMs) {
      bucket = { windowMs, timestamps: [] }
      buckets.set(key, bucket)
    }

    const cutoff = instant - windowMs
    // Se conservan sólo los aciertos dentro de la ventana; el filtrado es una
    // operación síncrona y por eso no puede intercalarse con otro `hit`.
    bucket.timestamps = bucket.timestamps.filter((timestamp) => timestamp > cutoff)

    if (bucket.timestamps.length >= limit) {
      const reset = bucket.timestamps[0] + windowMs
      return {
        success: false,
        limit,
        remaining: 0,
        reset,
        used: bucket.timestamps.length,
        source: 'memory',
      }
    }

    bucket.timestamps.push(instant)
    if (buckets.size > maxKeys) {
      prune(instant)
      // Si todas las claves siguen activas, se descarta la más antigua por
      // orden de inserción. En desarrollo evita que una rotación de claves
      // agote la memoria; en producción el backend es Redis.
      while (buckets.size > maxKeys) {
        let evicted = false
        for (const candidate of buckets.keys()) {
          if (candidate !== key) {
            buckets.delete(candidate)
            evicted = true
            break
          }
        }
        if (!evicted) break
      }
    }
    return {
      success: true,
      limit,
      remaining: Math.max(0, limit - bucket.timestamps.length),
      reset: bucket.timestamps[0] + windowMs,
      used: bucket.timestamps.length,
      source: 'memory',
    }
  }

  return {
    hit,
    prune: () => prune(now()),
    size: () => buckets.size,
    clear: () => buckets.clear(),
  }
}

/**
 * Contadores en memoria para diagnóstico. No sustituyen a un sistema de
 * observabilidad: permiten ver, en la misma instancia, cuántas solicitudes se
 * permitieron, bloquearon o fallaron.
 */
export function createRateLimitMetrics() {
  /** @type {Map<string, {scope: string, outcome: string, count: number}>} */
  const counters = new Map()

  return {
    record(scope, outcome) {
      const key = `${scope}:${outcome}`
      const entry = counters.get(key)
      if (entry) entry.count += 1
      else counters.set(key, { scope, outcome, count: 1 })
    },
    snapshot() {
      /** @type {Record<string, Record<string, number>>} */
      const result = {}
      for (const { scope, outcome, count } of counters.values()) {
        result[scope] ??= {}
        result[scope][outcome] = count
      }
      return result
    },
    reset() {
      counters.clear()
    },
  }
}
