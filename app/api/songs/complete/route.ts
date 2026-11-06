import { NextResponse } from 'next/server'

import { SUPABASE_NOT_CONFIGURED } from '@/lib/supabase/config'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

/** Un render local de 3-4 minutos no pasa de esto en WAV; 25 MB es el techo del bucket. */
const MAX_BYTES = 25 * 1024 * 1024

/** Un día basta para escuchar; la biblioteca renueva la firma en cada listado. */
const SIGNED_URL_TTL_SECONDS = 3600

/** Datos de una sola cuenta, con URL firmada incluida: nada intermedio debe guardarlo. */
const PRIVATE_HEADERS = { 'Cache-Control': 'private, no-store' } as const

const ALLOWED_TYPES: Record<string, string> = {
  'audio/mpeg': 'mp3',
  'audio/wav': 'wav',
  'audio/x-wav': 'wav',
  'audio/ogg': 'ogg',
  'audio/mp4': 'm4a',
}

/**
 * Extensión derivada del MIME declarado. Si no coincide con los tipos que
 * acepta el bucket se rechaza antes de subir: un archivo disfrazado ocuparía
 * espacio en la carpeta de un usuario sin reproducirse nunca.
 */
function extensionFor(type: string): string | null {
  return ALLOWED_TYPES[type] ?? null
}

/**
 * Cierre del círculo del motor local.
 *
 * `/api/generate` con `engine: 'local'` devuelve una receta; el navegador la
 * renderiza con Tone.js y sube el resultado aquí. Sin esta ruta los 1.700
 * líneas del motor propio no llegaban a ningún sitio: el arreglo se reproducía
 * en vivo y se perdía al cerrar la pestaña, así que "crear música gratis"
 * terminaba en una biblioteca vacía.
 *
 * La subida la hace el cliente con la sesión del usuario, no con
 * `service_role`: la política de Storage exige que la ruta empiece por su
 * propio UUID, y esa es exactamente la comprobación que queremos que siga
 * valiendo.
 */
export async function POST(request: Request) {
  const supabase = await createClient()
  if (!supabase) return NextResponse.json({ error: SUPABASE_NOT_CONFIGURED, code: 'not_configured' }, { status: 503 })

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Inicia sesión para guardar tu canción.', code: 'unauthorized' }, { status: 401 })

  const form = await request.formData().catch(() => null)
  if (!form) return NextResponse.json({ error: 'Envía el audio como multipart.', code: 'invalid_request' }, { status: 400 })

  const songId = String(form.get('songId') ?? '')
  if (!/^[0-9a-f-]{36}$/i.test(songId)) {
    return NextResponse.json({ error: 'Identificador de canción inválido.', code: 'invalid_request' }, { status: 400 })
  }

  const file = form.get('audio')
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'Falta el archivo de audio.', code: 'missing_audio' }, { status: 400 })
  }
  if (file.size === 0) return NextResponse.json({ error: 'El audio llegó vacío.', code: 'empty_audio' }, { status: 400 })
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: 'El audio supera el límite de 25 MB.', code: 'audio_too_large', limit: 26214400 }, { status: 413 })
  }

  const extension = extensionFor(file.type)
  if (!extension) {
    return NextResponse.json({ error: `Formato no admitido: ${file.type || 'desconocido'}.`, code: 'unsupported_media_type', allowed: Object.keys(ALLOWED_TYPES) }, { status: 415 })
  }

  // La fila tiene que existir y ser del usuario. Se consulta con su propio
  // cliente: RLS ya filtra por dueño, así que un songId ajeno devuelve null.
  // También se filtra por user_id en el código (defensa en profundidad).
  const { data: song } = await supabase
    .from('songs')
    .select('id, status, engine')
    .eq('id', songId)
    .eq('user_id', user.id)
    .maybeSingle()

  if (!song) return NextResponse.json({ error: 'Esa canción no existe en tu biblioteca.', code: 'not_found' }, { status: 404 })
  if (song.engine !== 'local') {
    // El audio del proveedor llega por su callback; subirlo por aquí permitiría
    // pisar el resultado de una tarea que aún está en curso.
    return NextResponse.json({ error: 'Esa canción pertenece al estudio con voces.', code: 'engine_mismatch' }, { status: 409 })
  }
  if (song.status === 'ready') {
    return NextResponse.json({ error: 'La canción ya está guardada.', code: 'already_ready' }, { status: 409 })
  }
  if (song.status === 'error') {
    return NextResponse.json({ error: 'El proyecto quedó en error; créalo de nuevo.', code: 'needs_recreate' }, { status: 409 })
  }

  const path = `${user.id}/${songId}.${extension}`
  const { error: uploadError } = await supabase.storage.from('song-audio').upload(path, file, {
    contentType: file.type,
    upsert: true,
  })

  if (uploadError) {
    console.error('[songs/complete] subida rechazada', uploadError.message)
    return NextResponse.json(
      { error: 'No pudimos guardar tu audio. Inténtalo otra vez.', code: 'storage_error' },
      { status: 502 },
    )
  }

  // Firma corta para que suene ahora mismo; `/api/songs` la renueva en cada
  // listado. Lo que queda permanente en la fila es `storage_path`.
  const { data: signed } = await supabase.storage.from('song-audio').createSignedUrl(path, SIGNED_URL_TTL_SECONDS)

  // Duración validada como en el callback del proveedor (finite, >0, <1h):
  // sin esto, -5, 1e20 o Infinity quedaban persistidos en la fila.
  const rawDuration = Number(form.get('duration'))
  const duration = Number.isFinite(rawDuration) && rawDuration > 0 && rawDuration < 3600 ? Math.round(rawDuration * 100) / 100 : null

  const updated = await supabase
    .from('songs')
    .update({ storage_path: path, duration_seconds: duration })
    .eq('id', songId)
    .eq('user_id', user.id)

  // Si la fila no se actualizó, la canción no debe marcarse lista: marcarla
  // dejaba una fila `ready` sin storage_path reproductible y sin forma de
  // reintentar desde la biblioteca. 500 para que el cliente reintente.
  if (updated.error) {
    console.error('[songs/complete] no se guardó la ruta', updated.error.message)
    return NextResponse.json(
      { error: 'El audio quedó guardado pero no pudimos registrarlo; inténtalo otra vez.', code: 'update_failed' },
      { status: 500 },
    )
  }

  const marked = await supabase.rpc('mark_song_ready', {
    p_song_id: songId,
    p_audio_url: signed?.signedUrl ?? null,
  })

  if (marked.error) {
    console.error('[songs/complete] mark_song_ready falló', marked.error.message)
    return NextResponse.json(
      { error: 'El audio quedó guardado pero no pudimos marcar la canción; refléjala desde la biblioteca.', code: 'update_failed' },
      { status: 500 },
    )
  }

  return NextResponse.json(
    {
      songId,
      storagePath: path,
      audioUrl: signed?.signedUrl ?? null,
      expiresAt: Math.floor(Date.now() / 1000) + SIGNED_URL_TTL_SECONDS,
    },
    { headers: PRIVATE_HEADERS },
  )
}
