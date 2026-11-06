'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { Trophy } from 'lucide-react'

import { COURSE_BADGES, COURSE_TOTAL_LESSONS } from '@/lib/course'
import { cn } from '@/lib/utils'

/**
 * Estado de progreso que consume la UI del curso.
 *
 * La única fuente es `GET /api/progress`, que responde
 * `{ completed: [{ lessonId, at }], badges: [{ code, earnedAt }], total }`
 * y `401` sin sesión o `503` sin Supabase configurado. Ningún valor de esa
 * respuesta es obligatorio para pintar la pantalla: sin sesión se muestra 0 y
 * la invitación a entrar, nunca una página rota.
 */
export interface CourseProgress {
  /** Identificadores de lección ya marcados (`m01-l01` … `m05-l16`). */
  completed: string[]
  done: number
  total: number
  percent: number
  /** Códigos de insignia ganados, tal como los guarda `public.badges`. */
  badges: string[]
  signedIn: boolean
  loading: boolean
  error: string | null
}

const EMPTY: CourseProgress = {
  completed: [],
  done: 0,
  total: COURSE_TOTAL_LESSONS,
  percent: 0,
  badges: [],
  signedIn: false,
  loading: true,
  error: null,
}

function fromCompleted(completed: string[], badges: string[], total: number): CourseProgress {
  const safeTotal = typeof total === 'number' && total > 0 ? total : COURSE_TOTAL_LESSONS
  const done = Math.min(completed.length, safeTotal)
  return {
    completed,
    done,
    total: safeTotal,
    percent: Math.round((done / safeTotal) * 100),
    badges,
    signedIn: true,
    loading: false,
    error: null,
  }
}

/**
 * Lee el progreso del usuario conectado.
 *
 * `enabled` permite que un componente reciba el estado ya resuelto por un
 * padre (lección) sin disparar una segunda petición. El hook se llama siempre
 * sin condiciones; solo el efecto se salta.
 */
export function useCourseProgress(enabled = true) {
  const [progress, setProgress] = useState<CourseProgress>(EMPTY)

  const load = useCallback(() => {
    let active = true
    setProgress((current) => ({ ...current, loading: true }))

    fetch('/api/progress', { method: 'GET', cache: 'no-store' })
      .then(async (response) => {
        if (!active) return
        // 401/503 son estados esperados: sin sesión hay que pintar 0, no error.
        if (response.status === 401 || response.status === 503) {
          setProgress({ ...EMPTY, loading: false })
          return
        }
        if (!response.ok) {
          setProgress({ ...EMPTY, loading: false, error: 'No pudimos cargar tu progreso.' })
          return
        }
        const data = (await response.json().catch(() => null)) as {
          completed?: { lessonId?: unknown }[]
          badges?: { code?: unknown }[]
          total?: number
        } | null

        const completed = (data?.completed ?? [])
          .map((row) => (typeof row?.lessonId === 'string' ? row.lessonId : ''))
          .filter(Boolean)
        const badges = (data?.badges ?? [])
          .map((row) => (typeof row?.code === 'string' ? row.code : ''))
          .filter(Boolean)

        setProgress(fromCompleted(completed, badges, data?.total ?? COURSE_TOTAL_LESSONS))
      })
      .catch(() => {
        if (active) setProgress({ ...EMPTY, loading: false, error: 'No pudimos cargar tu progreso.' })
      })

    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    if (!enabled) return
    return load()
  }, [enabled, load])

  /**
   * Aplica en memoria la respuesta de `POST /api/progress`
   * (`lessons_done`, `lessons_total`, `percent`, `badges`) sin recargar.
   */
  const applyCompletion = useCallback(
    (result: { lessons_done: number; lessons_total: number; percent: number; badges: string[] }, lessonId?: string) => {
      setProgress((current) => {
        const completed = lessonId && !current.completed.includes(lessonId) ? [...current.completed, lessonId] : current.completed
        const total = result.lessons_total > 0 ? result.lessons_total : current.total
        const done = Math.min(Math.max(result.lessons_done, completed.length), total)
        return {
          completed,
          done,
          total,
          percent: Number.isFinite(result.percent) ? Math.round(result.percent) : Math.round((done / total) * 100),
          badges: Array.from(new Set([...current.badges, ...result.badges])),
          signedIn: true,
          loading: false,
          error: null,
        }
      })
    },
    [],
  )

  return { progress, reload: load, applyCompletion }
}

export const focusRing =
  'outline-none focus-visible:ring-2 focus-visible:ring-[#75e9f2] focus-visible:ring-offset-2 focus-visible:ring-offset-[#07121f]'

/**
 * Barra de progreso global. Sin props hace su propia lectura de
 * `GET /api/progress`; con `progress` controlado reutiliza el estado del padre.
 */
export function ProgressBar({
  progress,
  label = 'Progreso del curso',
  className,
  signInHint = true,
}: {
  progress?: CourseProgress
  label?: string
  className?: string
  signInHint?: boolean
}) {
  const fetched = useCourseProgress(progress === undefined)
  const state = progress ?? fetched.progress

  const total = state.total || COURSE_TOTAL_LESSONS
  const percent = Math.min(100, Math.max(0, state.percent || Math.round((state.done / total) * 100)))

  return (
    <div className={cn('rounded-2xl border border-white/10 bg-white/[.035] p-4 sm:p-5', className)}>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-[10px] font-semibold uppercase tracking-[.24em] text-[#75e9f2]">{label}</p>
        <p className="text-xs text-[#a9c0ca]">
          {state.signedIn
            ? `${state.done} de ${total} lecciones · ${percent}%`
            : `0 de ${total} lecciones · 0%`}
        </p>
      </div>

      <div
        role="progressbar"
        aria-label={label}
        aria-valuenow={percent}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuetext={`${state.done} de ${total} lecciones completadas`}
        className="mt-3 h-2 w-full overflow-hidden rounded-full bg-white/10"
      >
        <div
          className="h-full rounded-full bg-gradient-to-r from-[#75e9f2] to-[#c09eff] transition-[width] duration-500"
          style={{ width: `${percent}%` }}
        />
      </div>

      {state.error && <p className="mt-3 text-xs text-[#ffcf72]">{state.error}</p>}

      {!state.signedIn && !state.loading && signInHint && (
        <p className="mt-3 text-xs leading-5 text-[#8fa9b5]">
          Sin sesión no hay avance guardado.{' '}
          <Link href="/auth" className={cn('font-medium text-[#75e9f2] underline underline-offset-4 hover:text-[#a0f4f9]', focusRing)}>
            Inicia sesión
          </Link>{' '}
          para marcar las lecciones que termines.
        </p>
      )}
    </div>
  )
}

/**
 * Insignias reales de `public.badges`: `primer_prompt`, `oido_critico`,
 * `productor_ia`, `primera_cancion`. Nombre y requisito se leen de
 * `COURSE_BADGES`, no escritos a mano, y solo se pinta como ganada una
 * insignia cuyo código devolvió la API.
 */
export function BadgeGrid({ badges, heading = 'Insignias' }: { badges?: string[]; heading?: string }) {
  const fetched = useCourseProgress(badges === undefined)
  const earned = new Set(badges ?? fetched.progress.badges)

  return (
    <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4" aria-label={heading}>
      {COURSE_BADGES.map((badge) => {
        const isEarned = earned.has(badge.code)
        return (
          <li
            key={badge.code}
            className={cn(
              'rounded-2xl border p-4',
              isEarned ? 'border-[#ffcf72]/40 bg-[#ffcf72]/[.07]' : 'border-white/10 bg-white/[.03]',
            )}
          >
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  'flex size-9 shrink-0 items-center justify-center rounded-xl',
                  isEarned ? 'bg-[#ffcf72]/20 text-[#ffcf72]' : 'bg-white/10 text-white/35',
                )}
                aria-hidden="true"
              >
                <Trophy size={17} />
              </span>
              <p className="text-sm font-medium">{badge.name}</p>
            </div>
            <p className="mt-3 text-xs leading-5 text-[#8fa9b5]">{badge.requirement}</p>
            {/* `primera_cancion` no se gana leyendo: se gana marcando una canción lista en el estudio. */}
            {badge.code === 'primera_cancion' && (
              <Link
                href="/studio"
                className={cn('mt-2 inline-block text-[11px] font-medium text-[#8cecf3] underline underline-offset-4 hover:text-[#a0f4f9]', focusRing)}>
                Ir al estudio
              </Link>
            )}
            <p className={cn('mt-3 text-[10px] font-semibold uppercase tracking-[.2em]', isEarned ? 'text-[#ffcf72]' : 'text-[#5f7a88]')}>
              {isEarned ? 'Ganada' : 'Por ganar'}
            </p>
          </li>
        )
      })}
    </ul>
  )
}
