export type MusicPlan = {
  title: string
  genre: string
  mood: string
  tempo: number
  key: string
  instruments: string[]
  structure: string[]
  prompt: string
  engine: 'ollama' | 'local-rule-agent'
}

const GENRES = ['ambient', 'classical', 'electronic', 'hip-hop', 'jazz', 'lo-fi', 'pop', 'rock', 'reggae', 'soundtrack']
const MOODS = ['calm', 'cinematic', 'dark', 'dreamy', 'energetic', 'hopeful', 'melancholic', 'uplifting']
const INSTRUMENTS = ['piano', 'synthesizer', 'strings', 'bass', 'drums', 'guitar', 'flute', 'marimba', 'pads', 'percussion']

function pick<T>(items: T[], seed: number, offset = 0): T {
  return items[(Math.abs(seed + offset) % items.length)]
}

function hash(text: string) {
  let value = 2166136261
  for (const char of text) value = Math.imul(value ^ char.charCodeAt(0), 16777619)
  return value >>> 0
}

export function createLocalPlan(prompt: string): MusicPlan {
  const normalized = prompt.toLowerCase()
  const seed = hash(normalized)
  const genre = GENRES.find((item) => normalized.includes(item)) ?? pick(GENRES, seed)
  const mood = MOODS.find((item) => normalized.includes(item)) ?? pick(MOODS, seed, 7)
  const tempoMatch = normalized.match(/\b(\d{2,3})\s*(?:bpm|beats per minute)?\b/)
  const tempo = Math.min(180, Math.max(50, Number(tempoMatch?.[1]) || (72 + (seed % 57))))
  const keyMatch = prompt.match(/\b([A-G](?:#|b)?\s*(?:major|minor|maj|min)?)\b/i)
  const key = keyMatch?.[1] ?? pick(['C major', 'A minor', 'G major', 'D minor', 'F major', 'E minor'], seed, 11)
  const requested = INSTRUMENTS.filter((item) => normalized.includes(item))
  const instruments = [...new Set([...requested, pick(INSTRUMENTS, seed, 2), pick(INSTRUMENTS, seed, 5)])].slice(0, 5)

  return {
    title: prompt.split(/[.!?\n]/)[0].trim().slice(0, 60) || 'Composición nueva',
    genre,
    mood,
    tempo,
    key,
    instruments,
    structure: ['Intro · 4 compases', 'A · 8 compases', 'B · 8 compases', 'Outro · 4 compases'],
    prompt,
    engine: 'local-rule-agent',
  }
}

function validatePlan(value: unknown, originalPrompt: string): MusicPlan | null {
  if (!value || typeof value !== 'object') return null
  const candidate = value as Record<string, unknown>
  const tempo = Number(candidate.tempo)
  if (!Number.isFinite(tempo) || tempo < 50 || tempo > 180) return null
  const cleanList = (list: unknown, allowed: string[]) => Array.isArray(list)
    ? list.filter((item): item is string => typeof item === 'string' && allowed.includes(item)).slice(0, 6)
    : []
  const genre = typeof candidate.genre === 'string' && GENRES.includes(candidate.genre.toLowerCase()) ? candidate.genre.toLowerCase() : null
  const mood = typeof candidate.mood === 'string' && MOODS.includes(candidate.mood.toLowerCase()) ? candidate.mood.toLowerCase() : null
  const key = typeof candidate.key === 'string' && /^[A-G](?:#|b)?\s*(?:major|minor)$/i.test(candidate.key) ? candidate.key : null
  if (!genre || !mood || !key) return null
  return {
    title: typeof candidate.title === 'string' ? candidate.title.slice(0, 60) : 'Composición nueva',
    genre, mood, key, tempo: Math.round(tempo),
    instruments: cleanList(candidate.instruments, INSTRUMENTS),
    structure: ['Intro · 4 compases', 'A · 8 compases', 'B · 8 compases', 'Outro · 4 compases'],
    prompt: originalPrompt,
    engine: 'ollama',
  }
}

export async function planMusic(prompt: string): Promise<MusicPlan> {
  const fallback = createLocalPlan(prompt)
  const endpoint = process.env.OLLAMA_BASE_URL?.replace(/\/$/, '')
  if (!endpoint) return fallback

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 12_000)
  try {
    const response = await fetch(`${endpoint}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({
        model: process.env.OLLAMA_MODEL || 'qwen2.5:3b',
        stream: false,
        format: 'json',
        prompt: `Eres un arreglista musical. Devuelve SOLO JSON con title, genre, mood, tempo, key, instruments. genre debe ser uno de ${GENRES.join(', ')}; mood uno de ${MOODS.join(', ')}; key como "C major" o "A minor"; instruments una lista de ${INSTRUMENTS.join(', ')}; tempo entero 50-180. Idea: ${prompt}`,
      }),
    })
    if (!response.ok) return fallback
    const data = await response.json() as { response?: string }
    if (!data.response) return fallback
    const plan = validatePlan(JSON.parse(data.response), prompt)
    return plan ?? fallback
  } catch {
    return fallback
  } finally {
    clearTimeout(timeout)
  }
}
