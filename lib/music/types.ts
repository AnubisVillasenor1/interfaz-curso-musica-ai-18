/**
 * Tipos del contrato interno de generación musical.
 *
 * El frontend nunca conoce al proveedor: envía prompt/letras y recibe un
 * `taskId`; el estado llega por callback o por polling. Cambiar
 * `MUSIC_PROVIDER` no cambia ni el frontend ni la base de datos.
 */

export type MusicProviderId = 'huggingface' | 'replicate' | 'fal' | 'local' | 'suno'

export type MusicTaskStatus = 'queued' | 'processing' | 'completed' | 'failed'

export interface GenerateMusicRequest {
  prompt: string
  lyrics?: string
  customMode?: boolean
  instrumental?: boolean
  /** Segundos, 5..120. Los proveedores síncronos pueden recortar más abajo. */
  duration?: number
  /** URL completa (con firma) a la que el proveedor llama al terminar. */
  callbackUrl?: string
  title?: string
  genre?: string
}

export interface MusicTask {
  taskId: string
  status: MusicTaskStatus
  provider: MusicProviderId
  model?: string
  audioUrl?: string
  error?: string
  createdAt: string
  updatedAt: string
  metadata?: Record<string, unknown>
}

export interface ProviderGenerateResult {
  taskId: string
  provider: MusicProviderId
  model?: string
  /** Solo proveedores síncronos (Hugging Face): audio ya disponible. */
  audioUrl?: string
  status?: MusicTaskStatus
}

export interface MusicProvider {
  id: MusicProviderId
  generate(request: GenerateMusicRequest): Promise<ProviderGenerateResult>
}
