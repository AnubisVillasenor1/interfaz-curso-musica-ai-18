import { NextResponse } from 'next/server'

import { ipOf, rateLimitPublic } from '@/lib/rate-limit'

export const runtime = 'nodejs'
export const maxDuration = 30

/**
 * Proxy opcional hacia el servicio TAMV-AudioCore.
 *
 * Vercel Functions no ejecuta C++/CUDA/TensorRT. El contenedor nativo vive
 * fuera y se declara con `TAMV_AUDIO_CORE_URL`; si falta, esta ruta responde
 * 503 en vez de fingir un análisis nativo. El DSP de navegador sigue
 * funcionando sin este servicio.
 */
// El servicio sólo acepta hasta 16 384 bins (FFT de 32 768). Si el proxy
// dejara pasar 32 768, el navegador creería que caben y el upstream lo
// rechazaría con un 400 confuso.
const MAX_BINS = 16_384
const MIN_BINS = 32

function fail(status: number, error: string, code: string) {
  return NextResponse.json({ error, code }, { status, headers: { 'Cache-Control': 'no-store' } })
}

export async function GET() {
  const configured = Boolean(process.env.TAMV_AUDIO_CORE_URL?.trim())
  const response = NextResponse.json({
    configured,
    engine: configured ? 'remote-audiocore' : 'browser-dsp-only',
    contract: {
      endpoint: 'POST /api/music/analyze',
      body: { spectrumDb: 'number[32..16384]', sampleRate: '8000..192000', fftSize: 'power of two ≤ 32768' },
      response: { chroma: 'number[12]', key: 'object | null', contrast: 'object', level: '0..1', engine: 'numpy | native' },
    },
    note: configured
      ? 'El proxy reenvía al servicio externo. No ejecuta código nativo en Vercel.'
      : 'Sin TAMV_AUDIO_CORE_URL el servidor no analiza audio; el navegador usa su propio DSP.',
  })
  response.headers.set('Cache-Control', 'no-store')
  return response
}

export async function POST(request: Request) {
  if (!rateLimitPublic(`analyze:${ipOf(request)}`, 20)) {
    return NextResponse.json(
      { error: 'Demasiadas peticiones. Espera un momento.', code: 'rate_limited' },
      { status: 429, headers: { 'Retry-After': '60', 'Cache-Control': 'no-store' } },
    )
  }

  const baseUrl = process.env.TAMV_AUDIO_CORE_URL?.trim()
  if (!baseUrl) {
    return fail(503, 'El servicio TAMV-AudioCore no está configurado. El análisis local del navegador sigue disponible.', 'audio_core_not_configured')
  }

  let raw: string
  try {
    raw = await request.text()
  } catch {
    return fail(400, 'No se pudo leer el cuerpo de la petición.', 'invalid_body')
  }
  if (raw.length > 2_000_000) return fail(413, 'El espectro enviado es demasiado grande.', 'payload_too_large')

  let body: Record<string, unknown> | null = null
  try {
    const parsed = JSON.parse(raw)
    body = parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? (parsed as Record<string, unknown>) : null
  } catch {
    body = null
  }
  if (!body) return fail(400, 'Envía un objeto JSON con `spectrumDb`.', 'invalid_request')

  const spectrum = body.spectrumDb
  if (!Array.isArray(spectrum) || spectrum.length < MIN_BINS || spectrum.length > MAX_BINS) {
    return fail(400, `\`spectrumDb\` debe ser un arreglo de ${MIN_BINS} a ${MAX_BINS} magnitudes.`, 'invalid_spectrum')
  }
  const finite = spectrum.every((value) => typeof value === 'number' && Number.isFinite(value))
  if (!finite) return fail(400, '`spectrumDb` contiene valores no finitos.', 'invalid_spectrum')

  const sampleRate = body.sampleRate === undefined ? 48_000 : Number(body.sampleRate)
  if (!Number.isFinite(sampleRate) || sampleRate < 8_000 || sampleRate > 192_000) {
    return fail(400, '`sampleRate` debe estar entre 8000 y 192000.', 'invalid_sample_rate')
  }
  const fftSize = body.fftSize === undefined ? spectrum.length * 2 : Number(body.fftSize)
  if (!Number.isInteger(fftSize) || fftSize < 256 || fftSize > 32_768 || (fftSize & (fftSize - 1)) !== 0) {
    return fail(400, '`fftSize` debe ser una potencia de dos entre 256 y 32768.', 'invalid_fft_size')
  }

  const token = process.env.TAMV_AUDIO_CORE_TOKEN?.trim()
  let endpoint: URL
  try {
    const parsed = new URL('/analyse', baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`)
    if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error('protocol')
    endpoint = parsed
  } catch {
    return fail(503, '`TAMV_AUDIO_CORE_URL` no es una URL http(s) válida.', 'audio_core_misconfigured')
  }

  try {
    const upstream = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ spectrumDb: spectrum, sampleRate, fftSize }),
      signal: AbortSignal.timeout(8_000),
      cache: 'no-store',
    })
    const payload = await upstream.json().catch(() => null)
    if (!upstream.ok) {
      return fail(502, payload?.error ?? 'El servicio TAMV-AudioCore rechazó la petición.', 'audio_core_upstream_error')
    }
    if (!payload || typeof payload !== 'object' || !Array.isArray(payload.chroma) || payload.chroma.length !== 12) {
      return fail(502, 'El servicio TAMV-AudioCore devolvió un contrato inválido.', 'audio_core_invalid_response')
    }
    return NextResponse.json(payload, { status: 200, headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    const timedOut = error instanceof Error && (error.name === 'TimeoutError' || error.name === 'AbortError')
    return fail(
      502,
      timedOut ? 'El servicio TAMV-AudioCore agotó el tiempo de espera.' : 'No se pudo contactar con TAMV-AudioCore.',
      timedOut ? 'audio_core_timeout' : 'audio_core_unreachable',
    )
  }
}
