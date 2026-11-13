import { z } from 'zod'

const envSchema = z.object({
  PORT: z.coerce.number().int().min(1).max(65535).default(8100),
  VAULT_ADDR: z.string().url(),
  VAULT_TOKEN: z.string().min(1),
  VAULT_TRANSIT_KEY: z.string().regex(/^[a-zA-Z0-9._-]{1,128}$/),
  TAMV_LICENSE_KEY_ID: z.string().min(1).max(128).optional(),
  TAMV_LICENSE_ISSUER: z.string().url(),
  LICENSE_SERVICE_INTERNAL_TOKEN: z.string().min(24),
  SUPABASE_URL: z.string().url(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
})

const parsed = envSchema.safeParse(process.env)
if (!parsed.success) {
  throw new Error(`Invalid license-service configuration: ${parsed.error.issues.map((issue) => issue.path.join('.')).join(', ')}`)
}

export const config = {
  port: parsed.data.PORT,
  vaultAddress: parsed.data.VAULT_ADDR.replace(/\/$/, ''),
  vaultToken: parsed.data.VAULT_TOKEN,
  transitKey: parsed.data.VAULT_TRANSIT_KEY,
  keyId: parsed.data.TAMV_LICENSE_KEY_ID ?? parsed.data.VAULT_TRANSIT_KEY,
  issuer: parsed.data.TAMV_LICENSE_ISSUER,
  internalToken: parsed.data.LICENSE_SERVICE_INTERNAL_TOKEN,
  supabaseUrl: parsed.data.SUPABASE_URL,
  serviceRoleKey: parsed.data.SUPABASE_SERVICE_ROLE_KEY,
  licenseTtlSeconds: 60 * 60 * 24 * 30,
  offlineMaxSeconds: 60 * 60 * 24 * 7,
  offlineGraceSeconds: 60 * 60 * 24,
} as const
