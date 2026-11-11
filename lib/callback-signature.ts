/**
 * Adaptador de firma de callbacks.
 *
 * El proveedor musical no firma sus notificaciones, así que firmamos la URL que
 * le entregamos. La firma cubre `songId`, la expiración y un nonce de un solo
 * uso: una URL filtrada deja de servir al caducar y no puede aplicarse dos
 * veces aunque siga vigente.
 *
 * La lógica pura vive en `callback-signature-core.mjs` para probarla con Node
 * sin Next ni variables de entorno.
 */

import {
  DEFAULT_CALLBACK_TTL_SECONDS,
  createCallbackSignature,
  verifyCallbackSignature as verifyWithSecret,
  type CallbackSignature,
  type CallbackVerifyReason,
} from './callback-signature-core.mjs'

export { DEFAULT_CALLBACK_TTL_SECONDS }
export type { CallbackSignature, CallbackVerifyReason }

function callbackSecret(): string {
  return process.env.GENERATOR_CALLBACK_SECRET?.trim() ?? ''
}

export function callbackSecretConfigured(): boolean {
  return callbackSecret().length > 0
}

/**
 * Firma canónica de una canción. Devuelve `null` si el secreto no está
 * configurado para que la ruta de generación falle cerrada.
 */
export async function signCallbackUrl(
  songId: string,
  options: { ttlSeconds?: number; now?: number; nonce?: string } = {},
): Promise<CallbackSignature | null> {
  const secret = callbackSecret()
  if (!secret) return null
  return createCallbackSignature({
    secret,
    songId,
    ttlSeconds: options.ttlSeconds ?? DEFAULT_CALLBACK_TTL_SECONDS,
    now: options.now,
    nonce: options.nonce,
  })
}

/**
 * Verifica firma, expiración y nonce.
 *
 * Sin secreto configurado se rechaza el callback: aceptarlo a ciegas
 * convertiría cualquier URL filtrada en una escritura con `service_role`.
 */
export async function verifyCallbackSignature(
  songId: string,
  signature: string | null,
  expiresAt: string | number | null,
  nonce: string | null,
  options: { now?: number; clockSkewSeconds?: number } = {},
): Promise<CallbackVerifyReason> {
  const secret = callbackSecret()
  if (!secret) {
    console.error('[callback] GENERATOR_CALLBACK_SECRET no configurado: callback rechazado')
    return 'missing'
  }
  return verifyWithSecret({
    secret,
    songId,
    signature,
    expiresAt,
    nonce,
    now: options.now,
    clockSkewSeconds: options.clockSkewSeconds ?? 60,
  })
}
