import { NextResponse } from 'next/server'

import { createAdminClient } from '@/lib/supabase/admin'

export const runtime = 'nodejs'

/**
 * Verificación pública de constancias: introduce el código y devuelve
 * emisor, fecha y estado. La lectura usa service_role sin sesión, por eso
 * la política pública debe limitarse a esta ruta (ver migración 190500).
 */
export async function GET(request: Request) {
  const code = (new URL(request.url).searchParams.get('code') ?? '').trim().toUpperCase()
  if (!code) return NextResponse.json({ error: 'Escribe el código de la constancia.', code: 'invalid_request' }, { status: 400 })

  const admin = createAdminClient()
  if (!admin) return NextResponse.json({ error: 'La verificación no está configurada.', code: 'not_configured' }, { status: 503 })

  const { data: cert, error } = await admin
    .from('certificates')
    .select('code, issued_at, exam_attempts!inner(score, passed)')
    .eq('code', code)
    .maybeSingle()

  if (error) {
    console.error('[certificado] verificación falló', error.message)
    return NextResponse.json({ error: 'No pudimos verificar.', code: 'read_failed' }, { status: 500 })
  }
  if (!cert) return NextResponse.json({ valid: false, code: 'not_found' }, { status: 404 })

  const attempt = Array.isArray(cert.exam_attempts) ? cert.exam_attempts[0] : cert.exam_attempts
  return NextResponse.json({
    valid: true,
    code: cert.code,
    issuer: 'TAMV Online Network',
    issuedAt: cert.issued_at,
    score: (attempt as { score?: number } | null)?.score ?? null,
    note: 'Constancia por participación (no acredita título oficial).',
  })
}
