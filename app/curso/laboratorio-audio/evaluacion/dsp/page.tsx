import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { AdvancedAudioExamPage } from '@/components/course/advanced-audio-exam-page'
import { getAdvancedAudioModule } from '@/lib/advanced-audio-curriculum'

export const metadata: Metadata = {
  title: 'Examen DSP y extracción espectral',
  description: 'Examen teórico de 20 preguntas sobre muestreo, STFT, características y trazabilidad.',
}

export default function DspExamPage() {
  const module = getAdvancedAudioModule('dsp')
  if (!module) notFound()
  return <AdvancedAudioExamPage module={module} />
}
