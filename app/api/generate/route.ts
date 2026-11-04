import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const ROOT_ADMIN = 'tamvonlinenetwork@outlook.es'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Inicia sesión para crear música.' }, { status: 401 })
  const body = await request.json()
  const title = String(body.title || '').trim().slice(0, 80)
  const prompt = String(body.prompt || '').trim().slice(0, 2000)
  if (!title || !prompt) return NextResponse.json({ error: 'Completa el título y la dirección musical.' }, { status: 400 })
  const { data: entitlement } = await supabase.from('entitlements').select('daily_limit,used_today,reset_date,active').eq('user_id', user.id).maybeSingle()
  const isAdmin = user.email === ROOT_ADMIN
  const today = new Date().toISOString().slice(0, 10)
  const used = entitlement?.reset_date === today ? entitlement.used_today : 0
  if (!isAdmin && (!entitlement?.active || !entitlement.daily_limit || used >= entitlement.daily_limit)) return NextResponse.json({ error: 'Tu cupo diario está agotado. Activa tu inscripción o una extensión.' }, { status: 402 })
  const apiKey = process.env.API_KEY
  if (!apiKey) return NextResponse.json({ error: 'El proveedor musical no está configurado.' }, { status: 503 })
  const { data: song, error } = await supabase.from('songs').insert({ user_id: user.id, title, prompt, genre: body.genre, tempo: Number(body.tempo) || null, vocal_style: body.vocalStyle, instrumentation: body.instrumentation, status: 'generating' }).select('id,title,status,created_at').single()
  if (error) return NextResponse.json({ error: 'No se pudo guardar tu proyecto.' }, { status: 500 })
  try {
    const response = await fetch(process.env.SUNO_API_URL || 'https://api.sunoapi.org/api/v1/generate', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` }, signal: AbortSignal.timeout(30000), body: JSON.stringify({ prompt, customMode: true, instrumental: Boolean(body.instrumental), model: 'V4', callBackUrl: `${new URL(request.url).origin}/api/generate/callback?songId=${encodeURIComponent(song.id)}` }) })
    const result = await response.json()
    if (!response.ok) throw new Error('provider error')
    if (!isAdmin) await supabase.from('entitlements').update({ used_today: used + 1, reset_date: today }).eq('user_id', user.id)
    return NextResponse.json({ song, provider: result })
  } catch { await supabase.from('songs').update({ status: 'error' }).eq('id', song.id); return NextResponse.json({ song, error: 'El proveedor musical no respondió. Tu proyecto quedó guardado para reintentar.' }, { status: 502 }) }
}
