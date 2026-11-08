"""Generate an editable six-track MIDI scaffold; revise it in a DAW before submission."""
from __future__ import annotations

import argparse
from pathlib import Path

import pretty_midi

from music_utils import parse_chord, parse_note


def create_midi(
    bpm: float = 92.0,
    bars: int = 16,
    progression: tuple[str, ...] = ("Dm", "Bb", "F", "C"),
    key_root: str = "D",
    minor: bool = True,
    output_path: str | Path = "output/composicion_base.mid",
) -> Path:
    if not 40 <= bpm <= 220:
        raise ValueError("BPM must be between 40 and 220")
    if bars < 4 or bars > 256:
        raise ValueError("bars must be between 4 and 256")
    if not progression:
        raise ValueError("progression cannot be empty")

    chords = [parse_chord(symbol, octave=3) for symbol in progression]
    tonic = parse_note(key_root, default_octave=4)
    scale_intervals = (0, 2, 3, 5, 7, 8, 10) if minor else (0, 2, 4, 5, 7, 9, 11)
    scale = [tonic + interval for interval in scale_intervals]

    output = Path(output_path)
    output.parent.mkdir(parents=True, exist_ok=True)

    beat_seconds = 60.0 / bpm
    bar_seconds = beat_seconds * 4.0
    midi = pretty_midi.PrettyMIDI(initial_tempo=float(bpm))
    midi.time_signature_changes.append(pretty_midi.TimeSignature(4, 4, 0.0))

    piano = pretty_midi.Instrument(program=0, name="Piano - chords")
    bass = pretty_midi.Instrument(program=38, name="Synth bass - roots")
    pad = pretty_midi.Instrument(program=89, name="Warm pad - sustained harmony")
    arpeggio = pretty_midi.Instrument(program=4, name="Electric piano - arpeggio")
    lead = pretty_midi.Instrument(program=80, name="Lead - student-editable motif")
    drums = pretty_midi.Instrument(program=0, is_drum=True, name="Drums - GM")

    motif_degrees = (0, 2, 3, 5, 4, 2, 3, 0)
    melody = [scale[degree] + 12 for degree in motif_degrees]

    for bar in range(bars):
        start = bar * bar_seconds
        chord = chords[bar % len(chords)]
        tones = list(chord.pitches)

        # Pad: long notes provide a sustained harmonic bed.
        for pitch in tones:
            pad.notes.append(
                pretty_midi.Note(velocity=48, pitch=pitch, start=start, end=start + bar_seconds * 0.96)
            )

        # Piano: restrained chord hits on beats 1 and 3.
        for beat_index in (0, 2):
            note_start = start + beat_index * beat_seconds
            note_end = min(note_start + beat_seconds * 0.82, start + bar_seconds)
            velocity = 66 if beat_index == 0 else 58
            for pitch in tones:
                piano.notes.append(
                    pretty_midi.Note(velocity=velocity, pitch=pitch + 12, start=note_start, end=note_end)
                )

        # Arpeggio: eighth notes derived only from the current chord.
        for step in range(8):
            note_start = start + step * (beat_seconds / 2.0)
            pitch = tones[step % len(tones)] + 12
            arpeggio.notes.append(
                pretty_midi.Note(
                    velocity=42 + (step % 2) * 7,
                    pitch=pitch,
                    start=note_start,
                    end=note_start + beat_seconds * 0.30,
                )
            )

        # Bass: root on beat 1 and fifth on beat 3.
        root = tones[0] - 12
        fifth = tones[min(2, len(tones) - 1)] - 12
        for beat_index, pitch in ((0, root), (2, fifth)):
            note_start = start + beat_index * beat_seconds
            bass.notes.append(
                pretty_midi.Note(
                    velocity=78,
                    pitch=pitch,
                    start=note_start,
                    end=note_start + beat_seconds * 0.78,
                )
            )

        # A restrained motif enters after the first four bars.
        if bar >= 4:
            for beat_index in range(4):
                note_start = start + beat_index * beat_seconds
                pitch = melody[(bar * 4 + beat_index) % len(melody)]
                lead.notes.append(
                    pretty_midi.Note(
                        velocity=54 + (8 if beat_index == 0 else 0),
                        pitch=pitch,
                        start=note_start,
                        end=note_start + beat_seconds * 0.58,
                    )
                )

            # Drums are intentionally absent in the intro.
            for beat_index, pitch, velocity in (
                (0, 36, 92), (2, 36, 84), (1, 38, 76), (3, 38, 80)
            ):
                note_start = start + beat_index * beat_seconds
                drums.notes.append(
                    pretty_midi.Note(
                        velocity=velocity,
                        pitch=pitch,
                        start=note_start,
                        end=note_start + 0.10,
                    )
                )
            for step in range(8):
                note_start = start + step * (beat_seconds / 2.0)
                drums.notes.append(
                    pretty_midi.Note(
                        velocity=36,
                        pitch=42,
                        start=note_start,
                        end=note_start + 0.045,
                    )
                )

    midi.instruments.extend((piano, bass, pad, arpeggio, lead, drums))
    midi.write(str(output))
    return output


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--bpm", type=float, default=92.0)
    parser.add_argument("--bars", type=int, default=16)
    parser.add_argument("--progression", default="Dm,Bb,F,C")
    parser.add_argument("--key-root", default="D")
    parser.add_argument("--major", action="store_true", help="Use a major scale for the lead scaffold")
    parser.add_argument("--output", default="output/composicion_base.mid")
    args = parser.parse_args()

    result = create_midi(
        bpm=args.bpm,
        bars=args.bars,
        progression=tuple(item.strip() for item in args.progression.split(",") if item.strip()),
        key_root=args.key_root,
        minor=not args.major,
        output_path=args.output,
    )
    print(f"MIDI scaffold created: {result}")


if __name__ == "__main__":
    main()
