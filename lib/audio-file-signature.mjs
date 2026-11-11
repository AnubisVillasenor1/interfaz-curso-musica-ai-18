/**
 * Detección del contenedor real de un archivo de audio.
 *
 * El MIME de `multipart/form-data` lo declara el cliente y es trivial de
 * falsificar. Antes de subir a Storage se leen los primeros bytes y se exige
 * que el contenedor detectado coincida con el tipo declarado. No sustituye a un
 * decodificador, pero impide guardar un ejecutable renombrado como `.mp3`.
 *
 * El límite de tipos sigue siendo el del bucket: MP3, WAV, OGG y M4A.
 */

const CONTAINER_BY_MIME = Object.freeze({
  'audio/mpeg': 'mp3',
  'audio/wav': 'wav',
  'audio/x-wav': 'wav',
  'audio/ogg': 'ogg',
  'audio/mp4': 'm4a',
})

/** Bytes necesarios para decidir el contenedor. */
export const AUDIO_HEADER_BYTES = 64

function ascii(bytes, start, length) {
  if (bytes.length < start + length) return ''
  return String.fromCharCode(...bytes.slice(start, start + length))
}

/**
 * @param {Uint8Array} bytes
 * @returns {'mp3'|'wav'|'ogg'|'m4a'|null}
 */
export function detectAudioContainer(bytes) {
  if (!(bytes instanceof Uint8Array) || bytes.length < 4) return null

  if (ascii(bytes, 0, 4) === 'RIFF' && ascii(bytes, 8, 4) === 'WAVE') return 'wav'
  if (ascii(bytes, 0, 4) === 'OggS') return 'ogg'
  if (ascii(bytes, 4, 4) === 'ftyp') return 'm4a'

  // MP3 con etiqueta ID3 o con sincronía de trama MPEG (11 bits en 1).
  if (ascii(bytes, 0, 3) === 'ID3') return 'mp3'
  if (bytes.length >= 2 && bytes[0] === 0xff && (bytes[1] & 0xe0) === 0xe0) return 'mp3'

  return null
}

/** @param {string} mime */
export function containerForMime(mime) {
  return CONTAINER_BY_MIME[String(mime ?? '').trim().toLowerCase()] ?? null
}

/**
 * @param {Uint8Array} bytes
 * @param {string} mime
 * @returns {{ok: true, container: string} | {ok: false, reason: 'unsupported_mime'|'unknown_container'|'mismatch', detected: string|null, expected: string|null}}
 */
export function verifyAudioHeader(bytes, mime) {
  const expected = containerForMime(mime)
  if (!expected) {
    return { ok: false, reason: 'unsupported_mime', detected: null, expected: null }
  }
  const detected = detectAudioContainer(bytes)
  if (!detected) {
    return { ok: false, reason: 'unknown_container', detected: null, expected }
  }
  if (detected !== expected) {
    return { ok: false, reason: 'mismatch', detected, expected }
  }
  return { ok: true, container: detected }
}
