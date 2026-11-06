// Contraste WCAG 2.1 de los tokens del sistema editorial.
// Uso: node scripts/contraste-editorial.mjs
// No pinta nada: calcula. Los números de docs/SISTEMA-EDITORIAL.md §4 salen de aquí.
//   luminancia relativa = fórmula de la recomendación (umbral 0,03928, exponente 2,4)
//   ratio = (Lmax + 0,05) / (Lmin + 0,05)
//   composición del resplandor = over() canal por canal en sRGB 8 bits

const TOKENS = {
  '--pg-ink': '#edfaff',
  '--pg-text': '#adc4d0',
  '--pg-muted': '#7f9aa7',
  '--pg-cyan': '#75e9f2',
  '--pg-violet': '#c09eff',
  '--pg-magenta': '#ff9eea',
  '--pg-amber': '#ffcf72',
  '--pg-mint': '#83d7b4',
}
const BG = '#07121f'
const SURFACE = '#0b1f2e'
const GLOW_CYAN_ALPHA = 0.13
const GLOW_VIOLET_ALPHA = 0.11

const chan = (hex, i) => parseInt(hex.replace('#', '').slice(i * 2, i * 2 + 2), 16) / 255
const lum = (hex) => {
  const v = [0, 1, 2].map((i) => {
    const c = chan(hex, i)
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
  })
  return 0.2126 * v[0] + 0.7152 * v[1] + 0.0722 * v[2]
}
const ratio = (a, b) => {
  const la = lum(a)
  const lb = lum(b)
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05)
}
const over = (fg, bg, alpha) => {
  const c = [0, 1, 2].map((i) => Math.round(alpha * chan(fg, i) * 255 + (1 - alpha) * chan(bg, i) * 255))
  return '#' + c.map((x) => x.toString(16).padStart(2, '0')).join('')
}

const glowCyan = over(TOKENS['--pg-cyan'], BG, GLOW_CYAN_ALPHA)
const glowBoth = over(TOKENS['--pg-violet'], glowCyan, GLOW_VIOLET_ALPHA)

const aa = (r) => (r >= 4.5 ? (r >= 7 ? 'AAA' : 'AA') : 'NO')
const row = (name, hex) =>
  name.padEnd(11) +
  hex.padEnd(9) +
  'bg ' + ratio(hex, BG).toFixed(2) + ' ' + aa(ratio(hex, BG)) + '   ' +
  'surface ' + ratio(hex, SURFACE).toFixed(2) + ' ' + aa(ratio(hex, SURFACE)) + '   ' +
  'glow(' + glowCyan + ') ' + ratio(hex, glowCyan).toFixed(2) + ' ' + aa(ratio(hex, glowCyan)) + '   ' +
  'glow doble(' + glowBoth + ') ' + ratio(hex, glowBoth).toFixed(2) + ' ' + aa(ratio(hex, glowBoth))

console.log('fondo puro ' + BG + ' · superficie ' + SURFACE + ' · resplandor de una capa ' + glowCyan + ' · techo teórico de dos capas ' + glowBoth)
for (const [name, hex] of Object.entries(TOKENS)) console.log(row(name, hex))
console.log('Umbral usado: AA 4,5:1 texto normal · AAA 7:1. El --pg-muted no llega a AAA: es un color de metadatos, no de prosa.')
