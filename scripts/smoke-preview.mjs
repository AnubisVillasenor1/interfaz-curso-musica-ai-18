const baseUrl = (process.env.BASE_URL || 'http://127.0.0.1:3000').replace(/\/$/, '')
const checks = [
  { path: '/', label: 'home' },
  { path: '/curso', label: 'course catalog' },
  { path: '/precios', label: 'pricing' },
  { path: '/perfil', label: 'profile route' },
  { path: '/biblioteca', label: 'library route' },
  { path: '/studio', label: 'music studio' },
  { path: '/robots.txt', label: 'robots.txt' },
  { path: '/sitemap.xml', label: 'sitemap.xml' },
]

let failures = 0
for (const check of checks) {
  try {
    const response = await fetch(new URL(check.path, baseUrl), { redirect: 'manual' })
    const ok = response.status === 200
    console.log(`${ok ? 'PASS' : 'FAIL'} ${check.label}: GET ${check.path} -> ${response.status}`)
    if (!ok) failures += 1
  } catch (error) {
    failures += 1
    console.error(`FAIL ${check.label}: GET ${check.path} -> ${error instanceof Error ? error.message : String(error)}`)
  }
}

if (failures > 0) {
  console.error(`Smoke checks failed: ${failures}/${checks.length}`)
  process.exitCode = 1
} else {
  console.log(`Smoke checks passed: ${checks.length}/${checks.length}`)
}
