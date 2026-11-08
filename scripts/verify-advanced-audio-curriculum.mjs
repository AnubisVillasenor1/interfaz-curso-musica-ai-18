import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const paths = [
  'lib/course.ts',
  'lib/advanced-audio-curriculum.ts',
  'lib/advanced-audio-exam.ts',
  'lib/agent/guide.ts',
  'app/curso/laboratorio-audio/page.tsx',
  'app/curso/laboratorio-audio/modulo-1/page.tsx',
  'app/curso/laboratorio-audio/modulo-2/page.tsx',
  'app/curso/laboratorio-audio/evaluacion/page.tsx',
  'app/api/advanced-audio/exam/route.ts',
  'app/api/advanced-audio/evaluate/route.ts',
  'laboratorio-audio-ia/README.md',
  'laboratorio-audio-ia/src/analisis_musical.py',
  'laboratorio-audio-ia/src/analisis_masterizacion.py',
  'laboratorio-audio-ia/tests/test_audio_lab.py',
  'docs/laboratorio-avanzado/MODULO-01.md',
  'docs/laboratorio-avanzado/MODULO-02.md',
  'docs/laboratorio-avanzado/EVALUACION-CON-IA.md',
  'docs/laboratorio-avanzado/GUIONES-DE-AUDIO.md',
]
const contents = await Promise.all(paths.map((path) => readFile(new URL('../' + path, import.meta.url), 'utf8')))
const source = Object.fromEntries(paths.map((path, index) => [path, contents[index]]))
const questionIds = source['lib/advanced-audio-exam.ts'].match(/id:'(?:dsp|mst)-q\d\d'/g) ?? []
const checks = [
  ['core course remains 16 lessons', /COURSE_TOTAL_LESSONS\s*=\s*16/.test(source['lib/course.ts']) && source['lib/course.ts'].includes('export const COURSE_LESSONS')],
  ['author and AI support are explicitly attributed', source['lib/advanced-audio-curriculum.ts'].includes('Edwin Oswaldo Castillo Trejo') && source['lib/advanced-audio-curriculum.ts'].includes('Material estructurado y revisado con apoyo de IA')],
  ['technical path is supplemental and has two modules', source['lib/advanced-audio-curriculum.ts'].includes("id: 'dsp'") && source['lib/advanced-audio-curriculum.ts'].includes("id: 'mastering'") && source['lib/course.ts'].includes('/curso/laboratorio-audio')],
  ['each theoretical exam contains 20 questions', questionIds.length === 40 && source['lib/advanced-audio-exam.ts'].includes('questions: dspQuestions') && source['lib/advanced-audio-exam.ts'].includes('questions: masteringQuestions')],
  ['answer keys are stripped from the public exam contract', /export function publicQuestions[\s\S]*?return exam\.questions\.map\(\(\{ id, question, options, topic \}\)/.test(source['lib/advanced-audio-exam.ts']) && source['app/api/advanced-audio/exam/route.ts'].includes('publicQuestions(exam)')],
  ['exam grading remains server-side and validates answer identifiers', source['lib/advanced-audio-exam.ts'].includes('gradeAdvancedAudioExam') && source['lib/advanced-audio-exam.ts'].includes('validateAdvancedAudioAnswers')],
  ['AI evaluator requires login and a real provider key', source['app/api/advanced-audio/evaluate/route.ts'].includes("status: 401") && source['app/api/advanced-audio/evaluate/route.ts'].includes('AI_AGENT_API_KEY')],
  ['AI evaluator records that it reviews text, not raw audio', source['app/api/advanced-audio/evaluate/route.ts'].includes('does not listen') && source['app/api/advanced-audio/evaluate/route.ts'].includes('recordedAsOfficialGrade: false')],
  ['human review and no-official-degree limitations are documented', source['lib/advanced-audio-curriculum.ts'].includes('no equivale por sí misma a un grado académico') && source['docs/laboratorio-avanzado/EVALUACION-CON-IA.md'].includes('revisión humana')],
  ['technical lab contains Python unit tests and reproducible setup', source['laboratorio-audio-ia/README.md'].includes('python -m unittest') && source['laboratorio-audio-ia/tests/test_audio_lab.py'].includes('unittest.TestCase')],
  ['technical documentation covers both modules and audio scripts', source['docs/laboratorio-avanzado/MODULO-01.md'].includes('Radiografía sonora') && source['docs/laboratorio-avanzado/MODULO-02.md'].includes('LUFS') && source['docs/laboratorio-avanzado/GUIONES-DE-AUDIO.md'].includes('Guion A')],
  ['course guide routes technical questions to module-specific paths', source['lib/agent/guide.ts'].includes('/curso/laboratorio-audio/modulo-1') && source['lib/agent/guide.ts'].includes('/curso/laboratorio-audio/modulo-2')],
]

let failures = 0
for (const [label, passed] of checks) {
  console.log((passed ? 'PASS ' : 'FAIL ') + label)
  if (!passed) failures += 1
}
assert.equal(failures, 0, failures + ' advanced-audio-curriculum contract checks failed')
console.log('Advanced audio curriculum contract checks passed: ' + checks.length + '/' + checks.length)
