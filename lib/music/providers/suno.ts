import type { GenerateMusicRequest, MusicProvider, ProviderGenerateResult } from '@/lib/music/types'
import { ProviderNotConfiguredError } from '@/lib/music/providers/errors'

/**
 * Proveedor histórico (sunset: sunoapi.org). Se mantiene como `suno` para no
 * romper despliegues que ya tienen `API_KEY`/`SUNO_API_URL`: el contrato
 * externo (prompt, callBackUrl con songId+sig → `/api/generate/callback`)
 * es idéntico.
 */
export class SunoProvider implements MusicProvider {
  id = 'suno' as const

  async generate(request: GenerateMusicRequest): Promise<ProviderGenerateResult> {
    const apiKey = process.env.API_KEY
    if (!apiKey) throw new ProviderNotConfiguredError('Proveedor musical no configurado.')
    if (!request.callbackUrl) throw new ProviderNotConfiguredError('Falta la URL de retorno del proveedor.')

    const response = await fetch(process.env.SUNO_API_URL || 'https://api.sunoapi.org/api/v1/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      signal: AbortSignal.timeout(30_000),
      body: JSON.stringify({
        prompt: request.prompt,
        customMode: request.customMode ?? true,
        instrumental: request.instrumental ?? false,
        model: 'V4',
        title: request.title ?? undefined,
        tags: request.genre ?? undefined,
        mv: 1,
        callBackUrl: request.callbackUrl,
      }),
    })
    const result = (await response.json().catch(() => null)) as { code?: number; data?: { taskId?: string } } | null
    if (!response.ok || !result?.data?.taskId) throw new Error(`provider ${response.status}`)
    return { taskId: result.data.taskId, provider: this.id, model: 'V4', status: 'queued' }
  }
}
