import { NextResponse } from 'next/server'

import { planMusic } from '@/lib/music/agent'

export const runtime = 'nodejs'
export const maxDuration = 30

/**
 * Plan de arreglo para el taller del estudio.
 *
 * `MusicStudio` pedía `/api/agent` con `{ prompt }` y esperaba `{ plan, message }`,
 * pero `/api/agent` es el chat del curso: exige `{ message }` y devuelve
 * `{ answer, source }`. El contrato nunca coincidía y el paso 1 del estudio no
 * podía producir un plan. Las dos cosas viven en rutas distintas a propósito:
 * el chat responde sobre el curso; el planificador compone bocetos.
 *
 * `planMusic()` ya existía en `lib/music/agent.ts` (Ollama local opcional +
 * fallback determinista) pero ninguna ruta lo llamaba.
 */
export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => null)) as { prompt?: unknown } | null
    const prompt = typeof body?.prompt === 'string' ? body.prompt.trim() : ''
    if (!prompt) return NextResponse.json({ error: 'Escribe una idea musical.', code: 'invalid_request' }, { status: 400 })
    if (prompt.length > 1200) {
      return NextResponse.json(
        { error: 'La idea no puede superar 1.200 caracteres.', code: 'prompt_too_long', limit: 1200 },
        { status: 413 },
      )
    }

    const plan = await planMusic(prompt)
    const message =
      plan.engine === 'ollama'
        ? 'Plan generado con el modelo local de arreglo.'
        : 'Plan determinista: sin modelo configurado, el programa compone el arreglo con reglas.'
    return NextResponse.json({ plan, message })
  } catch (error) {
    console.error('[music/plan] fallo al planear', error instanceof Error ? error.message : String(error))
    return NextResponse.json({ error: 'No pudimos crear el plan ahora.', code: 'plan_failed' }, { status: 500 })
  }
}
