import crypto from 'crypto'

/**
 * HMAC del cuerpo crudo (§12 del manual).
 *
 * Distinto del HMAC sobre `songId` de `lib/callback-signature.ts` (legacy,
 * via query): aquí se firma el JSON completo que el engine local POSTea a
 * `/api/callback` con cabecera `x-signature`. Node `crypto` porque la
 * verificación es síncrona y la ruta es `runtime = 'nodejs'`.
 */
function timingSafeEqualHex(expected: string, given: string): boolean {
  if (!/^[0-9a-f]{64}$/i.test(given)) return false
  try {
    return crypto.timingSafeEqual(Buffer.from(expected, 'utf8'), Buffer.from(given.toLowerCase(), 'utf8'))
  } catch {
    return false
  }
}

export function createCallbackSignature(rawBody: string): string | null {
  const secret = process.env.GENERATOR_CALLBACK_SECRET
  if (!secret) return null
  return crypto.createHmac('sha256', secret).update(rawBody).digest('hex')
}

export function verifyCallbackSignatureBody(rawBody: string, signature: string | null): boolean {
  const secret = process.env.GENERATOR_CALLBACK_SECRET
  if (!secret) {
    console.error('[callback] GENERATOR_CALLBACK_SECRET no configurado: callback rechazado')
    return false
  }
  if (!signature) return false
  const expected = crypto.createHmac('sha256', secret).update(rawBody).digest('hex')
  return timingSafeEqualHex(expected, signature)
}
