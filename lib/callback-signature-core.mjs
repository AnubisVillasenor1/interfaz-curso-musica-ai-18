/**
 * Núcleo puro de firma de callbacks de generación.
 *
 * El proveedor musical no firma sus notificaciones, así que firmamos la URL que
 * le entregamos. La firma cubre `songId`, la expiración y el nonce: sin esos
 * tres datos no se puede reutilizar una URL antigua ni inventar una nueva.
 *
 * `lib/callback-signature.ts` es el adaptador que lee el secreto del entorno;
 * este archivo no toca `process.env` para que `node --test` pueda probarlo con
 * secretos y relojes inyectados.
 */

export const DEFAULT_CALLBACK_TTL_SECONDS = 24 * 60 * 60

const encoder = new TextEncoder()

function timingSafeEqual(a, b) {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i += 1) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diff === 0
}

async function hmac(secret, message) {
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(message))
  return Array.from(new Uint8Array(signature))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')
}

/** Mensaje canónico; cambiar su forma invalida todas las firmas existentes. */
export function callbackMessage(songId, expiresAt, nonce) {
  return `v1.${songId}.${expiresAt}.${nonce}`
}

/** Nonce aleatorio de 128 bits en hexadecimal. */
export function createCallbackNonce() {
  const bytes = new Uint8Array(16)
  crypto.getRandomValues(bytes)
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('')
}

/**
 * Crea la firma y sus metadatos.
 * @param {{secret: string, songId: string, ttlSeconds?: number, now?: number, nonce?: string}} input
 * @returns {Promise<{signature: string, expiresAt: number, nonce: string}>}
 */
export async function createCallbackSignature(input) {
  const secret = typeof input?.secret === 'string' ? input.secret : ''
  const songId = typeof input?.songId === 'string' ? input.songId.trim() : ''
  if (!secret) throw new TypeError('La firma del callback exige un secreto.')
  if (!songId) throw new TypeError('La firma del callback exige un songId.')

  const now = Number.isFinite(input.now) ? input.now : Date.now()
  const ttlSeconds = Number.isInteger(input.ttlSeconds) && input.ttlSeconds > 0
    ? input.ttlSeconds
    : DEFAULT_CALLBACK_TTL_SECONDS
  const expiresAt = Math.floor(now / 1000) + ttlSeconds
  const nonce = typeof input.nonce === 'string' && input.nonce.trim()
    ? input.nonce.trim()
    : createCallbackNonce()

  return {
    signature: await hmac(secret, callbackMessage(songId, expiresAt, nonce)),
    expiresAt,
    nonce,
  }
}

/**
 * Verifica firma, expiración y formato.
 *
 * Devuelve un motivo concreto para que la ruta pueda registrar el intento sin
 * confundir "firma manipulada" con "llegó tarde".
 *
 * @param {{secret: string, songId: string, signature: string|null, expiresAt: string|number|null, nonce: string|null, now?: number, clockSkewSeconds?: number}} input
 * @returns {Promise<'ok'|'missing'|'malformed'|'expired'|'invalid'>}
 */
export async function verifyCallbackSignature(input) {
  const secret = typeof input?.secret === 'string' ? input.secret : ''
  const songId = typeof input?.songId === 'string' ? input.songId.trim() : ''
  const signature = typeof input?.signature === 'string' ? input.signature.trim().toLowerCase() : ''
  const nonce = typeof input?.nonce === 'string' ? input.nonce.trim() : ''
  const rawExpires = input?.expiresAt

  if (!songId || !signature || !nonce || rawExpires === null || rawExpires === undefined || rawExpires === '') {
    return 'missing'
  }
  if (!/^[0-9a-f]{64}$/.test(signature)) return 'malformed'
  if (!/^[0-9a-f]{16,128}$/.test(nonce)) return 'malformed'

  const expiresAt = typeof rawExpires === 'number' ? rawExpires : Number(rawExpires)
  if (!Number.isInteger(expiresAt) || expiresAt <= 0) return 'malformed'

  const now = Number.isFinite(input.now) ? input.now : Date.now()
  const skew = Number.isInteger(input.clockSkewSeconds) && input.clockSkewSeconds >= 0
    ? input.clockSkewSeconds
    : 0
  if (Math.floor(now / 1000) > expiresAt + skew) return 'expired'

  if (!secret) return 'missing'
  const expected = await hmac(secret, callbackMessage(songId, expiresAt, nonce))
  return timingSafeEqual(expected, signature) ? 'ok' : 'invalid'
}
