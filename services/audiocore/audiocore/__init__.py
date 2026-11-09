"""TAMV-AudioCore v2.0 · referencia NumPy y servicio HTTP."""

from .reference import (
    CORE_VERSION,
    HAS_NATIVE,
    NOTE_NAMES,
    SPECTRAL_BANDS_HZ,
    analyse_pcm,
    analyse_spectrum,
    chroma_from_spectrum,
    engine_info,
    estimate_key,
    spectral_contrast,
    spectrum_from_pcm,
)

__all__ = [
    "CORE_VERSION",
    "HAS_NATIVE",
    "NOTE_NAMES",
    "SPECTRAL_BANDS_HZ",
    "analyse_pcm",
    "analyse_spectrum",
    "chroma_from_spectrum",
    "engine_info",
    "estimate_key",
    "spectral_contrast",
    "spectrum_from_pcm",
]
