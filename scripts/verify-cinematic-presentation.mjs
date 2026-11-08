import fs from 'node:fs'

const scenes = fs.readFileSync('lib/cinematic/scenes.ts', 'utf8')
const intro = fs.readFileSync('components/cinematic/cinematic-intro.tsx', 'utf8')
const gate = fs.readFileSync('components/cinematic/intro-gate.tsx', 'utf8')
const route = fs.readFileSync('app/presentacion/page.tsx', 'utf8')
const layout = fs.readFileSync('app/layout.tsx', 'utf8')
const smoke = fs.readFileSync('scripts/smoke-preview.mjs', 'utf8')
const css = fs.readFileSync('app/globals.css', 'utf8')

const start = scenes.indexOf('export const CINEMATIC_ACTS: CinematicAct[] = [')
const end = scenes.indexOf('/** Paleta usada por el fallback sin WebGL', start)
if (start < 0 || end < 0) throw new Error('No se encontró el catálogo de actos cinemáticos')
const acts = scenes.slice(start, end)
const checks = [
  ['exactly five story acts', (acts.match(/\\n  \\{\\n    id:/g) || []).length === 5],
  ['each story act lasts 12 seconds', (acts.match(/duration: 12,/g) || []).length === 5],
  ['sixty-second total remains derived from act durations', scenes.includes('CINEMATIC_ACTS.reduce((sum, act) => sum + act.duration, 0)')],
  ['five source narrative beats are present', ['SISTEMA NERVIOSO TECNOLÓGICO', 'DIAGNÓSTICO HISTÓRICO', 'PERSPECTIVA CRÍTICA', 'LA PROPUESTA TRANSFORMADORA', 'DECLARACIÓN DE EXISTENCIA'].every((phrase) => acts.includes(phrase))],
  ['official palette colors are represented', ['#00E5FF', '#0052FF', '#E05A47', '#E5E4E2'].every((color) => acts.includes(color))],
  ['real WebGL renderer remains active', intro.includes('<Canvas') && intro.includes('<CinematicStage')],
  ['reduced-motion support remains present', intro.includes('prefersReducedMotion') && intro.includes('capabilities.reduced')],
  ['keyboard navigation and skip remain present', intro.includes("event.key === 'Escape'") && intro.includes("event.key === 'ArrowRight'") && intro.includes('Saltar')],
  ['presentation can be replayed on small screens', gate.includes('inline-flex max-sm:right-3') && gate.includes('Ver presentación') && !gate.includes('hidden items-center gap-2 font-mono text-[9.5px]')],
  ['direct route forces the cinematic intro', route.includes("redirect('/?intro=on')")],
  ['global navigation links to the presentation', layout.includes('href="/presentacion"')],
  ['preview smoke test validates the redirect target', smoke.includes("path: '/presentacion'") && smoke.includes("target.searchParams.get('intro') === 'on'")],
  ['cinematic styles use cyan and terracotta accents', css.includes('#00E5FF') && css.includes('#E05A47')],
]

let failures = 0
for (const [label, ok] of checks) {
  console.log((ok ? 'PASS ' : 'FAIL ') + label)
  if (!ok) failures += 1
}
if (failures) {
  console.error('Cinematic presentation verification failed: ' + failures + '/' + checks.length)
  process.exitCode = 1
} else {
  console.log('Cinematic presentation verification passed: ' + checks.length + '/' + checks.length)
}
