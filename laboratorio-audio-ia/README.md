# Laboratorio técnico de audio e IA musical — TAMV Online Network

**Autor del curso:** Edwin Oswaldo Castillo Trejo  
**Apoyo:** asistencia de IA para estructuración, revisión técnica y documentación; decisiones y validación pedagógica humanas.  
**Programa:** Play & Go · Creación Musical con IA  
**Tipo:** trayecto técnico complementario de nivel inicial–intermedio. No sustituye ni renumera las 16 sesiones originales ni cambia sus identificadores de progreso.

## Propósito

Este trayecto conecta la creación musical con IA con dos capacidades técnicas auditables: (1) analizar audio mediante DSP y características reproducibles; (2) diagnosticar mezcla y masterización mediante mediciones, escucha crítica y comparación A/B. Las herramientas producen evidencia; no sustituyen el oído, el juicio musical ni las autorizaciones de derechos.

## Entorno reproducible

Se recomienda Python 3.11 o 3.12. Crea un entorno virtual e instala las dependencias:

\`\`\`bash
cd laboratorio-audio-ia
python -m venv .venv
# Windows PowerShell:
.venv\\Scripts\\Activate.ps1
# macOS/Linux:
source .venv/bin/activate
python -m pip install --upgrade pip
pip install -r requirements.txt
\`\`\`

Para conservar la combinación exacta de dependencias utilizada en tu equipo, genera y versiona un lock de entorno una vez comprobado:

\`\`\`bash
pip freeze > requirements.lock.txt
\`\`\`

El archivo \`requirements.txt\` expresa rangos compatibles, no afirma que todas las combinaciones posibles hayan sido certificadas. La validación automatizada instala un entorno limpio y ejecuta pruebas con señales sintéticas.

## Módulo técnico 1 — análisis acústico y DSP

Pon un audio sobre el que tengas derechos o permiso en \`audio/cancion.wav\`, y desde la carpeta \`laboratorio-audio-ia\` ejecuta:

\`\`\`bash
python -m src.analisis_musical audio/cancion.wav --output output --title "Mi análisis" --source-license "Licencia o permiso"
python -m src.comparar_stft audio/cancion.wav --output output
\`\`\`

Genera \`caracteristicas_musicales.csv\`, \`analisis_musical.png\`, \`caracteristicas_temporales.png\`, \`reporte_analisis.json\` y \`manifest.json\`. El manifiesto registra el hash SHA-256 del archivo de origen, la configuración y la licencia declarada. Un manifiesto es trazabilidad, no una validación jurídica automática.

Separación opcional de fuentes:

\`\`\`bash
pip install demucs
python -m src.separar_fuentes audio/cancion.wav --output output/stems --model htdemucs
\`\`\`

Demucs puede necesitar descargar pesos y consumir bastante RAM/VRAM. Los stems pueden contener sangrado, pérdida de transitorios o artefactos; separarlos no elimina los derechos sobre la grabación original ni autoriza una publicación.

## Módulo técnico 2 — diagnóstico de mezcla y masterización

\`\`\`bash
python -m src.analisis_masterizacion audio/mezcla_sin_master.wav --output output
python -m src.compresor_simple audio/mezcla_sin_master.wav output/mezcla_comprimida.wav --threshold -20 --ratio 3 --attack 10 --release 150 --makeup 2 --knee 6 --ceiling -1
python -m src.comparar_versiones audio/mezcla_sin_master.wav audio/master.wav --output output
\`\`\`

El informe incluye loudness integrada si el material permite medirla, pico sample-based, RMS, crest factor, correlación L/R, clipping sample-based, estimación de true peak por sobremuestreo y gráficos de diagnóstico. La estimación 4x es didáctica: para entregas de distribución utiliza una herramienta de medición conforme y verifica el archivo final codificado.

## Ejecutar pruebas

\`\`\`bash
python -m unittest discover -s tests -v
python -m compileall -q src tests
\`\`\`

Las pruebas usan tonos sintéticos y verifican contratos numéricos; no validan una mezcla artística ni ejecutan Demucs. La validación en GitHub Actions verifica importación, sintaxis y comportamiento de funciones sin audio de terceros.

## Entregable de cada módulo

1. Código ejecutable y configuración guardada.
2. Gráficas y CSV/JSON que correspondan.
3. Informe técnico con hipótesis, evidencias y límites.
4. Registro de escucha crítica o capturas del DAW.
5. Manifiesto de procedencia, licencia y uso declarado.
6. Reflexión personal: qué cambió la evidencia en tus decisiones.

## Reglas de interpretación

- RMS no equivale a loudness percibida; el centroide no identifica un instrumento; el cromagrama no demuestra una tonalidad por sí solo.
- El tempo automático puede duplicarse o reducirse a la mitad y fallar con rubato, síncopas o transitorios ambiguos.
- Una correlación estéreo próxima a 0 no significa automáticamente que la mezcla sea “ancha”; valores negativos motivan revisar compatibilidad mono.
- No existe un objetivo LUFS único para todos los contenidos. EBU R 128 describe objetivos de radiodifusión; Spotify publica sus propias recomendaciones de reproducción. El destino determina los criterios.
- Un techo sample-peak no garantiza un límite true-peak; la conversión con pérdida puede elevar los picos.
- No entregues audio comercial, credenciales, datos personales ni material de terceros sin autorización.

## Fuentes técnicas primarias

- Documentación de librosa: <https://librosa.org/doc/latest/>
- pyloudnorm / medición ITU-R BS.1770: <https://github.com/csteinmetz1/pyloudnorm>
- EBU R 128: <https://tech.ebu.ch/publications/r128>
- Normalización y recomendaciones de Spotify: <https://support.spotify.com/artists/article/loudness-normalization/>
- Demucs: <https://github.com/facebookresearch/demucs>

**TAMV Online Network —** La IA propone; la persona verifica, decide y responde por el uso de la obra.
