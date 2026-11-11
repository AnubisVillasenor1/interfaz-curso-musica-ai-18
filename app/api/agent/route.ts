import { generateText, gateway } from 'ai'
import { NextResponse } from 'next/server'

import {
  agentProviderLabel,
  answerWithoutModel,
  buildSystemPrompt,
  trimHistory,
  type ChatTurn,
} from '@/lib/agent/guide'
import { rateLimitPublic } from '@/lib/rate-limit'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'
export const maxDuration = 30

/** Límites duros: un chat abierto al público sin techo es una factura, no una función. */
const MAX_MESSAGE_CHARS = 2000
const MAX_TURNS = 8
const ANONYMOUS_PER_WINDOW = 6
const SIGNED_IN_PER_WINDOW = 20

function ipOf(request: Request): string {
  // `x-forwarded-for` lo escribe el cliente: la primera entrada es falsificable
  // y con ella el límite anónimo se evade rotando el header. Los proxies de
  // confianza añaden al final, así que la última entrada es la IP real vista
  // por la plataforma; `x-real-ip` (Vercel) se prefiere cuando existe.
  const realIp = request.headers.get('x-real-ip')?.trim()
  if (realIp) return realIp.slice(0, 120)
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) {
    const parts = forwarded.split(',').map((part) => part.trim()).filter(Boolean)
    if (parts.length) return parts[parts.length - 1].slice(0, 120)
  }
  return 'sin-ip'
}

/**
 * Clave de la bucket.
 *
 * El chat responde igual con o sin sesión, así que la identidad solo cambia el
 * techo. Se prefiere el `userId`: un aula entera sale por la misma IP y
 * castigarla como si fuera un solo alumno levantaría un muro falso.
 */
function bucketKey(userId: string | null, request: Request): string {
  return userId ? `u:${userId}` : `ip:${ipOf(request)}`
}

interface ProviderReply {
  content: string
  model: string
}

async function askProvider(messages: ChatTurn[]): Promise<ProviderReply> {
  const model = agentProviderLabel()
  const result = await generateText({
    model: gateway(model),
    system: buildSystemPrompt(),
    messages,
    temperature: 0.4,
    maxOutputTokens: 500,
    abortSignal: AbortSignal.timeout(20_000),
  })

  const content = result.text.trim()
  if (!content) throw new Error('el Gateway respondió sin contenido')
  return { content: content.slice(0, 4000), model }
}

/**
 * Chat del curso.
 *
 * Dos ramas y una sola promesa: nunca se finge una IA.
 *
 * - El Vercel AI Gateway responde con un modelo real, usando como contexto el
 *   programa del curso y el catálogo de precios sin exponer claves al cliente.
 * - Si el Gateway falla o tarda demasiado, responde la guía determinista con
 *   el contenido curricular. La respuesta lleva `source: 'fallback'` y la
 *   interfaz lo dice.
 *
 * El system prompt viaja aparte del mensaje del usuario, para que lo que
 * alguien escriba en el chat no pueda reescribir las instrucciones.
 */
export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as
    | { message?: unknown; history?: unknown }
    | null

  const message = typeof body?.message === 'string' ? body.message.trim() : ''
  if (!message) return NextResponse.json({ error: 'Escribe una pregunta.', code: 'invalid_request' }, { status: 400 })
  if (message.length > MAX_MESSAGE_CHARS) {
    return NextResponse.json({ error: 'Tu mensaje es demasiado largo.', code: 'message_too_long', limit: MAX_MESSAGE_CHARS }, { status: 413 })
  }

  const history = Array.isArray(body?.history) ? (body.history as ChatTurn[]) : []
  const messages: ChatTurn[] = [...trimHistory(history, MAX_TURNS), { role: 'user', content: message }]

  // La sesión solo hace falta para llamar al modelo: es el camino que cuesta
  // dinero. Un visitante que pregunta el precio recibe la guía del curso sin
  // esperar el viaje de validación.
  if (agentProviderLabel()) {
    const supabase = await createClient()
    const {
      data: { user },
    } = (await supabase?.auth.getUser()) ?? { data: { user: null } }

    const limit = user ? SIGNED_IN_PER_WINDOW : ANONYMOUS_PER_WINDOW
    const rate = await rateLimitPublic(bucketKey(user?.id ?? null, request), limit)
    if (rate.status !== 'allowed') {
      const unavailable = rate.status === 'unavailable'
      const retryAfter = unavailable ? 5 : Math.max(1, Math.ceil((rate.reset - Date.now()) / 1000))
      return NextResponse.json(
        {
          answer: unavailable
            ? 'El servicio de respuestas está temporalmente ocupado. Inténtalo de nuevo en unos segundos.'
            : 'Varios mensajes seguidos desde el mismo sitio: espera un minuto y vuelve a preguntar.',
          source: 'fallback',
          lessonIds: [],
          rateLimited: !unavailable,
          error: unavailable
            ? 'El control de solicitudes no está disponible temporalmente.'
            : 'Demasiadas preguntas seguidas. Espera antes de volver a intentar.',
          code: unavailable ? 'rate_limit_unavailable' : 'rate_limited',
          retryAfter,
        },
        {
          status: unavailable ? 503 : 429,
          headers: {
            'Retry-After': String(retryAfter),
            'X-RateLimit-Limit': String(limit),
            'X-RateLimit-Remaining': '0',
            'Cache-Control': 'no-store',
          },
        },
      )
    }

    try {
      const reply = await askProvider(messages)
      return NextResponse.json(
        { answer: reply.content, source: 'llm', model: reply.model, lessonIds: [] },
        {
          headers: {
            'X-RateLimit-Limit': String(limit),
            'X-RateLimit-Remaining': String(rate.remaining),
          },
        },
      )
    } catch (error) {
      console.error('[agent] el proveedor no respondió; se usa la guía del curso', {
        message: error instanceof Error ? error.message : String(error),
      })
    }
  }

  const fallback = answerWithoutModel(message)
  return NextResponse.json({
    ...fallback,
    note: agentProviderLabel() ? 'El modelo no respondió; te contesto con el contenido del curso.' : undefined,
  })
}
