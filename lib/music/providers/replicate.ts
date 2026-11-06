import type { GenerateMusicRequest, MusicProvider, ProviderGenerateResult } from '@/lib/music/types'
import { ProviderNotConfiguredError } from '@/lib/music/providers/errors'

/**
 * Replicate (Ace-Step / YuE / MusicGen servidos). Crea una predicción con
 * `webhook_url` apuntando a `/api/callback`: Replicate POSTea ahí al terminar
 * y ese endpoint normaliza `output` → `audioUrl`. Sin `REPLICATE_ACE_STEP_MODEL`
 * no hay modelo contra el que predecir: se declara no configurado, no se adivina.
 */
export class ReplicateProvider implements MusicProvider {
  id = 'replicate' as const

  async generate(request: GenerateMusicRequest): Promise<ProviderGenerateResult> {
    const token = process.env.REPLICATE_API_TOKEN
    if (!token) throw new ProviderNotConfiguredError('Falta REPLICATE_API_TOKEN en las variables de entorno.')
    const modelRef = process.env.REPLICATE_ACE_STEP_MODEL?.trim()
    if (!modelRef) throw new ProviderNotConfiguredError('Falta REPLICATE_ACE_STEP_MODEL (owner/name o hash de versión).')

    const input = {
      prompt: request.prompt,
      lyrics: request.lyrics ?? '',
      instrumental: request.instrumental ?? false,
      duration: Math.min(Math.max(request.duration ?? 30, 5), 120),
    }
    const webhookUrl = request.callbackUrl ?? null

    // Dos formas de API: `version` (hash) o modelo público `owner/name`.
    const isVersion = !modelRef.includes('/')
    const url = isVersion ? 'https://api.replicate.com/v1/predictions' : `https://api.replicate.com/v1/models/${modelRef}/predictions`
    const body = isVersion ? { version: modelRef, input, webhook_url: webhookUrl } : { input, webhook_url: webhookUrl }

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        Prefer: 'wait=5',
      },
      signal: AbortSignal.timeout(30_000),
      body: JSON.stringify(body),
    })
    if (!response.ok) {
      const message = await response.text().catch(() => '')
      throw new Error(`Replicate respondió ${response.status}: ${message.slice(0, 300)}`)
    }
    const data = (await response.json().catch(() => null)) as { id?: string } | null
    if (!data?.id) throw new Error('Replicate no devolvió el id de la predicción')
    return { taskId: data.id, provider: this.id, model: modelRef, status: 'queued' }
  }
}
