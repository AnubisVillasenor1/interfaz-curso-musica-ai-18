# Módulo técnico 5 — Trazabilidad, derechos y gobernanza de IA

**Trayecto:** Laboratorio técnico de audio e IA musical · TAMV Online Network
**Autor del curso:** Edwin Oswaldo Castillo Trejo · **Apoyo declarado:** IA para estructuración y revisión.
**Nivel:** intermedio–avanzado · **Tiempo orientativo:** 4–6 horas.
**Resultado:** un expediente de procedencia que un tercero puede auditar sin acceso a la sesión original.

## Competencia de salida

La persona estudiante separa las licencias del audio de entrada, del modelo/pesos y del servicio; construye un manifiesto con SHA-256 y campos obligatorios; distingue lo que demuestra una marca de agua o un fingerprint; y documenta riesgos con mitigación y evidencia.

## Lecciones

1. **Licencias de datos, modelos y pesos.** Código abierto no equivale a uso comercial libre. Guarda la versión y la fecha de la licencia consultada.
2. **Hashes, metadatos y manifiestos.** El hash demuestra integridad, no titularidad. Registra modelo, versión, prompt, parámetros, autor humano, fuentes y transformaciones.
3. **Watermarking y fingerprinting.** La marca puede degradarse con compresión o remezcla; la huella identifica una grabación, no al titular.
4. **Riesgos, auditoría y transparencia.** Matriz con impacto, mitigación, evidencia y responsable. NIST AI RMF es una guía de proceso, no una certificación legal automática.

## Laboratorio: expediente de procedencia

1. Completa la matriz de licencias con fuente y fecha.
2. Ejecuta `manifiesto_procedencia.py` sobre la demo final.
3. Recalcula el hash de una versión anterior y explica qué cambió.
4. Añade la ficha de transparencia de contenido sintético.
5. Documenta una prueba de robustez de marca de agua, si aplica.
6. Revisa el expediente como auditor externo y declara riesgos abiertos.

## Comandos

```bash
python -m src.manifiesto_procedencia --file proyecto_modulo_3/produccion/demo_final.wav \
  --title "Memoria de agua" --author "Nombre del estudiante" \
  --license "CC BY-NC 4.0" --model "Stable Audio Open" --model-version "1.0" \
  --prompt "Cinematic ambient pad" --output proyecto_modulo_3/etica/metadatos.json
python -m unittest tests.test_gobernanza_y_sistemas -v
```

## Rúbrica (100 puntos)

| Criterio | Peso |
|---|---|
| Licencias | 20 |
| Manifiesto y metadatos | 20 |
| Marca y fingerprint | 15 |
| Riesgos y mitigación | 15 |
| Auditoría | 15 |
| Transparencia | 10 |
| Honestidad técnica | 5 |

## Límites

El expediente aporta evidencia de procedencia e integridad. No sustituye una revisión jurídica, no concede derechos y no certifica que un modelo haya sido entrenado legalmente. Las obligaciones de transparencia dependen de jurisdicción, contexto y tipo de contenido.
