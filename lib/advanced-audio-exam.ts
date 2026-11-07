import type { AdvancedAudioModuleId } from '@/lib/advanced-audio-curriculum'

export interface AdvancedAudioQuestion {
  id: string
  question: string
  options: [string, string, string]
  correctIndex: number
  explanation: string
  topic: string
}
export interface PublicAdvancedAudioQuestion {
  id: string
  question: string
  options: [string, string, string]
  topic: string
}
export interface AdvancedAudioExam {
  moduleId: AdvancedAudioModuleId
  title: string
  questions: AdvancedAudioQuestion[]
}

const dspQuestions: AdvancedAudioQuestion[] = [
  { id:'dsp-q01', topic:'Muestreo', question:'Para una señal muestreada a 48 kHz, ¿cuál es el límite teórico de Nyquist?', options:['12 kHz','24 kHz','48 kHz'], correctIndex:1, explanation:'Nyquist corresponde a la mitad de la frecuencia de muestreo. Un sistema práctico además requiere una banda de transición y filtrado antialiasing.', },
  { id:'dsp-q02', topic:'Aliasing', question:'¿Qué describe mejor el aliasing?', options:['Una frecuencia fuera de banda se pliega y aparece como otra frecuencia en la señal muestreada','Un aumento de loudness al exportar','Una cancelación de fase que solo ocurre en estéreo'], correctIndex:0, explanation:'El aliasing aparece cuando componentes fuera de la banda representable no se controlan antes de muestrear; no se elimina con solo cambiar la escala de una gráfica.', },
  { id:'dsp-q03', topic:'Unidades', question:'¿Cuál es la diferencia más precisa entre RMS y LUFS integrados?', options:['Son siempre el mismo valor con nombres distintos','RMS resume energía según una convención, mientras LUFS usa ponderación/gating definidos para estimar sonoridad','RMS mide frecuencia y LUFS mide la duración'], correctIndex:1, explanation:'Son medidas relacionadas pero no intercambiables; LUFS integra un método perceptual normalizado.', },
  { id:'dsp-q04', topic:'STFT', question:'¿Para qué se usa la STFT en una canción?', options:['Para identificar automáticamente el título y el artista','Para observar cómo cambia el contenido frecuencial a lo largo del tiempo','Para convertir toda la señal en una lista exacta de acordes'], correctIndex:1, explanation:'La STFT analiza ventanas sucesivas para construir una representación tiempo-frecuencia; no es reconocimiento semántico infalible.', },
  { id:'dsp-q05', topic:'Ventanas', question:'¿Qué efecto general tiene aumentar n_fft?', options:['Mejora la separación frecuencial, a costa de localizar peor los eventos rápidos','Aumenta automáticamente la tasa de muestreo','Garantiza un espectrograma de mejor calidad para cualquier tarea'], correctIndex:0, explanation:'Una ventana mayor reduce el espaciado de bins, pero abarca más tiempo. La configuración depende de la pregunta de análisis.', },
  { id:'dsp-q06', topic:'Hop length', question:'¿Qué controla principalmente hop_length?', options:['La distancia entre el inicio de ventanas consecutivas','La profundidad de bits del WAV','El número de canales de entrada'], correctIndex:0, explanation:'El salto determina densidad de frames y coste de cálculo; no aumenta por sí solo la resolución frecuencial.', },
  { id:'dsp-q07', topic:'Ventana Hann', question:'¿Cuál es la función útil de una ventana Hann en el análisis por tramos?', options:['Eliminar cualquier leakage sin excepción','Reducir discontinuidades en los bordes de la ventana','Aumentar el volumen percibido del audio'], correctIndex:1, explanation:'Hann reduce discontinuidades y leakage asociado a los bordes, pero no elimina todas las limitaciones de resolución.', },
  { id:'dsp-q08', topic:'Escala mel', question:'¿Qué distingue al espectrograma mel de uno lineal en Hz?', options:['Usa bandas en una escala perceptual aproximada; no es automáticamente más preciso para localizar Hz','Siempre revela instrumentos mejor que una STFT lineal','Representa únicamente los cambios de volumen'], correctIndex:0, explanation:'Mel comprime la distribución de bandas de manera relacionada con percepción; una escala lineal sigue siendo útil para localizar frecuencias en Hz.', },
  { id:'dsp-q09', topic:'Cromagrama', question:'¿Qué permite observar un cromagrama STFT?', options:['El nombre exacto de cada instrumento','La energía agrupada en clases de altura, con posibles pistas de estructura armónica','La licencia de la grabación'], correctIndex:1, explanation:'Chroma resume clases de altura y puede sugerir patrones armónicos, pero no es un detector infalible de acordes o tonalidad.', },
  { id:'dsp-q10', topic:'Centroide', question:'Un centroide espectral alto permite concluir que…', options:['La canción es de buena calidad','La voz necesariamente domina la mezcla','La distribución de magnitud tiene mayor centro de gravedad frecuencial; la causa requiere más evidencia'], correctIndex:2, explanation:'El centroide es descriptivo de distribución espectral. No identifica por sí solo instrumentos, género ni calidad artística.', },
  { id:'dsp-q11', topic:'RMS', question:'Un aumento de RMS en un tramo prueba que…', options:['La señal tiene mayor amplitud cuadrática media según la ventana usada, pero no identifica la causa musical','El coro ha empezado con certeza','La mezcla es más profesional'], correctIndex:0, explanation:'RMS detecta un cambio de energía; el arreglo, la cantidad de fuentes y la dinámica pueden explicar el cambio, pero deben confirmarse.', },
  { id:'dsp-q12', topic:'ZCR y flatness', question:'¿Cuál es una interpretación prudente de ZCR y spectral flatness?', options:['Son etiquetas semánticas exactas de voz y percusión','Describen propiedades de señal/espectro que pueden ayudar a comparar pasajes, pero no identifican por sí solas una fuente','Solo sirven para medir duración'], correctIndex:1, explanation:'Las características de bajo nivel ayudan a describir patrones; la inferencia de fuente necesita escucha u otros métodos.', },
  { id:'dsp-q13', topic:'Onsets', question:'¿Qué aproxima una función de fuerza de onset?', options:['Cambios asociados con ataques/eventos sonoros a lo largo del tiempo','El permiso legal de cada muestra','La imagen estéreo'], correctIndex:0, explanation:'La envolvente de onsets estima actividad de ataques, y puede alimentar estimadores de tempo y segmentación.', },
  { id:'dsp-q14', topic:'Tempo', question:'¿Por qué un estimador automático puede devolver la mitad o el doble del tempo percibido?', options:['Porque BPM no se relaciona con ritmo','Porque las periodicidades rítmicas pueden admitir varias interpretaciones y los patrones de ataque pueden ser ambiguos','Porque el CSV siempre omite los graves'], correctIndex:1, explanation:'Tempo estimado es una hipótesis basada en periodicidad. Se valida con escucha, metrónomo o rejilla temporal.', },
  { id:'dsp-q15', topic:'Reproducibilidad', question:'¿Qué información ayuda más a reproducir una extracción de características?', options:['Solo el nombre del gráfico','Archivo/fuente y permiso, versiones de librería, tasa de análisis, n_fft, hop_length y comando','La opinión de otro estudiante sin archivo'], correctIndex:1, explanation:'Un análisis reproducible necesita entrada identificable, configuración y dependencias; un nombre de archivo no basta.', },
  { id:'dsp-q16', topic:'Alineación', question:'¿Por qué el CSV de características necesita timestamps alineados?', options:['Para asociar cada valor al frame y comparar medidas a lo largo de la misma escala temporal','Para mejorar la calidad del WAV original','Porque la licencia del audio exige siempre CSV'], correctIndex:0, explanation:'Sin alineación temporal, comparar RMS, centroide, chroma u onset strength puede llevar a conclusiones sobre eventos distintos.', },
  { id:'dsp-q17', topic:'Separación', question:'¿Qué limitación puede aparecer en stems separados con IA?', options:['Siempre son idénticos a los stems de la sesión original','Sangrado de fuentes, transitorios suavizados o artefactos metálicos/fase','Los stems eliminan la necesidad de derechos de autor'], correctIndex:1, explanation:'La separación es una estimación. Los artefactos deben compararse con la mezcla y las licencias siguen aplicando.', },
  { id:'dsp-q18', topic:'Muestreo', question:'Si se remuestrea un archivo a 22 050 Hz para análisis, ¿qué debe registrarse?', options:['Solo el nuevo nombre del WAV','La tasa original y la tasa usada en el análisis','Nada, porque remuestrear nunca descarta banda útil'], correctIndex:1, explanation:'La tasa de análisis limita la banda disponible y debe quedar documentada junto a la tasa de origen.', },
  { id:'dsp-q19', topic:'Ética', question:'¿Qué demuestra un hash SHA-256 en un manifiesto?', options:['Garantiza que el autor posee derechos comerciales','Ayuda a identificar el archivo exacto y verificar integridad, pero no prueba titularidad o licencia','Asegura que el modelo no produjo artefactos'], correctIndex:1, explanation:'El hash sirve para integridad/identidad de datos; la procedencia jurídica necesita una licencia, permiso u otra base válida.', },
  { id:'dsp-q20', topic:'Evidencia', question:'¿Cuál es la afirmación más defendible al presentar un análisis?', options:['“El centroide prueba que suena una guitarra”','“El cromagrama demuestra con certeza la tonalidad”','“La métrica cambia en este intervalo; al escuchar se percibe X, que sigue siendo una hipótesis de fuente”'], correctIndex:2, explanation:'Separa medición, observación auditiva e inferencia y expresa incertidumbre de forma explícita.', },
]

const masteringQuestions: AdvancedAudioQuestion[] = [
  { id:'mst-q01', topic:'Peak', question:'¿Qué expresa peak sample-based en dBFS?', options:['El máximo de magnitud entre las muestras digitales, respecto a escala completa','La sonoridad percibida integrada','La densidad de notas por segundo'], correctIndex:0, explanation:'Los picos sample-based no capturan necesariamente los máximos reconstruidos entre muestras.', },
  { id:'mst-q02', topic:'LUFS', question:'¿Cómo debe calcularse loudness integrada en una mezcla estéreo para evitar cancelación previa innecesaria?', options:['Promediando L y R a mono siempre antes de medir','Con un medidor compatible con el método sobre los canales originales','Midiendo solo el canal izquierdo'], correctIndex:1, explanation:'El cálculo debe preservar el canalado y seguir un medidor conforme al método de loudness elegido.', },
  { id:'mst-q03', topic:'RMS', question:'¿Qué explica mejor la relación entre RMS y loudness?', options:['RMS y LUFS son idénticos en cualquier señal','RMS describe energía bajo una convención; LUFS integra ponderación/gating específicos','RMS solo mide ancho estéreo'], correctIndex:1, explanation:'La sonoridad no depende solo de la energía media; LUFS usa un método estandarizado orientado a percepción.', },
  { id:'mst-q04', topic:'True peak', question:'¿Qué es el true peak?', options:['El pico de la señal reconstruida estimado entre muestras','Siempre el mismo valor que sample peak','Una medida directa del gusto musical'], correctIndex:0, explanation:'Los picos intersample pueden sobrepasar las muestras; una simple interpolación 4x del laboratorio es estimativa.', },
  { id:'mst-q05', topic:'Crest factor', question:'¿Qué aporta el crest factor?', options:['Una medida completa de calidad artística','La diferencia entre el nivel pico y el RMS bajo la convención usada','La cantidad de canales del archivo'], correctIndex:1, explanation:'Describe una relación de dinámica, pero no reemplaza escucha, loudness, artefactos y contexto musical.', },
  { id:'mst-q06', topic:'Correlación L/R', question:'¿Qué significa una correlación estéreo negativa?', options:['La mezcla necesariamente suena más ancha y mejor','Conviene revisar fase y compatibilidad mono; el contexto y la escucha siguen siendo necesarios','El archivo está protegido por DRM'], correctIndex:1, explanation:'La correlación negativa puede revelar componentes fuera de fase; correlación por sí sola no resume anchura o calidad.', },
  { id:'mst-q07', topic:'Correlación L/R', question:'Una correlación cercana a cero indica que…', options:['Los canales son poco correlacionados, sin demostrar por sí sola una anchura ideal','El estéreo es necesariamente perfecto','Se debe sumar siempre a mono'], correctIndex:0, explanation:'Interpretar el valor requiere revisar el arreglo, la señal y la escucha; no es una métrica total de espacialidad.', },
  { id:'mst-q08', topic:'Enmascaramiento', question:'¿Cómo conviene abordar un conflicto entre bombo y bajo?', options:['Aplicar el mismo high-pass a todas las pistas sin escuchar','Formular una hipótesis y elegir entre EQ, envolvente, arreglo, automatización o ritmo según el caso','Aumentar el volumen global del master'], correctIndex:1, explanation:'No existe un único procesamiento; primero se identifica causa musical y después se prueba el cambio más pequeño útil.', },
  { id:'mst-q09', topic:'EQ', question:'¿Por qué un high-pass indiscriminado puede empeorar una mezcla?', options:['Puede eliminar parte útil del cuerpo de voces, guitarras o pads','Siempre aumenta la tasa de muestreo','Solo funciona en archivos mono'], correctIndex:0, explanation:'El filtro debe responder a una necesidad comprobada, no aplicarse por una regla genérica.', },
  { id:'mst-q10', topic:'Compresión', question:'¿Qué controla principalmente el threshold de un compresor?', options:['El nivel a partir del cual empieza a actuar la curva de compresión','La frecuencia de muestreo','El formato de distribución'], correctIndex:0, explanation:'Threshold establece el nivel de referencia de la curva; ratio, knee, attack, release y detector cambian el comportamiento.', },
  { id:'mst-q11', topic:'Ratio', question:'¿Qué describe el ratio?', options:['Cuánto se comprime el nivel que excede el umbral según la curva del compresor','La proporción de canales izquierdo/derecho','La cantidad de archivos de salida'], correctIndex:0, explanation:'El ratio especifica la relación de entrada/salida en la región comprimida; la percepción depende también de otros parámetros.', },
  { id:'mst-q12', topic:'Attack', question:'¿Qué puede ocurrir con un ataque extremadamente rápido?', options:['Los transitorios pueden perder impacto o cambiar de carácter','El audio se vuelve automáticamente más dinámico','Se eliminan los artefactos de codec'], correctIndex:0, explanation:'La rapidez del detector afecta cuánto pasa del transitorio antes de aplicar la reducción deseada.', },
  { id:'mst-q13', topic:'Release', question:'¿Qué riesgo hay con un release mal ajustado?', options:['Bombeo o distorsión, o una recuperación que no acompaña el ritmo','Un cambio del número de canales del archivo','La creación de licencias de audio'], correctIndex:0, explanation:'La recuperación depende del material, el tiempo y el detector; debe escucharse, no fijarse por una receta universal.', },
  { id:'mst-q14', topic:'Knee', question:'¿Qué hace un soft knee?', options:['Suaviza la transición de la curva de compresión cerca del umbral','Garantiza que el true peak nunca exceda un límite','Mide la sonoridad integrada'], correctIndex:0, explanation:'Soft knee cambia la transición de la curva, no constituye por sí mismo una etapa de limitación true-peak.', },
  { id:'mst-q15', topic:'Techo y clipping', question:'El compresor didáctico reduce ganancia global si sobrepasa su techo sample-based. ¿Qué no garantiza?', options:['Que la señal tenga menos muestras que la original','Que se eviten todos los picos intersample o se cumpla una especificación true-peak','Que el audio se guarde como WAV'], correctIndex:1, explanation:'El control global del pico de muestras no equivale a un limitador true-peak ni a una medición certificada.', },
  { id:'mst-q16', topic:'Destino LUFS', question:'¿Por qué no debe usarse -14 LUFS como requisito universal de masterización?', options:['Porque las metas dependen del destino; la normalización de playback no es una obligación universal de master','Porque LUFS no mide ninguna característica útil','Porque todo audio debe entregarse a -23 LUFS'], correctIndex:0, explanation:'Streaming, radiodifusión, cine y archivo pueden requerir criterios distintos. Consulta especificaciones vigentes del destino.', },
  { id:'mst-q17', topic:'EBU R128', question:'¿Cómo se debe interpretar el valor -23 LUFS de EBU R 128?', options:['Como regla universal para toda canción comercial','Como referencia dentro del marco de producción de programas de radiodifusión','Como valor de pico sample-based'], correctIndex:1, explanation:'EBU R 128 es una recomendación de sonoridad para broadcast; no debe confundirse con un mandato universal para todos los másters.', },
  { id:'mst-q18', topic:'A/B', question:'¿Cómo comparas dos masters con menos sesgo por diferencia de volumen?', options:['Escuchando siempre el archivo con mayor peak como el mejor','Igualando el volumen de escucha y registrando las diferencias reales','Subiendo ambos hasta clipping'], correctIndex:1, explanation:'La versión más alta puede parecer preferible sin ser mejor; la comparación justa controla la sonoridad de escucha.', },
  { id:'mst-q19', topic:'Espectro A/B', question:'¿Qué puede reflejar una gráfica de diferencia espectral de magnitud bruta?', options:['Solo el cambio de EQ y nunca la ganancia global','Cambios de balance y también diferencias de nivel general','La licencia del audio'], correctIndex:1, explanation:'Una diferencia espectral bruta incluye cualquier diferencia de magnitud, también la causada por ganancia global; interpreta junto con otras métricas.', },
  { id:'mst-q20', topic:'Trazabilidad', question:'¿Qué debe acompañar una entrega de master técnicamente defendible?', options:['Solo la frase “suena profesional”','Archivo, destino, parámetros, métricas/método, comparación auditiva y procedencia/licencia','Únicamente el número LUFS'], correctIndex:1, explanation:'La trazabilidad permite reconstruir la decisión y verificar tanto la especificación técnica como la legitimidad del material.', },
]

const exams: Record<AdvancedAudioModuleId, AdvancedAudioExam> = {
  dsp: { moduleId: 'dsp', title: 'Examen técnico 1 · DSP y extracción espectral', questions: dspQuestions },
  mastering: { moduleId: 'mastering', title: 'Examen técnico 2 · Mezcla y masterización', questions: masteringQuestions },
}

export function getAdvancedAudioExam(moduleId: string): AdvancedAudioExam | null {
  return moduleId === 'dsp' || moduleId === 'mastering' ? exams[moduleId] : null
}

export function publicQuestions(exam: AdvancedAudioExam): PublicAdvancedAudioQuestion[] {
  return exam.questions.map(({ id, question, options, topic }) => ({ id, question, options, topic }))
}

export function gradeAdvancedAudioExam(
  exam: AdvancedAudioExam,
  answers: Record<string, number>,
): { score: number; correct: number; total: number; passed: boolean; mastery: boolean; review: Array<{ id: string; correct: boolean; explanation: string; correctOption: string }> } {
  let correct = 0
  const review = exam.questions.map((question) => {
    const matched = answers[question.id] === question.correctIndex
    if (matched) correct += 1
    return {
      id: question.id,
      correct: matched,
      explanation: question.explanation,
      correctOption: question.options[question.correctIndex],
    }
  })
  const total = exam.questions.length
  const score = Math.round((correct / total) * 100)
  return { score, correct, total, passed: score >= 80, mastery: score >= 85, review }
}

export function validateAdvancedAudioAnswers(
  exam: AdvancedAudioExam,
  value: unknown,
): value is Record<string, number> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false
  const answers = value as Record<string, unknown>
  const expectedIds = new Set(exam.questions.map((question) => question.id))
  if (Object.keys(answers).length !== expectedIds.size) return false
  for (const [id, answer] of Object.entries(answers)) {
    if (!expectedIds.has(id) || !Number.isInteger(answer) || typeof answer !== 'number' || answer < 0 || answer > 2) return false
  }
  return true
}
