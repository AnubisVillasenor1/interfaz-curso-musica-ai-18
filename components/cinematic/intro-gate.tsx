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

const CinematicIntro = dynamic(() => import('./cinematic-intro'), {
  ssr: false,
  loading: () => null,
})

export function IntroGate() {
  const [isIntroVisible, setIsIntroVisible] = useState(false)

  useEffect(() => {
    if (shouldRunIntro()) {
      setIsIntroVisible(true)
    }
  }, [])

  const closeIntro = useCallback(() => {
    markIntroSeen()

    // /presentacion forces this intro through ?intro=on. Remove only that
    // control parameter when the intro closes so refreshing the dashboard
    // does not force the presentation to replay indefinitely.
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href)
      if (url.searchParams.get('intro') === 'on') {
        url.searchParams.delete('intro')
        window.history.replaceState(
          window.history.state,
          '',
          `${url.pathname}${url.search}${url.hash}`,
        )
      }
    }

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
          aria-label="Volver a ver la presentación cinematográfica de Play & Go"
          className="pg-shell pg-btn pg-btn-ghost fixed bottom-24 right-5 z-40 inline-flex max-sm:right-3 items-center gap-2 font-mono text-[9.5px] uppercase tracking-[0.2em] transition-opacity hover:opacity-80 active:scale-95"
          style={{ padding: '0.6rem 1.05rem' }}
        >
          <Film className="size-3.5" aria-hidden="true" />
          <span>Ver presentación</span>
        </button>
      )}
    </>
  )
}
