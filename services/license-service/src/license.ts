import { randomUUID } from 'node:crypto'
import { config } from './config.js'
import { signWithVault } from './vault.js'

export type TamvPlan = 'starter' | 'core' | 'pro'

export interface LicenseClaims {
  iss: string
  aud: 'play-and-go'
  sub: string
  jti: string
  iat: number
  nbf: number
  exp: number
  product: 'play-and-go'
  edition: 'commercial'
  plan: TamvPlan
  federationId: string
  features: string[]
  limits: Record<string, number>
  deviceBinding: { mode: 'soft'; deviceId: string; maxDevices: number }
  offline: { maxOfflineSeconds: number; gracePeriodSeconds: number }
  licenseVersion: '1.0.0'
  kid: string
  alg: 'Ed25519'
}

export function canonicalize(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value)
  if (Array.isArray(value)) return `[${value.map(canonicalize).join(',')}]`
  const entries = Object.entries(value as Record<string, unknown>).filter(([, entry]) => entry !== undefined).sort(([left], [right]) => left.localeCompare(right))
  return `{${entries.map(([key, entry]) => `${JSON.stringify(key)}:${canonicalize(entry)}`).join(',')}}`
}

function planFeatures(plan: TamvPlan) {
  if (plan === 'starter') return ['studio.basic', 'audiocore.basic', 'creator_growth.basic']
  if (plan === 'core') return ['studio.basic', 'audiocore.basic', 'audiocore.advanced', 'voice_identity', 'creator_growth']
  return ['studio.basic', 'audiocore.basic', 'audiocore.advanced', 'voice_identity', 'creator_growth', 'monetization_advisor', 'tamv_research']
}

function planLimits(plan: TamvPlan) {
  if (plan === 'starter') return { monthlyGenerations: 5, maxDurationSeconds: 30, maxVoiceGenerations: 10, maxProjects: 5, maxConcurrentJobs: 1, maxStorageGb: 1 }
  if (plan === 'core') return { monthlyGenerations: 50, maxDurationSeconds: 120, maxVoiceGenerations: 100, maxProjects: 1000, maxConcurrentJobs: 1, maxStorageGb: 20 }
  return { monthlyGenerations: 200, maxDurationSeconds: 180, maxVoiceGenerations: 500, maxProjects: 5000, maxConcurrentJobs: 2, maxStorageGb: 100 }
}

export async function issueLicense(input: { userId: string; federationId: string; plan: TamvPlan; deviceId: string }) {
  const now = Math.floor(Date.now() / 1000)
  const claims: LicenseClaims = {
    iss: config.issuer,
    aud: 'play-and-go',
    sub: input.userId,
    jti: `lic_${randomUUID()}`,
    iat: now,
    nbf: now,
    exp: now + config.licenseTtlSeconds,
    product: 'play-and-go',
    edition: 'commercial',
    plan: input.plan,
    federationId: input.federationId,
    features: planFeatures(input.plan),
    limits: planLimits(input.plan),
    deviceBinding: { mode: 'soft', deviceId: input.deviceId, maxDevices: 3 },
    offline: { maxOfflineSeconds: config.offlineMaxSeconds, gracePeriodSeconds: config.offlineGraceSeconds },
    licenseVersion: '1.0.0',
    kid: config.keyId,
    alg: 'Ed25519',
  }
  const payload = Buffer.from(canonicalize(claims), 'utf8').toString('base64url')
  const signed = await signWithVault(payload)
  return {
    license: `tamv1.${payload}.${signed.signature}`,
    claims,
    keyId: config.keyId,
    keyVersion: signed.keyVersion,
  }
}
