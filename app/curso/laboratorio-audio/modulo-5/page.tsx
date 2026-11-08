import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { AdvancedAudioModulePage } from '@/components/course/advanced-audio-module'
import { getAdvancedAudioModule } from '@/lib/advanced-audio-curriculum'

export const metadata: Metadata = {
  title: 'Trazabilidad y gobernanza · Laboratorio técnico',
  description: 'Licencias, manifiestos de procedencia, hashes, watermarking, riesgos y auditoría de contenido sintético.',
}

export default function GovernanceModulePage() {
  const module = getAdvancedAudioModule('governance')
  if (!module) notFound()
  return <AdvancedAudioModulePage module={module} />
}
