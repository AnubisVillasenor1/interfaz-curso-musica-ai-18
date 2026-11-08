import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { AdvancedAudioModulePage } from '@/components/course/advanced-audio-module'
import { getAdvancedAudioModule } from '@/lib/advanced-audio-curriculum'

export const metadata: Metadata = {
  title: 'IA generativa musical · Laboratorio técnico',
  description: 'Difusión latente, prompts, semillas, MIDI editable y evaluación crítica de cinco variantes generadas.',
}

export default function GenerativeModulePage() {
  const module = getAdvancedAudioModule('generative')
  if (!module) notFound()
  return <AdvancedAudioModulePage module={module} />
}
