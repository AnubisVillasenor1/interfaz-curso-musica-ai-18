/**
 * Firma de los callbacks de generación.
 *
 * `app/api/generate/callback/route.ts` era público y no verificaba nada: solo
 * miraba que el `songId` tuviera forma de UUID y escribía con `service_role`.
 * Quien conociera un identificador —por el tráfico de su propia sesión, por un
 * log, por cualquier fuga— podía reemplazar el audio de otra persona por una
 * URL arbitraria. Eso es inyección de contenido en la biblioteca ajena.
 *
 * El proveedor no firma sus notificaciones, así que firmamos nosotros la
 * propia URL: el callback solo se acepta si lleva el HMAC del `songId` con un
 * secreto que el cliente jamás ve.
 */

const encoder = new TextEncoder()

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i += 1) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diff === 0
}

async function hmac(secret: string, message: string): Promise<string> {
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

export function callbackSecretConfigured(): boolean {
  return Boolean(process.env.GENERATOR_CALLBACK_SECRET)
}

/** Firma corta y estable sobre el identificador de la canción. */
export async function signCallbackUrl(songId: string): Promise<string | null> {
  const secret = process.env.GENERATOR_CALLBACK_SECRET
  if (!secret) return null
  return hmac(secret, songId)
}

export async function verifyCallbackSignature(songId: string, signature: string | null): Promise<boolean> {
  const secret = process.env.GENERATOR_CALLBACK_SECRET
  if (!secret) {
    // Sin secreto configurado no hay forma de autenticar el callback. Se
    // rechaza en lugar de aceptar a ciegas: el fallo es visible y se arregla
    // con una variable de entorno, no con un parche de código.
    console.error('[callback] GENERATOR_CALLBACK_SECRET no configurado: callback rechazado')
    return false
  }
  if (!signature || !/^[0-9a-f]{64}$/i.test(signature)) return false
  const expected = await hmac(secret, songId)
  return timingSafeEqual(expected, signature.toLowerCase())
}
