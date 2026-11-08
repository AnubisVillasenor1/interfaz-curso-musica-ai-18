"""Compresor didáctico con soft knee, detector enlazado L/R y techo de seguridad.

No es un sustituto de un compresor de estudio ni de un limitador true-peak.
El techo reduce la ganancia global si la salida lo supera; no usa clipping duro.
"""
from __future__ import annotations

import argparse
import json
from pathlib import Path

import numpy as np
import soundfile as sf


def _compression_curve(level_db: float, threshold_db: float, ratio: float, knee_db: float) -> float:
    """Salida estática (dB) del detector, con curva soft-knee continua."""
    if knee_db <= 0:
        return threshold_db + (level_db - threshold_db) / ratio if level_db > threshold_db else level_db
    lower = threshold_db - knee_db / 2
    upper = threshold_db + knee_db / 2
    if level_db < lower:
        return level_db
    if level_db > upper:
        return threshold_db + (level_db - threshold_db) / ratio
    offset = level_db - threshold_db + knee_db / 2
    return level_db + (1.0 / ratio - 1.0) * (offset ** 2) / (2.0 * knee_db)


def compresor_simple(
    audio: np.ndarray,
    sample_rate: int,
    threshold_db: float = -20.0,
    ratio: float = 3.0,
    attack_ms: float = 10.0,
    release_ms: float = 150.0,
    makeup_gain_db: float = 0.0,
    knee_db: float = 6.0,
    ceiling_dbfs: float = -1.0,
) -> tuple[np.ndarray, np.ndarray, float]:
    """Procesa audio mono/estéreo y devuelve señal, curva de reducción y ganancia de seguridad."""
    original = np.asarray(audio, dtype=np.float64)
    was_mono = original.ndim == 1
    if was_mono:
        original = original[:, np.newaxis]
    if original.ndim != 2 or original.shape[0] == 0 or not np.isfinite(original).all():
        raise ValueError("El audio debe ser un array mono/estéreo no vacío y finito.")
    if sample_rate <= 0:
        raise ValueError("sample_rate debe ser positivo.")
    if not (1 <= ratio <= 20):
        raise ValueError("ratio debe estar entre 1 y 20 para un compresor.")
    if attack_ms <= 0 or release_ms <= 0:
        raise ValueError("attack_ms y release_ms deben ser positivos.")
    if knee_db < 0 or knee_db > 24:
        raise ValueError("knee_db debe estar entre 0 y 24.")
    if ceiling_dbfs >= 0:
        raise ValueError("El techo debe estar por debajo de 0 dBFS.")

    attack_coef = float(np.exp(-1.0 / (sample_rate * attack_ms / 1000.0)))
    release_coef = float(np.exp(-1.0 / (sample_rate * release_ms / 1000.0)))
    detector = np.max(np.abs(original), axis=1)
    gain_reduction_db = np.zeros(len(detector), dtype=np.float64)
    previous_gain = 0.0

    for index, sample_peak in enumerate(detector):
        level_db = 20.0 * np.log10(max(float(sample_peak), 1e-12))
        target_output_db = _compression_curve(level_db, threshold_db, ratio, knee_db)
        desired_gain_db = target_output_db - level_db
        coefficient = attack_coef if desired_gain_db < previous_gain else release_coef
        previous_gain = coefficient * previous_gain + (1.0 - coefficient) * desired_gain_db
        gain_reduction_db[index] = previous_gain

    gain = (10.0 ** (gain_reduction_db / 20.0))[:, np.newaxis]
    processed = original * gain * (10.0 ** (makeup_gain_db / 20.0))
    ceiling_linear = 10.0 ** (ceiling_dbfs / 20.0)
    peak_after_makeup = float(np.max(np.abs(processed)))
    safety_gain_db = 0.0
    if peak_after_makeup > ceiling_linear:
        safety_gain_db = float(20.0 * np.log10(ceiling_linear / peak_after_makeup))
        processed *= 10.0 ** (safety_gain_db / 20.0)
    if not np.isfinite(processed).all():
        raise RuntimeError("El compresor produjo valores no finitos.")
    return (processed[:, 0] if was_mono else processed), gain_reduction_db, safety_gain_db


def procesar(ruta_entrada: str | Path, ruta_salida: str | Path, **settings: float) -> dict[str, float | str]:
    audio, sr = sf.read(ruta_entrada, always_2d=True, dtype="float32")
    processed, reduction, safety_gain = compresor_simple(audio, sr, **settings)
    destination = Path(ruta_salida)
    destination.parent.mkdir(parents=True, exist_ok=True)
    sf.write(destination, processed, sr, subtype="PCM_24")
    report = {
        "input": str(ruta_entrada),
        "output": str(destination),
        "sample_rate_hz": int(sr),
        "max_gain_reduction_db": round(float(-np.min(reduction)), 3),
        "mean_gain_reduction_db": round(float(-np.mean(reduction)), 3),
        "safety_gain_db": round(safety_gain, 3),
        "ceiling_dbfs": float(settings.get("ceiling_dbfs", -1.0)),
        "note": "La ganancia de seguridad baja la salida completa si hace falta; no equivale a true-peak limiting.",
    }
    report_path = destination.with_suffix(".report.json")
    report_path.write_text(json.dumps(report, indent=2, ensure_ascii=False), encoding="utf-8")
    return report


def main() -> None:
    parser = argparse.ArgumentParser(description="Compresor educativo con soft knee y ganancia de seguridad.")
    parser.add_argument("input", type=Path)
    parser.add_argument("output", type=Path)
    parser.add_argument("--threshold", type=float, default=-20.0)
    parser.add_argument("--ratio", type=float, default=3.0)
    parser.add_argument("--attack", type=float, default=10.0)
    parser.add_argument("--release", type=float, default=150.0)
    parser.add_argument("--makeup", type=float, default=0.0)
    parser.add_argument("--knee", type=float, default=6.0)
    parser.add_argument("--ceiling", type=float, default=-1.0)
    args = parser.parse_args()
    report = procesar(
        args.input, args.output,
        threshold_db=args.threshold, ratio=args.ratio,
        attack_ms=args.attack, release_ms=args.release,
        makeup_gain_db=args.makeup, knee_db=args.knee,
        ceiling_dbfs=args.ceiling,
    )
    print(json.dumps(report, indent=2, ensure_ascii=False))


if __name__ == "__main__":
    main()
