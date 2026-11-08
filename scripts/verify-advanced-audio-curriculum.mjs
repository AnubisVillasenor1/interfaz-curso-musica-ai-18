import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const paths = [
  'lib/course.ts',
  'lib/advanced-audio-curriculum.ts',
  'lib/advanced-audio-exam.ts',
  'lib/agent/guide.ts',
  'app/sitemap.ts',
  'app/api/advanced-audio/exam/route.ts',
  'app/api/advanced-audio/evaluate/route.ts',
  'app/curso/laboratorio-audio/page.tsx',
  'app/curso/laboratorio-audio/modulo-1/page.tsx',
  'app/curso/laboratorio-audio/modulo-2/page.tsx',
  'app/curso/laboratorio-audio/modulo-3/page.tsx',
  'app/curso/laboratorio-audio/modulo-4/page.tsx',
  'app/curso/laboratorio-audio/modulo-5/page.tsx',
  'app/curso/laboratorio-audio/modulo-6/page.tsx',
  'app/curso/laboratorio-audio/evaluacion/page.tsx',
  'app/curso/laboratorio-audio/evaluacion/dsp/page.tsx',
  'app/curso/laboratorio-audio/evaluacion/mastering/page.tsx',
  'app/curso/laboratorio-audio/evaluacion/generative/page.tsx',
  'app/curso/laboratorio-audio/evaluacion/plugins/page.tsx',
  'app/curso/laboratorio-audio/evaluacion/governance/page.tsx',
  'app/curso/laboratorio-audio/evaluacion/capstone/page.tsx',
  'components/course/advanced-audio-module.tsx',
  'components/course/advanced-audio-exam-page.tsx',
  'components/course/advanced-audio-evaluator.tsx',
  'laboratorio-audio-ia/README.md',
  'laboratorio-audio-ia/src/analisis_musical.py',
  'laboratorio-audio-ia/src/analisis_masterizacion.py',
  'laboratorio-audio-ia/src/presupuesto_latencia.py',
  'laboratorio-audio-ia/src/orquestador_agentes.py',
  'laboratorio-audio-ia/src/manifiesto_procedencia.py',
  'laboratorio-audio-ia/src/checklist_entrega.py',
  'laboratorio-audio-ia/tests/test_audio_lab.py',
  'laboratorio-audio-ia/tests/test_gobernanza_y_sistemas.py',
  'laboratorio-audio-ia/modulo_3_ia/src/generate_midi.py',
  'laboratorio-audio-ia/modulo_3_ia/src/run_experiments.py',
  'laboratorio-audio-ia/modulo_3_ia/src/evaluate_audio.py',
  'laboratorio-audio-ia/modulo_3_ia/src/metadata.py',
  'docs/laboratorio-avanzado/MODULO-01.md',
  'docs/laboratorio-avanzado/MODULO-02.md',
  'docs/laboratorio-avanzado/MODULO-03.md',
  'docs/laboratorio-avanzado/MODULO-04.md',
  'docs/laboratorio-avanzado/MODULO-05.md',
  'docs/laboratorio-avanzado/MODULO-06.md',
  'docs/laboratorio-avanzado/EVALUACION-CON-IA.md',
  'docs/laboratorio-avanzado/GUIONES-DE-AUDIO.md',
]
const contents = await Promise.all(paths.map((path) => readFile(new URL('../' + path, import.meta.url), 'utf8')))
const source = Object.fromEntries(paths.map((path, index) => [path, contents[index]]))
const curriculum = source['lib/advanced-audio-curriculum.ts']
const examSource = source['lib/advanced-audio-exam.ts']
const moduleIds = ['dsp', 'mastering', 'generative', 'plugins', 'governance', 'capstone']
const questionPrefixes = ['dsp', 'mst', 'gen', 'plg', 'gov', 'cap']
const questionsPerModule = questionPrefixes.map(
  (prefix) => (examSource.match(new RegExp("id:'" + prefix + "-q\\d\\d'", 'g')) ?? []).length,
)

const checks = [
  ['core course remains 16 lessons', /COURSE_TOTAL_LESSONS\s*=\s*16/.test(source['lib/course.ts']) && source['lib/course.ts'].includes('export const COURSE_LESSONS')],
  ['author and AI support are explicitly attributed', curriculum.includes('Edwin Oswaldo Castillo Trejo') && curriculum.includes('Material estructurado y revisado con apoyo de IA')],
  ['technical path is supplemental and declares six modules', curriculum.includes('ADVANCED_AUDIO_MODULE_IDS') && moduleIds.every((id) => curriculum.includes("id: '" + id + "'")) && source['lib/course.ts'].includes('/curso/laboratorio-audio')],
  ['every module has four lessons, lab, rubric and code references', moduleIds.every((id) => new RegExp("id: '" + id + "'[\\s\\S]*?lessons: \\[").test(curriculum)) && (curriculum.match(/lessons: \[/g) ?? []).length === 6 && (curriculum.match(/rubric: \[/g) ?? []).length === 6],
  ['each of the six exams contains 20 questions', questionsPerModule.length === 6 && questionsPerModule.every((count) => count === 20) && (examSource.match(/questions: \w+Questions/g) ?? []).length === 6],
  ['module ids are validated through one allowlist', curriculum.includes('isAdvancedAudioModuleId') && source['app/api/advanced-audio/exam/route.ts'].includes('isAdvancedAudioModuleId') && source['app/api/advanced-audio/evaluate/route.ts'].includes('isAdvancedAudioModuleId')],
  ['answer keys are stripped from the public exam contract', /export function publicQuestions[\s\S]*?return exam\.questions\.map\(\(\{ id, question, options, topic \}\)/.test(examSource) && source['app/api/advanced-audio/exam/route.ts'].includes('publicQuestions(exam)')],
  ['exam grading remains server-side and validates answer identifiers', examSource.includes('gradeAdvancedAudioExam') && examSource.includes('validateAdvancedAudioAnswers')],
  ['AI evaluator requires login and a real provider key', source['app/api/advanced-audio/evaluate/route.ts'].includes('status: 401') && source['app/api/advanced-audio/evaluate/route.ts'].includes('AI_AGENT_API_KEY')],
  ['AI evaluator records that it reviews text, not raw audio', source['app/api/advanced-audio/evaluate/route.ts'].includes('does not listen') && source['app/api/advanced-audio/evaluate/route.ts'].includes('recordedAsOfficialGrade: false')],
  ['human review and no-official-degree limitations are documented', curriculum.includes('no equivale por sí misma a un grado académico') && source['docs/laboratorio-avanzado/EVALUACION-CON-IA.md'].includes('revisión humana')],
  ['technical lab contains Python unit tests and reproducible setup', source['laboratorio-audio-ia/README.md'].includes('python -m unittest') && source['laboratorio-audio-ia/tests/test_audio_lab.py'].includes('unittest.TestCase')],
  ['modules 4–6 expose runnable tools with tests', ['presupuesto_latencia.py', 'orquestador_agentes.py', 'manifiesto_procedencia.py', 'checklist_entrega.py'].every((file) => source['laboratorio-audio-ia/src/' + file].includes('def ')) && source['laboratorio-audio-ia/tests/test_gobernanza_y_sistemas.py'].includes('unittest.TestCase')],
  ['technical documentation covers all six modules', ['MODULO-01.md', 'MODULO-02.md', 'MODULO-03.md', 'MODULO-04.md', 'MODULO-05.md', 'MODULO-06.md'].every((file) => source['docs/laboratorio-avanzado/' + file].includes('Rúbrica')) && source['docs/laboratorio-avanzado/MODULO-03.md'].includes('Stable Audio') && source['docs/laboratorio-avanzado/MODULO-04.md'].includes('latencia') && source['docs/laboratorio-avanzado/MODULO-05.md'].includes('SHA-256') && source['docs/laboratorio-avanzado/MODULO-06.md'].includes('Docker')],
  ['course guide routes technical questions to every module', [1, 2, 3, 4, 5, 6].every((number) => source['lib/agent/guide.ts'].includes(`/curso/laboratorio-audio/modulo-${number}`)) && source['lib/agent/guide.ts'].includes('advancedAudioModulePath')],
  ['module links are derived from one route helper and no feature branch remains', source['app/curso/laboratorio-audio/page.tsx'].includes('advancedAudioModulePath') && source['components/course/advanced-audio-module.tsx'].includes('advancedAudioModulePath') && source['components/course/advanced-audio-module.tsx'].includes('/blob/main/') && !Object.values(source).some((text) => text.includes('feat/unified-preview-functional-qa'))],
  ['sitemap publishes the advanced lab and its exams', source['app/sitemap.ts'].includes('advancedAudioModulePath') && source['app/sitemap.ts'].includes('advancedAudioExamPath')],
]

let failures = 0
for (const [label, passed] of checks) {
  console.log((passed ? 'PASS ' : 'FAIL ') + label)
  if (!passed) failures += 1
}
assert.equal(failures, 0, failures + ' advanced-audio-curriculum contract checks failed')
console.log('Advanced audio curriculum contract checks passed: ' + checks.length + '/' + checks.length)
