import { NextResponse } from 'next/server'

import { SUPABASE_NOT_CONFIGURED } from '@/lib/supabase/config'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

/** Firmas baratas de caducar: un listado no debe abrir enlaces eternos. */
const SIGNED_URL_TTL_SECONDS = 3600

/**
 * El listado devuelve URLs firmadas: son credenciales temporales de una sola
 * cuenta. Cachearlas es el peor caso posible —otro usuario recibiría un enlace
 * ajeno—, así que `no-store` va en la propia respuesta (ver el motivo en
 * `app/api/progress/route.ts`).
 */
const PRIVATE_HEADERS = { 'Cache-Control': 'private, no-store' } as const

const PAGE_SIZE_MAX = 50

function positiveInt(value: string | null, fallback: number, max: number): number {
  const parsed = Number(value)
  if (!Number.isFinite(parsed) || parsed < 1) return fallback
  return Math.min(max, Math.round(parsed))
}

/**
 * Biblioteca del usuario.
 *
 * El audio propio vive en un bucket privado, así que la lista no puede
 * devolver la ruta de Storage a secas: hay que firmarla. Se agrupa por ruta,
 * una sola llamada de firma por página —`createSignedUrls` es un request—
 * en lugar de una por canción, que con 50 elementos eran 50 viajes al borde.
 *
 * `audio_url` de la fila es la referencia del proveedor y caduca en su CDN; se
 * conserva como último recurso para que una canción antigua no aparezca muerta
 * si todavía no la copiamos a Storage.
 */
export async function GET(request: Request) {
  const supabase = await createClient()
  if (!supabase) return NextResponse.json({ error: SUPABASE_NOT_CONFIGURED, code: 'not_configured' }, { status: 503 })

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Inicia sesión para ver tu biblioteca.', code: 'unauthorized' }, { status: 401 })

  const url = new URL(request.url)
  const take = positiveInt(url.searchParams.get('limit'), 20, PAGE_SIZE_MAX)
  const page = positiveInt(url.searchParams.get('page'), 1, 1000)

  const { data: songs, error, count } = await supabase
    .from('songs')
    .select('id, title, prompt, genre, tempo, engine, status, audio_url, storage_path, duration_seconds, error, lesson_id, created_at', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range((page - 1) * take, page * take - 1)

  if (error) {
    console.error('[songs] listado falló', error.message)
    return NextResponse.json({ error: 'No pudimos cargar tu biblioteca.', code: 'read_failed' }, { status: 500 })
  }

  const paths = (songs ?? []).map((song) => song.storage_path).filter((path): path is string => Boolean(path))

  const signatures = new Map<string, string>()
  if (paths.length) {
    const { data: signed, error: signError } = await supabase.storage
      .from('song-audio')
      .createSignedUrls(paths, SIGNED_URL_TTL_SECONDS)
    if (signError) console.error('[songs] firmas no generadas', signError.message)
    for (const entry of signed ?? []) {
      if (entry.signedUrl && entry.path) signatures.set(entry.path, entry.signedUrl)
    }
  }

  return NextResponse.json(
    {
      songs: (songs ?? []).map((song) => ({
        ...song,
        playableUrl: (song.storage_path ? signatures.get(song.storage_path) : null) ?? song.audio_url ?? null,
      })),
      page,
      perPage: take,
      // `count` llega del propio PostgREST (`count: 'exact'`), así que el total
      // no cuesta un viaje extra. Si algún día viniera nulo, mejor decirlo con
      // `null` que inventar el tamaño de la biblioteca del usuario.
      total: count ?? null,
      totalPages: count === null || count === undefined ? null : Math.max(1, Math.ceil(count / take)),
      signedUrlsExpireIn: SIGNED_URL_TTL_SECONDS,
    },
    { headers: PRIVATE_HEADERS },
  )
}

/**
 * Borra una canción y su audio.
 *
 * Se pasa primero el objeto de Storage: si la fila se borrara antes y la
 * subida quedara huérfana, nadie sabría jamás qué archivo ocupar ese espacio.
 * Un objeto que no existe (400 / not_found) no impide borrar la fila.
 */
export async function DELETE(request: Request) {
  const supabase = await createClient()
  if (!supabase) return NextResponse.json({ error: SUPABASE_NOT_CONFIGURED, code: 'not_configured' }, { status: 503 })

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Inicia sesión para borrar.', code: 'unauthorized' }, { status: 401 })

  const url = new URL(request.url)
  const body = (await request.json().catch(() => null)) as { songId?: unknown } | null
  const songId = String(body?.songId ?? url.searchParams.get('songId') ?? '')

  if (!/^[0-9a-f-]{36}$/i.test(songId)) {
    return NextResponse.json({ error: 'Identificador de canción inválido.', code: 'invalid_request' }, { status: 400 })
  }

  const { data: song } = await supabase.from('songs').select('id, storage_path').eq('id', songId).maybeSingle()
  if (!song) return NextResponse.json({ error: 'Esa canción no está en tu biblioteca.', code: 'not_found' }, { status: 404 })

  if (song.storage_path) {
    const { error: removeError } = await supabase.storage.from('song-audio').remove([song.storage_path])
    if (removeError) console.error('[songs] audio huérfano tras el borrado', removeError.message)
  }

  const { error } = await supabase.from('songs').delete().eq('id', songId)
  if (error) {
    console.error('[songs] borrado falló', error.message)
    return NextResponse.json({ error: 'No pudimos borrar la canción.', code: 'delete_failed' }, { status: 500 })
  }

  return NextResponse.json({ deleted: songId })
}
