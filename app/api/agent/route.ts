import { NextResponse } from 'next/server'

import {
  agentProviderLabel,
  answerWithoutModel,
  buildSystemPrompt,
  trimHistory,
  type ChatTurn,
} from '@/lib/agent/guide'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'
export const maxDuration = 30

/** Límites duros: un chat abierto al público sin techo es una factura, no una función. */
const MAX_MESSAGE_CHARS = 2000
const MAX_TURNS = 8
const WINDOW_MS = 60_000
const ANONYMOUS_PER_WINDOW = 6
const SIGNED_IN_PER_WINDOW = 20

/**
 * Tope en memoria por nodo.
 *
 * Serverless no comparte memoria entre instancias, así que esto no es un
 * cortafuegos: es el frenado razonable que cabe sin infraestructura. El techo
 * real lo ponen el límite de tokens del proveedor y el gasto máximo
 * configurado en su panel, y eso va en la documentación de despliegue.
 */
const hits = new Map<string, { count: number; resetAt: number }>()

function rateLimited(key: string, limit: number): boolean {
  const now = Date.now()

  // Poda: sin esto el mapa crecería con cada IP nueva durante toda la vida del
  // proceso, que en un nodo largo son muchas ventanas ya caducadas.
  if (hits.size > 2000) {
    for (const [bucket, entry] of hits) if (entry.resetAt < now) hits.delete(bucket)
  }

  const entry = hits.get(key)
  if (!entry || entry.resetAt < now) {
    hits.set(key, { count: 1, resetAt: now + WINDOW_MS })
    return false
  }
  entry.count += 1
  return entry.count > limit
}

function ipOf(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for')
  return (forwarded?.split(',')[0].trim() || request.headers.get('x-real-ip') || 'sin-ip').slice(0, 120)
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
  const apiKey = process.env.AI_AGENT_API_KEY
  if (!apiKey) throw new Error('sin AI_AGENT_API_KEY')

  const base = (process.env.AI_AGENT_BASE_URL ?? 'https://api.openai.com/v1').replace(/\/+$/, '')
  const model = process.env.AI_AGENT_MODEL ?? 'gpt-4o-mini'

  const response = await fetch(`${base}/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    signal: AbortSignal.timeout(20_000),
    body: JSON.stringify({
      model,
      messages: [{ role: 'system', content: buildSystemPrompt() }, ...messages],
      temperature: 0.4,
      max_tokens: 500,
      // Sin cabecera de identificación, muchos proveedores agrupan el tráfico
      // en logs compartidos; el correo del alumno no debe entrar ahí.
      stream: false,
    }),
  })

  if (!response.ok) {
    // El cuerpo del error del proveedor puede traer datos de la cuenta; se
    // queda en el log del servidor y el usuario solo ve que no respondió.
    const detail = await response.text().catch(() => '')
    throw new Error(`proveedor ${response.status}: ${detail.slice(0, 300)}`)
  }

  const payload = (await response.json().catch(() => null)) as {
    choices?: Array<{ message?: { content?: string } }>
    model?: string
  } | null

  const content = payload?.choices?.[0]?.message?.content?.trim()
  if (!content) throw new Error('el proveedor respondió sin contenido')

  return { content: content.slice(0, 4000), model: payload?.model ?? model }
}

/**
 * Chat del curso.
 *
 * Dos ramas y una sola promesa: nunca se finge una IA.
 *
 * - Con `AI_AGENT_API_KEY`, la pregunta se responde con un proveedor real
 *   compatible con /chat/completions, usando como contexto el programa del
 *   curso y el catálogo de precios.
 * - Sin clave, o si el proveedor falla o tarda demasiado, responde la guía
 *   determinista con el contenido curricular. La respuesta lleva
 *   `source: 'fallback'` y la interfaz lo dice.
 *
 * El system prompt viaja aparte del mensaje del usuario, para que lo que
 * alguien escriba en el chat no pueda reescribir las instrucciones.
 */
export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as
    | { message?: unknown; history?: unknown }
    | null

  const message = typeof body?.message === 'string' ? body.message.trim() : ''
  if (!message) return NextResponse.json({ error: 'Escribe una pregunta.' }, { status: 400 })
  if (message.length > MAX_MESSAGE_CHARS) {
    return NextResponse.json({ error: 'Tu mensaje es demasiado largo.' }, { status: 413 })
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
    if (rateLimited(bucketKey(user?.id ?? null, request), limit)) {
      return NextResponse.json(
        {
          answer: 'Varios mensajes seguidos desde el mismo sitio: espera un minuto y vuelve a preguntar.',
          source: 'fallback',
          lessonIds: [],
          rateLimited: true,
        },
        { status: 429 },
      )
    }

    try {
      const reply = await askProvider(messages)
      return NextResponse.json({ answer: reply.content, source: 'llm', model: reply.model, lessonIds: [] })
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
