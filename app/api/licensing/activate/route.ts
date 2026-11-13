import { randomUUID } from 'node:crypto'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { callLicenseService } from '@/lib/licensing/license-service'
import { enforcePolicy } from '@/lib/rate-limit'
import { createClient } from '@/lib/supabase/server'
import { SUPABASE_NOT_CONFIGURED } from '@/lib/supabase/config'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const activationSchema = z.object({
  deviceLabel: z.string().trim().min(1).max(80).optional(),
}).strict()
const DEVICE_COOKIE = 'tamv-license-device'

export async function POST(request: Request) {
  const supabase = await createClient()
  if (!supabase) return NextResponse.json({ error: SUPABASE_NOT_CONFIGURED }, { status: 503 })
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Inicia sesión para activar una licencia.' }, { status: 401 })
  const limited = await enforcePolicy(request, 'licensing.activate', 'Has solicitado varias activaciones. Espera antes de intentarlo otra vez.', {}, user.id)
  if (limited) return limited
  const length = Number(request.headers.get('content-length') ?? 0)
  if (length > 4096) return NextResponse.json({ error: 'La solicitud es demasiado grande.' }, { status: 413 })
  const body: unknown = await request.json().catch(() => null)
  const parsed = activationSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Indica un identificador válido para este dispositivo.' }, { status: 400 })
  const cookieStore = await cookies()
  const existingDeviceId = cookieStore.get(DEVICE_COOKIE)?.value
  const deviceId = z.string().uuid().safeParse(existingDeviceId).success ? existingDeviceId! : randomUUID()
  const result = await callLicenseService<{ license: string; licenseId: string; keyId?: string; keyVersion?: number; expiresAt?: string; features?: string[]; limits?: Record<string, number>; reused?: boolean }>('/v1/licenses/issue', {
    method: 'POST',
    body: JSON.stringify({ userId: user.id, deviceId, ...parsed.data }),
  })
  if (!result.ok) return NextResponse.json({ error: publicError(result.error) }, { status: result.status })
  const response = NextResponse.json(result.data, { status: result.status, headers: { 'Cache-Control': 'private, no-store' } })
  response.cookies.set(DEVICE_COOKIE, deviceId, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/', maxAge: 60 * 60 * 24 * 365 })
  return response
}

function publicError(error: string) {
  const messages: Record<string, string> = {
    license_service_not_configured: 'El servicio de licencias no está configurado.',
    license_service_unavailable: 'El servicio de licencias no está disponible.',
    active_entitlement_required: 'Necesitas un plan activo para emitir una licencia.',
    device_limit_reached: 'Alcanzaste el límite de dispositivos activos.',
    device_revoked: 'Este dispositivo fue desactivado.',
    active_license_exists: 'Este navegador ya tiene una licencia activa.',
    license_service_error: 'No se pudo emitir una licencia en este momento.',
  }
  return messages[error] ?? 'No se pudo activar la licencia.'
}
