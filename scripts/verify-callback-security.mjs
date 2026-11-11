/**
 * Contratos estáticos de seguridad de callbacks.
 *
 * Comprueba que el código mantiene las propiedades que no se pueden verificar
 * sin un proveedor real: firma con expiración y nonce, consumo de un solo uso,
 * objetivo derivado de la firma y transiciones de estado en la base.
 */

import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const paths = {
  core: 'lib/callback-signature-core.mjs',
  adapter: 'lib/callback-signature.ts',
  sunoCallback: 'app/api/generate/callback/route.ts',
  unifiedCallback: 'app/api/callback/route.ts',
  generate: 'app/api/generate/route.ts',
  migration: 'supabase/migrations/20261111180000_callback_replay_protection.sql',
  functions: 'supabase/migrations/20261111143000_runtime_security_alignment.sql',
}

const files = Object.fromEntries(
  await Promise.all(
    Object.entries(paths).map(async ([key, path]) => [
      key,
      await readFile(new URL('../' + path, import.meta.url), 'utf8'),
    ]),
  ),
)

const checks = [
  [
    'la firma cubre songId, expiración y nonce',
    files.core.includes('v1.${songId}.${expiresAt}.${nonce}') &&
      files.core.includes('createCallbackSignature') &&
      files.core.includes('verifyCallbackSignature'),
  ],
  [
    'la expiración se compara con el reloj con tolerancia acotada',
    files.core.includes('expiresAt + skew') && files.core.includes('clockSkewSeconds'),
  ],
  [
    'el nonce es aleatorio y hexadecimal',
    files.core.includes('getRandomValues') && files.core.includes('padStart(2, \'0\')'),
  ],
  [
    'el adaptador rechaza callbacks sin secreto',
    files.adapter.includes("GENERATOR_CALLBACK_SECRET") && files.adapter.includes("return 'missing'"),
  ],
  [
    'la URL de generación incluye songId, sig, exp y nonce',
    ['songId:', 'sig:', 'exp:', 'nonce:'].every((token) => files.generate.includes(token)),
  ],
  [
    'la canción del callback con query procede de la firma, no del cuerpo',
    files.unifiedCallback.includes('const authorizedSongId = queryOk ? querySongId : null') &&
      files.unifiedCallback.includes('songId: authorizedSongId'),
  ],
  [
    'el callback de suno verifica firma antes de escribir',
    /const signatureReason = await verifyCallbackSignature/.test(files.sunoCallback) &&
      files.sunoCallback.indexOf('verifyCallbackSignature') < files.sunoCallback.indexOf('applyResult('),
  ],
  [
    'el nonce se consume sólo después de aplicar el resultado terminal',
    /const ticket = await consumeCallbackTicket/.test(files.sunoCallback) &&
      /if \(result === 'db_error'\)/.test(files.sunoCallback),
  ],
  [
    'la base registra el ticket con caducidad y consumo',
    files.migration.includes('create table if not exists public.generation_callback_tickets') &&
      files.migration.includes('consumed_at') &&
      files.migration.includes('expires_at timestamptz not null'),
  ],
  [
    'el consumo es atómico y distingue replay de expirado',
    /update public\.generation_callback_tickets\s+set consumed_at = now\(\)/i.test(files.migration) &&
      files.migration.includes("return 'replay'") &&
      files.migration.includes("return 'expired'"),
  ],
  [
    'la tabla de tickets no es accesible por anon/authenticated',
    files.migration.includes('enable row level security') &&
      /revoke all on table public\.generation_callback_tickets from public, anon, authenticated/i.test(files.migration),
  ],
  [
    'la función de consumo es security definer y sólo service_role',
    /security definer/i.test(files.migration) &&
      /grant execute on function public\.consume_generation_callback_ticket\(text, uuid\)\s+to service_role/i.test(files.migration),
  ],
  [
    'apply_generation_result sólo aplica estados terminales una vez',
    /current_status not in \('queued', 'generating'\) then return 'already_settled'/i.test(files.functions) &&
      /for update/i.test(files.functions),
  ],
]

let failures = 0
for (const [label, passed] of checks) {
  console.log((passed ? 'PASS ' : 'FAIL ') + label)
  if (!passed) failures += 1
}

assert.equal(failures, 0, failures + ' callback security contract checks failed')
console.log('Callback security contract checks passed: ' + checks.length + '/' + checks.length)
