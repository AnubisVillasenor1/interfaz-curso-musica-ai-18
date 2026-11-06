import type { MusicProvider, MusicProviderId } from '@/lib/music/types'
import { FalProvider } from '@/lib/music/providers/fal'
import { HuggingFaceProvider } from '@/lib/music/providers/huggingface'
import { LocalMusicProvider } from '@/lib/music/providers/local'
import { ProviderNotConfiguredError } from '@/lib/music/providers/errors'
import { ReplicateProvider } from '@/lib/music/providers/replicate'
import { SunoProvider } from '@/lib/music/providers/suno'

/**
 * Selección del proveedor de música (§2 del manual).
 *
 * - `MUSIC_PROVIDER` explícito manda (`huggingface|replicate|fal|local|suno`).
 * - Sin variable: autodetección en orden de coste — `API_KEY` (histórico) →
 *   `LOCAL_MUSIC_API_URL` → `HUGGINGFACEHUB_API_TOKEN` → `local` (que fallará
 *   con 503 honesto si tampoco está).
 * - Valor desconocido: error de configuración visible, no proveedor adivinado.
 */
export function getMusicProviderId(): MusicProviderId {
  const explicit = process.env.MUSIC_PROVIDER?.trim().toLowerCase()
  if (explicit) {
    if (['huggingface', 'replicate', 'fal', 'local', 'suno'].includes(explicit)) {
      return explicit as MusicProviderId
    }
    throw new ProviderNotConfiguredError(`Proveedor de música no soportado: ${explicit}`)
  }
  if (process.env.API_KEY) return 'suno'
  if (process.env.LOCAL_MUSIC_API_URL) return 'local'
  if (process.env.HUGGINGFACEHUB_API_TOKEN) return 'huggingface'
  if (process.env.REPLICATE_API_TOKEN) return 'replicate'
  if (process.env.FAL_KEY) return 'fal'
  return 'local'
}

export function getMusicProvider(): MusicProvider {
  switch (getMusicProviderId()) {
    case 'huggingface':
      return new HuggingFaceProvider()
    case 'replicate':
      return new ReplicateProvider()
    case 'fal':
      return new FalProvider()
    case 'local':
      return new LocalMusicProvider()
    case 'suno':
      return new SunoProvider()
    default:
      throw new ProviderNotConfiguredError(`Proveedor de música no soportado: ${process.env.MUSIC_PROVIDER}`)
  }
}
