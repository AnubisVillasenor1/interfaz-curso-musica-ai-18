/**
 * Prueba HTTP del limitador contra el servidor de producción de CI.
 *
 * No comprueba la implementación interna: usa la misma superficie que un
 * cliente real y demuestra que el cupo se aplica y se comunica con 429 y
 * `Retry-After`. Se ejecuta después de `scripts/smoke-preview.mjs`, que ya
 * verifica que los tres endpoints deterministas dejan de responder 503 sin
 * Redis en CI.
 */

const baseUrl = (process.env.BASE_URL || 'http://127.0.0.1:3000').replace(/\/$/, '')
let failures = 0

function pass(message) {
  console.log(`PASS ${message}`)
}

function fail(message) {
  failures += 1
  console.error(`FAIL ${message}`)
}

async function post(path, body, headers = {}) {
  return fetch(new URL(path, baseUrl), {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...headers },
    body: JSON.stringify(body),
  })
}

// Una IP reservada para documentación aísla este bloque del resto de smoke
// tests, que no envían cabecera y caen en la clave `sin-ip`.
const ip = '203.0.113.10'
const statuses = []
for (let index = 0; index < 25; index += 1) {
  const response = await post('/api/music/plan', { prompt: 'ambient piano para estudiar' }, { 'x-real-ip': ip })
  statuses.push({ status: response.status, headers: response.headers })
}

const allowed = statuses.filter((entry) => entry.status === 200).length
const limited = statuses.filter((entry) => entry.status === 429).length
if (allowed === 20 && limited === 5) {
  pass(`music/plan aplica el cupo 20/min (${allowed} permitidas, ${limited} bloqueadas)`)
} else {
  fail(`music/plan cupo inesperado: ${allowed} permitidas y ${limited} bloqueadas (esperado 20 y 5)`)
}

const firstLimited = statuses.find((entry) => entry.status === 429)
if (!firstLimited) {
  fail('music/plan no devolvió ningún 429')
} else {
  const retryAfter = Number(firstLimited.headers.get('retry-after'))
  const remaining = firstLimited.headers.get('x-ratelimit-remaining')
  const mode = firstLimited.headers.get('x-ratelimit-mode')
  if (Number.isInteger(retryAfter) && retryAfter >= 1) pass('la respuesta 429 incluye Retry-After válido')
  else fail(`Retry-After inválido: ${firstLimited.headers.get('retry-after')}`)
  if (remaining === '0') pass('la respuesta 429 declara cupo restante 0')
  else fail(`X-RateLimit-Remaining inesperado: ${remaining}`)
  if (mode === 'memory' || mode === 'distributed' || mode === 'memory-degraded') {
    pass(`la respuesta 429 declara el modo del limitador (${mode})`)
  } else {
    fail(`X-RateLimit-Mode ausente o inválido: ${mode}`)
  }
}

// Los tres endpoints de la regresión deben seguir respondiendo sin Redis en CI.
const endpoints = [
  { path: '/api/music/plan', body: { prompt: 'tiny ambient sketch' }, ip: '203.0.113.21' },
  {
    path: '/api/music/agents',
    body: { prompt: 'house cinemático en La menor a 122 bpm' },
    ip: '203.0.113.22',
  },
  { path: '/api/agent', body: { message: '¿Qué aprenderé en el curso?' }, ip: '203.0.113.23' },
]
for (const endpoint of endpoints) {
  const response = await post(endpoint.path, endpoint.body, { 'x-real-ip': endpoint.ip })
  if (response.status === 200) pass(`${endpoint.path} responde 200 sin Redis en CI`)
  else fail(`${endpoint.path} respondió ${response.status} sin Redis en CI`)
}

if (failures > 0) {
  console.error(`Rate limit HTTP checks failed: ${failures}`)
  process.exitCode = 1
} else {
  console.log('Rate limit HTTP checks passed')
}
