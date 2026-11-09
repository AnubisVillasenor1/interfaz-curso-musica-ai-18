"""Pruebas de la referencia NumPy del contrato TAMV-AudioCore v2.0.

Se ejecutan sin pytest ni librerías de audio externas:

    cd services/audiocore
    python -m unittest discover -s tests -v
"""

from __future__ import annotations

import math
import unittest

import numpy as np

from audiocore.reference import (
    CORE_VERSION,
    SPECTRAL_BANDS_HZ,
    analyse_pcm,
    analyse_spectrum,
    chroma_from_spectrum,
    estimate_key,
    spectral_contrast,
    spectrum_from_pcm,
)


def tone_spectrum(frequency_hz: float, sample_rate: int = 48_000, fft_size: int = 4_096) -> np.ndarray:
    """Espectro de magnitud con un tono puro en la frecuencia pedida."""
    bins = fft_size // 2
    spectrum = np.full(bins, -120.0, dtype=np.float64)
    target = frequency_hz / (sample_rate / fft_size)
    low = int(math.floor(target))
    high = int(math.ceil(target))
    spectrum[low] = 0.0
    if high != low:
        spectrum[high] = -3.0
    return spectrum


class ChromaTests(unittest.TestCase):
    def test_tone_maps_to_its_pitch_class(self) -> None:
        chroma = chroma_from_spectrum(tone_spectrum(440.0), 48_000, 4_096)
        self.assertEqual(chroma.shape, (12,))
        self.assertAlmostEqual(float(np.linalg.norm(chroma)), 1.0, places=6)
        # A = índice 9 en la nomenclatura C..B.
        self.assertEqual(int(np.argmax(chroma)), 9)

    def test_silence_is_an_empty_chroma_not_a_guess(self) -> None:
        chroma = chroma_from_spectrum(np.full(2_048, -120.0), 48_000, 4_096)
        self.assertTrue(np.allclose(chroma, 0.0))

    def test_invalid_spectrum_size_is_handled_by_contract(self) -> None:
        with self.assertRaises(ValueError):
            analyse_spectrum([])


class KeyTests(unittest.TestCase):
    def test_c_major_triad_prefers_c_major(self) -> None:
        chroma = np.zeros(12)
        chroma[[0, 4, 7]] = 1.0
        result = estimate_key(chroma)
        self.assertTrue(result["valid"])
        self.assertEqual(result["tonic"], "C")
        self.assertEqual(result["mode"], "major")
        self.assertEqual(len(result["candidates"]), 3)
        self.assertGreater(result["confidence"], 0.3)

    def test_a_minor_triad_prefers_a_minor(self) -> None:
        chroma = np.zeros(12)
        chroma[[9, 0, 4]] = 1.0
        result = estimate_key(chroma)
        self.assertEqual(result["key"], "A minor")

    def test_empty_chroma_is_not_a_key(self) -> None:
        result = estimate_key(np.zeros(12))
        self.assertFalse(result["valid"])
        self.assertIsNone(result["key"])
        self.assertEqual(result["confidence"], 0.0)


class ContrastTests(unittest.TestCase):
    def test_returns_one_entry_per_declared_band(self) -> None:
        result = spectral_contrast(tone_spectrum(440.0), 48_000, 4_096)
        self.assertEqual(len(result["bands"]), len(SPECTRAL_BANDS_HZ))
        self.assertIsInstance(result["meanDb"], float)

    def test_flat_spectrum_has_zero_contrast(self) -> None:
        flat = np.full(2_048, -24.0)
        result = spectral_contrast(flat, 48_000, 4_096)
        self.assertAlmostEqual(result["meanDb"], 0.0, places=5)


class PcmTests(unittest.TestCase):
    def test_spectrum_from_pcm_peaks_near_the_input_tone(self) -> None:
        sample_rate = 48_000
        fft_size = 4_096
        t = np.arange(fft_size) / sample_rate
        samples = 0.5 * np.sin(2 * np.pi * 440.0 * t)
        spectrum = spectrum_from_pcm(samples, sample_rate, fft_size)
        expected_bin = 440.0 / (sample_rate / fft_size)
        peak = int(np.argmax(spectrum))
        self.assertLessEqual(abs(peak - expected_bin), 2.0)

    def test_analyse_pcm_returns_the_same_contract(self) -> None:
        sample_rate = 48_000
        t = np.arange(4_096) / sample_rate
        result = analyse_pcm(0.4 * np.sin(2 * np.pi * 440.0 * t), sample_rate, 4_096)
        self.assertEqual(result["coreVersion"], CORE_VERSION)
        self.assertIn(result["engine"], {"numpy", "native"})
        self.assertEqual(len(result["chroma"]), 12)
        self.assertEqual(int(np.argmax(result["chroma"])), 9)
        self.assertEqual(result["fftSize"] if "fftSize" in result else 4_096, 4_096)


if __name__ == "__main__":
    unittest.main()
