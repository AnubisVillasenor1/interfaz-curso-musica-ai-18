export const DEFAULT_CALLBACK_TTL_SECONDS: number

export type CallbackVerifyReason = 'ok' | 'missing' | 'malformed' | 'expired' | 'invalid'

export interface CallbackSignature {
  signature: string
  expiresAt: number
  nonce: string
}

export function callbackMessage(songId: string, expiresAt: number, nonce: string): string
export function createCallbackNonce(): string

export function createCallbackSignature(input: {
  secret: string
  songId: string
  ttlSeconds?: number
  now?: number
  nonce?: string
}): Promise<CallbackSignature>

export function verifyCallbackSignature(input: {
  secret: string
  songId: string
  signature: string | null | undefined
  expiresAt: string | number | null | undefined
  nonce: string | null | undefined
  now?: number
  clockSkewSeconds?: number
}): Promise<CallbackVerifyReason>
