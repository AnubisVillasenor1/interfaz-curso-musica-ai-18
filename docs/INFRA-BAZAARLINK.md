# Infraestructura BazaarLink — free + super bajo costo (TAMV)

BazaarLink = gateway OpenAI-compatible (`https://api.bazaarlink.ai/v1`) con
129 modelos verificados por API en vivo (2026-11-06). Sustituye al proveedor
del chat (hoy OpenAI) sin tocar código: `/api/agent` ya acepta cualquier
`AI_AGENT_BASE_URL` OpenAI-compatible.

## Qué usa Play & Go de BazaarLink

| Capacidad | Modelo recomendado | Precio (por 1M tokens) | Uso en Play & Go |
|---|---|---|---|
| Asistente del curso | `nvidia/nemotron-3.5-lightning-free` o `auto:free` | **$0.00** | `AI_AGENT_MODEL` — costo cero, con guía determinista si falla |
| Asistente pagado (respaldo) | `qwen/qwen3.7-flash` | $0.03 / $0.13 | Máximo 500 tokens/respuesta → **<$0.0001 por pregunta** |
| Música | — (BazaarLink **no** tiene modelos de música) | — | Se sigue con `music-engine/` local (Ace-Step) + Tone.js |
| TTS (lectura de lecciones) | `elevenlabs/eleven-flash-v2.5` | $0.00 en catálogo | Nuevo `POST /api/tts` — voz gratuita, ideal para la academia |
| Docs / imágenes / video | `qwen/qwen-image-3`, `google/veo-3.1` | $0.00 | Portadas y clips de retos (bajo demanda) |
| Embeddings + rerank | `qwen/qwen3-embedding-0.6b`, `cohere/rerank-4` | $0.01 / $0.00 | Búsqueda futura en biblioteca |

## Configuración (env — 3 variables)

```env
AI_AGENT_API_KEY=sk-bl-…          # gratis con registro (7 días, PoW) o de pago
AI_AGENT_BASE_URL=https://api.bazaarlink.ai/v1
AI_AGENT_MODEL=nvidia/nemotron-3.5-lightning-free
```

Alternativas baratas (mismo formato): `qwen/qwen3.7-flash`, `openai/gpt-oss-20b`, `google/gemma-3-4b-it` ($0.05–$0.15/M).

## Economía (con el tope de 500 tokens + 20/min por usuario)

- Por pregunta: ~0.00000006 USD en gratuito/fallback, < 0.0001 USD en barato.
- Con 10.000 alumnos × 50 mensajes/mes ≈ 500k mensajes → **<$50/mes** en el peor caso (y $0 si el modelo free aguanta).
- El rate-limit (`6 anónimo / 20 firmado`) + fallback determinista mantienen el gasto en **$0** si se desactiva `AI_AGENT_API_KEY`.

## Límite (veracidad)

BazaarLink no ofrece generación musical: cine, imagen y voz sí; **música no**.
El motor de música sigue siendo local/Tone.js (costo cero). Los modelos
“abliterated” del catálogo se ignoran por política (sin censura no apto para menores).
