type Event = { tick: number; priority: number; bytes: number[] }

const SCALES: Record<string, number[]> = {
  major: [0, 2, 4, 5, 7, 9, 11],
  minor: [0, 2, 3, 5, 7, 8, 10],
}
const ROOTS: Record<string, number> = { C: 0, 'C#': 1, Db: 1, D: 2, 'D#': 3, Eb: 3, E: 4, F: 5, 'F#': 6, Gb: 6, G: 7, 'G#': 8, Ab: 8, A: 9, 'A#': 10, Bb: 10, B: 11 }
const CHORDS = [0, 5, 3, 4]
const TICKS_PER_BEAT = 480

function variableLength(value: number): number[] {
  let buffer = value & 0x7f
  const bytes: number[] = []
  while ((value >>= 7) > 0) {
    buffer <<= 8
    buffer |= ((value & 0x7f) | 0x80)
  }
  while (true) {
    bytes.push(buffer & 0xff)
    if (buffer & 0x80) buffer >>= 8
    else break
  }
  return bytes
}

function chunk(name: string, data: number[]) {
  const length = data.length
  return [...name.split('').map((char) => char.charCodeAt(0)), (length >>> 24) & 255, (length >>> 16) & 255, (length >>> 8) & 255, length & 255, ...data]
}

function renderTrack(events: Event[]) {
  const sorted = events.sort((a, b) => a.tick - b.tick || a.priority - b.priority)
  const output: number[] = []
  let previous = 0
  for (const event of sorted) {
    output.push(...variableLength(event.tick - previous), ...event.bytes)
    previous = event.tick
  }
  output.push(0, 0xff, 0x2f, 0)
  return chunk('MTrk', output)
}

function addNote(events: Event[], channel: number, note: number, start: number, duration: number, velocity = 78) {
  events.push({ tick: start, priority: 1, bytes: [0x90 | channel, note, velocity] })
  events.push({ tick: start + duration, priority: 0, bytes: [0x80 | channel, note, 0] })
}

function stableSeed(text: string) {
  let seed = 0
  for (let index = 0; index < text.length; index += 1) seed = (seed * 31 + text.charCodeAt(index)) >>> 0
  return seed
}

export function createMidi(prompt: string, tempo: number, key: string) {
  const rootName = key.split(' ')[0]
  const root = ROOTS[rootName] ?? 0
  const scaleType = key.toLowerCase().includes('minor') ? 'minor' : 'major'
  const scale = SCALES[scaleType]
  const seed = stableSeed(prompt)
  const harmony: Event[] = [{ tick: 0, priority: 0, bytes: [0xff, 0x03, 12, ...'Harmony Track'.split('').map((char) => char.charCodeAt(0))] }, { tick: 0, priority: 0, bytes: [0xc0, 0] }]
  const melody: Event[] = [{ tick: 0, priority: 0, bytes: [0xff, 0x03, 12, ...'Melody Track'.split('').map((char) => char.charCodeAt(0))] }, { tick: 0, priority: 0, bytes: [0xc1, 10] }]
  const chordIntervals = scaleType === 'minor' ? [[0, 3, 7], [5, 8, 12], [3, 7, 10], [7, 10, 14]] : [[0, 4, 7], [5, 9, 12], [4, 7, 11], [7, 11, 14]]
  const bars = 24

  for (let bar = 0; bar < bars; bar += 1) {
    const chordIndex = CHORDS[Math.floor(bar / 2) % CHORDS.length]
    const chord = chordIntervals[chordIndex]
    const start = bar * 4 * TICKS_PER_BEAT
    for (const interval of chord) addNote(harmony, 0, 48 + root + interval, start, 4 * TICKS_PER_BEAT - 12, 56)
    for (let beat = 0; beat < 4; beat += 1) {
      const shouldPlay = ((seed >>> ((bar + beat) % 24)) & 3) !== 0 || beat === 0
      if (!shouldPlay) continue
      const scaleIndex = (seed + bar * 3 + beat * 5 + (bar % 4 === 2 ? 2 : 0)) % scale.length
      const note = 60 + root + scale[scaleIndex] + ((bar % 8 >= 4) ? 12 : 0)
      addNote(melody, 1, note, start + beat * TICKS_PER_BEAT, TICKS_PER_BEAT * (beat === 3 ? 0.75 : 0.8), 72 + (bar % 4) * 4)
    }
  }

  const microsPerBeat = Math.round(60_000_000 / tempo)
  const tempoEvent: Event = { tick: 0, priority: 0, bytes: [0xff, 0x51, 0x03, (microsPerBeat >>> 16) & 255, (microsPerBeat >>> 8) & 255, microsPerBeat & 255] }
  const conductor = renderTrack([tempoEvent])
  const tracks = [...conductor, ...renderTrack(harmony), ...renderTrack(melody)]
  const header = [0x4d, 0x54, 0x68, 0x64, 0, 0, 0, 6, 0, 1, 0, 3, 1, 0xe0]
  return new Uint8Array([...header, ...tracks])
}
