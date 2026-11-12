from __future__ import annotations

import hmac
import io
import os
from functools import lru_cache
from typing import Literal

import numpy as np
import soundfile as sf
from fastapi import FastAPI, Header, HTTPException, Request
from fastapi.responses import Response
from kokoro import KPipeline
from pydantic import BaseModel, Field

app = FastAPI(title="TAMV Voice Identity", version="1.0.0")
MAX_BODY_BYTES = 64_000
MAX_AUDIO_SECONDS = 60
SAMPLE_RATE = 24_000
LANGUAGE_CODES = {"es-MX": "e", "en-US": "a"}


class SpeakRequest(BaseModel):
    text: str = Field(min_length=1, max_length=900)
    language: Literal["es-MX", "en-US"] = "es-MX"
    voice: str | None = Field(default=None, max_length=80)
    speed: float = Field(default=1, ge=0.5, le=2)


@app.middleware("http")
async def limit_request_size(request: Request, call_next):
    content_length = request.headers.get("content-length")
    if content_length:
        try:
            if int(content_length) > MAX_BODY_BYTES:
                return Response(status_code=413, content="request_too_large")
        except ValueError:
            return Response(status_code=400, content="invalid_content_length")
    return await call_next(request)


@lru_cache(maxsize=2)
def get_pipeline(language_code: str) -> KPipeline:
    return KPipeline(lang_code=language_code)


@app.get("/healthz")
def healthz():
    return {
        "service": "tamv-voice-identity",
        "ok": True,
        "engine": "kokoro",
        "configured": bool(os.environ.get("KOKORO_VOICE_ID", "").strip()),
    }


@app.post("/v1/speak")
def speak(
    payload: SpeakRequest,
    x_internal_token: str | None = Header(default=None),
):
    expected_token = os.environ.get("AUDIOCORE_INTERNAL_TOKEN", "").strip()
    supplied_token = (x_internal_token or "").strip()
    if not expected_token:
        raise HTTPException(status_code=503, detail="voice_service_not_configured")
    if not hmac.compare_digest(supplied_token, expected_token):
        raise HTTPException(status_code=401, detail="unauthorized")

    voice_variable = "KOKORO_VOICE_ID_EN" if payload.language == "en-US" else "KOKORO_VOICE_ID"
    voice_id = os.environ.get(voice_variable, "").strip()
    if not voice_id:
        raise HTTPException(status_code=503, detail="voice_preset_not_configured")
    if payload.voice and not hmac.compare_digest(payload.voice, voice_id):
        raise HTTPException(status_code=400, detail="voice_preset_not_allowed")

    try:
        chunks = [
            np.asarray(result.audio.detach().cpu(), dtype=np.float32).reshape(-1)
            for result in get_pipeline(LANGUAGE_CODES[payload.language])(
                payload.text,
                voice=voice_id,
                speed=payload.speed,
            )
        ]
    except Exception as error:
        # Details stay in service logs; never echo model internals to the caller.
        print(f"voice_generation_failed: {type(error).__name__}", flush=True)
        raise HTTPException(status_code=502, detail="voice_generation_failed") from None

    if not chunks:
        raise HTTPException(status_code=502, detail="empty_audio")
    audio = np.concatenate(chunks)
    if audio.size == 0 or audio.size > MAX_AUDIO_SECONDS * SAMPLE_RATE:
        raise HTTPException(status_code=413, detail="audio_duration_out_of_range")
    if not np.isfinite(audio).all():
        raise HTTPException(status_code=502, detail="invalid_audio_output")

    output = io.BytesIO()
    sf.write(output, audio, SAMPLE_RATE, format="WAV", subtype="PCM_16")
    return Response(
        content=output.getvalue(),
        media_type="audio/wav",
        headers={"Cache-Control": "no-store", "X-Audio-Engine": "kokoro"},
    )
