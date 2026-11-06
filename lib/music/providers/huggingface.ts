import { createTaskId } from '@/lib/music/task-store'
import type { GenerateMusicRequest, MusicProvider, ProviderGenerateResult } from '@/lib/music/types'
import { ProviderNotConfiguredError } from '@/lib/music/providers/errors'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * Hugging Face Inference API (MusicGen).
 *
 * Es síncrono: el modelo devuelve el WAV en la misma respuesta. Para
 * conservar el contrato de la app (taskId + tabla), el audio se sube al
 * bucket `song-audio` con el cliente de servicio y se devuelve su URL firmada;
 * la fila queda `ready` sin esperar a ningún callback. MusicGen es
 * instrumental: no promete voz; Ace-Step vía Space/modelo propio entra por el
 * proveedor `local`.
 *
 * HF responde 503 mientras el modelo carga: se reintenta con la espera que el
 * propio cuerpo sugiere, hasta 3 intentos.
 */
export class HuggingFaceProvider implements MusicProvider {
  id = 'huggingface' as const

  async generate(request: GenerateMusicRequest): Promise<ProviderGenerateResult> {
    const token = process.env.HUGGINGFACEHUB_API_TOKEN
    if (!token) {
      throw new ProviderNotConfiguredError('Falta HUGGINGFACEHUB_API_TOKEN en las variables de entorno.')
    }
    const model = process.env.HUGGINGFACE_MUSIC_MODEL ?? 'facebook/musicgen-small'
    const duration = Math.min(Math.max(request.duration ?? 30, 5), 30)
    const prompt = buildPrompt(request)

    let response: Response | null = null
    for (let attempt = 0; attempt < 3; attempt += 1) {
      response = await fetch(`https://api-inference.huggingface.co/models/${model}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        signal: AbortSignal.timeout(120_000),
        body: JSON.stringify({ inputs: prompt, parameters: { duration } }),
      })
      if (response.status !== 503) break
      // El cuerpo trae `estimated_time`: respetar solo si está acotado.
      const body = (await response.json().catch(() => null)) as { estimated_time?: number } | null
      const waitMs = Math.min((body?.estimated_time ?? 10) * 1000, 20_000)
      await new Promise((resolve) => setTimeout(resolve, waitMs))
    }

    if (!response || !response.ok) {
      const message = response ? await response.text().catch(() => '') : 'sin respuesta'
      throw new Error(`Hugging Face respondió ${response?.status ?? 'red'}: ${message.slice(0, 300)}`)
    }

    const bytes = new Uint8Array(await response.arrayBuffer())
    if (!bytes.length) throw new Error('Hugging Face devolvió un audio vacío')

    const taskId = createTaskId('hf')
    const admin = createAdminClient()
    if (!admin) throw new Error('Hugging Face devolvió audio pero Supabase no está configurado para guardarlo')

    const path = `provider/${taskId}.wav`
    const { error: uploadError } = await admin.storage.from('song-audio').upload(path, bytes, {
      contentType: 'audio/wav',
      upsert: true,
    })
    if (uploadError) throw new Error(`No se pudo guardar el audio de Hugging Face: ${uploadError.message}`)

    const { data: signed } = await admin.storage.from('song-audio').createSignedUrl(path, 3600)
    if (!signed?.signedUrl) throw new Error('No se pudo firmar el audio de Hugging Face')

    return { taskId, provider: this.id, model, audioUrl: signed.signedUrl, status: 'completed' }
  }
}

function buildPrompt(request: GenerateMusicRequest): string {
  const parts = [request.prompt]
  if (request.lyrics) parts.push(`Lyrics theme: ${request.lyrics}`)
  if (request.instrumental) parts.push('Instrumental only, no vocals')
  return parts.join('. ')
}
