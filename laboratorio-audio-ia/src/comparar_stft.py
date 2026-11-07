"""Compara resolución temporal/frecuencial en varias STFT, sin suponer una configuración universal."""
from __future__ import annotations

import argparse
from pathlib import Path

import librosa
import librosa.display
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np

from src.analisis_musical import cargar_audio


def comparar_stft(
    ruta_audio: str | Path,
    output_dir: str | Path = "output",
    configs: list[dict[str, int]] | None = None,
) -> Path:
    signal, sr = cargar_audio(ruta_audio, sr=22050, mono=True)
    signal = signal[: sr * 15]
    if configs is None:
        configs = [
            {"n_fft": 256, "hop_length": 64},
            {"n_fft": 1024, "hop_length": 256},
            {"n_fft": 2048, "hop_length": 512},
            {"n_fft": 4096, "hop_length": 1024},
        ]
    if len(configs) != 4:
        raise ValueError("La comparación visual espera exactamente cuatro configuraciones.")
    output = Path(output_dir)
    output.mkdir(parents=True, exist_ok=True)
    fig, axes = plt.subplots(2, 2, figsize=(14, 9), constrained_layout=True)
    for axis, config in zip(axes.flat, configs):
        n_fft, hop = config["n_fft"], config["hop_length"]
        if signal.size < n_fft:
            raise ValueError(f"La pista recortada es demasiado corta para n_fft={n_fft}.")
        spectrum = librosa.stft(signal, n_fft=n_fft, hop_length=hop, window="hann", center=True)
        decibels = librosa.amplitude_to_db(np.abs(spectrum), ref=np.max)
        image = librosa.display.specshow(
            decibels, sr=sr, hop_length=hop, x_axis="time", y_axis="linear", ax=axis
        )
        axis.set(title=f"n_fft={n_fft} · hop_length={hop}", xlabel="Tiempo (s)", ylabel="Frecuencia (Hz)")
        fig.colorbar(image, ax=axis, format="%+2.0f dB")
    destination = output / "comparacion_stft.png"
    fig.savefig(destination, dpi=160)
    plt.close(fig)
    return destination


def main() -> None:
    parser = argparse.ArgumentParser(description="Compara configuraciones STFT.")
    parser.add_argument("audio", type=Path)
    parser.add_argument("--output", type=Path, default=Path("output"))
    args = parser.parse_args()
    print(f"Gráfica guardada en: {comparar_stft(args.audio, args.output)}")


if __name__ == "__main__":
    main()
