import type { GenerateMusicRequest, MusicProvider, ProviderGenerateResult } from '@/lib/music/types'
import { ProviderNotConfiguredError } from '@/lib/music/providers/errors'

/**
 * fal.ai (modelos Ace-Step/MusicGen en cola). `POST
 * https://queue.fal.run/{model}` devuelve `request_id`; el resultado vuelve por
 * `webhook_url` (= `/api/callback`) o por polling en `status_url`.
 */
export class FalProvider implements MusicProvider {
  id = 'fal' as const

  async generate(request: GenerateMusicRequest): Promise<ProviderGenerateResult> {
    const key = process.env.FAL_KEY
    if (!key) throw new ProviderNotConfiguredError('Falta FAL_KEY en las variables de entorno.')
    const model = process.env.FAL_ACE_STEP_MODEL?.trim()
    if (!model) throw new ProviderNotConfiguredError('Falta FAL_ACE_STEP_MODEL (slug del modelo en fal).')

    const response = await fetch(`https://queue.fal.run/${model}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Key ${key}` },
      signal: AbortSignal.timeout(30_000),
      body: JSON.stringify({
        prompt: request.prompt,
        lyrics: request.lyrics ?? '',
        instrumental: request.instrumental ?? false,
        duration: Math.min(Math.max(request.duration ?? 30, 5), 120),
        webhook_url: request.callbackUrl ?? undefined,
      }),
    })
    if (!response.ok) {
      const message = await response.text().catch(() => '')
      throw new Error(`fal.ai respondió ${response.status}: ${message.slice(0, 300)}`)
    }
    const data = (await response.json().catch(() => null)) as { request_id?: string } | null
    if (!data?.request_id) throw new Error('fal.ai no devolvió request_id')
    return { taskId: data.request_id, provider: this.id, model, status: 'queued' }
  }
}
