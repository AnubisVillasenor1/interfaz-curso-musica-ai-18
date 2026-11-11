import { generateText, gateway } from 'ai'
import { NextResponse } from 'next/server'

import {
  agentProviderLabel,
  answerWithoutModel,
  buildSystemPrompt,
  trimHistory,
  type ChatTurn,
} from '@/lib/agent/guide'
import { RATE_LIMIT_POLICIES, checkPolicy } from '@/lib/rate-limit'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'
export const maxDuration = 30

/** Límites duros: un chat abierto al público sin techo es una factura, no una función. */
const MAX_MESSAGE_CHARS = 2000
const MAX_TURNS = 8

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

    const scope = user ? 'agent.chat.authenticated' : 'agent.chat.anonymous'
    const limit = RATE_LIMIT_POLICIES[scope].limit
    const rate = await checkPolicy(request, scope, user?.id ?? null)
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
