"""Orquestador mínimo de agentes con roles, dependencias y traza.

No llama a ningún modelo: valida el contrato de un pipeline y ejecuta
handlers locales. Sirve para demostrar dos propiedades antes de conectar
proveedores reales:

1. Un paso no corre si falta un artefacto que declara necesitar.
2. Un error detiene el pipeline y deja una traza con el paso fallido.

Los secretos nunca deben viajar en la traza; los handlers reciben artefactos,
no credenciales.
"""
from __future__ import annotations

import json
import time
from dataclasses import asdict, dataclass, field
from typing import Callable, Mapping

ROLES_PERMITIDOS = ('analisis', 'generacion', 'mezcla', 'masterizacion', 'gobernanza')

Handler = Callable[['AgentStep', Mapping[str, object]], Mapping[str, object]]


@dataclass(frozen=True)
class AgentStep:
    role: str
    action: str
    requires: tuple[str, ...] = field(default_factory=tuple)
    produces: tuple[str, ...] = field(default_factory=tuple)


def _validate_role(role: str) -> None:
    if role not in ROLES_PERMITIDOS:
        raise ValueError(f'rol no permitido: {role!r}; usa uno de {ROLES_PERMITIDOS}')


def planificar_pipeline(steps: list[AgentStep], initial_artifacts: Mapping[str, object] | None = None) -> list[dict[str, object]]:
    """Valida roles, salidas únicas y dependencias en orden.

    Lanza ``ValueError`` con un mensaje accionable si el plan no puede
    ejecutarse. Una salida declarada solo una vez evita que dos pasos
    sobrescriban el mismo artefacto sin saberlo.
    """
    if not steps:
        raise ValueError('el pipeline necesita al menos un paso')

    available = set((initial_artifacts or {}).keys())
    produced_so_far: set[str] = set()
    plan: list[dict[str, object]] = []

    for index, step in enumerate(steps):
        _validate_role(step.role)
        if not step.action.strip():
            raise ValueError(f'el paso {index} no declara acción')
        if not step.produces:
            raise ValueError(f'el paso {index} no declara ninguna salida')
        duplicated = produced_so_far.intersection(step.produces)
        if duplicated:
            raise ValueError(f'salida duplicada en el paso {index}: {sorted(duplicated)}')
        missing = [artifact for artifact in step.requires if artifact not in available]
        if missing:
            raise ValueError(f'el paso {index} ({step.role}) requiere artefactos no disponibles: {missing}')
        available.update(step.produces)
        produced_so_far.update(step.produces)
        plan.append({
            'index': index,
            'role': step.role,
            'action': step.action,
            'requires': list(step.requires),
            'produces': list(step.produces),
        })

    return plan


def ejecutar_pipeline(
    steps: list[AgentStep],
    handlers: Mapping[str, Handler],
    initial_artifacts: Mapping[str, object] | None = None,
) -> dict[str, object]:
    """Ejecuta el pipeline y devuelve ``ok``, ``artifacts`` y ``trace``.

    La parada es explícita: ante dependencia ausente, handler no registrado,
    excepción o salida incompleta, no se continúa con datos parciales.
    """
    artifacts: dict[str, object] = dict(initial_artifacts or {})
    trace: list[dict[str, object]] = []

    try:
        planificar_pipeline(steps, artifacts)
    except ValueError as error:
        return {'ok': False, 'error': str(error), 'failed_step': None, 'artifacts': artifacts, 'trace': trace}

    for index, step in enumerate(steps):
        started = time.perf_counter()
        missing = [artifact for artifact in step.requires if artifact not in artifacts]
        if missing:
            trace.append({'index': index, 'role': step.role, 'action': step.action, 'ok': False, 'error': f'faltan {missing}'})
            return {'ok': False, 'error': f'faltan artefactos: {missing}', 'failed_step': index, 'artifacts': artifacts, 'trace': trace}

        handler = handlers.get(step.role)
        if handler is None:
            trace.append({'index': index, 'role': step.role, 'action': step.action, 'ok': False, 'error': 'handler no registrado'})
            return {'ok': False, 'error': f'handler no registrado para {step.role}', 'failed_step': index, 'artifacts': artifacts, 'trace': trace}

        try:
            produced = handler(step, artifacts)
        except Exception as error:  # noqa: BLE001 - la traza debe capturar el fallo real
            trace.append({'index': index, 'role': step.role, 'action': step.action, 'ok': False, 'error': f'{type(error).__name__}: {error}'})
            return {'ok': False, 'error': f'el paso {index} falló', 'failed_step': index, 'artifacts': artifacts, 'trace': trace}

        if not isinstance(produced, Mapping):
            trace.append({'index': index, 'role': step.role, 'action': step.action, 'ok': False, 'error': 'la salida no es un mapping'})
            return {'ok': False, 'error': f'el paso {index} no devolvió un mapping', 'failed_step': index, 'artifacts': artifacts, 'trace': trace}

        missing_outputs = [artifact for artifact in step.produces if artifact not in produced]
        if missing_outputs:
            trace.append({'index': index, 'role': step.role, 'action': step.action, 'ok': False, 'error': f'faltan salidas {missing_outputs}'})
            return {'ok': False, 'error': f'el paso {index} no produjo {missing_outputs}', 'failed_step': index, 'artifacts': artifacts, 'trace': trace}

        artifacts.update(produced)
        trace.append({
            'index': index,
            'role': step.role,
            'action': step.action,
            'ok': True,
            'produced': sorted(produced.keys()),
            'duration_ms': round((time.perf_counter() - started) * 1000, 3),
        })

    return {'ok': True, 'error': None, 'failed_step': None, 'artifacts': artifacts, 'trace': trace}


def ejemplo_pipeline() -> list[AgentStep]:
    return [
        AgentStep('analisis', 'extraer características', (), ('features',)),
        AgentStep('generacion', 'generar variantes', ('features',), ('variants',)),
        AgentStep('mezcla', 'integrar y mezclar', ('variants',), ('mix',)),
        AgentStep('gobernanza', 'registrar procedencia', ('mix',), ('manifest',)),
    ]


if __name__ == '__main__':
    steps = ejemplo_pipeline()
    print(json.dumps(planificar_pipeline(steps), ensure_ascii=False, indent=2))
    print(json.dumps([asdict(step) for step in steps], ensure_ascii=False, indent=2))
