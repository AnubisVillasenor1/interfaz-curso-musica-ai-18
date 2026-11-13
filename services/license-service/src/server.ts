import { createHash, randomUUID } from 'node:crypto'
import Fastify from 'fastify'
import { createClient } from '@supabase/supabase-js'
import { z } from 'zod'
import { config } from './config.js'
import { issueLicense, type TamvPlan } from './license.js'

const app = Fastify({ logger: true, bodyLimit: 16_384 })
const supabase = createClient(config.supabaseUrl, config.serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
})
const issueSchema = z.object({
  userId: z.string().uuid(),
  deviceId: z.string().min(8).max(128),
  deviceLabel: z.string().trim().min(1).max(80).optional(),
}).strict()
const revokeSchema = z.object({ userId: z.string().uuid(), licenseId: z.string().min(8).max(96) }).strict()
const authorizeSchema = z.object({
  userId: z.string().uuid(),
  deviceId: z.string().min(8).max(128),
  feature: z.enum(['studio.basic', 'audiocore.basic', 'audiocore.advanced', 'voice_identity', 'creator_growth.basic', 'creator_growth', 'monetization_advisor', 'tamv_research']),
  consume: z.boolean().default(false),
  jobId: z.string().uuid().optional(),
}).strict()

app.addHook('onRequest', async (request, reply) => {
  if (request.url === '/health') return
  const token = request.headers['x-internal-token']
  if (typeof token !== 'string' || token.length !== config.internalToken.length || !safeEqual(token, config.internalToken)) {
    return reply.code(401).send({ error: 'unauthorized' })
  }
})

app.get('/health', async () => ({ status: 'ok' }))

app.post('/v1/licenses/issue', async (request, reply) => {
  const parsed = issueSchema.safeParse(request.body)
  if (!parsed.success) return reply.code(400).send({ error: 'invalid_request' })
  const { userId, deviceId, deviceLabel } = parsed.data
  const deviceHash = createHash('sha256').update(deviceId).digest('hex')

  const { data: entitlement, error: entitlementError } = await supabase
    .from('entitlements')
    .select('plan,active,base_plan,extension_expires_at,subscription_id,subscription_status,current_period_end,entitlement_reconciliation_required')
    .eq('user_id', userId)
    .maybeSingle()
  if (entitlementError) {
    request.log.error({ message: entitlementError.message }, 'entitlement lookup failed')
    return reply.code(503).send({ error: 'entitlement_unavailable' })
  }
  const now = Date.now()
  const reconciled = entitlement && !entitlement.entitlement_reconciliation_required
  const proActive = Boolean(reconciled && entitlement.subscription_id && ['active', 'trialing', 'past_due'].includes(entitlement.subscription_status ?? '') && (!entitlement.current_period_end || new Date(entitlement.current_period_end).getTime() > now))
  const coreActive = Boolean(reconciled && (entitlement.base_plan === 'enrolled' || entitlement.extension_expires_at && new Date(entitlement.extension_expires_at).getTime() > now))
  if (!proActive && !coreActive) return reply.code(403).send({ error: 'active_entitlement_required' })
  const plan: TamvPlan = proActive ? 'pro' : 'core'

  const { data: registrationData, error: registrationError } = await supabase.rpc('register_tamv_license_device', {
    p_user_id: userId,
    p_device_hash: deviceHash,
    p_label: deviceLabel ?? 'Navegador',
    p_max_devices: 3,
  }).maybeSingle()
  const registration = registrationData as { device_id: string | null; status: string; active_count: number } | null
  if (registrationError) {
    request.log.error({ message: registrationError.message }, 'device registration failed')
    return reply.code(503).send({ error: 'device_registration_failed' })
  }
  if (!registration?.device_id || registration.status === 'device_limit') return reply.code(409).send({ error: 'device_limit_reached', activeDevices: registration?.active_count ?? 0 })
  if (registration.status === 'revoked') return reply.code(403).send({ error: 'device_revoked' })
  if (!['existing', 'registered'].includes(registration.status)) return reply.code(400).send({ error: 'invalid_device' })

  const { data: existing, error: existingError } = await supabase
    .from('tamv_licenses')
    .select('jti,token')
    .eq('user_id', userId)
    .eq('device_id', registration.device_id)
    .eq('status', 'active')
    .gt('expires_at', new Date(now).toISOString())
    .maybeSingle()
  if (existingError) return reply.code(503).send({ error: 'license_lookup_failed' })
  if (existing) return { license: existing.token, licenseId: existing.jti, reused: true }

  const issued = await issueLicense({ userId, federationId: userId, plan, deviceId: deviceHash })
  const licenseRowId = randomUUID()
  const { error: insertError } = await supabase.from('tamv_licenses').insert({
    id: licenseRowId,
    jti: issued.claims.jti,
    user_id: userId,
    device_id: registration.device_id,
    device_hash: deviceHash,
    plan,
    claims: issued.claims,
    token: issued.license,
    issued_at: new Date(issued.claims.iat * 1000).toISOString(),
    expires_at: new Date(issued.claims.exp * 1000).toISOString(),
  })
  if (insertError) {
    request.log.error({ message: insertError.message, userId }, 'license persistence failed')
    return reply.code(insertError.code === '23505' ? 409 : 503).send({ error: insertError.code === '23505' ? 'active_license_exists' : 'license_persistence_failed' })
  }
  await audit(userId, licenseRowId, 'license.issued', { plan, deviceHash, keyId: issued.keyId, keyVersion: issued.keyVersion })
  return reply.code(201).send({ license: issued.license, licenseId: issued.claims.jti, keyId: issued.keyId, keyVersion: issued.keyVersion, expiresAt: new Date(issued.claims.exp * 1000).toISOString(), features: issued.claims.features, limits: issued.claims.limits })
})

app.get('/v1/licenses/:userId', async (request, reply) => {
  const params = z.object({ userId: z.string().uuid() }).safeParse(request.params)
  if (!params.success) return reply.code(400).send({ error: 'invalid_request' })
  const { data, error } = await supabase.from('tamv_licenses').select('jti,plan,status,issued_at,expires_at,revoked_at,revoke_reason,device_id,token').eq('user_id', params.data.userId).order('issued_at', { ascending: false }).limit(30)
  if (error) return reply.code(503).send({ error: 'licenses_unavailable' })
  return { licenses: data ?? [] }
})

app.post('/v1/licenses/revoke', async (request, reply) => {
  const parsed = revokeSchema.safeParse(request.body)
  if (!parsed.success) return reply.code(400).send({ error: 'invalid_request' })
  const { userId, licenseId } = parsed.data
  const { data, error } = await supabase.from('tamv_licenses').update({ status: 'revoked', revoked_at: new Date().toISOString(), revoke_reason: 'user_requested', updated_at: new Date().toISOString() }).eq('user_id', userId).eq('jti', licenseId).eq('status', 'active').select('id,jti').maybeSingle()
  if (error) return reply.code(503).send({ error: 'revocation_failed' })
  if (!data) return reply.code(404).send({ error: 'license_not_found_or_inactive' })
  await audit(userId, data.id, 'license.revoked', { reason: 'user_requested' })
  return { revoked: true, licenseId: data.jti }
})

app.post('/v1/features/authorize', async (request, reply) => {
  const parsed = authorizeSchema.safeParse(request.body)
  if (!parsed.success) return reply.code(400).send({ error: 'invalid_request' })
  const { userId, deviceId, feature, consume, jobId } = parsed.data
  const deviceHash = createHash('sha256').update(deviceId).digest('hex')
  const { data: authorizationData, error } = await supabase.rpc('authorize_tamv_license_feature', {
    p_user_id: userId,
    p_device_hash: deviceHash,
    p_feature: feature,
    p_consume: consume,
    p_job_id: jobId ?? null,
  }).maybeSingle()
  const data = authorizationData as { allowed: boolean; reason: string; plan: string; limit_total: number; limit_used: number; expires_at: string; limits: Record<string, number> } | null
  if (error) {
    request.log.error({ message: error.message }, 'feature authorization failed')
    return reply.code(503).send({ error: 'authorization_unavailable' })
  }
  if (!data?.allowed) return reply.code(403).send({ error: data?.reason ?? 'feature_denied' })
  return { allowed: true, reason: data.reason, plan: data.plan, limit: data.limit_total, used: data.limit_used, expiresAt: data.expires_at, limits: data.limits }
})

async function audit(userId: string, licenseId: string, eventType: string, payload: Record<string, unknown>) {
  const { error } = await supabase.from('tamv_license_events').insert({ event_id: randomUUID(), user_id: userId, license_id: licenseId, event_type: eventType, payload })
  if (error) app.log.error({ message: error.message, eventType, userId }, 'audit event insert failed')
}

function safeEqual(left: string, right: string) {
  const a = Buffer.from(left)
  const b = Buffer.from(right)
  if (a.length !== b.length) return false
  let diff = 0
  for (let index = 0; index < a.length; index += 1) diff |= a[index]! ^ b[index]!
  return diff === 0
}

await app.listen({ port: config.port, host: '0.0.0.0' })
