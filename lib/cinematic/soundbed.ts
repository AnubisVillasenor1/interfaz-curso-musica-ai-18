/**
 * Cama sonora de la intro: una pista real en background con un eco sutil.
 *
 * Cadena de señales:
 *   media → dry ────────────────► master → analyser → destination
 *         → send → lowpass → delay(0.11s) ─┬─► master
 *                                          └─ feedback 0.26 ↺ delay
 *
 * El retardo se queda en 0.11 s exactos y la réplica se oscurece con un
 * lowpass, para que el eco se sienta como aire alrededor de la canción y no
 * como un efecto. El analyser alimenta los shaders: la escena respira con el
 * audio real, no con una simulación.
 */

export type BedState = 'idle' | 'loading' | 'playing' | 'blocked' | 'off' | 'error'

export interface BedOptions {
  /** Segundos del eco. 0.11 = doble pulso suave, sin barrido metálico. */
  delaySeconds?: number
  /** Nivel de la réplica respecto a la señal seca (0-1). */
  wet?: number
  /** Realimentación del retardo (0-1); por encima de 0.4 empieza a sonar a infinito. */
  feedback?: number
  /** Corte de la réplica, en Hz. */
  dampHz?: number
  /** Volumen final de la mezcla (0-1). */
  master?: number
  /** Fundido de entrada, en segundos. */
  fadeIn?: number
}

const DEFAULTS: Required<BedOptions> = {
  delaySeconds: 0.11,
  wet: 0.3,
  feedback: 0.26,
  dampHz: 2600,
  master: 0.72,
  fadeIn: 1.4,
}

export class SoundBed {
  private element: HTMLAudioElement | null = null
  private context: AudioContext | null = null
  private analyser: AnalyserNode | null = null
  private master: GainNode | null = null
  private samples: Float32Array | null = null
  private nodes: AudioNode[] = []
  private state: BedState = 'idle'
  private readonly options: Required<BedOptions>
  private readonly listeners = new Set<(state: BedState) => void>()

  constructor(private readonly src: string, options: BedOptions = {}) {
    this.options = { ...DEFAULTS, ...options }
  }

  get playState(): BedState {
    return this.state
  }

  onState(listener: (state: BedState) => void): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  private setState(next: BedState): void {
    if (this.state === next) return
    this.state = next
    for (const listener of this.listeners) listener(next)
  }

  /** Crea el <audio> sin descargar todavía el archivo (7 MB no deben tocar el LCP). */
  prime(): void {
    if (this.element || typeof window === 'undefined') return
    const element = new Audio()
    element.src = this.src
    element.loop = true
    element.preload = 'none'
    element.crossOrigin = 'anonymous'
    this.element = element
  }

  /** Requiere un gesto del usuario: los navegadores bloquean el autoplay con sonido. */
  async enable(): Promise<BedState> {
    if (typeof window === 'undefined') return this.state
    this.prime()
    const element = this.element
    if (!element) return this.state

    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!Ctor) {
      this.setState('error')
      return this.state
    }

    try {
      if (!this.context) {
        this.setState('loading')
        element.preload = 'auto'
        const context = new Ctor()
        const source = context.createMediaElementSource(element)

        const dry = context.createGain()
        dry.gain.value = 1

        const send = context.createGain()
        send.gain.value = this.options.wet

        const damp = context.createBiquadFilter()
        damp.type = 'lowpass'
        damp.frequency.value = this.options.dampHz
        damp.Q.value = 0.4

        const delay = context.createDelay(Math.max(0.5, this.options.delaySeconds * 4))
        delay.delayTime.value = this.options.delaySeconds

        const feedback = context.createGain()
        feedback.gain.value = this.options.feedback

        const master = context.createGain()
        master.gain.value = 0

        const analyser = context.createAnalyser()
        analyser.fftSize = 512
        analyser.smoothingTimeConstant = 0.82

        source.connect(dry)
        dry.connect(master)
        source.connect(send)
        send.connect(damp)
        damp.connect(delay)
        delay.connect(feedback)
        feedback.connect(delay)
        delay.connect(master)
        master.connect(analyser)
        analyser.connect(context.destination)

        this.context = context
        this.master = master
        this.analyser = analyser
        this.samples = new Float32Array(analyser.fftSize)
        this.nodes = [source, dry, send, damp, delay, feedback, master, analyser]
      }

      await this.context.resume()
      await element.play()
      this.ramp(this.options.master, this.options.fadeIn)
      this.setState('playing')
    } catch {
      // autoplay bloqueado: queda listo para reintentar en el primer gesto real
      this.setState('blocked')
    }
    return this.state
  }

  /** Fundido de salida y pausa; el nodo de retardo se conserva para reabrir rápido. */
  disable(): void {
    const element = this.element
    if (!element) return
    this.ramp(0, 0.5)
    window.setTimeout(() => {
      try {
        element.pause()
        element.currentTime = 0
      } catch {
        /* nothing actionable */
      }
      void this.context?.suspend()
    }, 520)
    this.setState('off')
  }

  private ramp(to: number, seconds: number): void {
    const context = this.context
    const master = this.master
    if (!context || !master) return
    const now = context.currentTime
    try {
      master.gain.cancelScheduledValues(now)
      master.gain.setValueAtTime(master.gain.value, now)
      master.gain.linearRampToValueAtTime(to, now + Math.max(0.05, seconds))
    } catch {
      master.gain.value = to
    }
  }

  /** RMS normalizado 0-1 de la mezcla, para los shaders. */
  level(): number {
    const analyser = this.analyser
    const samples = this.samples
    if (!analyser || !samples || this.state !== 'playing') return 0
    if (analyser.getFloatTimeDomainData) {
      analyser.getFloatTimeDomainData(samples)
    } else {
      const bytes = new Uint8Array(samples.length)
      analyser.getByteTimeDomainData(bytes)
      for (let i = 0; i < bytes.length; i += 1) samples[i] = (bytes[i] - 128) / 128
    }
    let sum = 0
    for (let i = 0; i < samples.length; i += 1) sum += samples[i] * samples[i]
    const rms = Math.sqrt(sum / samples.length)
    // El RMS de una canción mezcla en ~0.05-0.25; se expande para el visual.
    return Math.max(0, Math.min(1, rms * 3.4))
  }

  /** Niveles por bandas (graves, medios, agudos) 0-1, para core/rings/field. */
  bands(): { low: number; mid: number; high: number } {
    const analyser = this.analyser
    if (!analyser || this.state !== 'playing') return { low: 0, mid: 0, high: 0 }
    const bins = new Uint8Array(analyser.frequencyBinCount)
    analyser.getByteFrequencyData(bins)
    const third = Math.floor(bins.length / 3)
    const avg = (from: number, to: number): number => {
      let total = 0
      for (let i = from; i < to; i += 1) total += bins[i]
      return total / Math.max(1, to - from) / 255
    }
    return { low: avg(0, third), mid: avg(third, third * 2), high: avg(third * 2, bins.length) }
  }

  dispose(): void {
    try {
      this.element?.pause()
      this.element?.removeAttribute('src')
      this.element?.load()
    } catch {
      /* nothing actionable */
    }
    for (const node of this.nodes) {
      try {
        node.disconnect()
      } catch {
        /* ya desconectado */
      }
    }
    this.nodes = []
    this.element = null
    this.analyser = null
    void this.context?.close().catch(() => undefined)
    this.context = null
    this.listeners.clear()
  }
}

/**
 * Pista de la intro: "Your Daily Dream" (Juniorsoundays · IA Music) recortada a
 * 34 s, que es exactamente la suma de los cuatro actos del guion.
 */
export const INTRO_TRACK = '/audio/intro-bed-34s.mp3'

/** Duración del bed recortado, en segundos (coincide con la presentación). */
export const INTRO_TRACK_SECONDS = 34
