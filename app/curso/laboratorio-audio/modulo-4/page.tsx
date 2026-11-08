import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { AdvancedAudioModulePage } from '@/components/course/advanced-audio-module'
import { getAdvancedAudioModule } from '@/lib/advanced-audio-curriculum'

export const metadata: Metadata = {
  title: 'Plugins y sistemas multiagente · Laboratorio técnico',
  description: 'VST3/CLAP, JUCE, buffers, latencia, ONNX Runtime, inferencia local y orquestación de agentes.',
}

export default function PluginsModulePage() {
  const module = getAdvancedAudioModule('plugins')
  if (!module) notFound()
  return <AdvancedAudioModulePage module={module} />
}
