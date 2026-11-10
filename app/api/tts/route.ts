import { generateSpeech } from 'ai'
import { gateway } from '@ai-sdk/gateway'
import { NextResponse } from 'next/server'

import { ipOf, rateLimitPublic } from '@/lib/rate-limit'

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
  if (!rateLimitPublic(`tts:${ipOf(request)}`, 10)) {
    return NextResponse.json({ error: 'Demasiadas peticiones de voz. Espera un momento.', code: 'rate_limited' }, { status: 429, headers: { 'Retry-After': '60' } })
  }

  const body = (await request.json().catch(() => null)) as { text?: unknown; voice?: unknown } | null
  const text = typeof body?.text === 'string' ? body.text.trim().slice(0, 900) : ''
  if (!text) return NextResponse.json({ error: 'Escribe el texto a leer.', code: 'invalid_request' }, { status: 400 })

  const voice = typeof body?.voice === 'string' && /^[a-z_]{2,20}$/i.test(body.voice) ? body.voice : 'Rachel'

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
