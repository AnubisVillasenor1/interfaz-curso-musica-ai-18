"""Separación opcional de voces con Demucs; no instala pesos ni autoriza el uso comercial."""
from __future__ import annotations

import argparse
import shutil
import subprocess
import sys
from pathlib import Path


def separar_cancion(
    ruta_audio: str | Path,
    output_dir: str | Path = "output/stems",
    model: str = "htdemucs",
    device: str | None = None,
) -> Path:
    source = Path(ruta_audio)
    if not source.is_file():
        raise FileNotFoundError(f"No existe el audio: {source}")
    if not model or any(char in model for char in "\r\n"):
        raise ValueError("Nombre de modelo no válido.")
    if shutil.which(sys.executable) is None:
        raise RuntimeError("No se encontró el intérprete Python activo.")
    output = Path(output_dir)
    output.mkdir(parents=True, exist_ok=True)
    command = [
        sys.executable, "-m", "demucs",
        "--two-stems", "vocals",
        "-n", model,
        "-o", str(output),
    ]
    if device:
        if device not in {"cpu", "cuda", "mps"}:
            raise ValueError("device debe ser cpu, cuda o mps.")
        command.extend(["-d", device])
    command.append(str(source))
    print("Ejecutando Demucs; los pesos pueden descargarse si todavía no están en caché.")
    subprocess.run(command, check=True)
    return output


def main() -> None:
    parser = argparse.ArgumentParser(description="Separa voz y acompañamiento con Demucs.")
    parser.add_argument("audio", type=Path)
    parser.add_argument("--output", type=Path, default=Path("output/stems"))
    parser.add_argument("--model", default="htdemucs")
    parser.add_argument("--device", choices=("cpu", "cuda", "mps"), default=None)
    args = parser.parse_args()
    print(f"Resultados guardados bajo: {separar_cancion(args.audio, args.output, args.model, args.device)}")


if __name__ == "__main__":
    main()
