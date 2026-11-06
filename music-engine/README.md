# TAMV Music Engine — servidor propio (opción `local`)

Microservicio FastAPI que expone `POST /generate`, `GET /task/{id}`,
`GET /audio/{id}.wav` y `GET /health`. Play & Go lo elige con
`MUSIC_PROVIDER=local` + `LOCAL_MUSIC_API_URL`.

## Arrancar (sin GPU, ya funcional)

```bash
cd music-engine
pip install -r requirements.txt
export GENERATOR_CALLBACK_SECRET=$(openssl rand -hex 32)   # el MISMO de Vercel
uvicorn app.main:app --port 8000
```

Sin pesos de modelo instalados, `_wav_bytes()` genera un WAV determinista a
partir del prompt: el flujo completo (generación → callback firmado → biblioteca)
funciona y se prueba hoy. Con GPU, se sustituye por Ace-Step/YuE/DiffRhythm.

## Licencias (leérlas antes de vender)

- MusicGen (Meta): `CC-BY-NC` — no comercial sin permiso.
- Ace-Step / YuE / DiffRhythm: cada repo trae su licencia (MIT/Apache en
  código, pesos aparte). Verifica pesos + salidas antes de monetizar.
- "Open source" no equivale a "gratis comercial".

## Contrato

- `POST /generate {prompt, lyrics, instrumental, duration, callbackUrl, model}` → `{taskId, model, status}`
- Al terminar POSTea a `callbackUrl` con `{taskId, status: completed, audioUrl, metadata}` y cabecera `x-signature = HMAC-SHA256(cuerpo, GENERATOR_CALLBACK_SECRET)`.
- El audio queda en `ENGINE_PUBLIC_URL/audio/{taskId}.wav` (o relativo `/audio/...` en desarrollo local).
