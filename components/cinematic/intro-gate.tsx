'use client'

import dynamic from 'next/dynamic'
import { useCallback, useEffect, useState } from 'react'

import { CourseDashboard } from '@/components/course-dashboard'
import { markIntroSeen, replayIntro, shouldRunIntro } from '@/lib/cinematic/gate'

/** three.js entra en el bundle sólo cuando la intro realmente va a verse. */
const CinematicIntro = dynamic(() => import('./cinematic-intro'), { ssr: false, loading: () => null })

export function IntroGate() {
  const [showIntro, setShowIntro] = useState(false)

  useEffect(() => {
    // Decidimos en cliente: el HTML llega igual de rápido y Google no ve un muro.
    if (shouldRunIntro()) setShowIntro(true)
  }, [])

  const close = useCallback(() => {
    markIntroSeen()
    setShowIntro(false)
  }, [])

  const replay = useCallback(() => {
    replayIntro()
    setShowIntro(true)
  }, [])

  return (
    <>
      <CourseDashboard />
      {showIntro && <CinematicIntro onComplete={close} onSkip={close} />}
      {!showIntro && (
        <button
          type="button"
          onClick={replay}
          className="crystal-button crystal-button-secondary fixed bottom-24 right-5 z-40 hidden rounded-full px-5 py-3 font-mono text-[10px] uppercase tracking-[0.18em] text-[#dffbff] backdrop-blur-xl transition hover:text-white md:flex"
        >
          Ver la intro
        </button>
      )}
    </>
  )
}
