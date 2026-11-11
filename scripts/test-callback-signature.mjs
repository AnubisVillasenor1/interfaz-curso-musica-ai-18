/**
 * Pruebas del núcleo de firma de callbacks.
 *
 * Ejecutar con `node --test scripts/test-callback-signature.mjs`. No necesitan
 * Next, base de datos ni red: el secreto, el reloj y el nonce son inyectables.
 */

import assert from 'node:assert/strict'
import test from 'node:test'

import {
  DEFAULT_CALLBACK_TTL_SECONDS,
  callbackMessage,
  createCallbackNonce,
  createCallbackSignature,
  verifyCallbackSignature,
} from '../lib/callback-signature-core.mjs'

const secret = 'secreto-de-prueba-no-usar-en-produccion'
const songId = '5f0c9f0e-6f3a-4c2b-9d1e-7a8b9c0d1e2f'
const fixedNow = 1_800_000_000_000

test('una firma recién creada verifica y expone sus metadatos', async () => {
  const token = await createCallbackSignature({ secret, songId, now: fixedNow })
  assert.match(token.signature, /^[0-9a-f]{64}$/)
  assert.match(token.nonce, /^[0-9a-f]{32}$/)
  assert.equal(token.expiresAt, Math.floor(fixedNow / 1000) + DEFAULT_CALLBACK_TTL_SECONDS)
  assert.equal(
    await verifyCallbackSignature({
      secret,
      songId,
      signature: token.signature,
      expiresAt: token.expiresAt,
      nonce: token.nonce,
      now: fixedNow,
    }),
    'ok',
  )
})

test('la firma cubre songId, expiración y nonce', async () => {
  const token = await createCallbackSignature({ secret, songId, now: fixedNow })
  const otherSong = '00000000-0000-4000-8000-000000000000'

  assert.equal(
    await verifyCallbackSignature({
      secret,
      songId: otherSong,
      signature: token.signature,
      expiresAt: token.expiresAt,
      nonce: token.nonce,
      now: fixedNow,
    }),
    'invalid',
  )

  assert.equal(
    await verifyCallbackSignature({
      secret,
      songId,
      signature: token.signature,
      expiresAt: token.expiresAt + 1,
      nonce: token.nonce,
      now: fixedNow,
    }),
    'invalid',
  )

  assert.equal(
    await verifyCallbackSignature({
      secret,
      songId,
      signature: token.signature,
      expiresAt: token.expiresAt,
      nonce: createCallbackNonce(),
      now: fixedNow,
    }),
    'invalid',
  )
})

test('una firma caducada se rechaza como expired', async () => {
  const token = await createCallbackSignature({ secret, songId, ttlSeconds: 60, now: fixedNow })
  assert.equal(
    await verifyCallbackSignature({
      secret,
      songId,
      signature: token.signature,
      expiresAt: token.expiresAt,
      nonce: token.nonce,
      now: fixedNow + 61_000,
    }),
    'expired',
  )
})

test('la tolerancia de reloj es explícita y acotada', async () => {
  const token = await createCallbackSignature({ secret, songId, ttlSeconds: 60, now: fixedNow })
  const justAfter = fixedNow + 65_000
  assert.equal(
    await verifyCallbackSignature({
      secret,
      songId,
      signature: token.signature,
      expiresAt: token.expiresAt,
      nonce: token.nonce,
      now: justAfter,
      clockSkewSeconds: 10,
    }),
    'ok',
  )
  assert.equal(
    await verifyCallbackSignature({
      secret,
      songId,
      signature: token.signature,
      expiresAt: token.expiresAt,
      nonce: token.nonce,
      now: justAfter,
      clockSkewSeconds: 0,
    }),
    'expired',
  )
})

test('rechaza campos ausentes, firmas malformadas y secretos distintos', async () => {
  const token = await createCallbackSignature({ secret, songId, now: fixedNow })
  const base = {
    secret,
    songId,
    signature: token.signature,
    expiresAt: token.expiresAt,
    nonce: token.nonce,
    now: fixedNow,
  }

  assert.equal(await verifyCallbackSignature({ ...base, nonce: null }), 'missing')
  assert.equal(await verifyCallbackSignature({ ...base, expiresAt: null }), 'missing')
  assert.equal(await verifyCallbackSignature({ ...base, signature: null }), 'missing')
  assert.equal(await verifyCallbackSignature({ ...base, signature: 'abc' }), 'malformed')
  assert.equal(await verifyCallbackSignature({ ...base, nonce: '../etc/passwd' }), 'malformed')
  assert.equal(await verifyCallbackSignature({ ...base, expiresAt: 'mañana' }), 'malformed')
  assert.equal(await verifyCallbackSignature({ ...base, secret: 'otro-secreto' }), 'invalid')
})

test('cada firma recibe un nonce distinto y el mensaje canónico no colisiona', async () => {
  const first = await createCallbackSignature({ secret, songId, now: fixedNow })
  const second = await createCallbackSignature({ secret, songId, now: fixedNow })
  assert.notEqual(first.nonce, second.nonce)
  assert.notEqual(first.signature, second.signature)
  assert.equal(
    callbackMessage(songId, first.expiresAt, first.nonce),
    `v1.${songId}.${first.expiresAt}.${first.nonce}`,
  )
})

test('rechaza secretos y songId vacíos al crear la firma', async () => {
  await assert.rejects(() => createCallbackSignature({ secret: '', songId, now: fixedNow }), TypeError)
  await assert.rejects(() => createCallbackSignature({ secret, songId: '   ', now: fixedNow }), TypeError)
})
