import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const root = new URL('../', import.meta.url)
const [course, rubric, midiScript, audioScript, experimentCsv, moduleReadme] = await Promise.all([
  readFile(new URL('lib/course.ts', root), 'utf8'),
  readFile(new URL('docs/MODULE_3_PROJECT_FINAL.md', root), 'utf8'),
  readFile(new URL('laboratorio-audio-ia/modulo_3_ia/src/generate_midi.py', root), 'utf8'),
  readFile(new URL('laboratorio-audio-ia/modulo_3_ia/src/generate_stable_audio.py', root), 'utf8'),
  readFile(new URL('laboratorio-audio-ia/modulo_3_ia/data/prompts.example.csv', root), 'utf8'),
  readFile(new URL('laboratorio-audio-ia/modulo_3_ia/README.md', root), 'utf8'),
])

const lessonIds = [...course.matchAll(/^\s+id: '(m\d{2}-l\d{2})'/gm)].map((match) => match[1])
const expectedIds = [
  'm01-l01', 'm01-l02', 'm01-l03',
  'm02-l04', 'm02-l05', 'm02-l06', 'm02-l07',
  'm03-l08', 'm03-l09', 'm03-l10',
  'm04-l11', 'm04-l12', 'm04-l13',
  'm05-l14', 'm05-l15', 'm05-l16',
]
const rubricWeights = [20, 15, 20, 15, 10, 10, 10]

const checks = [
  ['core lesson count remains sixteen', lessonIds.length === 16],
  ['all core lesson IDs remain unchanged', JSON.stringify(lessonIds) === JSON.stringify(expectedIds)],
  ['Módulo 3 capstone is integrated into existing m03-l10', course.includes("title: 'Proyecto final: obra musical controlada por IA'") && course.includes("id: 'm03-l10'")],
  ['course source includes controlled Stable Audio parameters', course.includes('guidance_scale') && course.includes('audio_end_in_s') && course.includes('pipeline.vae.sampling_rate')],
  ['course source preserves human and AI provenance distinction', course.includes('qué material produjo el modelo') && course.includes('qué decisiones tomó la persona')],
  ['final project document exists with all seven rubric weights', rubricWeights.every((weight) => new RegExp('(?:^|\\\\D)' + weight + '%').test(rubric))],
  ['final project document requires five versions and oral defense', rubric.includes('version_A.wav') && rubric.includes('Defensa oral') && rubric.includes('Reproducibilidad')],
  ['MIDI generator produces an editable multi-track MIDI', midiScript.includes('pretty_midi.PrettyMIDI') && midiScript.includes('midi.instruments.extend')],
  ['Stable Audio API uses guidance_scale and model sample rate', audioScript.includes('guidance_scale=') && audioScript.includes('pipeline.vae.sampling_rate')],
  ['Stable Audio generator enforces a clip duration ceiling', audioScript.includes('MAX_MODEL_SECONDS = 47.0') && audioScript.includes('duration_seconds <= MAX_MODEL_SECONDS')],
  ['CSV defines all five controlled experiment variants', ['A,', 'B,', 'C,', 'D,', 'E,'].every((version) => experimentCsv.includes(version))],
  ['tool README documents test and generation steps', moduleReadme.includes('run_experiments.py') && moduleReadme.includes('unittest discover')],
]

let failures = 0
for (const [label, passed] of checks) {
  console.log((passed ? 'PASS ' : 'FAIL ') + label)
  if (!passed) failures += 1
}

assert.equal(failures, 0, failures + ' Module 3 capstone contract checks failed')
console.log('Module 3 capstone contracts passed: ' + checks.length + '/' + checks.length)
