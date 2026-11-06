// Inventario reproducible del sistema editorial.
// Uso: node scripts/inventario-editorial.mjs [ruta-repo]
// Imprime: primitivas declaradas, primitivas sin uso, doce más usadas,
// relaciones clase[data-tone] y archivos que montan .pg-shell.
import fs from 'node:fs'
import path from 'node:path'

const ROOT = process.argv[2] || path.resolve(import.meta.dirname, '..')
const css = fs.readFileSync(path.join(ROOT, 'app/globals.css'), 'utf8')

const decl = [...css.matchAll(/^\s{2}\.(pg-[a-z-]+)\s*\{/gm)].map((m) => m[1])
const uniq = [...new Set(decl)]
const tones = [...new Set([...css.matchAll(/\.(pg-[a-z-]+)\[data-tone='([a-z-]+)'\]/g)].map((m) => m[1] + ':' + m[2]))]

function sourceFiles(dir, acc = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.name === 'node_modules' || e.name === '.next' || e.name === '.git') continue
    const f = path.join(dir, e.name)
    if (e.isDirectory()) sourceFiles(f, acc)
    else if (/\.(tsx|ts)$/.test(e.name)) acc.push(f)
  }
  return acc
}

const files = sourceFiles(ROOT)
const contents = new Map(files.map((f) => [f, fs.readFileSync(f, 'utf8')]))
const uses = uniq.map((u) => {
  let n = 0
  for (const t of contents.values()) n += (t.match(new RegExp('\\b' + u + '\\b', 'g')) || []).length
  return { name: u, count: n }
})

console.log('primitivas declaradas: ' + uniq.length)
console.log('primitivas sin uso: ' + (uses.filter((u) => u.count === 0).map((u) => u.name).join(', ') || 'ninguna'))
console.log('doce más usadas: ' + uses.slice().sort((a, b) => b.count - a.count).slice(0, 12).map((u) => u.name + ' ' + u.count).join(', '))
console.log('relaciones data-tone: ' + tones.length)
console.log('archivos que montan .pg-shell: ' + files.filter((f) => contents.get(f).includes('pg-shell')).length)
// Excepciones legítimas: Satori (opengraph) y el themeColor del metadata no resuelven
// variables CSS —son un archivo aparte del árbol pintado—, real-audio-studio lee el token
// en ejecución con getComputedStyle antes de usar su respaldo, y la intro cinemática se
// monta COMO HERMANA de .pg-shell (components/cinematic/intro-gate.tsx), así que allí
// dentro un var(--pg-*) no hereda y el literal es la única forma de pintarlo.
const excepciones = ['opengraph-image.tsx', 'real-audio-studio.tsx', 'app/layout.tsx', 'cinematic-intro.tsx']
// Tablas de datos: el literal ES el token de su propio dominio (paleta de escena,
// color de capa). No son UI, así que la regla 1 no les aplica; se cuentan aparte.
const tablas = ['lib/cinematic/scenes.ts', 'lib/music/arrangement.ts']
const relPath = (f) => path.relative(ROOT, f).replace(/\\/g, '/')
const fuera = files.filter((f) => !excepciones.some((x) => relPath(f).endsWith(x)))
// Los literales que cuentan son los que se pintan: antes de medir se quitan los
// bloques de comentario (los de JSX tambien, van dentro de llaves) y las lineas que
// empiezan por dos barras. Sin eso la cifra sube sola cuando alguien explica el sistema.
function literales(texto) {
  const sinBloques = texto.replace(/\/\*[\s\S]*?\*\//g, '')
  const lineas = sinBloques.split('\n').filter((l) => !/^\s*(\/\/|\*)/.test(l))
  return (lineas.join('\n').match(/#[0-9a-f]{6}\b|rgba?\(/g) || []).length
}
const porArchivo = fuera
  .map((f) => {
    const rel = path.relative(ROOT, f).replace(/\\/g, '/')
    return { f: rel, n: literales(contents.get(f)), tipo: tablas.includes(rel) ? 'tabla de datos' : 'deuda real' }
  })
  .filter((x) => x.n > 0)
  .sort((a, b) => b.n - a.n)
const porTipo = {}
for (const x of porArchivo) porTipo[x.tipo] = (porTipo[x.tipo] || 0) + x.n
console.log('literales de color fuera de globals.css: ' + porArchivo.reduce((a, b) => a + b.n, 0) + ' en ' + porArchivo.length + ' archivos')
for (const tipo of Object.keys(porTipo)) console.log('  ' + String(porTipo[tipo]).padStart(3) + '  ' + tipo)
for (const x of porArchivo) console.log('  ' + String(x.n).padStart(3) + '  [' + x.tipo + ']  ' + x.f)
