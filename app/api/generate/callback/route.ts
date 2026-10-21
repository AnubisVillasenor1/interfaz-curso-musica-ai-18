import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(request: Request) {
  const body = await request.json().catch(() => null)
  if (!body) return NextResponse.json({ error: 'Payload inválido.' }, { status: 400 })
  const songId = new URL(request.url).searchParams.get('songId') ?? body.songId ?? body.metadata?.songId
  const audioUrl = body.audio_url ?? body.audioUrl ?? body.data?.audio_url ?? body.data?.audioUrl
  if (!songId) return NextResponse.json({ error: 'songId requerido.' }, { status: 400 })
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { autoRefreshToken: false, persistSession: false } })
  const { error } = await supabase.from('songs').update({ status: audioUrl ? 'ready' : 'error', audio_url: audioUrl ?? null, duration_seconds: Number(body.duration ?? body.data?.duration) || null }).eq('id', songId)
  if (error) return NextResponse.json({ error: 'No se pudo actualizar la canción.' }, { status: 500 })
  return NextResponse.json({ received: true })
}
