import { generateSpeech } from 'ai'
import { gateway } from '@ai-sdk/gateway'
import { NextResponse } from 'next/server'

import { enforcePolicy } from '@/lib/rate-limit'

export const runtime = 'nodejs'
export const maxDuration = 30

/**
 * Voz para la academia mediante Vercel AI Gateway.
 *
 * La autenticación la proporciona el runtime de Vercel; no se expone ninguna
 * clave de proveedor al navegador. La síntesis queda limitada y validada por
 * servidor para evitar abuso de costes.
 */
export async function POST(request: Request) {
  const rateLimitResponse = await enforcePolicy(
    request,
    'tts',
    'Demasiadas peticiones de voz. Espera un momento.',
  )
  if (rateLimitResponse) return rateLimitResponse

  const body = (await request.json().catch(() => null)) as { text?: unknown; voice?: unknown } | null
  const text = typeof body?.text === 'string' ? body.text.trim().slice(0, 900) : ''
  if (!text) return NextResponse.json({ error: 'Escribe el texto a leer.', code: 'invalid_request' }, { status: 400 })

  const voice = typeof body?.voice === 'string' && /^[a-z_]{2,20}$/i.test(body.voice) ? body.voice : 'Rachel'

  const voiceServiceUrl = process.env.VOICE_IDENTITY_URL?.trim()
  const internalToken = process.env.AUDIOCORE_INTERNAL_TOKEN?.trim()
  if (voiceServiceUrl && internalToken) {
    try {
      const endpoint = new URL('/v1/speak', voiceServiceUrl)
      const localResponse = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-internal-token': internalToken,
        },
        body: JSON.stringify({
          text,
          language: 'es-MX',
          voice: process.env.KOKORO_VOICE_ID?.trim(),
          speed: 1,
        }),
        signal: AbortSignal.timeout(20_000),
        cache: 'no-store',
      })
      const contentLength = Number(localResponse.headers.get('content-length') ?? 0)
      if (localResponse.ok && contentLength <= 20_000_000) {
        const audio = await localResponse.arrayBuffer()
        if (audio.byteLength > 0 && audio.byteLength <= 20_000_000) {
          return new NextResponse(audio, {
            headers: {
              'Content-Type': 'audio/wav',
              'Cache-Control': 'private, no-store',
              'X-Audio-Engine': 'kokoro-local',
            },
          })
        }
      }
    } catch {
      console.warn('[tts] Kokoro local no disponible; se usa el respaldo de Gateway')
    }
  }

  try {
    const { audio } = await generateSpeech({
      model: gateway.speech('elevenlabs/eleven-flash-v2.5'),
      text,
      voice,
      language: 'es',
      outputFormat: 'mp3',
      maxRetries: 1,
    })
    return new NextResponse(audio.uint8Array, {
      headers: { 'Content-Type': audio.mediaType || 'audio/mpeg', 'Cache-Control': 'private, max-age=3600' },
    })
  } catch (error) {
    console.error('[tts] fallo Gateway', error instanceof Error ? error.message : String(error))
    return NextResponse.json({ error: 'La voz no está disponible ahora.', code: 'provider_unreachable' }, { status: 502 })
  }
}
