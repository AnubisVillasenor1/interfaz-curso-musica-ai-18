import assert from 'node:assert/strict'
import test from 'node:test'

import {
  AUDIO_HEADER_BYTES,
  containerForMime,
  detectAudioContainer,
  verifyAudioHeader,
} from '../lib/audio-file-signature.mjs'

function ascii(text) {
  return Uint8Array.from(text, (char) => char.charCodeAt(0))
}

function pad(bytes, length = AUDIO_HEADER_BYTES) {
  const result = new Uint8Array(length)
  result.set(bytes)
  return result
}

const wav = pad(Uint8Array.from([...ascii('RIFF'), 0, 0, 0, 0, ...ascii('WAVE'), ...ascii('fmt ')]))
const ogg = pad(Uint8Array.from([...ascii('OggS'), 0, 2, 0, 0]))
const m4a = pad(Uint8Array.from([0, 0, 0, 24, ...ascii('ftypM4A '), 0, 0, 0, 0]))
const mp3Id3 = pad(Uint8Array.from([...ascii('ID3'), 4, 0, 0, 0, 0, 0, 0]))
const mp3Frame = pad(Uint8Array.from([0xff, 0xfb, 0x90, 0x64]))

test('detecta WAV, OGG, M4A y MP3 por cabecera', () => {
  assert.equal(detectAudioContainer(wav), 'wav')
  assert.equal(detectAudioContainer(ogg), 'ogg')
  assert.equal(detectAudioContainer(m4a), 'm4a')
  assert.equal(detectAudioContainer(mp3Id3), 'mp3')
  assert.equal(detectAudioContainer(mp3Frame), 'mp3')
})

test('no confunde un ejecutable ni un archivo vacío con audio', () => {
  assert.equal(detectAudioContainer(pad(ascii('MZ\x90\x00'))), null)
  assert.equal(detectAudioContainer(new Uint8Array(0)), null)
  assert.equal(detectAudioContainer(new Uint8Array([0xff])), null)
})

test('mapea los MIME admitidos por el bucket', () => {
  assert.equal(containerForMime('audio/mpeg'), 'mp3')
  assert.equal(containerForMime('audio/wav'), 'wav')
  assert.equal(containerForMime('audio/x-wav'), 'wav')
  assert.equal(containerForMime('audio/ogg'), 'ogg')
  assert.equal(containerForMime('audio/mp4'), 'm4a')
  assert.equal(containerForMime('application/octet-stream'), null)
  assert.equal(containerForMime('AUDIO/MPEG'), 'mp3')
})

test('acepta contenido coherente con el tipo declarado', () => {
  assert.deepEqual(verifyAudioHeader(wav, 'audio/wav'), { ok: true, container: 'wav' })
  assert.deepEqual(verifyAudioHeader(mp3Frame, 'audio/mpeg'), { ok: true, container: 'mp3' })
  assert.deepEqual(verifyAudioHeader(m4a, 'audio/mp4'), { ok: true, container: 'm4a' })
})

test('rechaza un tipo no admitido y un contenedor desconocido', () => {
  assert.equal(verifyAudioHeader(wav, 'video/mp4').reason, 'unsupported_mime')
  assert.equal(verifyAudioHeader(pad(ascii('MZ\x90\x00')), 'audio/mpeg').reason, 'unknown_container')
})

test('rechaza un archivo disfrazado con MIME de audio', () => {
  const mismatch = verifyAudioHeader(ogg, 'audio/mpeg')
  assert.equal(mismatch.ok, false)
  assert.equal(mismatch.reason, 'mismatch')
  assert.equal(mismatch.detected, 'ogg')
  assert.equal(mismatch.expected, 'mp3')
})
