"""Compara una mezcla original y un master: loudness, picos y diferencia espectral."""
from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Any

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np

from src.analisis_masterizacion import (
    analizar_espectro,
    cargar_audio_estereo,
    detectar_clipping,
    medir_niveles,
    medir_true_peak_estimado,
)


def _match_channels(audio: np.ndarray, channel_count: int) -> np.ndarray:
    if audio.shape[1] == channel_count:
        return audio
    if audio.shape[1] == 1 and channel_count == 2:
        return np.repeat(audio, 2, axis=1)
    if audio.shape[1] == 2 and channel_count == 1:
        return np.mean(audio, axis=1, keepdims=True)
    raise ValueError("Las versiones tienen un número de canales incompatible para compararlas.")


def comparar(ruta_a: str | Path, ruta_b: str | Path, output_dir: str | Path = "output") -> dict[str, Any]:
    a, sr_a = cargar_audio_estereo(ruta_a, sr=44100)
    b, sr_b = cargar_audio_estereo(ruta_b, sr=44100)
    if sr_a != sr_b:
        raise RuntimeError("No se pudo normalizar la tasa de muestreo.")
    channels = max(a.shape[1], b.shape[1])
    a, b = _match_channels(a, channels), _match_channels(b, channels)
    frames = min(len(a), len(b))
    if frames < sr_a // 2:
        raise ValueError("Las dos versiones deben compartir al menos 0.5 segundos de audio.")
    a, b = a[:frames], b[:frames]
    metrics_a, metrics_b = medir_niveles(a, sr_a), medir_niveles(b, sr_a)
    spectrum_a = analizar_espectro(a, sr_a)
    spectrum_b = analizar_espectro(b, sr_a)
    eps = 1e-12
    difference_db = 20.0 * np.log10((spectrum_b["mean_magnitude"] + eps) / (spectrum_a["mean_magnitude"] + eps))
    output = Path(output_dir)
    output.mkdir(parents=True, exist_ok=True)
    fig, ax = plt.subplots(figsize=(12, 5), constrained_layout=True)
    frequencies = spectrum_a["frequencies_hz"]
    valid = frequencies > 0
    ax.semilogx(frequencies[valid], difference_db[valid])
    ax.axhline(0, linestyle="--", alpha=0.6)
    ax.set(title="Diferencia de magnitud espectral: B menos A", xlabel="Frecuencia (Hz)", ylabel="Diferencia (dB)")
    ax.grid(True, which="both", alpha=0.25)
    ax.set_xlim(20, sr_a / 2)
    chart = output / "diferencia_espectral.png"
    fig.savefig(chart, dpi=160)
    plt.close(fig)

    loudness_a = metrics_a["integrated_loudness_lufs"]
    loudness_b = metrics_b["integrated_loudness_lufs"]
    report = {
        "version_a": str(ruta_a),
        "version_b": str(ruta_b),
        "comparison_window_seconds": round(frames / sr_a, 4),
        "sample_rate_hz": sr_a,
        "version_a_metrics": {**metrics_a, **medir_true_peak_estimado(a, sr_a), **detectar_clipping(a)},
        "version_b_metrics": {**metrics_b, **medir_true_peak_estimado(b, sr_a), **detectar_clipping(b)},
        "loudness_difference_lu_b_minus_a": (
            round(float(loudness_b - loudness_a), 3)
            if loudness_a is not None and loudness_b is not None else None
        ),
        "spectral_difference_chart": chart.name,
        "interpretation_note": (
            "Compara por escucha las versiones a sonoridad de reproducción igualada; el gráfico espectral bruto "
            "también refleja cambios globales de ganancia. Una diferencia métrica no prueba por sí sola una mejora."
        ),
    }
    (output / "comparacion_versiones.json").write_text(
        json.dumps(report, indent=2, ensure_ascii=False, allow_nan=False), encoding="utf-8"
    )
    return report


def main() -> None:
    parser = argparse.ArgumentParser(description="Comparación técnica A/B.")
    parser.add_argument("version_a", type=Path)
    parser.add_argument("version_b", type=Path)
    parser.add_argument("--output", type=Path, default=Path("output"))
    args = parser.parse_args()
    print(json.dumps(comparar(args.version_a, args.version_b, args.output), indent=2, ensure_ascii=False))


if __name__ == "__main__":
    main()
