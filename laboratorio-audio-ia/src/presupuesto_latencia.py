"""Presupuesto de latencia para un plugin de audio.

El cálculo es deliberadamente conservador: mide el plazo de un bloque y deja
explícito que la latencia total incluye búferes del host y del dispositivo.
No es una medición certificada del sistema real; es una herramienta de diseño
para decidir qué procesamiento cabe en el callback y qué debe externalizarse.

Uso:
    python -m src.presupuesto_latencia --sample-rate 48000 --block-size 128 \
        --buffers 2 --processing-ms 1.5
"""
from __future__ import annotations

import argparse
import json
import math


def calcular_presupuesto(
    sample_rate: int,
    block_size: int,
    buffer_count: int,
    processing_ms: float,
) -> dict[str, float | int | bool]:
    """Devuelve duración de bloque, latencia, utilización y margen.

    ``processing_ms`` es el peor caso declarado por quien mide. El resultado
    ``realtime`` solo afirma que ese peor caso cabe dentro de un bloque; no
    afirma que el sistema operativo no vaya a introducir picos.
    """
    for name, value in (
        ('sample_rate', sample_rate),
        ('block_size', block_size),
        ('buffer_count', buffer_count),
    ):
        if not isinstance(value, int) or isinstance(value, bool) or value <= 0:
            raise ValueError(f'{name} debe ser un entero positivo')
    if not isinstance(processing_ms, (int, float)) or isinstance(processing_ms, bool):
        raise ValueError('processing_ms debe ser numérico')
    if not math.isfinite(processing_ms) or processing_ms < 0:
        raise ValueError('processing_ms debe ser finito y no negativo')

    block_ms = 1000.0 * block_size / sample_rate
    latency_ms = block_ms * buffer_count
    utilization_percent = 100.0 * processing_ms / block_ms
    margin_ms = block_ms - processing_ms
    return {
        'sample_rate': sample_rate,
        'block_size': block_size,
        'buffer_count': buffer_count,
        'block_ms': round(block_ms, 3),
        'latency_ms': round(latency_ms, 3),
        'processing_ms': round(float(processing_ms), 3),
        'utilization_percent': round(utilization_percent, 2),
        'margin_ms': round(margin_ms, 3),
        'realtime': processing_ms < block_ms,
        'realtime_with_headroom': processing_ms <= block_ms * 0.7,
    }


def main() -> None:
    parser = argparse.ArgumentParser(description='Calcula un presupuesto de latencia de audio.')
    parser.add_argument('--sample-rate', type=int, required=True)
    parser.add_argument('--block-size', type=int, required=True)
    parser.add_argument('--buffers', type=int, default=2)
    parser.add_argument('--processing-ms', type=float, required=True)
    args = parser.parse_args()
    print(json.dumps(
        calcular_presupuesto(args.sample_rate, args.block_size, args.buffers, args.processing_ms),
        ensure_ascii=False,
        indent=2,
    ))


if __name__ == '__main__':
    main()
