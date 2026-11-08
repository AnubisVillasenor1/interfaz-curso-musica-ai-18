import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { AdvancedAudioExamPage } from '@/components/course/advanced-audio-exam-page'
import { getAdvancedAudioModule } from '@/lib/advanced-audio-curriculum'

export const metadata: Metadata = {
  title: 'Examen del sistema integrador',
  description: 'Examen teórico de 20 preguntas sobre arquitectura, persistencia, despliegue, pruebas y gobernanza.',
}

export default function CapstoneExamPage() {
  const module = getAdvancedAudioModule('capstone')
  if (!module) notFound()
  return <AdvancedAudioExamPage module={module} />
}
