'use client'

import { useCallback, useEffect, useState } from 'react'
import { Download, Music2, Sparkles, Trash2 } from 'lucide-react'

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

const STATUS_TONE: Record<string, 'cyan' | 'mint' | 'error' | undefined> = {
  queued: undefined,
  generating: 'cyan',
  ready: 'mint',
  error: 'error',
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
            'El acceso a tus datos no está disponible en este entorno. Inténtalo de nuevo en unos minutos.',
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
        <p className="pg-note">
          {state === 'ready' || state === 'empty'
            ? `${songs.length} ${songs.length === 1 ? 'canción' : 'canciones'}`
            : 'Cargando…'}
        </p>
        <button type="button" onClick={retry} className="pg-btn pg-btn-ghost pg-btn-sm">
          Actualizar
        </button>
      </div>

      {notice && (
        <p
          aria-live="polite"
          data-tone="error"
          className="pg-status pg-inset mx-auto text-center text-xs"
        >
          {notice}
        </p>
      )}

      {state === 'loading' && (
        <div className="pg-panel pg-note text-sm p-8">Cargando tus canciones…</div>
      )}

      {state === 'unauthorized' && (
        <div className="pg-notice">
          <h2 className="pg-card-title" data-tone="amber">
            Inicia sesión para ver tu biblioteca
          </h2>
          <p className="pg-prose mt-2">Tus canciones están ligadas a tu cuenta.</p>
          <div className="mt-5 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => {
                window.location.href = '/auth?next=/biblioteca'
              }}
              className="pg-btn pg-btn-primary"
            >
              Iniciar sesión
            </button>
            <a href="/auth?mode=signup&next=/biblioteca" className="pg-btn pg-btn-ghost">
              Crear cuenta gratis
            </a>
          </div>
        </div>
      )}

      {(state === 'unconfigured' || state === 'error') && (
        <div className="pg-panel p-8">
          <h2 className="pg-card-title">
            {state === 'unconfigured' ? 'Servicio sin configurar' : 'No pudimos cargar tu biblioteca'}
          </h2>
          <p className="pg-prose mt-2">{notice ?? 'Intenta otra vez.'}</p>
          <button type="button" onClick={retry} className="pg-btn pg-btn-ghost mt-5">
            Reintentar
          </button>
        </div>
      )}

      {state === 'empty' && (
        <div className="pg-panel border-dashed p-10 text-center">
          <div className="pg-mark mx-auto" data-state="part">
            <Music2 size={20} aria-hidden="true" />
          </div>
          <h2 className="pg-block-title mt-4">Aún no tienes canciones</h2>
          <p className="pg-lede mx-auto mt-2">
            Crea tu primera composición en el estudio. El motor local es gratis y no necesita
            inscripción activa.
          </p>
          <a href="/studio" className="pg-btn pg-btn-primary mt-6">
            Crear mi primera canción <Sparkles size={16} aria-hidden="true" />
          </a>
        </div>
      )}

      {(state === 'ready' || (!needsLogin && songs.length > 0)) && songs.length > 0 && (
        <ul className="flex flex-col gap-3">
          {songs.map((song) => {
            const statusTone = STATUS_TONE[song.status] ?? STATUS_TONE.queued
            const canPlay = Boolean(song.playableUrl) && song.status === 'ready'
            return (
              <li key={song.id} className="pg-panel p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="pg-block-title truncate">{song.title ?? 'Sin título'}</h3>
                    <div className="pg-item-meta mt-2">
                      <span className="pg-pill" data-tone={statusTone}>
                        {STATUS_LABEL[song.status] ?? song.status}
                      </span>
                      <span className="pg-pill">
                        Motor: {song.engine === 'provider' ? 'proveedor' : song.engine === 'local' ? 'local' : song.engine}
                      </span>
                      {song.genre && <span>{song.genre}</span>}
                      {typeof song.tempo === 'number' && <span>{song.tempo} BPM</span>}
                      {typeof song.duration_seconds === 'number' && (
                        <span>{Math.round(song.duration_seconds)} s</span>
                      )}
                    </div>
                    {song.prompt && <p className="pg-note mt-3 line-clamp-2">{song.prompt}</p>}
                    {song.status === 'error' && song.error && (
                      <p className="pg-accent-magenta mt-2 text-xs">{song.error}</p>
                    )}
                    <p className="pg-note mt-2">{formatDate(song.created_at)}</p>
                  </div>

                  <div className="flex shrink-0 items-center gap-2">
                    {canPlay && song.playableUrl && (
                      <a
                        href={song.playableUrl}
                        download
                        aria-label={`Descargar ${song.title ?? 'canción'}`}
                        className="pg-icon-btn"
                      >
                        <Download size={16} />
                      </a>
                    )}
                    <button
                      type="button"
                      onClick={() => removeSong(song)}
                      disabled={deletingId === song.id}
                      aria-label={`Borrar ${song.title ?? 'canción'}`}
                      className="pg-icon-btn"
                      data-tone="danger"
                    >
                      <Trash2 size={16} />
                    </button>
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
                  <p className="pg-note mt-4">
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
