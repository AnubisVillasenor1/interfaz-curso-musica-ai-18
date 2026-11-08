# Proyecto final del Módulo 3
## Obra musical controlada por IA

**Principio de evaluación:** no se califica una colección de audios generados. Se evalúa una obra musical en la que el estudiante demuestra intención artística, control técnico sobre la composición y la generación, criterio auditivo, producción, reproducibilidad, trazabilidad y capacidad para defender cada decisión.

La evidencia debe distinguir tres planos:

1. **Qué produjo la IA:** material, variaciones o propuestas que realmente generó el modelo.
2. **Qué decidió el estudiante:** intención, MIDI, armonía, estructura, parámetros, selección, edición, arreglo y producción.
3. **Qué respalda cada afirmación:** archivo, prompt, registro, medición, licencia, marca temporal o explicación técnica verificable.

## 1. Objetivos verificables

El estudiante debe poder:

- Definir una intención musical antes de generar.
- Construir una base MIDI estructurada, editable y revisada.
- Explicar tonalidad, tempo, progresión armónica, estructura y función instrumental.
- Dirigir un modelo mediante prompt, negative prompt, semilla y parámetros explícitos.
- Generar cinco variaciones comparables, cambiando una sola variable por comparación.
- Seleccionar, editar e integrar material con criterio auditivo.
- Entregar una producción con mediciones técnicas y escucha crítica.
- Documentar modelos, versiones, fuentes, licencias, hashes y aportes humanos.
- Reconstruir el proceso y defender la obra sin depender de la respuesta de una IA.

## 2. Rúbrica principal — 100 puntos

| Criterio | Peso | Excelente (85–100) | Sólido (70–84) | Insuficiente (0–69) |
|---|---:|---|---|---|
| Intención musical | 20% | Concepto propio, emoción clara y sostenida, estructura narrativa y decisiones audibles | Idea definida con desarrollo limitado | Concepto ausente o genérico |
| Coherencia armónica | 15% | Tonalidad contrastada, progresión con función, tensión, resolución y transiciones justificadas | Armonía funcional pero predecible | Armonía incoherente o sin análisis |
| Control generativo | 20% | Prompts, negative prompts, semillas y parámetros controlados; cinco versiones comparables y descartes razonados | Parámetros básicos documentados | Generación aleatoria sin método |
| Calidad de producción | 15% | Balance, dinámica, estéreo, edición limpia, mediciones y escucha crítica | Producción funcional con defectos menores | Clipping, desequilibrio o master ausente |
| Originalidad | 10% | Aporte humano evidente en composición, arreglo, edición o procesamiento | Aporte personal limitado | Material generado prácticamente sin intervención |
| Reproducibilidad | 10% | Código, entorno, comandos, modelos, versiones, parámetros y rutas documentados | Proceso parcialmente reproducible | No puede reconstruirse |
| Ética y trazabilidad | 10% | Licencias, fuentes, permisos, metadatos, hash y límites documentados | Documentación parcial | Material sin procedencia ni derechos revisados |

### Fórmula

Cada criterio recibe una nota de 0 a 100. La calificación se calcula multiplicando cada nota por su peso expresado como fracción y sumando los siete resultados:

~~~~text
Calificación final =
(Intención musical × 0.20) +
(Coherencia armónica × 0.15) +
(Control generativo × 0.20) +
(Calidad de producción × 0.15) +
(Originalidad × 0.10) +
(Reproducibilidad × 0.10) +
(Ética y trazabilidad × 0.10)
~~~~

- **Aprobación:** 70/100.
- **Dominio sólido:** 85/100 o superior.
- **Excelencia:** 95/100 o superior, únicamente con evidencia completa y defensa oral satisfactoria.

## 3. Desglose analítico por criterio

### 3.1 Intención musical — 20 puntos

| Subcriterio | Máximo | Evidencia de excelencia |
|---|---:|---|
| Concepto creativo | 5 | Idea específica, propia y comprensible en una frase |
| Emoción y narrativa | 4 | Evolución perceptible entre inicio, desarrollo, clímax y cierre |
| Tonalidad y tempo | 4 | Elección razonada y contrastada con el material real |
| Estructura | 4 | Secciones con contraste y función narrativa |
| Instrumentación | 3 | Cada capa cumple una función musical concreta |

**Pregunta central:** ¿la pieza comunica una idea clara?

Ejemplo de evidencia:

> “La pieza usa Re menor a 92 BPM para construir una melancolía contenida. La intro mantiene una textura mínima; el desarrollo introduce bajo y percusión; el clímax abre el registro y la densidad; el cierre reduce las capas para recuperar intimidad. La ausencia de voz deja que el motivo instrumental lleve la narrativa.”

Ejemplo insuficiente: “Usé IA porque suena bien.”

### 3.2 Coherencia armónica — 15 puntos

| Subcriterio | Máximo | Evidencia de excelencia |
|---|---:|---|
| Tonalidad | 3 | Centro tonal identificable y contrastado con notas y cadencias |
| Progresión | 4 | Función armónica, tensión y resolución explicadas |
| Relación entre secciones | 4 | Contraste de armonía o conducción de voces con propósito |
| Análisis armónico | 2 | Reporte reproducible con music21 y revisión manual |
| Transiciones | 2 | Cadencias, acordes de paso o transiciones justificadas |

Ejemplo didáctico, que debe validarse en el MIDI de cada estudiante:

~~~~text
Tonalidad estimada: D minor
Progresión de referencia: Dm - Bb - F - C
Lectura posible: i - VI - III - VII
Hipótesis: establecimiento, expansión, elevación y expectativa
Validación: inversiones, melodía, bajo, notas ajenas y cadencia final
~~~~

music21 puede ayudar a estimar tonalidad, formar una vista de acordes con chordify y proponer numerales romanos. El resultado es una estimación computacional, no una sentencia musical. El estudiante debe revisar el MIDI, las inversiones, las notas de paso y las cadencias mediante escucha y análisis manual.

### 3.3 Control generativo — 20 puntos

| Subcriterio | Máximo | Evidencia de excelencia |
|---|---:|---|
| Prompt principal | 5 | Específico, musical y orientado a una intención |
| Negative prompt | 3 | Exclusiones relevantes para el resultado buscado |
| Semillas | 3 | Registradas y comparadas |
| Parámetros | 3 | Pasos, guidance_scale, duración y modelo documentados |
| Variaciones | 5 | Cinco versiones comparables y decisiones justificadas |

La ficha de cada generación debe registrar:

- ID del modelo, revisión/checkpoint y fecha.
- Prompt y negative prompt completos.
- Semilla y dispositivo.
- num_inference_steps.
- guidance_scale.
- audio_start_in_s y audio_end_in_s.
- Versión de Diffusers, PyTorch y Python.
- Sample rate real, canales, formato y duración real.
- Archivo WAV, SHA-256, observación de escucha y decisión.

#### Experimento A–E

El experimento tiene una línea base y cuatro comparaciones de una sola variable. Conserva iguales los demás controles para poder atribuir razonablemente un cambio al parámetro que modificaste.

| Versión | Variable que cambia | Controles que permanecen |
|---|---|---|
| A | Línea base | Semilla 42, 50 pasos, guidance_scale 7.0, 10 s |
| B | guidance_scale cambia a 6.0 | Mismo prompt, semilla, pasos y duración |
| C | Duración cambia a 12 s | Mismo prompt, semilla, pasos y guidance_scale |
| D | Instrumentación descrita en el prompt | Mismo seed, pasos, guidance_scale y duración |
| E | Atmósfera descrita en el prompt | Mismo seed, pasos, guidance_scale y duración |

El archivo CSV de ejemplo conserva las decisiones como “por evaluar”. No se debe afirmar que una versión es cálida, oscura, más limpia, más amplia o superior antes de generar y escuchar sus archivos.

### 3.4 Calidad de producción — 15 puntos

| Subcriterio | Máximo | Evidencia de excelencia |
|---|---:|---|
| Balance espectral | 3 | Graves, medios y agudos equilibrados según el arreglo |
| Presencia del elemento principal | 3 | Voz, melodía o motivo inteligible |
| Dinámica | 3 | Transitorios y expresión conservados |
| Imagen estéreo | 2 | Anchura intencional y compatibilidad mono revisada |
| Masterización | 2 | Loudness y true peak medidos correctamente |
| Coherencia global | 2 | Secciones integradas como una misma obra |

**Evidencia mínima:**
- demo_final.wav.
- Reporte de loudness integrada.
- Sample peak y true peak.
- Gráfica espectral.
- Comparación A/B con volumen igualado.
- Notas de escucha crítica.
- Capturas de la cadena de producción.
- Stems alineados desde el mismo punto temporal, cuando correspondan.

No se premia alcanzar una cifra LUFS aislada. Un master puede alcanzar un nivel objetivo y aun así sonar aplastado, desequilibrado o artificial. Las mediciones describen propiedades concretas, pero la calidad musical requiere escucha crítica.

### 3.5 Originalidad — 10 puntos

| Subcriterio | Máximo | Evidencia de excelencia |
|---|---:|---|
| Decisión armónica propia | 3 | Reescritura, reharmonización o conducción de voces original |
| Edición del material IA | 3 | Cortes, inversión, filtrado, sincronización, procesamiento o reorganización |
| Arreglo propio | 2 | Capas, dinámica, estructura y transiciones aportadas por el estudiante |
| Identidad artística | 2 | Lenguaje propio, sin imitar la identidad de una persona concreta |

**Pregunta central:** ¿qué aporta el estudiante que el modelo no habría entregado por sí solo?

### 3.6 Reproducibilidad — 10 puntos

| Subcriterio | Máximo | Evidencia de excelencia |
|---|---:|---|
| README | 2 | Instrucciones completas y ordenadas |
| Dependencias | 2 | Versiones y entorno documentados |
| Comandos | 2 | Comandos ejecutables y rutas claras |
| Semillas y prompts | 2 | Registro completo de generaciones |
| Datos y modelos | 2 | Modelo, revisión, licencia y procedencia identificados |

La prueba de reproducibilidad permite a otra persona reconstruir una versión comparable. Una semilla ayuda a repetir la inicialización, pero no garantiza identidad bit a bit entre GPU, CPU, kernels, versiones del modelo y operadores no deterministas. Esas diferencias deben declararse.

### 3.7 Ética y trazabilidad — 10 puntos

| Subcriterio | Máximo | Evidencia de excelencia |
|---|---:|---|
| Licencias | 3 | Herramientas, modelos, fuentes y materiales externos identificados |
| Autoría | 2 | Aportes humanos y asistencia IA separados |
| Metadatos | 2 | Campos completos y verificables |
| Derechos de terceros | 2 | Autorizaciones y limitaciones revisadas |
| Trazabilidad | 1 | Fecha, versión, procedencia y SHA-256 |

Un hash SHA-256 identifica un archivo y ayuda a detectar modificaciones; no acredita autoría, copyright, titularidad ni autorización comercial.

## 4. Paquete obligatorio de evidencia

~~~~text
proyecto_modulo_3/
├── README.md
├── ficha_creativa.md
├── midi/
│   ├── composicion_base.mid
│   └── composicion_revisada.mid
├── generacion/
│   ├── prompts.csv
│   ├── version_A.wav
│   ├── version_B.wav
│   ├── version_C.wav
│   ├── version_D.wav
│   └── version_E.wav
├── analisis/
│   ├── analisis_armonia.txt
│   ├── reportes_generacion.json
│   └── comparacion_versiones.csv
├── produccion/
│   ├── demo_final.wav
│   ├── stems/
│   └── capturas_cadena.png
├── etica/
│   ├── licencias.md
│   ├── fuentes.md
│   └── metadatos.json
└── informe_final.md
~~~~

La ausencia de un archivo reduce el criterio correspondiente. No se completan los espacios con mediciones, licencias, archivos ni decisiones supuestas.

## 5. Rúbrica de escucha crítica

| Pregunta | Registro |
|---|---|
| ¿La intención se percibe desde el inicio? | Sí / Parcial / No + marca temporal |
| ¿La tonalidad y el tempo son consistentes o cambian intencionalmente? | |
| ¿Existe contraste entre secciones? | |
| ¿La melodía o elemento principal es inteligible? | |
| ¿Bombo y bajo conviven sin enmascaramiento excesivo? | |
| ¿Los agudos son agradables y no fatigan? | |
| ¿La dinámica conserva expresión? | |
| ¿La imagen estéreo es intencional y compatible en mono? | |
| ¿Hay clipping, cortes, ruido metálico o artefactos audibles? | |
| ¿El final resuelve o deja una intención clara? | |

Una respuesta “No” en clipping, artefactos graves, desequilibrio extremo o incoherencia activa una revisión obligatoria antes de asignar excelencia. La escucha debe incluir marcas temporales y una descripción de lo realmente percibido.

## 6. Metadatos de procedencia

Ejemplo de estructura; los datos de fecha, revisión, licencia y hash deben sustituirse por los valores reales del proyecto.

~~~json
{
  "titulo": "Memoria de agua",
  "autor_humano": "Nombre del estudiante",
  "asistencia_ia": true,
  "modelo_generativo": "stabilityai/stable-audio-open-1.0",
  "revision_modelo": "registrar commit o revisión",
  "semilla": 42,
  "prompt": "Cinematic ambient pad in D minor...",
  "negative_prompt": "low quality, clipping...",
  "fecha_generacion_utc": "2026-11-07T00:00:00Z",
  "parametros": {
    "num_inference_steps": 50,
    "guidance_scale": 7.0,
    "audio_start_in_s": 0.0,
    "audio_end_in_s": 10.0
  },
  "sample_rate_hz": 44100,
  "dispositivo": "registrar CPU/GPU y modelo",
  "licencia_modelo": "verificar licencia aplicable",
  "licencia_servicio": "verificar términos del servicio o API",
  "materiales_externos": [],
  "hash_sha256": "",
  "declaracion_originalidad": "El estudiante documenta por separado sus decisiones de composición, arreglo, edición y producción y el material generado mediante IA."
}
~~~

La licencia del modelo autoalojado y los términos del servicio/API no son necesariamente el mismo régimen. La tarjeta del modelo Stable Audio Open 1.0 indica Stability AI Community License y remite a Stability para el uso comercial; la guía actual de Stable Audio distingue los términos del servicio/API de la licencia de los pesos autoalojados. El estudiante debe verificar el régimen exacto de su modo de acceso y la versión usada. Los materiales externos, voces, samples y grabaciones requieren revisión independiente.

## 7. Estructura del informe final

1. Identificación de la obra, estudiante, fecha y modelo.
2. Concepto creativo, emoción y narrativa.
3. Decisiones de tempo, tonalidad, métrica e instrumentación.
4. MIDI base, MIDI revisado y cambios realizados.
5. Análisis armónico y límites del método.
6. Prompts, negative prompts, semillas y parámetros.
7. Comparación de cinco versiones y justificación de descartes.
8. Edición, arreglo, mezcla, masterización y stems.
9. Mediciones técnicas y escucha crítica.
10. Aportes humanos frente a salidas generadas.
11. Licencias, fuentes, permisos, metadatos y hashes.
12. Limitaciones y siguiente iteración.

## 8. Defensa oral

### Duración recomendada

- Presentación breve: 5 minutos.
- Presentación estándar: 8–10 minutos.
- Defensa técnica: 15 minutos más preguntas.

### Distribución de una presentación de 8 minutos

| Tiempo | Sección | Evidencia |
|---|---|---|
| 0:00–0:45 | Apertura | Título, intención y objetivo |
| 0:45–2:00 | Concepto musical | Emoción, narrativa, tonalidad, tempo y estructura |
| 2:00–3:30 | Composición | MIDI, armonía y decisiones humanas |
| 3:30–5:00 | Generación | Modelo, prompt, seed, parámetros y cinco versiones |
| 5:00–6:30 | Producción | Edición, mezcla, mediciones y problemas corregidos |
| 6:30–7:30 | Resultado | Reproducir un fragmento de 20–30 segundos |
| 7:30–8:00 | Cierre | Limitaciones, ética y siguiente paso |

### Preguntas del jurado

1. ¿Qué emoción querías comunicar y qué decisión musical la vuelve audible?
2. ¿Por qué elegiste esa tonalidad, tempo, métrica e instrumentación?
3. ¿Qué parte es decisión humana y qué parte fue generada?
4. ¿Qué parámetros controlaste y cómo diseñaste la comparación?
5. ¿Qué versión descartaste y qué escuchaste para tomar esa decisión?
6. ¿Qué artefactos encontraste y cómo los corregiste?
7. ¿Qué licencias y autorizaciones aplican al modelo y a los materiales?
8. ¿Cómo puede otra persona reproducir tu proceso?
9. ¿Qué mejorarías con más tiempo, datos o recursos?

El estudiante debe responder con los archivos abiertos y marcas temporales. No es suficiente leer una descripción redactada por una IA. La defensa comprueba que entiende sus decisiones y diferencia una observación real de una inferencia.

## 9. Prompt de evaluación asistida por IA

~~~text
Actúa como jurado experto en composición, producción musical, IA generativa,
análisis armónico, ingeniería de audio y ética tecnológica.

Evalúa el proyecto final del Módulo 3 con rigor y evidencia.

Contexto:
- Título:
- Objetivo artístico:
- Emoción/narrativa:
- Tonalidad y tempo:
- Instrumentación:
- Modelo y versión:
- Material propio, licenciado, autorizado o generado:

Entregables:
1. Ficha creativa.
2. MIDI base y MIDI revisado.
3. Cinco versiones de audio.
4. Prompts, semillas y parámetros.
5. Análisis armónico.
6. Reportes de audio.
7. Demo final y stems.
8. Informe técnico y creativo.
9. Licencias, fuentes y metadatos.

Rúbrica:
- Intención musical: 20%.
- Coherencia armónica: 15%.
- Control generativo: 20%.
- Calidad de producción: 15%.
- Originalidad: 10%.
- Reproducibilidad: 10%.
- Ética y trazabilidad: 10%.

Para cada criterio:
1. Asigna una calificación de 0 a 100.
2. Cita el archivo, tabla, fragmento o marca temporal que la sustenta.
3. Separa observaciones verificables de inferencias.
4. Identifica errores musicales, técnicos, éticos o de reproducibilidad.
5. Propón una corrección concreta y comprobable.
6. Indica qué falta para alcanzar excelencia.

No inventes cualidades auditivas.
No afirmes haber escuchado un audio que no se te haya entregado.
No declares una licencia válida sin consultar el texto aplicable.
Si faltan archivos, solicita la evidencia antes de asignar una nota definitiva.
~~~

## 10. Controles técnicos de Stable Audio

La API actual de Diffusers StableAudioPipeline documenta prompt, negative_prompt, num_inference_steps, guidance_scale, audio_start_in_s, audio_end_in_s y generator. El parámetro es guidance_scale, no guidance. El sample rate de exportación debe leerse desde pipeline.vae.sampling_rate.

Stable Audio Open 1.0 produce clips de hasta aproximadamente 47 segundos en estéreo a 44.1 kHz. Una composición de 60–120 segundos debe construirse mediante varios fragmentos, arreglo, edición y continuidad en el DAW; no mediante una llamada que supere el límite del modelo.

Una semilla ayuda a reproducir la inicialización, pero no garantiza identidad bit a bit en todo hardware y versiones de librerías. Registra modelo, revisión, entorno, dispositivo, semilla y parámetros.

## 11. Fuentes técnicas primarias

- [Diffusers — Stable Audio Pipeline](https://huggingface.co/docs/diffusers/en/api/pipelines/stable_audio)
- [Hugging Face — Stable Audio Open 1.0 model card](https://huggingface.co/stabilityai/stable-audio-open-1.0)
- [Stability AI — Stable Audio commercial and usage licensing](https://kb.stability.ai/knowledge-base/stable-audio-commerical-and-usage-licensing)
- [Stability AI — Terms of Service](https://stability.ai/terms-of-service)
- [music21 — Roman numeral analysis](https://music21.org/music21docs/usersGuide/usersGuide_23_romanNumerals.html)
- [music21 — chordify](https://music21.org/music21docs/usersGuide/usersGuide_09_chordify.html)

Los datos de loudness, true peak, RMS, correlación estéreo, decisiones de selección y cualidades auditivas del ejemplo “Memoria de agua” son ilustrativos: deben medirse u oírse en los archivos reales del estudiante.
