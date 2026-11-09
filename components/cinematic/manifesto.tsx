import { ArrowRight, CircuitBoard, Compass, Layers3, Radio, ShieldCheck } from 'lucide-react'
import Link from 'next/link'

import { Reveal } from '@/components/reveal'

/**
 * Los cinco actos de la presentación «Épica Play & Go», convertidos en una
 * sección real. El deck no traía pantallas que copiar: traía un diagnóstico y
 * una declaración. Aquí se cuentan en orden, con la misma idea de fondo —pasar
 * de consumir herramientas a poseer criterio técnico— y sin prometer nada que
 * el curso no entregue.
 */
const CHAPTERS = [
  {
    number: '01',
    label: 'Diagnóstico',
    icon: CircuitBoard,
    title: 'Sistema nervioso tecnológico',
    body: 'La tecnología conecta herramientas, datos y personas. Pero una red sin criterio no produce claridad: amplifica la confusión y hace pasar la novedad por progreso.',
  },
  {
    number: '02',
    label: 'El giro',
    icon: Compass,
    title: 'El giro erróneo de la industria',
    body: 'Durante años se prometió innovación para facilitar la vida humana. En el camino, actualizar se volvió un fin en sí mismo y el usuario dejó de preguntar qué gana con cada cambio.',
  },
  {
    number: '03',
    label: 'La consecuencia',
    icon: Layers3,
    title: 'Desorientación y dependencia',
    body: 'Aprendemos a medias herramientas que cambian antes de dominarlas. El resultado es una dependencia silenciosa: sabemos pulsar botones, pero no explicar qué ocurre dentro.',
  },
  {
    number: '04',
    label: 'La propuesta',
    icon: Radio,
    title: 'Más que una aplicación',
    body: 'Play & Go no entrega sólo un estudio. Integra un curso de nivel máster para entender la tecnología que usamos a diario: composición, prompting, voz, producción y release con evidencia.',
  },
  {
    number: '05',
    label: 'La declaración',
    icon: ShieldCheck,
    title: 'TAMV Online Network & Play and Go',
    body: 'Tecnología latinoamericana, hecha desde Mineral del Monte para el mundo. La meta no es consumir más herramientas: es poseer el conocimiento técnico real y decidir con él.',
  },
] as const

export function Manifesto() {
  return (
    <section id="manifiesto" className="pg-section manifesto-section">
      <div className="pg-container manifesto-grid">
        <div className="manifesto-intro">
          <p className="pg-eyebrow">Manifiesto · por qué existe</p>
          <h2 className="pg-title">La tecnología debía darnos criterio, no dependencia.</h2>
          <p className="pg-lede">
            Play & Go nace de una molestia concreta: la industria nos enseñó a actualizar herramientas antes de
            entenderlas. Este programa invierte el orden. Primero el criterio; después el botón.
          </p>

          <blockquote className="manifesto-quote">
            <p>“Pasar de ser simples consumidores a poseedores del conocimiento técnico real.”</p>
            <footer>Declaración de existencia · TAMV Online Network</footer>
          </blockquote>

          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/curso" className="pg-btn pg-btn-primary pg-btn-sm">
              Ver el curso <ArrowRight size={14} aria-hidden />
            </Link>
            <Link href="/informacion" className="pg-btn pg-btn-ghost pg-btn-sm">
              Conocer TAMV
            </Link>
          </div>
        </div>

        <ol className="manifesto-list">
          {CHAPTERS.map((chapter, index) => (
            <Reveal key={chapter.number} as="li" delay={index * 60} className="manifesto-item">
              <article className="manifesto-step">
                <div className="manifesto-marker" aria-hidden="true">
                  <span>{chapter.number}</span>
                  <chapter.icon size={16} />
                </div>
                <div className="manifesto-copy">
                  <p className="manifesto-label">{chapter.label}</p>
                  <h3>{chapter.title}</h3>
                  <p>{chapter.body}</p>
                </div>
              </article>
            </Reveal>
          ))}
        </ol>
      </div>
    </section>
  )
}
