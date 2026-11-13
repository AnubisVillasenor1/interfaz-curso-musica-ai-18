const baseUrl = (process.env.LICENSE_SERVICE_URL ?? (process.env.NODE_ENV === 'development' ? 'http://127.0.0.1:8100' : undefined))?.replace(/\/$/, '')
const internalToken = process.env.LICENSE_SERVICE_INTERNAL_TOKEN

export async function callLicenseService<T>(path: string, init: RequestInit = {}): Promise<{ ok: true; status: number; data: T } | { ok: false; status: number; error: string }> {
  if (!baseUrl || !internalToken) return { ok: false, status: 503, error: 'license_service_not_configured' }
  let response: Response
  try {
    response = await fetch(`${baseUrl}${path}`, {
      ...init,
      cache: 'no-store',
      signal: AbortSignal.timeout(7000),
      headers: { ...init.headers, 'x-internal-token': internalToken, 'content-type': 'application/json' },
    })
  } catch {
    return { ok: false, status: 503, error: 'license_service_unavailable' }
  }
  const data: unknown = await response.json().catch(() => null)
  if (!response.ok) {
    const error = typeof data === 'object' && data !== null && 'error' in data && typeof data.error === 'string' ? data.error : 'license_service_error'
    return { ok: false, status: response.status, error }
  }
  return { ok: true, status: response.status, data: data as T }
}
