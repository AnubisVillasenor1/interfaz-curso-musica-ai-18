'use client'

import { useCallback, useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import { Film } from 'lucide-react'

import { CourseDashboard } from '@/components/course-dashboard'
import {
  markIntroSeen,
  replayIntro as clearIntroSeen,
  shouldRunIntro,
} from '@/lib/cinematic/gate'

const CinematicIntro = dynamic(
  () => import('./cinematic-intro').then((mod) => mod.CinematicIntro),
  {
    ssr: false,
    loading: () => null,
  },
)

export function IntroGate() {
  const [isIntroVisible, setIsIntroVisible] = useState(false)

  useEffect(() => {
    if (shouldRunIntro()) {
      setIsIntroVisible(true)
    }
  }, [])

  const closeIntro = useCallback(() => {
    markIntroSeen()
    setIsIntroVisible(false)
  }, [])

  const replayIntro = useCallback(() => {
    clearIntroSeen()
    setIsIntroVisible(true)
  }, [])

  return (
    <>
      <CourseDashboard />

      {isIntroVisible ? (
        <CinematicIntro
          onComplete={closeIntro}
          onSkip={closeIntro}
        />
      ) : (
        <button
          type="button"
          onClick={replayIntro}
          aria-label="Volver a ver la introducción cinemática"
          className="pg-shell pg-btn pg-btn-ghost fixed bottom-24 right-5 z-40 hidden items-center gap-2 font-mono text-[9.5px] uppercase tracking-[0.2em] transition-opacity hover:opacity-80 active:scale-95 md:inline-flex"
          style={{ padding: '0.6rem 1.05rem' }}
        >
          <Film className="size-3.5" aria-hidden="true" />
          <span>Ver la intro</span>
        </button>
      )}
    </>
  )
}
