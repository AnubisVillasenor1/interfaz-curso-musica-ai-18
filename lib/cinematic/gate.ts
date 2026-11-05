/**
 * Gate de la intro: vive aparte del escenario 3D para que importarlo no
 * arrastre three.js al bundle inicial de la landing.
 */

const SEEN_KEY = 'pg:intro:v2'

/** La intro corre una sola vez por navegador, salvo ?intro=on / ?intro=off. */
export function shouldRunIntro(storageKey = SEEN_KEY): boolean {
  if (typeof window === 'undefined') return false
  try {
    const params = new URLSearchParams(window.location.search)
    const force = params.get('intro')
    if (force === 'on') return true
    if (force === 'off') return false
    return !window.localStorage.getItem(storageKey)
  } catch {
    return false
  }
}

export function markIntroSeen(storageKey = SEEN_KEY): void {
  try {
    window.localStorage.setItem(storageKey, String(Date.now()))
  } catch {
    /* almacenamiento bloqueado: no se recuerda la visita, nada más */
  }
}

/** Reabre la intro desde la UI sin recargar la página. */
export function replayIntro(storageKey = SEEN_KEY): void {
  try {
    window.localStorage.removeItem(storageKey)
  } catch {
    /* nothing actionable */
  }
}
