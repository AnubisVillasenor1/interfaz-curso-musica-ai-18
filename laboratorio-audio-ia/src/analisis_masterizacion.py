"""Módulo técnico 2: diagnóstico de mezcla y master con métricas explícitas.

La medición LUFS se calcula sobre los canales originales. El pico interpolado
a 4x es una estimación didáctica, no una certificación True Peak conforme.
"""
from __future__ import annotations

import argparse
import json
import logging
from pathlib import Path
from typing import Any

import librosa
import librosa.display
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np
import pyloudnorm as pyln
import scipy.signal
import soundfile as sf

LOGGER = logging.getLogger("tamv.mastering-analysis")


def cargar_audio_estereo(ruta_audio: str | Path, sr: int = 44100) -> tuple[np.ndarray, int]:
    path = Path(ruta_audio)
    if not path.is_file():
        raise FileNotFoundError(f"No existe el archivo: {path}")
    audio, original_sr = sf.read(path, always_2d=True, dtype="float32")
    if audio.size == 0 or not np.isfinite(audio).all():
        raise ValueError("El archivo está vacío o contiene valores no finitos.")
    if sr is not None and original_sr != sr:
        audio = librosa.resample(audio, orig_sr=original_sr, target_sr=sr, axis=0)
        used_sr = sr
    else:
        used_sr = int(original_sr)
    return np.asarray(audio, dtype=np.float32), int(used_sr)


def _db(value: float) -> float | None:
    if not np.isfinite(value):
        return None
    return float(20.0 * np.log10(max(float(value), 1e-12)))


def medir_niveles(audio: np.ndarray, sr: int) -> dict[str, Any]:
    """Mide pico y RMS sample-based; LUFS integrated sobre la señal multicanal."""
    signal = np.asarray(audio, dtype=np.float64)
    if signal.ndim == 1:
        signal = signal[:, np.newaxis]
    peak = float(np.max(np.abs(signal)))
    rms = float(np.sqrt(np.mean(signal ** 2)))
    meter = pyln.Meter(sr)
    try:
        integrated_loudness = float(meter.integrated_loudness(signal))
    except ValueError as exc:
        integrated_loudness = None
        LOGGER.warning("No se pudo medir LUFS; verifica duración y señal: %s", exc)

    peak_dbfs = _db(peak)
    rms_dbfs = _db(rms)
    crest = (peak_dbfs - rms_dbfs) if peak_dbfs is not None and rms_dbfs is not None else None
    return {
        "peak_linear": peak,
        "peak_dbfs_sample": peak_dbfs,
        "rms_linear_all_channels": rms,
        "rms_dbfs": rms_dbfs,
        "crest_factor_db": crest,
        "integrated_loudness_lufs": integrated_loudness,
        "channel_count": int(signal.shape[1]),
    }


def medir_true_peak_estimado(audio: np.ndarray, sr: int, factor: int = 4) -> dict[str, Any]:
    """Sobremuestrea con resample_poly; una estimación no sustituye un medidor conforme."""
    signal = np.asarray(audio, dtype=np.float64)
    if signal.ndim == 1:
        signal = signal[:, np.newaxis]
    if factor < 2 or factor > 16:
        raise ValueError("El factor de sobremuestreo didáctico debe estar entre 2 y 16.")
    oversampled = scipy.signal.resample_poly(signal, up=factor, down=1, axis=0)
    peak = float(np.max(np.abs(oversampled)))
    return {
        "estimated_true_peak_linear": peak,
        "estimated_true_peak_dbtp_4x": _db(peak),
        "oversampling_factor": factor,
        "measurement_note": "Estimación por sobremuestreo; valida la entrega final con un medidor True Peak conforme.",
    }


def analizar_espectro(audio: np.ndarray, sr: int, n_fft: int = 4096, hop_length: int = 1024) -> dict[str, np.ndarray]:
    """Promedia magnitudes por canal para evitar cancelación al sumar L/R antes del análisis."""
    signal = np.asarray(audio, dtype=np.float32)
    if signal.ndim == 1:
        signal = signal[:, np.newaxis]
    if signal.shape[0] < n_fft:
        raise ValueError(f"Audio demasiado corto para n_fft={n_fft}.")
    stft = librosa.stft(signal.T, n_fft=n_fft, hop_length=hop_length, window="hann", center=True)
    magnitude = np.mean(np.abs(stft), axis=0)
    frequencies = librosa.fft_frequencies(sr=sr, n_fft=n_fft)
    centroid = librosa.feature.spectral_centroid(S=magnitude, sr=sr, n_fft=n_fft)[0]
    rolloff = librosa.feature.spectral_rolloff(S=magnitude, sr=sr, n_fft=n_fft, roll_percent=0.85)[0]
    return {
        "frequencies_hz": frequencies,
        "mean_magnitude": np.mean(magnitude, axis=1),
        "centroid_hz": centroid,
        "rolloff_85_hz": rolloff,
        "magnitude": magnitude,
    }


def medir_correlacion_estereo(audio: np.ndarray) -> dict[str, Any]:
    """La correlación describe similitud L/R; no es una medida aislada de anchura."""
    signal = np.asarray(audio, dtype=np.float64)
    if signal.ndim == 1:
        signal = signal[:, np.newaxis]
    if signal.shape[1] < 2:
        return {"stereo_correlation": None, "interpretation": "Archivo mono; correlación estéreo no aplicable."}
    left, right = signal[:, 0], signal[:, 1]
    if np.std(left) < 1e-12 or np.std(right) < 1e-12:
        correlation = None
    else:
        value = float(np.corrcoef(left, right)[0, 1])
        correlation = value if np.isfinite(value) else None
    if correlation is None:
        description = "No concluyente: uno o ambos canales tienen varianza insuficiente."
    elif correlation < 0:
        description = "Correlación negativa: revisa compatibilidad mono y posibles inversiones de fase."
    elif correlation < 0.2:
        description = "Canales poco correlacionados; no implica por sí solo mayor anchura."
    elif correlation > 0.95:
        description = "Canales muy correlacionados; verifica en escucha si la imagen es casi mono."
    else:
        description = "Correlación positiva parcial; complementa con escucha y mediciones adicionales."
    return {"stereo_correlation": correlation, "interpretation": description}


def detectar_clipping(audio: np.ndarray, threshold: float = 0.999) -> dict[str, Any]:
    signal = np.asarray(audio)
    if signal.size == 0:
        raise ValueError("Audio vacío.")
    count = int(np.count_nonzero(np.abs(signal) >= threshold))
    return {
        "samples_at_or_above_threshold": count,
        "percent_at_or_above_threshold": float(100.0 * count / signal.size),
        "threshold_linear": threshold,
        "note": "La cuenta es una alerta sample-based; no prueba por sí sola clipping audible ni true peak.",
    }


def _save_plots(audio: np.ndarray, sr: int, spectrum: dict[str, np.ndarray], output: Path) -> tuple[str, str]:
    output.mkdir(parents=True, exist_ok=True)
    frequencies = spectrum["frequencies_hz"]
    mean_mag = spectrum["mean_magnitude"]
    valid = frequencies > 0
    fig, ax = plt.subplots(figsize=(12, 5), constrained_layout=True)
    ax.semilogx(frequencies[valid], 20 * np.log10(mean_mag[valid] + 1e-12))
    ax.set(title="Espectro promedio por magnitud (diagnóstico)", xlabel="Frecuencia (Hz)", ylabel="Magnitud relativa (dB)")
    ax.grid(True, which="both", alpha=0.25)
    ax.set_xlim(20, sr / 2)
    spectrum_path = output / "espectro_promedio.png"
    fig.savefig(spectrum_path, dpi=160)
    plt.close(fig)

    per_channel_mel = []
    channels = audio[:, None] if audio.ndim == 1 else audio
    for channel in range(channels.shape[1]):
        per_channel_mel.append(
            librosa.feature.melspectrogram(y=channels[:, channel], sr=sr, n_fft=2048, hop_length=512, power=2.0)
        )
    mel = np.mean(per_channel_mel, axis=0)
    mel_db = librosa.power_to_db(mel, ref=np.max)
    fig, ax = plt.subplots(figsize=(12, 5), constrained_layout=True)
    image = librosa.display.specshow(mel_db, sr=sr, hop_length=512, x_axis="time", y_axis="mel", ax=ax)
    ax.set(title="Espectrograma mel — promedio de potencia por canal", xlabel="Tiempo (s)", ylabel="Escala mel")
    fig.colorbar(image, ax=ax, format="%+2.0f dB")
    mel_path = output / "espectrograma_master.png"
    fig.savefig(mel_path, dpi=160)
    plt.close(fig)
    return spectrum_path.name, mel_path.name


def analizar_master(ruta_audio: str | Path, output_dir: str | Path = "output", sr: int = 44100) -> dict[str, Any]:
    source = Path(ruta_audio)
    output = Path(output_dir)
    output.mkdir(parents=True, exist_ok=True)
    audio, used_sr = cargar_audio_estereo(source, sr=sr)
    levels = medir_niveles(audio, used_sr)
    true_peak = medir_true_peak_estimado(audio, used_sr)
    spectrum = analizar_espectro(audio, used_sr)
    stereo = medir_correlacion_estereo(audio)
    clipping = detectar_clipping(audio)
    spectrum_plot, mel_plot = _save_plots(audio, used_sr, spectrum, output)

    report = {
        "source_file": source.name,
        "duration_seconds": round(float(len(audio) / used_sr), 4),
        "sample_rate_hz": used_sr,
        **levels,
        **true_peak,
        **stereo,
        **clipping,
        "spectral_centroid_mean_hz": round(float(np.mean(spectrum["centroid_hz"])), 3),
        "spectral_rolloff_85_mean_hz": round(float(np.mean(spectrum["rolloff_85_hz"])), 3),
        "spectrum_plot": spectrum_plot,
        "mel_plot": mel_plot,
        "limitation": (
            "El análisis cuantifica propiedades de la señal, no calidad artística. La estimación 4x de true peak "
            "no es un medidor certificado. No hay un objetivo LUFS universal para todos los destinos."
        ),
    }
    report_path = output / "reporte_master.json"
    report_path.write_text(json.dumps(report, indent=2, ensure_ascii=False), encoding="utf-8")
    return report


def main() -> None:
    parser = argparse.ArgumentParser(description="Diagnóstico de niveles, loudness, espectro y estéreo.")
    parser.add_argument("audio", type=Path)
    parser.add_argument("--output", type=Path, default=Path("output"))
    parser.add_argument("--sr", type=int, default=44100)
    args = parser.parse_args()
    logging.basicConfig(level=logging.INFO, format="%(levelname)s %(message)s")
    report = analizar_master(args.audio, args.output, args.sr)
    print(json.dumps(report, indent=2, ensure_ascii=False))


if __name__ == "__main__":
    main()
