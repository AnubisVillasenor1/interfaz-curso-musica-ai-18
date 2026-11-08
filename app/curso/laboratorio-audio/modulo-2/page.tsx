import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { AdvancedAudioModulePage } from '@/components/course/advanced-audio-module'
import { getAdvancedAudioModule } from '@/lib/advanced-audio-curriculum'

export const metadata: Metadata = {
  title: 'Mezcla y masterización · Laboratorio técnico',
  description: 'Peak, LUFS, true peak estimado, balance espectral, compresión y comparación A/B.',
}

export default function MasteringModulePage() {
  const module = getAdvancedAudioModule('mastering')
  if (!module) notFound()
  return <AdvancedAudioModulePage module={module} />
}
