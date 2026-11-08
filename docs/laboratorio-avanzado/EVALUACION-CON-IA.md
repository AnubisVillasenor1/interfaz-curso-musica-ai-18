# Evaluación de los laboratorios técnicos con apoyo de IA

**Autor del curso:** Edwin Oswaldo Castillo Trejo · **Institución:** TAMV Online Network.  
La IA es un apoyo para revisión, tutoría y retroalimentación; no firma entregas por el estudiante, no valida licencias por sí misma y no sustituye la comprobación humana de audio, código y evidencias.

## Cuatro capas de evidencia

| Capa | Qué se verifica | Evidencia mínima | Qué no basta |
|---|---|---|---|
| Comprensión | Definiciones, unidades y razonamiento causal. | Respuestas explicadas y preguntas de defensa. | Copiar definiciones sin relacionarlas con la pista. |
| Ejecución | Reproducibilidad, parámetros, dependencias y artefactos generados. | Código, comando exacto, versiones, CSV/JSON y logs relevantes. | Una captura de código sin ejecutar. |
| Aplicación musical | Correspondencia entre medición, escucha y decisión. | Audio autorizado, marcas de tiempo, A/B a nivel igualado, capturas DAW. | Afirmar que una cifra demuestra “mejor sonido”. |
| Ética y procedencia | Derechos, licencia de modelo, créditos y origen de muestras. | Manifiesto, hash SHA-256, licencia/permisos y versiones. | “Lo encontré en internet” o “la IA lo hizo”. |

## Prompt maestro — Módulo técnico 1

Actúa como revisor pedagógico de ingeniería de audio digital, DSP, características musicales y separación de fuentes. Evalúa la entrega del Laboratorio técnico 1 de TAMV Online Network, cuyo autor de curso es Edwin Oswaldo Castillo Trejo y que cuenta con apoyo de IA declarado.

**Contexto:** nivel [inicial/intermedio], audio [título], procedencia/licencia [dato], duración [s], tasa original [Hz], tasa de análisis [Hz], n_fft [valor], hop_length [valor].

**Evidencias aportadas:** código y comando, salida de consola, reporte JSON, CSV, espectrograma STFT, mel, cromagrama, gráficas de RMS/centroide/rolloff, escucha con marcas de tiempo, onsets/tempo y stems/artefactos si aplica.

Evalúa con la rúbrica: ejecución reproducible 20 %, gráficas 15 %, interpretación espectral 20 %, tempo/onsets 10 %, separación de fuentes 15 %, informe técnico 10 %, ética/trazabilidad 10 %. Si no se entregó separación, determina si la omisión fue técnicamente justificada; no otorgues automáticamente los puntos completos.

Para cada criterio informa puntaje provisional, evidencia literal, omisiones, error conceptual si lo hay y una mejora verificable. No inventes resultados de audio que no puedes escuchar ni atribuyas instrumentos a partir del centroide o cromagrama solamente. Distingue hecho medido, observación auditiva e hipótesis.

Rechaza como no verificable un resultado si falta el código ejecutado, las gráficas no corresponden al mismo archivo, el estudiante no explica los parámetros o no documenta derechos. Termina con correcciones prioritarias y preguntas de defensa oral. La decisión final corresponde a revisión humana.

## Prompt maestro — Módulo técnico 2

Actúa como revisor técnico de mezcla y masterización. Evalúa la entrega del Laboratorio técnico 2 de TAMV Online Network, autor del curso Edwin Oswaldo Castillo Trejo, con apoyo de IA declarado.

**Destino:** [streaming/broadcast/cine/juego/podcast/archivo]. **Material y permiso:** [dato]. **Herramientas y parámetros:** [DAW/plugins/scripts].

**Evidencias:** mezcla original, versión corregida, master, reportes JSON, peak sample-based, RMS, LUFS integrados, true peak y método de medición, crest factor, correlación L/R, clipping, gráficos, A/B a volumen igualado y justificación musical.

Puntúa: diagnóstico 20 %, EQ/balance 15 %, dinámica 15 %, masterización 20 %, comparación A/B 10 %, documentación 10 %, derechos/trazabilidad 10 %. Cita evidencia concreta y asigna puntuación provisional; si falta un archivo o una medición, marca “no evaluable” en vez de inventar datos.

No apliques una meta LUFS universal. Distingue la recomendación EBU de radiodifusión de los objetivos de reproducción de plataformas. No presentes la interpolación 4x como true peak certificado. Una correlación L/R aislada no demuestra anchura, y un medidor no determina calidad artística.

Identifica las acciones que pueden causar clipping, pérdida de transitorios, pumping, exceso de dureza o degradación por codec. Emite un dictamen provisional: insuficiente / en desarrollo / aprobado / dominio sólido, y explica la evidencia que falta. La IA no certifica el cumplimiento legal ni sustituye la escucha humana.

## Rúbrica global del portafolio técnico

| Criterio | Peso | Condición para excelencia |
|---|---:|---|
| Corrección técnica | 20 % | Fórmulas, unidades, parámetros y límites explicados sin errores importantes. |
| Calidad musical y criterio de escucha | 20 % | Medición relacionada con decisiones audibles, con nivel A/B igualado. |
| Reproducibilidad | 15 % | Un tercero ejecuta el proyecto desde un entorno declarado. |
| Profundidad del análisis | 15 % | Hipótesis, evidencia, contraejemplo y limitaciones registrados. |
| Trazabilidad y derechos | 15 % | Procedencia y autorizaciones demostrables; hash y versiones. |
| Comunicación profesional | 15 % | Informe breve, claro, gráficas legibles y defensa oral coherente. |

## Reglas anti-trampa y control de sesgo

1. Si el código falla en un entorno limpio, la parte de ejecución no puede aprobarse.
2. Si las gráficas no identifican archivo y parámetros, no se consideran evidencia reproducible.
3. Una afirmación sobre instrumento, acorde, género o calidad debe estar acompañada de escucha o método adicional; las características de bajo nivel no son etiquetas semánticas.
4. No se emiten recomendaciones de publicación comercial sin revisar los derechos del audio, modelo, pesos y muestras.
5. Una comparación de versiones debe igualar el volumen de escucha; de otro modo, la versión más fuerte puede sesgar el juicio.
6. Las puntuaciones de IA son provisionales. Un evaluador humano verifica artefactos, audio y condiciones antes del dictamen final.

## Defensa oral mínima

- ¿Qué señal mediste y qué supuesto hace el algoritmo?
- ¿Qué afirmación depende de una medición y cuál depende de escucha?
- ¿Qué parámetro cambiarías y qué resultado esperas?
- ¿Cómo reproduciría otra persona tu análisis?
- ¿Qué derecho o licencia aplica al audio y a cada modelo de IA?
