/**
 * Cama sonora de la intro: la pista real de TAMV con una serie de ecos
 * degradados, no un solo rebote.
 *
 * Cadena de señales:
 *
 *   media → trim(-14 dB) ─┬─ dry (x2) ──────────────────────────────┐
 *                         ├─ send1 (x2.0) → lp 5200 → ret 0.12 s ───┤
 *                         ├─ send2 (x1.2) → lp 3400 → ret 0.24 s ───┼─ mix → guard → master → analyser → destino
 *                         └─ send3 (x0.8) → lp 2200 → ret 0.36 s ───┘
 *
 * La pista principal va a ganancia 2 y la serie de ecos a 4, repartida en tres
 * tomas que se atenúan y se oscurecen una tras otra: eso es el degradado. El
 * retardo base es 0.12 s exactos, así que las tomas caen en 0.12 / 0.24 / 0.36.
 *
 * El recorte de entrada no es cosmético: `tecnologia_tamv.mp3` llega masterizado
 * a -7.9 LUFS con pico real de +1.0 dBFS, o sea que ya satura en origen. Sin
 * bajar la entrada, las ganancias 2 y 4 empujarían la suma más de 5 dB por
 * encima del techo y el navegador recortaría. Medido con la misma topología
 * fuera de línea: con -14 dB de trim la mezcla pica en -3.2 dBFS, así que el
 * limitador queda como seguro y no como trabajo.
 *
 * El analyser alimenta los shaders: la escena respira con el audio real.
 */

export type BedState = 'idle' | 'loading' | 'playing' | 'blocked' | 'off' | 'error'

export interface BedOptions {
  /** Retardo base de la serie de ecos, en segundos. Las tomas caen en x1, x2 y x3. */
  delaySeconds?: number
  /** Ganancia de la pista principal (la señal seca). 2 = +6 dB sobre la entrada recortada. */
  mainGain?: number
  /** Ganancia total de la serie de ecos, repartida entre las tomas según `tapMix`. */
  echoGain?: number
  /** Peso relativo de cada toma (0.12 / 0.24 / 0.36 s). Se renormaliza por su suma. */
  tapMix?: number[]
  /** Corte en Hz de cada toma: la escalera que produce el degradado tonal. */
  tapDampHz?: number[]
  /** Atenuación de entrada (lineal). 0.2 = -14 dB, el punto donde la mezcla pica en -3.2 dBFS. */
  trim?: number
  /** Volumen final de la mezcla (0-1). */
  master?: number
  /** Fundido de entrada, en segundos. */
  fadeIn?: number
  /** Fundido de salida, en segundos. */
  fadeOut?: number
  /** Seguro anticlip en la suma. Se usa apenas, porque el nivel ya viene medido. */
  limiter?: { thresholdDb: number; kneeDb: number; ratio: number; attack: number; release: number }
}

type BedDefaults = Required<Omit<BedOptions, 'limiter'>> & { limiter: NonNullable<BedOptions['limiter']> }

const DEFAULTS: BedDefaults = {
  delaySeconds: 0.12,
  mainGain: 2,
  echoGain: 4,
  tapMix: [0.5, 0.3, 0.2],
  tapDampHz: [5200, 3400, 2200],
  trim: 0.2,
  master: 1,
  fadeIn: 1.2,
  fadeOut: 0.5,
  limiter: { thresholdDb: -2, kneeDb: 6, ratio: 12, attack: 0.004, release: 0.18 },
}

export class SoundBed {
  private element: HTMLAudioElement | null = null
  private context: AudioContext | null = null
  private analyser: AnalyserNode | null = null
  private master: GainNode | null = null
  private samples: Float32Array | null = null
  private freqBins: Uint8Array | null = null
  private nodes: AudioNode[] = []
  private state: BedState = 'idle'
  private readonly options: BedDefaults
  /** Fracciones ya normalizadas de `echoGain` para cada toma. */
  private readonly tapWeights: number[]
  private readonly listeners = new Set<(state: BedState) => void>()

  constructor(private readonly src: string, options: BedOptions = {}) {
    this.options = { ...DEFAULTS, ...options, limiter: { ...DEFAULTS.limiter, ...(options.limiter ?? {}) } }

    // `tapMix` es relativa: se renormaliza para que la suma de las tres tomas
    // entregue exactamente `echoGain`, independientemente de cuántas se pidan.
    const mix = this.options.tapMix.length ? this.options.tapMix : [1]
    const total = mix.reduce((sum, weight) => sum + Math.max(0, weight), 0)
    this.tapWeights = total > 0 ? mix.map((weight) => Math.max(0, weight) / total) : [1]
  }

  get playState(): BedState {
    return this.state
  }

  /** Duración declarada de la pista, para que el guion y el audio no diverjan. */
  get trackSeconds(): number {
    const element = this.element
    const seconds = element?.duration
    return Number.isFinite(seconds) && seconds && seconds > 0 ? seconds : INTRO_TRACK_SECONDS
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

  /** Crea el <audio> sin descargar todavía el archivo (1.4 MB no deben tocar el LCP). */
  prime(): void {
    if (this.element || typeof window === 'undefined') return
    const element = new Audio()
    element.src = this.src
    element.loop = true
    element.preload = 'none'
    element.crossOrigin = 'anonymous'
    this.element = element
  }

  /**
   * ¿Se puede arrancar la reproducción sin esperar un gesto?
   *
   * Dos señales fiables: `navigator.userActivation.hasBeenActive` (hubo un
   * clic/tecla, o sea que el retry del `pointerdown` ya puede descargar) y el
   * permiso `autoplay` en `granted` (engagement alto: el navegador deja sonar
   * solo). Si ninguna se cumple, el autoplay está bloqueado y conviene NO bajar
   * la pista todavía.
   */
  private async autoplayAllowed(): Promise<boolean> {
    if (typeof navigator === 'undefined') return false
    const nav = navigator as Navigator & { userActivation?: { hasBeenActive?: boolean } }
    if (nav.userActivation?.hasBeenActive) return true
    try {
      const status = await navigator.permissions.query({ name: 'autoplay' as PermissionName })
      return status.state === 'granted'
    } catch {
      return false
    }
  }

  /** Requiere un gesto del usuario: los navegadores bloquean el autoplay con sonido. */
  async enable(): Promise<BedState> {
    if (typeof window === 'undefined') return this.state
    this.prime()
    const element = this.element
    if (!element) return this.state

    // La pista son 1.4 MB: no se descargan hasta que el navegador realmente
    // permita reproducir (autoplay concedido) o hasta que haya un gesto real.
    // Sin esta guarda el montaje forzaba `preload='auto'` y el download incluso
    // cuando el autoplay estaba bloqueado y el sonido no iba a sonar.
    if (!(await this.autoplayAllowed())) {
      this.setState('blocked')
      return this.state
    }

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

        // Recorte de entrada: la pista llega satura de fábrica y las ganancias
        // 2 / 4 se aplican después, sobre una señal que ya cabe en el techo.
        const trim = context.createGain()
        trim.gain.value = this.options.trim

        const dry = context.createGain()
        dry.gain.value = this.options.mainGain

        // Suma: aquí confluyen la pista seca y cada toma del eco. La suma es
        // aditiva, por eso el nivel final se midió fuera de línea antes de fijar
        // el trim.
        const mixNode = context.createGain()
        mixNode.gain.value = 1

        const { limiter } = this.options
        const guard = context.createDynamicsCompressor()
        guard.threshold.value = limiter.thresholdDb
        guard.knee.value = limiter.kneeDb
        guard.ratio.value = limiter.ratio
        guard.attack.value = limiter.attack
        guard.release.value = limiter.release

        const master = context.createGain()
        master.gain.value = 0

        const analyser = context.createAnalyser()
        analyser.fftSize = 1024
        analyser.smoothingTimeConstant = 0.8

        const echoNodes: AudioNode[] = []
        this.tapWeights.forEach((weight, i) => {
          const send = context.createGain()
          send.gain.value = this.options.echoGain * weight

          const damp = context.createBiquadFilter()
          damp.type = 'lowpass'
          damp.frequency.value = this.options.tapDampHz[Math.min(i, this.options.tapDampHz.length - 1)] ?? 5200
          damp.Q.value = 0.35

          // Multiplos del retardo base: 0.12 → 0.24 → 0.36 s. Sin realimentación;
          // el degradado lo hacen el nivel y el filtro, no una cola infinita.
          const delay = context.createDelay(Math.max(0.5, this.options.delaySeconds * (this.tapWeights.length + 1)))
          delay.delayTime.value = this.options.delaySeconds * (i + 1)

          trim.connect(send)
          send.connect(damp)
          damp.connect(delay)
          delay.connect(mixNode)
          echoNodes.push(send, damp, delay)
        })

        source.connect(trim)
        trim.connect(dry)
        dry.connect(mixNode)
        mixNode.connect(guard)
        guard.connect(master)
        master.connect(analyser)
        analyser.connect(context.destination)

        this.context = context
        this.master = master
        this.analyser = analyser
        this.samples = new Float32Array(analyser.fftSize)
        this.nodes = [source, trim, dry, mixNode, guard, master, analyser, ...echoNodes]
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

  /** Fundido de salida y pausa; la cadena se conserva para reabrir rápido. */
  disable(): void {
    const element = this.element
    if (!element) return
    const out = this.options.fadeOut
    this.ramp(0, out)
    window.setTimeout(() => {
      try {
        element.pause()
        element.currentTime = 0
      } catch {
        /* nothing actionable */
      }
      void this.context?.suspend()
    }, Math.round(out * 1000) + 20)
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

  /** Copia la ventana temporal al buffer propio; false si no hay audio sonando. */
  private fillTimeDomain(): boolean {
    const analyser = this.analyser
    const samples = this.samples
    if (!analyser || !samples || this.state !== 'playing') return false
    if (analyser.getFloatTimeDomainData) {
      analyser.getFloatTimeDomainData(samples)
    } else {
      const bytes = new Uint8Array(samples.length)
      analyser.getByteTimeDomainData(bytes)
      for (let i = 0; i < bytes.length; i += 1) samples[i] = (bytes[i] - 128) / 128
    }
    return true
  }

  /**
   * RMS normalizado 0-1 de la mezcla, para los shaders.
   *
   * La mezcla real ronda 0.05-0.16 de RMS; se expande con un factor alto porque
   * los visuales necesitan recorrer todo el rango entre el verso y el drop.
   */
  level(): number {
    const samples = this.samples
    if (!this.fillTimeDomain() || !samples) return 0
    let sum = 0
    for (let i = 0; i < samples.length; i += 1) sum += samples[i] * samples[i]
    const rms = Math.sqrt(sum / samples.length)
    return Math.max(0, Math.min(1, rms * 6.2))
  }

  /** Pico absoluto de la ventana, 0-1. Sirve para los golpes de luz puntuales. */
  peak(): number {
    const samples = this.samples
    if (!this.fillTimeDomain() || !samples) return 0
    let highest = 0
    for (let i = 0; i < samples.length; i += 1) {
      const abs = Math.abs(samples[i])
      if (abs > highest) highest = abs
    }
    return Math.max(0, Math.min(1, highest))
  }

  /**
   * Niveles por bandas (graves, medios, agudos) 0-1, para core/rings/field.
   *
   * Los tercios de `frequencyBinCount` no servían: con fftSize 1024 el primer
   * tercio llega a 8 kHz, o sea que el "grave" mediaba el brillo entero. Aquí
   * los bordes son frecuencias reales y el promedio sale ponderado por la
   * pendiente espectral, para que los agudos no queden siempre en cero.
   */
  bands(): { low: number; mid: number; high: number } {
    const analyser = this.analyser
    const context = this.context
    if (!analyser || !context || this.state !== 'playing') return { low: 0, mid: 0, high: 0 }

    const bins = this.freqBins ?? (this.freqBins = new Uint8Array(analyser.frequencyBinCount))
    analyser.getByteFrequencyData(bins)

    const hzPerBin = context.sampleRate / analyser.fftSize
    const indexFor = (hz: number): number => Math.max(1, Math.min(bins.length, Math.round(hz / hzPerBin)))
    const avg = (fromHz: number, toHz: number, tilt: number): number => {
      const from = indexFor(fromHz)
      const to = Math.max(from + 1, indexFor(toHz))
      let total = 0
      for (let i = from; i < to; i += 1) total += bins[i] * (1 + tilt * (i - from) / Math.max(1, to - from))
      // Normalizador: la suma de la pendiente sobre el rango, más el suelo de 255.
      const shape = 1 + tilt / 2
      return total / Math.max(1, to - from) / 255 / shape
    }
    return {
      low: avg(50, 190, 0),
      mid: avg(190, 2200, -0.35),
      high: avg(2200, 11000, 0.9),
    }
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
    this.freqBins = null
    void this.context?.close().catch(() => undefined)
    this.context = null
    this.listeners.clear()
  }
}

/**
 * Pista de la intro: `tecnologia_tamv.mp3` normalizada a -14 LUFS y recortada a
 * 60 s, que es exactamente la suma de los seis actos del guion. El fundido de
 * entrada (0.7 s) y el de salida (2.4 s desde 57.6 s) van quemados en el archivo,
 * así que la cadena Web Audio no necesita envelopear el principio ni el final.
 */
export const INTRO_TRACK = '/audio/1110-audio.mp3'

/** Duración del bed recortado, en segundos (coincide con la presentación). */
export const INTRO_TRACK_SECONDS = 60
