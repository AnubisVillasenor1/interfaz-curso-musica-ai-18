import { NextResponse } from 'next/server'

import { ipOf, rateLimitPublic } from '@/lib/rate-limit'

type MusicResult = { id: string; title: string; creator: string; source: string; license?: string; url: string }

/**
 * Lo que devuelve un catálogo: su página de resultados y, cuando el proveedor
 * lo informa, el tamaño real del conjunto.
 *
 * `total` puede ser `null` y así se documenta: Jamendo contesta una lista sin
 * recuento en esta versión de su API, e inventar un número para que la
 * respuesta "se vea completa" sería exactamente el tipo de dato que un agente
 * consume como verdad.
 */
type CatalogPage = { items: MusicResult[]; total: number | null }

const DEFAULT_LIMIT = 24
const MAX_LIMIT = 48
const START_PAGE = 1

async function json(url: URL, headers: HeadersInit = {}) {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 7000)
  try {
    const response = await fetch(url, { headers, signal: controller.signal, next: { revalidate: 3600 } })
    if (!response.ok) throw new Error(`Catalog returned ${response.status}`)
    return await response.json()
  } finally { clearTimeout(timeout) }
}

/** Entero positivo dentro de un rango; lo demás vuelve al default. */
function intParam(raw: string | null, fallback: number, max: number): number {
  const parsed = Number(raw)
  if (!Number.isFinite(parsed) || parsed < 1) return fallback
  return Math.min(max, Math.round(parsed))
}

async function archiveSearch(query: string, take: number, page: number): Promise<CatalogPage> {
  const url = new URL('https://archive.org/advancedsearch.php')
  url.searchParams.set('q', `(${query}) AND mediatype:audio`)
  url.searchParams.set('fl[]', 'identifier,title,creator,licenseurl,mediatype')
  // Internet Archive pagina por número de página, no por desplazamiento.
  url.searchParams.set('page', String(page))
  url.searchParams.set('rows', String(take))
  url.searchParams.set('output', 'json')
  const data = await json(url) as {
    response?: { numFound?: unknown; docs?: Record<string, unknown>[] }
  }
  const numFound = data.response?.numFound
  return {
    items: (data.response?.docs ?? []).map((item) => {
      const id = String(item.identifier ?? '')
      return { id: `ia-${id}`, title: String(item.title ?? id), creator: String(item.creator ?? 'Internet Archive'), source: 'Internet Archive', license: String(item.licenseurl ?? 'Consulta la licencia del elemento antes de reutilizarlo.'), url: `https://archive.org/details/${encodeURIComponent(id)}` }
    }).filter((item) => item.id !== 'ia-'),
    total: typeof numFound === 'number' && Number.isFinite(numFound) ? numFound : null,
  }
}

async function jamendoSearch(query: string, take: number, page: number): Promise<CatalogPage> {
  const clientId = process.env.JAMENDO_CLIENT_ID
  // Sin cliente configurado el catálogo simplemente no participa: `total` sigue
  // siendo null y `providers.jamendo` le dice al consumidor por qué hay huecos.
  if (!clientId) return { items: [], total: null }
  const url = new URL('https://api.jamendo.com/v3.0/tracks/')
  url.searchParams.set('client_id', clientId)
  url.searchParams.set('format', 'json')
  url.searchParams.set('limit', String(take))
  url.searchParams.set('offset', String((page - 1) * take))
  url.searchParams.set('search', query)
  url.searchParams.set('include', 'licenses')
  const data = await json(url) as { results?: { id: string; name: string; artist_name: string; shareurl: string; license_ccurl?: string }[] }
  return {
    items: (data.results ?? []).map((item) => ({ id: `jamendo-${item.id}`, title: item.name, creator: item.artist_name, source: 'Jamendo', license: item.license_ccurl || 'Consulta la página del artista.', url: item.shareurl })),
    total: null,
  }
}

/**
 * Catálogo abierto para las recetas del curso y el estudio.
 *
 * Dos proveedores en paralelo, cada uno con su mitad del `limit` pedido. La
 * respuesta es paginada a propósito (`page`/`limit` + `total` por catálogo)
 * para que un cliente pueda recorrer más resultados sin suponer que los 24
 * iniciales son todo lo que existe.
 */
export async function GET(request: Request) {
  if (!rateLimitPublic(`search:${ipOf(request)}`, 30)) {
    return NextResponse.json({ error: 'Demasiadas búsquedas. Espera un momento.', code: 'rate_limited' }, { status: 429, headers: { 'Retry-After': '60' } })
  }
  const params = new URL(request.url).searchParams
  const query = params.get('q')?.trim() ?? ''
  if (query.length < 2) return NextResponse.json({ error: 'La búsqueda debe tener al menos 2 caracteres.', code: 'query_too_short' }, { status: 400 })
  if (query.length > 100) return NextResponse.json({ error: 'La búsqueda no puede superar 100 caracteres.', code: 'query_too_long' }, { status: 400 })

  const limit = intParam(params.get('limit'), DEFAULT_LIMIT, MAX_LIMIT)
  const page = intParam(params.get('page'), START_PAGE, 50)
  const perProvider = Math.max(1, Math.ceil(limit / 2))

  const safeQuery = query.replace(/[()+\-!{}\[\]^"~*?:\\/]/g, ' ').replace(/\s+/g, ' ').trim()
  const [archive, jamendo] = await Promise.allSettled([
    archiveSearch(safeQuery, perProvider, page),
    jamendoSearch(query, perProvider, page),
  ])
  const archivePage = archive.status === 'fulfilled' ? archive.value : { items: [], total: null }
  const jamendoPage = jamendo.status === 'fulfilled' ? jamendo.value : { items: [], total: null }
  const results = [...archivePage.items, ...jamendoPage.items]
  const failed = [archive, jamendo].filter((result) => result.status === 'rejected').length
  if (!results.length && failed === 2) return NextResponse.json({ error: 'Los catálogos no están disponibles en este momento.', code: 'upstream_unavailable' }, { status: 502 })
  // Búsqueda de catálogo público: no depende de la sesión, así que un caché
  // corto es correcto y además protege a Internet Archive de golpes repetidos.
  return NextResponse.json(
    {
      results,
      page,
      limit,
      // null = ese catálogo no informa su tamaño; no es un cero.
      total: { internetArchive: archivePage.total, jamendo: jamendoPage.total },
      providers: { internetArchive: archive.status === 'fulfilled', jamendo: jamendo.status === 'fulfilled' },
      notice: 'Verifica los términos y la licencia de cada obra antes de usarla en proyectos públicos o comerciales.',
    },
    { headers: { 'Cache-Control': 'public, max-age=60, stale-while-revalidate=300' } },
  )
}
