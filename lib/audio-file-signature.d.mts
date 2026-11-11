export const AUDIO_HEADER_BYTES: number

export type AudioContainer = 'mp3' | 'wav' | 'ogg' | 'm4a'

export function detectAudioContainer(bytes: Uint8Array): AudioContainer | null
export function containerForMime(mime: string): AudioContainer | null

export type AudioHeaderReason = 'unsupported_mime' | 'unknown_container' | 'mismatch'

export function verifyAudioHeader(
  bytes: Uint8Array,
  mime: string,
):
  | { ok: true; container: AudioContainer }
  | { ok: false; reason: AudioHeaderReason; detected: AudioContainer | null; expected: AudioContainer | null }
