"""Run the five controlled rows in prompts.csv and record every outcome."""
from __future__ import annotations

import argparse
import csv
import json
from datetime import datetime, timezone
from pathlib import Path

from generate_stable_audio import StableAudioGenerator, MODEL_ID


REQUIRED_COLUMNS = {
    "version", "prompt", "negative_prompt", "seed", "num_inference_steps",
    "guidance_scale", "duration_s", "controlled_variable", "decision", "rationale",
}


def run_experiments(csv_path: str | Path, output_dir: str | Path, model_id: str = MODEL_ID, device: str | None = None) -> dict:
    source = Path(csv_path)
    if not source.is_file():
        raise FileNotFoundError(source)
    out_dir = Path(output_dir)
    out_dir.mkdir(parents=True, exist_ok=True)

    with source.open("r", encoding="utf-8-sig", newline="") as handle:
        reader = csv.DictReader(handle)
        missing = REQUIRED_COLUMNS - set(reader.fieldnames or [])
        if missing:
            raise ValueError(f"Missing CSV columns: {sorted(missing)}")
        rows = list(reader)

    if len(rows) != 5:
        raise ValueError(f"Expected exactly five experiment rows A–E; received {len(rows)}")
    versions = [row["version"].strip().upper() for row in rows]
    if versions != ["A", "B", "C", "D", "E"]:
        raise ValueError("CSV versions must be ordered A, B, C, D, E")

    generator = StableAudioGenerator(model_id=model_id, device=device)
    reports: list[dict] = []
    try:
        for row in rows:
            version = row["version"].strip().upper()
            output_path = out_dir / f"version_{version}.wav"
            report = {
                "version": version,
                "controlled_variable": row["controlled_variable"],
                "decision_before_listening": row["decision"],
                "rationale_template": row["rationale"],
                "prompt": row["prompt"],
                "negative_prompt": row["negative_prompt"],
                "model_id": model_id,
                "started_at_utc": datetime.now(timezone.utc).isoformat(),
            }
            try:
                generated = generator.generate(
                    prompt=row["prompt"],
                    negative_prompt=row["negative_prompt"],
                    output_path=output_path,
                    duration_seconds=float(row["duration_s"]),
                    steps=int(row["num_inference_steps"]),
                    guidance_scale=float(row["guidance_scale"]),
                    seed=int(row["seed"]),
                )
                report.update({"status": "generated", **generated})
            except Exception as exc:
                report.update({"status": "error", "error_type": type(exc).__name__, "error": str(exc)})
            reports.append(report)
    finally:
        generator.release()

    result = {
        "model_id": model_id,
        "source_csv": str(source),
        "created_at_utc": datetime.now(timezone.utc).isoformat(),
        "versions": reports,
        "note": "No qualitative decision is inferred. Complete selection, discard reason and listening evidence after listening to each generated WAV.",
    }
    report_path = out_dir / "reportes_generacion.json"
    report_path.write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding="utf-8")
    return result


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--csv", default="data/prompts.example.csv")
    parser.add_argument("--output", default="generation")
    parser.add_argument("--model", default=MODEL_ID)
    parser.add_argument("--device", default=None)
    args = parser.parse_args()
    result = run_experiments(args.csv, args.output, args.model, args.device)
    for row in result["versions"]:
        print(f"{row['version']}: {row['status']}")


if __name__ == "__main__":
    main()
