/**
 * Readers for bounded request bodies. Enforce limits while consuming the stream;
 * Content-Length is checked early but is never trusted as the only limit.
 */
export type BoundedBodyError = {
  ok: false
  status: 400 | 413
  code: 'invalid_content_length' | 'payload_too_large' | 'invalid_body' | 'invalid_utf8' | 'invalid_json'
  message: string
}
export type BoundedTextResult = { ok: true; text: string } | BoundedBodyError
export type BoundedJsonResult<T> = { ok: true; value: T; text: string } | BoundedBodyError

export async function readBoundedText(request: Request, maxBytes: number): Promise<BoundedTextResult> {
  if (!Number.isSafeInteger(maxBytes) || maxBytes <= 0) {
    throw new RangeError('maxBytes must be a positive safe integer')
  }

  const contentLength = request.headers.get('content-length')
  if (contentLength !== null) {
    const raw = contentLength.trim()
    if (!/^\d+$/.test(raw)) {
      return { ok: false, status: 400, code: 'invalid_content_length', message: 'La longitud de la solicitud no es válida.' }
    }
    const declared = Number(raw)
    if (!Number.isSafeInteger(declared)) {
      return { ok: false, status: 400, code: 'invalid_content_length', message: 'La longitud de la solicitud no es válida.' }
    }
    if (declared > maxBytes) {
      return { ok: false, status: 413, code: 'payload_too_large', message: 'El cuerpo supera el tamaño permitido.' }
    }
  }

  const reader = request.body?.getReader()
  if (!reader) return { ok: true, text: '' }

  const chunks: Uint8Array[] = []
  let totalBytes = 0
  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      if (!value) continue
      totalBytes += value.byteLength
      if (totalBytes > maxBytes) {
        try { await reader.cancel() } catch { /* Runtime may already have closed the stream. */ }
        return { ok: false, status: 413, code: 'payload_too_large', message: 'El cuerpo supera el tamaño permitido.' }
      }
      chunks.push(value)
    }
  } catch {
    return { ok: false, status: 400, code: 'invalid_body', message: 'No se pudo leer el cuerpo de la solicitud.' }
  }

  const bytes = new Uint8Array(totalBytes)
  let offset = 0
  for (const chunk of chunks) {
    bytes.set(chunk, offset)
    offset += chunk.byteLength
  }
  try {
    return { ok: true, text: new TextDecoder('utf-8', { fatal: true }).decode(bytes) }
  } catch {
    return { ok: false, status: 400, code: 'invalid_utf8', message: 'El cuerpo debe estar codificado en UTF-8.' }
  }
}

export async function readBoundedJson<T = unknown>(request: Request, maxBytes: number): Promise<BoundedJsonResult<T>> {
  const textResult = await readBoundedText(request, maxBytes)
  if (!textResult.ok) return textResult
  try {
    return { ok: true, value: JSON.parse(textResult.text) as T, text: textResult.text }
  } catch {
    return { ok: false, status: 400, code: 'invalid_json', message: 'El cuerpo debe contener JSON válido.' }
  }
}
