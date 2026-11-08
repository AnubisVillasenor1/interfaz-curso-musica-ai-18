from __future__ import annotations

import hashlib
from pathlib import Path
import sys
import tempfile
import unittest

import numpy as np
import pretty_midi
import soundfile as sf

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "src"))

from music_utils import parse_chord, parse_note
from generate_midi import create_midi
from evaluate_audio import evaluate_audio
from metadata import create_metadata


class MusicUtilityTests(unittest.TestCase):
    def test_note_parser_handles_accidentals_and_octaves(self):
        self.assertEqual(parse_note("C4"), 60)
        self.assertEqual(parse_note("F#3"), 54)
        self.assertEqual(parse_note("Bb3"), 58)
        self.assertEqual(parse_note("C", default_octave=3), 48)

    def test_chord_parser_handles_minor_and_flat_roots(self):
        self.assertEqual(parse_chord("Dmin", octave=3).pitches, (50, 53, 57))
        self.assertEqual(parse_chord("Bb", octave=3).pitches, (58, 62, 65))
        self.assertEqual(parse_chord("F", octave=3).pitches, (53, 57, 60))
        self.assertEqual(parse_chord("C7", octave=3).pitches, (48, 52, 55, 58))

    def test_invalid_symbols_fail_loudly(self):
        with self.assertRaises(ValueError):
            parse_note("H4")
        with self.assertRaises(ValueError):
            parse_chord("Dxyz")

    def test_midi_scaffold_has_six_tracks_and_no_drums_in_intro(self):
        with tempfile.TemporaryDirectory() as directory:
            target = Path(directory) / "composition.mid"
            create_midi(bpm=92, bars=8, output_path=target)
            midi = pretty_midi.PrettyMIDI(str(target))
            self.assertEqual(len(midi.instruments), 6)
            drums = [instrument for instrument in midi.instruments if instrument.is_drum]
            self.assertEqual(len(drums), 1)
            self.assertTrue(drums[0].notes)
            intro_end = 4 * (60 / 92) * 4
            self.assertTrue(all(note.start >= intro_end - 0.002 for note in drums[0].notes))
            self.assertTrue(any(track.notes for track in midi.instruments if not track.is_drum))

    def test_audio_qc_reports_measurements_without_claiming_artifact_detection(self):
        with tempfile.TemporaryDirectory() as directory:
            audio_path = Path(directory) / "synthetic.wav"
            sample_rate = 44_100
            time = np.arange(sample_rate, dtype=np.float32) / sample_rate
            tone = 0.2 * np.sin(2 * np.pi * 440 * time)
            stereo = np.column_stack((tone, tone))
            sf.write(audio_path, stereo, sample_rate)

            report = evaluate_audio(audio_path)
            self.assertEqual(report["channels"], 2)
            self.assertEqual(report["sample_rate_hz"], sample_rate)
            self.assertFalse(report["clipping_detected"])
            self.assertAlmostEqual(report["stereo_correlation"], 1.0, places=3)
            self.assertEqual(
                report["audible_artifacts"],
                "not assessed automatically; requires critical listening",
            )

    def test_metadata_hash_matches_audio_bytes(self):
        with tempfile.TemporaryDirectory() as directory:
            audio = Path(directory) / "demo.wav"
            sf.write(audio, np.zeros((4410, 2), dtype=np.float32), 44_100)
            output = Path(directory) / "metadata.json"

            record = create_metadata(
                audio_path=audio,
                title="Test piece",
                human_author="Student",
                model_id="test-model",
                model_revision="test-revision",
                prompt="test prompt",
                negative_prompt="",
                seed=42,
                parameters={"steps": 10},
                license_reference="educational test reference",
                output_path=output,
            )
            expected_hash = hashlib.sha256(audio.read_bytes()).hexdigest()
            self.assertEqual(record["audio"]["sha256"], expected_hash)
            self.assertTrue(output.is_file())


if __name__ == "__main__":
    unittest.main()
