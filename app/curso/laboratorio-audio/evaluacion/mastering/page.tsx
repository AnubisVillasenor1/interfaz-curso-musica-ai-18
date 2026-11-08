import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { AdvancedAudioExamPage } from '@/components/course/advanced-audio-exam-page'
import { getAdvancedAudioModule } from '@/lib/advanced-audio-curriculum'

export const metadata: Metadata = {
  title: 'Examen de mezcla y masterización',
  description: 'Examen teórico de 20 preguntas sobre loudness, pico, EQ, compresión y entrega.',
}

export default function MasteringExamPage() {
  const module = getAdvancedAudioModule('mastering')
  if (!module) notFound()
  return <AdvancedAudioExamPage module={module} />
}
