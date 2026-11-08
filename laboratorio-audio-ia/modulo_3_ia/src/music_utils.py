"""Helpers for converting note names and chord symbols to MIDI pitches."""
from __future__ import annotations

from dataclasses import dataclass
import re

NOTE_TO_PC = {
    "C": 0, "C#": 1, "Db": 1, "D": 2, "D#": 3, "Eb": 3,
    "E": 4, "F": 5, "F#": 6, "Gb": 6, "G": 7, "G#": 8,
    "Ab": 8, "A": 9, "A#": 10, "Bb": 10, "B": 11,
}
CHORD_INTERVALS = {
    "maj": (0, 4, 7),
    "m": (0, 3, 7),
    "7": (0, 4, 7, 10),
    "maj7": (0, 4, 7, 11),
    "m7": (0, 3, 7, 10),
    "dim": (0, 3, 6),
    "aug": (0, 4, 8),
    "sus2": (0, 2, 7),
    "sus4": (0, 5, 7),
}
NOTE_RE = re.compile(r"^([A-Ga-g])([#b]?)(-?\d+)?$")
CHORD_RE = re.compile(
    r"^([A-Ga-g])([#b]?)(maj7|min7|m7|maj|min|m|7|dim|aug|sus2|sus4)?$",
    re.IGNORECASE,
)


@dataclass(frozen=True)
class ChordSpec:
    symbol: str
    root_pitch_class: int
    quality: str
    pitches: tuple[int, ...]


def _pitch_class(letter: str, accidental: str) -> int:
    key = letter.upper() + accidental
    if key not in NOTE_TO_PC:
        raise ValueError(f"Unsupported note name: {key}")
    return NOTE_TO_PC[key]


def parse_note(name: str, default_octave: int = 4) -> int:
    """Return MIDI pitch for C4, F#3, Bb2, or a pitch class."""
    if not isinstance(name, str):
        raise TypeError("Note name must be a string")
    match = NOTE_RE.fullmatch(name.strip())
    if not match:
        raise ValueError(f"Invalid note name: {name!r}")
    letter, accidental, octave_text = match.groups()
    octave = int(octave_text) if octave_text is not None else default_octave
    pitch = (octave + 1) * 12 + _pitch_class(letter, accidental)
    if not 0 <= pitch <= 127:
        raise ValueError(f"Note outside MIDI pitch range: {name!r}")
    return pitch


def parse_chord(symbol: str, octave: int = 3) -> ChordSpec:
    """Parse common triads/sevenths, e.g. Dm, Bb, F, C7, Gsus4."""
    if not isinstance(symbol, str):
        raise TypeError("Chord symbol must be a string")
    normalized = re.sub(r"\s+", "", symbol.strip())
    match = CHORD_RE.fullmatch(normalized)
    if not match:
        raise ValueError(f"Unsupported chord symbol: {symbol!r}")
    letter, accidental, quality_text = match.groups()
    quality = (quality_text or "maj").lower()
    if quality in {"min", "min7"}:
        quality = "m" if quality == "min" else "m7"
    intervals = CHORD_INTERVALS.get(quality)
    if intervals is None:
        raise ValueError(f"Unsupported chord quality: {quality!r}")
    root_pc = _pitch_class(letter, accidental)
    root_midi = (octave + 1) * 12 + root_pc
    pitches = tuple(root_midi + interval for interval in intervals)
    if any(pitch < 0 or pitch > 127 for pitch in pitches):
        raise ValueError(f"Chord outside MIDI pitch range: {symbol!r}")
    return ChordSpec(normalized, root_pc, quality, pitches)
