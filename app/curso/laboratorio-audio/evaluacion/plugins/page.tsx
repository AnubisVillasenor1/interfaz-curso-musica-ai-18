import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { AdvancedAudioExamPage } from '@/components/course/advanced-audio-exam-page'
import { getAdvancedAudioModule } from '@/lib/advanced-audio-curriculum'

export const metadata: Metadata = {
  title: 'Examen de plugins y sistemas multiagente',
  description: 'Examen teórico de 20 preguntas sobre VST3/CLAP, latencia, ONNX y orquestación de agentes.',
}

export default function PluginsExamPage() {
  const module = getAdvancedAudioModule('plugins')
  if (!module) notFound()
  return <AdvancedAudioExamPage module={module} />
}
