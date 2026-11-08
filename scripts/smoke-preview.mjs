const baseUrl = (process.env.BASE_URL || 'http://127.0.0.1:3000').replace(/\/$/, '')
const checks = [
  { path: '/', label: 'home', method: 'GET', expected: [200] },
  { path: '/curso', label: 'course catalog', method: 'GET', expected: [200] },
  { path: '/precios', label: 'pricing', method: 'GET', expected: [200] },
  { path: '/perfil', label: 'profile route', method: 'GET', expected: [200, 307, 308] },
  { path: '/biblioteca', label: 'library route', method: 'GET', expected: [200, 307, 308] },
  { path: '/studio', label: 'music studio', method: 'GET', expected: [200] },
  { path: '/curso/laboratorio-audio', label: 'advanced audio lab overview', method: 'GET', expected: [200] },
  { path: '/curso/laboratorio-audio/modulo-1', label: 'DSP lab module', method: 'GET', expected: [200] },
  { path: '/curso/laboratorio-audio/modulo-2', label: 'mastering lab module', method: 'GET', expected: [200] },
  { path: '/curso/laboratorio-audio/modulo-3', label: 'generative AI lab module', method: 'GET', expected: [200] },
  { path: '/curso/laboratorio-audio/modulo-4', label: 'plugins lab module', method: 'GET', expected: [200] },
  { path: '/curso/laboratorio-audio/modulo-5', label: 'governance lab module', method: 'GET', expected: [200] },
  { path: '/curso/laboratorio-audio/modulo-6', label: 'capstone lab module', method: 'GET', expected: [200] },
  { path: '/curso/laboratorio-audio/evaluacion', label: 'advanced audio assessment overview', method: 'GET', expected: [200] },
  { path: '/curso/laboratorio-audio/evaluacion/generative', label: 'generative exam page', method: 'GET', expected: [200] },
  { path: '/curso/laboratorio-audio/evaluacion/plugins', label: 'plugins exam page', method: 'GET', expected: [200] },
  { path: '/curso/laboratorio-audio/evaluacion/governance', label: 'governance exam page', method: 'GET', expected: [200] },
  { path: '/curso/laboratorio-audio/evaluacion/capstone', label: 'capstone exam page', method: 'GET', expected: [200] },
  { path: '/robots.txt', label: 'robots.txt metadata route', method: 'GET', expected: [200] },
  { path: '/sitemap.xml', label: 'sitemap metadata route', method: 'GET', expected: [200] },
  { path: '/api/checkout', label: 'checkout fails closed without Supabase', method: 'POST', body: { productId: 'play-and-go-course' }, expected: [503] },
  { path: '/api/generate', label: 'generation fails closed without Supabase', method: 'POST', body: { title: 'CI smoke test', prompt: 'instrumental piano', engine: 'local' }, expected: [503] },
  { path: '/api/stripe/webhook', label: 'Stripe webhook fails closed without secrets', method: 'POST', body: {}, expected: [503] },
  { path: '/api/music/plan', label: 'music planner fallback', method: 'POST', body: { prompt: 'instrumental ambient piano for focus' }, expected: [200] },
  { path: '/api/agent', label: 'course assistant fallback', method: 'POST', body: { message: '¿Qué aprenderé en el curso?' }, expected: [200] },
  { path: '/api/advanced-audio/exam?module=dsp', label: 'DSP exam publishes questions without answer key', method: 'GET', expected: [200] },
  { path: '/api/advanced-audio/exam?module=mastering', label: 'mastering exam publishes questions without answer key', method: 'GET', expected: [200] },
  { path: '/api/advanced-audio/exam?module=generative', label: 'generative exam publishes questions without answer key', method: 'GET', expected: [200] },
  { path: '/api/advanced-audio/exam?module=plugins', label: 'plugins exam publishes questions without answer key', method: 'GET', expected: [200] },
  { path: '/api/advanced-audio/exam?module=governance', label: 'governance exam publishes questions without answer key', method: 'GET', expected: [200] },
  { path: '/api/advanced-audio/exam?module=capstone', label: 'capstone exam publishes questions without answer key', method: 'GET', expected: [200] },
  { path: '/api/advanced-audio/exam?module=unknown', label: 'unknown exam module fails closed', method: 'GET', expected: [400] },
  { path: '/api/advanced-audio/evaluate', label: 'AI assessment fails closed without configured Supabase', method: 'POST', body: { moduleId: 'dsp', evidenceSummary: 'CI no-credential test' }, expected: [503] },
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
    if (check.path.startsWith('/api/advanced-audio/exam?module=') && response.status === 200) {
      const payload = await response.json().catch(() => null)
      const publicContractOk =
        Array.isArray(payload?.questions) &&
        payload.questions.length === 20 &&
        payload.questions.every((question) =>
          typeof question.id === 'string' &&
          Array.isArray(question.options) &&
          question.options.length === 3 &&
          !('correctIndex' in question) &&
          !('answer' in question),
        )
      if (!publicContractOk) {
        failures += 1
        console.error('FAIL advanced audio exam contract: missing 20 public questions or answer key leaked')
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
