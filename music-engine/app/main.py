import hashlib
import hmac
import os
import threading
import time
import uuid
from datetime import datetime, timezone

from fastapi import FastAPI, HTTPException, Request
from pydantic import BaseModel, Field

app = FastAPI(title="TAMV Music Engine")

TASKS: dict[str, dict] = {}
AUDIO: dict[str, bytes] = {}
_LOCK = threading.Lock()
_SEMAPHORE = threading.Semaphore(2)  # máximo 2 generaciones simultáneas
_CREATED: dict[str, float] = {}


def _evict_old() -> None:
    """TTL de 1h para tareas/audio: sin esto, cada WAV (~1.3 MiB) quedaba en
    memoria para siempre y el engine moría de OOM con ~1k trabajos."""
    now = time.time()
    with _LOCK:
        for task_id, created in list(_CREATED.items()):
            if now - created > 3600:
                TASKS.pop(task_id, None)
                AUDIO.pop(task_id, None)
                _CREATED.pop(task_id, None)


def _require_key(request: Request) -> None:
    expected = os.getenv("LOCAL_MUSIC_API_KEY")
    if not expected:
        return
    got = request.headers.get("authorization", "")
    if got != f"Bearer {expected}":
        raise HTTPException(status_code=401, detail="API key inválida")


def _callback_allowed(url: str) -> bool:
    """Allowlist SSRF: solo se POSTea a callbackUrl si su host es localhost,
    el de NEXT_PUBLIC_APP_URL o el de ENGINE_PUBLIC_URL. Sin esto, cualquiera
    alcanzando :8000 podía hacernos llamar a cualquier URL interna."""
    from urllib.parse import urlparse

    try:
        host = urlparse(url).hostname
    except Exception:
        return False
    if not host:
        return False
    if host in ("127.0.0.1", "localhost", "::1"):
        return True
    allowed = set()
    for raw in (os.getenv("NEXT_PUBLIC_APP_URL"), os.getenv("ENGINE_PUBLIC_URL")):
        if raw:
            try:
                allowed.add(urlparse(raw if "://" in raw else f"https://{raw}").hostname)
            except Exception:
                pass
    return host in allowed


class GenerateRequest(BaseModel):
    prompt: str = Field(max_length=2000)
    lyrics: str = Field(default="", max_length=4000)
    instrumental: bool = False
    duration: int = 30
    callbackUrl: str | None = None
    model: str | None = None


def _wav_bytes(seconds: int, seed_text: str) -> bytes:
    """WAV determinista (tono de prueba) como reserva funcional.

    Sin GPU/modelo, el engine sigue siendo funcional de punta a punta:
    genera un archivo WAV válido cuyo tono depende del prompt. Cuando se
    instalan Ace-Step/YuE/DiffRhythm (`MUSIC_MODEL` + pesos), se sustituye
    esta función por la inferencia real en `providers/` (ver README).
    Vectorizado con numpy: el bucle por muestra era O(n²) en memoria.
    """
    import io
    import struct

    import numpy as np

    seconds = min(max(seconds, 3), 30)
    rate = 22050
    h = sum((i + 1) * ord(c) for i, c in enumerate(seed_text)) % 12
    base = 261.63 * (2 ** (h / 12.0))
    t = np.arange(rate * seconds) / rate
    sample = 0.3 * np.sin(2 * np.pi * base * t) + 0.2 * np.sin(2 * np.pi * base * 2 * t)
    frames = (np.clip(sample, -1.0, 1.0) * 32767).astype(np.int16).tobytes()
    data = (
        b"RIFF" + struct.pack("<I", 36 + len(frames)) + b"WAVEfmt "
        + struct.pack("<IHHIIHH", 16, 1, 1, rate, rate * 2, 2, 16)
        + b"data" + struct.pack("<I", len(frames)) + frames
    )
    return data


def _sign(body: bytes) -> str | None:
    secret = os.getenv("GENERATOR_CALLBACK_SECRET")
    if not secret:
        return None
    return hmac.new(secret.encode(), body, hashlib.sha256).hexdigest()


def _finish(task_id: str) -> None:
    task = TASKS.get(task_id)
    if not task:
        return
    try:
        wav = _wav_bytes(task["duration"], task["prompt"])
        AUDIO[task_id] = wav
        task["status"] = "completed"
        public_base = os.getenv("ENGINE_PUBLIC_URL", "").rstrip("/")
        audio_url = f"{public_base}/audio/{task_id}.wav" if public_base else f"/audio/{task_id}.wav"
        payload = {
            "taskId": task_id,
            "status": "completed",
            "audioUrl": audio_url,
            "metadata": {
                "provider": "local",
                "model": task["model"],
                "duration": task["duration"],
                "prompt": task["prompt"],
                "generatedAt": datetime.now(timezone.utc).isoformat(),
            },
        }
        if task.get("callbackUrl") and _callback_allowed(task["callbackUrl"]):
            import json
            import httpx
            raw = json.dumps(payload).encode()
            headers = {"Content-Type": "application/json"}
            sig = _sign(raw)
            if sig:
                headers["x-signature"] = sig
            for _attempt in range(3):  # reintento: un 503 de Next no debe colgar la canción
                try:
                    resp = httpx.post(task["callbackUrl"], content=raw, headers=headers, timeout=15)
                    if resp.status_code < 500:
                        break
                except Exception as exc:  # noqa: BLE001
                    print(f"[engine] callback falló {task_id}: {exc}")
        task["audioUrl"] = audio_url
    except Exception as exc:  # noqa: BLE001
        task["status"] = "failed"
        task["error"] = str(exc)


@app.post("/generate")
async def generate(request: GenerateRequest, req: Request):
    _require_key(req)
    _evict_old()
    if not request.prompt.strip():
        raise HTTPException(status_code=400, detail="prompt es obligatorio")
    if request.callbackUrl and not _callback_allowed(request.callbackUrl):
        raise HTTPException(status_code=400, detail="callbackUrl no permitido")
    task_id = f"local_{uuid.uuid4()}"
    with _LOCK:
        TASKS[task_id] = {
            "taskId": task_id,
            "status": "queued",
            "model": request.model or os.getenv("MUSIC_MODEL", "ace-step"),
            "prompt": request.prompt,
            "duration": min(max(request.duration, 5), 120),
            "callbackUrl": request.callbackUrl,
            "createdAt": datetime.now(timezone.utc).isoformat(),
        }
        _CREATED[task_id] = time.time()

    def _run() -> None:
        with _SEMAPHORE:
            _finish(task_id)

    threading.Thread(target=_run, daemon=True).start()
    return {"taskId": task_id, "model": TASKS[task_id]["model"], "status": "queued"}


@app.get("/task/{task_id}")
async def task_status(task_id: str):
    task = TASKS.get(task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    return task


@app.get("/audio/{task_id}.wav")
async def audio(task_id: str):
    from fastapi.responses import Response
    data = AUDIO.get(task_id)
    if not data:
        raise HTTPException(status_code=404, detail="Audio not ready")
    return Response(content=data, media_type="audio/wav")


@app.get("/health")
async def health():
    return {"ok": True, "time": time.time()}
