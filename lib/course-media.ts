import type { Lesson } from '@/lib/course'

export type CourseMediaAsset = {
  title: string
  creator: string
  kind: 'audio' | 'video'
  url: string
  pageUrl: string
  licenseUrl: string
  licenseLabel: string
  provider: string
  relevance: 'topic' | 'general'
}

export type LessonMediaCollection = { audio: CourseMediaAsset | null; video: CourseMediaAsset | null }

type OpenverseAudio = {
  title?: unknown
  creator?: unknown
  url?: unknown
  foreign_landing_url?: unknown
  license_url?: unknown
  license?: unknown
  license_version?: unknown
  filesize?: unknown
  filetype?: unknown
  source?: unknown
}
type CommonsPage = {
  title?: unknown
  imageinfo?: Array<{
    url?: unknown
    mime?: unknown
    size?: unknown
    extmetadata?: {
      LicenseUrl?: { value?: unknown }
      LicenseShortName?: { value?: unknown }
      Artist?: { value?: unknown }
    }
  }>
}

const OPENVERSE_AUDIO = 'https://api.openverse.org/v1/audio/'
const WIKIMEDIA_API = 'https://commons.wikimedia.org/w/api.php'
const MAX_AUDIO_BYTES = 20_000_000
const MAX_VIDEO_BYTES = 100_000_000

function allowedLicense(value: unknown): { url: string; label: string } | null {
  if (typeof value !== 'string') return null
  const url = value.trim()
  let parsedUrl: URL
  try {
    parsedUrl = new URL(url)
  } catch {
    return null
  }
  if (parsedUrl.hostname !== 'creativecommons.org') return null
  if (/\/publicdomain\/(?:zero|mark)\/1\.0/i.test(parsedUrl.pathname)) return { url, label: 'Dominio público / CC0' }
  const match = parsedUrl.pathname.match(/\/licenses\/(by-sa|by)\/(2\.0|3\.0|4\.0)\/?$/i)
  if (match) return { url, label: `Creative Commons ${match[1].toUpperCase()} ${match[2]}` }
  return null
}

function cleanTerms(input: string) {
  return input.replace(/[^\p{L}\p{N}\s-]/gu, ' ').replace(/\s+/g, ' ').trim().slice(0, 140)
}

async function requestJson<T>(url: URL): Promise<T> {
  const response = await fetch(url, { signal: AbortSignal.timeout(4_500), next: { revalidate: 86_400 } })
  if (!response.ok) throw new Error(`Open media catalog returned ${response.status}`)
  return response.json() as Promise<T>
}

function secureUrl(value: unknown) {
  if (typeof value !== 'string') return null
  try {
    const url = new URL(value)
    return url.protocol === 'https:' && !url.username && !url.password ? url.toString() : null
  } catch {
    return null
  }
}

function plainText(value: unknown, fallback: string) {
  if (typeof value !== 'string') return fallback
  return value.replace(/<[^>]*>/g, ' ').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/\s+/g, ' ').trim().slice(0, 180) || fallback
}

async function searchAudio(query: string): Promise<CourseMediaAsset | null> {
  const topic = cleanTerms(query)
  if (topic.length < 3) return null
  const searches: Array<{ query: string; relevance: 'topic' | 'general' }> = [
    { query: topic, relevance: 'topic' },
    { query: 'music', relevance: 'general' },
  ]

  for (const search of searches) {
    try {
      const url = new URL(OPENVERSE_AUDIO)
      url.searchParams.set('q', search.query)
      url.searchParams.set('license', 'cc0,by,by-sa')
      url.searchParams.set('extension', 'mp3,ogg,wav,flac')
      url.searchParams.set('page_size', '8')
      url.searchParams.set('filter_dead', 'true')
      url.searchParams.set('mature', 'false')
      const data = await requestJson<{ results?: OpenverseAudio[] }>(url)
      for (const result of data.results ?? []) {
        const audioUrl = secureUrl(result.url)
        const pageUrl = secureUrl(result.foreign_landing_url)
        const license = allowedLicense(result.license_url)
        const fileSize = Number(result.filesize)
        const fileType = typeof result.filetype === 'string' ? result.filetype.toLowerCase() : ''
        if (!audioUrl || !pageUrl || !license || !['mp3', 'ogg', 'wav', 'flac'].includes(fileType) || !Number.isFinite(fileSize) || fileSize <= 0 || fileSize > MAX_AUDIO_BYTES) continue
        return {
          title: plainText(result.title, 'Audio con licencia abierta'),
          creator: plainText(result.creator, 'Autoría indicada en Openverse'),
          kind: 'audio',
          url: audioUrl,
          pageUrl,
          licenseUrl: license.url,
          licenseLabel: license.label,
          provider: `Openverse · ${plainText(result.source, 'catálogo abierto')}`,
          relevance: search.relevance,
        }
      }
    } catch {
      continue
    }
  }
  return null
}

async function searchVideo(query: string): Promise<CourseMediaAsset | null> {
  const topic = cleanTerms(query)
  if (topic.length < 3) return null
  const searches: Array<{ query: string; relevance: 'topic' | 'general' }> = [
    { query: topic, relevance: 'topic' },
    { query: 'music production', relevance: 'general' },
  ]

  for (const search of searches) {
    try {
      const url = new URL(WIKIMEDIA_API)
      url.searchParams.set('action', 'query')
      url.searchParams.set('format', 'json')
      url.searchParams.set('generator', 'search')
      url.searchParams.set('gsrnamespace', '6')
      url.searchParams.set('gsrlimit', '50')
      url.searchParams.set('gsrsearch', `${search.query} filetype:video`)
      url.searchParams.set('prop', 'imageinfo')
      url.searchParams.set('iiprop', 'url|size|mime|extmetadata')
      url.searchParams.set('iiextmetadatafilter', 'LicenseShortName|LicenseUrl|Artist')
      const data = await requestJson<{ query?: { pages?: CommonsPage[] | Record<string, CommonsPage> } }>(url)
      const pages = Array.isArray(data.query?.pages) ? data.query.pages : Object.values(data.query?.pages ?? {})
      for (const page of pages) {
        const info = page.imageinfo?.[0]
        const videoUrl = secureUrl(info?.url)
        const license = allowedLicense(info?.extmetadata?.LicenseUrl?.value)
        const bytes = Number(info?.size)
        const mime = typeof info?.mime === 'string' ? info.mime.toLowerCase() : ''
        if (!videoUrl || !license || !Number.isFinite(bytes) || bytes <= 0 || bytes > MAX_VIDEO_BYTES || !(mime.startsWith('video/') || mime === 'application/ogg')) continue
        const title = plainText(page.title, 'Video abierto').replace(/^File:/i, '').replace(/\.(?:webm|ogv|ogg|mp4)$/i, '')
        const pageUrl = `https://commons.wikimedia.org/wiki/${encodeURI(String(page.title ?? '').replace(/ /g, '_'))}`
        return {
          title,
          creator: plainText(info?.extmetadata?.Artist?.value, 'Autoría indicada en Wikimedia Commons'),
          kind: 'video',
          url: videoUrl,
          pageUrl,
          licenseUrl: license.url,
          licenseLabel: license.label,
          provider: 'Wikimedia Commons',
          relevance: search.relevance,
        }
      }
    } catch {
      continue
    }
  }
  return null
}

export async function getLessonMedia(lesson: Lesson): Promise<LessonMediaCollection> {
  const query = lesson.listening.map((reference) => `${reference.title} ${reference.focus}`).join(' ')
  const [audio, video] = await Promise.all([searchAudio(query), searchVideo(query)])
  return { audio, video }
}
