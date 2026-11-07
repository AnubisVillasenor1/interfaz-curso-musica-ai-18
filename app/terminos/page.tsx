import type { Metadata } from 'next'
import Link from 'next/link'

import { LegalPage } from '@/components/legal/legal-page'
import { TERMS_CONTACT, TERMS_EFFECTIVE_DATE, TERMS_SECTIONS, TERMS_VERSION } from '@/lib/legal/terms'

export const metadata: Metadata = {
  title: 'Términos y Condiciones',
  description:
    'Términos y Condiciones de uso de TAMV Online Network: cuentas, identidad académica, comunidad, membresías, contenido generado con IA y protección de datos.',
}

export default function TerminosPage() {
  return (
    <LegalPage
      eyebrow="Legal · TAMV Online Network"
      title="Términos y Condiciones de Uso"
      lede="El marco de uso de la Red: cuentas e identidad académica, comunidad y moderación, membresías y pagos, contenido generado con inteligencia artificial, propiedad intelectual y protección de datos."
      effectiveDate={TERMS_EFFECTIVE_DATE}
      version={TERMS_VERSION}
      notice={{
        title: 'Aviso de estado',
        text: `Esta es la versión base ${TERMS_VERSION} de los Términos. Debe ser revisada por un abogado mexicano antes de considerarse definitiva, en materia de protección de datos, menores, consumo, propiedad intelectual y responsabilidad.`,
      }}
      sections={TERMS_SECTIONS}
      contact={{
        title: 'Contacto institucional',
        lines: [
          `TAMV Online Network · ${TERMS_CONTACT.location}`,
          `${TERMS_CONTACT.institutional} · ${TERMS_CONTACT.support}`,
          `${TERMS_CONTACT.legal} · ${TERMS_CONTACT.privacy}`,
        ],
      }}
      footer={
        <>
          <Link href="/privacidad" className="pg-btn pg-btn-ghost pg-btn-sm">
            Política de Privacidad
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
