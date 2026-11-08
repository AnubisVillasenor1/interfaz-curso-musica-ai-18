"""Manifiesto de procedencia para un activo musical.

El hash identifica el archivo y permite comprobar integridad. No prueba
autoría, titularidad ni permiso comercial: esas capas se documentan con
licencias y fuentes verificables.

Uso:
    python -m src.manifiesto_procedencia --file demo.wav --title "Mi obra" \
        --author "Nombre" --license "CC BY-NC 4.0" --model "Stable Audio Open 1.0" \
        --output manifiesto.json
"""
from __future__ import annotations

import argparse
import hashlib
import json
import re
from datetime import datetime
from pathlib import Path

REQUIRED_FIELDS = (
    'title',
    'author',
    'source',
    'license',
    'model',
    'model_version',
    'prompt',
    'created_at',
    'sha256',
)

LICENCIAS_INVALIDAS = {'', 'desconocida', 'unknown', 'pendiente', 'por definir', 'n/a'}
SHA256_RE = re.compile(r'^[a-f0-9]{64}$')


def sha256_file(path: str | Path, chunk_size: int = 1024 * 1024) -> str:
    digest = hashlib.sha256()
    with open(path, 'rb') as handle:
        for chunk in iter(lambda: handle.read(chunk_size), b''):
            digest.update(chunk)
    return digest.hexdigest()


def _iso_utc(value: str) -> bool:
    try:
        parsed = datetime.fromisoformat(value.replace('Z', '+00:00'))
    except ValueError:
        return False
    return parsed.tzinfo is not None


def validar_manifiesto(data: dict[str, object]) -> list[str]:
    """Devuelve una lista de errores; vacía significa manifiesto válido."""
    errors: list[str] = []
    for field in REQUIRED_FIELDS:
        value = data.get(field)
        if not isinstance(value, str) or not value.strip():
            errors.append(f'falta o está vacío: {field}')
    if errors:
        return errors

    if not SHA256_RE.match(str(data['sha256'])):
        errors.append('sha256 debe ser un hexadecimal de 64 caracteres')
    if not _iso_utc(str(data['created_at'])):
        errors.append('created_at debe ser una fecha ISO 8601 con zona horaria')
    if str(data['license']).strip().lower() in LICENCIAS_INVALIDAS:
        errors.append('license debe declarar una licencia verificable, no “pendiente”')
    if str(data['author']).strip().lower() == str(data['model']).strip().lower():
        errors.append('author debe identificar a la persona, no al modelo')
    return errors


def construir_manifiesto(file_path: str | Path, **metadata: object) -> dict[str, object]:
    path = Path(file_path)
    if not path.is_file():
        raise FileNotFoundError(f'no existe el archivo: {path}')
    manifest: dict[str, object] = dict(metadata)
    manifest['sha256'] = sha256_file(path)
    manifest.setdefault('created_at', datetime.now().astimezone().isoformat(timespec='seconds'))
    errors = validar_manifiesto(manifest)
    if errors:
        raise ValueError('manifiesto inválido: ' + '; '.join(errors))
    return manifest


def main() -> None:
    parser = argparse.ArgumentParser(description='Construye un manifiesto de procedencia con SHA-256.')
    parser.add_argument('--file', required=True)
    parser.add_argument('--title', required=True)
    parser.add_argument('--author', required=True)
    parser.add_argument('--source', default='Producción propia')
    parser.add_argument('--license', required=True)
    parser.add_argument('--model', required=True)
    parser.add_argument('--model-version', required=True)
    parser.add_argument('--prompt', required=True)
    parser.add_argument('--output', required=True)
    args = parser.parse_args()

    manifest = construir_manifiesto(
        args.file,
        title=args.title,
        author=args.author,
        source=args.source,
        license=args.license,
        model=args.model,
        model_version=args.model_version,
        prompt=args.prompt,
    )
    output = Path(args.output)
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print(json.dumps(manifest, ensure_ascii=False, indent=2))


if __name__ == '__main__':
    main()
