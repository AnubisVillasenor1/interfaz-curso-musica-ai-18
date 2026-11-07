import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { AdvancedAudioModulePage } from '@/components/course/advanced-audio-module'
import { getAdvancedAudioModule } from '@/lib/advanced-audio-curriculum'

export const metadata: Metadata = {
  title: 'DSP y extracción espectral · Laboratorio técnico',
  description: 'Fundamentos acústicos, STFT, espectrograma mel, cromagrama, características y trazabilidad.',
}

export default function DspModulePage() {
  const module = getAdvancedAudioModule('dsp')
  if (!module) notFound()
  return <AdvancedAudioModulePage module={module} />
}
