import { NextResponse } from 'next/server'

import { ipOf, rateLimitPublic } from '@/lib/rate-limit'

export const runtime = 'nodejs'
export const maxDuration = 30

/**
 * Voz para la academia (gratis en BazaarLink).
 *
 * `elevenlabs/eleven-flash-v2.5` figura a costo cero en el catálogo, y la
 * ruta solo existe con `AI_AGENT_API_KEY` (se usa como llave de BazaarLink
 * cuando `AI_AGENT_BASE_URL` apunta allí). Sin clave → 503 honesto con
 * alternativa: el alumno lee la lección en pantalla.
 */
export async function POST(request: Request) {
  if (!rateLimitPublic(`tts:${ipOf(request)}`, 10)) {
    return NextResponse.json({ error: 'Demasiadas peticiones de voz. Espera un momento.', code: 'rate_limited' }, { status: 429, headers: { 'Retry-After': '60' } })
  }

  const apiKey = process.env.AI_AGENT_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'La lectura en voz no está configurada en este entorno.', code: 'not_configured' }, { status: 503 })
  }

  const body = (await request.json().catch(() => null)) as { text?: unknown; voice?: unknown } | null
  const text = typeof body?.text === 'string' ? body.text.trim().slice(0, 900) : ''
  if (!text) return NextResponse.json({ error: 'Escribe el texto a leer.', code: 'invalid_request' }, { status: 400 })

  const voice = typeof body?.voice === 'string' && /^[a-z_]{2,20}$/i.test(body.voice) ? body.voice : 'george'
  const base = (process.env.AI_AGENT_BASE_URL ?? 'https://api.bazaarlink.ai/v1').replace(/\/+$/, '')

  try {
    const response = await fetch(`${base}/audio/speech`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      signal: AbortSignal.timeout(30_000),
      body: JSON.stringify({ model: 'elevenlabs/eleven-flash-v2.5', input: text, voice, response_format: 'mp3' }),
    })
    if (!response.ok) {
      const detail = await response.text().catch(() => '')
      console.error('[tts] proveedor no respondió', response.status, detail.slice(0, 200))
      return NextResponse.json({ error: 'La voz no está disponible ahora.', code: 'provider_unreachable' }, { status: 502 })
    }
    const audio = await response.arrayBuffer()
    return new NextResponse(audio, {
      headers: { 'Content-Type': 'audio/mpeg', 'Cache-Control': 'no-store' },
    })
  } catch (error) {
    console.error('[tts] fallo', error instanceof Error ? error.message : String(error))
    return NextResponse.json({ error: 'La voz no está disponible ahora.', code: 'provider_unreachable' }, { status: 502 })
  }
}
