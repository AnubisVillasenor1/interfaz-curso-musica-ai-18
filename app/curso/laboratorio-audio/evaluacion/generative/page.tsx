import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { AdvancedAudioExamPage } from '@/components/course/advanced-audio-exam-page'
import { getAdvancedAudioModule } from '@/lib/advanced-audio-curriculum'

export const metadata: Metadata = {
  title: 'Examen de IA generativa musical',
  description: 'Examen teórico de 20 preguntas sobre difusión, semillas, MIDI, evaluación y licencias.',
}

export default function GenerativeExamPage() {
  const module = getAdvancedAudioModule('generative')
  if (!module) notFound()
  return <AdvancedAudioExamPage module={module} />
}
