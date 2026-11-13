export interface TamvLicenseClaims {
  iss: string
  aud: 'play-and-go'
  sub: string
  jti: string
  iat: number
  nbf: number
  exp: number
  product: 'play-and-go'
  edition: 'commercial'
  plan: 'starter' | 'core' | 'pro'
  federationId: string
  features: string[]
  limits: Record<string, number>
  deviceBinding: { mode: 'soft'; deviceId: string; maxDevices: number }
  offline: { maxOfflineSeconds: number; gracePeriodSeconds: number }
  licenseVersion: '1.0.0'
  kid: string
  alg: 'Ed25519'
}

function decodeBase64Url(value: string) {
  const base64 = value.replace(/-/g, '+').replace(/_/g, '/')
  const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4)
  const binary = atob(padded)
  return Uint8Array.from(binary, (character) => character.charCodeAt(0))
}

function canonicalize(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value)
  if (Array.isArray(value)) return `[${value.map(canonicalize).join(',')}]`
  const entries = Object.entries(value as Record<string, unknown>).filter(([, entry]) => entry !== undefined).sort(([left], [right]) => left.localeCompare(right))
  return `{${entries.map(([key, entry]) => `${JSON.stringify(key)}:${canonicalize(entry)}`).join(',')}}`
}

function decodePem(pem: string) {
  const base64 = pem.replace(/-----BEGIN PUBLIC KEY-----|-----END PUBLIC KEY-----|\s/g, '')
  const binary = atob(base64)
  return Uint8Array.from(binary, (character) => character.charCodeAt(0))
}

export async function verifyTamvLicense(
  token: string,
  publicKeys: ReadonlyMap<string, string>,
  options: { issuer: string; audience?: string; nowSeconds?: number; isRevoked?: (licenseId: string) => Promise<boolean> },
): Promise<{ claims: TamvLicenseClaims; keyId: string }> {
  if (typeof token !== 'string' || token.length > 24_000) throw new Error('Formato de licencia TAMV inválido')
  const parts = token.split('.')
  if (parts.length !== 3 || parts[0] !== 'tamv1') throw new Error('Formato de licencia TAMV inválido')
  const [, payload, signaturePart] = parts
  let decoded: string
  let claims: TamvLicenseClaims
  try {
    decoded = new TextDecoder('utf-8', { fatal: true }).decode(decodeBase64Url(payload))
    claims = JSON.parse(decoded) as TamvLicenseClaims
  } catch {
    throw new Error('Payload de licencia inválido')
  }
  if (canonicalize(claims) !== decoded) throw new Error('Payload de licencia no canónico')
  if (!claims || typeof claims !== 'object' || typeof claims.kid !== 'string' || claims.alg !== 'Ed25519') throw new Error('Claims de licencia inválidos')
  const pem = publicKeys.get(claims.kid)
  if (!pem) throw new Error('Clave pública de licencia desconocida')
  let validSignature = false
  try {
    const key = await crypto.subtle.importKey('spki', decodePem(pem), { name: 'Ed25519' }, false, ['verify'])
    validSignature = await crypto.subtle.verify({ name: 'Ed25519' }, key, decodeBase64Url(signaturePart), new TextEncoder().encode(payload))
  } catch {
    throw new Error('No fue posible verificar la firma Ed25519')
  }
  if (!validSignature) throw new Error('Firma de licencia TAMV inválida')
  const now = options.nowSeconds ?? Math.floor(Date.now() / 1000)
  if (claims.iss !== options.issuer || claims.aud !== (options.audience ?? 'play-and-go')) throw new Error('Emisor o audiencia de licencia inválidos')
  if (!Number.isSafeInteger(claims.exp) || !Number.isSafeInteger(claims.nbf) || claims.nbf > now + 300) throw new Error('Licencia aún no válida')
  if (claims.exp < now - 300) throw new Error('Licencia expirada')
  if (options.isRevoked && await options.isRevoked(claims.jti)) throw new Error('Licencia revocada')
  return { claims, keyId: claims.kid }
}
