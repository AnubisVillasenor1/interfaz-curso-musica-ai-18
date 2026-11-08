"""Create provenance metadata and SHA-256 for a final audio file."""
from __future__ import annotations

import argparse
from datetime import datetime, timezone
import hashlib
import importlib.metadata
import json
from pathlib import Path
import platform
import sys

import soundfile as sf


def sha256_file(path: str | Path) -> str:
    digest = hashlib.sha256()
    with Path(path).open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def package_version(name: str) -> str | None:
    try:
        return importlib.metadata.version(name)
    except importlib.metadata.PackageNotFoundError:
        return None


def create_metadata(
    audio_path: str | Path,
    title: str,
    human_author: str,
    model_id: str,
    model_revision: str,
    prompt: str,
    negative_prompt: str,
    seed: int,
    parameters: dict,
    license_reference: str,
    output_path: str | Path,
) -> dict:
    audio = Path(audio_path)
    if not audio.is_file():
        raise FileNotFoundError(audio)
    if not title.strip() or not human_author.strip():
        raise ValueError("title and human_author are required")

    info = sf.info(str(audio))
    record = {
        "title": title,
        "human_author": human_author,
        "ai_assistance": True,
        "human_contributions": [
            "creative intent and project brief",
            "MIDI composition and harmonic decisions",
            "selection and editing of generated material",
            "arrangement, production and final approval",
        ],
        "model_id": model_id,
        "model_revision": model_revision or "not-recorded",
        "prompt": prompt,
        "negative_prompt": negative_prompt,
        "seed": int(seed),
        "parameters": parameters,
        "audio": {
            "file": audio.name,
            "duration_seconds": round(info.duration, 4),
            "sample_rate_hz": int(info.samplerate),
            "channels": int(info.channels),
            "subtype": info.subtype,
            "sha256": sha256_file(audio),
        },
        "license_reference": license_reference or "UNVERIFIED — review model, service and material licenses",
        "license_status": "not-automatically-assessed",
        "created_at_utc": datetime.now(timezone.utc).isoformat(),
        "runtime": {
            "python": sys.version.split()[0],
            "platform": platform.platform(),
            "pretty_midi": package_version("pretty-midi"),
            "music21": package_version("music21"),
            "diffusers": package_version("diffusers"),
            "torch": package_version("torch"),
        },
        "limitations": [
            "A hash proves file identity, not authorship, copyright or permission.",
            "Model and inference-service terms may differ; verify the actual mode of use.",
            "Third-party samples, recordings, voices, lyrics and references require independent rights review.",
        ],
    }

    output = Path(output_path)
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(record, ensure_ascii=False, indent=2), encoding="utf-8")
    return record


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("audio")
    parser.add_argument("--title", required=True)
    parser.add_argument("--author", required=True)
    parser.add_argument("--model", default="stabilityai/stable-audio-open-1.0")
    parser.add_argument("--revision", default="not-recorded")
    parser.add_argument("--prompt", required=True)
    parser.add_argument("--negative-prompt", default="")
    parser.add_argument("--seed", type=int, required=True)
    parser.add_argument("--license-reference", default="")
    parser.add_argument("--output", default="ethics/metadatos.json")
    args = parser.parse_args()
    record = create_metadata(
        audio_path=args.audio,
        title=args.title,
        human_author=args.author,
        model_id=args.model,
        model_revision=args.revision,
        prompt=args.prompt,
        negative_prompt=args.negative_prompt,
        seed=args.seed,
        parameters={},
        license_reference=args.license_reference,
        output_path=args.output,
    )
    print(json.dumps(record, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
