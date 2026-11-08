import Link from 'next/link'
import { ArrowLeft, ArrowRight, AudioLines, BookOpen, CheckCircle2, Code2, ExternalLink, FileAudio, ShieldCheck } from 'lucide-react'

import {
  ADVANCED_AUDIO_AI_NOTE,
  ADVANCED_AUDIO_AUTHOR,
  ADVANCED_AUDIO_BRAND,
  type AdvancedAudioModule,
} from '@/lib/advanced-audio-curriculum'

const GITHUB_ROOT = 'https://github.com/AnubisVillasenor1/interfaz-curso-musica-ai-18/blob/feat/unified-preview-functional-qa/'

export function AdvancedAudioModulePage({ module }: { module: AdvancedAudioModule }) {
  const nextLabel = module.id === 'dsp' ? 'Diagnóstico de mezcla y masterización' : 'Volver al análisis acústico y DSP'

  return (
    <main className="pg-shell relative min-h-screen overflow-x-clip" style={{ background: 'var(--pg-bg)' }}>
      <div aria-hidden className="pg-glow pointer-events-none" />
      <header className="pg-container flex items-center justify-between gap-4 py-5">
        <Link href="/curso/laboratorio-audio" className="pg-navlink inline-flex items-center gap-2">
          <ArrowLeft size={14} aria-hidden="true" /> Laboratorio técnico
        </Link>
        <p className="pg-eyebrow hidden sm:block">TAMV Online Network</p>
        <Link href="/curso/laboratorio-audio/evaluacion" className="pg-navlink">Evaluación</Link>
      </header>

      <div className="pg-container pb-20">
        <section className="pg-section max-w-4xl">
          <p className="pg-eyebrow">Trayecto complementario · Módulo técnico {String(module.number).padStart(2, '0')}</p>
          <h1 className="pg-title pg-title-display">{module.title}</h1>
          <p className="pg-lede mt-4">{module.objective}</p>
          <p className="pg-note mt-4">{module.subtitle}</p>
          <div className="mt-6 flex flex-wrap gap-2">
            <span className="pg-chip">{module.level}</span>
            <span className="pg-chip">{module.estimatedHours}</span>
            <span className="pg-chip">{module.lessons.length} lecciones</span>
          </div>
          <p className="pg-note mt-5">Autor del curso: <strong>{ADVANCED_AUDIO_AUTHOR}</strong> · {ADVANCED_AUDIO_BRAND}</p>
          <p className="pg-note mt-2">{ADVANCED_AUDIO_AI_NOTE}</p>
        </section>

        <section className="mt-12">
          <h2 className="pg-section-title">Resultados de aprendizaje</h2>
          <ul className="mt-5 grid gap-3 md:grid-cols-2">
            {module.outcomes.map((outcome) => (
              <li key={outcome} className="pg-card flex items-start gap-3 p-4">
                <CheckCircle2 className="mt-0.5 shrink-0" size={17} aria-hidden="true" />
                <span className="pg-prose">{outcome}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="mt-14">
          <div className="flex items-center gap-3">
            <BookOpen size={19} aria-hidden="true" />
            <h2 className="pg-section-title">Secuencia de lecciones</h2>
          </div>
          <div className="mt-5 grid gap-4">
            {module.lessons.map((lesson, index) => (
              <article key={lesson.id} className="pg-card p-5 sm:p-7">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="pg-eyebrow">Lección {String(index + 1).padStart(2, '0')} · {lesson.id}</p>
                    <h3 className="pg-block-title mt-2">{lesson.title}</h3>
                  </div>
                  <span className="pg-chip">{lesson.minutes} min</span>
                </div>
                <p className="pg-prose mt-4">{lesson.objective}</p>
                <div className="mt-6 grid gap-4 lg:grid-cols-2">
                  {lesson.concepts.map((concept) => (
                    <section key={concept.heading} className="pg-inset p-4">
                      <h4 className="pg-item-title">{concept.heading}</h4>
                      <p className="pg-prose mt-2">{concept.explanation}</p>
                    </section>
                  ))}
                </div>
                <section className="mt-5">
                  <h4 className="pg-label">Demostración</h4>
                  <p className="pg-prose mt-2">{lesson.demonstration}</p>
                </section>
                <section className="mt-5">
                  <h4 className="pg-label">Práctica formativa</h4>
                  <p className="pg-prose mt-2">{lesson.practice}</p>
                </section>
                <section className="mt-5">
                  <h4 className="pg-label">Errores comunes y corrección</h4>
                  <ul className="mt-2 grid gap-2">
                    {lesson.commonErrors.map((item) => (
                      <li key={item.error} className="pg-inset p-3">
                        <p className="pg-prose"><strong>Error:</strong> {item.error}</p>
                        <p className="pg-prose mt-1"><strong>Corrección:</strong> {item.correction}</p>
                      </li>
                    ))}
                  </ul>
                </section>
                <section className="mt-5">
                  <h4 className="pg-label">Evidencia de aprendizaje</h4>
                  <ul className="pg-list mt-2">
                    {lesson.evidence.map((item) => <li key={item}>{item}</li>)}
                  </ul>
                </section>
              </article>
            ))}
          </div>
        </section>

        <section className="mt-14">
          <div className="flex items-center gap-3">
            <AudioLines size={19} aria-hidden="true" />
            <h2 className="pg-section-title">Laboratorio integrador</h2>
          </div>
          <article className="pg-card mt-5 p-5 sm:p-7">
            <p className="pg-eyebrow">{module.lab.estimatedHours}</p>
            <h3 className="pg-block-title mt-2">{module.lab.title}</h3>
            <p className="pg-prose mt-3">{module.lab.purpose}</p>
            <ol className="mt-5 grid gap-3">
              {module.lab.steps.map((step, index) => (
                <li key={step} className="pg-inset flex items-start gap-3 p-4">
                  <span className="pg-mark shrink-0" aria-hidden="true">{index + 1}</span>
                  <span className="pg-prose">{step}</span>
                </li>
              ))}
            </ol>
            <div className="mt-6 grid gap-5 md:grid-cols-2">
              <section>
                <h4 className="pg-item-title">Entregables</h4>
                <ul className="pg-list mt-3">
                  {module.lab.deliverables.map((item) => <li key={item}>{item}</li>)}
                </ul>
              </section>
              <section>
                <h4 className="pg-item-title">Criterios de aceptación</h4>
                <ul className="pg-list mt-3">
                  {module.lab.acceptance.map((item) => <li key={item}>{item}</li>)}
                </ul>
              </section>
            </div>
          </article>
        </section>

        <section className="mt-14">
          <h2 className="pg-section-title">Rúbrica de práctica · 100 puntos</h2>
          <div className="pg-card mt-5 overflow-x-auto p-4 sm:p-6">
            <table className="pg-table w-full min-w-[42rem]">
              <thead><tr><th>Criterio</th><th>Peso</th><th>Evidencia excelente</th></tr></thead>
              <tbody>
                {module.rubric.map((criterion) => (
                  <tr key={criterion.id}>
                    <td><strong>{criterion.name}</strong><p className="pg-note mt-1">{criterion.evidence}</p></td>
                    <td>{criterion.weight}%</td>
                    <td>{criterion.excellence}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="pg-note mt-3">El umbral formativo recomendado es 70/100 y el dominio sólido 85/100. La rúbrica no constituye una acreditación oficial; la entrega práctica requiere revisión humana.</p>
        </section>

        <section className="mt-14">
          <div className="flex items-center gap-3">
            <Code2 size={19} aria-hidden="true" />
            <h2 className="pg-section-title">Código reproducible</h2>
          </div>
          <div className="mt-5 grid gap-3">
            {module.codeFiles.map((file) => (
              <a key={file.path} href={GITHUB_ROOT + file.path} target="_blank" rel="noreferrer" className="pg-card pg-card-hover flex items-start gap-3 p-4">
                <FileAudio size={17} className="mt-0.5 shrink-0" aria-hidden="true" />
                <span className="min-w-0 flex-1">
                  <strong className="block break-all text-sm">{file.path}</strong>
                  <span className="pg-note mt-1 block">{file.purpose}</span>
                </span>
                <ExternalLink size={15} className="shrink-0" aria-hidden="true" />
              </a>
            ))}
          </div>
          <Link href="/curso/laboratorio-audio/evaluacion" className="pg-btn pg-btn-primary mt-5">
            Presentar examen técnico <ArrowRight size={16} aria-hidden="true" />
          </Link>
        </section>

        <section className="mt-14">
          <div className="flex items-center gap-3">
            <ShieldCheck size={19} aria-hidden="true" />
            <h2 className="pg-section-title">Referencias técnicas</h2>
          </div>
          <ul className="mt-4 grid gap-3 md:grid-cols-2">
            {module.references.map((reference) => (
              <li key={reference.url} className="pg-inset p-4">
                <a href={reference.url} target="_blank" rel="noreferrer" className="pg-minilink inline-flex items-center gap-2">
                  {reference.label} <ExternalLink size={13} aria-hidden="true" />
                </a>
                <p className="pg-note mt-2 break-all">{reference.url}</p>
              </li>
            ))}
          </ul>
        </section>

        <div className="mt-14">
          <Link href={module.id === 'dsp' ? '/curso/laboratorio-audio/modulo-2' : '/curso/laboratorio-audio/modulo-1'} className="pg-card pg-card-hover flex items-center gap-4 p-5">
            <span className="pg-mark" aria-hidden="true">{module.id === 'dsp' ? '02' : '↗'}</span>
            <span className="min-w-0 flex-1"><span className="pg-eyebrow">Siguiente paso</span><strong className="mt-1 block text-sm">{nextLabel}</strong></span>
            <ArrowRight size={18} aria-hidden="true" />
          </Link>
        </div>

        <footer className="mt-16 border-t border-white/10 pt-5">
          <p className="pg-note text-center">TAMV Online Network · Autor del curso: {ADVANCED_AUDIO_AUTHOR} · Contenido con apoyo de IA declarado.</p>
        </footer>
      </div>
    </main>
  )
}
