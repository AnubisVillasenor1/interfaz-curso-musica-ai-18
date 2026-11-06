import { NextResponse } from 'next/server'
import { createMidi } from '@/lib/music/midi'
import { createLocalPlan } from '@/lib/music/agent'

export const runtime = 'nodejs'

export async function POST(request: Request) {
  const body = await request.json().catch(() => null) as { prompt?: unknown; tempo?: unknown; key?: unknown } | null
  const prompt = typeof body?.prompt === 'string' ? body.prompt.trim() : ''
  if (!prompt) return NextResponse.json({ error: 'Escribe una idea musical.', code: 'invalid_request' }, { status: 400 })
  if (prompt.length > 1200) return NextResponse.json({ error: 'La idea no puede superar 1.200 caracteres.', code: 'prompt_too_long', limit: 1200 }, { status: 413 })
  const defaults = createLocalPlan(prompt)
  const tempo = Number(body?.tempo)
  const safeTempo = Number.isInteger(tempo) && tempo >= 50 && tempo <= 180 ? tempo : defaults.tempo
  const key = typeof body?.key === 'string' && /^[A-G](?:#|b)?\s*(?:major|minor)$/i.test(body.key) ? body.key : defaults.key
  const midi = createMidi(prompt, safeTempo, key)
  const slug = defaults.title.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'composicion'
  return new NextResponse(midi, {
    headers: {
      'Content-Type': 'audio/midi',
      'Content-Disposition': `attachment; filename="${slug}.mid"`,
      'Cache-Control': 'no-store',
    },
  })
}
