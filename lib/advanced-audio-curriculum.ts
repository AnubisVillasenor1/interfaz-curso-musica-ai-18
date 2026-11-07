/**
 * Laboratorio técnico complementario de TAMV Online Network.
 * No se mezcla con COURSE_MODULES ni altera las 16 lecciones persistidas.
 */
export const ADVANCED_AUDIO_AUTHOR = 'Edwin Oswaldo Castillo Trejo'
export const ADVANCED_AUDIO_BRAND = 'TAMV Online Network'
export const ADVANCED_AUDIO_PROGRAM = 'Laboratorio técnico de audio e IA musical'
export const ADVANCED_AUDIO_AI_NOTE =
  'Material estructurado y revisado con apoyo de IA; el autor del curso conserva la responsabilidad editorial y la validación humana.'
export const ADVANCED_AUDIO_CREDENTIAL_NOTE =
  'Trayecto formativo técnico complementario. Su finalización no equivale por sí misma a un grado académico ni a una acreditación oficial externa.'

export type AdvancedAudioModuleId = 'dsp' | 'mastering'

export interface AdvancedAudioLesson {
  id: string
  title: string
  minutes: number
  objective: string
  concepts: Array<{ heading: string; explanation: string }>
  demonstration: string
  commonErrors: Array<{ error: string; correction: string }>
  practice: string
  evidence: string[]
}

export interface AdvancedAudioRubricCriterion {
  id: string
  name: string
  weight: number
  evidence: string
  excellence: string
}

export interface AdvancedAudioModule {
  id: AdvancedAudioModuleId
  number: number
  title: string
  subtitle: string
  level: string
  estimatedHours: string
  objective: string
  outcomes: string[]
  lessons: AdvancedAudioLesson[]
  lab: {
    title: string
    estimatedHours: string
    purpose: string
    steps: string[]
    deliverables: string[]
    acceptance: string[]
  }
  rubric: AdvancedAudioRubricCriterion[]
  codeFiles: Array<{ path: string; purpose: string }>
  references: Array<{ label: string; url: string }>
}

export const ADVANCED_AUDIO_MODULES: AdvancedAudioModule[] = [
  {
    id: 'dsp',
    number: 1,
    title: 'Fundamentos acústicos, DSP y extracción espectral',
    subtitle: 'De la señal observable a una interpretación defendible',
    level: 'Inicial–intermedio con puente a análisis técnico',
    estimatedHours: '5–7 horas',
    objective:
      'Analizar audio de procedencia documentada y generar resultados temporales/espectrales reproducibles, justificando parámetros y limitaciones.',
    outcomes: [
      'Explicar muestreo, Nyquist, aliasing y la diferencia entre amplitud, RMS, dBFS y loudness.',
      'Elegir n_fft y hop_length según la pregunta de análisis y no solo por apariencia de la gráfica.',
      'Producir STFT, espectrograma mel, cromagrama y un CSV alineado con RMS, centroide, rolloff, ZCR, flatness y fuerza de onsets.',
      'Contrastar la estimación de tempo y la interpretación armónica con escucha crítica, sin tratar una métrica como etiqueta semántica.',
      'Registrar fuente, permiso/licencia, hash, versiones, parámetros y resultados para que el análisis sea reproducible.',
    ],
    lessons: [
      {
        id: 'dsp-01',
        title: 'Muestreo, amplitud, Nyquist y unidad de medida',
        minutes: 40,
        objective: 'Describir una señal digital con unidades y metadatos verificables antes de analizarla.',
        concepts: [
          { heading: 'Muestreo y Nyquist', explanation: 'La frecuencia de muestreo indica muestras por segundo. El límite teórico de Nyquist es la mitad de la tasa; para 48 kHz es 24 kHz. En la conversión A/D se usa filtrado antialiasing con banda de transición: una vez que el aliasing ocurrió, no se puede reparar por simple ecualización.' },
          { heading: 'No confundir unidades', explanation: 'Amplitud y pico sample-based describen magnitud de la señal; RMS resume energía media; dBFS expresa nivel relativo a la escala digital; LUFS estima sonoridad según una ponderación y gating específicos. Estas métricas responden a preguntas diferentes.' },
          { heading: 'Metadatos y remuestreo', explanation: 'Guarda tasa de muestreo, canales, duración y nombre de archivo original. Analizar a 22 050 Hz reduce coste, pero limita la banda representada. El manifiesto del laboratorio conserva tanto la tasa original como la tasa de análisis.' },
        ],
        demonstration: 'Carga un WAV, consulta sus metadatos, calcula duración en segundos y peak/RMS iniciales. Compara el mismo archivo analizado a su tasa original y a 22 050 Hz, anotando qué se conserva y qué se descarta.',
        commonErrors: [
          { error: 'Afirmar que 48 kHz permite representar contenido útil hasta 48 kHz.', correction: 'Calcula Nyquist como sr/2 y explica además la banda de transición del filtro anti-aliasing.' },
          { error: 'Usar RMS como sinónimo de LUFS.', correction: 'Registra ambas métricas con unidades y explica que la ponderación perceptual/gating de LUFS cambia la interpretación.' },
          { error: 'Sobrescribir el archivo original al remuestrear.', correction: 'Conserva la fuente intacta y anota explícitamente la tasa usada en análisis.' },
        ],
        practice: 'Crea una tabla de metadatos para una pista propia o autorizada y explica el compromiso entre tasa de muestreo, tamaño de archivo y banda útil.',
        evidence: ['Metadatos reproducibles de la fuente.', 'Tabla de unidades y cálculo de Nyquist.', 'Registro de licencia/permiso y hash del archivo.'],
      },
      {
        id: 'dsp-02',
        title: 'STFT, ventanas, resolución temporal y frecuencial',
        minutes: 45,
        objective: 'Elegir y comparar configuraciones STFT explicando el efecto de n_fft y hop_length.',
        concepts: [
          { heading: 'Qué representa la STFT', explanation: 'La STFT aplica análisis de Fourier sobre ventanas sucesivas. Cada columna del espectrograma resume energía en una ventana temporal; unir las columnas permite observar evolución tiempo-frecuencia, a diferencia de una FFT de toda la canción.' },
          { heading: 'Tamaño de ventana', explanation: 'Aumentar n_fft separa bins frecuenciales más cercanos y ayuda a estudiar componentes graves, pero la ventana abarca más tiempo y difumina ataques. Reducirlo localiza mejor transitorios, aunque los bins son más anchos.' },
          { heading: 'Hop length y ventana Hann', explanation: 'hop_length controla el desplazamiento entre ventanas: saltos menores dan más frames, no más resolución frecuencial. Hann reduce discontinuidades en los límites, aunque no elimina todo leakage.' },
        ],
        demonstration: 'Ejecuta comparar_stft.py con n_fft 256, 1024, 2048 y 4096. Escoge una configuración para ataques de batería y otra para notas graves sostenidas, justificando cada una.',
        commonErrors: [
          { error: 'Decir que una ventana más grande siempre es superior.', correction: 'Define primero si te interesa localizar un transitorio o separar frecuencias cercanas.' },
          { error: 'Afirmar que un hop pequeño aumenta resolución de frecuencia.', correction: 'Separa el papel temporal de hop_length del papel de n_fft.' },
          { error: 'Interpretar colores como SPL calibrado.', correction: 'Las gráficas de este laboratorio usan dB relativos a una referencia numérica, no dB SPL de una sala.' },
        ],
        practice: 'Compara dos configuraciones de ventana sobre el mismo fragmento; marca tres eventos y explica qué detalle gana o pierde cada configuración.',
        evidence: ['Comparación STFT con ejes legibles.', 'Valores n_fft/hop_length guardados.', 'Justificación de configuración ligada a una pregunta musical.'],
      },
      {
        id: 'dsp-03',
        title: 'RMS, centroide, rolloff, ZCR, flatness y cromagrama',
        minutes: 50,
        objective: 'Extraer características alineadas y describir con precisión qué miden y qué no demuestran.',
        concepts: [
          { heading: 'Energía y brillo', explanation: 'RMS describe amplitud cuadrática media por frame. Centroide es el centro de gravedad de la magnitud espectral y a veces se correlaciona con brillo; no identifica automáticamente instrumento, género ni calidad.' },
          { heading: 'Distribución espectral', explanation: 'Rolloff encuentra una frecuencia por debajo de la que se concentra un porcentaje configurado de energía. ZCR cuenta cambios de signo; flatness compara media geométrica y aritmética del espectro y puede ayudar a describir componentes tonal/noise-like.' },
          { heading: 'Cromagrama y alineación', explanation: 'Chroma agrupa energía en doce clases de altura. Puede sugerir cambios armónicos, pero mezclas densas, afinaciones, percusión y notas ausentes provocan ambigüedad. El CSV debe alinear cada fila con una marca temporal y un conjunto coherente de características.' },
        ],
        demonstration: 'Abre caracteristicas_musicales.csv y cruza los cambios de RMS/centroide con dos escuchas del audio. Escribe cada conclusión como medición, observación auditiva o hipótesis.',
        commonErrors: [
          { error: 'Afirmar que un centroide alto demuestra que suenan platillos.', correction: 'Describe primero la energía aguda y luego comprueba auditivamente o con stems qué la causa.' },
          { error: 'Leer un cromagrama como una transcripción infalible de acordes.', correction: 'Úsalo como pista de distribución de clases de altura; valida con oído, MIDI u otra herramienta.' },
          { error: 'Combinar características con distinto número de frames.', correction: 'Usa timestamps derivados del mismo sr y hop_length y comprueba que las longitudes coinciden antes de exportar.' },
        ],
        practice: 'Selecciona dos tramos de 5–10 segundos con comportamiento distinto; relaciona al menos tres características por tramo y documenta una explicación alternativa.',
        evidence: ['CSV con timestamps alineados.', 'STFT, mel y chroma.', 'Cuatro afirmaciones separadas entre métrica, escucha e hipótesis.'],
      },
      {
        id: 'dsp-04',
        title: 'Tempo, onsets, separación de fuentes y límites de inferencia',
        minutes: 45,
        objective: 'Validar estimaciones rítmicas y evaluar los artefactos y derechos de una separación neural.',
        concepts: [
          { heading: 'Onsets y tempo', explanation: 'La fuerza de onset busca cambios asociados con ataques; el tempo suele estimarse a partir de periodicidad en esa envolvente. Rubato, síncopas, half-time/double-time, patrones sincopados y transitorios ambiguos pueden desplazar la estimación.' },
          { heading: 'Separación de fuentes', explanation: 'Modelos como Demucs estiman voz y acompañamiento a partir de una mezcla. Los stems no son necesariamente originales y pueden contener sangrado, sonido metálico, transitorios suavizados y errores de fase.' },
          { heading: 'Procedencia', explanation: 'Registra fuente, licencia, hash SHA-256, versión de biblioteca/modelo y parámetros. El hash apoya la integridad del archivo, pero no demuestra por sí solo titularidad o permiso legal.' },
        ],
        demonstration: 'Ejecuta análisis_musical.py y, si el hardware y la licencia lo permiten, separar_fuentes.py. Compara diez segundos de mezcla y stems; documenta cualquier artefacto en lugar de ocultarlo.',
        commonErrors: [
          { error: 'Presentar el BPM estimado como una verdad absoluta.', correction: 'Valida con palmas, una rejilla del DAW o metrónomo y registra si el estimador escogió mitad/doble tempo.' },
          { error: 'Tratar stems como libres de derechos o idénticos a multitracks originales.', correction: 'Separa permiso del audio, licencia del modelo/pesos y autorización de uso del resultado.' },
          { error: 'Hacer de la separación un requisito imposible en un equipo sin recursos.', correction: 'Evalúa una alternativa justificada: documenta límites de hardware, omite el procesamiento pesado y realiza análisis sobre el audio autorizado.' },
        ],
        practice: 'Entrega el informe “Radiografía sonora” de 1–2 páginas con hipótesis, evidencia, limitación y recomendación de siguiente paso.',
        evidence: ['Tempo/onsets frente a validación humana.', 'Stems y bitácora de artefactos, si procede.', 'Informe y manifiesto con procedencia y hash.'],
      },
    ],
    lab: {
      title: 'Radiografía sonora de una canción',
      estimatedHours: '2–4 horas',
      purpose: 'Analizar una pista de 60–120 segundos sin confundir métricas de señal con conclusiones musicales no verificadas.',
      steps: [
        'Elige material propio, de dominio público o con autorización explícita; registra fuente, licencia/permiso, duración y canales.',
        'Ejecuta el laboratorio con parámetros guardados; genera forma de onda, STFT, mel, chroma, CSV, reporte JSON y manifest.',
        'Escucha el fragmento completo y marca un cambio de densidad, energía y textura con timestamp.',
        'Compara una zona de mayor RMS y una de mayor centroide; explica una hipótesis alternativa y cómo la comprobarías.',
        'Si se realiza separación, registra el modelo, versión y tres artefactos; no publiques stems sin revisar sus derechos.',
        'Escribe el informe y facilita el comando reproducible usado para producir los artefactos.',
      ],
      deliverables: [
        'Código ejecutable desde un entorno limpio y archivo de dependencias.',
        'caracteristicas_musicales.csv, reporte_analisis.json, manifest.json y gráficas.',
        'Informe de 1–2 páginas con mediciones, escucha, hipótesis y límites.',
        'Fuente/licencia/permiso documentados y hash SHA-256.',
        'Reflexión personal: qué observación cambió o refinó tu primera escucha.',
      ],
      acceptance: [
        'Todos los artefactos corresponden al mismo archivo y a los parámetros documentados.',
        'El CSV tiene timestamps alineados y valores numéricos finitos.',
        'Al menos cuatro conclusiones distinguen dato medido, escucha e inferencia.',
        'No se afirma que una característica aislada identifica instrumentos, acordes o calidad.',
        'La licencia/permiso de la fuente no está omitida.',
      ],
    },
    rubric: [
      { id: 'execution', name: 'Ejecución y reproducibilidad', weight: 20, evidence: 'Comando, dependencias, versiones, parámetros y artefactos vuelven a generarse.', excellence: 'Una tercera persona replica el análisis y obtiene columnas/figuras coherentes.' },
      { id: 'plots', name: 'Gráficas y unidades', weight: 15, evidence: 'Ejes, escalas, referencia, timestamps y configuración están identificados.', excellence: 'Cada gráfica responde a una pregunta concreta y se interpreta con su escala correcta.' },
      { id: 'spectral', name: 'Interpretación espectral', weight: 20, evidence: 'STFT/mel/chroma y características comparadas con escucha.', excellence: 'Relaciona patrones con marcas de tiempo, muestra alternativas y evita afirmaciones semánticas sin evidencia.' },
      { id: 'rhythm', name: 'Tempo y onsets', weight: 10, evidence: 'Estimación, contraste humano y posibles errores mitad/doble tempo.', excellence: 'Explica cuándo confiar, cuándo corregir y por qué.' },
      { id: 'separation', name: 'Separación y artefactos', weight: 15, evidence: 'Modelo/derechos/artefactos comparados con mezcla; o justificación de la omisión.', excellence: 'Evalúa sangrado y calidad de forma honesta sin convertir los stems en prueba legal.' },
      { id: 'report', name: 'Informe técnico', weight: 10, evidence: 'Método, resultados, limitaciones, conclusión y recomendación.', excellence: 'El informe enlaza cada conclusión con evidencia concreta y un próximo paso.' },
      { id: 'rights', name: 'Ética y trazabilidad', weight: 10, evidence: 'Fuente, permiso/licencia, hash y versiones documentadas.', excellence: 'Un revisor puede verificar procedencia y alcance declarado del permiso.' },
    ],
    codeFiles: [
      { path: 'laboratorio-audio-ia/src/analisis_musical.py', purpose: 'Carga, STFT, espectrograma mel, chroma, características, tempo/onsets, CSV, gráficas y manifiesto.' },
      { path: 'laboratorio-audio-ia/src/comparar_stft.py', purpose: 'Comparación visual de cuatro compromisos de resolución temporal/frecuencial.' },
      { path: 'laboratorio-audio-ia/src/separar_fuentes.py', purpose: 'Wrapper opcional de Demucs con validación de argumentos.' },
    ],
    references: [
      { label: 'Documentación oficial de librosa', url: 'https://librosa.org/doc/latest/' },
      { label: 'NumPy', url: 'https://numpy.org/doc/' },
      { label: 'SciPy', url: 'https://docs.scipy.org/doc/scipy/' },
      { label: 'Demucs — código y documentación', url: 'https://github.com/facebookresearch/demucs' },
    ],
  },
  {
    id: 'mastering',
    number: 2,
    title: 'Diagnóstico de mezcla y masterización',
    subtitle: 'Medir, intervenir, comparar y explicar una decisión de audio',
    level: 'Inicial–intermedio de producción con orientación técnica',
    estimatedHours: '5–7 horas',
    objective:
      'Diagnosticar una mezcla y comparar un master con datos reproducibles, controlando loudness, pico, espectro y coherencia estéreo según un destino declarado.',
    outcomes: [
      'Distinguir peak sample-based, RMS, LUFS integrados, crest factor y true peak, declarando el método y sus límites.',
      'Medir LUFS sin promediar a mono de forma que cancele los canales originales.',
      'Interpretar correlación estéreo sin usarla como una medida única de anchura.',
      'Justificar EQ y compresión a partir de una hipótesis auditiva y comparar versiones a nivel igualado.',
      'Elegir criterios de master según destino y evitar un único objetivo LUFS universal.',
    ],
    lessons: [
      {
        id: 'master-01',
        title: 'Peak, RMS, LUFS, crest factor y true peak',
        minutes: 45,
        objective: 'Leer las principales métricas y distinguir un estimador didáctico de una medición conforme.',
        concepts: [
          { heading: 'Peak y RMS', explanation: 'Peak sample-based recoge la muestra digital más alta; RMS describe energía media bajo una ventana/convención. No capturan por sí solos sonoridad percibida ni intención musical.' },
          { heading: 'LUFS integrados', explanation: 'La medición conforme a ITU-R BS.1770 usa ponderación y gating. Se calcula sobre los canales originales: convertir antes a una media mono puede producir cancelaciones y alterar la medición.' },
          { heading: 'True peak y crest factor', explanation: 'True peak busca picos de la señal reconstruida entre muestras y puede superar el peak sample-based. Una interpolación 4x es una estimación formativa, no certificación. Crest factor compara peak y RMS, pero no sustituye la escucha.' },
        ],
        demonstration: 'Ejecuta analisis_masterizacion.py sobre una mezcla de referencia autorizada y revisa peak, RMS, LUFS y la nota explícita sobre la estimación true peak.',
        commonErrors: [
          { error: 'Medir LUFS sobre la media aritmética L/R.', correction: 'Conserva los canales y pasa el array multicanal a un medidor compatible con el método elegido.' },
          { error: 'Llamar “true peak certificado” a una interpolación simple.', correction: 'Etiqueta el dato como estimación 4x y valida la entrega con un medidor conforme.' },
          { error: 'Suponer que crest factor alto o bajo significa calidad.', correction: 'Relaciona la métrica con género, envolvente, artefactos y escucha.' },
        ],
        practice: 'Genera el informe inicial de niveles. Anota qué conclusiones se pueden extraer y cuáles todavía requieren escuchar la mezcla.',
        evidence: ['Reporte JSON de nivel inicial.', 'Metadatos de canal/tasa/duración.', 'Explicación de cada métrica y su limitación.'],
      },
      {
        id: 'master-02',
        title: 'Enmascaramiento, EQ y balance espectral',
        minutes: 45,
        objective: 'Formular y comprobar una hipótesis de balance antes de mover un ecualizador.',
        concepts: [
          { heading: 'El espectro como pista', explanation: 'El espectro promedio ayuda a localizar regiones energéticas, pero no identifica por sí solo instrumento, enmascaramiento ni calidad. La interpretación depende de sección, arreglo y escucha.' },
          { heading: 'Bombo y bajo', explanation: 'El conflicto puede resolverse con EQ, envolvente, ritmo, automatización, arreglos o paneo. Un high-pass indiscriminado puede quitar cuerpo útil a guitarra, voz o pad.' },
          { heading: 'Comparar con nivel igualado', explanation: 'Cambios de EQ suelen alterar el volumen percibido. Iguala el nivel de escucha para no confundir “más fuerte” con “mejor” y conserva la mezcla original como versión A.' },
        ],
        demonstration: 'Registra una hipótesis con timestamp: fuente que enmascara, zona aproximada, solución esperada y cómo validarías el cambio. Guarda A intacta y B corregida.',
        commonErrors: [
          { error: 'Aplicar un corte por una regla fija de frecuencia sin escuchar.', correction: 'Identifica fuente y problema primero; elige la frecuencia según el material.' },
          { error: 'Confundir un centroide alto con una mezcla mejor.', correction: 'El centroide es una característica descriptiva; la decisión final depende de la intención y la escucha.' },
          { error: 'Comparar A/B con distinta sonoridad.', correction: 'Ajusta el nivel de monitorización o la compensación de escucha para una comparación justa.' },
        ],
        practice: 'Crea dos versiones con un solo cambio principal por versión y documenta la mejora y la regresión observadas.',
        evidence: ['Versiones originales y corregidas.', 'Hipótesis con timestamp.', 'Comparación auditiva a nivel igualado y parámetros de EQ guardados.'],
      },
      {
        id: 'master-03',
        title: 'Compresión, ataque, release, knee y transitorios',
        minutes: 50,
        objective: 'Describir cómo los parámetros de compresión cambian la envolvente y evaluar efectos secundarios.',
        concepts: [
          { heading: 'Threshold y ratio', explanation: 'Threshold define el nivel a partir del cual actúa el compresor; ratio define cuánto se comprime la parte que supera el umbral. Knee controla la transición alrededor del umbral.' },
          { heading: 'Attack y release', explanation: 'Attack define la rapidez para aproximarse a la reducción deseada y afecta transitorios; release controla la recuperación y puede generar bombeo o distorsión si resulta inadecuado para el tempo.' },
          { heading: 'Ganancia de seguridad', explanation: 'El script didáctico aplica reducción global si el pico supera el techo de muestras. No reemplaza un limitador verdadero ni controla garantizadamente los picos intersample.' },
        ],
        demonstration: 'Prueba una configuración suave y otra agresiva sobre el mismo audio; compara reducción de ganancia, transitorios, bombeo y nivel de salida.',
        commonErrors: [
          { error: 'Usar el compresor didáctico como masterizador profesional.', correction: 'Trátalo como instrumento de aprendizaje; valida un master final con herramientas profesionales y escucha crítica.' },
          { error: 'Añadir makeup gain hasta cortar la señal.', correction: 'Vigila peak y true peak; reduce ganancia o usa un limitador apropiado en el flujo final.' },
          { error: 'Escuchar solo la versión más fuerte.', correction: 'Iguala volumen y compara la forma de los transitorios y la intención del groove.' },
        ],
        practice: 'Genera tres versiones (suave, moderada, agresiva) y escribe qué cambió en la envolvente y qué efecto musical se pierde o se gana.',
        evidence: ['Tres conjuntos de parámetros.', 'Reporte de reducción de ganancia.', 'Comparación auditiva y selección justificada.'],
      },
      {
        id: 'master-04',
        title: 'Objetivos de entrega, loudness y comparación A/B',
        minutes: 50,
        objective: 'Definir una especificación de destino y decidir si el master cumple usando medidas, escucha y evidencia.',
        concepts: [
          { heading: 'No hay un objetivo LUFS universal', explanation: 'EBU R 128 aplica en su marco de radiodifusión; las plataformas musicales publican sus propias recomendaciones de reproducción. Define el destino, consulta especificaciones vigentes y no conviertas una normalización de playback en una obligación universal de masterización.' },
          { heading: 'Correlación estéreo', explanation: 'La correlación L/R describe similitud de canales. Valores negativos llaman a revisar fase/mono; valores cercanos a cero no significan automáticamente más anchura o mejor imagen.' },
          { heading: 'Exportación y trazabilidad', explanation: 'Registra formato, tasa, profundidad, loudness, método true-peak, procesadores y versión del archivo. Valida también el archivo después de conversión con pérdida cuando el destino lo requiera.' },
        ],
        demonstration: 'Ejecuta comparar_versiones.py. El gráfico de magnitud espectral cruda también refleja cambios de ganancia general; complementa con escucha A/B igualada y la ficha de destino.',
        commonErrors: [
          { error: 'Elegir -14 LUFS o -23 LUFS como ley universal.', correction: 'Especifica destino y distingue broadcast, reproducción normalizada y master de archivo.' },
          { error: 'Creer que correlación estéreo cercana a cero significa anchura ideal.', correction: 'Escucha en estéreo y mono, revisa fase y analiza el arreglo; la correlación aislada es insuficiente.' },
          { error: 'Entregar sin registrar la versión de origen o permisos.', correction: 'Conserva el original y el manifest, registra hash de la fuente y el destino del master.' },
        ],
        practice: 'Entrega el proyecto “Rescata una mezcla sin destruirla” con informe JSON, gráfica de diferencia, parámetros y defensa oral de tus decisiones.',
        evidence: ['Versión original, corrección y master.', 'Reporte de métricas y método de medición.', 'A/B igualada, hoja de destino y manifiesto de derechos.'],
      },
    ],
    lab: {
      title: 'Rescata una mezcla sin destruirla',
      estimatedHours: '4–6 horas',
      purpose: 'Diagnosticar una mezcla, corregir conflictos espectrales/dinámicos, decidir una versión final y demostrar el cambio con evidencia comparable.',
      steps: [
        'Elige una mezcla propia o autorizada; guarda una copia A intacta, fuente y licencia/permiso.',
        'Ejecuta el diagnóstico y anota peak, RMS, LUFS, true-peak estimado, crest factor, correlación L/R y alerta sample-based de clipping.',
        'Escucha la mezcla completa y plantea una hipótesis específica con timestamp antes de procesar.',
        'Crea versión B corrigiendo balance/EQ y, si aporta, una versión comprimida para estudiar la dinámica.',
        'Define el destino de C, documenta parámetros y mide/exporta el master sin perseguir un número de loudness universal.',
        'Compara A/C a volumen igualado; explica mejora, coste y limitaciones en el informe final.',
      ],
      deliverables: [
        'Mezcla A original, versión corregida y master para destino especificado.',
        'Reportes JSON, espectro promedio, espectrograma mel y gráfico de diferencia A/B.',
        'Capturas/ajustes de procesamiento y ficha de exportación.',
        'Informe técnico con hipótesis, decisiones, artefactos y límite de cada medición.',
        'Manifiesto de origen, licencia/permiso y versiones.',
      ],
      acceptance: [
        'El destino de entrega está declarado y la especificación se consultó en fuente vigente.',
        'LUFS se midió con el canalado correcto; true peak estimado está etiquetado como estimación.',
        'La correlación estéreo no se interpreta como medida de anchura por sí sola.',
        'La comparación A/B se escucha a nivel igualado y los cambios se documentan.',
        'No se detecta clipping audible; cualquier alerta métrica se investiga y registra.',
      ],
    },
    rubric: [
      { id: 'diagnosis', name: 'Diagnóstico técnico', weight: 20, evidence: 'Mediciones iniciales, hipótesis con marca temporal y limitaciones.', excellence: 'Relaciona cada medida con escucha y explica incertidumbre sin atribuir causalidad injustificada.' },
      { id: 'balance', name: 'EQ y balance', weight: 15, evidence: 'Cambios selectivos con parámetros y comparación A/B igualada.', excellence: 'Resuelve conflictos identificados sin cortes genéricos ni pérdida innecesaria de cuerpo.' },
      { id: 'dynamics', name: 'Dinámica y compresión', weight: 15, evidence: 'Threshold, ratio, attack, release, knee y ganancia de salida explicados.', excellence: 'Conserva transitorios/expresión y detecta bombeo, distorsión y efectos secundarios.' },
      { id: 'master', name: 'Masterización y destino', weight: 20, evidence: 'Destino de entrega, formato, peak/LUFS/true-peak y decisión final.', excellence: 'Cumple las especificaciones pertinentes, justifica dinámica y no persigue un LUFS universal.' },
      { id: 'ab', name: 'Comparación A/B', weight: 10, evidence: 'Original y master alineados en tiempo y volumen de escucha.', excellence: 'Distingue cambios globales de ganancia de cambios tonales y artísticos.' },
      { id: 'report', name: 'Documentación', weight: 10, evidence: 'Reportes, gráficos, parámetros, versiones y ficha de exportación.', excellence: 'Un tercero puede reconstruir la sesión y entender por qué se eligió la versión final.' },
      { id: 'rights', name: 'Trazabilidad y derechos', weight: 10, evidence: 'Origen, permiso/licencia, hash y datos del proceso.', excellence: 'No afirma derechos comerciales sin pruebas y mantiene trazabilidad completa.' },
    ],
    codeFiles: [
      { path: 'laboratorio-audio-ia/src/analisis_masterizacion.py', purpose: 'Niveles, LUFS multicanal, estimación true peak, espectro, correlación y clipping sample-based.' },
      { path: 'laboratorio-audio-ia/src/compresor_simple.py', purpose: 'Compresor formativo con soft-knee y ganancia de seguridad global; no es limitador profesional.' },
      { path: 'laboratorio-audio-ia/src/comparar_versiones.py', purpose: 'Comparación A/B de métricas y diferencia espectral.' },
    ],
    references: [
      { label: 'EBU R 128', url: 'https://tech.ebu.ch/publications/r128' },
      { label: 'EBU Tech 3343', url: 'https://tech.ebu.ch/docs/tech/tech3343.pdf' },
      { label: 'ITU-R BS.1770', url: 'https://www.itu.int/rec/R-REC-BS.1770' },
      { label: 'Spotify: normalización de loudness', url: 'https://support.spotify.com/artists/article/loudness-normalization/' },
      { label: 'pyloudnorm', url: 'https://github.com/csteinmetz1/pyloudnorm' },
    ],
  },
]

export function getAdvancedAudioModule(id: string): AdvancedAudioModule | undefined {
  return ADVANCED_AUDIO_MODULES.find((module) => module.id === id)
}

export const ADVANCED_AUDIO_ASSESSMENT = {
  questionCount: 20,
  passPercent: 80,
  masteryPercent: 85,
  estimateMinutes: 25,
  policy:
    'La evaluación teórica mide comprensión de conceptos. La práctica exige código, audio, gráficos e informe; la IA solo aporta retroalimentación provisional y no emite un grado oficial.',
} as const
