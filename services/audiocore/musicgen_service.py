"""Private MusicGen inference service. Never expose this port directly to the public internet."""
from __future__ import annotations
import io, os, hmac, base64, logging, time
from functools import lru_cache
from typing import Literal
import numpy as np
import soundfile as sf
import torch
from audiocraft.models import MusicGen
from fastapi import FastAPI, Header, HTTPException
from fastapi.responses import JSONResponse, Response
from prometheus_client import Counter, Histogram, generate_latest, CONTENT_TYPE_LATEST
from pydantic import BaseModel, Field

logging.basicConfig(level=os.getenv("LOG_LEVEL", "INFO"))
log = logging.getLogger("tamv.musicgen")
TOKEN = os.getenv("AUDIOCORE_INTERNAL_TOKEN", "")
MODEL_ID = os.getenv("MUSICGEN_MODEL", "facebook/musicgen-small")
MAX_DURATION = int(os.getenv("MUSICGEN_MAX_DURATION_SECONDS", "30"))
DEVICE = "cuda" if torch.cuda.is_available() else "cpu"
app = FastAPI(title="TAMV MusicGen", version="1.0.0", docs_url=None, redoc_url=None)
generation_total = Counter("tamv_musicgen_generations_total", "MusicGen generations", ["model", "status"])
generation_latency = Histogram("tamv_musicgen_generation_seconds", "MusicGen inference duration", ["model"], buckets=(1, 5, 10, 30, 60, 120, 300, 600))

class Parameters(BaseModel):
    temperature: float = Field(default=1.0, ge=0, le=1.5)
    guidanceScale: float = Field(default=3.0, ge=1, le=10)
    durationSeconds: int = Field(default=15, ge=5, le=30)
    sampleRate: Literal[32000, 44100, 48000] = 32000
    spectralAnalysis: bool = True
    seed: int | None = Field(default=None, ge=0, le=2147483647)

class GenerationRequest(BaseModel):
    taskId: str
    prompt: str = Field(min_length=3, max_length=2000)
    mode: Literal["instrumental", "vocal", "hybrid"] = "instrumental"
    parameters: Parameters

@lru_cache(maxsize=1)
def model():
    log.info("Loading model=%s device=%s", MODEL_ID, DEVICE)
    loaded = MusicGen.get_pretrained(MODEL_ID, device=DEVICE)
    return loaded

def analyse(audio: np.ndarray, sample_rate: int) -> dict:
    mono = audio.mean(axis=0) if audio.ndim == 2 else audio
    peak = max(float(np.max(np.abs(mono))), 1e-12)
    rms = max(float(np.sqrt(np.mean(np.square(mono)))), 1e-12)
    result = {
        "truePeakDb": round(20 * np.log10(peak), 5),
        "rmsDb": round(20 * np.log10(rms), 5),
        "sampleRate": sample_rate,
        "channels": int(audio.shape[0]) if audio.ndim > 1 else 1,
        "analyzerEngine": "numpy",
        "analyzerVersion": np.__version__,
        "cqtComputed": False,
        "harmonicChroma": None
    }
    try:
        import librosa
        chroma = librosa.feature.chroma_stft(y=mono.astype(np.float32), sr=sample_rate)
        result["harmonicChroma"] = [round(float(x), 7) for x in chroma.mean(axis=1)]
        result["analyzerEngine"] = "librosa"
        result["analyzerVersion"] = librosa.__version__
    except Exception as exc:
        log.warning("Optional chroma analysis unavailable: %s", type(exc).__name__)
        result["analysisWarning"] = "chroma_unavailable"
    return result

@app.get("/metrics")
def metrics():
    return Response(generate_latest(), media_type=CONTENT_TYPE_LATEST)

@app.get("/healthz")
def health():
    return {"status": "ok", "service": "musicgen", "model": MODEL_ID, "device": DEVICE, "modelLoaded": model.cache_info().currsize > 0}

@app.post("/v1/generate")
def generate(body: GenerationRequest, authorization: str | None = Header(default=None)):
    if not TOKEN or not authorization or not hmac.compare_digest(authorization, f"Bearer {TOKEN}"):
        raise HTTPException(status_code=401, detail="Unauthorized")
    duration = min(body.parameters.durationSeconds, MAX_DURATION)
    if body.mode != "instrumental":
        # MusicGen is instrumental generation; don't silently pretend it generates vocals.
        raise HTTPException(status_code=422, detail="Este backend MusicGen solo admite modo instrumental. Configura un motor vocal compatible para vocal/hybrid.")
    started = time.monotonic()
    try:
        if body.parameters.seed is not None:
            torch.manual_seed(body.parameters.seed)
            if torch.cuda.is_available():
                torch.cuda.manual_seed_all(body.parameters.seed)
        engine = model()
        engine.set_generation_params(duration=duration, temperature=body.parameters.temperature, cfg_coef=body.parameters.guidanceScale)
        with torch.inference_mode():
            waveform = engine.generate([body.prompt])[0].detach().cpu().float().numpy()
        sample_rate = int(engine.sample_rate)
        requested_rate = int(body.parameters.sampleRate)
        if requested_rate != sample_rate:
            import librosa
            waveform = librosa.resample(waveform, orig_sr=sample_rate, target_sr=requested_rate, axis=-1)
            sample_rate = requested_rate
        buffer = io.BytesIO()
        sf.write(buffer, waveform.T, sample_rate, format="WAV", subtype="PCM_16")
        audio = buffer.getvalue()
        spectral = analyse(waveform, sample_rate) if body.parameters.spectralAnalysis else None
        generation_total.labels(model=MODEL_ID, status="success").inc()
        generation_latency.labels(model=MODEL_ID).observe(time.monotonic() - started)
        return JSONResponse({
            "taskId": body.taskId,
            "audioBase64": base64.b64encode(audio).decode("ascii"),
            "durationSeconds": round(float(waveform.shape[-1]) / sample_rate, 3),
            "sampleRate": sample_rate,
            "spectralMetadata": spectral,
            "model": MODEL_ID,
            "device": DEVICE
        })
    except HTTPException:
        raise
    except Exception as exc:
        generation_total.labels(model=MODEL_ID, status="error").inc()
        generation_latency.labels(model=MODEL_ID).observe(time.monotonic() - started)
        log.exception("MusicGen generation failed")
        raise HTTPException(status_code=500, detail="MusicGen generation failed") from exc
