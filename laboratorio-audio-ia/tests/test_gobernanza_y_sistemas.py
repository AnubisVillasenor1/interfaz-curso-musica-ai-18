"""Pruebas de los módulos 4–6: latencia, agentes, procedencia y checklist."""
from __future__ import annotations

import json
import tempfile
import unittest
from pathlib import Path

from src.checklist_entrega import REQUIRED_ARTIFACTS, evaluar_entrega
from src.manifiesto_procedencia import construir_manifiesto, sha256_file, validar_manifiesto
from src.orquestador_agentes import AgentStep, ejecutar_pipeline, planificar_pipeline
from src.presupuesto_latencia import calcular_presupuesto


class LatencyBudgetTests(unittest.TestCase):
    def test_block_and_latency_are_reported_with_units(self) -> None:
        result = calcular_presupuesto(48000, 128, 2, 1.5)
        self.assertAlmostEqual(result['block_ms'], 2.667, places=3)
        self.assertAlmostEqual(result['latency_ms'], 5.333, places=3)
        self.assertTrue(result['realtime'])
        self.assertTrue(result['realtime_with_headroom'])
        self.assertGreater(result['margin_ms'], 0)

    def test_processing_beyond_block_is_not_realtime(self) -> None:
        result = calcular_presupuesto(44100, 64, 2, 3.0)
        self.assertFalse(result['realtime'])
        self.assertLess(result['margin_ms'], 0)

    def test_invalid_inputs_fail_closed(self) -> None:
        with self.assertRaises(ValueError):
            calcular_presupuesto(0, 128, 2, 1.0)
        with self.assertRaises(ValueError):
            calcular_presupuesto(48000, 128, 2, -1.0)
        with self.assertRaises(ValueError):
            calcular_presupuesto(48000, 128, 2, float('nan'))


class AgentPipelineTests(unittest.TestCase):
    def _steps(self) -> list[AgentStep]:
        return [
            AgentStep('analisis', 'analizar', (), ('features',)),
            AgentStep('generacion', 'generar', ('features',), ('variants',)),
            AgentStep('gobernanza', 'documentar', ('variants',), ('manifest',)),
        ]

    def test_plan_rejects_missing_dependency(self) -> None:
        with self.assertRaises(ValueError):
            planificar_pipeline([AgentStep('mezcla', 'mezclar', ('mix',), ('master',))])

    def test_pipeline_success_records_trace(self) -> None:
        steps = self._steps()
        handlers = {
            'analisis': lambda step, artifacts: {'features': ['rms']},
            'generacion': lambda step, artifacts: {'variants': ['A', 'B']},
            'gobernanza': lambda step, artifacts: {'manifest': 'sha256:demo'},
        }
        result = ejecutar_pipeline(steps, handlers)
        self.assertTrue(result['ok'])
        self.assertEqual(len(result['trace']), 3)
        self.assertEqual(result['artifacts']['manifest'], 'sha256:demo')

    def test_missing_handler_stops_pipeline(self) -> None:
        result = ejecutar_pipeline(self._steps(), {'analisis': lambda step, artifacts: {'features': []}})
        self.assertFalse(result['ok'])
        self.assertEqual(result['failed_step'], 1)
        self.assertIn('handler no registrado', result['error'])

    def test_handler_error_stops_pipeline_with_trace(self) -> None:
        def boom(step, artifacts):
            raise RuntimeError('modelo no disponible')

        handlers = {
            'analisis': lambda step, artifacts: {'features': []},
            'generacion': boom,
        }
        result = ejecutar_pipeline(self._steps(), handlers)
        self.assertFalse(result['ok'])
        self.assertEqual(result['failed_step'], 1)
        self.assertIn('RuntimeError', result['trace'][-1]['error'])


class ProvenanceTests(unittest.TestCase):
    def test_hash_and_manifest_are_consistent(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            audio = Path(directory) / 'demo.wav'
            audio.write_bytes(b'RIFF-demo-audio')
            manifest = construir_manifiesto(
                audio,
                title='Obra de prueba',
                author='Estudiante',
                source='Producción propia',
                license='CC BY 4.0',
                model='Stable Audio Open',
                model_version='1.0',
                prompt='pad cinematico',
            )
            self.assertEqual(manifest['sha256'], sha256_file(audio))
            self.assertEqual(validar_manifiesto(manifest), [])
            self.assertEqual(manifest['sha256'], __import__('hashlib').sha256(b'RIFF-demo-audio').hexdigest())

    def test_manifest_rejects_pending_license_and_bad_hash(self) -> None:
        base = {
            'title': 'Obra',
            'author': 'Estudiante',
            'source': 'Propia',
            'license': 'pendiente',
            'model': 'Modelo',
            'model_version': '1.0',
            'prompt': 'texto',
            'created_at': '2026-11-07T12:00:00+00:00',
            'sha256': '0' * 64,
        }
        errors = validar_manifiesto(base)
        self.assertTrue(any('license' in error for error in errors))
        base['license'] = 'CC BY 4.0'
        base['sha256'] = 'xyz'
        self.assertTrue(any('sha256' in error for error in validar_manifiesto(base)))

    def test_missing_file_cannot_be_manifested(self) -> None:
        with self.assertRaises(FileNotFoundError):
            construir_manifiesto('no-existe.wav')


class DeliveryChecklistTests(unittest.TestCase):
    def test_empty_root_reports_every_artifact(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            result = evaluar_entrega(directory)
            self.assertFalse(result['ok'])
            self.assertEqual(len(result['missing']), len(REQUIRED_ARTIFACTS))

    def test_complete_package_passes_and_empty_file_fails(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            for relative in REQUIRED_ARTIFACTS:
                path = root / relative
                path.parent.mkdir(parents=True, exist_ok=True)
                path.write_text('contenido', encoding='utf-8')
            self.assertTrue(evaluar_entrega(root)['ok'])
            (root / 'informe_final.md').write_text('', encoding='utf-8')
            result = evaluar_entrega(root)
            self.assertFalse(result['ok'])
            self.assertEqual(result['empty'], ['informe_final.md'])
            json.dumps(result)


if __name__ == '__main__':
    unittest.main()
