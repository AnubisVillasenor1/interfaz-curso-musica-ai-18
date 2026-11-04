import { NextResponse } from 'next/server'
import { planMusic } from '@/lib/music/agent'

export const runtime = 'nodejs'

export async function POST(request: Request) {
  const body = await request.json().catch(() => null) as { prompt?: unknown } | null
  const prompt = typeof body?.prompt === 'string' ? body.prompt.trim() : ''
  if (!prompt) return NextResponse.json({ error: 'Escribe una idea musical.' }, { status: 400 })
  if (prompt.length > 1200) return NextResponse.json({ error: 'La idea no puede superar 1.200 caracteres.' }, { status: 413 })

  const plan = await planMusic(prompt)
  return NextResponse.json({ plan, audioGeneration: 'midi', message: 'Plan listo. Puedes exportar una composición MIDI; no se ha generado audio renderizado.' })
}
