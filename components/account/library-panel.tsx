'use client'

import { useCallback, useEffect, useState } from 'react'
import { Download, Music2, Sparkles, Trash2 } from 'lucide-react'

import { Button } from '@/components/ui/button'

/**
 * Espejo de lo que devuelve `GET /api/songs`. `playableUrl` ya viene firmada
 * por Storage (o el `audio_url` del proveedor como último recurso); puede ser
 * null si la firma falló o el audio aún no existe.
 */
interface Song {
  id: string
  title: string | null
  prompt: string | null
  genre: string | null
  tempo: number | null
  engine: string
  status: string
  audio_url: string | null
  storage_path: string | null
  duration_seconds: number | null
  error: string | null
  lesson_id: string | null
  created_at: string
  playableUrl: string | null
}

type LoadState = 'loading' | 'ready' | 'empty' | 'unauthorized' | 'unconfigured' | 'error'

const STATUS_LABEL: Record<string, string> = {
  queued: 'En cola',
  generating: 'Generando',
  ready: 'Lista',
  error: 'Error',
}

const STATUS_STYLE: Record<string, string> = {
  queued: 'bg-white/10 text-[#a9c0ca]',
  generating: 'bg-[#75e9f2]/15 text-[#8cecf3]',
  ready: 'bg-[#83d7b4]/15 text-[#83d7b4]',
  error: 'bg-destructive/15 text-[#ffb1ed]',
}

function formatDate(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return new Intl.DateTimeFormat('es-MX', { dateStyle: 'medium', timeStyle: 'short' }).format(date)
}

export function LibraryPanel() {
  const [state, setState] = useState<LoadState>('loading')
  const [notice, setNotice] = useState<string | null>(null)
  const [songs, setSongs] = useState<Song[]>([])
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const load = useCallback(async () => {
    setState('loading')
    setNotice(null)
    try {
      const response = await fetch('/api/songs', { cache: 'no-store' })
      const payload = (await response.json().catch(() => null)) as
        | { songs?: Song[]; error?: string }
        | null

      if (response.ok) {
        const list = Array.isArray(payload?.songs) ? payload.songs : []
        setSongs(list)
        setState(list.length === 0 ? 'empty' : 'ready')
        return
      }
      if (response.status === 401) {
        setNotice(payload?.error ?? 'Inicia sesión para ver tu biblioteca.')
        setState('unauthorized')
        return
      }
      if (response.status === 503) {
        setNotice(
          payload?.error ??
            'Falta la configuración de Supabase en este entorno (NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY).',
        )
        setState('unconfigured')
        return
      }
      setNotice(payload?.error ?? 'No pudimos cargar tu biblioteca.')
      setState('error')
    } catch {
      setNotice('Se perdió la conexión al cargar tu biblioteca.')
      setState('error')
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  async function removeSong(song: Song) {
    const label = song.title ?? 'esta canción'
    if (!window.confirm(`¿Seguro que quieres borrar "${label}"? Esta acción no se puede deshacer.`)) {
      return
    }
    setDeletingId(song.id)
    setNotice(null)
    try {
      const response = await fetch('/api/songs', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ songId: song.id }),
      })
      const payload = (await response.json().catch(() => null)) as
        | { deleted?: string; error?: string }
        | null
      if (response.ok && payload?.deleted) {
        const next = songs.filter((item) => item.id !== song.id)
        setSongs(next)
        setState(next.length === 0 ? 'empty' : 'ready')
      } else {
        setNotice(payload?.error ?? 'No pudimos borrar la canción.')
      }
    } catch {
      setNotice('Se cortó la conexión al borrar. Revisa tu red.')
    } finally {
      setDeletingId(null)
    }
  }

  function retry() {
    void load()
  }

  const needsLogin =
    state === 'loading' ||
    state === 'unauthorized' ||
    state === 'unconfigured' ||
    state === 'error'

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-[#8fa9b5]">
          {state === 'ready' || state === 'empty'
            ? `${songs.length} ${songs.length === 1 ? 'canción' : 'canciones'}`
            : 'Cargando…'}
        </p>
        <Button
          variant="outline"
          onClick={retry}
          className="rounded-full border-white/15 text-[#c4d8df] hover:bg-white/5"
        >
          Actualizar
        </Button>
      </div>

      {notice && (
        <p
          aria-live="polite"
          className="rounded-2xl border border-[#ffcf72]/25 bg-[#ffcf72]/5 p-3 text-center text-xs text-[#ffcf72]"
        >
          {notice}
        </p>
      )}

      {state === 'loading' && (
        <div className="rounded-3xl border border-white/10 bg-white/[.035] p-8 text-sm text-[#8fa9b5]">
          Cargando tus canciones…
        </div>
      )}

      {state === 'unauthorized' && (
        <div className="rounded-3xl border border-[#ffcf72]/25 bg-[#ffcf72]/5 p-8">
          <h2 className="text-lg font-semibold text-[#ffcf72]">Inicia sesión para ver tu biblioteca</h2>
          <p className="mt-2 text-sm text-[#c4d8df]">Tus canciones están ligadas a tu cuenta.</p>
          <Button
            onClick={() => {
              window.location.href = '/auth?next=/biblioteca'
            }}
            className="mt-5 rounded-full bg-[#75e9f2] px-5 font-semibold text-[#06131e] hover:bg-[#a0f4f9]"
          >
            Iniciar sesión
          </Button>
        </div>
      )}

      {(state === 'unconfigured' || state === 'error') && (
        <div className="rounded-3xl border border-white/10 bg-white/[.035] p-8">
          <h2 className="text-lg font-semibold">
            {state === 'unconfigured' ? 'Servicio sin configurar' : 'No pudimos cargar tu biblioteca'}
          </h2>
          <p className="mt-2 text-sm leading-6 text-[#c4d8df]">{notice ?? 'Intenta otra vez.'}</p>
          <Button
            variant="outline"
            onClick={retry}
            className="mt-5 rounded-full border-white/15 text-[#c4d8df]"
          >
            Reintentar
          </Button>
        </div>
      )}

      {state === 'empty' && (
        <div className="rounded-3xl border border-dashed border-[#75e9f2]/30 bg-[#0c2432]/60 p-10 text-center">
          <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-[#75e9f2]/15 text-[#75e9f2]">
            <Music2 />
          </div>
          <h2 className="mt-4 text-xl font-semibold">Aún no tienes canciones</h2>
          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[#9fb8c7]">
            Crea tu primera composición en el estudio. El motor local es gratis y no necesita
            inscripción activa.
          </p>
          <a
            href="/studio"
            className="mt-6 inline-flex items-center gap-2 rounded-full bg-[#75e9f2] px-6 py-3 font-semibold text-[#06131e] transition hover:bg-[#a0f4f9] focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-[#75e9f2]/50"
          >
            Crear mi primera canción <Sparkles size={16} />
          </a>
        </div>
      )}

      {(state === 'ready' || (!needsLogin && songs.length > 0)) && songs.length > 0 && (
        <ul className="flex flex-col gap-3">
          {songs.map((song) => {
            const statusStyle = STATUS_STYLE[song.status] ?? STATUS_STYLE.queued
            const canPlay = Boolean(song.playableUrl) && song.status === 'ready'
            return (
              <li
                key={song.id}
                className="rounded-2xl border border-white/10 bg-white/[.035] p-5"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="truncate text-base font-medium">
                      {song.title ?? 'Sin título'}
                    </h3>
                    <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px]">
                      <span className={`rounded-full px-2.5 py-1 ${statusStyle}`}>
                        {STATUS_LABEL[song.status] ?? song.status}
                      </span>
                      <span className="rounded-full bg-white/10 px-2.5 py-1 text-[#a9c0ca]">
                        Motor: {song.engine === 'provider' ? 'proveedor' : song.engine === 'local' ? 'local' : song.engine}
                      </span>
                      {song.genre && (
                        <span className="text-[#7f9aa7]">{song.genre}</span>
                      )}
                      {typeof song.tempo === 'number' && (
                        <span className="text-[#7f9aa7]">{song.tempo} BPM</span>
                      )}
                      {typeof song.duration_seconds === 'number' && (
                        <span className="text-[#7f9aa7]">
                          {Math.round(song.duration_seconds)} s
                        </span>
                      )}
                    </div>
                    {song.prompt && (
                      <p className="mt-3 line-clamp-2 text-xs leading-5 text-[#829ca8]">
                        {song.prompt}
                      </p>
                    )}
                    {song.status === 'error' && song.error && (
                      <p className="mt-2 text-xs text-[#ffb1ed]">{song.error}</p>
                    )}
                    <p className="mt-2 text-[10px] text-[#6f8995]">{formatDate(song.created_at)}</p>
                  </div>

                  <div className="flex shrink-0 items-center gap-2">
                    {canPlay && song.playableUrl && (
                      <a
                        href={song.playableUrl}
                        download
                        aria-label={`Descargar ${song.title ?? 'canción'}`}
                        className="inline-flex size-9 items-center justify-center rounded-full border border-white/15 text-[#c4d8df] transition hover:bg-white/5 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-[#75e9f2]/50"
                      >
                        <Download size={16} />
                      </a>
                    )}
                    <Button
                      variant="destructive"
                      onClick={() => removeSong(song)}
                      disabled={deletingId === song.id}
                      aria-label={`Borrar ${song.title ?? 'canción'}`}
                      className="inline-flex size-9 items-center justify-center rounded-full p-0"
                    >
                      <Trash2 size={16} />
                    </Button>
                  </div>
                </div>

                {canPlay && song.playableUrl ? (
                  <audio
                    controls
                    src={song.playableUrl}
                    preload="none"
                    aria-label={`Reproducir ${song.title ?? 'canción'}`}
                    className="mt-4 w-full"
                  />
                ) : (
                  <p className="mt-4 text-xs text-[#7f9aa7]">
                    {song.status === 'ready'
                      ? 'El audio todavía no tiene un enlace reproducible.'
                      : 'El audio estará disponible cuando la generación termine.'}
                  </p>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
