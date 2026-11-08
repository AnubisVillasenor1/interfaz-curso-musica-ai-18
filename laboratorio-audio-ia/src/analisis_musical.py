"""Módulo técnico 1: análisis acústico y características musicales.

Uso:
  python src/analisis_musical.py audio/cancion.wav --output output \
      --source-license "CC BY 4.0" --title "Pieza de práctica"

El análisis describe señales; no identifica instrumentos ni acordes de manera
infalible. Interpreta las gráficas junto con escucha crítica y procedencia.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import logging
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import librosa
import librosa.display
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
import soundfile as sf

LOGGER = logging.getLogger("tamv.audio-analysis")
CHROMA_NAMES = ("C", "C_sharp", "D", "D_sharp", "E", "F", "F_sharp", "G", "G_sharp", "A", "A_sharp", "B")


def _finite_audio(y: np.ndarray) -> np.ndarray:
    arr = np.asarray(y, dtype=np.float32)
    if arr.size == 0:
        raise ValueError("El archivo no contiene muestras de audio.")
    if not np.isfinite(arr).all():
        raise ValueError("El audio contiene NaN o infinitos; limpia la señal antes del análisis.")
    return arr


def cargar_audio(ruta_audio: str | Path, sr: int = 22050, mono: bool = True) -> tuple[np.ndarray, int]:
    """Carga y remuestrea explícitamente; sr=None conserva la tasa original."""
    path = Path(ruta_audio)
    if not path.is_file():
        raise FileNotFoundError(f"No se encontró el archivo: {path}")
    if sr is not None and (not isinstance(sr, int) or sr < 8000):
        raise ValueError("La tasa de análisis debe ser None o un entero de al menos 8000 Hz.")
    audio, sample_rate = librosa.load(path.as_posix(), sr=sr, mono=mono, dtype=np.float32)
    audio = _finite_audio(audio)
    if audio.ndim not in (1, 2):
        raise ValueError(f"Formato de audio inesperado: {audio.shape}")
    return audio, int(sample_rate)


def calcular_stft(y: np.ndarray, n_fft: int = 2048, hop_length: int = 512) -> tuple[np.ndarray, np.ndarray, np.ndarray]:
    """Devuelve STFT compleja, magnitud y potencia con ventana Hann centrada."""
    signal = _finite_audio(y)
    if signal.ndim != 1:
        raise ValueError("calcular_stft espera una señal mono; promedia o analiza los canales por separado.")
    if n_fft < 64 or n_fft & (n_fft - 1):
        raise ValueError("n_fft debe ser una potencia de dos de al menos 64 muestras.")
    if hop_length < 1 or hop_length > n_fft:
        raise ValueError("hop_length debe estar entre 1 y n_fft.")
    if signal.size < n_fft:
        raise ValueError(f"El audio es demasiado corto para n_fft={n_fft}; usa una ventana menor o una pista más larga.")
    stft = librosa.stft(signal, n_fft=n_fft, hop_length=hop_length, window="hann", center=True)
    magnitude = np.abs(stft)
    power = magnitude ** 2
    return stft, magnitude, power


def extraer_caracteristicas(
    y: np.ndarray,
    sr: int,
    n_fft: int = 2048,
    hop_length: int = 512,
) -> tuple[pd.DataFrame, dict[str, np.ndarray], float, np.ndarray]:
    """Extrae características alineadas por frame, además del tempo y los onsets."""
    signal = _finite_audio(y)
    if signal.ndim != 1:
        raise ValueError("El extractor espera audio mono.")
    if sr <= 0:
        raise ValueError("La tasa de muestreo debe ser positiva.")
    _, magnitude, power = calcular_stft(signal, n_fft=n_fft, hop_length=hop_length)

    rms = librosa.feature.rms(y=signal, frame_length=n_fft, hop_length=hop_length, center=True)[0]
    centroid = librosa.feature.spectral_centroid(S=magnitude, sr=sr, n_fft=n_fft)[0]
    rolloff = librosa.feature.spectral_rolloff(S=magnitude, sr=sr, n_fft=n_fft, roll_percent=0.85)[0]
    zcr = librosa.feature.zero_crossing_rate(signal, frame_length=n_fft, hop_length=hop_length, center=True)[0]
    flatness = librosa.feature.spectral_flatness(S=magnitude, n_fft=n_fft, power=2.0)[0]
    chroma = librosa.feature.chroma_stft(S=power, sr=sr, n_fft=n_fft, hop_length=hop_length)

    onset_env = librosa.onset.onset_strength(y=signal, sr=sr, hop_length=hop_length)
    tempo_values = librosa.beat.tempo(onset_envelope=onset_env, sr=sr, hop_length=hop_length)
    tempo = float(tempo_values[0]) if np.size(tempo_values) else 0.0
    onsets = librosa.onset.onset_detect(
        onset_envelope=onset_env, sr=sr, hop_length=hop_length, units="time"
    ).astype(float)

    frames = len(rms)
    times = librosa.frames_to_time(np.arange(frames), sr=sr, hop_length=hop_length)
    onset_aligned = np.zeros(frames, dtype=float)
    onset_aligned[: min(frames, len(onset_env))] = onset_env[: min(frames, len(onset_env))]
    if len(onset_env) > frames:
        LOGGER.debug("Se recortó onset_strength para alinear el CSV.")
    if not all(len(values) == frames for values in (centroid, rolloff, zcr, flatness)):
        raise RuntimeError("Las características no quedaron alineadas; revisa n_fft/hop_length y versión de librosa.")

    data: dict[str, Any] = {
        "time_s": times,
        "rms_linear": rms,
        "centroid_hz": centroid,
        "rolloff_85_hz": rolloff,
        "zero_crossing_rate": zcr,
        "spectral_flatness": flatness,
        "onset_strength": onset_aligned,
    }
    for index, name in enumerate(CHROMA_NAMES):
        data[f"chroma_{name}"] = chroma[index, :frames]
    frame = pd.DataFrame(data)
    features = {
        "magnitude": magnitude,
        "power": power,
        "chroma": chroma,
        "rms": rms,
        "centroid": centroid,
        "rolloff": rolloff,
        "zcr": zcr,
        "flatness": flatness,
        "onset_strength": onset_aligned,
    }
    return frame, features, tempo, onsets


def _plot_overview(
    y: np.ndarray, sr: int, features: dict[str, np.ndarray],
    n_fft: int, hop_length: int, output_path: Path,
) -> None:
    stft_db = librosa.amplitude_to_db(features["magnitude"], ref=np.max)
    mel_power = librosa.feature.melspectrogram(
        y=y, sr=sr, n_fft=n_fft, hop_length=hop_length, power=2.0
    )
    mel_db = librosa.power_to_db(mel_power, ref=np.max)

    fig, axes = plt.subplots(4, 1, figsize=(14, 13), constrained_layout=True)
    librosa.display.waveshow(y, sr=sr, ax=axes[0], max_points=100_000)
    axes[0].set(title="Forma de onda", xlabel="Tiempo (s)", ylabel="Amplitud")

    librosa.display.specshow(
        stft_db, sr=sr, hop_length=hop_length, x_axis="time", y_axis="linear", ax=axes[1]
    )
    axes[1].set(title="STFT — magnitud relativa en dB", ylabel="Frecuencia (Hz)")
    fig.colorbar(axes[1].collections[0], ax=axes[1], format="%+2.0f dB")

    librosa.display.specshow(
        mel_db, sr=sr, hop_length=hop_length, x_axis="time", y_axis="mel", ax=axes[2]
    )
    axes[2].set(title="Espectrograma mel — potencia relativa en dB", ylabel="Escala mel")
    fig.colorbar(axes[2].collections[0], ax=axes[2], format="%+2.0f dB")

    librosa.display.specshow(
        features["chroma"], sr=sr, hop_length=hop_length, x_axis="time", y_axis="chroma", ax=axes[3]
    )
    axes[3].set(title="Cromagrama STFT (clases de altura)", ylabel="Clase de altura")
    fig.savefig(output_path, dpi=160)
    plt.close(fig)


def _plot_features(frame: pd.DataFrame, output_path: Path) -> None:
    fig, axes = plt.subplots(4, 1, figsize=(13, 10), sharex=True, constrained_layout=True)
    series = [
        ("rms_linear", "RMS (amplitud lineal)"),
        ("centroid_hz", "Centroide espectral (Hz)"),
        ("rolloff_85_hz", "Rolloff al 85 % (Hz)"),
        ("zero_crossing_rate", "Tasa de cruces por cero"),
    ]
    for axis, (column, label) in zip(axes, series):
        axis.plot(frame["time_s"], frame[column], linewidth=0.9)
        axis.set_ylabel(label)
        axis.grid(alpha=0.25)
    axes[-1].set_xlabel("Tiempo (s)")
    fig.savefig(output_path, dpi=160)
    plt.close(fig)


def _sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def analizar_cancion(
    ruta_audio: str | Path,
    output_dir: str | Path = "output",
    sr: int = 22050,
    n_fft: int = 2048,
    hop_length: int = 512,
    title: str | None = None,
    source_license: str = "no documentada",
) -> dict[str, Any]:
    """Ejecuta el laboratorio, genera CSV, gráficas, JSON y manifiesto de trazabilidad."""
    source = Path(ruta_audio)
    out = Path(output_dir)
    out.mkdir(parents=True, exist_ok=True)
    y, used_sr = cargar_audio(source, sr=sr, mono=True)
    frame, features, tempo, onsets = extraer_caracteristicas(y, used_sr, n_fft, hop_length)

    csv_path = out / "caracteristicas_musicales.csv"
    overview_path = out / "analisis_musical.png"
    temporal_path = out / "caracteristicas_temporales.png"
    report_path = out / "reporte_analisis.json"
    manifest_path = out / "manifest.json"

    frame.to_csv(csv_path, index=False)
    _plot_overview(y, used_sr, features, n_fft, hop_length, overview_path)
    _plot_features(frame, temporal_path)

    metadata = sf.info(source)
    summary: dict[str, Any] = {
        "title": title or source.stem,
        "source_file": source.name,
        "duration_seconds": round(float(len(y) / used_sr), 4),
        "analysis_sample_rate_hz": used_sr,
        "original_sample_rate_hz": int(metadata.samplerate),
        "original_channels": int(metadata.channels),
        "n_fft": n_fft,
        "hop_length": hop_length,
        "estimated_tempo_bpm": round(float(tempo), 3),
        "onset_count": int(len(onsets)),
        "rms_mean": round(float(np.mean(features["rms"])), 8),
        "spectral_centroid_mean_hz": round(float(np.mean(features["centroid"])), 3),
        "spectral_rolloff_85_mean_hz": round(float(np.mean(features["rolloff"])), 3),
        "zcr_mean": round(float(np.mean(features["zcr"])), 8),
        "spectral_flatness_mean": round(float(np.mean(features["flatness"])), 8),
        "csv": csv_path.name,
        "overview_plot": overview_path.name,
        "feature_plot": temporal_path.name,
        "interpretation_limit": (
            "Tempo, chroma y características son estimaciones numéricas; no prueban por sí solos "
            "qué instrumento suena ni qué acorde se percibe. Valida con escucha y, si hace falta, DAW."
        ),
    }
    report_path.write_text(json.dumps(summary, indent=2, ensure_ascii=False), encoding="utf-8")
    manifest = {
        "schema": "tamv-audio-lab-manifest-v1",
        "created_at_utc": datetime.now(timezone.utc).isoformat(),
        "author": "Edwin Oswaldo Castillo Trejo",
        "institutional_brand": "TAMV Online Network",
        "ai_support": "Apoyo técnico y editorial de IA; los resultados requieren verificación humana.",
        "source_file": source.name,
        "source_sha256": _sha256(source),
        "source_license_or_permission": source_license,
        "analysis": {"library": "librosa", "version": librosa.__version__, "sample_rate_hz": used_sr, "n_fft": n_fft, "hop_length": hop_length},
        "outputs": [csv_path.name, overview_path.name, temporal_path.name, report_path.name],
    }
    manifest_path.write_text(json.dumps(manifest, indent=2, ensure_ascii=False), encoding="utf-8")
    return summary


def main() -> None:
    parser = argparse.ArgumentParser(description="Análisis acústico y espectral de una pista musical.")
    parser.add_argument("audio", type=Path, help="WAV/FLAC u otro formato admitido por librosa.")
    parser.add_argument("--output", type=Path, default=Path("output"), help="Carpeta de artefactos.")
    parser.add_argument("--sr", type=int, default=22050, help="Tasa de análisis; 22050 Hz por defecto.")
    parser.add_argument("--n-fft", type=int, default=2048, help="Tamaño de ventana FFT.")
    parser.add_argument("--hop-length", type=int, default=512, help="Salto entre frames.")
    parser.add_argument("--title", default=None, help="Título descriptivo para el manifiesto.")
    parser.add_argument("--source-license", default="no documentada", help="Licencia/permiso declarado para el audio.")
    args = parser.parse_args()

    logging.basicConfig(level=logging.INFO, format="%(levelname)s %(message)s")
    summary = analizar_cancion(
        args.audio, args.output, args.sr, args.n_fft, args.hop_length, args.title, args.source_license
    )
    print(json.dumps(summary, indent=2, ensure_ascii=False))


if __name__ == "__main__":
    main()
