"""Servicio HTTP mínimo para TAMV-AudioCore v2.0.

Usa la biblioteca estándar (`http.server`) para no añadir un framework pesado.
La referencia NumPy es la ruta por defecto; si la extensión pybind11 está en
`PYTHONPATH`, se usa y se declara `engine: native`.

Seguridad:
- el cuerpo está limitado a 8 MB y la lista de muestras a 2 millones;
- `TAMV_AUDIO_CORE_TOKEN` activa autenticación Bearer;
- el proceso se niega a escuchar fuera de loopback sin token.
"""

from __future__ import annotations

import hmac
import json
import logging
import math
import os
import sys
import traceback
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from typing import Any, Sequence
from urllib.parse import urlsplit

import numpy as np

from audiocore.reference import (
    CORE_VERSION,
    analyse_pcm,
    analyse_spectrum,
    engine_info,
)

LOGGER = logging.getLogger("tamv.audiocore")
MAX_BODY_BYTES = 8_000_000
MAX_SAMPLES = 2_000_000
MIN_BINS = 32
# 16 384 bins corresponden a una FFT de 32 768, el máximo del contrato.
MAX_BINS = 16_384
MIN_SAMPLE_RATE = 8_000
MAX_SAMPLE_RATE = 192_000
MIN_FFT = 256
MAX_FFT = 32_768
LOOPBACK = {"127.0.0.1", "localhost", "::1"}


class RequestError(Exception):
    def __init__(self, status: int, code: str, message: str) -> None:
        super().__init__(message)
        self.status = status
        self.code = code
        self.message = message


def _is_integer(value: Any) -> bool:
    return not isinstance(value, bool) and isinstance(value, (int, np.integer))


def _is_number(value: Any) -> bool:
    return not isinstance(value, bool) and isinstance(value, (int, float, np.integer, np.floating))


def _finite_list(raw: Any, label: str, minimum: int, maximum: int) -> list[float]:
    if not isinstance(raw, list):
        raise RequestError(400, f"invalid_{label}", f"`{label}` debe ser un arreglo JSON.")
    if not minimum <= len(raw) <= maximum:
        raise RequestError(
            400,
            f"invalid_{label}",
            f"`{label}` debe tener entre {minimum} y {maximum} valores.",
        )
    values: list[float] = []
    for value in raw:
        if not _is_number(value) or not math.isfinite(float(value)):
            raise RequestError(400, f"invalid_{label}", f"`{label}` contiene un valor no finito.")
        values.append(float(value))
    return values


def _validate_sample_rate(raw: Any) -> int:
    if raw is None:
        return 48_000
    if not _is_integer(raw):
        raise RequestError(400, "invalid_sample_rate", "`sampleRate` debe ser un entero.")
    value = int(raw)
    if value < MIN_SAMPLE_RATE or value > MAX_SAMPLE_RATE:
        raise RequestError(
            400,
            "invalid_sample_rate",
            f"`sampleRate` debe estar entre {MIN_SAMPLE_RATE} y {MAX_SAMPLE_RATE}.",
        )
    return value


def _validate_fft_size(raw: Any, default: int) -> int:
    value = default if raw is None else raw
    if not _is_integer(value):
        raise RequestError(400, "invalid_fft_size", "`fftSize` debe ser un entero.")
    size = int(value)
    if size < MIN_FFT or size > MAX_FFT or (size & (size - 1)) != 0:
        raise RequestError(
            400,
            "invalid_fft_size",
            f"`fftSize` debe ser una potencia de dos entre {MIN_FFT} y {MAX_FFT}.",
        )
    return size


def parse_analysis_request(payload: Any) -> tuple[str, np.ndarray, int, int]:
    """Valida el JSON y devuelve (tipo, datos, sampleRate, fftSize)."""
    if not isinstance(payload, dict):
        raise RequestError(400, "invalid_request", "El cuerpo debe ser un objeto JSON.")

    sample_rate = _validate_sample_rate(payload.get("sampleRate"))

    if "spectrumDb" in payload:
        spectrum = _finite_list(payload["spectrumDb"], "spectrumDb", MIN_BINS, MAX_BINS)
        default_fft = len(spectrum) * 2
        if default_fft > MAX_FFT:
            raise RequestError(
                400,
                "fft_size_required",
                f"Con {len(spectrum)} bins debes enviar `fftSize` explícito (máximo {MAX_FFT}).",
            )
        fft_size = _validate_fft_size(payload.get("fftSize"), default_fft)
        return "spectrum", np.asarray(spectrum, dtype=np.float64), sample_rate, fft_size

    if "samples" in payload:
        samples = _finite_list(payload["samples"], "samples", 16, MAX_SAMPLES)
        fft_size = _validate_fft_size(payload.get("fftSize"), 2_048)
        return "samples", np.asarray(samples, dtype=np.float32), sample_rate, fft_size

    raise RequestError(
        400,
        "invalid_request",
        "Envía `spectrumDb` (magnitudes dB) o `samples` (forma de onda mono).",
    )


def analyse_payload(payload: Any) -> dict[str, Any]:
    kind, data, sample_rate, fft_size = parse_analysis_request(payload)
    if kind == "spectrum":
        result = analyse_spectrum(data, sample_rate, fft_size)
    else:
        result = analyse_pcm(data, sample_rate, fft_size)
    result.setdefault("sampleRate", sample_rate)
    result.setdefault("fftSize", fft_size)
    return result


def health_payload(auth_required: bool) -> dict[str, Any]:
    info = engine_info()
    return {
        "status": "ok",
        **info,
        "authRequired": auth_required,
        "limits": {
            "maxBodyBytes": MAX_BODY_BYTES,
            "maxSamples": MAX_SAMPLES,
            "minBins": MIN_BINS,
            "maxBins": MAX_BINS,
            "sampleRate": [MIN_SAMPLE_RATE, MAX_SAMPLE_RATE],
            "fftSize": [MIN_FFT, MAX_FFT],
        },
    }


class AudioCoreHandler(BaseHTTPRequestHandler):
    server_version = "TAMV-AudioCore/2.0"
    token: str | None = None

    def log_message(self, fmt: str, *args: Any) -> None:
        LOGGER.info("%s - %s", self.address_string(), fmt % args)

    def _send_json(self, status: int, payload: dict[str, Any]) -> None:
        body = json.dumps(payload, ensure_ascii=False, allow_nan=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.send_header("X-Content-Type-Options", "nosniff")
        if status == 401:
            self.send_header("WWW-Authenticate", "Bearer")
        self.end_headers()
        self.wfile.write(body)

    def _authorized(self) -> bool:
        if not self.token:
            return True
        header = self.headers.get("Authorization", "")
        return hmac.compare_digest(header, f"Bearer {self.token}")

    def do_GET(self) -> None:  # noqa: N802 (nombre impuesto por BaseHTTPRequestHandler)
        path = urlsplit(self.path).path.rstrip("/") or "/"
        if path in ("/", "/health", "/healthz"):
            self._send_json(200, health_payload(bool(self.token)))
            return
        self._send_json(404, {"error": "Ruta no encontrada.", "code": "not_found"})

    def do_POST(self) -> None:  # noqa: N802
        path = urlsplit(self.path).path.rstrip("/") or "/"
        if path != "/analyse":
            self._send_json(404, {"error": "Ruta no encontrada.", "code": "not_found"})
            return
        if not self._authorized():
            self._send_json(401, {"error": "Token de servicio ausente o inválido.", "code": "unauthorized"})
            return

        raw_length = self.headers.get("Content-Length")
        if raw_length is None:
            self._send_json(411, {"error": "Falta Content-Length.", "code": "length_required"})
            return
        try:
            length = int(raw_length)
        except ValueError:
            self._send_json(400, {"error": "Content-Length inválido.", "code": "invalid_length"})
            return
        if length <= 0:
            self._send_json(400, {"error": "El cuerpo está vacío.", "code": "empty_body"})
            return
        if length > MAX_BODY_BYTES:
            self._send_json(413, {"error": "El cuerpo supera el límite de 8 MB.", "code": "payload_too_large"})
            return

        body = self.rfile.read(length)
        try:
            payload = json.loads(body.decode("utf-8"))
            result = analyse_payload(payload)
        except UnicodeDecodeError:
            self._send_json(400, {"error": "El cuerpo no es UTF-8.", "code": "invalid_encoding"})
            return
        except json.JSONDecodeError:
            self._send_json(400, {"error": "El cuerpo no es JSON válido.", "code": "invalid_json"})
            return
        except RequestError as error:
            self._send_json(error.status, {"error": error.message, "code": error.code})
            return
        except Exception:
            LOGGER.error("analysis failed\n%s", traceback.format_exc())
            self._send_json(500, {"error": "El análisis falló en el servicio.", "code": "analysis_failed"})
            return

        self._send_json(200, result)


def make_server(host: str, port: int, token: str | None = None) -> ThreadingHTTPServer:
    handler = type("ConfiguredAudioCoreHandler", (AudioCoreHandler,), {"token": token})
    server = ThreadingHTTPServer((host, port), handler)
    server.daemon_threads = True
    return server


def main(argv: Sequence[str] | None = None) -> int:
    del argv
    logging.basicConfig(
        level=os.environ.get("TAMV_AUDIO_CORE_LOG_LEVEL", "INFO").upper(),
        format="%(asctime)s %(levelname)s %(name)s %(message)s",
    )
    host = os.environ.get("TAMV_AUDIO_CORE_HOST", "127.0.0.1").strip()
    try:
        port = int(os.environ.get("TAMV_AUDIO_CORE_PORT", "8000"))
    except ValueError:
        LOGGER.error("TAMV_AUDIO_CORE_PORT debe ser un entero.")
        return 2
    token = os.environ.get("TAMV_AUDIO_CORE_TOKEN", "").strip() or None
    if host not in LOOPBACK and not token:
        LOGGER.error("Rechazado: escuchar en %s sin TAMV_AUDIO_CORE_TOKEN.", host)
        return 2

    server = make_server(host, port, token)
    LOGGER.info(
        "TAMV-AudioCore %s escuchando en http://%s:%s (engine=%s, auth=%s)",
        CORE_VERSION,
        host,
        port,
        engine_info()["engine"],
        "bearer" if token else "ninguna",
    )
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        LOGGER.info("Deteniendo el servicio.")
    finally:
        server.server_close()
    return 0


if __name__ == "__main__":
    sys.exit(main())
