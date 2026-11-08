import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { AdvancedAudioExamPage } from '@/components/course/advanced-audio-exam-page'
import { getAdvancedAudioModule } from '@/lib/advanced-audio-curriculum'

export const metadata: Metadata = {
  title: 'Examen de trazabilidad y gobernanza',
  description: 'Examen teórico de 20 preguntas sobre licencias, hashes, watermarking, riesgos y auditoría.',
}

export default function GovernanceExamPage() {
  const module = getAdvancedAudioModule('governance')
  if (!module) notFound()
  return <AdvancedAudioExamPage module={module} />
}
