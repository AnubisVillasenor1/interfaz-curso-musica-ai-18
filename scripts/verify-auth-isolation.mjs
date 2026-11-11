/**
 * Contratos estáticos de autenticación y aislamiento por usuario.
 *
 * No sustituye a una prueba con Supabase real: verifica que el código mantiene
 * las propiedades que impiden leer o escribir datos de otra cuenta. Está en CI
 * para que una refactorización no elimine el filtro por `user_id` sin que nadie
 * lo note.
 *
 * Ejecutar con `node scripts/verify-auth-isolation.mjs`.
 */

import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { readdir } from 'node:fs/promises'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const paths = {
  task: 'app/api/task/[taskId]/route.ts',
  songs: 'app/api/songs/route.ts',
  complete: 'app/api/songs/complete/route.ts',
  progress: 'app/api/progress/route.ts',
  entitlement: 'app/api/entitlement/route.ts',
  generate: 'app/api/generate/route.ts',
  checkout: 'app/api/checkout/route.ts',
  exam: 'app/api/exam/route.ts',
  evaluate: 'app/api/advanced-audio/evaluate/route.ts',
  rls: 'supabase/migrations/20261105190100_rls.sql',
  storage: 'supabase/migrations/20261105190300_storage.sql',
  webhook: 'app/api/stripe/webhook/route.ts',
  callback: 'app/api/generate/callback/route.ts',
  unifiedCallback: 'app/api/callback/route.ts',
}

const files = Object.fromEntries(
  await Promise.all(
    Object.entries(paths).map(async ([key, path]) => [
      key,
      await readFile(new URL('../' + path, import.meta.url), 'utf8'),
    ]),
  ),
)

/** Recorre todas las rutas de API para comprobar que ninguna confía en el cliente. */
async function readAllRoutes(dir) {
  const entries = await readdir(dir, { withFileTypes: true })
  const out = []
  for (const entry of entries) {
    const full = join(dir, entry.name)
    if (entry.isDirectory()) out.push(...(await readAllRoutes(full)))
    else if (entry.name === 'route.ts') out.push(full)
  }
  return out
}

const routeFiles = await readAllRoutes(fileURLToPath(new URL('../app/api', import.meta.url)))
const routeSources = await Promise.all(
  routeFiles.map(async (file) => ({ file: file.replace(/\\/g, '/'), text: await readFile(file, 'utf8') })),
)

/** Identificadores de usuario que llegan desde el cuerpo o el query. */
const clientSuppliedUser = /(?<![\w$])(?:body|payload|data|input|parsed\.value)\s*(?:\?\.|\.)\s*(?:userId|user_id)\b|searchParams\.get\(\s*['"](?:userId|user_id)['"]\s*\)/

const checks = [
  [
    'el estado de una tarea se filtra por dueño y por task id',
    /\.eq\(\s*'provider_task_id'\s*,\s*id\s*\)/.test(files.task) &&
      /\.eq\(\s*'user_id'\s*,\s*user\.id\s*\)/.test(files.task),
  ],
  [
    'la biblioteca sólo lista canciones del usuario autenticado',
    /\.eq\(\s*'user_id'\s*,\s*user\.id\s*\)/.test(files.songs),
  ],
  [
    'la subida comprueba propiedad antes de escribir en Storage',
    /\.eq\(\s*'user_id'\s*,\s*user\.id\s*\)/.test(files.complete) &&
      files.complete.includes('${user.id}/${songId}.') &&
      files.complete.includes('PRIVATE_HEADERS'),
  ],
  [
    'el progreso usa el id de la sesión como propietario de la RPC',
    files.progress.includes('p_owner: user.id') &&
      !/p_owner:\s*(?:body|payload|parsed)/.test(files.progress),
  ],
  [
    'el plan se lee con una RPC sin parámetros ligada a auth.uid()',
    files.entitlement.includes("rpc('read_entitlement')") &&
      !/rpc\(\s*'read_entitlement'\s*,/.test(files.entitlement),
  ],
  [
    'la generación actualiza la canción filtrando por dueño',
    /\.eq\(\s*'user_id'\s*,\s*user\.id\s*\)/.test(files.generate),
  ],
  [
    'checkout, examen y evaluación exigen sesión (401)',
    [files.checkout, files.exam, files.evaluate].every(
      (text) => text.includes('getUser()') && text.includes('status: 401'),
    ),
  ],
  [
    'ninguna ruta acepta un user id enviado por el cliente',
    routeSources.every(({ text }) => !clientSuppliedUser.test(text)),
    () => routeSources.filter(({ text }) => clientSuppliedUser.test(text)).map(({ file }) => file).join(', '),
  ],
  [
    'RLS activo en perfiles, canciones, derechos, progreso e insignias',
    ['profiles', 'songs', 'entitlements', 'lesson_progress', 'badges'].every((table) =>
      files.rls.includes(`alter table public.${table} enable row level security`),
    ),
  ],
  [
    'las políticas de datos comparan contra auth.uid()',
    (files.rls.match(/auth\.uid\(\)/g) ?? []).length >= 10 &&
      files.rls.includes('using (user_id = (select auth.uid()))'),
  ],
  [
    'el bucket es privado y la carpeta de Storage es el user id',
    /'song-audio',\s*false,/.test(files.storage) &&
      files.storage.includes('(storage.foldername(name))[1] = (select auth.uid()::text)') &&
      (files.storage.match(/on storage\.objects/g) ?? []).length >= 4,
  ],
  [
    'las rutas con service_role no escriben por un user id del cuerpo',
    !clientSuppliedUser.test(files.webhook) &&
      !clientSuppliedUser.test(files.callback) &&
      !clientSuppliedUser.test(files.unifiedCallback) &&
      files.webhook.includes('constructEvent') &&
      files.callback.includes('verifyCallbackSignature'),
  ],
]

let failures = 0
for (const [label, passed, detail] of checks) {
  console.log((passed ? 'PASS ' : 'FAIL ') + label + (!passed && detail ? ' -> ' + detail() : ''))
  if (!passed) failures += 1
}

assert.equal(failures, 0, failures + ' authentication isolation checks failed')
console.log('Authentication isolation checks passed: ' + checks.length + '/' + checks.length)
