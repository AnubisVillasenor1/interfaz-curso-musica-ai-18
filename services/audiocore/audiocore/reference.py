"""Referencia NumPy del contrato TAMV-AudioCore v2.0.

El servicio usa esta implementación cuando la extensión C++ no está instalada.
No simula un modelo de IA: calcula chroma, tonalidad heurística, contraste
espectral y nivel a partir de un espectro o de una forma de onda mono.
"""

from __future__ import annotations

import math
from typing import Any, Iterable, Sequence

import numpy as np

CORE_VERSION = "2.0.0"
NOTE_NAMES = ("C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B")
SPECTRAL_BANDS_HZ = (
    (0, 200),
    (200, 400),
    (400, 800),
    (800, 1600),
    (1600, 3200),
    (3200, 6400),
    (6400, 12000),
)

_MAJOR_PROFILE = np.array(
    [6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88],
    dtype=np.float64,
)
_MINOR_PROFILE = np.array(
    [6.33, 2.68, 3.52, 5.38, 2.60, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17],
    dtype=np.float64,
)
_MAJOR_SCALE = (0, 2, 4, 5, 7, 9, 11)
_MINOR_SCALE = (0, 2, 3, 5, 7, 8, 10)

try:  # La extensión nativa es opcional; el servicio funciona sin ella.
    import tamv_audio_core_ext as _native  # type: ignore

    HAS_NATIVE = True
except Exception:  # ImportError, OSError por una biblioteca ausente, etc.
    _native = None  # type: ignore
    HAS_NATIVE = False


def _clamp(value: float, minimum: float, maximum: float) -> float:
    return min(maximum, max(minimum, value))


def _db_to_amplitude(values: np.ndarray) -> np.ndarray:
    safe = np.minimum(0.0, values)
    amplitude = np.power(10.0, safe / 20.0)
    return np.where(np.isfinite(values) & (values > -100.0), amplitude, 0.0)


def _pearson(left: np.ndarray, right: np.ndarray) -> float:
    if left.size == 0 or right.size == 0:
        return 0.0
    x = left - left.mean()
    y = right - right.mean()
    denominator = math.sqrt(float(np.dot(x, x) * np.dot(y, y)))
    return 0.0 if denominator <= 1e-12 else float(np.dot(x, y) / denominator)


def _key_affinity(chroma: np.ndarray, tonic: int, major: bool) -> float:
    scale = _MAJOR_SCALE if major else _MINOR_SCALE
    third = 4 if major else 3
    weights = np.zeros(12, dtype=np.float64)
    weights[list(scale)] = 0.25
    weights[0] = 1.0
    weights[third] = 0.8
    weights[7] = 0.7
    relative = (np.arange(12) - tonic) % 12
    total = float(weights.sum())
    return float(np.dot(chroma, weights[relative]) / total) if total > 0 else 0.0


def chroma_from_spectrum(
    spectrum_db: Sequence[float] | np.ndarray,
    sample_rate: int = 48_000,
    fft_size: int | None = None,
    *,
    a4: float = 440.0,
    min_hz: float = 32.7,
    max_hz: float = 10_000.0,
    sigma_semitones: float = 0.5,
) -> np.ndarray:
    """Convierte magnitudes dB en 12 clases de altura normalizadas L2."""
    spectrum = np.asarray(spectrum_db, dtype=np.float64).reshape(-1)
    if spectrum.size == 0:
        return np.zeros(12, dtype=np.float64)

    safe_fft = int(fft_size) if fft_size and fft_size > 0 else spectrum.size * 2
    bin_hz = float(sample_rate) / float(safe_fft)
    frequencies = np.arange(spectrum.size, dtype=np.float64) * bin_hz
    in_range = (frequencies >= min_hz) & (frequencies <= max_hz)
    amplitudes = _db_to_amplitude(spectrum)
    in_range &= amplitudes > 0.0
    if not np.any(in_range):
        return np.zeros(12, dtype=np.float64)

    midi = 69.0 + 12.0 * np.log2(frequencies[in_range] / a4)
    nearest = np.floor(midi + 0.5).astype(np.int64)
    distance = np.abs(midi - nearest.astype(np.float64))
    sigma = sigma_semitones if sigma_semitones > 0 else 0.5
    keep = distance <= sigma * 3.0
    if not np.any(keep):
        return np.zeros(12, dtype=np.float64)

    weights = np.exp(-0.5 * (distance[keep] / sigma) ** 2)
    pitch_classes = np.mod(nearest[keep], 12)
    chroma = np.bincount(
        pitch_classes,
        weights=amplitudes[in_range][keep] * weights,
        minlength=12,
    ).astype(np.float64)
    norm = float(np.sqrt(np.dot(chroma, chroma)))
    return chroma / norm if norm > 1e-12 else np.zeros(12, dtype=np.float64)


def estimate_key(chroma: Sequence[float] | np.ndarray) -> dict[str, Any]:
    """Heurística de tonalidad: perfiles + afinidad de tríada, sin falsa IA."""
    values = np.asarray(chroma, dtype=np.float64).reshape(-1)
    empty = {"valid": False, "key": None, "tonic": None, "mode": None, "confidence": 0.0, "candidates": []}
    if values.size != 12 or not np.all(np.isfinite(values)):
        return empty
    values = np.maximum(values, 0.0)
    if float(values.sum()) <= 1e-9:
        return empty

    candidates: list[dict[str, Any]] = []
    for tonic in range(12):
        for mode, profile in (("major", _MAJOR_PROFILE), ("minor", _MINOR_PROFILE)):
            correlation = _clamp(_pearson(values, np.roll(profile, tonic)), 0.0, 1.0)
            affinity = _clamp(_key_affinity(values, tonic, mode == "major") * 2.5, 0.0, 1.0)
            candidates.append(
                {
                    "key": f"{NOTE_NAMES[tonic]} {mode}",
                    "tonic": NOTE_NAMES[tonic],
                    "mode": mode,
                    "confidence": round(0.35 * correlation + 0.65 * affinity, 4),
                }
            )

    candidates.sort(key=lambda item: item["confidence"], reverse=True)
    best = candidates[0]
    return {
        "valid": True,
        "key": best["key"],
        "tonic": best["tonic"],
        "mode": best["mode"],
        "confidence": best["confidence"],
        "candidates": [
            {"key": candidate["key"], "confidence": candidate["confidence"]}
            for candidate in candidates[:3]
        ],
    }


def spectral_contrast(
    spectrum_db: Sequence[float] | np.ndarray,
    sample_rate: int = 48_000,
    fft_size: int | None = None,
) -> dict[str, Any]:
    spectrum = np.asarray(spectrum_db, dtype=np.float64).reshape(-1)
    if spectrum.size == 0:
        return {"bands": [], "meanDb": None}
    safe_fft = int(fft_size) if fft_size and fft_size > 0 else spectrum.size * 2
    bin_hz = float(sample_rate) / float(safe_fft)
    frequencies = np.arange(spectrum.size, dtype=np.float64) * bin_hz

    bands: list[dict[str, Any]] = []
    contrasts: list[float] = []
    for low_hz, high_hz in SPECTRAL_BANDS_HZ:
        mask = (frequencies >= low_hz) & (frequencies < high_hz) & np.isfinite(spectrum)
        values = np.sort(spectrum[mask])
        if values.size < 3:
            bands.append(
                {"lowHz": low_hz, "highHz": high_hz, "peakDb": None, "valleyDb": None, "contrastDb": None}
            )
            continue
        edge = max(1, int(math.floor(values.size * 0.1)))
        valley = float(values[:edge].mean())
        peak = float(values[-edge:].mean())
        contrast = peak - valley
        contrasts.append(contrast)
        bands.append(
            {
                "lowHz": low_hz,
                "highHz": high_hz,
                "peakDb": round(peak, 2),
                "valleyDb": round(valley, 2),
                "contrastDb": round(contrast, 2),
            }
        )

    mean = round(float(np.mean(contrasts)), 2) if contrasts else None
    return {"bands": bands, "meanDb": mean}


def analyse_spectrum(
    spectrum_db: Sequence[float] | np.ndarray,
    sample_rate: int = 48_000,
    fft_size: int | None = None,
) -> dict[str, Any]:
    spectrum = np.asarray(spectrum_db, dtype=np.float64).reshape(-1)
    if spectrum.size == 0:
        raise ValueError("spectrum_db must not be empty")
    safe_fft = int(fft_size) if fft_size and fft_size > 0 else spectrum.size * 2
    chroma = chroma_from_spectrum(spectrum, sample_rate, safe_fft)
    key = estimate_key(chroma)
    contrast = spectral_contrast(spectrum, sample_rate, safe_fft)
    amplitudes = _db_to_amplitude(spectrum[1:]) if spectrum.size > 1 else np.array([], dtype=np.float64)
    level = round(_clamp(float(amplitudes.mean()), 0.0, 1.0), 4) if amplitudes.size else 0.0
    return {
        "chroma": [round(float(value), 6) for value in chroma],
        "key": key,
        "contrast": contrast,
        "level": level,
        "binHz": round(float(sample_rate) / float(safe_fft), 4),
        "engine": "numpy",
        "coreVersion": CORE_VERSION,
    }


def spectrum_from_pcm(
    samples: Sequence[float] | np.ndarray,
    sample_rate: int = 48_000,
    fft_size: int = 2_048,
) -> np.ndarray:
    """Espectro dB del primer frame, con ventana Hann simétrica."""
    values = np.asarray(samples, dtype=np.float64).reshape(-1)
    if values.size == 0:
        raise ValueError("samples must not be empty")
    size = int(fft_size)
    if size < 256 or size > 32_768 or (size & (size - 1)) != 0:
        raise ValueError("fft_size must be a power of two between 256 and 32768")

    frame = np.zeros(size, dtype=np.float64)
    take = min(values.size, size)
    frame[:take] = values[:take] * np.hanning(size)[:take]
    spectrum = np.fft.rfft(frame)
    bins = size // 2
    magnitude = 2.0 * np.abs(spectrum[:bins]) / float(size)
    return 20.0 * np.log10(magnitude + 1e-12)


def _normalise_native(result: dict[str, Any]) -> dict[str, Any]:
    """Alinea la salida pybind11 con el contrato JSON del servicio."""
    contrast = result.get("contrast") or {}
    if "meanDb" not in contrast:
        contrast["meanDb"] = contrast.get("meanDb") if contrast.get("hasMean") else None
    bands = []
    for band in contrast.get("bands", []):
        if not isinstance(band, dict):
            continue
        bands.append(
            {
                "lowHz": band.get("lowHz"),
                "highHz": band.get("highHz"),
                "peakDb": band.get("peakDb"),
                "valleyDb": band.get("valleyDb"),
                "contrastDb": band.get("contrastDb"),
            }
        )
    contrast["bands"] = bands
    result["contrast"] = contrast
    result["chroma"] = [round(float(value), 6) for value in result.get("chroma", [])]
    result["level"] = round(float(result.get("level", 0.0)), 4)
    result["binHz"] = round(float(result.get("binHz", 0.0)), 4)
    result["engine"] = "native"
    result["coreVersion"] = CORE_VERSION
    return result


def analyse_pcm(
    samples: Sequence[float] | np.ndarray,
    sample_rate: int = 48_000,
    fft_size: int = 2_048,
) -> dict[str, Any]:
    values = np.asarray(samples, dtype=np.float32).reshape(-1)
    if values.size == 0:
        raise ValueError("samples must not be empty")
    if HAS_NATIVE and _native is not None:
        try:
            native_result = _native.analyse_waveform(values, int(sample_rate), int(fft_size), int(fft_size // 4))
            return _normalise_native(dict(native_result))
        except Exception as error:  # La referencia sigue disponible si el binario falla.
            fallback = analyse_spectrum(spectrum_from_pcm(values, sample_rate, fft_size), sample_rate, fft_size)
            fallback["nativeError"] = str(error)[:200]
            return fallback
    return analyse_spectrum(spectrum_from_pcm(values, sample_rate, fft_size), sample_rate, fft_size)


def engine_info() -> dict[str, Any]:
    return {
        "coreVersion": CORE_VERSION,
        "engine": "native" if HAS_NATIVE else "numpy",
        "nativeAvailable": HAS_NATIVE,
    }
