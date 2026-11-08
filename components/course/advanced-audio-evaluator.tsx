'use client'

import { useState } from 'react'
import { CheckCircle2, LoaderCircle, ShieldAlert, Sparkles } from 'lucide-react'

import { ADVANCED_AUDIO_MODULE_IDS, ADVANCED_AUDIO_MODULES, type AdvancedAudioModuleId } from '@/lib/advanced-audio-curriculum'

interface Evaluation {
  moduleId: AdvancedAudioModuleId
  moduleTitle: string
  author: string
  provisionalScore: number
  decision: 'not_ready' | 'conditional' | 'ready'
  summary: string
  rubricResults: Array<{ id: string; score: number; evidence: string; improvement: string }>
  criticalFindings: string[]
  missingEvidence: string[]
  nextSteps: string[]
  model?: string
  note: string
  recordedAsOfficialGrade: false
}

const exampleEvidence = [
  `Módulo: [${ADVANCED_AUDIO_MODULE_IDS.join(' | ')}]`,
  'Archivo y procedencia/licencia:',
  'Hash SHA-256:',
  'Comando exacto ejecutado:',
  'Entorno y versiones:',
  'Parámetros relevantes:',
  'Artefactos producidos:',
  'Hallazgos cuantitativos (copiar del CSV/JSON):',
  'Observaciones auditivas con marcas de tiempo:',
  'Hipótesis y cómo se comprobó:',
  'Limitaciones y dudas pendientes:',
].join('\n')

export function AdvancedAudioEvaluator() {
  const [moduleId, setModuleId] = useState<AdvancedAudioModuleId>('dsp')
  const [evidenceSummary, setEvidenceSummary] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [evaluation, setEvaluation] = useState<Evaluation | null>(null)

  const module = ADVANCED_AUDIO_MODULES.find((item) => item.id === moduleId)

  async function evaluate() {
    if (!evidenceSummary.trim() || loading) return
    setLoading(true)
    setError(null)
    setEvaluation(null)
    try {
      const response = await fetch('/api/advanced-audio/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        cache: 'no-store',
        body: JSON.stringify({ moduleId, evidenceSummary }),
      })
      const payload = await response.json().catch(() => null)
      if (!response.ok) throw new Error(payload?.error ?? 'No se pudo completar la evaluación.')
      setEvaluation(payload as Evaluation)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'No se pudo completar la evaluación.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <section className="pg-card p-5 sm:p-7">
        <div className="flex items-start gap-3">
          <Sparkles size={20} className="mt-1 shrink-0" aria-hidden="true" />
          <div>
            <p className="pg-eyebrow">Tutoría con IA · Dictamen provisional</p>
            <h2 className="pg-block-title mt-1">Revisión de evidencia técnica</h2>
            <p className="pg-prose mt-3">Describe resultados reales que ya generaste. La IA revisa el resumen, lo contrasta con la rúbrica y señala carencias; no recibe ni escucha el archivo de audio, no ejecuta tu código y no puede validar derechos de autor desde este formulario.</p>
          </div>
        </div>
        <label htmlFor="advanced-evaluation-module" className="pg-label mt-6 block">Laboratorio a revisar</label>
        <select
          id="advanced-evaluation-module"
          value={moduleId}
          onChange={(event) => { setModuleId(event.target.value as AdvancedAudioModuleId); setEvaluation(null); setError(null) }}
          className="pg-field mt-2 w-full"
        >
          {ADVANCED_AUDIO_MODULES.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}
        </select>
        <label htmlFor="advanced-evaluation-evidence" className="pg-label mt-5 block">Resumen de evidencia (máximo 16 000 caracteres)</label>
        <textarea
          id="advanced-evaluation-evidence"
          value={evidenceSummary}
          maxLength={16000}
          onChange={(event) => { setEvidenceSummary(event.target.value); setEvaluation(null) }}
          rows={13}
          placeholder={exampleEvidence}
          className="pg-field mt-2 min-h-72 w-full resize-y"
          required
        />
        <div className="mt-2 flex items-center justify-between gap-3">
          <span className="pg-note">No pegues claves, tokens, datos personales ni material ajeno sin permiso.</span>
          <span className="pg-note tabular-nums">{evidenceSummary.length.toLocaleString('es-MX')}/16 000</span>
        </div>
        {error && <div className="pg-inset mt-4 p-4" role="alert"><p className="pg-prose">{error}</p></div>}
        <button
          type="button"
          onClick={() => void evaluate()}
          disabled={!evidenceSummary.trim() || loading}
          className="pg-btn pg-btn-primary mt-5 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? <LoaderCircle className="animate-spin" size={16} aria-hidden="true" /> : <Sparkles size={16} aria-hidden="true" />}
          {loading ? 'Revisando evidencia…' : 'Solicitar retroalimentación'}
        </button>
        <p className="pg-note mt-4">Requiere sesión iniciada y una clave de proveedor de IA en el servidor. Si falta configuración, la plataforma devuelve un error explícito, no una evaluación fingida.</p>
      </section>

      {evaluation && module && (
        <section className="pg-card p-5 sm:p-7" aria-live="polite">
          <div className="flex items-start gap-3">
            {evaluation.decision === 'ready' ? <CheckCircle2 size={22} className="shrink-0" aria-hidden="true" /> : <ShieldAlert size={22} className="shrink-0" aria-hidden="true" />}
            <div className="flex-1">
              <p className="pg-eyebrow">Resultado de IA · {evaluation.model ?? 'modelo configurado'}</p>
              <h3 className="pg-title mt-1" data-size="sm">{evaluation.provisionalScore}/100 · {evaluation.decision === 'ready' ? 'Listo para revisión humana' : evaluation.decision === 'conditional' ? 'Avance con condiciones' : 'Requiere evidencia o correcciones'}</h3>
              <p className="pg-prose mt-3">{evaluation.summary}</p>
              <p className="pg-note mt-3">{evaluation.note}</p>
            </div>
          </div>

          <h4 className="pg-item-title mt-7">Evaluación por criterio</h4>
          <div className="mt-3 space-y-3">
            {module.rubric.map((criterion) => {
              const item = evaluation.rubricResults.find((result) => result.id === criterion.id)
              if (!item) return null
              return (
                <article key={criterion.id} className="pg-inset p-4">
                  <div className="flex flex-wrap items-baseline justify-between gap-3">
                    <h5 className="pg-item-title">{criterion.name} <span className="pg-note">· peso {criterion.weight}%</span></h5>
                    <span className="pg-chip">{item.score}/100</span>
                  </div>
                  <p className="pg-prose mt-2"><strong>Evidencia indicada:</strong> {item.evidence}</p>
                  <p className="pg-prose mt-2"><strong>Mejora sugerida:</strong> {item.improvement}</p>
                </article>
              )
            })}
          </div>

          {evaluation.criticalFindings.length > 0 && <section className="mt-6"><h4 className="pg-item-title">Hallazgos críticos</h4><ul className="pg-list mt-2">{evaluation.criticalFindings.map((item) => <li key={item}>{item}</li>)}</ul></section>}
          {evaluation.missingEvidence.length > 0 && <section className="mt-6"><h4 className="pg-item-title">Evidencia faltante</h4><ul className="pg-list mt-2">{evaluation.missingEvidence.map((item) => <li key={item}>{item}</li>)}</ul></section>}
          <section className="mt-6"><h4 className="pg-item-title">Siguientes pasos</h4><ol className="pg-list mt-2">{evaluation.nextSteps.map((item) => <li key={item}>{item}</li>)}</ol></section>
          <p className="pg-note mt-6">La puntuación es provisional y no se registra como nota oficial. El evaluador humano debe comprobar los archivos, la ejecución, la escucha y la trazabilidad antes de emitir un dictamen académico.</p>
        </section>
      )}
    </div>
  )
}
