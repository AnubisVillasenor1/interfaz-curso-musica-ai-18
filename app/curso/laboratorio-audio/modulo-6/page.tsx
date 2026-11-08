import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { AdvancedAudioModulePage } from '@/components/course/advanced-audio-module'
import { getAdvancedAudioModule } from '@/lib/advanced-audio-curriculum'

export const metadata: Metadata = {
  title: 'Sistema integrador de producción musical · Laboratorio técnico',
  description: 'Arquitectura, backend, persistencia, Docker, HTTPS, pruebas, monitoreo y defensa de un estudio reproducible.',
}

export default function CapstoneModulePage() {
  const module = getAdvancedAudioModule('capstone')
  if (!module) notFound()
  return <AdvancedAudioModulePage module={module} />
}
