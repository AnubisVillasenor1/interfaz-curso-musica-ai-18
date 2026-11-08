"""Generate one Stable Audio Open clip with explicit controls and a saved record."""
from __future__ import annotations

import argparse
from pathlib import Path
from typing import Any


MODEL_ID = "stabilityai/stable-audio-open-1.0"
MAX_MODEL_SECONDS = 47.0


class StableAudioGenerator:
    """Load the pipeline once and reuse it for controlled A/B experiments."""

    def __init__(self, model_id: str = MODEL_ID, device: str | None = None) -> None:
        try:
            import torch
            from diffusers import StableAudioPipeline
        except ImportError as exc:
            raise RuntimeError(
                "Install torch, diffusers, transformers and accelerate from requirements-module3.txt"
            ) from exc

        self.torch = torch
        self.device = device or ("cuda" if torch.cuda.is_available() else "cpu")
        if self.device.startswith("cuda") and not torch.cuda.is_available():
            raise RuntimeError("CUDA was requested but is not available")
        if self.device not in {"cpu", "cuda"} and not self.device.startswith("cuda:"):
            raise ValueError("Supported devices are cpu and cuda[:index]")

        dtype = torch.float16 if self.device.startswith("cuda") else torch.float32
        self.model_id = model_id
        self.pipeline = StableAudioPipeline.from_pretrained(model_id, torch_dtype=dtype)
        self.pipeline = self.pipeline.to(self.device)

    def generate(
        self,
        prompt: str,
        negative_prompt: str,
        output_path: str | Path,
        duration_seconds: float = 10.0,
        steps: int = 50,
        guidance_scale: float = 7.0,
        seed: int = 42,
    ) -> dict[str, Any]:
        if not prompt.strip():
            raise ValueError("prompt cannot be empty")
        if not 0 < duration_seconds <= MAX_MODEL_SECONDS:
            raise ValueError(f"duration_seconds must be > 0 and <= {MAX_MODEL_SECONDS}")
        if not 1 <= steps <= 500:
            raise ValueError("steps must be between 1 and 500")
        if guidance_scale < 0:
            raise ValueError("guidance_scale cannot be negative")

        import soundfile as sf

        generator = self.torch.Generator(device=self.device).manual_seed(int(seed))
        with self.torch.inference_mode():
            result = self.pipeline(
                prompt=prompt,
                negative_prompt=negative_prompt or None,
                num_inference_steps=int(steps),
                guidance_scale=float(guidance_scale),
                audio_start_in_s=0.0,
                audio_end_in_s=float(duration_seconds),
                num_waveforms_per_prompt=1,
                generator=generator,
            )

        audio = result.audios[0].T.float().cpu().numpy()
        sample_rate = int(self.pipeline.vae.sampling_rate)
        output = Path(output_path)
        output.parent.mkdir(parents=True, exist_ok=True)
        sf.write(str(output), audio, sample_rate, subtype="PCM_24")

        return {
            "output": str(output),
            "model_id": self.model_id,
            "seed": int(seed),
            "num_inference_steps": int(steps),
            "guidance_scale": float(guidance_scale),
            "audio_start_in_s": 0.0,
            "audio_end_in_s": float(duration_seconds),
            "duration_seconds": round(len(audio) / sample_rate, 4),
            "sample_rate_hz": sample_rate,
            "channels": int(audio.shape[1]) if audio.ndim == 2 else 1,
            "device": self.device,
        }

    def release(self) -> None:
        del self.pipeline
        if self.device.startswith("cuda"):
            self.torch.cuda.empty_cache()


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--prompt", required=True)
    parser.add_argument("--negative-prompt", default="")
    parser.add_argument("--output", default="generation/version_A.wav")
    parser.add_argument("--duration", type=float, default=10.0)
    parser.add_argument("--steps", type=int, default=50)
    parser.add_argument("--guidance-scale", type=float, default=7.0)
    parser.add_argument("--seed", type=int, default=42)
    parser.add_argument("--model", default=MODEL_ID)
    parser.add_argument("--device", default=None)
    args = parser.parse_args()

    generator = StableAudioGenerator(model_id=args.model, device=args.device)
    try:
        report = generator.generate(
            prompt=args.prompt,
            negative_prompt=args.negative_prompt,
            output_path=args.output,
            duration_seconds=args.duration,
            steps=args.steps,
            guidance_scale=args.guidance_scale,
            seed=args.seed,
        )
        print(report)
    finally:
        generator.release()


if __name__ == "__main__":
    main()
