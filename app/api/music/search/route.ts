import { NextResponse } from 'next/server'

type MusicResult = { id: string; title: string; creator: string; source: string; license?: string; url: string }

async function json(url: URL, headers: HeadersInit = {}) {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 7000)
  try {
    const response = await fetch(url, { headers, signal: controller.signal, next: { revalidate: 3600 } })
    if (!response.ok) throw new Error(`Catalog returned ${response.status}`)
    return await response.json()
  } finally { clearTimeout(timeout) }
}

async function archiveSearch(query: string): Promise<MusicResult[]> {
  const url = new URL('https://archive.org/advancedsearch.php')
  url.searchParams.set('q', `(${query}) AND mediatype:audio`)
  url.searchParams.set('fl[]', 'identifier,title,creator,licenseurl,mediatype')
  url.searchParams.set('rows', '12')
  url.searchParams.set('output', 'json')
  const data = await json(url) as { response?: { docs?: Record<string, unknown>[] } }
  return (data.response?.docs ?? []).map((item) => {
    const id = String(item.identifier ?? '')
    return { id: `ia-${id}`, title: String(item.title ?? id), creator: String(item.creator ?? 'Internet Archive'), source: 'Internet Archive', license: String(item.licenseurl ?? 'Consulta la licencia del elemento antes de reutilizarlo.'), url: `https://archive.org/details/${encodeURIComponent(id)}` }
  }).filter((item) => item.id !== 'ia-')
}

async function jamendoSearch(query: string): Promise<MusicResult[]> {
  const clientId = process.env.JAMENDO_CLIENT_ID
  if (!clientId) return []
  const url = new URL('https://api.jamendo.com/v3.0/tracks/')
  url.searchParams.set('client_id', clientId)
  url.searchParams.set('format', 'json')
  url.searchParams.set('limit', '12')
  url.searchParams.set('search', query)
  url.searchParams.set('include', 'licenses')
  const data = await json(url) as { results?: { id: string; name: string; artist_name: string; shareurl: string; license_ccurl?: string }[] }
  return (data.results ?? []).map((item) => ({ id: `jamendo-${item.id}`, title: item.name, creator: item.artist_name, source: 'Jamendo', license: item.license_ccurl || 'Consulta la página del artista.', url: item.shareurl }))
}

export async function GET(request: Request) {
  const query = new URL(request.url).searchParams.get('q')?.trim() ?? ''
  if (query.length < 2) return NextResponse.json({ error: 'La búsqueda debe tener al menos 2 caracteres.', code: 'query_too_short' }, { status: 400 })
  if (query.length > 100) return NextResponse.json({ error: 'La búsqueda no puede superar 100 caracteres.', code: 'query_too_long' }, { status: 400 })
  const safeQuery = query.replace(/[()+\-!{}\[\]^"~*?:\\/]/g, ' ').replace(/\s+/g, ' ').trim()
  const [archive, jamendo] = await Promise.allSettled([archiveSearch(safeQuery), jamendoSearch(query)])
  const results = [
    ...(archive.status === 'fulfilled' ? archive.value : []),
    ...(jamendo.status === 'fulfilled' ? jamendo.value : []),
  ]
  const errors = [archive, jamendo].filter((result) => result.status === 'rejected').length
  if (!results.length && errors === 2) return NextResponse.json({ error: 'Los catálogos no están disponibles en este momento.', code: 'upstream_unavailable' }, { status: 502 })
  // Búsqueda de catálogo público: no depende de la sesión, así que un caché
  // corto es correcto y además protege a Internet Archive de golpes repetidos.
  return NextResponse.json(
    { results, providers: { internetArchive: archive.status === 'fulfilled', jamendo: jamendo.status === 'fulfilled' }, notice: 'Verifica los términos y la licencia de cada obra antes de usarla en proyectos públicos o comerciales.' },
    { headers: { 'Cache-Control': 'public, max-age=60, stale-while-revalidate=300' } },
  )
}
