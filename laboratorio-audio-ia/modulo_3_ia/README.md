# Kit reproducible — Proyecto final del Módulo 3

Este kit aporta herramientas para generar un MIDI editable, estimar armonía, ejecutar Stable Audio Open mediante Diffusers, medir propiedades de audio y crear metadatos con SHA-256. No sustituye la revisión musical humana ni una estación de trabajo de audio.

## Entorno

Se recomienda Python 3.11 o 3.12. Desde la carpeta laboratorio-audio-ia:

~~~~bash
python -m venv .venv
# Windows PowerShell:
.venv\Scripts\Activate.ps1
# macOS/Linux:
source .venv/bin/activate

python -m pip install --upgrade pip
pip install -r requirements.txt
pip install -r requirements-module3.txt
~~~~

Para ejecutar solo los tests del generador MIDI y del QC con WAV sintético, instala las dependencias del laboratorio más pretty-midi:

~~~~bash
pip install pretty-midi==0.2.11
python -m unittest discover -s modulo_3_ia/tests -v
python -m compileall -q modulo_3_ia/src modulo_3_ia/tests
~~~~

Stable Audio Open requiere aceptación de la licencia del modelo en Hugging Face y hardware suficiente; CUDA es recomendable. No se descargan pesos durante las pruebas sintéticas.

## Flujo sugerido

1. Genera el MIDI de partida:

~~~~bash
python modulo_3_ia/src/generate_midi.py --bpm 92 --bars 16 --progression Dm,Bb,F,C --key-root D --output proyecto_modulo_3/midi/composicion_base.mid
~~~~

2. Analiza la armonía del MIDI:

~~~~bash
python modulo_3_ia/src/analyze_harmony.py proyecto_modulo_3/midi/composicion_base.mid --output proyecto_modulo_3/analisis/analisis_armonia.json
~~~~

3. Copia y completa data/prompts.example.csv como proyecto_modulo_3/generacion/prompts.csv. Cuando hayas revisado todos los parámetros y aceptado el uso del modelo:

~~~~bash
python modulo_3_ia/src/run_experiments.py --csv proyecto_modulo_3/generacion/prompts.csv --output proyecto_modulo_3/generacion
~~~~

El script genera un WAV por fila y reportes_generacion.json. No selecciona versiones ni inventa valoraciones; el estudiante completa la decisión después de escuchar cada WAV.

4. Evalúa una versión o la mezcla:

~~~~bash
python modulo_3_ia/src/evaluate_audio.py proyecto_modulo_3/generacion/version_A.wav --output proyecto_modulo_3/analisis/version_A.qc.json
~~~~

5. Crea metadatos para un archivo final:

~~~~bash
python modulo_3_ia/src/metadata.py proyecto_modulo_3/produccion/demo_final.wav --title "Memoria de agua" --author "Nombre del estudiante" --prompt "Cinematic ambient pad..." --seed 42 --output proyecto_modulo_3/etica/metadatos.json
~~~~

## Decisiones técnicas que no deben simplificarse

- Diffusers usa guidance_scale, no guidance.
- El WAV se escribe con pipeline.vae.sampling_rate; no se fija 44.1 kHz a mano.
- Stable Audio Open 1.0 permite generaciones de hasta aproximadamente 47 segundos. Una obra de 60–120 segundos se organiza mediante fragmentos, edición, arreglos y continuidad en el DAW.
- El generador carga el modelo una sola vez para ejecutar las cinco variantes.
- El seed documentado no garantiza igualdad bit a bit entre hardware, kernels y versiones. Registra el entorno completo.
- El QC entrega sample peak y una estimación 4x de true peak; no es certificación ITU-R BS.1770.
- LUFS y espectro no identifican de forma automática todos los artefactos, problemas de arreglo o fallos armónicos. La escucha crítica sigue siendo obligatoria.
- El hash demuestra identidad del archivo, no autoría o permisos.
- Comprueba por separado licencia del modelo autoalojado, términos de API/servicio y licencias de todo material externo.

## Estructura del proyecto de estudiante

Usa la estructura definida en docs/MODULE_3_PROJECT_FINAL.md. Conserva el MIDI base, el MIDI revisado, las cinco generaciones, la demo, stems y manifiestos. No rellenes archivos ausentes con ejemplos inventados.

## Fuentes técnicas

- Diffusers Stable Audio: https://huggingface.co/docs/diffusers/en/api/pipelines/stable_audio
- Model card Stable Audio Open 1.0: https://huggingface.co/stabilityai/stable-audio-open-1.0
- Stable Audio licensing: https://kb.stability.ai/knowledge-base/stable-audio-commerical-and-usage-licensing
- music21 Roman numerals: https://music21.org/music21docs/usersGuide/usersGuide_23_romanNumerals.html
- music21 chordify: https://music21.org/music21docs/usersGuide/usersGuide_09_chordify.html
