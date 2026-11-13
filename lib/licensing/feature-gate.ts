import { cookies } from 'next/headers'
import { z } from 'zod'

import { callLicenseService } from '@/lib/licensing/license-service'

export type TamvFeature =
  | 'studio.basic'
  | 'audiocore.basic'
  | 'audiocore.advanced'
  | 'voice_identity'
  | 'creator_growth.basic'
  | 'creator_growth'
  | 'monetization_advisor'
  | 'tamv_research'

type AuthorizationData = {
  allowed: boolean
  reason: string
  plan: string
  limit: number
  used: number
  expiresAt: string
  limits: Record<string, number>
}

export async function authorizeFeatureForUser(
  userId: string,
  feature: TamvFeature,
  options: { consume?: boolean; jobId?: string } = {},
): Promise<{ ok: true; data: AuthorizationData } | { ok: false; status: number; code: string }> {
  const deviceId = (await cookies()).get('tamv-license-device')?.value
  if (!z.string().uuid().safeParse(deviceId).success) {
    return { ok: false, status: 403, code: 'license_activation_required' }
  }

  const result = await callLicenseService<AuthorizationData>('/v1/features/authorize', {
    method: 'POST',
    body: JSON.stringify({
      userId,
      deviceId,
      feature,
      consume: options.consume ?? false,
      jobId: options.jobId,
    }),
  })
  if (!result.ok) return { ok: false, status: result.status, code: result.error }
  if (!result.data.allowed) return { ok: false, status: 403, code: result.data.reason || 'feature_denied' }
  return { ok: true, data: result.data }
}

export function featureGateMessage(code: string) {
  const messages: Record<string, string> = {
    license_activation_required: 'Activa una licencia en tu perfil para usar esta función.',
    license_service_not_configured: 'El servicio de licencias no está configurado.',
    license_service_unavailable: 'El servicio de licencias no está disponible.',
    feature_denied: 'Tu licencia no incluye esta función.',
    license_not_found: 'No hay una licencia activa para este dispositivo.',
    license_expired: 'Tu licencia expiró. Renueva tu plan para continuar.',
    license_revoked: 'Esta licencia fue revocada.',
    device_revoked: 'Este dispositivo fue desactivado.',
    feature_limit_reached: 'Alcanzaste el límite de uso de tu licencia.',
  }
  return messages[code] ?? 'Tu licencia no autoriza esta función.'
}
