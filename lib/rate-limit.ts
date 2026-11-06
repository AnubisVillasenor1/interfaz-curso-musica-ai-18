/**
 * Tope en memoria compartido para rutas públicas.
 *
 * Serverless no comparte memoria entre instancias (el límite es por nodo),
 * pero es el freno razonable sin infraestructura: corta el abuso trivial y
 * protege los cupos de proveedores de terceros.
 */
const hits = new Map<string, { count: number; resetAt: number }>()

export function rateLimitPublic(key: string, limit: number, windowMs = 60_000): boolean {
  const now = Date.now()
  if (hits.size > 2000) {
    for (const [bucket, entry] of hits) if (entry.resetAt < now) hits.delete(bucket)
  }
  const entry = hits.get(key)
  if (!entry || entry.resetAt < now) {
    hits.set(key, { count: 1, resetAt: now + windowMs })
    return true
  }
  entry.count += 1
  return entry.count <= limit
}

export function ipOf(request: Request): string {
  const realIp = request.headers.get('x-real-ip')?.trim()
  if (realIp) return realIp.slice(0, 120)
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) {
    const parts = forwarded.split(',').map((part) => part.trim()).filter(Boolean)
    if (parts.length) return parts[parts.length - 1].slice(0, 120)
  }
  return 'sin-ip'
}
