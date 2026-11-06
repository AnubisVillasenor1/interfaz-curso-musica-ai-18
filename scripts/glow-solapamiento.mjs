// ¿Se solapan de verdad las dos capas del resplandor?
// Cada capa es radial-gradient(circle at X Y, color 0, transparent P%), con
// tamaño implícito "farthest-corner": el rayo va del centro a la esquina más
// lejana, y el color se apaga a P% de ese rayo. Si la distancia entre los dos
// centros supera la suma de los dos rayos útiles, NINGÚN píxel recibe alfa de
// las dos capas a la vez, y el techo teórico #283a50 es inalcanzable.
// Uso: node scripts/glow-solapamiento.mjs
const viewport = [
  [1280, 800, 'portatil estandar'],
  [1440, 900, 'escritorio'],
  [1920, 1080, 'monitor grande'],
  [390, 844, 'movil pixel'],
  [768, 1024, 'tablet'],
]
// Capa 1: circle at 76% 2%, transparente en el 33%. Capa 2: at 14% 86%, 35%.
const A = { x: 0.76, y: 0.02, stop: 0.33 }
const B = { x: 0.14, y: 0.86, stop: 0.35 }

function ray(cx, cy, w, h) {
  // distancia al vértice más lejano
  const dx = Math.max(cx, w - cx)
  const dy = Math.max(cy, h - cy)
  return Math.hypot(dx, dy)
}

for (const [w, h, label] of viewport) {
  const ax = A.x * w, ay = A.y * h, bx = B.x * w, by = B.y * h
  const ra = ray(ax, ay, w, h) * A.stop
  const rb = ray(bx, by, w, h) * B.stop
  const d = Math.hypot(bx - ax, by - ay)
  console.log(
    label.padEnd(18) + w + 'x' + h +
    '  radio A ' + ra.toFixed(0) + '  radio B ' + rb.toFixed(0) +
    '  suma ' + (ra + rb).toFixed(0) +
    '  distancia centros ' + d.toFixed(0) +
    '  -> ' + (d > ra + rb ? 'SIN solape: la doble alfa no existe' : 'SOLAPAN: doble alfa posible en ' + (ra + rb - d).toFixed(0) + ' px de banda'),
  )
}
