/**
 * Motor de reproducción: arreglo → audio real en el navegador con Tone.js.
 * Todo se sintetiza localmente (0 APIs, 0 costo, 0 subida de datos).
 * Se importa Tone dinámicamente para que el bundle de servidor no toque Web Audio.
 */

import type { Arrangement, NoteEvent } from './arrangement'
import { analysisFromAnalyser, type SpectrumAnalysis } from './analysis'

export type EngineState = 'idle' | 'loading' | 'ready' | 'playing' | 'paused' | 'error'

export interface TrackControl {
  id: string
  muted: boolean
  solo: boolean
  level: number
}

interface VoiceHandle {
  id: string
  instrument: unknown
  analyser?: unknown
  outputGain: { gain: { value: number }; disconnect?: () => void } | null
}

type Tone = typeof import('tone')

let toneModule: Tone | null = null

async function loadTone(): Promise<Tone> {
  if (toneModule) return toneModule
  const mod = await import('tone')
  toneModule = mod
  return mod
}

/** Definiciones de timbre por voz de instrumento. Todas sintetizadas, sin samples. */
interface VoiceRecipe {
  oscillator: Record<string, unknown>
  envelope: Record<string, unknown>
  filter?: number
  /** distorsión suave 0-1 */
  drive?: number
  /** desintonización para unison (sintetizadores anchos) */
  detune?: number
  portamento?: number
}

const VOICE_RECIPES: Record<string, VoiceRecipe> = {
  'felt-piano': { oscillator: { type: 'triangle' }, envelope: { attack: 0.004, decay: 1.4, sustain: 0.06, release: 1.8 }, filter: 3400 },
  epiano: { oscillator: { type: 'sine' }, envelope: { attack: 0.006, decay: 1.1, sustain: 0.12, release: 1.4 }, filter: 2800, drive: 0.12 },
  organ: { oscillator: { type: 'sawtooth' }, envelope: { attack: 0.02, decay: 0.2, sustain: 0.85, release: 0.25 }, filter: 2400 },
  pad: { oscillator: { type: 'fatsawtooth', count: 3, spread: 32 }, envelope: { attack: 0.9, decay: 1.2, sustain: 0.7, release: 2.6 }, filter: 2000 },
  pluck: { oscillator: { type: 'triangle' }, envelope: { attack: 0.002, decay: 0.28, sustain: 0.02, release: 0.35 }, filter: 4200 },
  'bass-sub': { oscillator: { type: 'sine' }, envelope: { attack: 0.008, decay: 0.4, sustain: 0.75, release: 0.3 }, drive: 0.18 },
  'bass-mid': { oscillator: { type: 'sawtooth' }, envelope: { attack: 0.006, decay: 0.3, sustain: 0.6, release: 0.3 }, filter: 620, drive: 0.25 },
  'lead-sync': { oscillator: { type: 'square' }, envelope: { attack: 0.01, decay: 0.3, sustain: 0.55, release: 0.45 }, filter: 4600, detune: 8 },
  'lead-soft': { oscillator: { type: 'sine' }, envelope: { attack: 0.05, decay: 0.4, sustain: 0.5, release: 0.7 }, filter: 3600 },
  strings: { oscillator: { type: 'fatsawtooth', count: 4, spread: 42 }, envelope: { attack: 0.5, decay: 0.8, sustain: 0.8, release: 2.2 }, filter: 2600 },
  brass: { oscillator: { type: 'sawtooth' }, envelope: { attack: 0.07, decay: 0.3, sustain: 0.8, release: 0.5 }, filter: 3000, drive: 0.1 },
  choir: { oscillator: { type: 'sine' }, envelope: { attack: 0.5, decay: 0.6, sustain: 0.75, release: 1.6 }, filter: 1800 },
  'pluck-world': { oscillator: { type: 'triangle' }, envelope: { attack: 0.002, decay: 0.18, sustain: 0.01, release: 0.2 }, filter: 5200 },
  'guitar-clean': { oscillator: { type: 'sawtooth' }, envelope: { attack: 0.004, decay: 0.6, sustain: 0.16, release: 0.6 }, filter: 3200, drive: 0.06 },
  noise: { oscillator: { type: 'noise' }, envelope: { attack: 0.05, decay: 0.6, sustain: 0.25, release: 0.9 }, filter: 5200 },
  bell: { oscillator: { type: 'sine' }, envelope: { attack: 0.002, decay: 0.9, sustain: 0.02, release: 1.4 }, filter: 6400 },
  wind: { oscillator: { type: 'sine' }, envelope: { attack: 0.09, decay: 0.3, sustain: 0.55, release: 0.5 }, filter: 3800 },
}

export class MusicEngine {
  private Tone: typeof import('tone') | null = null
  private synth: Map<string, { notes: NoteEvent[]; handle: VoiceHandle }> = new Map()
  private drumSynths: Map<string, unknown> = new Map()
  private partHandles: unknown[] = []
  private masterGain: import('tone').Gain | null = null
  private reverb: import('tone').Reverb | null = null
  private delay: import('tone').FeedbackDelay | null = null
  private analyserNode: import('tone').Analyser | null = null
  private arrangement: Arrangement | null = null
  private controls: Map<string, TrackControl> = new Map()
  private globalLevel = 0.85
  private error = ''

  get state(): EngineState {
    if (this.error) return 'error'
    if (!this.Tone) return 'idle'
    if (!this.arrangement) return 'loading'
    return this.Tone.Transport.state === 'started' ? 'playing' : this.Tone.Transport.seconds > 0 ? 'paused' : 'ready'
  }

  get lastError(): string {
    return this.error
  }

  get analyser(): import('tone').Analyser | null {
    return this.analyserNode
  }

  get transportSeconds(): number {
    return this.Tone ? this.Tone.Transport.seconds : 0
  }

  get duration(): number {
    return this.arrangement?.durationSeconds ?? 0
  }

  /** Segundos por pulso del arreglo actual (base de toda la temporización). */
  private get spb(): number {
    return 60 / (this.arrangement?.bpm ?? 120)
  }

  /** Crea el grafo de audio y programa todas las notas del arreglo. */
  async load(arrangement: Arrangement): Promise<void> {
    const Tone = await loadTone()
    this.Tone = Tone
    this.error = ''
    this.disposeVoices()
    this.arrangement = arrangement

    await Tone.start().catch(() => {
      /* el navegador exige un gesto del usuario; se reintenta en play() */
    })

    Tone.Transport.cancel()
    Tone.Transport.bpm.value = arrangement.bpm
    Tone.Transport.swing = arrangement.genre.swing
    if ('swingSubdivision' in Tone.Transport) {
      ;(Tone.Transport as unknown as { swingSubdivision: string }).swingSubdivision = '8n'
    }

    const master = new Tone.Gain(this.globalLevel)
    const limiter = new Tone.Limiter(-1.2)
    const reverb = new Tone.Reverb({ decay: 2.6, preDelay: 0.02, wet: 0.18 })
    const delay = new Tone.FeedbackDelay('8n.', 0.22)
    delay.wet.value = 0
    const analyser = new Tone.Analyser('fft', 1024)

    reverb.connect(master)
    delay.connect(master)
    master.chain(limiter, Tone.Destination)
    master.connect(analyser)

    this.masterGain = master
    this.reverb = reverb
    this.delay = delay
    this.analyserNode = analyser

    for (const track of arrangement.tracks) {
      this.controls.set(track.id, this.controls.get(track.id) ?? { id: track.id, muted: false, solo: false, level: 1 })
      const voice = this.buildVoice(Tone, track.voice, track)
      if (!voice) continue
      const gate = new Tone.Gain(track.level)
      voice.connect(gate)
      gate.connect(master)
      if (track.reverb > 0.02 && reverb) {
        const send = new Tone.Gain(track.reverb * 0.6)
        voice.connect(send)
        send.connect(reverb)
      }
      if (track.delay > 0.02 && delay) {
        const send = new Tone.Gain(track.delay * 0.5)
        voice.connect(send)
        send.connect(delay)
        delay.wet.value = Math.max(delay.wet.value, 0.25)
      }
      this.scheduleTrack(Tone, track, voice)
      this.synth.set(track.id, { notes: track.notes, handle: { id: track.id, instrument: voice, outputGain: gate } })
    }

    // Batería sintetizada (kick/snare/hats) — sin samples externos.
    this.buildDrums(Tone, arrangement, master)
    this.applySoloMute()
  }

  private buildVoice(Tone: typeof import('tone'), voiceName: string, track: Arrangement['tracks'][number]): import('tone').Synth | import('tone').PolySynth | null {
    const recipe = VOICE_RECIPES[voiceName] ?? VOICE_RECIPES.pad
    const isMono = track.role === 'bass-sub' || track.role === 'bass-mid' || track.role === 'lead'
    const options = {
      oscillator: recipe.oscillator,
      envelope: recipe.envelope,
      ...(recipe.portamento ? { portamento: recipe.portamento } : {}),
    }
    let instrument: import('tone').Synth | import('tone').PolySynth
    if (isMono) {
      instrument = new Tone.Synth(options as never)
    } else {
      instrument = new Tone.PolySynth(Tone.Synth, options as never)
      const mono = instrument as unknown as import('tone').PolySynth
      mono.maxPolyphony = 6
    }
    let node: unknown = instrument
    if (recipe.filter) {
      const filter = new Tone.Filter(recipe.filter, 'lowpass')
      filter.Q.value = 0.7
      ;(node as { connect: (d: unknown) => void }).connect(filter)
      node = filter
    }
    if (recipe.drive) {
      const shaper = new Tone.WaveShaper((x) => Math.tanh(x * (1 + recipe.drive! * 3)))
      ;(node as { connect: (d: unknown) => void }).connect(shaper)
      node = shaper
    }
    if (recipe.detune) {
      const chorus = new Tone.Chorus(1.6, 2.4, 0.28).start()
      ;(node as { connect: (d: unknown) => void }).connect(chorus)
      node = chorus
    }
    return node as import('tone').Synth
  }

  private scheduleTrack(Tone: typeof import('tone'), track: Arrangement['tracks'][number], instrument: unknown): void {
    if (!track.notes.length) return
    const beat = this.spb
    const events = track.notes
      .slice()
      .sort((a, b) => a.beat - b.beat)
      .map((n) => [
        n.beat * beat,
        {
          note: Tone.Frequency(n.midi, 'midi').toNote(),
          dur: Math.max(0.08, n.duration * beat * 0.94),
          vel: n.velocity,
        },
      ] as const)

    const mono = track.role === 'bass-sub' || track.role === 'bass-mid' || track.role === 'lead'
    const part = new Tone.Part((time, value) => {
      const target = instrument as { triggerAttackRelease?: (n: string, d: number, t: number, v?: number) => void }
      target.triggerAttackRelease?.(value.note, value.dur, time, value.vel)
    }, events as never)
    if (mono) (part as unknown as { monophonic: boolean }).monophonic = true
    part.start(0)
    this.partHandles.push(part)
  }

  private buildDrums(Tone: typeof import('tone'), arrangement: Arrangement, master: import('tone').Gain): void {
    const kick = new Tone.MembraneSynth({ pitchDecay: 0.05, octaves: 6, envelope: { attack: 0.001, decay: 0.42, sustain: 0.01, release: 0.2 } })
    const kickGain = new Tone.Gain(0.9)
    kick.connect(kickGain)
    kickGain.connect(master)

    const snare = new Tone.NoiseSynth({ noise: { type: 'white' }, envelope: { attack: 0.001, decay: 0.16, sustain: 0 } })
    const snareFilter = new Tone.Filter(1900, 'bandpass')
    const snareGain = new Tone.Gain(0.6)
    snare.connect(snareFilter)
    snareFilter.connect(snareGain)
    snareGain.connect(master)

    const metal = new Tone.MetalSynth({ envelope: { attack: 0.001, decay: 0.09, release: 0.06 }, harmonicity: 4.1, modulationIndex: 22, resonance: 4200, octaves: 1.5 })
    const hatGain = new Tone.Gain(0.28)
    metal.connect(hatGain)
    hatGain.connect(master)

    const openGain = new Tone.Gain(0.22)
    metal.connect(openGain)
    openGain.connect(master)

    const clap = new Tone.NoiseSynth({ noise: { type: 'pink' }, envelope: { attack: 0.002, decay: 0.12, sustain: 0 } })
    const clapFilter = new Tone.Filter(2400, 'bandpass')
    const clapGain = new Tone.Gain(0.42)
    clap.connect(clapFilter)
    clapFilter.connect(clapGain)
    clapGain.connect(master)

    const lowTom = new Tone.MembraneSynth({ pitchDecay: 0.02, octaves: 3, envelope: { attack: 0.001, decay: 0.3, sustain: 0 } })
    const tomGain = new Tone.Gain(0.45)
    lowTom.connect(tomGain)
    tomGain.connect(master)

    this.drumSynths.set('kick', kick)
    this.drumSynths.set('snare', snare)
    this.drumSynths.set('hat', metal)
    this.drumSynths.set('clap', clap)
    this.drumSynths.set('tom', lowTom)

    const drums = arrangement.drums.slice().sort((a, b) => a.beat - b.beat)

    const route = (voice: string): { synth: unknown; note?: string; decay?: string } => {
      switch (voice) {
        case 'kick': return { synth: kick, note: 'C1' }
        case 'snare': return { synth: snare }
        case 'clap': return { synth: clap }
        case 'hat': return { synth: metal, note: 'C4' }
        case 'openhat': return { synth: metal, note: 'C5' }
        case 'ride': return { synth: metal, note: 'G4' }
        case 'rim': return { synth: snare }
        case 'tom': return { synth: lowTom, note: 'A1' }
        default: return { synth: snare }
      }
    }

    const beat = this.spb
    const events = drums.map((d) => [d.beat * beat, d] as const)
    const part = new Tone.Part((time, value) => {
      const target = route(value.voice)
      const s = target.synth as { triggerAttackRelease?: (...args: (string | number)[]) => void }
      if (value.voice === 'kick') s.triggerAttackRelease?.('C1', '8n', time, value.velocity)
      else if (value.voice === 'tom') s.triggerAttackRelease?.('A1', '8n', time, value.velocity * 0.8)
      else if (value.voice === 'snare' || value.voice === 'clap' || value.voice === 'rim') s.triggerAttackRelease?.('8n', time, value.velocity)
      else if (value.voice === 'openhat' || value.voice === 'ride') s.triggerAttackRelease?.(target.note ?? 'C4', '2n', time, value.velocity * 0.5)
      else s.triggerAttackRelease?.('C4', '16n', time, value.velocity * 0.6)
    }, events as never)
    part.start(0)
    this.partHandles.push(part)
  }

  private applySoloMute(): void {
    const anySolo = [...this.controls.values()].some((c) => c.solo)
    for (const [id, entry] of this.synth) {
      const control = this.controls.get(id)
      if (!control) continue
      const audible = anySolo ? control.solo : !control.muted
      const gain = entry.handle.outputGain as unknown as import('tone').Gain | null
      if (gain) gain.gain.value = audible ? control.level : 0
    }
  }

  setTrackControl(id: string, patch: Partial<TrackControl>): void {
    const current = this.controls.get(id) ?? { id, muted: false, solo: false, level: 1 }
    this.controls.set(id, { ...current, ...patch })
    this.applySoloMute()
  }

  getTrackControls(): TrackControl[] {
    return [...this.controls.values()]
  }

  setMasterLevel(value: number): void {
    this.globalLevel = Math.max(0, Math.min(1, value))
    if (this.masterGain) this.masterGain.gain.rampTo(this.globalLevel, 0.08)
  }

  get masterLevel(): number {
    return this.globalLevel
  }

  async play(fromBeat = 0): Promise<void> {
    if (!this.Tone) return
    const Tone = this.Tone
    await Tone.start().catch(() => undefined)
    Tone.Transport.bpm.value = this.arrangement?.bpm ?? Tone.Transport.bpm.value
    const seconds = this.beatToSeconds(fromBeat)
    if (Number.isFinite(seconds) && seconds > 0) Tone.Transport.seconds = seconds
    Tone.Transport.start('+0.05')
    this.error = ''
  }

  pause(): void {
    this.Tone?.Transport.pause()
  }

  stop(): void {
    if (!this.Tone) return
    this.Tone.Transport.stop()
    this.Tone.Transport.seconds = 0
  }

  seekBeat(beat: number): void {
    if (!this.Tone) return
    const seconds = this.beatToSeconds(beat)
    if (Number.isFinite(seconds)) this.Tone.Transport.seconds = Math.max(0, seconds)
  }

  private beatToSeconds(beat: number): number {
    const bpm = this.arrangement?.bpm ?? 100
    const beatsPerBar = this.arrangement?.beatsPerBar ?? 4
    void beatsPerBar
    return (beat / bpm) * 60
  }

  /** Progreso 0-1 para la barra de reproducción. */
  progress(): number {
    if (!this.Tone || !this.arrangement || this.arrangement.durationSeconds <= 0) return 0
    return Math.min(1, this.Tone.Transport.seconds / this.arrangement.durationSeconds)
  }

  currentBeat(): number {
    if (!this.Tone || !this.arrangement) return 0
    return (this.Tone.Transport.seconds * this.arrangement.bpm) / 60
  }

  /**
   * Datos FFT crudos (dB) del analizador maestro, para visualizadores y para
   * que las escenas 3D reaccionen a la música. Null si aún no hay grafo.
   */
  analyserData(): Float32Array | null {
    const raw = this.analyserNode?.getValue?.() as unknown
    if (!raw) return null
    if (raw instanceof Float32Array) return raw
    if (Array.isArray(raw)) return Float32Array.from(raw as number[])
    return null
  }

  /**
   * Análisis armónico del frame actual: chroma, tonalidad, contraste y nivel.
   *
   * Usa el mismo `Analyser` que alimenta el visualizador, así que no añade un
   * segundo grafo de audio ni pide permiso al usuario. Devuelve `null` antes de
   * cargar un arreglo o si el navegador no entrega FFT.
   */
  hybridAnalysis(): SpectrumAnalysis | null {
    const data = this.analyserData()
    if (!data?.length) return null
    const sampleRate = this.Tone?.getContext().sampleRate ?? 48_000
    return analysisFromAnalyser(data, sampleRate, data.length * 2)
  }

  /** Nivel medio de energía (0-1) derivado del FFT en dB; alimenta pulsos de la escena. */
  level(): number {
    const data = this.analyserData()
    if (!data || !data.length) return 0
    let sum = 0
    for (let i = 0; i < data.length; i += 1) {
      // El analizador entrega dB (típicamente -100..0); la magnitud es 10^(dB/20).
      const db = data[i]
      sum += Math.pow(10, Math.max(-4, Math.min(0, db / 20)))
    }
    return Math.max(0, Math.min(1, sum / data.length))
  }

  /** Último error de carga/reproducción, para la UI. */
  getError(): string {
    return this.error
  }

  private disposeVoices(): void {
    for (const handle of this.partHandles) {
      const p = handle as { dispose: () => void }
      try { p.dispose() } catch { /* ya liberado */ }
    }
    this.partHandles = []
    for (const [, entry] of this.synth) {
      const inst = entry.handle.instrument as { dispose?: () => void } | null
      try { inst?.dispose?.() } catch { /* ignorar */ }
      const gain = entry.handle.outputGain as unknown as import('tone').Gain | null
      try { gain?.dispose?.() } catch { /* ignorar */ }
    }
    this.synth.clear()
    for (const [, s] of this.drumSynths) {
      const inst = s as { dispose?: () => void }
      try { inst.dispose?.() } catch { /* ignorar */ }
    }
    this.drumSynths.clear()
    for (const node of [this.masterGain, this.reverb, this.delay, this.analyserNode]) {
      const n = node as { dispose?: () => void } | null
      try { n?.dispose?.() } catch { /* ignorar */ }
    }
    this.masterGain = null
    this.reverb = null
    this.delay = null
    this.analyserNode = null
  }

  dispose(): void {
    this.stop()
    this.disposeVoices()
    this.arrangement = null
    this.controls.clear()
  }

  /** Renderiza el arreglo a WAV en el propio navegador (OfflineAudioContext). */
  async renderToFile(arrangement: Arrangement, onProgress?: (p: number) => void): Promise<Blob> {
    const Tone = await loadTone()
    onProgress?.(0.05)
    const seconds = Math.ceil(arrangement.durationSeconds) + 3
    const offline = new Tone.OfflineContext(2, seconds, 44_100)
    const destination = new Tone.Gain(0.9).connect(offline.destination as never)

    let progress = 0.1
    for (const track of arrangement.tracks) {
      const recipe = VOICE_RECIPES[track.voice] ?? VOICE_RECIPES.pad
      const mono = track.role === 'bass-sub' || track.role === 'bass-mid' || track.role === 'lead'
      const instrument = mono
        ? new Tone.Synth({ oscillator: recipe.oscillator, envelope: recipe.envelope })
        : new Tone.PolySynth(Tone.Synth, { oscillator: recipe.oscillator, envelope: recipe.envelope })
      const chain: unknown[] = [instrument]
      if (recipe.filter) {
        const f = new Tone.Filter(recipe.filter, 'lowpass')
        chain.push(f)
      }
      const gain = new Tone.Gain(track.level)
      chain.push(gain)
      for (let i = 0; i < chain.length - 1; i += 1) {
        ;(chain[i] as { connect: (d: unknown) => void }).connect(chain[i + 1])
      }
      ;(chain[chain.length - 1] as { connect: (d: unknown) => void }).connect(destination)
      const target = instrument as { triggerAttack?: (n: string, t: number, v?: number) => void; triggerRelease?: (n: string, t: number) => void }
      for (const n of track.notes) {
        const when = (n.beat / arrangement.bpm) * 60
        target.triggerAttack?.(Tone.Frequency(n.midi, 'midi').toNote(), when, n.velocity)
        target.triggerRelease?.(Tone.Frequency(n.midi, 'midi').toNote(), when + Math.max(0.06, n.duration * (60 / arrangement.bpm) * 0.92))
      }
      progress += 0.05
      onProgress?.(Math.min(0.8, progress))
    }

    const kick = new Tone.MembraneSynth().connect(destination as never)
    const snare = new Tone.NoiseSynth({ noise: { type: 'white' }, envelope: { attack: 0.001, decay: 0.16, sustain: 0 } }).connect(destination as never)
    const hats = new Tone.MetalSynth({ envelope: { attack: 0.001, decay: 0.09, release: 0.06 } }).connect(destination as never)
    for (const d of arrangement.drums) {
      const when = (d.beat / arrangement.bpm) * 60
      if (d.voice === 'kick') kick.triggerAttackRelease('C1', '8n', when, d.velocity)
      else if (d.voice === 'snare' || d.voice === 'clap' || d.voice === 'rim') snare.triggerAttackRelease('8n', when, d.velocity)
      else hats.triggerAttackRelease('C4', '16n', when, d.velocity * 0.6)
    }

    onProgress?.(0.9)
    const buffer = await offline.render()
    onProgress?.(1)
    const wav = bufferToWav(buffer)
    for (const node of [kick, snare, hats, destination]) {
      const n = node as { dispose?: () => void }
      try { n.dispose?.() } catch { /* ignorar */ }
    }
    return new Blob([wav], { type: 'audio/wav' })
  }
}

/** Estructura mínima que necesita el codificador WAV; la cumplen AudioBuffer y ToneAudioBuffer. */
export interface WavSource {
  readonly numberOfChannels: number
  readonly length: number
  readonly sampleRate: number
  getChannelData(channel: number): Float32Array
}

/** Convierte un búfer (AudioBuffer nativo o ToneAudioBuffer) a WAV PCM 16-bit, sin librerías externas. */
export function bufferToWav(buffer: WavSource): ArrayBuffer {
  const channels = Math.min(2, buffer.numberOfChannels)
  const length = buffer.length
  const sampleRate = buffer.sampleRate
  const bytesPerSample = 2
  const blockAlign = channels * bytesPerSample
  const dataSize = length * blockAlign
  const view = new DataView(new ArrayBuffer(44 + dataSize))

  const writeString = (offset: number, text: string): void => {
    for (let i = 0; i < text.length; i += 1) view.setUint8(offset + i, text.charCodeAt(i))
  }
  writeString(0, 'RIFF')
  view.setUint32(4, 36 + dataSize, true)
  writeString(8, 'WAVE')
  writeString(12, 'fmt ')
  view.setUint32(16, 16, true)
  view.setUint16(20, 1, true)
  view.setUint16(22, channels, true)
  view.setUint32(24, sampleRate, true)
  view.setUint32(28, sampleRate * blockAlign, true)
  view.setUint16(32, blockAlign, true)
  view.setUint16(34, 8 * bytesPerSample, true)
  writeString(36, 'data')
  view.setUint32(40, dataSize, true)

  const data = Array.from({ length: channels }, (_, c) => buffer.getChannelData(c))
  let offset = 44
  for (let i = 0; i < length; i += 1) {
    for (let c = 0; c < channels; c += 1) {
      const sample = Math.max(-1, Math.min(1, data[c][i]))
      view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true)
      offset += 2
    }
  }
  return view.buffer
}

export const engine = new MusicEngine()
