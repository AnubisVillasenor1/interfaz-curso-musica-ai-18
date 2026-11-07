const baseUrl = (process.env.BASE_URL || 'http://127.0.0.1:3000').replace(/\/$/, '')
const checks = [
  { path: '/', label: 'home', method: 'GET', expected: [200] },
  { path: '/curso', label: 'course catalog', method: 'GET', expected: [200] },
  { path: '/precios', label: 'pricing', method: 'GET', expected: [200] },
  { path: '/perfil', label: 'profile route', method: 'GET', expected: [200, 307, 308] },
  { path: '/biblioteca', label: 'library route', method: 'GET', expected: [200, 307, 308] },
  { path: '/studio', label: 'music studio', method: 'GET', expected: [200] },
  { path: '/robots.txt', label: 'robots.txt metadata route', method: 'GET', expected: [200] },
  { path: '/sitemap.xml', label: 'sitemap metadata route', method: 'GET', expected: [200] },
  { path: '/api/checkout', label: 'checkout fails closed without Supabase', method: 'POST', body: { productId: 'play-and-go-course' }, expected: [503] },
  { path: '/api/generate', label: 'generation fails closed without Supabase', method: 'POST', body: { title: 'CI smoke test', prompt: 'instrumental piano', engine: 'local' }, expected: [503] },
  { path: '/api/stripe/webhook', label: 'Stripe webhook fails closed without secrets', method: 'POST', body: {}, expected: [503] },
  { path: '/api/music/plan', label: 'music planner fallback', method: 'POST', body: { prompt: 'instrumental ambient piano for focus' }, expected: [200] },
  { path: '/api/agent', label: 'course assistant fallback', method: 'POST', body: { message: '¿Qué aprenderé en el curso?' }, expected: [200] },
]

let failures = 0
for (const check of checks) {
  try {
    const response = await fetch(new URL(check.path, baseUrl), {
      method: check.method,
      redirect: 'manual',
      headers: check.body ? { 'content-type': 'application/json' } : undefined,
      body: check.body ? JSON.stringify(check.body) : undefined,
    })
    const ok = check.expected.includes(response.status)
    console.log(`${ok ? 'PASS' : 'FAIL'} ${check.label}: ${check.method} ${check.path} -> ${response.status} (expected ${check.expected.join(' or ')})`)
    if (!ok) {
      failures += 1
      continue
    }

    if (check.path === '/api/music/plan' && response.status === 200) {
      const payload = await response.json().catch(() => null)
      if (!payload?.plan || typeof payload.plan !== 'object') {
        failures += 1
        console.error('FAIL music planner response contract: missing plan object')
      }
    }
    if (check.path === '/api/agent' && response.status === 200) {
      const payload = await response.json().catch(() => null)
      if (typeof payload?.answer !== 'string' || !payload.answer.trim()) {
        failures += 1
        console.error('FAIL course assistant response contract: missing answer')
      }
    }
    if (check.path.startsWith('/api/') && response.status >= 500) {
      const cacheControl = response.headers.get('cache-control') || ''
      if (!cacheControl.includes('no-store')) {
        console.warn(`WARN ${check.path}: verify private/no-store headers for error responses`)
      }
    }
  } catch (error) {
    failures += 1
    console.error(`FAIL ${check.label}: ${check.method} ${check.path} -> ${error instanceof Error ? error.message : String(error)}`)
  }
}

if (failures > 0) {
  console.error(`Smoke checks failed: ${failures}/${checks.length} checks or response-contract assertions`)
  process.exitCode = 1
} else {
  console.log(`Smoke checks passed: ${checks.length}/${checks.length}`)
}
