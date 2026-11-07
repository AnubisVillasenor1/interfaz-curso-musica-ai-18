# Módulo técnico 1 — Fundamentos acústicos, DSP y extracción espectral

**Trayecto:** Laboratorio técnico de audio e IA musical · TAMV Online Network  
**Autor del curso:** Edwin Oswaldo Castillo Trejo · **Apoyo declarado:** IA para estructuración y revisión de materiales.  
**Nivel:** inicial–intermedio · **Tiempo orientativo:** 5–7 horas entre clases, código y escucha.  
**Prerrequisitos:** manejo básico de archivos, terminal y Python. No requiere matemáticas avanzadas, pero sí registrar unidades y parámetros.

## Competencia de salida

La persona estudiante podrá cargar legalmente una pista de audio, explicar las decisiones de muestreo y análisis, generar un conjunto coherente de características temporales y espectrales, producir un CSV y un reporte reproducibles, y distinguir lo que los algoritmos miden de lo que una escucha o interpretación humana debe confirmar.

## Resultados de aprendizaje observables

1. Calcular el límite de Nyquist y explicar filtrado antialiasing, resolución temporal/frecuencial y las consecuencias de cambiar \`n_fft\` y \`hop_length\`.
2. Generar STFT, espectrograma mel, cromagrama y características RMS, centroide, rolloff, tasa de cruces por cero y flatness.
3. Estimar tempo y onsets, contrastarlos con la escucha y documentar al menos una limitación concreta.
4. Ejecutar o descartar una separación de fuentes según derechos, coste computacional y calidad del resultado.
5. Entregar código, resultados, informe y manifiesto de procedencia que otra persona pueda reconstruir.

## Lección 1 — La señal digital: muestreo, amplitud y referencia

Una señal digital representa una presión sonora mediante muestras discretas. La frecuencia de muestreo expresa cuántas muestras se toman por segundo. Para 48 kHz, el límite de Nyquist teórico es 24 kHz; una señal real necesita filtrado antialiasing antes de convertirla a digital, con una banda de transición que evita que el contenido fuera de banda se pliegue dentro de la banda audible.

No confundas amplitud, pico sample-based, RMS, dBFS y loudness. dBFS representa amplitud respecto al máximo digital de referencia y no es una medición psicoacústica de sonoridad. LUFS intenta aproximar la sonoridad percibida con ponderación y gating definidos por estándares como ITU-R BS.1770. RMS es una medida de energía media, útil para describir evolución temporal, pero no reemplaza LUFS.

El primer paso de ingeniería es inspeccionar metadatos: duración, tasa original, número de canales, formato, profundidad si está disponible y rango de amplitud. Remuestrear a 22 050 Hz puede ser práctico para análisis, pero no conserva todo el contenido de una fuente de alta frecuencia; por ello se registra siempre la tasa original junto a la tasa de análisis.

**Práctica breve:** genera un seno de 1 kHz a 44.1 kHz, escribe el WAV y comprueba duración, frecuencia y pico. Después remuestrea a 22.05 kHz y explica qué información cambia y qué información de identidad de la señal se conserva.

## Lección 2 — STFT y las escalas para leer el sonido

Una FFT aplicada a toda una canción combina eventos de tiempos diferentes. La STFT divide el audio en ventanas solapadas y calcula una representación espectral por frame, de modo que la evolución del contenido pueda observarse a lo largo del tiempo. La ventana Hann reduce discontinuidades en los límites de cada segmento; no elimina todo leakage ni vuelve perfecta la resolución.

\`n_fft\` controla el número de muestras que intervienen en cada ventana. Una ventana mayor aumenta la resolución frecuencial pero difumina el instante de los transitorios. Una ventana menor localiza mejor ataques rápidos, con bins frecuenciales más amplios. \`hop_length\` controla la distancia entre frames; un salto corto produce más columnas y mayor detalle temporal, con mayor coste y redundancia, pero no crea resolución frecuencial adicional.

El espectrograma lineal presenta bins con separación uniforme en Hz. La escala mel comprime las frecuencias de una forma aproximada a la percepción auditiva y suele ser útil para inspección perceptual y entradas de modelos, pero no reemplaza una gráfica lineal cuando importa localizar un componente en Hz. Las gráficas generadas por este laboratorio se expresan como dB relativos a la referencia del propio archivo, no como SPL calibrado.

**Práctica breve:** usa \`python -m src.comparar_stft audio/cancion.wav\`. Compara \`n_fft=256, 1024, 2048, 4096\`; elige una configuración para transitorios de batería y otra para componentes graves. Justifica la decisión en una tabla; no elijas solo la imagen visualmente más limpia.

## Lección 3 — Características y el límite entre medida e interpretación

RMS resume la energía de cada frame; el centroide espectral calcula el centro de gravedad de la magnitud y puede correlacionarse con brillo; rolloff identifica la frecuencia por debajo de la que cae un porcentaje configurado de energía; ZCR cuenta cambios de signo de la señal; flatness compara la media geométrica con la aritmética del espectro y puede aportar información sobre tonalidad/ruido. Ninguna característica es una etiqueta semántica de instrumento ni un juicio de calidad.

El cromagrama agrupa energía por doce clases de altura. Puede sugerir patrones armónicos o regiones tonales, pero percusión, distorsión, afinación no estándar, inversiones, notas ausentes y mezclas densas pueden producir resultados ambiguos. La estimación automática de tempo se apoya en periodicidades de una envolvente de onsets; puede elegir una lectura a doble o mitad de tempo. El número devuelto es una hipótesis de análisis, no un BPM certificado.

**Práctica breve:** ejecuta el análisis integrado y abre \`caracteristicas_musicales.csv\`. Localiza un segmento donde sube RMS y una región donde cambia el centroide. Escucha la región, apunta qué puede explicarlo y etiqueta el argumento como “medición”, “observación auditiva” o “hipótesis”. Esta separación de evidencia es parte de la calificación.

## Lección 4 — Separación de fuentes y auditoría de artefactos

La separación neuronal estima voces, batería, bajo y acompañamiento a partir de una mezcla; no recupera necesariamente los stems originales. Pueden aparecer sangrado entre fuentes, transitorios suavizados, sonido metálico, pérdida de reverberación, pre-eco o cambios de fase. Una voz separada no es prueba de que el resultado sea autorizado para publicar.

El programa opcional usa Demucs con el modo de dos stems. La ejecución puede descargar pesos y requerir memoria significativa; no forma parte del conjunto de dependencias obligatorias y no se ejecuta en CI. Los modelos, el código y los pesos pueden tener términos distintos; revisar sus licencias y el origen de la grabación es obligatorio antes de usar comercialmente los resultados.

**Práctica breve:** separa una pista con permiso explícito. Alinea la voz y el acompañamiento con la mezcla, compara segmentos de 10 segundos, registra tres artefactos posibles y describe qué arreglo o decisión de mezcla tomarías. Si no puedes validar derechos o el equipo no soporta el modelo, documenta el motivo para omitir la separación.

## Laboratorio integrado — “Radiografía sonora”

### Material
Una pista propia, de dominio público o con licencia/permiso documentado, preferiblemente de 60–120 segundos. No uses material comercial por el solo hecho de poder descargarlo.

### Procedimiento
1. Carga y anota título, autoría, licencia/permiso y hash SHA-256.
2. Genera STFT, mel, cromagrama y el conjunto de características.
3. Exporta CSV, PNG y JSON; conserva \`n_fft\`, \`hop_length\`, \`sr\` y la versión de librosa.
4. Escucha el audio completo; marca inicio, sección más densa y un cambio armónico o textural con marca de tiempo.
5. Entrega un informe donde distinga datos objetivos, escucha humana e inferencias. No afirmar “el instrumento X domina” basándose solo en el centroide.

### Entregables mínimos
- Código ejecutable desde un entorno limpio.
- \`caracteristicas_musicales.csv\`, \`reporte_analisis.json\` y las gráficas.
- Informe de 1–2 páginas con cuatro afirmaciones y su evidencia.
- Manifiesto de procedencia y permiso.
- Reflexión sobre un resultado que contradijo o refinó la primera escucha.

## Rúbrica práctica (100 puntos)

| Criterio | Puntos | Evidencia excelente |
|---|---:|---|
| Ejecución reproducible | 20 | Corre desde entorno limpio; parámetros y versiones quedan declarados. |
| Gráficas | 15 | Ejes, unidades, escalas y referencia se explican correctamente. |
| Análisis espectral | 20 | Relaciona eventos con evidencia visual y auditiva; distingue hipótesis de hechos. |
| Tempo y onsets | 10 | Contrasta resultado con escucha y explica ambigüedad o error. |
| Separación de fuentes, si aplica | 15 | Registra modelo, licencia, artefactos y comparación con mezcla. Si no aplica, justifica la exclusión. |
| Informe técnico | 10 | Reproduce la pregunta, el método, el resultado, la limitación y la conclusión. |
| Ética y trazabilidad | 10 | Fuente y licencia documentadas; hash y datos de la ejecución disponibles. |

**Avance recomendado:** 70/100 habilita corregir y continuar; 85/100 o más indica dominio sólido del laboratorio. La calificación no es un título oficial.

## Referencias de método

- Librosa, API de STFT y extracción de características: <https://librosa.org/doc/latest/>
- NumPy y SciPy: <https://numpy.org/doc/> · <https://docs.scipy.org/doc/scipy/>
- Demucs, código y uso de separación: <https://github.com/facebookresearch/demucs>
- Los derechos de la grabación fuente siguen vigentes después de separar stems.
