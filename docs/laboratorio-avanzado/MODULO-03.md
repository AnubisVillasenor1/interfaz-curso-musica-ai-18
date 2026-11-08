# Módulo técnico 3 — IA generativa musical y control de modelos

**Trayecto:** Laboratorio técnico de audio e IA musical · TAMV Online Network
**Autor del curso:** Edwin Oswaldo Castillo Trejo · **Apoyo declarado:** IA para estructuración y revisión.
**Nivel:** intermedio · **Tiempo orientativo:** 6–8 horas.
**Resultado:** una base MIDI editable, cinco variantes generadas comparables y una selección defendida con evidencia.

## Competencia de salida

La persona estudiante distingue el pipeline de difusión latente de una transcripción automática, controla prompt, negative prompt, semilla, pasos, guidance y duración, y evalúa artefactos con marcas de tiempo. Sabe que la semilla no garantiza igualdad bit a bit y que la tasa de muestreo debe salir del pipeline, no de una constante copiada.

## Lecciones

1. **Difusión latente, VAE y espacio latente.** El VAE codifica y reconstruye; la difusión invierte ruido sobre la representación comprimida. Exporta con `pipeline.vae.sampling_rate`.
2. **Prompt, negative prompt, semilla, pasos y guidance.** Una variable por versión. Registra modelo, revisión, entorno, hardware y duración.
3. **MIDI, armonía y edición con music21.** El MIDI es una representación editable, no audio. La tonalidad estimada es una hipótesis que se contrasta con partitura, DAW y escucha.
4. **Evaluación crítica y descarte.** Normaliza el volumen de escucha, documenta el defecto con marca de tiempo y elige una corrección principal por iteración.

## Laboratorio: cinco variantes, una variable por versión

1. Define intención, emoción, tonalidad, tempo, instrumentación y estructura antes de generar.
2. Construye `composicion_base.mid` y una revisión separada.
3. Completa el CSV A–E: A es la línea base; B cambia guidance; C cambia duración; D cambia instrumentación; E cambia atmósfera.
4. Ejecuta las generaciones y guarda prompts, parámetros, WAV y reporte JSON.
5. Escucha a volumen igualado y completa la tabla de decisión.
6. Integra la variante elegida, exporta la demo y documenta licencias, fuentes y hashes.

## Comandos

```bash
cd laboratorio-audio-ia
pip install -r requirements.txt
pip install -r requirements-module3.txt
python modulo_3_ia/src/generate_midi.py --bpm 92 --bars 16 --progression Dm,Bb,F,C --key-root D --output proyecto_modulo_3/midi/composicion_base.mid
python modulo_3_ia/src/analyze_harmony.py proyecto_modulo_3/midi/composicion_base.mid --output proyecto_modulo_3/analisis/analisis_armonia.json
python modulo_3_ia/src/run_experiments.py --csv proyecto_modulo_3/generacion/prompts.csv --output proyecto_modulo_3/generacion
python modulo_3_ia/src/evaluate_audio.py proyecto_modulo_3/generacion/version_A.wav --output proyecto_modulo_3/analisis/version_A.qc.json
```

## Rúbrica (100 puntos)

| Criterio | Peso |
|---|---|
| Intención y estructura | 15 |
| Control generativo | 20 |
| MIDI y armonía | 15 |
| Escucha crítica y artefactos | 20 |
| Reproducibilidad | 15 |
| Licencias y procedencia | 10 |
| Informe y defensa | 5 |

## Límites

Stable Audio Open 1.0 genera clips de hasta aproximadamente 47 segundos; una obra de 60–120 segundos se construye con fragmentos, edición y arreglo. La licencia del modelo, de los pesos y del servicio se revisan por separado. Ninguna salida generada concede derechos comerciales por sí sola.
