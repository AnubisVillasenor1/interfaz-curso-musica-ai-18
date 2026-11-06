import hashlib
import hmac
import os
import threading
import time
import uuid
from datetime import datetime, timezone

from fastapi import FastAPI, HTTPException, Request
from pydantic import BaseModel

app = FastAPI(title="TAMV Music Engine")

TASKS: dict[str, dict] = {}
AUDIO: dict[str, bytes] = {}


class GenerateRequest(BaseModel):
    prompt: str
    lyrics: str = ""
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
    """
    import io
    import math
    import struct

    seconds = min(max(seconds, 3), 30)
    rate = 22050
    # Tono base derivado del prompt (determinista): Do4=261.63 + hash % escala.
    h = sum((i + 1) * ord(c) for i, c in enumerate(seed_text)) % 12
    base = 261.63 * (2 ** (h / 12.0))
    frames = b""
    for i in range(rate * seconds):
        t = i / rate
        sample = 0.3 * math.sin(2 * math.pi * base * t) + 0.2 * math.sin(2 * math.pi * base * 2 * t)
        frames += struct.pack("<h", int(max(-1.0, min(1.0, sample)) * 32767))
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
        if task.get("callbackUrl"):
            import json
            import httpx
            raw = json.dumps(payload).encode()
            headers = {"Content-Type": "application/json"}
            sig = _sign(raw)
            if sig:
                headers["x-signature"] = sig
            try:
                httpx.post(task["callbackUrl"], content=raw, headers=headers, timeout=15)
            except Exception as exc:  # noqa: BLE001 - el callback no debe tumbar el worker
                print(f"[engine] callback falló {task_id}: {exc}")
        task["audioUrl"] = audio_url
    except Exception as exc:  # noqa: BLE001
        task["status"] = "failed"
        task["error"] = str(exc)


@app.post("/generate")
async def generate(request: GenerateRequest, req: Request):
    if not request.prompt.strip():
        raise HTTPException(status_code=400, detail="prompt es obligatorio")
    task_id = f"local_{uuid.uuid4()}"
    TASKS[task_id] = {
        "taskId": task_id,
        "status": "queued",
        "model": request.model or os.getenv("MUSIC_MODEL", "ace-step"),
        "prompt": request.prompt,
        "duration": min(max(request.duration, 5), 120),
        "callbackUrl": request.callbackUrl,
        "createdAt": datetime.now(timezone.utc).isoformat(),
    }
    threading.Thread(target=_finish, args=(task_id,), daemon=True).start()
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
