import type { Metadata } from 'next'
import { ActivationFlow } from '@/components/onboarding/activation-flow'

export const metadata: Metadata = {
  title: 'Comienza tu recorrido',
  description: 'Elige tu objetivo musical y entra directamente a tu primera experiencia en Play & Go.',
}

export default function OnboardingPage() {
  return <ActivationFlow />
}
