import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const [route, migration, verificationRoute] = await Promise.all([
  readFile(new URL('../app/api/exam/route.ts', import.meta.url), 'utf8'),
  readFile(new URL('../supabase/migrations/20261108190000_exam_security_hardening.sql', import.meta.url), 'utf8'),
  readFile(new URL('../app/api/certificates/verify/route.ts', import.meta.url), 'utf8'),
])

const checks = [
  ['exam route authenticates a user before writes', route.indexOf('supabase.auth.getUser()') < route.indexOf('admin.from(\\'exam_attempts\\')')],
  ['exam route uses the server-only admin client', route.includes("import { createAdminClient } from '@/lib/supabase/admin'") && route.includes('const admin = createAdminClient()')],
  ['exam route writes attempts through admin client', /admin\s*\.from\('exam_attempts'\)\s*\.insert/.test(route)],
  ['exam route writes certificates through admin client', /admin\s*\.from\('certificates'\)\s*\.insert/.test(route)],
  ['exam route never writes with the session client', !/supabase\s*\.from\('(exam_attempts|certificates)'\)\s*\.insert/.test(route)],
  ['exam route rejects arrays and malformed answers', route.includes('Array.isArray(raw)') && route.includes('Number.isInteger(value)') && route.includes('QUESTION_IDS.has(id)')],
  ['server computes score from the private answer key', route.includes('gradeExam(answers)') && route.includes('EXAM_QUESTIONS.length')],
  ['old all-operations exam policy is removed', migration.includes('drop policy if exists "exam_attempts_owner"')],
  ['exam attempts become owner-select only', /create policy "exam_attempts_owner_read"[\s\S]*?for select[\s\S]*?auth\.uid\(\)[\s\S]*?user_id/.test(migration)],
  ['public table-level certificate policy is removed', migration.includes('drop policy if exists "certificates_verify_public"') && !/on public\.certificates[\s\S]*?using\s*\(true\)/i.test(migration)],
  ['ordinary users cannot write exam or certificate rows', /revoke all privileges on table public\.exam_attempts from public, anon, authenticated/i.test(migration) && /revoke all privileges on table public\.certificates from public, anon, authenticated/i.test(migration)],
  ['service role retains server write privileges', /grant all privileges on table public\.exam_attempts to service_role/i.test(migration) && /grant all privileges on table public\.certificates to service_role/i.test(migration)],
  ['public verification uses the admin endpoint and minimal projection', verificationRoute.includes('createAdminClient()') && verificationRoute.includes(".select('code, issued_at, exam_attempts!inner(score, passed)')")],
]

let failures = 0
for (const [label, passed] of checks) {
  console.log((passed ? 'PASS ' : 'FAIL ') + label)
  if (!passed) failures += 1
}

assert.equal(failures, 0, failures + ' exam security contract checks failed')
console.log('Exam security contracts passed: ' + checks.length + '/' + checks.length)
