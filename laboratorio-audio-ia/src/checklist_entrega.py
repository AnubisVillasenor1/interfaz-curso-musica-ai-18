"""Checklist del paquete final del proyecto integrador.

Verifica presencia y tamaño de los artefactos mínimos. No evalúa calidad
musical ni sustituye la defensa: solo evita entregar una carpeta incompleta.
"""
from __future__ import annotations

import argparse
import json
from pathlib import Path

REQUIRED_ARTIFACTS = (
    'README.md',
    'ficha_creativa.md',
    'midi/composicion_base.mid',
    'generacion/prompts.csv',
    'produccion/demo_final.wav',
    'etica/licencias.md',
    'etica/metadatos.json',
    'informe_final.md',
)


def evaluar_entrega(root: str | Path) -> dict[str, object]:
    base = Path(root)
    present: list[str] = []
    missing: list[str] = []
    empty: list[str] = []

    for relative in REQUIRED_ARTIFACTS:
        path = base / relative
        if not path.is_file():
            missing.append(relative)
            continue
        present.append(relative)
        if path.stat().st_size == 0:
            empty.append(relative)

    return {
        'root': str(base),
        'ok': not missing and not empty,
        'checked': len(REQUIRED_ARTIFACTS),
        'present': present,
        'missing': missing,
        'empty': empty,
    }


def main() -> None:
    parser = argparse.ArgumentParser(description='Verifica el paquete final del proyecto integrador.')
    parser.add_argument('--root', required=True)
    args = parser.parse_args()
    result = evaluar_entrega(args.root)
    print(json.dumps(result, ensure_ascii=False, indent=2))
    raise SystemExit(0 if result['ok'] else 1)


if __name__ == '__main__':
    main()
