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
          className="fixed bottom-5 right-5 z-40 hidden rounded-full border border-white/12 bg-black/45 px-4 py-2 font-mono text-[10px] uppercase tracking-[0.2em] text-[#9fdfe9] backdrop-blur-xl transition hover:border-[#6feaff]/45 hover:text-white md:block"
        >
          Ver la intro
        </button>
      )}
    </>
  )
}
