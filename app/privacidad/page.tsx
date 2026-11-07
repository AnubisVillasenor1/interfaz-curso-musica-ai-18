import type { Metadata } from 'next'
import Link from 'next/link'

import { LegalPage } from '@/components/legal/legal-page'
import {
  PRIVACY_EFFECTIVE_DATE,
  PRIVACY_RESPONSIBLE,
  PRIVACY_SECTIONS,
  PRIVACY_VERSION,
} from '@/lib/legal/privacy'

export const metadata: Metadata = {
  title: 'Política de Privacidad',
  description:
    'Qué datos recopila TAMV Online Network, para qué los usa, con quién los comparte, cuánto tiempo los conserva y cómo ejercer tus derechos ARCO.',
}

export default function PrivacidadPage() {
  return (
    <LegalPage
      eyebrow="Legal · TAMV Online Network"
      title="Política de Privacidad"
      lede="Qué datos recopila la plataforma, para qué se usan, con qué proveedores se comparten, cuánto tiempo se conservan y cómo puedes ejercer tus derechos."
      effectiveDate={PRIVACY_EFFECTIVE_DATE}
      version={PRIVACY_VERSION}
      notice={{
        title: 'Aviso de estado',
        text: `Esta es la versión base ${PRIVACY_VERSION} de la Política. Describe lo que el sistema hace hoy, pero debe ser revisada por un abogado mexicano especializado en protección de datos antes de considerarse definitiva.`,
      }}
      sections={PRIVACY_SECTIONS}
      contact={{
        title: 'Contacto de privacidad',
        lines: [
          `${PRIVACY_RESPONSIBLE.name} · ${PRIVACY_RESPONSIBLE.location}`,
          PRIVACY_RESPONSIBLE.email,
        ],
      }}
      footer={
        <>
          <Link href="/terminos" className="pg-btn pg-btn-ghost pg-btn-sm">
            Términos y Condiciones
          </Link>
          <Link href="/precios" className="pg-btn pg-btn-ghost pg-btn-sm">
            Ver membresías
          </Link>
          <Link href="/informacion" className="pg-btn pg-btn-ghost pg-btn-sm">
            Sobre la Red
          </Link>
        </>
      }
    />
  )
}
