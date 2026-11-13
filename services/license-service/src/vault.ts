import { config } from './config.js'

interface TransitSignResponse {
  data?: { signature?: string; key_version?: number }
}

export async function signWithVault(payload: string) {
  const response = await fetch(`${config.vaultAddress}/v1/transit/sign/${encodeURIComponent(config.transitKey)}`, {
    method: 'POST',
    headers: { 'X-Vault-Token': config.vaultToken, 'Content-Type': 'application/json' },
    body: JSON.stringify({ input: Buffer.from(payload, 'utf8').toString('base64'), prehashed: false, signature_algorithm: 'ed25519' }),
    signal: AbortSignal.timeout(5000),
  })
  if (!response.ok) {
    await response.body?.cancel()
    throw new Error(`Vault Transit signing failed with status ${response.status}`)
  }
  const result = await response.json() as TransitSignResponse
  const vaultSignature = result.data?.signature
  const match = vaultSignature?.match(/^vault:v\\d+:([A-Za-z0-9+/=_-]+)$/)
  const encodedSignature = match?.[1]
  if (!encodedSignature || !Number.isInteger(result.data?.key_version)) throw new Error('Vault Transit returned an invalid Ed25519 signature')
  const signature = Buffer.from(encodedSignature.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('base64url')
  return { signature, keyVersion: result.data!.key_version! }
}
