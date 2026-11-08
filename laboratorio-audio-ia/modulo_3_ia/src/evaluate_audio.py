"""Technical audio QC. This measures signal features; it does not judge artistic quality."""
from __future__ import annotations

import argparse
import json
from pathlib import Path


def evaluate_audio(audio_path: str | Path) -> dict:
    try:
        import librosa
        import numpy as np
        import soundfile as sf
        from scipy.signal import resample_poly
    except ImportError as exc:
        raise RuntimeError("Install the audio-lab requirements before running QC") from exc

    source = Path(audio_path)
    if not source.is_file():
        raise FileNotFoundError(source)
    audio, sample_rate = sf.read(str(source), always_2d=True, dtype="float32")
    if audio.size == 0:
        raise ValueError("Audio file is empty")
    if sample_rate <= 0:
        raise ValueError("Invalid sample rate")

    mono = np.mean(audio, axis=1)
    peak = float(np.max(np.abs(audio)))
    rms = float(np.sqrt(np.mean(np.square(mono))))
    peak_dbfs = 20.0 * np.log10(peak + 1e-12)
    rms_dbfs = 20.0 * np.log10(rms + 1e-12)
    clipping_samples = int(np.count_nonzero(np.abs(audio) >= 0.999))

    oversampled = resample_poly(audio, up=4, down=1, axis=0)
    true_peak_estimate = float(np.max(np.abs(oversampled)))
    true_peak_dbfs = 20.0 * np.log10(true_peak_estimate + 1e-12)

    centroid = librosa.feature.spectral_centroid(y=mono, sr=sample_rate)[0]
    rolloff = librosa.feature.spectral_rolloff(y=mono, sr=sample_rate)[0]
    flatness = librosa.feature.spectral_flatness(y=mono)[0]
    frame_rms = librosa.feature.rms(y=mono)[0]

    integrated_lufs = None
    lufs_note = None
    try:
        import pyloudnorm as pyln
        integrated_lufs = float(pyln.Meter(sample_rate).integrated_loudness(audio))
    except Exception as exc:
        lufs_note = f"LUFS unavailable for this file: {type(exc).__name__}"

    stereo_correlation = None
    if audio.shape[1] == 2 and np.std(audio[:, 0]) > 0 and np.std(audio[:, 1]) > 0:
        stereo_correlation = float(np.corrcoef(audio[:, 0], audio[:, 1])[0, 1])

    return {
        "file": source.name,
        "duration_seconds": round(len(mono) / sample_rate, 4),
        "sample_rate_hz": int(sample_rate),
        "channels": int(audio.shape[1]),
        "sample_peak_dbfs": round(peak_dbfs, 3),
        "rms_dbfs": round(rms_dbfs, 3),
        "integrated_lufs": round(integrated_lufs, 3) if integrated_lufs is not None else None,
        "lufs_note": lufs_note,
        "true_peak_dbfs_estimate_4x": round(true_peak_dbfs, 3),
        "true_peak_method": "4x polyphase oversampling estimate; not a standards-compliance certification",
        "clipping_samples_at_or_above_approx_minus_0_009_dbfs": clipping_samples,
        "clipping_detected": clipping_samples > 0,
        "spectral_centroid_mean_hz": round(float(np.mean(centroid)), 2),
        "spectral_rolloff_mean_hz": round(float(np.mean(rolloff)), 2),
        "spectral_flatness_mean": round(float(np.mean(flatness)), 6),
        "low_energy_frame_ratio_approx": round(float(np.mean(frame_rms < 1e-4)), 4),
        "stereo_correlation": round(stereo_correlation, 4) if stereo_correlation is not None else None,
        "audible_artifacts": "not assessed automatically; requires critical listening",
        "limitations": [
            "Metrics do not establish harmonic coherence, arrangement quality or artistic intention.",
            "The 4x oversampled peak is an estimate, not an ITU-R BS.1770 true-peak compliance measurement.",
            "Listen for masking, metallic artifacts, poor transitions, fatigue and mono incompatibility.",
        ],
    }


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("audio")
    parser.add_argument("--output", default=None)
    args = parser.parse_args()
    report = evaluate_audio(args.audio)
    output = Path(args.output) if args.output else Path(args.audio).with_suffix(".qc.json")
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps(report, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
