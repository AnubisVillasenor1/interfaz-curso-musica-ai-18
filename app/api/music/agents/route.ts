import { NextResponse } from 'next/server'

import { GENRES } from '@/lib/music/genres'
import { MULTI_AGENT_LIMITS, planMultiAgent } from '@/lib/music/multiagent'
import { enforcePolicy } from '@/lib/rate-limit'

export const runtime = 'nodejs'
export const maxDuration = 30

/**
 * Panel multiagente del estudio.
 *
 * Vive en `/api/music/agents`, no en `/api/agent`: esa última ruta es el chat
 * del curso y exige `{ message }`. Mezclar ambos contratos fue el bug que dejó
 * el paso 1 del taller sin plan. Aquí el contrato es explícito y determinista.
 */

function nativeConfigured(): boolean {
  return Boolean(process.env.TAMV_AUDIO_CORE_URL?.trim())
}

export async function GET() {
  const response = NextResponse.json({
    agent: 'TAMV-MultiAgent-Orchestrator',
    version: '2.0',
    source: 'rules',
    limits: MULTI_AGENT_LIMITS,
    endpoints: {
      plan: '/api/music/agents',
      analysis: '/api/music/analyze',
    },
    service: {
      nativeConfigured: nativeConfigured(),
      note: 'El plan es determinista. El servicio nativo de análisis es opcional y no se ejecuta dentro de Vercel Functions.',
    },
  })
  response.headers.set('Cache-Control', 'no-store')
  return response
}

export async function POST(request: Request) {
  const rateLimitResponse = await enforcePolicy(
    request,
    'music.agents',
    'Demasiadas peticiones. Espera un momento.',
  )
  if (rateLimitResponse) return rateLimitResponse

  let body: Record<string, unknown> | null = null
  try {
    const parsed = await request.json()
    body = parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? (parsed as Record<string, unknown>) : null
  } catch {
    body = null
  }
  if (!body) {
    return NextResponse.json(
      { error: 'Envía un objeto JSON con la idea musical.', code: 'invalid_request' },
      { status: 400, headers: { 'Cache-Control': 'no-store' } },
    )
  }

  const prompt = typeof body.prompt === 'string' ? body.prompt.trim() : ''
  if (!prompt) {
    return NextResponse.json(
      { error: 'Escribe una idea musical.', code: 'invalid_request' },
      { status: 400, headers: { 'Cache-Control': 'no-store' } },
    )
  }
  if (prompt.length > MULTI_AGENT_LIMITS.promptChars) {
    return NextResponse.json(
      {
        error: `La idea no puede superar ${MULTI_AGENT_LIMITS.promptChars} caracteres.`,
        code: 'prompt_too_long',
        limit: MULTI_AGENT_LIMITS.promptChars,
      },
      { status: 413, headers: { 'Cache-Control': 'no-store' } },
    )
  }

  const genreId = typeof body.genreId === 'string' ? body.genreId.trim() : ''
  if (genreId && !GENRES.some((genre) => genre.id === genreId)) {
    return NextResponse.json(
      { error: 'Ese género no existe en el catálogo local.', code: 'unknown_genre', allowed: GENRES.map((genre) => genre.id) },
      { status: 400, headers: { 'Cache-Control': 'no-store' } },
    )
  }

  let bpm: number | undefined
  if (body.bpm !== undefined && body.bpm !== null && body.bpm !== '') {
    const parsed = typeof body.bpm === 'number' ? body.bpm : Number(body.bpm)
    if (!Number.isInteger(parsed) || parsed < MULTI_AGENT_LIMITS.minBpm || parsed > MULTI_AGENT_LIMITS.maxBpm) {
      return NextResponse.json(
        {
          error: `El BPM debe ser un entero entre ${MULTI_AGENT_LIMITS.minBpm} y ${MULTI_AGENT_LIMITS.maxBpm}.`,
          code: 'invalid_bpm',
        },
        { status: 400, headers: { 'Cache-Control': 'no-store' } },
      )
    }
    bpm = parsed
  }

  try {
    const plan = planMultiAgent({ prompt, genreId: genreId || undefined, bpm })
    return NextResponse.json(
      {
        plan,
        service: {
          nativeConfigured: nativeConfigured(),
          analysisEndpoint: '/api/music/analyze',
        },
      },
      { status: 200, headers: { 'Cache-Control': 'no-store' } },
    )
  } catch (error) {
    const message = error instanceof RangeError ? error.message : 'El orquestador no pudo construir el plan.'
    return NextResponse.json(
      { error: message, code: 'agent_error' },
      { status: 400, headers: { 'Cache-Control': 'no-store' } },
    )
  }
}
