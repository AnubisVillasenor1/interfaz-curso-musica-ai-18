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

/**
 * Las seis competencias del programa M-AIGM.
 *
 * El orden del array es el orden del trayecto: DSP → mezcla/masterización →
 * generación → plugins/multiagente → gobernanza → sistema integrador. Se
 * conserva como lista cerrada porque el id viaja al examen, a la evaluación y
 * a los intentos guardados; una ruta o un id desconocido debe fallar cerrado.
 */
export const ADVANCED_AUDIO_MODULE_IDS = [
  'dsp',
  'mastering',
  'generative',
  'plugins',
  'governance',
  'capstone',
] as const

export type AdvancedAudioModuleId = (typeof ADVANCED_AUDIO_MODULE_IDS)[number]

export function isAdvancedAudioModuleId(value: unknown): value is AdvancedAudioModuleId {
  return typeof value === 'string' && (ADVANCED_AUDIO_MODULE_IDS as readonly string[]).includes(value)
}

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
  {
    id: 'generative',
    number: 3,
    title: 'IA generativa musical y control de modelos',
    subtitle: 'Dirigir la generación con parámetros, no consumirla a ciegas',
    level: 'Intermedio · requiere Módulos 1–2 o experiencia equivalente',
    estimatedHours: '6–8 horas',
    objective:
      'Diseñar y ejecutar experimentos de generación musical controlada, partiendo de MIDI editable y registrando prompts, semillas, parámetros y criterios de selección.',
    outcomes: [
      'Explicar difusión latente, VAE y espacio latente sin confundirlos con un transcriptor automático de música.',
      'Construir una composición base en MIDI y revisarla con análisis armónico contrastado por escucha.',
      'Diseñar experimentos A–E cambiando una sola variable por versión y registrando el entorno completo.',
      'Evaluar artefactos, coherencia y utilidad musical de cada variante con marcas de tiempo.',
      'Documentar prompts, semillas, parámetros, hashes y licencias para que otra persona pueda repetir el proceso.',
    ],
    lessons: [
      {
        id: 'gen-01',
        title: 'Difusión latente, VAE y espacio latente',
        minutes: 50,
        objective: 'Describir el pipeline generativo y distinguir qué controla el modelo de lo que decide la persona.',
        concepts: [
          { heading: 'Difusión y ruido', explanation: 'Un modelo de difusión aprende a invertir un proceso de ruido sobre una representación comprimida del audio. La calidad depende del modelo, los datos de entrenamiento, la duración y el condicionamiento; no es una síntesis determinista de una partitura.' },
          { heading: 'VAE y tasa real', explanation: 'El VAE comprime y reconstruye el audio. La salida debe exportarse con la tasa que declara el propio pipeline, no con una constante copiada de otro proyecto. Un desajuste de sample rate cambia el tempo y el timbre percibidos.' },
          { heading: 'Qué decide la persona', explanation: 'Prompt, negative prompt, semilla, pasos, guidance, duración y recorte son decisiones humanas. La selección final, la edición, el arreglo y la mezcla también. El modelo propone material; no firma la obra ni garantiza derechos.' },
        ],
        demonstration: 'Ejecuta una generación corta con el pipeline documentado y compara la tasa declarada por el VAE con la del WAV exportado. Anota la versión del modelo y del entorno.',
        commonErrors: [
          { error: 'Fijar 44.1 kHz a mano porque “es lo estándar”.', correction: 'Lee la tasa del pipeline y regístrala; si conviertes después, documenta el remuestreo.' },
          { error: 'Pedir una pieza de dos minutos en una sola llamada.', correction: 'Respeta el límite de duración del modelo y construye la duración final con fragmentos, edición y arreglo.' },
          { error: 'Tratar la primera generación como la versión definitiva.', correction: 'Genera variantes controladas y elige después de escuchar y documentar.' },
        ],
        practice: 'Escribe el diagrama del pipeline que usaste: entrada, condicionamiento, latente, decodificación, exportación y decisión humana. Señala dos puntos donde puede fallar la reproducibilidad.',
        evidence: ['Diagrama del pipeline.', 'Versión del modelo y de las librerías.', 'Tasa de muestreo real del WAV exportado.'],
      },
      {
        id: 'gen-02',
        title: 'Prompt, negative prompt, semilla, pasos y guidance',
        minutes: 55,
        objective: 'Diseñar un experimento reproducible con una sola variable modificada por versión.',
        concepts: [
          { heading: 'Prompt y negative prompt', explanation: 'El prompt describe el material deseado; el negative prompt intenta alejar características no deseadas. Ninguno de los dos es una orden determinista: el mismo texto puede producir resultados distintos según modelo, semilla y versión.' },
          { heading: 'Semilla y parámetros', explanation: 'La semilla controla la inicialización, no garantiza igualdad bit a bit entre hardware o versiones. Pasos y guidance modifican el compromiso entre adherencia al prompt, diversidad y coste computacional.' },
          { heading: 'Una variable por versión', explanation: 'Si cambias prompt, semilla y duración a la vez, no puedes atribuir la diferencia a nada. Fija una línea base A y modifica solo B, C, D y E. Registra todos los parámetros, incluidos los que no cambiaste.' },
        ],
        demonstration: 'Completa una matriz A–E con el mismo prompt base y cambia únicamente guidance en B, duración en C, instrumentación en D y atmósfera en E. Guarda el CSV antes de generar.',
        commonErrors: [
          { error: 'Cambiar tres parámetros y atribuir la mejora al primero.', correction: 'Una variable por versión y un diff explícito respecto a la línea base.' },
          { error: 'Llamar reproducible a una salida solo porque guardaste la semilla.', correction: 'Registra hardware, versiones, modelo, pasos, guidance, duración y tasa de muestreo.' },
          { error: 'Escribir en el negative prompt una lista infinita de defectos.', correction: 'Prioriza dos o tres características verificables y comprueba su efecto con escucha.' },
        ],
        practice: 'Genera las cinco variantes y registra para cada una el WAV, la configuración y una observación auditiva con marca de tiempo. No asignes una valoración antes de escuchar.',
        evidence: ['CSV de prompts y parámetros.', 'Cinco WAV identificables.', 'Reporte JSON generado por el script.'],
      },
      {
        id: 'gen-03',
        title: 'MIDI, armonía y edición musical con music21',
        minutes: 50,
        objective: 'Construir una base editable y contrastar el análisis armónico automático con la escucha.',
        concepts: [
          { heading: 'MIDI como representación editable', explanation: 'El MIDI guarda eventos de altura, duración, velocidad y tempo. No contiene audio ni garantiza que el resultado suene bien. Su valor es permitir corregir notas, registro y estructura sin depender del generador.' },
          { heading: 'Análisis armónico', explanation: 'music21 puede estimar tonalidad y acordes, pero inversiones, notas de paso, tensiones y mezclas densas producen ambigüedad. El análisis es una hipótesis que se contrasta con la partitura, el DAW y el oído.' },
          { heading: 'Integración con material generado', explanation: 'Una textura generada puede entrar en un compás concreto, recortarse, filtrarse y automatizarse. La decisión de arreglo es humana y debe quedar registrada junto al archivo fuente y su licencia.' },
        ],
        demonstration: 'Genera un MIDI base de 16 compases, analiza su armonía y marca dos puntos donde la estimación automática no coincide con tu lectura.',
        commonErrors: [
          { error: 'Presentar la tonalidad estimada como verdad absoluta.', correction: 'Escribe la estimación, la lectura alternativa y la evidencia que la sostiene.' },
          { error: 'Entregar solo el render final sin MIDI editable.', correction: 'Conserva composicion_base.mid y composicion_revisada.mid con los cambios explicados.' },
          { error: 'Usar una textura generada sin comprobar su licencia.', correction: 'Separa licencia del modelo, del servicio y de los materiales de entrada; documéntalas.' },
        ],
        practice: 'Compara una progresión de tu MIDI con el análisis automático y escribe qué función armónica cumple cada acorde en la sección que estás trabajando.',
        evidence: ['MIDI base y revisado.', 'Análisis armónico exportado.', 'Nota de contraste entre estimación y escucha.'],
      },
      {
        id: 'gen-04',
        title: 'Evaluación crítica, artefactos y criterio de descarte',
        minutes: 50,
        objective: 'Elegir una variante con evidencia y justificar por qué se descartan las demás.',
        concepts: [
          { heading: 'Artefactos frecuentes', explanation: 'Costuras entre fragmentos, transitorios suavizados, voces metálicas, colas que no cierran y cambios bruscos de textura son señales para revisar. No todo defecto se corrige regenerando: a veces se edita o se cambia el arreglo.' },
          { heading: 'Escucha comparada', explanation: 'Normaliza el volumen antes de comparar. Una variante más fuerte tiende a parecer mejor. Usa marcas de tiempo y describe el defecto antes de proponer la corrección.' },
          { heading: 'Criterio de descarte', explanation: 'Documenta qué no funcionó, dónde se escucha y qué harías distinto. Un descarte argumentado demuestra más criterio que conservar cinco versiones sin explicación.' },
        ],
        demonstration: 'Escucha las cinco variantes completas, normaliza el nivel de comparación y completa una tabla con defecto, marca de tiempo, causa probable y decisión.',
        commonErrors: [
          { error: 'Elegir la versión más fuerte como la mejor.', correction: 'Iguala el volumen de escucha antes de comparar.' },
          { error: 'Describir un defecto que no se ha escuchado.', correction: 'Toda observación auditiva necesita marca de tiempo y archivo identificado.' },
          { error: 'Corregir todos los defectos a la vez.', correction: 'Elige una corrección principal por iteración para aprender qué variable la produjo.' },
        ],
        practice: 'Entrega una tabla de decisión con la variante elegida, dos descartadas y la evidencia de cada veredicto.',
        evidence: ['Tabla de evaluación con marcas de tiempo.', 'Variante elegida y dos descartes argumentados.', 'Una corrección concreta para la siguiente iteración.'],
      },
    ],
    lab: {
      title: 'Cinco variantes, una variable por versión',
      estimatedHours: '3–5 horas',
      purpose: 'Producir una base MIDI editable y cinco variantes generadas comparables, eligiendo una con evidencia y trazabilidad completa.',
      steps: [
        'Define intención, emoción, tonalidad, tempo, instrumentación y estructura antes de generar.',
        'Construye el MIDI base con acordes, bajo, melodía y percusión; guarda una revisión separada.',
        'Completa el CSV A–E con una sola variable modificada por versión y revisa los parámetros.',
        'Ejecuta las generaciones y registra modelo, versión, entorno, semilla, pasos, guidance y tasa real.',
        'Escucha a volumen igualado, documenta artefactos con marcas de tiempo y elige una variante.',
        'Integra la variante con el MIDI, exporta la demo, calcula hashes y completa licencias y metadatos.',
      ],
      deliverables: [
        'Ficha creativa con intención, estructura y decisiones previas.',
        'composicion_base.mid y composicion_revisada.mid.',
        'CSV de prompts y cinco WAV con configuración registrada.',
        'Análisis armónico y reporte JSON de generación.',
        'Demo integrada, manifiesto de procedencia e informe de selección.',
      ],
      acceptance: [
        'Cada comparación cambia una sola variable respecto a la línea base.',
        'La tasa de muestreo y la versión del modelo están registradas.',
        'Las observaciones auditivas tienen archivo y marca de tiempo.',
        'La variante elegida se justifica con evidencia, no con adjetivos.',
        'Licencias, fuentes y hashes están documentados.',
      ],
    },
    rubric: [
      { id: 'intent', name: 'Intención y estructura', weight: 15, evidence: 'Ficha previa con emoción, narrativa, forma y función de cada sección.', excellence: 'La estructura se reconoce al escuchar y cada sección cumple una función distinta.' },
      { id: 'control', name: 'Control generativo', weight: 20, evidence: 'Prompts, negative prompt, semilla, pasos, guidance y cinco variantes comparables.', excellence: 'Atribuye cada diferencia audible a la variable modificada y reconoce la incertidumbre.' },
      { id: 'midi', name: 'MIDI y armonía', weight: 15, evidence: 'MIDI editable, análisis armónico y contraste con la escucha.', excellence: 'Corrige la estimación cuando no coincide y explica la función armónica.' },
      { id: 'evaluation', name: 'Escucha crítica y artefactos', weight: 20, evidence: 'Tabla con marcas de tiempo, defectos, causa probable y decisión.', excellence: 'Distingue defecto de estilo y elige una corrección principal por iteración.' },
      { id: 'reproducibility', name: 'Reproducibilidad', weight: 15, evidence: 'Entorno, versiones, parámetros, comandos y reportes.', excellence: 'Otra persona reproduce el experimento y obtiene resultados comparables.' },
      { id: 'ethics', name: 'Licencias y procedencia', weight: 10, evidence: 'Fuentes, licencia del modelo y de los materiales, hash y autoría declarada.', excellence: 'Separa aporte humano, generado y procesado sin presumir derechos.' },
      { id: 'report', name: 'Informe y defensa', weight: 5, evidence: 'Informe breve con método, resultados, límites y siguiente paso.', excellence: 'Defiende la selección con evidencia y responde preguntas sin inventar datos.' },
    ],
    codeFiles: [
      { path: 'laboratorio-audio-ia/modulo_3_ia/src/generate_midi.py', purpose: 'Genera un MIDI editable multipista con progresión, bajo, melodía y percusión.' },
      { path: 'laboratorio-audio-ia/modulo_3_ia/src/run_experiments.py', purpose: 'Ejecuta el CSV de variantes A–E y produce WAV más reportes JSON.' },
      { path: 'laboratorio-audio-ia/modulo_3_ia/src/evaluate_audio.py', purpose: 'Mide propiedades objetivas de una versión sin inventar valoraciones musicales.' },
      { path: 'laboratorio-audio-ia/modulo_3_ia/src/metadata.py', purpose: 'Construye metadatos de procedencia con hash SHA-256.' },
      { path: 'docs/laboratorio-avanzado/MODULO-03.md', purpose: 'Guía del módulo, entregables y límites del modelo generativo.' },
    ],
    references: [
      { label: 'Diffusers: Stable Audio', url: 'https://huggingface.co/docs/diffusers/main/en/api/pipelines/stable_audio' },
      { label: 'Stable Audio: latent audio diffusion', url: 'https://arxiv.org/abs/2404.04610' },
      { label: 'music21 documentation', url: 'https://web.mit.edu/music21/doc/' },
      { label: 'pretty_midi documentation', url: 'https://craffel.github.io/pretty-midi/' },
    ],
  },
  {
    id: 'plugins',
    number: 4,
    title: 'Plugins de audio y sistemas multiagente',
    subtitle: 'Llevar la inferencia al DAW y orquestar agentes con límites',
    level: 'Avanzado · C++/Python y fundamentos de audio en tiempo real',
    estimatedHours: '7–9 horas',
    objective:
      'Diseñar un plugin VST3/CLAP con procesamiento en tiempo real y un orquestador multiagente verificable, midiendo latencia, presupuesto de CPU y puntos de fallo.',
    outcomes: [
      'Explicar el ciclo de vida de un plugin VST3/CLAP y el hilo de audio en tiempo real.',
      'Calcular el presupuesto de latencia y CPU para un tamaño de bloque y una tasa de muestreo dados.',
      'Decidir qué inferencia puede ejecutarse localmente y qué debe salir a un servicio externo.',
      'Diseñar un pipeline de agentes con roles, dependencias, trazas y parada ante error.',
      'Documentar límites de latencia, compatibilidad y fallos sin prometer tiempo real absoluto.',
    ],
    lessons: [
      {
        id: 'plug-01',
        title: 'Arquitectura VST3/CLAP, JUCE y ciclo de audio',
        minutes: 55,
        objective: 'Ubicar el procesamiento de un plugin dentro del ciclo del host y separar hilo de audio de hilo de interfaz.',
        concepts: [
          { heading: 'Formatos y host', explanation: 'VST3 y CLAP son formatos de plugin; JUCE es un framework que puede generar ambos. El host entrega buffers y llama al procesamiento con un tamaño de bloque variable. El plugin no controla el reloj del host.' },
          { heading: 'Hilo de audio', explanation: 'El callback de audio debe evitar asignaciones de memoria, bloqueos, acceso a disco y esperas de red. La inferencia pesada se prepara fuera del hilo de audio o se ejecuta en un worker con buffers preasignados.' },
          { heading: 'Estado y parámetros', explanation: 'Los parámetros deben declararse, automatizarse y persistirse. Un cambio de estado no puede provocar un salto audible ni una condición de carrera con el hilo de audio.' },
        ],
        demonstration: 'Dibuja el ciclo host → callback → procesamiento → salida y marca dónde vive cada hilo. Identifica tres operaciones prohibidas dentro del callback.',
        commonErrors: [
          { error: 'Cargar un modelo ONNX dentro del callback de audio.', correction: 'Carga y prepara el modelo al inicializar o en un worker; el callback solo consume buffers listos.' },
          { error: 'Reservar memoria en cada bloque.', correction: 'Preasigna buffers y evita estructuras dinámicas en el camino de audio.' },
          { error: 'Asumir un tamaño de bloque fijo.', correction: 'Consulta el tamaño real y procesa por bloques internos si el host lo cambia.' },
        ],
        practice: 'Escribe un diagrama de hilos y una lista de operaciones permitidas y prohibidas en el callback de audio.',
        evidence: ['Diagrama de hilos.', 'Lista de operaciones prohibidas.', 'Decisión sobre dónde cargar el modelo.'],
      },
      {
        id: 'plug-02',
        title: 'Buffers, latencia y presupuesto en tiempo real',
        minutes: 50,
        objective: 'Calcular si un procesamiento cabe en el plazo de un bloque y cuánta latencia añade.',
        concepts: [
          { heading: 'Duración de bloque', explanation: 'Un bloque de 128 muestras a 48 kHz dura 2.67 ms. Ese es el plazo máximo para producir la salida de ese bloque si no se quiere acumular retraso. Con 512 muestras el plazo sube a 10.67 ms, pero la latencia también.' },
          { heading: 'Latencia y buffering', explanation: 'La latencia total incluye el búfer del host, el del dispositivo y el del plugin. Un presupuesto de dos bloques no significa que el procesamiento tarde dos bloques: significa que el retraso introducido es mayor. Mide siempre en el sistema real.' },
          { heading: 'Margen y utilización', explanation: 'La utilización es el tiempo de proceso dividido entre la duración del bloque. Cerca del 100 % no hay margen para picos del sistema operativo. Un presupuesto formativo debe dejar holgura y declarar el hardware.' },
        ],
        demonstration: 'Ejecuta presupuesto_latencia.py con 128, 256 y 512 muestras a 44.1 y 48 kHz. Compara el plazo, la latencia y el margen para un proceso de 1.5 ms.',
        commonErrors: [
          { error: 'Confundir duración de bloque con latencia total.', correction: 'Distingue plazo de proceso, búfer del host y retardo acumulado.' },
          { error: 'Ignorar el peor caso del sistema operativo.', correction: 'Deja margen y prueba en el hardware de destino.' },
          { error: 'Prometer “latencia cero”.', correction: 'Declara la latencia medida y el contexto de medición.' },
        ],
        practice: 'Calcula el presupuesto para tu interfaz y tamaño de bloque habitual; escribe qué proceso cabe y cuál debe externalizarse.',
        evidence: ['Tabla de presupuestos.', 'Medición o cálculo de latencia.', 'Decisión de qué inferencia va fuera del callback.'],
      },
      {
        id: 'plug-03',
        title: 'ONNX Runtime e inferencia local',
        minutes: 55,
        objective: 'Integrar un modelo local sin bloquear el hilo de audio y validar su compatibilidad.',
        concepts: [
          { heading: 'ONNX Runtime', explanation: 'ONNX Runtime ejecuta modelos exportados a un formato interoperable. La latencia depende del modelo, del hardware, de la precisión y del tamaño de entrada. No todos los operadores ni modelos son compatibles con todos los proveedores de ejecución.' },
          { heading: 'Precisión y memoria', explanation: 'FP32, FP16 e int8 cambian velocidad, memoria y calidad. Una cuantización agresiva puede introducir artefactos. Valida con audio real y mide, no supongas.' },
          { heading: 'Fallback y degradación', explanation: 'Si el modelo no carga o excede el presupuesto, el plugin debe degradar a un procesamiento seguro y avisar. Un fallo silencioso o un bloqueo del host es peor que una función desactivada.' },
        ],
        demonstration: 'Diseña la carga del modelo, el buffer de entrada, el worker y el fallback. Ejecuta una prueba con un modelo pequeño o simulado y registra latencia y uso de memoria.',
        commonErrors: [
          { error: 'Ejecutar inferencia síncrona en el callback.', correction: 'Usa un worker con doble buffer y un fallback determinista.' },
          { error: 'Elegir int8 solo por velocidad.', correction: 'Compara calidad y latencia con material real antes de decidir.' },
          { error: 'Ocultar que el modelo no cargó.', correction: 'Expón el estado y degrada de forma explícita.' },
        ],
        practice: 'Documenta el modelo, la precisión, el proveedor de ejecución, la latencia medida y el fallback.',
        evidence: ['Ficha del modelo y precisión.', 'Medición de latencia y memoria.', 'Prueba del fallback con el modelo ausente.'],
      },
      {
        id: 'plug-04',
        title: 'Agentes especializados y orquestación verificable',
        minutes: 50,
        objective: 'Diseñar un pipeline multiagente con roles, dependencias y trazas auditables.',
        concepts: [
          { heading: 'Roles y contrato', explanation: 'Cada agente debe tener un rol acotado, entradas declaradas y salidas verificables. Un agente que puede hacer cualquier cosa no es un sistema, es un riesgo.' },
          { heading: 'Dependencias y orden', explanation: 'La generación no puede ejecutarse antes del análisis si depende de sus artefactos. El orquestador valida dependencias, detecta salidas faltantes y se detiene ante error en lugar de continuar con datos incompletos.' },
          { heading: 'Trazas y reproducibilidad', explanation: 'Registra qué rol ejecutó, con qué entradas, qué produjo y cuánto tardó. La traza permite auditar y repetir. No guardes secretos ni prompts privados en registros públicos.' },
        ],
        demonstration: 'Ejecuta orquestador_agentes.py con un pipeline de análisis → generación → mezcla → gobernanza. Fuerza la ausencia de una dependencia y revisa la traza de error.',
        commonErrors: [
          { error: 'Permitir que cualquier agente invoque a cualquier otro sin contrato.', correction: 'Define roles, entradas y salidas; valida en el orquestador.' },
          { error: 'Continuar tras un error con artefactos vacíos.', correction: 'Detén el pipeline y devuelve la traza con el paso fallido.' },
          { error: 'Registrar la clave del proveedor en la traza.', correction: 'Redacta secretos y guarda solo identificadores de configuración.' },
        ],
        practice: 'Diseña un pipeline de cuatro roles para tu proyecto y entrega el plan, la traza de una ejecución correcta y la de una fallida.',
        evidence: ['Plan de roles y dependencias.', 'Traza de ejecución correcta.', 'Traza de fallo con el paso identificado.'],
      },
    ],
    lab: {
      title: 'Presupuesto de latencia y orquestador reproducible',
      estimatedHours: '4–6 horas',
      purpose: 'Demostrar con cálculos y una traza que el sistema puede operar dentro de límites declarados y degradar sin bloquearse.',
      steps: [
        'Define el hardware, la interfaz, la tasa y el tamaño de bloque de destino.',
        'Calcula plazo, latencia y utilización para el procesamiento previsto.',
        'Decide qué parte corre en el callback y qué parte en un worker o servicio externo.',
        'Diseña el pipeline de agentes con roles, dependencias y salidas verificables.',
        'Ejecuta una prueba correcta y una prueba con dependencia ausente; conserva ambas trazas.',
        'Escribe el informe con límites, fallback, riesgos y siguiente medición pendiente.',
      ],
      deliverables: [
        'Tabla de presupuesto de latencia con hardware y parámetros.',
        'Diagrama de hilos y decisión de inferencia local/externa.',
        'Plan del pipeline multiagente y dos trazas de ejecución.',
        'Prueba del fallback y del error controlado.',
        'Informe con límites y riesgos.',
      ],
      acceptance: [
        'La latencia se declara como medida o calculada, no como cero.',
        'El callback de audio no contiene inferencia bloqueante.',
        'El pipeline se detiene ante una dependencia ausente.',
        'Las trazas no contienen secretos.',
        'El fallback está probado y documentado.',
      ],
    },
    rubric: [
      { id: 'architecture', name: 'Arquitectura de plugin', weight: 15, evidence: 'Ciclo de audio, hilos, estado y parámetros documentados.', excellence: 'Separa con claridad callback, worker e interfaz sin condiciones de carrera.' },
      { id: 'realtime', name: 'Tiempo real y latencia', weight: 20, evidence: 'Cálculo de plazo, latencia, utilización y margen.', excellence: 'Mide en hardware real y declara el peor caso con holgura.' },
      { id: 'inference', name: 'Inferencia local', weight: 15, evidence: 'Modelo, precisión, proveedor, memoria y latencia.', excellence: 'Valida calidad y velocidad con material real y justifica el compromiso.' },
      { id: 'orchestration', name: 'Orquestación multiagente', weight: 15, evidence: 'Roles, dependencias, salidas y trazas.', excellence: 'El pipeline falla cerrado y la traza permite reconstruir la ejecución.' },
      { id: 'testing', name: 'Pruebas y fallback', weight: 15, evidence: 'Prueba correcta, dependencia ausente y modelo no disponible.', excellence: 'Cada fallo tiene una degradación explícita y verificable.' },
      { id: 'deployment', name: 'Empaquetado y compatibilidad', weight: 10, evidence: 'Formato, versión, instalación y limitaciones del host.', excellence: 'Documenta compatibilidad y reproduce la instalación en un entorno limpio.' },
      { id: 'docs', name: 'Documentación y ética', weight: 10, evidence: 'Límites, licencias, seguridad y riesgos declarados.', excellence: 'Un tercero entiende qué hace, qué no hace y cómo verificarlo.' },
    ],
    codeFiles: [
      { path: 'laboratorio-audio-ia/src/presupuesto_latencia.py', purpose: 'Calcula duración de bloque, latencia, utilización y margen de tiempo real.' },
      { path: 'laboratorio-audio-ia/src/orquestador_agentes.py', purpose: 'Valida roles y dependencias y ejecuta un pipeline con traza y parada ante error.' },
      { path: 'laboratorio-audio-ia/tests/test_gobernanza_y_sistemas.py', purpose: 'Pruebas de presupuesto, orquestación, manifiestos y checklist.' },
      { path: 'docs/laboratorio-avanzado/MODULO-04.md', purpose: 'Guía de arquitectura, latencia, inferencia local y multiagente.' },
    ],
    references: [
      { label: 'JUCE', url: 'https://juce.com/' },
      { label: 'VST 3 SDK', url: 'https://github.com/steinbergmedia/vst3sdk' },
      { label: 'CLAP', url: 'https://cleveraudio.org/' },
      { label: 'ONNX Runtime', url: 'https://onnxruntime.ai/docs/' },
      { label: 'FastAPI: WebSockets', url: 'https://fastapi.tiangolo.com/advanced/websockets/' },
    ],
  },
  {
    id: 'governance',
    number: 5,
    title: 'Trazabilidad, derechos y gobernanza de IA',
    subtitle: 'Demostrar procedencia sin prometer derechos que no existen',
    level: 'Intermedio–avanzado · transversal a todos los módulos',
    estimatedHours: '4–6 horas',
    objective:
      'Construir un expediente de procedencia verificable para activos musicales generados o procesados, evaluando licencias, riesgos y obligaciones de transparencia.',
    outcomes: [
      'Distinguir licencia del modelo, licencia del servicio y derechos sobre el audio de entrada.',
      'Construir un manifiesto de procedencia con autoría humana, prompts, modelo, versión y hashes.',
      'Explicar qué demuestra y qué no demuestra un hash, una marca de agua o un fingerprint.',
      'Identificar riesgos de contenido sintético y obligaciones de transparencia aplicables.',
      'Documentar un expediente que otra persona pueda auditar sin acceso a la sesión original.',
    ],
    lessons: [
      {
        id: 'gov-01',
        title: 'Licencias de datos, modelos y pesos',
        minutes: 45,
        objective: 'Separar las licencias que intervienen en una obra generada y detectar promesas sin respaldo.',
        concepts: [
          { heading: 'Tres capas de licencia', explanation: 'El audio de entrada, el modelo o los pesos y el servicio de inferencia pueden tener licencias distintas. Una licencia permisiva del código no concede automáticamente derechos sobre los pesos o sobre el audio generado.' },
          { heading: 'Uso comercial', explanation: '“Open source” no significa “uso comercial sin condiciones”. Revisa la licencia exacta, la versión y las obligaciones de atribución o compartición. Guarda una copia de la licencia vigente en la fecha de uso.' },
          { heading: 'Material de entrada', explanation: 'Subir una canción ajena a un separador o generador no crea un derecho nuevo. La procedencia del audio de entrada se documenta aparte de la del modelo.' },
        ],
        demonstration: 'Toma un modelo y un servicio que uses y completa una tabla con licencia, versión, uso comercial, atribución y fuente consultada.',
        commonErrors: [
          { error: 'Suponer que el modelo es libre porque el repositorio lo es.', correction: 'Revisa la licencia de los pesos y del servicio por separado.' },
          { error: 'Declarar autoría total sobre una obra generada.', correction: 'Describe qué aportó el modelo, qué decidió la persona y qué se procesó después.' },
          { error: 'Usar audio de referencia sin permiso.', correction: 'Documenta fuente, licencia o autorización antes de procesarlo.' },
        ],
        practice: 'Completa una matriz de licencias para tu proyecto y marca cada casilla con fuente y fecha de consulta.',
        evidence: ['Matriz de licencias.', 'Copias o enlaces de las licencias consultadas.', 'Declaración de autoría humana y aporte generado.'],
      },
      {
        id: 'gov-02',
        title: 'Hashes, metadatos y manifiestos de procedencia',
        minutes: 45,
        objective: 'Construir un manifiesto que identifique el archivo y documente su cadena de decisiones.',
        concepts: [
          { heading: 'Hash SHA-256', explanation: 'El hash identifica un archivo y permite comprobar integridad. No prueba autoría, titularidad ni licencia. Si el archivo cambia, el hash cambia.' },
          { heading: 'Metadatos útiles', explanation: 'Título, autor humano, modelo, versión, prompt, negative prompt, semilla, parámetros, fecha, tasa de muestreo, fuentes y licencia. Un manifiesto mínimo debe permitir reconstruir la cadena.' },
          { heading: 'Cadena de custodia', explanation: 'Registra también las transformaciones posteriores: edición, mezcla, masterización y conversión. Un manifiesto que solo cubre el render inicial no explica el archivo final.' },
        ],
        demonstration: 'Ejecuta manifiesto_procedencia.py sobre un WAV propio y revisa los campos obligatorios, el hash y los errores que produce un manifiesto incompleto.',
        commonErrors: [
          { error: 'Creer que el hash demuestra derechos.', correction: 'El hash demuestra integridad; la licencia y la autoría se documentan aparte.' },
          { error: 'Guardar solo el prompt y olvidar la versión del modelo.', correction: 'Registra modelo, revisión, entorno y parámetros.' },
          { error: 'Actualizar el archivo sin actualizar el manifiesto.', correction: 'Recalcula el hash y registra la nueva versión.' },
        ],
        practice: 'Genera el manifiesto de tu demo final y de una versión anterior; compara hashes y explica qué cambió.',
        evidence: ['Manifiesto JSON validado.', 'Hash de la demo y de una versión previa.', 'Registro de transformaciones posteriores.'],
      },
      {
        id: 'gov-03',
        title: 'Watermarking, fingerprinting y límites técnicos',
        minutes: 45,
        objective: 'Evaluar qué puede y qué no puede demostrar una marca de agua o una huella acústica.',
        concepts: [
          { heading: 'Marca de agua', explanation: 'Una marca de agua inserta una señal robusta o perceptible para identificar procedencia. Puede degradarse con compresión, recorte o remezcla, y no sustituye un contrato de licencia.' },
          { heading: 'Fingerprint', explanation: 'Una huella acústica identifica una grabación por sus características. Sirve para detectar coincidencias, pero no prueba quién es el titular ni autoriza un uso.' },
          { heading: 'Transparencia', explanation: 'Declarar que un contenido es sintético es una obligación creciente en varios marcos. La obligación exacta depende de jurisdicción, contexto y tipo de contenido; no inventes una regla universal.' },
        ],
        demonstration: 'Aplica una marca de agua de prueba a un fragmento y comprueba si sobrevive a una conversión con pérdida. Documenta el resultado sin afirmar que es inviolable.',
        commonErrors: [
          { error: 'Prometer que una marca de agua es irrompible.', correction: 'Declara el método, la robustez observada y sus límites.' },
          { error: 'Confundir fingerprint con titularidad.', correction: 'La huella identifica una grabación; los derechos se prueban con licencia o contrato.' },
          { error: 'Omitir la declaración de contenido sintético.', correction: 'Añade la declaración y consulta la obligación aplicable a tu jurisdicción.' },
        ],
        practice: 'Escribe una ficha de transparencia para tu obra: qué es sintético, qué es humano, qué se procesó y qué marca o metadato se aplicó.',
        evidence: ['Ficha de transparencia.', 'Prueba de robustez de la marca, si se aplicó.', 'Declaración de límites del método.'],
      },
      {
        id: 'gov-04',
        title: 'Riesgos, auditoría y gestión responsable',
        minutes: 45,
        objective: 'Identificar riesgos técnicos, legales y de derechos y proponer mitigaciones verificables.',
        concepts: [
          { heading: 'Mapa de riesgos', explanation: 'Riesgos de calidad, sesgo, suplantación, derechos, privacidad y seguridad. Cada riesgo necesita probabilidad, impacto, mitigación y responsable; una lista sin mitigación es decorativa.' },
          { heading: 'Auditoría', explanation: 'Una auditoría revisa evidencia: manifiestos, licencias, registros de acceso, pruebas y decisiones. No se limita a preguntar si el sistema “es ético”.' },
          { heading: 'Marco NIST AI RMF', explanation: 'El marco NIST organiza funciones de gobernar, mapear, medir y gestionar riesgos de IA. Es una guía de proceso, no una certificación automática ni una garantía legal.' },
        ],
        demonstration: 'Construye una matriz de cinco riesgos con mitigación y evidencia de verificación. Marca cuáles siguen abiertos.',
        commonErrors: [
          { error: 'Presentar una política sin evidencia de aplicación.', correction: 'Añade registros, pruebas y responsables.' },
          { error: 'Copiar un marco legal sin adaptarlo al contexto.', correction: 'Explica jurisdicción, tipo de contenido y obligación aplicable.' },
          { error: 'Cerrar un riesgo con una afirmación sin prueba.', correction: 'Define la evidencia que demostraría la mitigación.' },
        ],
        practice: 'Entrega una matriz de riesgos con una mitigación abierta y un plan para verificarla.',
        evidence: ['Matriz de riesgos.', 'Evidencia de mitigaciones aplicadas.', 'Riesgos abiertos y siguiente revisión.'],
      },
    ],
    lab: {
      title: 'Expediente de procedencia de una obra',
      estimatedHours: '2–4 horas',
      purpose: 'Reunir licencias, manifiesto, hashes, declaración de transparencia y matriz de riesgos de una obra del estudiante.',
      steps: [
        'Identifica todas las capas de licencia y guarda la fuente y fecha de consulta.',
        'Construye el manifiesto de procedencia y valida los campos obligatorios.',
        'Calcula hashes de la demo y de una versión anterior; registra las transformaciones.',
        'Añade la ficha de transparencia y, si aplica, la prueba de marca de agua.',
        'Completa la matriz de riesgos con evidencia y responsables.',
        'Revisa el expediente como si fueras un auditor externo sin acceso a tu sesión.',
      ],
      deliverables: [
        'Matriz de licencias con fuente y fecha.',
        'Manifiesto JSON validado y hashes.',
        'Ficha de transparencia de contenido sintético.',
        'Matriz de riesgos con mitigaciones y evidencia.',
        'Informe de auditoría breve con riesgos abiertos.',
      ],
      acceptance: [
        'Se distinguen licencia del modelo, del servicio y del audio de entrada.',
        'El manifiesto incluye todos los campos obligatorios.',
        'El hash corresponde al archivo entregado.',
        'La declaración de transparencia no exagera ni oculta el aporte de IA.',
        'Los riesgos abiertos están declarados y no se presentan como resueltos.',
      ],
    },
    rubric: [
      { id: 'licenses', name: 'Licencias', weight: 20, evidence: 'Matriz con capas, versión, uso comercial, atribución y fuente.', excellence: 'Detecta incompatibilidades y no presume permisos.' },
      { id: 'metadata', name: 'Manifiesto y metadatos', weight: 20, evidence: 'Campos obligatorios, versión del modelo, parámetros, hashes y transformaciones.', excellence: 'La cadena completa permite auditar el archivo final.' },
      { id: 'watermark', name: 'Marca y fingerprint', weight: 15, evidence: 'Método, robustez observada y límites declarados.', excellence: 'Distingue identificación técnica de titularidad legal.' },
      { id: 'risk', name: 'Riesgos y mitigación', weight: 15, evidence: 'Matriz con impacto, probabilidad, mitigación y evidencia.', excellence: 'Los riesgos abiertos tienen plan y responsable.' },
      { id: 'audit', name: 'Auditoría', weight: 15, evidence: 'Expediente revisable por un tercero sin la sesión original.', excellence: 'Encuentra y corrige una laguna antes de la entrega.' },
      { id: 'transparency', name: 'Transparencia', weight: 10, evidence: 'Declaración de contenido sintético y aporte humano.', excellence: 'La declaración es precisa, verificable y proporcionada.' },
      { id: 'honesty', name: 'Honestidad técnica', weight: 5, evidence: 'No se exagera lo que el hash, la marca o el marco legal demuestran.', excellence: 'Expresa incertidumbre y límites con claridad.' },
    ],
    codeFiles: [
      { path: 'laboratorio-audio-ia/src/manifiesto_procedencia.py', purpose: 'Calcula SHA-256 y valida campos obligatorios de un manifiesto de procedencia.' },
      { path: 'laboratorio-audio-ia/tests/test_gobernanza_y_sistemas.py', purpose: 'Pruebas de manifiesto, hash, presupuesto y checklist.' },
      { path: 'docs/laboratorio-avanzado/MODULO-05.md', purpose: 'Guía de licencias, metadatos, marcas de agua, riesgos y auditoría.' },
    ],
    references: [
      { label: 'NIST AI Risk Management Framework', url: 'https://www.nist.gov/itl/ai-risk-management-framework' },
      { label: 'EU AI Act: transparencia (art. 50)', url: 'https://artificialintelligenceact.eu/article/50/' },
      { label: 'C2PA specifications', url: 'https://c2pa.org/specifications/' },
      { label: 'Creative Commons licenses', url: 'https://creativecommons.org/licenses/' },
    ],
  },
  {
    id: 'capstone',
    number: 6,
    title: 'Sistema integrador de producción musical',
    subtitle: 'Del análisis al despliegue: un estudio reproducible',
    level: 'Avanzado · integra los cinco módulos anteriores',
    estimatedHours: '12–16 horas',
    objective:
      'Integrar análisis, generación, mezcla, plugin, gobernanza y despliegue en un sistema documentado, probado y operable, con límites y riesgos declarados.',
    outcomes: [
      'Diseñar la arquitectura y los contratos de datos de un sistema de producción musical.',
      'Implementar un backend con persistencia, colas de trabajo y estados verificables.',
      'Empaquetar y desplegar el sistema con HTTPS, configuración y respaldos.',
      'Automatizar pruebas y monitoreo sin exponer secretos.',
      'Defender el sistema con evidencia: arquitectura, pruebas, métricas, límites y gobernanza.',
    ],
    lessons: [
      {
        id: 'cap-01',
        title: 'Arquitectura, contratos y límites del sistema',
        minutes: 50,
        objective: 'Definir componentes, contratos y fronteras antes de escribir la integración.',
        concepts: [
          { heading: 'Componentes y responsabilidades', explanation: 'Interfaz, API, trabajadores, base de datos, almacenamiento y modelos tienen responsabilidades distintas. Un contrato explícito evita que la interfaz dependa de detalles internos del modelo.' },
          { heading: 'Estados y errores', explanation: 'Una tarea puede estar en cola, ejecutándose, completada o fallida. Cada transición debe ser verificable y repetible. Un error no puede dejar la tarea “en curso” para siempre.' },
          { heading: 'Límites declarados', explanation: 'Duración máxima, tamaño de archivo, cupo, coste, idioma y hardware soportado. Lo que no se declara se convierte en promesa implícita.' },
        ],
        demonstration: 'Dibuja la arquitectura con contratos de entrada/salida y una tabla de estados. Marca el punto donde se guarda cada artefacto.',
        commonErrors: [
          { error: 'Empezar por la interfaz y dejar el contrato para después.', correction: 'Define primero entradas, salidas y estados.' },
          { error: 'Guardar archivos grandes en la base de datos.', correction: 'Usa almacenamiento de objetos y guarda referencias y hashes.' },
          { error: 'No declarar límites de duración o tamaño.', correction: 'Documenta y valida los límites en la API.' },
        ],
        practice: 'Entrega el diagrama y la tabla de estados con al menos un caso de error por transición.',
        evidence: ['Diagrama de arquitectura.', 'Contratos de API.', 'Tabla de estados y errores.'],
      },
      {
        id: 'cap-02',
        title: 'Backend, base de datos y colas de trabajo',
        minutes: 55,
        objective: 'Persistir proyectos y trabajos sin perder trazabilidad ni duplicar ejecuciones.',
        concepts: [
          { heading: 'Modelo de datos', explanation: 'Proyectos, versiones, activos, prompts, parámetros, licencias y hashes. Normaliza lo que se consulta y conserva un snapshot de lo que debe permanecer inmutable.' },
          { heading: 'Colas e idempotencia', explanation: 'Un trabajo debe poder reintentarse sin crear dos versiones ni cobrar dos veces. Usa claves de idempotencia y estados explícitos.' },
          { heading: 'Seguridad', explanation: 'Secretos fuera del repositorio, permisos por usuario, URLs firmadas y validación de archivos. Una tabla con service_role no se expone al cliente.' },
        ],
        demonstration: 'Define el esquema mínimo y ejecuta un flujo de crear → encolar → completar → consultar. Fuerza un reintento y comprueba que no duplica.',
        commonErrors: [
          { error: 'Guardar el estado solo en memoria.', correction: 'Persiste el estado y usa la memoria como caché.' },
          { error: 'Reintentar sin idempotencia.', correction: 'Usa una clave única por operación.' },
          { error: 'Exponer la clave de servicio al navegador.', correction: 'Mantén service_role solo en servidor y usa RLS.' },
        ],
        practice: 'Documenta el esquema, la clave de idempotencia y una prueba de reintento.',
        evidence: ['Esquema de datos.', 'Flujo de estados persistido.', 'Prueba de reintento sin duplicado.'],
      },
      {
        id: 'cap-03',
        title: 'Despliegue con Docker, Nginx y HTTPS',
        minutes: 50,
        objective: 'Desplegar el sistema de forma reproducible y con configuración explícita.',
        concepts: [
          { heading: 'Imagen y configuración', explanation: 'Una imagen reproducible fija dependencias y variables. La configuración sensible se inyecta en el entorno, no se hornea en la imagen.' },
          { heading: 'Reverse proxy y TLS', explanation: 'Nginx termina TLS, enruta y aplica límites. Un certificado válido y una redirección HTTP→HTTPS son parte del sistema, no un extra.' },
          { heading: 'Operación', explanation: 'Logs, salud, respaldos y restauración. Un despliegue sin restauración probada no está completo.' },
        ],
        demonstration: 'Escribe el Dockerfile, el compose y la configuración de Nginx. Ejecuta una prueba de salud y documenta el respaldo.',
        commonErrors: [
          { error: 'Incluir secretos en la imagen.', correction: 'Usa variables de entorno o un gestor de secretos.' },
          { error: 'No probar la restauración.', correction: 'Restaura un respaldo en un entorno limpio.' },
          { error: 'Exponer el puerto de la base de datos a Internet.', correction: 'Mantén la base en la red interna.' },
        ],
        practice: 'Entrega los archivos de despliegue y la evidencia de una prueba de salud y restauración.',
        evidence: ['Dockerfile y compose.', 'Configuración de Nginx y TLS.', 'Prueba de salud y restauración.'],
      },
      {
        id: 'cap-04',
        title: 'Pruebas, monitoreo y defensa del sistema',
        minutes: 55,
        objective: 'Demostrar que el sistema funciona, falla de forma controlada y puede auditarse.',
        concepts: [
          { heading: 'Pirámide de pruebas', explanation: 'Unitarias para contratos, integración para flujos y una prueba de extremo a extremo para el camino crítico. Más pruebas no equivalen a mejor cobertura si no cubren los fallos importantes.' },
          { heading: 'Monitoreo', explanation: 'Latencia, errores, cola, coste y salud. Una alerta sin acción asociada es ruido. Define umbral y responsable.' },
          { heading: 'Defensa', explanation: 'Presenta arquitectura, decisiones, pruebas, métricas, límites y riesgos. La demo debe poder fallar de forma controlada sin ocultar el fallo.' },
        ],
        demonstration: 'Ejecuta la suite completa, provoca un fallo controlado y muestra la traza, la alerta y la recuperación.',
        commonErrors: [
          { error: 'Presentar solo el camino feliz.', correction: 'Incluye un fallo controlado y su recuperación.' },
          { error: 'Ocultar límites para que la demo parezca completa.', correction: 'Declara lo que no está implementado.' },
          { error: 'No medir el coste o la latencia real.', correction: 'Registra métricas del entorno de destino.' },
        ],
        practice: 'Entrega el informe final, la suite de pruebas y el guion de defensa con un fallo controlado.',
        evidence: ['Suite de pruebas ejecutada.', 'Métricas y alertas.', 'Guion de defensa y límites declarados.'],
      },
    ],
    lab: {
      title: 'Estudio autónomo desplegado',
      estimatedHours: '8–12 horas',
      purpose: 'Construir y desplegar un sistema mínimo que analice, genere, documente y entregue un activo musical con trazabilidad.',
      steps: [
        'Define arquitectura, contratos, estados y límites del sistema.',
        'Implementa el flujo mínimo con persistencia e idempotencia.',
        'Integra al menos un módulo técnico de los anteriores y documenta su contrato.',
        'Empaqueta con Docker y despliega con HTTPS y configuración externa.',
        'Automatiza pruebas, salud y respaldo; prueba la restauración.',
        'Prepara la defensa con arquitectura, demo, fallo controlado, métricas y riesgos.',
      ],
      deliverables: [
        'Repositorio con arquitectura y contratos documentados.',
        'Flujo funcional con persistencia y estados.',
        'Dockerfile, compose, Nginx y configuración de TLS.',
        'Suite de pruebas, monitoreo y respaldo probado.',
        'Informe final, manifiesto de procedencia y guion de defensa.',
      ],
      acceptance: [
        'El flujo crítico funciona de extremo a extremo.',
        'Un reintento no duplica trabajos ni activos.',
        'El despliegue usa HTTPS y no expone secretos.',
        'La restauración se probó en un entorno limpio.',
        'La defensa declara límites y un fallo controlado.',
      ],
    },
    rubric: [
      { id: 'integration', name: 'Integración del sistema', weight: 20, evidence: 'Flujo completo con contratos, persistencia y estados.', excellence: 'Cada componente tiene una responsabilidad clara y el flujo crítico es demostrable.' },
      { id: 'quality', name: 'Calidad musical y técnica', weight: 15, evidence: 'Activo final, análisis, mezcla y criterios de aceptación.', excellence: 'La calidad se defiende con escucha y métricas, no con adjetivos.' },
      { id: 'reproducibility', name: 'Reproducibilidad', weight: 15, evidence: 'Dependencias fijadas, comandos, configuración y hashes.', excellence: 'Otra persona reconstruye el sistema y obtiene el mismo flujo.' },
      { id: 'deployment', name: 'Despliegue y operación', weight: 15, evidence: 'Docker, TLS, salud, logs y respaldo.', excellence: 'La restauración está probada y el sistema degrada de forma controlada.' },
      { id: 'testing', name: 'Pruebas y fallos', weight: 10, evidence: 'Unitarias, integración, extremo a extremo y fallo controlado.', excellence: 'Las pruebas cubren los contratos y los errores importantes.' },
      { id: 'governance', name: 'Gobernanza', weight: 15, evidence: 'Licencias, manifiesto, transparencia y matriz de riesgos.', excellence: 'El expediente permite auditar el activo sin la sesión original.' },
      { id: 'defense', name: 'Defensa y comunicación', weight: 10, evidence: 'Presentación con evidencia, límites y siguiente iteración.', excellence: 'Responde preguntas técnicas y reconoce lo que no está resuelto.' },
    ],
    codeFiles: [
      { path: 'laboratorio-audio-ia/src/checklist_entrega.py', purpose: 'Verifica que el paquete final contiene los artefactos obligatorios y no vacíos.' },
      { path: 'laboratorio-audio-ia/tests/test_gobernanza_y_sistemas.py', purpose: 'Pruebas de checklist, manifiesto, presupuesto y orquestación.' },
      { path: 'docs/laboratorio-avanzado/MODULO-06.md', purpose: 'Guía del proyecto integrador, arquitectura, despliegue y defensa.' },
    ],
    references: [
      { label: 'FastAPI', url: 'https://fastapi.tiangolo.com/' },
      { label: 'PostgreSQL documentation', url: 'https://www.postgresql.org/docs/' },
      { label: 'Docker documentation', url: 'https://docs.docker.com/' },
      { label: 'Nginx documentation', url: 'https://nginx.org/en/docs/' },
      { label: 'The Twelve-Factor App', url: 'https://12factor.net/' },
    ],
  },
]

export function getAdvancedAudioModule(id: string): AdvancedAudioModule | undefined {
  return ADVANCED_AUDIO_MODULES.find((module) => module.id === id)
}

/** Ruta canónica del módulo. Se deriva del número para no repetirla en cada página. */
export function advancedAudioModulePath(module: AdvancedAudioModule): string {
  return `/curso/laboratorio-audio/modulo-${module.number}`
}

/** Ruta canónica del examen del módulo. */
export function advancedAudioExamPath(module: AdvancedAudioModule): string {
  return `/curso/laboratorio-audio/evaluacion/${module.id}`
}

export const ADVANCED_AUDIO_ASSESSMENT = {
  questionCount: 20,
  passPercent: 80,
  masteryPercent: 85,
  estimateMinutes: 25,
  policy:
    'La evaluación teórica mide comprensión de conceptos. La práctica exige código, audio, gráficos e informe; la IA solo aporta retroalimentación provisional y no emite un grado oficial.',
} as const
