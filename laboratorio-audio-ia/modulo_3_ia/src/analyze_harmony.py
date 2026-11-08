"""Create a machine-readable harmonic estimate from a MIDI file using music21."""
from __future__ import annotations

import argparse
import json
from pathlib import Path


def analyze_midi(midi_path: str | Path) -> dict:
    try:
        from music21 import chord, converter, roman
    except ImportError as exc:
        raise RuntimeError("Install music21 from requirements-module3.txt") from exc

    path = Path(midi_path)
    if not path.is_file():
        raise FileNotFoundError(path)

    score = converter.parse(str(path))
    estimated_key = score.analyze("key")
    chordified = score.chordify()

    chord_rows: list[dict] = []
    seen: set[tuple[int, tuple[int, ...]]] = set()

    for item in chordified.recurse().getElementsByClass(chord.Chord):
        if not item.pitches:
            continue
        offset = float(item.offset)
        bar_number = int(offset // 4.0) + 1
        pitch_classes = tuple(sorted({int(pitch.midi) % 12 for pitch in item.pitches}))
        signature = (bar_number, pitch_classes)
        if signature in seen:
            continue
        seen.add(signature)

        try:
            figure = roman.romanNumeralFromChord(item, estimated_key).figure
        except Exception:
            figure = None

        chord_rows.append(
            {
                "bar": bar_number,
                "offset_quarter_length": round(offset, 4),
                "chord_label": item.pitchedCommonName,
                "pitch_classes": list(pitch_classes),
                "roman_numeral_estimate": figure,
            }
        )

    return {
        "source_file": path.name,
        "estimated_key": str(estimated_key),
        "estimated_mode": estimated_key.mode,
        "estimated_tonic": str(estimated_key.tonic),
        "duration_quarter_length": float(score.duration.quarterLength),
        "estimated_bars": max((row["bar"] for row in chord_rows), default=0),
        "chords": chord_rows,
        "interpretation_limit": (
            "Computational estimate only. Verify inversions, passing notes, voice leading, "
            "cadences and harmonic function through score inspection and listening."
        ),
    }


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("midi", help="MIDI file to analyze")
    parser.add_argument("--output", default="analysis/analisis_armonia.json")
    args = parser.parse_args()

    report = analyze_midi(args.midi)
    output = Path(args.output)
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps(report, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
