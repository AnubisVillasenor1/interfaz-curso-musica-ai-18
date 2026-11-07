"""Pruebas de contrato sobre señales sintéticas; no requieren audio comercial ni modelos Demucs."""
from __future__ import annotations

import unittest

import numpy as np

from src.analisis_masterizacion import (
    detectar_clipping,
    medir_correlacion_estereo,
    medir_niveles,
    medir_true_peak_estimado,
)
from src.analisis_musical import extraer_caracteristicas
from src.compresor_simple import compresor_simple


class AudioLabContractTests(unittest.TestCase):
    def setUp(self) -> None:
        self.sr = 22050
        time = np.arange(self.sr * 3, dtype=np.float64) / self.sr
        tone = 0.18 * np.sin(2 * np.pi * 440 * time) + 0.05 * np.sin(2 * np.pi * 880 * time)
        self.mono = tone.astype(np.float32)
        self.stereo = np.column_stack([self.mono, 0.7 * self.mono]).astype(np.float32)

    def test_module_one_features_are_finite_and_aligned(self) -> None:
        frame, features, tempo, onsets = extraer_caracteristicas(self.mono, self.sr, n_fft=1024, hop_length=256)
        self.assertGreater(len(frame), 0)
        self.assertEqual(len(frame["time_s"]), len(features["rms"]))
        self.assertEqual(len(frame), len(frame["centroid_hz"]))
        self.assertTrue(np.isfinite(frame.select_dtypes(include=[np.number]).to_numpy()).all())
        self.assertEqual(features["chroma"].shape[0], 12)
        self.assertTrue(np.isfinite(tempo))
        self.assertTrue(np.isfinite(onsets).all())

    def test_compressor_does_not_hard_clip_and_respects_safety_ceiling(self) -> None:
        source = np.tile(np.array([0.0, 0.5, -0.5, 0.2, -0.2], dtype=float), 1000)
        processed, reduction, safety = compresor_simple(
            source, 48000, threshold_db=-24, ratio=4,
            attack_ms=2, release_ms=80, makeup_gain_db=12, knee_db=6, ceiling_dbfs=-1,
        )
        self.assertTrue(np.isfinite(processed).all())
        self.assertTrue(np.isfinite(reduction).all())
        self.assertLessEqual(float(np.max(np.abs(processed))), 10 ** (-1 / 20) + 1e-7)
        self.assertLessEqual(float(safety), 0.0)

    def test_compressor_is_near_identity_below_threshold(self) -> None:
        source = np.full(4000, 0.05, dtype=float)
        processed, reduction, _ = compresor_simple(
            source, 48000, threshold_db=-6, ratio=2, attack_ms=10, release_ms=100,
            makeup_gain_db=0, knee_db=0, ceiling_dbfs=-1,
        )
        self.assertTrue(np.allclose(processed, source, atol=1e-6))
        self.assertTrue(np.allclose(reduction, 0, atol=1e-6))

    def test_mastering_metrics_use_channels_and_return_finite_levels(self) -> None:
        metrics = medir_niveles(self.stereo, self.sr)
        self.assertEqual(metrics["channel_count"], 2)
        self.assertTrue(np.isfinite(metrics["peak_dbfs_sample"]))
        self.assertTrue(np.isfinite(metrics["rms_dbfs"]))
        self.assertIsNotNone(metrics["integrated_loudness_lufs"])
        peak = medir_true_peak_estimado(self.stereo, self.sr)
        self.assertIsNotNone(peak["estimated_true_peak_dbtp_4x"])

    def test_stereo_correlation_flags_antiphase(self) -> None:
        result = medir_correlacion_estereo(np.column_stack([self.mono, -self.mono]))
        self.assertAlmostEqual(result["stereo_correlation"], -1.0, places=6)
        self.assertIn("negativa", result["interpretation"])

    def test_clipping_detector_returns_fraction_and_count(self) -> None:
        signal = np.array([[0.1, -1.0], [0.998, 0.2], [1.1, 0.0]])
        result = detectar_clipping(signal, threshold=0.999)
        self.assertEqual(result["samples_at_or_above_threshold"], 2)
        self.assertAlmostEqual(result["percent_at_or_above_threshold"], 100 * 2 / 6)


if __name__ == "__main__":
    unittest.main()
