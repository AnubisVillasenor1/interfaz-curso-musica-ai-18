import { NextResponse } from 'next/server'
import { z } from 'zod'
import { callLicenseService } from '@/lib/licensing/license-service'
import { enforcePolicy } from '@/lib/rate-limit'
import { createClient } from '@/lib/supabase/server'
import { SUPABASE_NOT_CONFIGURED } from '@/lib/supabase/config'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const revokeSchema = z.object({ licenseId: z.string().trim().min(8).max(96) }).strict()

export async function GET() {
  const supabase = await createClient()
  if (!supabase) return NextResponse.json({ error: SUPABASE_NOT_CONFIGURED }, { status: 503 })
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Inicia sesión para ver tus licencias.' }, { status: 401 })
  const result = await callLicenseService<{ licenses: Array<{ jti: string; plan: string; status: string; issued_at: string; expires_at: string; revoked_at: string | null; device_id: string; token: string }> }>(`/v1/licenses/${encodeURIComponent(user.id)}`)
  if (!result.ok) return NextResponse.json({ error: 'No se pudieron cargar tus licencias.' }, { status: result.status })
  return NextResponse.json({ licenses: result.data.licenses }, { headers: { 'Cache-Control': 'private, no-store' } })
}

export async function POST(request: Request) {
  const supabase = await createClient()
  if (!supabase) return NextResponse.json({ error: SUPABASE_NOT_CONFIGURED }, { status: 503 })
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Inicia sesión para desactivar una licencia.' }, { status: 401 })
  const limited = await enforcePolicy(request, 'licensing.revoke', 'Has solicitado varias desactivaciones. Espera un momento.', {}, user.id)
  if (limited) return limited
  const body: unknown = await request.json().catch(() => null)
  const parsed = revokeSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Identificador de licencia inválido.' }, { status: 400 })
  const result = await callLicenseService<{ revoked: boolean; licenseId: string }>('/v1/licenses/revoke', {
    method: 'POST',
    body: JSON.stringify({ userId: user.id, licenseId: parsed.data.licenseId }),
  })
  if (!result.ok) {
    const status = result.error === 'license_not_found_or_inactive' ? 404 : result.status
    return NextResponse.json({ error: status === 404 ? 'No se encontró una licencia activa para desactivar.' : 'No se pudo desactivar la licencia.' }, { status })
  }
  return NextResponse.json(result.data, { headers: { 'Cache-Control': 'private, no-store' } })
}
