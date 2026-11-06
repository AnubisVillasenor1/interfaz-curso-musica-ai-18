import type { GenerateMusicRequest, MusicProvider, ProviderGenerateResult } from '@/lib/music/types'
import { ProviderNotConfiguredError } from '@/lib/music/providers/errors'
import { createTaskId } from '@/lib/music/task-store'

/**
 * Servidor propio (Ace-Step / YuE / DiffRhythm) expuesto por `music-engine/`:
 * `POST {LOCAL_MUSIC_API_URL}/generate` → `{ taskId, model, status }`, y el
 * engine llama a `callbackUrl` al terminar.
 */
export class LocalMusicProvider implements MusicProvider {
  id = 'local' as const

  async generate(request: GenerateMusicRequest): Promise<ProviderGenerateResult> {
    const baseUrl = process.env.LOCAL_MUSIC_API_URL?.replace(/\/+$/, '')
    if (!baseUrl) {
      throw new ProviderNotConfiguredError('Falta LOCAL_MUSIC_API_URL para el proveedor local.')
    }
    const apiKey = process.env.LOCAL_MUSIC_API_KEY
    const headers: Record<string, string> = { 'Content-Type': 'application/json' }
    if (apiKey) headers.Authorization = `Bearer ${apiKey}`

    const response = await fetch(`${baseUrl}/generate`, {
      method: 'POST',
      headers,
      signal: AbortSignal.timeout(30_000),
      body: JSON.stringify({
        prompt: request.prompt,
        lyrics: request.lyrics ?? '',
        instrumental: request.instrumental ?? false,
        duration: Math.min(Math.max(request.duration ?? 30, 5), 120),
        callbackUrl: request.callbackUrl ?? null,
        // El engine puede elegir el modelo; por defecto usa MUSIC_MODEL.
        model: process.env.LOCAL_MUSIC_MODEL || undefined,
      }),
    })
    if (!response.ok) {
      const message = await response.text().catch(() => '')
      throw new Error(`El servidor local respondió ${response.status}: ${message.slice(0, 300)}`)
    }
    const data = (await response.json().catch(() => null)) as { taskId?: string; model?: string } | null
    if (!data?.taskId) throw new Error('El servidor local no devolvió taskId')
    return {
      taskId: data.taskId,
      provider: this.id,
      model: data?.model ?? process.env.LOCAL_MUSIC_MODEL ?? 'ace-step',
      status: 'queued',
    }
  }
}
