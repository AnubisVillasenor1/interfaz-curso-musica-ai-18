/**
 * Contenido curricular de Play and Go by TAMV ONLINE.
 *
 * Este archivo es la única fuente de verdad del curso. Las páginas de lección
 * deben leer `COURSE_LESSONS` y `COURSE_MODULES`, nunca copiar títulos a mano:
 * el dashboard tenía los nombres de las sesiones escritos como strings sueltos
 * en `components/course-dashboard.tsx`, sin objetivo, sin ejercicio y sin
 * entregable, y por eso el progreso no significaba haber aprendido nada.
 *
 * Sin dependencias externas. Todo lo que hay aquí es contenido.
 */

export type LessonId = string // formato 'm01-l01' ... 'm05-l16'

export interface PromptTemplate {
  name: string
  /** Qué se obtiene con él, en una línea. */
  outcome: string
  /** El prompt completo, listo para copiar. */
  text: string
  /** Variables entre {llaves} que el alumno debe sustituir. */
  variables: string[]
}

export interface Exercise {
  title: string
  /** Pasos numerados, 3 a 6. */
  steps: string[]
  /** Qué se entrega al terminar. */
  deliverable: string
  /** Criterios de éxito comprobables, 2 a 4. */
  checklist: string[]
}

export interface ListeningRef {
  title: string
  /** Qué escuchar específicamente, no "fíjate en la música". */
  focus: string
  /** Referencia buscable: género + artista/obra o técnica. */
  search: string
}

export interface Lesson {
  id: LessonId
  moduleIndex: number // 1..5
  lessonNumber: number // 1..16 global
  title: string
  kicker: string // etiqueta corta, máx 40 caracteres
  minutes: number // 6..25
  objective: string // 1 frase
  /** 3 a 5 bloques de enseñanza. Cada bloque: título + 2 a 4 párrafos de 40 a 90 palabras. */
  blocks: Array<{ heading: string; body: string[] }>
  /** 1 a 3 ejemplos concretos, con el prompt o la decisión real. */
  examples: string[]
  techniques: string[] // 3 a 6, cada una nombrada y explicada en 1-2 frases
  prompts: PromptTemplate[] // 1 a 3
  exercise: Exercise
  listening: ListeningRef[] // 1 a 3
  /** Errores frecuentes y cómo se corrigen. 2 a 4. */
  pitfalls: Array<{ mistake: string; fix: string }>
  takeaway: string // una frase que el alumno debe recordar
}

export interface CourseModule {
  index: number
  id: string // 'm01'...'m05'
  title: string
  subtitle: string
  summary: string
  outcome: string
  lessonIds: LessonId[]
}

export const COURSE_MODULES: CourseModule[] = [
  {
    index: 1, id: 'm01', title: 'El mapa sonoro',
    subtitle: 'Fundamentos: qué decide el motor y qué decides tú',
    summary: 'Qué es realmente la generación musical con IA y cuáles son las cinco variables que siempre puedes dirigir: género, tempo, tonalidad, voz y estructura con dinámica. Aprendes a traducir una escena en decisiones comprobables en vez de pedir emociones con adjetivos.',
    outcome: 'Escribes el brief de una canción con emoción, referencia, curva de energía y estructura, y puedes explicar qué instrucción produjo qué fragmento del audio.',
    lessonIds: ['m01-l01', 'm01-l02', 'm01-l03'],
  },
  {
    index: 2, id: 'm02', title: 'Prompting musical',
    subtitle: 'Anatomía, dirección y iteración reproducible',
    summary: 'Construyes prompts con campos obligatorios que puedes relanzar mañana y obtener el mismo resultado: voz, género, instrumentación con función, tempo, estructura y referencia de mezcla. Iteras cambiando una sola variable y comparas versiones con una checklist en lugar de por corazonadas.',
    outcome: 'Tienes tres generaciones documentadas del mismo material, una versión seleccionada con justificación y una checklist de calidad que aplicas antes de compartir nada.',
    lessonIds: ['m02-l04', 'm02-l05', 'm02-l06', 'm02-l07'],
  },
  {
    index: 3, id: 'm03', title: 'Voz, letra y emoción',
    subtitle: 'Interpretación vocal y métrica que funciona cantada',
    summary: 'Diriges la voz en sus cuatro ejes (registro, textura, articulación y acento), escribes letras con métrica funcional por sección y anotas la interpretación para que el motor reciba instrucciones, no intenciones. Includes las restricciones reales de suplantación de voz.',
    outcome: 'Entregas una letra completa con anotaciones de interpretación y dinámica, y tres perfiles vocales distintos cantando el mismo material.',
    lessonIds: ['m03-l08', 'm03-l09', 'm03-l10'],
  },
  {
    index: 4, id: 'm04', title: 'Género y producción',
    subtitle: 'Capas, groove, dinámica y referencias',
    summary: 'Cada instrumento entra en la mezcla por una función, no por decoración. Maps las capas por género, eliges el groove que sostiene el tema, trabajas la curva de dinámica y usas referencias de producción sin copiar obras. Covers objetivos de loudness de las plataformas.',
    outcome: 'Presentas una matriz comparativa con tres arreglos del mismo tema y el prompt final de producción justificado capa por capa.',
    lessonIds: ['m04-l11', 'm04-l12', 'm04-l13'],
  },
  {
    index: 5, id: 'm05', title: 'De idea a release',
    subtitle: 'Versiones, derechos, distribución y portafolio',
    summary: 'Del borrador a la entrega: selección con criterios, control de versiones, brief profesional, qué es registrable cuando interviene una IA, cómo funcionan las licencias de cada plataforma, qué es un ISRC, cómo se distribuye con un agregador y cómo se negocia un sync. Terminas con dos canciones y su evidencia.',
    outcome: 'Publicas dos canciones con su ficha de versiones, su checklist de derechos cumplida y un portafolio que demuestra criterio de productor.',
    lessonIds: ['m05-l14', 'm05-l15', 'm05-l16'],
  },
]

export const COURSE_LESSONS: Lesson[] = [
  {
    id: 'm01-l01', moduleIndex: 1, lessonNumber: 1,
    title: 'Qué es la música generativa y cómo pensar como director', kicker: 'Sesión 01 · Fundamentos', minutes: 14,
    objective: 'Salir de «pide una canción bonita» y entrar a dirigir cinco decisiones musicales comprobables.',
    blocks: [
      { heading: 'El motor no entiende música: entiende correlaciones', body: [
          'Un generador musical de IA es un modelo entrenado con muchísimos audios que aprendió a predecir qué suena después de qué. No sabe qué es la tristeza ni qué es un coro: sabe que cuando la descripción incluye piano felt, 84 BPM y voz femenina susurrada, los audios etiquetados así comparten tempo lento, ataque suave y un espectro cerrado en agudos. Tu prompt no se lee: se correlaciona. Cada palabra activa un vecindario estadístico de sonidos, y el audio que recibes es una muestra de ese vecindario.',
          'De ahí la primera regla práctica: las palabras vagas producen música vaga. «Triste» abarca el réquiem, el lo-fi de madrugada y la balada de piano con cuerdas, tres mundos que no comparten ni el tempo. «Que suene profesional» no es una instrucción, es un deseo. Sustituye el adjetivo por decisiones medibles: registro vocal, densidad instrumental, curva de energía por sección y un referente de mezcla. Si no puedes medirlo, tampoco puedes dirijirlo ni auditarlo.',
          'Segunda regla: el material musical siempre existió en tu sesión; el prompt solo eligió en qué vecindario buscar. Por eso dos prompts casi idénticos generan canciones hermanas, y por eso documentar qué cambiaste vale muchísimo más que rezar para que salga una toma afortunada. Un productor que trabaja con IA no pesca al azar: pesca con mapa, carta de navegación y bitácora. Ese cuaderno es tu activo.',
        ] },
      { heading: 'Las cinco decisiones que siempre controlas', body: [
          'Sin importar el motor, hay cinco mandos que sí responden. Género y subgénero: definen el vocabulario rítmico e instrumental. Tempo en BPM: define la velocidad percibida y el cuerpo del groove. Tonalidad y modo: definen el color, el menor suena tenso y el mayor resuelto. Descripción vocal: registro, textura, articulación y acento. Estructura con dinámica: qué ocurre en cada bloque de tiempo. Todo lo demás que puedes escribir es decoración de esas cinco casillas.',
          'Observa lo que NO está en la lista: «éxito», «emoción garantizada», «sonido de moda». Cuando un resultado te frustra, casi nunca falló la inteligencia artificial: falló una de las cinco casillas que dejaste vacía. Revisa la lista antes de reescribir el prompt completo y sabrás exactamente qué llenar, en vez de tirar otra generación a ver qué sale.',
          'Esa lista también delimita tu responsabilidad. El modelo decide el timbre exacto de la caja, la variación del riff y miles de microdetalles que no puedes pedir palabra por palabra. Tú decides el marco. Aceptar ese reparto con honestidad es lo que separa a quien se frustra en la primera generación de quien itera con criterio en la décima.',
        ] },
      { heading: 'Traduce la escena a música, no la resumas con un adjetivo', body: [
          'El ejercicio que sostiene todo el curso: describe una escena con sustantivos y verbos, y después tradúcela a decisiones. «Un taxi a las tres de la mañana bajo la lluvia» no es un prompt, pero obliga a responder: ¿a qué tempo camina ese taxi?, ¿qué instrumento hace de lluvia?, ¿la voz canta o murmura?, ¿la energía sube o se queda plana porque el conductor está agotado? La escena responde las cinco preguntas; el prompt solo las traduce a palabras que el motor conoce.',
          'Esa traducción es literalmente el trabajo del productor. A un músico de estudio nunca se le pide «ponlo triste»: se le entrega una escena, una duración en segundos y una referencia de sonido. Si aprendes a traducir escenas en decisiones, la herramienta que uses deja de importar. Dominas un lenguaje transferible, no un truco de plataforma, y ese lenguaje sigue sirviendo cuando cambie el motor de mañana.',
        ] },
      { heading: 'Qué le pides al motor y qué le quitas', body: [
          'Antes de generar, decide también qué no vas a pedir: una voz específica con nombre propio, un solo virtuoso imposible, una producción de orquesta de ochenta músicos. Imitar artistas nombrándolos está bloqueado o es jurídicamente riesgoso en la mayoría de las plataformas, además de creativamente pobre. Describe en su lugar las propiedades que hacen reconocible ese estilo: tempo, articulación, espacio de mezcla, actitud y registro vocal. Conservas la intención sin copiar la identidad.',
          'Y entrega poco, pero exacto. Entre diez y veinticinco términos que cubran las cinco decisiones rinden más que un párrafo de cuarenta. La razón es estadística: cada palabra ambigua que agregas empuja la correlación hacia otro vecindario y te aleja del que querías. Menos palabras, todas medidas, es la firma del prompt profesional. Si una palabra no paga su alquiler, fuera.',
        ] },
    ],
    examples: [
      'Escena: «una cocinera cierra el restaurante y se queda sola». Traducción a cinco decisiones: bossa nova suave, 96 BPM, Sol mayor con séptimas, voz femenina en registro bajo y sin vibrato, estructura A-B-A con dinámica casi plana y solo de guitarra de nylon en la coda. El prompt salió de la escena, no del adjetivo «relajante».',
      'Antes: «canción épica para motivar». Después: «rock instrumental, 128 BPM, Re menor, guitarra con palm mute en versos, cuerdas staccato entrando en el pre-coro, bombo en negras en el coro, clímax en el último coro con hi-hat a doble tempo, mezcla seca y ancha». El segundo se puede auditar fragmento por fragmento; el primero no.',
      'Decisión de director: en lugar de «que suene a Billie Eilish», «pop minimalista, 94 BPM, voz femenina susurrada muy cerca del micrófono, sub-bajo senoidal que duplica la fundamental, percusión con caja distorsionada solo en coros, reverberación corta en versos y casi vacío de 200 a 500 Hz». Mantienes lo que hacía reconocible la referencia sin nombrar a nadie.',
    ],
    techniques: [
      'Traducción escena→decisión: escribe la escena en una frase y respóndele por escrito las cinco preguntas (tempo, modo, voz, instrumentación, curva de energía) antes de tocar el prompt.',
      'Inventario de mandos: marca en tu prompt qué decisión cubre cada término. Lo que no cae en ninguna de las cinco casillas es relleno y se elimina.',
      'Descripción por propiedades: sustituye nombres de artistas por las propiedades medibles que producen ese sonido: registro, densidad, espacio, articulación, actitud.',
      'Umbral de auditoría: un prompt es bueno si al escuchar puedes decir qué instrucción generó qué fragmento. Si no puedes, es una intención disfrazada de instrucción.',
      'Bitácora de dos columnas: a la izquierda el prompt exacto, a la derecha qué entregó el audio. Esa memoria vale más que cualquier truco de semilla que encuentres en internet.',
    ],
    prompts: [
      { name: 'Traductor de escena a prompt', outcome: 'Convertir una escena mental en un prompt con las cinco decisiones cubiertas.',
        variables: ['género y subgénero', 'BPM', 'tonalidad y modo', 'registro', 'textura', 'articulación', 'capa base', 'capa armónica', 'capa que entra en coros', 'intro', 'verso', 'pre-coro', 'coro', 'puente', 'outro', 'duración total', 'qué sube en el coro', 'qué baja en el puente', 'referencia de espacio', 'referencia de espectro', 'una frase de la escena'],
        text: 'Género: {género y subgénero}. Tempo: {BPM} BPM. Tonalidad: {tonalidad y modo}. Voz: {registro} con {textura} y {articulación}. Instrumentación: {capa base} sosteniendo el groove, {capa armónica} en versos, {capa que entra en coros}. Estructura: {intro} / {verso} / {pre-coro} / {coro} / {puente} / {outro}, alrededor de {duración total}. Dinámica: {qué sube en el coro} y {qué baja en el puente}. Mezcla: {referencia de espacio} con {referencia de espectro}. La escena, sin adjetivos emocionales: {una frase de la escena}.' },
      { name: 'Antídoto contra el adjetivo vacío', outcome: 'Reescribir un prompt hecho de adjetivos como instrucciones comprobables.',
        variables: ['adjetivo vago', 'BPM mínimo', 'BPM máximo', 'modo mayor o menor', 'grado de tensión armónica', 'qué suena en versos', 'qué se suma en coros', 'registro', 'articulación', 'cantidad de aire'],
        text: 'Sustituye «{adjetivo vago}» por cuatro decisiones: tempo entre {BPM mínimo} y {BPM máximo} BPM; {modo mayor o menor} con {grado de tensión armónica}; instrumentación con {qué suena en versos} y {qué se suma en coros}; voz en {registro}, con {articulación} y {cantidad de aire}. Genera y verifica si la emoción aparece sin haber nombrado nunca el adjetivo original.' },
    ],
    exercise: {
      title: 'Cinco decisiones para una escena', deliverable: 'Una entrada de bitácora con la escena, las cinco decisiones, el prompt final y una nota que ligue cada fragmento del audio con la instrucción que lo produjo.',
      steps: [
        'Elige una escena real de tu día (una cocina, una parada de autobús, un pasillo vacío) y escríbela en una sola frase, sin adjetivos emocionales.',
        'Responde por escrito las cinco preguntas: ¿a qué tempo se mueve?, ¿qué modo y color?, ¿cómo es la voz?, ¿qué instrumentación con función?, ¿cómo sube y baja la energía?',
        'Traduce las respuestas a un prompt de 10 a 25 términos con la plantilla «Traductor de escena a prompt».',
        'Genera dos versiones del mismo prompt en el estudio local gratuito o en el estudio con voces del curso y escúchalas completas, sin saltar a los 20 segundos.',
        'Anota en la bitácora qué decisión se escuchó, cuál se perdió y cuál sobra; con eso llegas listo a la Sesión 02.',
      ],
      checklist: [
        'El prompt cubre las cinco decisiones y no contiene adjetivos emocionales sueltos tipo «hermoso» o «profesional».',
        'La extensión quedó entre 10 y 25 términos; ningún término repetido hace el trabajo de otro.',
        'Puedes señalar en el audio qué pasaje respondió a qué instrucción, y cuál instrucción no se notó.',
        'Registraste el prompt exacto copiado, no resumido de memoria.',
      ],
    },
    listening: [
      { title: 'Pop minimalista de susurro', search: 'Billie Eilish ocean eyes producción minimalista voz susurrada análisis',
        focus: 'Cuenta cuántos elementos suenan a la vez en el primer verso: voz, sub-grave y un solo percutor. Escucha la voz por delante de la música y con reverberación corta; la intimidad viene del espacio y del registro, no de la letra.' },
      { title: 'Bossa nova: calma como articulación', search: 'João Gilberto bossa nova voz baja sin vibrato guitarra nylon pulso',
        focus: 'Observa la voz en registro bajo, casi sin vibrato, pegada al pulso de la guitarra de nylon. La sensación de calma es una decisión de articulación y volumen, no un tempo extraordinariamente lento.' },
      { title: 'Rock instrumental con curva de energía', search: 'dinámica en rock instrumental versos coros densidad de arreglos análisis',
        focus: 'Escucha cómo la densidad, y no solo el volumen, marca la diferencia entre versos y coros: qué instrumento entra, cuál duplica su patrón y dónde se abre el estéreo.' },
    ],
    pitfalls: [
      { mistake: 'Pedir una emoción sin dar ninguna decisión musical.', fix: 'Cambia el adjetivo por las cuatro variables que lo producen: tempo, modo, instrumentación y articulación vocal.' },
      { mistake: 'Copiar prompts ajenos sin saber qué hace cada término.', fix: 'Explica en una línea qué aporta cada palabra. Lo que no puedas explicar, elimínalo o sustitúyelo por algo que sí controles.' },
      { mistake: 'Nombrar artistas para obtener su sonido.', fix: 'Describe propiedades: registro, densidad, espacio de mezcla y actitud vocal. Nombrar voces o obras ajenas puede violar los términos de la plataforma.' },
      { mistake: 'Juzgar el resultado en los primeros 15 segundos.', fix: 'Escucha la canción completa dos veces antes de decidir; el motor suele reservar sus mejores pasajes para el segundo tercio.' },
    ],
    takeaway: 'La IA no compone tu canción: ejecuta el mapa de decisiones que tú le dibujas.',
  },
  {
    id: 'm01-l02', moduleIndex: 1, lessonNumber: 2,
    title: 'BPM, tonalidad, energía y estructura sin tecnicismos', kicker: 'Sesión 02 · Lenguaje mínimo', minutes: 16,
    objective: 'Manejar BPM, modo, energía y estructura con lenguaje propio, para pedirlos y auditarlos sin depender de nadie.',
    blocks: [
      { heading: 'BPM: la velocidad que decide el cuerpo', body: [
          'BPM son pulsaciones por minuto: cuántos golpes marca el metrónomo en 60 segundos. 60 BPM es un latido por segundo; 120, dos. Ese número decide cómo se mueve un cuerpo y, por lo tanto, el género posible: el reggaetón suele convivir entre 85 y 95, el house alrededor de 120 a 128, el trap entre 130 y 160 con feel a medio tiempo, el lo-fi entre 70 y 90. No es una ley, es la zona donde el patrón rítmico respira cómodo.',
          'El error más común al medir: confundir el pulso con su doble o su mitad. Si cuentas 170 pero la canción se baila a 85, estás escuchando las corcheas. Truco estable: marca con el pie el golpe que tu cuerpo no puede ignorar, normalmente el bombo o el cajón, y cuenta cuántos golpes caben en 15 segundos multiplicando por cuatro. Una app de tapping te confirma el número en diez segundos.',
          'Con el número en la mano, ya puedes dirigir: «94 BPM» es una instrucción; «tempo medio» es una opinión. Y cuando quieras tensión sin velocidad, pide medio tiempo: mismo BPM, sensación a la mitad, que en el prompt se escribe como halftime feel o pulso en negras por compás de dos.',
        ] },
      { heading: 'Tonalidad y modo: el color, no la suerte', body: [
          'La tonalidad nombra la casa de la canción (Do, Re, Mi…) y el modo su iluminación: mayor suena abierto y resuelto, menor suena tenso o melancólico. En la práctica con IA, lo que más te importa es el modo y si la armonía se mueve en cuatro grados simples o se mete en acordes prestados y séptimas. Menos cambios y modo claro = canción que se deja cantar; séptimas, novenas y acordes prestados = color sofisticado y menos memorizable.',
          'La tonalidad absoluta también afecta a la voz, aunque casi nadie lo pide: una canción en registro muy alto obliga a la voz a beltear y cambia el carácter de la interpretación. Si quieres una voz grave y cercana, tiene sentido pedir tonalidades bajas y melodía en rango estrecho. Si quieres euforia, rango amplio y tonalidad que permita subidas. Describe el rango, no solo la nota.',
          'Y una verdad incómoda que ahorra discusiones: el motor a veces no respeta la tonalidad que escribiste, porque el peso estadístico del género puede más que la palabra. Por eso conviene verificarla oyendo la nota final del coro, que casi siempre revela la casa real. Si necesitas exactitud armónica para un músico humano, entrega además la progresión en grados (I-vi-IV-V), que el modelo respeta mejor que las notas sueltas.',
        ] },
      { heading: 'Energía: la variable que la IA sí obedece', body: [
          'Energía no es volumen. Es cuántos elementos suenan a la vez, qué tan rápido se mueven en subdivisión, cuánto ataquen y qué tan abierto esté el espectro. Una balada puede tener más energía que un tema dance si entran cuerdas en corcheas, platillos a doble tempo y una voz con más aire. Por eso «baja energía» produce a veces algo fuerte: el motor lo asocia a un adjetivo de mood, no a una densidad instrumentable.',
          'Escríbela como curva y por sección: verso con dos capas y pulso en negras, pre-coro sumando percusión y una guitarra en corcheas, coro con cuatro capas, platillos y voz doblada, puente que se cae a voz y un solo instrumento, último coro con una capa más que el anterior. Esa lista es una instrucción auditable; «que explote el coro» no.',
          'La curva también define la forma en que se recuerda tu canción. El oído humano marca los cambios, no los promedios: una canción plana en energía resulta larga aunque dure dos minutos, y una con tres cambios claros resulta corta aunque dure cuatro. Cuando alguien diga «se hace pesada», casi siempre significa que la curva no tiene bajadas.',
        ] },
      { heading: 'Estructura: bloques con nombres y con minutos', body: [
          'La estructura estándar del pop es intro, verso, pre-coro, coro, verso, pre-coro, coro, puente, coro, outro. Su lógica es simple: el verso acumula información, el pre-coro crea tensión, el coro la descarga y el puente reencuadra para que el último coro no suene repetido. Aprende los bloques por su función, no por su orden, porque el orden es una convención y la función es una necesidad del oído.',
          'Para dirigir una máquina, los nombres no bastan: agrega duración. «Verso de 8 compases, coro de 8, puente de 4» se traduce en tiempos; «estructura interesante» no se traduce en nada. Si no lees partitura, usa la regla de los bloques de 16 segundos: a 120 BPM, cuatro compases duran unos 8 segundos y ocho compases unos 16, así que puedes escribir la estructura como una sucesión de segundos.',
          'Y controla el reloj desde el principio: una canción para radio o para un reel rara vez necesita más de tres minutos. Decide primero el destino y después la estructura. Pide el coro antes del segundo minuto o el oyente de la plataforma se va antes de tu mejor pasaje. Eso no es contentar al mercado: es respetar el tiempo de quien te escucha.',
        ] },
    ],
    examples: [
      'Prompt que usa los cuatro conceptos juntos: «synth-pop, 112 BPM, La menor, voz masculina en rango medio con falsete solo en el último verso, versos con bajo y pulso en negras, pre-coro sumando arpegio de sintetizador en corcheas, coro con cuatro capas y platillos a doble tempo, puente a voz y pad, estructura total 2:50 con el primer coro antes del minuto 0:55, mezcla con sub-grave controlado y agudos suaves».',
      'Medición real en bitácora: «canción A: cuento 92 con el pie, la app marca 184 → estaba escuchando corcheas, BPM correcto 92. Modo menor. Nota final del coro en Re → tonalidad Re menor. Energía: 2 capas en verso, 5 en coro». Cuatro datos y ya puedes replicar la receta.',
      'Decisión de estructura por segundos: intro 8 s, verso 16 s, pre-coro 8 s, coro 16 s, verso 16 s, coro 24 s, puente 8 s, coro final 24 s, outro 8 s = 2:32. Escrito así, el motor entiende de largo y el resultado llega con la forma pedida.',
    ],
    techniques: [
      'Conteo de 15 segundos: marca el golpe obvio con el pie, cuenta los golpes en 15 segundos y multiplica por cuatro. Verifica con una app de tapping para descartar el doble o la mitad.',
      'Prueba del último acorde: para identificar tonalidad y modo sin teoría, escucha la nota con la que cierra el coro y cántala; si suena resuelta y luminosa tiende a mayor, si queda suspendida o sombría tiende a menor.',
      'Curva en cinco puntos: dibuja la energía de la referencia en cinco momentos (primer verso, primer coro, segundo verso, puente, último coro) del 1 al 5. Ese dibujo es tu instrucción de dinámica.',
      'Presupuesto de segundos: escribe la estructura como suma de segundos y revisa el total antes de generar. Si el total no cabe en la duración pedida, el motor inventará un final.',
      'Coro antes del minuto uno: regla de operación para música de plataforma; si tu coro llega después, adelanta la forma o acepta una tasa de abandono alto.',
    ],
    prompts: [
      { name: 'Ficha de los cuatro conceptos', outcome: 'Un prompt donde BPM, modo, curva de energía y estructura con tiempos quedan explícitos.',
        variables: ['género', 'BPM', 'straight, halftime o doble', 'tonalidad', 'modo', 'estrecho, medio o amplio', 'nivel 1-5', 'capas', 'nivel', 'instrumento', 'elemento que abre el espectro', 'elemento que queda solo', 'intro', 'verso', 'pre-coro', 'coro', 'puente', 'coro final', 'outro', 'duración', 'graves', 'agudos', 'espacio'],
        text: 'Género: {género}. Tempo: {BPM} BPM, feel {straight, halftime o doble}. Tonalidad: {tonalidad} en {modo}, melodía vocal en rango {estrecho, medio o amplio}. Energía por sección: verso {nivel 1-5} con {capas}, pre-coro {nivel} sumando {instrumento}, coro {nivel} con {elemento que abre el espectro}, puente {nivel} con {elemento que queda solo}. Estructura en segundos: {intro} / {verso} / {pre-coro} / {coro} / {puente} / {coro final} / {outro}, total {duración}. Mezcla: {graves}, {agudos} y {espacio}.' },
      { name: 'Auditoría de energía por secciones', outcome: 'Convertir una canción plana en una curva con entradas y salidas concretas.',
        variables: ['género', 'BPM', 'n', 'suave o seco', 'elemento rítmico que duplica subdivisión', 'elemento grave', 'elemento agudo', 'doblada o sencilla', 'voz más un instrumento', 'una capa adicional respecto al anterior'],
        text: 'Mantén {género} y {BPM} BPM, y reescribe solo la dinámica: versos con {n} capas y ataque {suave o seco}; pre-coro en ascenso con {elemento rítmico que duplica subdivisión}; coros con {elemento grave}, {elemento agudo} y voz {doblada o sencilla}; puente reducido a {voz más un instrumento}; último coro con {una capa adicional respecto al anterior}. El cambio de energía debe escucharse en la primera palabra del coro, no por volumen general.' },
    ],
    exercise: {
      title: 'Radiografía de tres canciones de referencia', deliverable: 'Una tabla con tres filas (BPM, feel, modo y tonalidad, estructura en segundos, curva de energía) y un prompt derivado de la fila que más te interesa.',
      steps: [
        'Elige tres canciones de géneros distintos que te gusten y escúchalas completas una vez sin anotar nada.',
        'Mide el BPM con el conteo de 15 segundos y confírmalo con una app; anota también si el feel es recto, a medio tiempo o doble.',
        'Identifica el modo y la tonalidad probable con la prueba del último acorde, y marca si la melodía vocal usa un rango estrecho o amplio.',
        'Escribe la estructura con nombres y segundos de cada bloque, hasta que la suma coincida con la duración real de la canción.',
        'Dibuja la curva de energía en cinco puntos del 1 al 5 y señala qué instrumento entra o sale en cada cambio.',
        'Redacta un prompt con la ficha de los cuatro conceptos que replique esa receta pero con tu propio tema y tu propia voz.',
      ],
      checklist: [
        'El BPM de cada canción está medido, no adivinado, y confirmado con una app.',
        'La suma de los bloques en segundos coincide con la duración real, con tolerancia de cinco segundos.',
        'La curva de energía menciona qué instrumento entra o sale en cada cambio, no solo «sube» o «baja».',
        'El prompt final replica la estructura medida sin copiar ninguna melodía ni nombre de obra.',
      ],
    },
    listening: [
      { title: 'Groove de pop funk: línea de bajo que ES el pulso', search: 'Michael Jackson Billie Jean bass drum groove separation análisis de mezcla',
        focus: 'Escucha el bajo y la batería como una sola máquina. Marca con el pie el pulso y comprueba si el BPM se siente recto o con síncopas; después cuenta cuántos instrumentos suenan en el verso, normalmente muy pocos.' },
      { title: 'Son cubano: el tres como guitarra de acompañamiento', search: 'Buena Vista Social Club Chan Chan tres cubano clave pattern son montuno',
        focus: 'Localiza el patrón arpegiado del tres cubano y la clave rítmica por encima del bajo. Escucha cómo un solo instrumento repite la misma figura toda la canción y aun así la energía se sostiene: eso es groove con una capa.' },
      { title: 'Balada con curva dramática', search: 'José José El Triste dinámica vocal balada crescendo arreglo análisis',
        focus: 'En una balada en español con final de ópera, sigue la voz: cuándo cambia de pecho a cabeza, cuándo entra el vibrato y cuántas capas instrumentales hay en el primer verso frente al último coro. Es una clase de dinámica sin efectos.' },
    ],
    pitfalls: [
      { mistake: 'Pedir «tempo medio» en lugar de un número de BPM.', fix: 'Escribe el BPM y el feel: «92 BPM, halftime». El número ancla el género; el feel explica por qué no parece rápido.' },
      { mistake: 'Confundir energía con volumen general.', fix: 'Pide densidad de capas, subdivisión y ataques. El volumen lo decide la masterización, la energía la decide el arreglo.' },
      { mistake: 'Escribir la estructura sin duración por bloque.', fix: 'Agrega segundos o compases a cada sección y revisa que la suma quepa en la duración total pedida.' },
      { mistake: 'Asumir que el motor respetó la tonalidad que escribiste.', fix: 'Verifica con la nota final del coro y, si necesitas precisión, entrega la progresión en grados romanos además del nombre de la tonalidad.' },
    ],
    takeaway: 'BPM, modo, energía y estructura no son vocabulario de conservatorio: son los cuatro mandos que el motor obedece.',
  },
  {
    id: 'm01-l03', moduleIndex: 1, lessonNumber: 3,
    title: 'Ejercicio: describe una escena en cinco decisiones musicales', kicker: 'Sesión 03 · Práctica guiada', minutes: 12,
    objective: 'Cerrar el módulo entregando un brief de una canción con cinco decisiones y una referencia, listo para convertirse en prompt.',
    blocks: [
      { heading: 'Qué es un brief y por qué se escribe antes de generar', body: [
          'Un brief es una hoja de una cara donde quedas claro contigo mismo antes de gastar generaciones. Contiene la escena, la función de la canción (dónde va a sonar), las cinco decisiones, una referencia de sonido y un criterio de éxito escrito. Parece burocracia; en realidad es lo que impide que passes doscientas generaciones persiguiendo una idea que no supiste formular en dos minutos.',
          'La diferencia entre un brief y un prompt es el nivel de detalle. El brief explica el porqué de cada decisión y qué se considera éxito; el prompt es la traducción comprimida. Cuando un resultado no te gusta, si tienes brief corriges la decisión; si solo tienes prompt, corriges la suerte. En las colaboraciones profesionales el brief además se comparte, así que el músico o el cliente entienden tu intención sin leer tu mente.',
        ] },
      { heading: 'Las cinco decisiones, con formato obligatorio', body: [
          'Primera: género y subgénero, uno solo. Segunda: tempo en BPM más el feel. Tercera: tonalidad y modo, más el rango vocal que necesitas. Cuarta: descripción de voz en cuatro ejes (registro, textura, articulación, acento), o «instrumental» con la melodía protagonista. Quinta: estructura con segundos y curva de energía por bloque. Si alguna casilla queda vacía, no es un brief: es un deseo con buena redacción.',
          'Añade dos campos que casi nadie pone y que salvan la sesión. Uno: qué NO quieres, en dos líneas («sin palmas gospel, sin voz femenina con vibrato, sin drop de dubstep»). El motor también obedece exclusiones explícitas. Dos: la referencia de mezcla, descrita como espacio, no como marca («reverberación corta, voz delantera, graves concentrados en el centro, agudos sin filo»).',
        ] },
      { heading: 'Cómo saber si tu brief es suficientemente bueno', body: [
          'Con tres pruebas. Prueba del compañero: alguien que no conoce tu idea lee el brief y puede generar algo que tú aceptarías; si no, falta información. Prueba de la exclusión: dos de tus «no quiero» sobrevivieron y el resultado no los violó. Prueba del criterio: al escuchar puedes decir en voz alta si cumpliste el criterio de éxito escrito, sin cambiar la definición a posteriori.',
          'Y una advertencia de método: el brief se puede corregir, pero no se reescribe a mitad de generación. Si cambias la escena entera después de la tercera toma, no estás iterando, estás abandonando. Registra el cambio como versión nueva con fecha. Ese hábito es el que hace que a la semana puedas explicar qué aprendiste, que es el único activo que te queda.',
        ] },
    ],
    examples: [
      'Brief real de un alumno: «Escena: un mercado a las siete de la mañana antes de abrir. Función: tema de apertura para un podcast de cocina. Género: cumbia electrónica suave, 96 BPM feel recto. Tonalidad: La menor, melodía protagonista en sintetizador, rango medio. Voz: instrumental, con una frase cantada sin palabras solo en el coro. Estructura: intro 8 s, A 16 s, B 16 s, A 16 s, coda 8 s, total 1:10, energía 2-2-3-4-2. No quiero: ni trompetas brillantes, ni dembow, ni voz susurrada íntima. Referencia de mezcla: percusión seca al frente, bajo corto, estéreo moderado. Criterio de éxito: alguien dice qué hora es solo con escucharlo».',
      'Del brief al prompt: «cumbia electrónica instrumental, 96 BPM, La menor, melodía en sintetizador de timbre redondo, güira y percusión latina seca al frente, bajo eléctrico corto sin sub-grave, frase vocal sin palabras doblada en el bloque B, estructura 8/16/16/16/8 segundos, energía que sube en el bloque B y baja en la coda, mezcla seca con reverberación corta y estéreo moderado». Observa que el prompt no dice «mañana» ni «mercado»: dice las decisiones.',
      'Un brief fallido y su corrección: «quiero algo lindo y nostálgico para el video de mi papá». Corrección con las cinco casillas: «vals peruano moderno, 108 BPM, Mi mayor, guitarra criolla arpegiada en versos, cajón entrando en el segundo compás, voz masculina madura con vibrato suave y acento limeño, estructura verso-coro-verso-coro-total 2:40, energía 2-3-2-4, sin sintetizadores ni batería electrónica; criterio de éxito: que mi hermana lo reconozca como la música de su infancia».',
    ],
    techniques: [
      'Casillas obligatorias: escribe el brief en una tabla de seis filas (género, tempo/feel, tonalidad/rango, voz, estructura/dinámica, mezcla) y no generes hasta que esté llena.',
      'Dos exclusiones explícitas: declara qué no quieres. Reducen más el ruido que añadir un adjetivo positivo más.',
      'Referencia de mezcla sin marca: describe espacio, espectro y profundidad en palabras medibles, en lugar de decir «que suene como tal canción».',
      'Prueba de la hora: si tu música debe evocar una escena concreta, pide a alguien que adivine la hora, el lugar o el clima. Si falla, falta una decisión.',
      'Versión con fecha: si cambias la escena, guarda el brief anterior con fecha y abre uno nuevo. Nunca borres: colecciona decisiones.',
    ],
    prompts: [
      { name: 'Brief de una canción en seis campos', outcome: 'Producir la hoja de brief completa antes de escribir el prompt.',
        variables: ['escena', 'destino', 'género y subgénero', 'BPM', 'recto, medio tiempo o doble', 'tonalidad', 'modo', 'estrecho, medio o amplio', 'registro', 'textura', 'articulación', 'acento', 'melodía protagonista', 'bloque 1 en segundos, nivel 1-5', 'bloque 2', 'bloque 3', 'bloque 4', 'duración', 'graves', 'agudos', 'espacio', 'exclusión 1', 'exclusión 2', 'qué debe notar un oyente'],
        text: 'Escena (una frase, sin adjetivos emocionales): {escena}. Función y destino (dónde va a sonar): {destino}. 1) Género: {género y subgénero}. 2) Tempo: {BPM} BPM con feel {recto, medio tiempo o doble}. 3) Tonalidad: {tonalidad} en {modo}, rango vocal {estrecho, medio o amplio}. 4) Voz: {registro} / {textura} / {articulación} / {acento}, o instrumental con {melodía protagonista}. 5) Estructura y energía: {bloque 1 en segundos, nivel 1-5} / {bloque 2} / {bloque 3} / {bloque 4}, total {duración}. 6) Mezcla: {graves} / {agudos} / {espacio}. No quiero: {exclusión 1}, {exclusión 2}. Criterio de éxito comprobable: {qué debe notar un oyente}.' },
      { name: 'Del brief al prompt comprimido', outcome: 'Convertir un brief de seis campos en un prompt de 25 a 45 términos.',
        variables: ['género', 'BPM', 'feel', 'tonalidad', 'modo', 'voz o melodía protagonista', 'capa rítmica', 'patrón', 'capa armónica', 'sección', 'bloque con segundos', 'nivel', 'sección clave', 'elemento que sube en el clímax', 'elemento que se retira en el puente', 'graves', 'agudos', 'espacio', 'palabras eliminadas'],
        text: 'Resume tu brief en un solo bloque, sin perder decisiones: {género}, {BPM} BPM {feel}, {tonalidad} {modo}, {voz o melodía protagonista}, {capa rítmica} con {patrón}, {capa armónica} que entra en {sección}, estructura {bloque con segundos} y energía {nivel} en {sección clave}, {elemento que sube en el clímax}, {elemento que se retira en el puente}, mezcla {graves}, {agudos} y {espacio}. Elimina toda palabra que no sea una decisión: {palabras eliminadas}.' },
    ],
    exercise: {
      title: 'Brief de una canción, del mapa sonoro al prompt', deliverable: 'Entregable del módulo: un brief de una canción con escena, emoción traducida a decisiones, referencia de mezcla, curva de energía y estructura, más el prompt final y la toma que cumplió el criterio.',
      steps: [
        'Elige una escena con lugar y hora concreta que puedas describir en una frase sin adjetivos emocionales.',
        'Declara el destino de la pieza: reel, podcast, videojuego, regalo familiar o simple canción para subir.',
        'Llena las seis casillas del brief con la plantilla y escribe dos exclusiones explícitas («sin…»).',
        'Escribe el criterio de éxito como algo que un tercero pueda notar: «que se reconozca la hora», «que den ganas de caminar».',
        'Genera dos tomas del mismo prompt en el estudio (local gratuito o con voces), escucha completa y evalúa contra el criterio escrito.',
        'Comprime el brief en un prompt final de 25 a 45 términos y guárdalo junto a la toma seleccionada en tu bitácora.',
      ],
      checklist: [
        'Las seis casillas del brief están llenas y las cinco decisiones básicas aparecen también en el prompt.',
        'El prompt tiene entre 25 y 45 términos y ninguna palabra sin función.',
        'Un oyente externo cumplió o rompió el criterio de éxito sin que tuvieras que explicárselo.',
        'Guardaste el prompt exacto, la fecha y el nombre de la toma seleccionada en la bitácora.',
      ],
    },
    listening: [
      { title: 'Música que describe un lugar', search: 'cumbia electrónica colombiana instrumentos tradicionales sintetizador análisis',
        focus: 'Escucha una pieza de cumbia electrónica y busca los elementos que anclan el lugar: un percutor tradicional, un patrón de güira o un timbre de sintetizador. Identifica qué instrumento haría la función de «hora del día» si tuvieras que componer algo similar.' },
      { title: 'Bolero de cámara: la decisión de espacio', search: 'bolero mexicano producción voz cercana reverberación contraste mezcla actual',
        focus: 'Escucha cuánta reverberación rodea a la voz y qué tan cerca está del micrófono. Compara esa cercanía con una producción urbana actual y deduce qué decisiones de mezcla producen intimidad sin cambiar la letra.' },
      { title: 'Banda sonora que evoca una escena sin palabras', search: 'film score evocar clima estación orquestación recursos análisis',
        focus: 'Elige un cue instrumental de cine y detecta cómo se logra la sensación de clima o estación: registro de las cuerdas, velocidad del arpegio, presencia de viento o ruido de fondo. Eso es una escena traducida a decisiones.' },
    ],
    pitfalls: [
      { mistake: 'Escribir el brief con la música ya sonando en la cabeza.', fix: 'Redáctalo sin audífonos y verifícalo después generando. Si tu descripción solo tiene sentido para ti, todavía no es un brief.' },
      { mistake: 'Cambiar la escena a la tercera generación.', fix: 'Termina el ciclo brief-prompt-evaluación dos veces sobre la misma escena antes de abrir una nueva. Los cambios van en la decisión, no en el objetivo.' },
      { mistake: 'Dejar vacío el campo de mezcla.', fix: 'Agrega aunque sea dos líneas sobre graves, agudos y espacio. Sin referencia de mezcla, el motor decide por ti y pierdes la comparación entre tomas.' },
      { mistake: 'Poner un criterio de éxito subjective («que me guste»).', fix: 'Reemplázalo por una reacción observable de un tercero: que adivinen la hora, que tarareen el coro, que quieran caminar.' },
    ],
    takeaway: 'Si no puedes escribir la canción en una hoja, tampoco puedes dirigirla en un prompt.',
  },
  {
    id: 'm02-l04', moduleIndex: 2, lessonNumber: 4,
    title: 'La anatomía de un prompt reproducible', kicker: 'Sesión 04 · Estructura del prompt', minutes: 15,
    objective: 'Construir prompts con campos fijos y versionados que puedas relanzar dentro de un mes y obtener el mismo tipo de resultado.',
    blocks: [
      { heading: 'Siete campos, en el mismo orden, siempre', body: [
          'Un prompt reproducible tiene siete campos: género y subgénero, BPM y feel, tonalidad y modo, voz (registro, textura, articulación, acento), instrumentación con función por capa, estructura con tiempos y dinámica, y referencia de mezcla. No es una receta mágica: es una lista de chequeo. Si un campo falta, mañana no sabrás qué cambiaste cuando el resultado sea peor, y la comparación entre tomas se vuelve imposible.',
          'El orden importa por una razón práctica: los primeros términos tienen más peso en casi todos los motores, porque la atención del modelo se concentra al inicio. Por eso el género y el tempo van primero, y las preferencias suaves de mezcla al final. Si descubres una palabra que no logra aparecer, muévela hacia el frente y vuelve a probar antes de inventar sinónimos.',
          'Escribe los campos siempre en el mismo orden y con las mismas etiquetas. Eso permite diff: dos prompts que se distinguen solo en el campo «voz» son una prueba controlada; dos prompts reescritos por completo son dos canciones distintas y ninguna conclusión aprendiste.',
        ] },
      { heading: 'Prompt de estilo, letra y campo de voz: tres cosas distintas', body: [
          'La mayoría de las plataformas separa al menos dos entradas: la descripción de estilo y la letra. Un error típico de principiante es meter la letra dentro del prompt de estilo, o la descripción de mezcla dentro de la letra. Cada caja alimenta a un subsistema distinto: estilo define el arreglo, letra define qué se canta y dónde, y las etiquetas de sección dentro de la letra ([Verso], [Coro], [Puente]) organizan la forma.',
          'Las etiquetas de sección son tu control más fino y el menos usado. Escribir [Intro instrumental], [Verso], [Pre-coro], [Coro], [Puente: solo de guitarra], [Coro final con voz doblada] dentro del texto de la letra dice cuándo entra la música, no solo qué se dice. Un prompt de estilo no puede ordenar «el solo en el minuto 2:10»; la etiqueta de sección sí puede aproximarlo.',
          'Y una advertencia sobre longitud por campo: el estilo no agradece párrafos. Dos o tres frases densas superan a diez líneas de buenas intenciones. La letra, en cambio, necesita completa: si le falta el coro, el motor lo inventa o lo omite, y ninguna de las dos opciones es la tuya.',
        ] },
      { heading: 'Versionar: la diferencia entre probar y acumular', body: [
          'Nombra cada prompt con código y cambio. Formato simple: cancion-v1, v2 con una nota de una línea («v3: subo BPM de 92 a 100, todo lo demás igual»). Sin esa nota, en dos días no sabes qué distinguía v2 de v3, y terminas re-generando cosas que ya habías descartado. La nota es lo que hace el prompt reproducible para tu yo del futuro, que es tu peor enemigo documental.',
          'Guarda además la fecha, la plataforma y el plan con que generaste. Eso sirve dos veces: para reproducir el estilo si la plataforma cambia sus modelos, y para la trazabilidad de derechos que veremos en el módulo 5, donde hace falta poder afirmar cuándo y con qué herramienta se hizo una toma concreta.',
          'Regla de tres versiones: si con tres cambios documentados sobre una misma decisión no mejoras el resultado, la decisión está mal elegida o la plataforma no es capaz de entregarla. Cambia el enfoque, no la formulación. Guardar veinte variaciones de un prompt que no funciona no es iterar: es posponer una decisión.',
        ] },
    ],
    examples: [
      'Prompt de estilo reproducible (7 campos): «indie pop latino, 104 BPM feel recto, Re mayor, voz femenina registro medio con aire y articulación clara en español neutro, versos con guitarra rítmica y bajo redondo, pre-coro sumando pandereta y arpegio de teclas, coro con cuerdas largas y batería amplia, estructura intro 8 s, verso 16, pre-coro 8, coro 16, puente 8, coro 24, outro 8; mezcla con voz delantera, graves controlados sin sub, agudos suaves». Guarda esta forma en tu bitácora y reutilízala.',
      'Diff real entre dos versiones: v2 «…94 BPM…» frente a v3 «…100 BPM, todo lo demás idéntico…». En v3 el verso resultó más narrado y el coro menos pesado. Conclusión registrada: el problema era tempo, no instrumentación. Con un prompt reescrito por completo, esa conclusión no existía.',
      'Prompt mal formado y su reconstrucción: «canción bonita de amor con buen sonido, voz femenina tipo balada, que explote». Reconstrucción: «balada pop, 76 BPM, Sol mayor, voz femenina en registro medio con vibrato suave y dicción clara, piano de fieltro y cuerdas en versos, batería con escobillas entrando en pre-coro, coro con guitarra eléctrica en acordes abiertos y bajo en octavas, puente reducido a voz y piano, estructura total 3:20 con primer coro en 1:12, mezcla cálida con reverberación larga en coros y voz delantera en versos». Cinco palabras de opinión se convirtieron en ocho decisiones auditables.',
    ],
    techniques: [
      'Campos fijos: usa la misma lista de siete etiquetas en cada prompt y en el mismo orden, para poder comparar dos tomas como se comparan dos líneas de un spreadsheet.',
      'Peso por posición: pon género, BPM y voz al inicio; mezcla y adornos al final. Si una instrucción se ignora, muévela al frente antes de cambiarla de palabra.',
      'Diff de una línea: al versionar, cambia un solo campo y escribe en la nota qué campo cambió y a qué valor. Si no puedes escribirlo, estás cambiando dos cosas.',
      'Etiquetas de sección en la letra: [Intro], [Verso], [Pre-coro], [Coro], [Puente: …], [Outro] para controlar cuándo entra la música y no solo qué se dice.',
      'Techo de tres versiones: tras tres cambios documentados sin mejora, cambia la decisión o la herramienta; no la redacción.',
    ],
    prompts: [
      { name: 'Prompt maestro de siete campos', outcome: 'Un prompt completo y estable que puedes relanzar con cualquier generador.',
        variables: ['género y subgénero', 'BPM', 'recto, medio tiempo o doble', 'tonalidad', 'modo', 'registro', 'textura', 'articulación', 'acento', 'idioma', 'capa rítmica', 'patrón', 'capa armónica', 'capa que entra en el coro', 'elemento de contraste en el puente', 'intro con segundos', 'verso', 'pre-coro', 'coro', 'puente', 'coro final', 'outro', 'duración', 'qué sube en el coro', 'qué se retira en el puente', 'graves', 'agudos', 'espacio y profundidad de la voz'],
        text: '{género y subgénero}, {BPM} BPM feel {recto, medio tiempo o doble}, {tonalidad} {modo}, voz {registro} con {textura}, {articulación} y acento {acento}, en {idioma}; instrumentación: {capa rítmica} con {patrón}, {capa armónica} en versos, {capa que entra en el coro}, {elemento de contraste en el puente}; estructura: {intro con segundos}, {verso}, {pre-coro}, {coro}, {puente}, {coro final}, {outro}, total {duración}; dinámica: {qué sube en el coro} y {qué se retira en el puente}; mezcla: {graves}, {agudos}, {espacio y profundidad de la voz}.' },
      { name: 'Etiquetas de sección para la caja de letra', outcome: 'Ordenar la forma dentro de la letra para que la estructura no dependa de la suerte.',
        variables: ['elemento que presenta el tema', 'voz y dinámica, por ejemplo baja y seca', 'versos, entre 4 y 8 líneas', 'qué sube', 'líneas del pre-coro', 'gancho repetible, 2 a 4 líneas', 'líneas del coro', 'variación respecto al verso 1', 'contraste instrumental o de perspectiva', 'elemento adicional, por ejemplo voces dobladas', 'cómo termina la canción'],
        text: '[Intro instrumental: {elemento que presenta el tema}]\n[Verso 1: {voz y dinámica, por ejemplo baja y seca}]\n{versos, entre 4 y 8 líneas}\n[Pre-coro: {qué sube}]\n{líneas del pre-coro}\n[Coro: {gancho repetible, 2 a 4 líneas}]\n{líneas del coro}\n[Verso 2: {variación respecto al verso 1}]\n[Coro]\n[Puente: {contraste instrumental o de perspectiva}]\n[Coro final: {elemento adicional, por ejemplo voces dobladas}]\n[Outro: {cómo termina la canción}]' },
      { name: 'Nota de versionado para bitácora', outcome: 'Registrar cada prompt de forma que se pueda reproducir y auditar meses después.',
        variables: ['canción', 'n', 'fecha', 'plataforma y plan', 'si la plataforma lo declara', 'campo', 'valor anterior', 'valor nuevo', 'prompt pegado', 'mm:ss', 'qué se escuchó del cambio', 'continuar, revertir o abandonar'],
        text: '{canción}-v{n} · {fecha} · plataforma {plataforma y plan} · modelo {si la plataforma lo declara} · cambio único: {campo} de {valor anterior} a {valor nuevo} · prompt exacto: {prompt pegado} · duración generada {mm:ss} · resultado: {qué se escuchó del cambio} · decisión: {continuar, revertir o abandonar}.' },
    ],
    exercise: {
      title: 'Escribir, versionar y relanzar un prompt de siete campos', deliverable: 'Un prompt maestro de siete campos con tres versiones documentadas y la conclusión escrita de qué casilla produce qué efecto.',
      steps: [
        'Toma el brief de la Sesión 03 y escríbelo otra vez como prompt de siete campos, en el mismo orden y con las mismas etiquetas.',
        'Genera la toma v1 y anótala con la plantilla de versionado, pegando el prompt exacto y la duración real.',
        'Cambia una sola casilla (BPM, modo, voz o instrumentación) y genera v2 con nota de una línea.',
        'Cambia otra casilla distinta y genera v3. Escucha las tres seguidas, sin pausa, en el mismo volumen.',
        'Relanza v1 una semana después: si el resultado sigue siendo de la misma familia, tu prompt es reproducible; si no, anota qué campo era ambiguo.',
      ],
      checklist: [
        'Las tres versiones difieren en un solo campo cada una y la nota lo dice explícitamente.',
        'El prompt pegado en la bitácora es idéntico al que enviaste, copiado y no resumido.',
        'Puedes afirmar qué cambió en el audio por cada modificación, con un pasaje concreto como evidencia.',
        'Ninguna versión menciona nombres de artistas ni de obras registradas.',
      ],
    },
    listening: [
      { title: 'Dos tomas del mismo material', search: 'canción versión demo versus master comparación de producción y arreglo',
        focus: 'Busca una misma canción en versión demo y versión de estudio. Escucha qué cambió: arreglo, espacio de la voz, densidad; no la melodía. Así entrenas el oído para separar la decisión del resultado, que es lo que hace falta al comparar tus v1, v2 y v3.' },
      { title: 'Reggaetón con arreglo minimalista', search: 'reggaetón minimalista pads atmosféricos flow conversado análisis de producción',
        focus: 'Cuenta los campos del prompt que hace falta para describir esta clase de tema: tempo, patrón de dembow, pad atmosférico, voz en registro bajo con flow conversado. Escucha cómo el arreglo dice mucho con pocos elementos, que es exactamente lo que un prompt de siete campos intenta controlar.' },
    ],
    pitfalls: [
      { mistake: 'Meter la letra dentro del prompt de estilo.', fix: 'Usa cada caja para lo suyo: estilo describe el arreglo; la letra se pega en su propio campo, con etiquetas de sección.' },
      { mistake: 'Cambiar todo el prompt entre tomas y concluir que la IA «no hace caso».', fix: 'Vuelve a los siete campos y cambia uno solo. Sin diff no hay conclusión, solo ruido.' },
      { mistake: 'No guardar la plataforma, el plan ni la fecha.', fix: 'Agrega esos datos a la nota de versionado. Son la única trazabilidad que tendrás cuando hables de derechos o colabores con alguien.' },
      { mistake: 'Escribir diez líneas de adornos y ninguna decisión.', fix: 'Reduce a ocho o doce términos de decisión. Cada adjetivo decorativo que no sea medible puede desplazar el vecindario sonoro que buscabas.' },
    ],
    takeaway: 'Un prompt es reproducible si al releerlo en un mes puedes cambiar una palabra y saber qué esperar.',
  },
  {
    id: 'm02-l05', moduleIndex: 2, lessonNumber: 5,
    title: 'Voz, género, instrumentación, tempo y mezcla en una sola dirección', kicker: 'Sesión 05 · Dirección completa', minutes: 18,
    objective: 'Escribir una sola instrucción que dirija los cinco frentes sin que unos se coman a los otros.',
    blocks: [
      { heading: 'Voz: cuatro ejes y el idioma', body: [
          'La voz es el elemento que el oído juzga primero y el que los prompts descuidan más. Dirígela en cuatro ejes: registro (grave, medio, agudo; y si quieres, «con falsete solo en el coro»), textura (sucia, aterciopelada, metálica, con aire), articulación ( Clara y percusiva, legada y suave, conversada) y acento (español neutro, caribeño, rioplatense, castellano, inglés con acento latino). Cuatro etiquetas concretas valen más que «voz bonita».',
          'Decide también el idioma en el prompt de estilo, no solo en la letra. Si la plataforma no recibe instrucciones de idioma y la letra está en español, igual conviene escribir «canto en español» en el estilo: refuerza la fonética y reduce las sílabas mal pegadas al pulso. Y declara si la voz es principal o doble: «voz principal con doblaje en coros, sin armonías» o «armonías de tercera en el coro final».',
          'Una nota seria: suplantación no es dirección. Clonar la voz de una persona real sin su consentimiento, o pedirla por nombre, suele estar prohibido por los términos de servicio de las plataformas y puede constituir violación de derechos de imagen y de voz. Lo que sí puedes hacer —y es lo profesional— es describir propiedades vocales que evocan una actitud sin apropiarse de una identidad.',
        ] },
      { heading: 'Género y subgénero: uno, no una lista', body: [
          'Escribir «pop, rock, latino, urbano, electrónico» no amplía opciones: diluye la dirección. El motor promedia los vecindarios y entrega un pastiche sin pulso claro. Elige un género y un subgénero, y si quieres influencia adicional declárala como elemento concreto: «pop, con guitarra de rock en el puente». La influencia como capa es una instrucción; la influencia como etiqueta es ruido.',
          'El subgénero es donde está el control útil. «Reggaetón» es una plaza enorme; «reggaetón nocturno minimalista con dembow suave» ya limita percusión, armonía y espacio. «Rock» no dice nada; «rock post-punk con bajo de octavas y batería seca» dice casi todo. Baja un nivel en la jerarquía del género cada vez que el resultado suene genérico.',
        ] },
      { heading: 'Instrumentación con función, no con lista de compras', body: [
          'Enumerar instrumentos («piano, guitarra, cuerdas, sintetizador, bajo, batería») produce una sopa: todo suena todo el tiempo. Asigna función y sección: el bajo duplica el bombo y sostiene la fundamental; la guitarra hace corcheas en el pre-coro; el pad ocupa el fondo y nunca el centro; las cuerdas entran solo en coros. Una capa sin función se lee como relleno en la mezcla y te roba claridad.',
          'Trabaja en rangos: pide que los instrumentos agudos no pisen la voz. En una balada, cuerdas largas por encima de la melodía vocal compiten en el mismo territorio; cuerdas en notas largas por debajo o en octava superior muy suave dejan espacio. En música urbana, el sub-bajo y el bombo se reparten el grave: si pides ambos «muy presentes», el resultado se embarra por debajo de 120 Hz.',
          'Regla operativa: tres capas en el verso, cinco en el coro, una o dos en el puente. Ese presupuesto de arreglo es lo que produce dinámica audible sin tocar el volumen, y es la instrucción que más rápido mejora los resultados de un principiante.',
        ] },
      { heading: 'Tempo, feel y dónde pegas la melodía', body: [
          'El número de BPM no basta: 100 BPM puede sentirse recto, con swing o a medio tiempo. Añade siempre el feel y el ancla rítmica: «100 BPM, feel recto con hi-hat en corcheas» o «160 BPM, feel de medio tiempo, pulso en negras». Con eso evitas el error clásico de pedir velocidad y obtener una canción que suena dos veces más rápida de lo que querías.',
          'También decides contra qué pulso canta la melodía. «Fraseo atrasado, la voz entra medio tiempo después del primer tiempo» produce una interpretación relajada; «fraseo adelantado y percusivo, cada sílaba sobre una corchea» produce tensión y energía. Esa frase de una línea es la que separa un rap cantado de una frase melódica pegada al beat, y casi nadie la escribe.',
        ] },
      { heading: 'Mezcla: cuatro palabras que sí se oyen', body: [
          'En un generador musical no mezclas, pero sí describes el resultado que quieres. Cuatro ejes funcionan: graves («sub-grave presente y corto» o «graves controlados sin sub»), agudos («agudos brillantes» frente a «agudos suaves, sin filo»), espacio («reverberación corta y voz delantera» frente a «reverberación larga, voz lejana») y estéreo («centro ocupado por voz y bombo, estéreo ancho solo en cuerdas»). Con esas cuatro frases cambias la impresión de producción más que diez adjetivos de mood.',
          'Sé realista sobre el control: estas instrucciones mueven el balance general, no ecualizan una frecuencia específica. Si necesitas precisión, vas a tener que exportar y ajustar en un estudio externo, tema que el módulo 5 retoma. Aquí el objetivo es que la primera entrega llegue ya cerca de lo que pides, para que iteres de arreglo y no de parches.',
        ] },
    ],
    examples: [
      'Dirección de los cinco frentes en un solo prompt: «urban pop latino, 92 BPM feel de medio tiempo con dembow suave, Do# menor, voz masculina en registro bajo con textura aterciopelada, articulación conversada y acento caribeño, canto en español; pads de sintetizador en el fondo sin invadir el centro, bajo sub-grave duplicando el bombo, guitarra eléctrica con trémolo solo en el puente, tres capas en versos y cinco en coros; fraseo atrasado medio tiempo; mezcla con graves cortos y controlados, agudos suaves, reverberación corta y voz delantera».',
      'Decisión de reparto espectral: «balada pop, 74 BPM, Mi mayor, voz femenina media con aire; piano de fieltro en registro medio-grave, cuerdas en notas largas una octava arriba de la melodía solo en coros, bajo sintetizado suave sin sub-grave hasta el segundo coro; mezcla con centro libre para la voz, reverberación larga en coros y corta en versos». Observa que las cuerdas no se escriben por encima de la voz, sino una octava arriba y en notas largas: ahí está el espacio.',
      'Error corregido en vivo: primer prompt «pop con guitarra, sintetizador, coro amplio» produjo una pared de sonido; segundo prompt conservó género y tempo y solo cambió el presupuesto de capas: «dos capas en versos, cuatro en coros, una en el puente». El problema no era la instrumentación, era la cantidad simultánea.',
    ],
    techniques: [
      'Cuatro etiquetas de voz: registro, textura, articulación y acento, siempre en ese orden y todas en el mismo campo; así sabes en qué eje mover cuando la voz no funciona.',
      'Influencia como capa: prohibido apilar géneros en la etiqueta; permite una influencia redactada como instrumento en una sección («guitarra de rock en el puente»).',
      'Presupuesto de capas: tres en verso, cinco en coro, una o dos en puente. Es la forma más barata de crear dinámica audible.',
      'Ancla de feel: después del BPM escribe qué instrumento marca la subdivisión; evita que el tempo se sienta el doble o la mitad.',
      'Cuatro frases de mezcla: graves, agudos, espacio y estéreo. Un campo de mezcla con esas cuatro palabras rinde más que un párrafo sobre «calidad de estudio».',
    ],
    prompts: [
      { name: 'Dirección vocal completa en cuatro ejes', outcome: 'Un campo de voz que el motor puede ejecutar y que tú puedes auditar.',
        variables: ['principal, masculina o femenina', 'grave, medio o agudo', 'rango limitado o amplio', 'transición a falsete o belting', 'sección', 'aterciopelada, metálica, sucia o con aire', 'percusiva, legada o conversada', 'español neutro, caribeño, rioplatense, castellano u otro', 'idioma', 'baja, media o alta', 'sin vibrato, suave, marcado', 'sin doblajes, doblaje en coros o armonías de tercera', 'voz delantera pegada al micrófono o voz lejana en la música'],
        text: 'Voz {principal, masculina o femenina} en registro {grave, medio o agudo}, con {rango limitado o amplio} y {transición a falsete o belting} en {sección}; textura {aterciopelada, metálica, sucia o con aire}; articulación {percusiva, legada o conversada}; acento {español neutro, caribeño, rioplatense, castellano u otro}; idioma del canto: {idioma}; cantidad de aire: {baja, media o alta}; vibrato: {sin vibrato, suave, marcado}; doblajes: {sin doblajes, doblaje en coros o armonías de tercera}; colocación en la mezcla: {voz delantera pegada al micrófono o voz lejana en la música}.' },
      { name: 'Instrumentación con función y presupuesto', outcome: 'Reemplazar la lista de instrumentos por capas con tarea, sección y rango.',
        variables: ['bombo o patrón', 'subdivisión', 'bajo o sub', 'duplica el bombo o camina por el acorde', 'límite de registro', 'piano, guitarra o pad', 'medio o grave', 'sección', 'instrumento', 'una octava sobre o por debajo de la voz', 'perk o textura', 'estéreo', 'fondo', 'n', 'm', 'k', 'voz, bombo y bajo'],
        text: 'Capa rítmica: {bombo o patrón} con {subdivisión}, marca el pulso. Capa grave: {bajo o sub} que {duplica el bombo o camina por el acorde}, sin pasar de {límite de registro}. Capa armónica: {piano, guitarra o pad} en registro {medio o grave}, entrada en {sección}. Capa de contraste: {instrumento} solo en {sección}, en registro {una octava sobre o por debajo de la voz}. Capa de aire: {perk o textura} en {estéreo}, volumen {fondo}. Presupuesto: {n} capas en versos, {m} en coros, {k} en el puente. Centro del espectro reservado para {voz, bombo y bajo}.' },
    ],
    exercise: {
      title: 'Una instrucción, cinco frentes', deliverable: 'Un prompt de dirección completa con los cinco frentes cubiertos y una tabla de auditoría con cinco casillas verificadas en el audio.',
      steps: [
        'Toma tu prompt maestro de la Sesión 04 y verifícalo frente a los cinco frentes: voz, género, instrumentación con función, tempo y feel, mezcla. Subraya qué falta.',
        'Reescribe el campo de voz con las cuatro etiquetas (registro, textura, articulación, acento) más idioma y doblajes.',
        'Convierte tu lista de instrumentos en cinco capas con función, sección de entrada y rango, aplicando el presupuesto 3-5-1.',
        'Añade el ancla de feel y las cuatro frases de mezcla (graves, agudos, espacio, estéreo).',
        'Genera y escucha con una pregunta por frente: ¿se oye la voz en el registro pedido?, ¿hay tres capas en el verso?, ¿el centro está libre? Registra las respuestas y abre v2 con un solo frente modificado.',
      ],
      checklist: [
        'Los cinco frentes están presentes y ninguno está escrito como lista de adjetivos.',
        'Cada instrumento del prompt tiene función, sección de entrada y rango declarados.',
        'El campo de voz incluye los cuatro ejes, idioma y una instrucción de doblaje o armonía.',
        'En la auditoría puedes afirmar qué frente se cumplió y cuál no, con un pasaje de evidencia.',
      ],
    },
    listening: [
      { title: 'Dirección de voz en español: articulación y acento', search: 'bachata dominicana guitarra arpegio corcheas voz al frente articulación',
        focus: 'Escucha una bachata y detecta cómo la articulación y el acento definen el género más que la letra: frases ligadas, vibrato al final del verso, voz al frente con poco eco. Después identifica qué instrumento hace la función de arpegio en corcheas.' },
      { title: 'Neo soul: registro, aire y fraseo atrasado', search: 'neo soul fraseo atrasado detrás del beat voz con aire análisis',
        focus: 'Pon atención en contra qué pulso canta la melodía: el fraseo va por detrás del bombo, con mucho aire y rango bajo. Eso es una instrucción de feel aplicada a la voz, y explica por qué la canción suena relajada sin ser lenta.' },
      { title: 'Cumbia electrónica: presupuesto de capas', search: 'cumbia electrónica estructura densidad de capas percusión puente',
        focus: 'Cuenta capas en el primer verso y en el coro. La diferencia de densidad hace toda la dinámica. Localiza qué percutor se queda en el puente cuando todo lo demás sale.' },
    ],
    pitfalls: [
      { mistake: 'Pedir una voz de artista real por nombre.', fix: 'Describe los cuatro ejes vocales. Además de bloquearse o degradar el resultado, puede violar los términos de la plataforma y derechos de imagen y voz.' },
      { mistake: 'Apilar géneros en la misma etiqueta.', fix: 'Elige género y subgénero, y convierte cualquier otra influencia en un instrumento con sección.' },
      { mistake: 'Escribir instrumentación sin rango y competir con la voz.', fix: 'Declara en qué registro entra cada capa y reserva el centro para voz, bajo y bombo.' },
      { mistake: 'Confiar en «mezcla profesional» como instrucción.', fix: 'Sustitúyela por graves, agudos, espacio y estéreo. Si la plataforma no lo logra, exporta y ajusta en un estudio externo.' },
    ],
    takeaway: 'Una dirección vale por sus cinco frentes: voz, género, capas con función, feel y mezcla; si falta uno, decide la máquina.',
  },
  {
    id: 'm02-l06', moduleIndex: 2, lessonNumber: 6,
    title: 'Cómo iterar: una variable a la vez y escucha crítica', kicker: 'Sesión 06 · Iteración', minutes: 16,
    objective: 'Sustituir el «genera otra vez a ver si sale mejor» por un protocolo de prueba con una variable y escucha comparable.',
    blocks: [
      { heading: 'Por qué dos tomas iguales no suenan iguales', body: [
          'Los motores de generación son estocásticos: muestrean dentro de un vecindario de probabilidad. Con el mismo prompt obtendrás variaciones, y esas variaciones tienen un tamaño real: en una misma toma pueden cambiar la longitud del intro, el timbre de la voz o si aparece un pasaje instrumental. Por tanto, comparar dos tomas sin haber cambiado nada no te dice nada sobre tu prompt: te muestra el ruido de base de la herramienta.',
          'De ahí la regla de oro: para atribuir un efecto a una decisión necesitas una prueba controlada, no una corazonada. Cambia una sola variable, genera al menos dos tomas con esa variable nueva y escucha las dos. Si el cambio aparece en ambas, es la variable; si aparece en una sola, era ruido. Este pequeño aumento de costo te ahorra semanas de ajustes persiguiendo casualidades.',
        ] },
      { heading: 'Protocolo A/B en cuatro pasos', body: [
          'Uno: escribe la hipótesis en una línea («si subo el BPM a 100, el verso va a sonar más narrado y el coro menos pesado»). Dos: copia el prompt exacto y cambia únicamente el campo de la hipótesis, con nota de una línea. Tres: genera dos tomas por versión, cuatro audios en total. Cuatro: escúchalos en orden A1, B1, A2, B2, en el mismo volumen y en los mismos audífonos, anotando un comentario por audio antes de escuchar el siguiente.',
          'Ese orden importa. El cerebro recuerda mal y compara peor: si escuchas las cuatro tomas seguidas y anotas al final, vas a recordar las dos últimas. Anotar en el momento, aunque sea una línea por audio, convierte una sesión de gusto en un experimento. Y si puedes, evalúa a ciegas con otra persona: la etiqueta A o B cambia decisiones reales más de lo que cualquiera quiere admitir.',
          'Define antes de empezar cuándo paras. Sin criterio de salida, la iteración se convierte en procrastinación con forma de trabajo: diez versiones del mismo defecto, cada una justificada con un adjetivo nuevo. El criterio de salida se escribe en la hipótesis: «si la tercera versión sigue sin resolver el coro, cambio la melodía del gancho y no el arreglo».',
        ] },
      { heading: 'Escucha crítica: tres pasadas con un trabajo cada una', body: [
          'Primera pasada: cuerpo y memoria. ¿Se mueve la cabeza en el coro? ¿Recuerdas el gancho al terminar? No anotes defectos todavía; solo registra qué parte volverías a escuchar y cuál te saltaste. Segunda pasada: estructura. Marca los tiempos donde empieza cada sección, cuenta cuántas capas suenan en verso y en coro, y comprueba si el puente se siente como contraste o como relleno.',
          'Tercera pasada: detalle molesto. Aquí buscas artefactos: sílabas pegadas, consonantes distorsionadas, costuras donde la forma cambia bruscamente, finales que se cortan, ruido bajo en los pasajes de silencio. Y buscas choques de espectro: si el grave se vuelve indefinible en el coro, algo está pisando al bajo. Escucha una de esas pasadas en volumen bajo: los desbalance de mezcla se notan antes; en volumen alto todo suena bien, y eso es una trampa conocida.',
          'Regla de las tres escuchas: ninguna decisión definitiva con menos de tres escuchas. La primera engaña, la segunda cansa, la tercera revela. Si en la tercera escucha un pasaje sigue molestando, ese pasaje es el problema; si sigue gustando, ese pasaje es tu activo, no tu duda.',
        ] },
      { heading: 'Qué es ajustable y qué no', body: [
          'Ajustable por prompt: género, subgénero, tempo y feel, modo, densidad y funciones de capas, carácter y registro vocal, estructura general, tipo de espacio de mezcla, intensidad de dinámica. Ajustable solo regenerando: la melodía concreta del gancho, el timbre exacto, la interpretación de una sílaba, los micro-ataques. No ajustable: lo que la plataforma no soporta (stem aislado, tempo real, arreglo de compás exacto). Aprende a reconocer la tercera categoría, que es la que separa el progreso del enojo.',
          'Cuando el defecto está en la categoría «no ajustable», cambia de estrategia: busca otra toma, edita el audio fuera con recorte y fundidos, o acepta que esa toma sirve para otro destino (un reel, un loop, una maqueta). Un productor profesional no es quien obtiene todo de una herramienta: es quien sabe qué pedirle, qué corregir después y qué renunciar.',
        ] },
    ],
    examples: [
      'Hipótesis bien escrita: «si reduzco las capas del verso de 4 a 2, el coro va a sentirse más grande sin subir volumen». Prueba: v1 con 4 capas en verso (dos tomas), v2 con 2 capas y el resto idéntico (dos tomas). Resultado anotado: en las dos tomas de v2 el coro se siente más ancho; en una de las de v1 también, así que hay efecto pero hay ruido. Decisión: conservo v2 y dejo de ajustar el coro.',
      'Hipótesis mal escrita: «probar cosas en el coro hasta que suene mejor». No hay variable, no hay resultado esperado, no hay salida. Corregida: «si pido la voz del coro doblada en octava superior, el gancho va a sostenerse en la segunda escucha». Eso se puede verificar o refutar en una sesión de veinte minutos.',
      'Criterio de salida real: «si tras tres versiones el puente sigue sonando como verso repetido, dejo de modificar el arreglo y reescribo la melodía del puente en otra sesión; no genero una cuarta versión del mismo problema». Esa línea escrita antes de empezar evitó una tarde de cuarenta generaciones.',
    ],
    techniques: [
      'Prueba de dos tomas por versión: genera dos audios con cada valor de la variable; el efecto que aparece en ambos es atribuible, el que aparece en uno es ruido.',
      'Hipótesis de una línea: escribe «si cambio {variable}, entonces {efecto esperado}». Si no puedes formulada así, todavía no tienes un experimento, tienes curiosidad.',
      'Ciegas simples: pide a alguien que elija entre A y B sin saber qué cambiaste. Su elección te dice si el efecto es audible o si eres tú justificando tu preferencia.',
      'Escucha de volumen bajo: una pasada completa a bajo volumen para detectar desbalance; si algo desaparece o se grita, ya sabes dónde está el problema.',
      'Etiquetas de defecto: clasifica cada problema en ajustable por prompt, ajustable regenerando o fuera de alcance. La tercera categoría se resuelve con edición externa o cambio de destino.',
      'Corte de tres versiones: máximo tres intentos por decisión antes de cambiar la decisión misma. El contador se registra en la bitácora.',
    ],
    prompts: [
      { name: 'Hipótesis de una variable', outcome: 'Convertir una frustración difusa en un experimento auditable de veinte minutos.',
        variables: ['nombre y número', 'campo', 'valor actual', 'valor nuevo', 'efecto audible esperado', 'sección', 'lista de campos que conservo idénticos', '2', 'A1, B1, A2, B2', '3', 'defecto', 'siguiente movimiento'],
        text: 'Versión base: {nombre y número}. Variable única a probar: {campo}, de {valor actual} a {valor nuevo}. Hipótesis: si cambio {campo}, entonces {efecto audible esperado} en {sección}. Nada más cambia: {lista de campos que conservo idénticos}. Tomas por versión: {2}. Orden de escucha: {A1, B1, A2, B2}. Criterio de salida: si tras {3} versiones {defecto} persiste, entonces {siguiente movimiento}.' },
      { name: 'Checklist de escucha crítica en tres pasadas', outcome: 'Un formato para anotar cada escucha y llegar a una decisión con evidencia.',
        variables: ['mm:ss', 'sí o no', 'nota', 'tiempos', 'n', 'm', 'palabra', 'zona', 'deliberado o cortado', 'conservar, iterar una variable, editar fuera o descartar'],
        text: 'Pasada 1 (cuerpo): ¿en {mm:ss} muevo la cabeza? ¿recuerdo el gancho {sí o no}? ¿qué parte saltaría? {nota}. Pasada 2 (forma): secciones detectadas en {tiempos}; capas en verso {n}, capas en coro {m}; ¿el puente se siente contraste? {sí o no}; duración total {mm:ss}. Pasada 3 (detalle): artefactos en {mm:ss}; sílaba mal pegada en {palabra}; choque de espectro en {zona}; final {deliberado o cortado}. Decisión: {conservar, iterar una variable, editar fuera o descartar}.' },
    ],
    exercise: {
      title: 'Iteración de una variable con escucha documentada', deliverable: 'Una tabla A/B con cuatro tomas, la hipótesis escrita, la atribución del efecto y la decisión final justificada en dos líneas.',
      steps: [
        'Identifica el defecto que más te molesta de tu mejor toma hasta ahora y escríbelo como fenómeno, no como opinión («el coro no abre», no «el coro es malo»).',
        'Elige UNA variable que crees responsable (densidad de capas, BPM, rango vocal, cantidad de aire, espacio de reverberación) y redacta la hipótesis con la plantilla.',
        'Genera dos tomas de la versión A y dos de la versión B, con el prompt base pegado y un solo campo modificado.',
        'Escucha en orden A1, B1, A2, B2, con las tres pasadas de la checklist, anotando una línea por audio antes de pasar al siguiente.',
        'Cierra con una decisión explícita: conservar, iterar otra variable, editar fuera del motor o descartar, y registra el corte de versiones para que la próxima sesión no repita el intento.',
      ],
      checklist: [
        'Solo un campo del prompt cambia entre A y B, y la nota lo verifica literalmente.',
        'Hay dos tomas por versión, no una, para poder separar efecto de ruido.',
        'Las tres pasadas están anotadas con marcas de tiempo, no con adjetivos.',
        'La decisión final incluye un criterio de salida registrado antes de la tercera versión.',
      ],
    },
    listening: [
      { title: 'A/B de una misma idea en dos arreglos', search: 'versión acústica versus versión de estudio misma canción comparación arreglo',
        focus: 'Busca una canción que exista en versión acústica y versión de estudio. Escucha qué cambió y qué se quedó: la melodía y la letra son idénticas, así que todo lo que notas es arreglo, densidad y espacio. Ese es exactamente el tipo de comparación que haces en una prueba A/B controlada.' },
      { title: 'Referencia de mezcla con poco material', search: 'trap minimalista mezcla sub-bajo claro equilibrio de graves referencia',
        focus: 'En un tema de trap o reggaetón minimalista, escucha cuántos elementos pelean por el grave y por qué el sub-bajo se siente claro. Después haz la prueba inversa: bájalo de volumen y verifica qué se pierde primero. Eso entrena la escucha de balance, que es la pasada 3 de tu checklist.' },
      { title: 'Artefactos de generación en voces sintéticas', search: 'AI generated music vocal artifacts consonants metallic listening test',
        focus: 'Escucha una canción generada con IA de dominio público o etiquetada como tal y busca costuras: sílabas pegadas, consonantes metálicas, cambios bruscos de sección. El objetivo no es criticar la herramienta: es aprender a reconocer el defecto que después buscarás en tus propias tomas.' },
    ],
    pitfalls: [
      { mistake: 'Cambiar tres variables y atribuir la mejora a la primera que pensaste.', fix: 'Una variable por versión, con prompt base pegado y diff de una línea. Sin control no hay aprendizaje acumulable.' },
      { mistake: 'Juzgar en la primera escucha y descartar la toma.', fix: 'Aplica la regla de las tres escuchas: cuerpo, forma y detalle. La primera escucha sirve para medir reacción, no para decidir.' },
      { mistake: 'Comparar audios en volúmenes distintos.', fix: 'Normaliza el volumen de las cuatro tomas antes de escuchar. Un audio percibido como más fuerte casi siempre se vota como mejor.' },
      { mistake: 'Iterar indefinidamente un defecto que la plataforma no puede resolver.', fix: 'Clasifica el defecto en «fuera de alcance» y cambia de estrategia: otra toma, edición externa o destino distinto para el audio.' },
    ],
    takeaway: 'Iterar es cambiar una cosa y poder decir qué causó qué; generar veinte veces no es iterar.',
  },
  {
    id: 'm02-l07', moduleIndex: 2, lessonNumber: 7,
    title: 'Ejercicio: tres versiones del mismo hook y checklist de calidad', kicker: 'Sesión 07 · Práctica de módulo', minutes: 20,
    objective: 'Entregar tres generaciones documentadas del mismo gancho y seleccionar una versión con justificación auditable.',
    blocks: [
      { heading: 'Un gancho, tres direccionalidades', body: [
          'Un gancho es la idea que se repite y se recuerda: dos o cuatro compases con una melodía simple y una frase verbal que cabe en una respiración. Para este ejercicio eliges un gancho y lo defiendes en tres versiones del prompt, cambiando una variable por versión. La primera versión es tu base; la segunda ataca el arreglo; la tercera ataca la interpretación o el tempo. Nunca cambies el gancho: si el gancho cambia, ya no comparas versiones, comparas canciones distintas.',
          'Escribe el gancho antes de generar, en la caja de letra con etiquetas de sección, y repítelo literalmente en las tres tomas. Puedes acompañarlo de una instrucción de entrega: «el gancho se canta idéntico en cada coro, con la misma melodía». Sin esa línea, el motor tiende a variar la frase, y tu comparación se contamina porque ahora hay cuatro variables cambiando.',
        ] },
      { heading: 'Qué hace buena a una versión: la checklist', body: [
          'La checklist de calidad de Play and Go tiene ocho puntos en cuatro preguntas. Memoria: ¿el gancho aparece antes del minuto uno?, ¿lo tararearías sin audio? Forma: ¿se distinguen verso, pre-coro y coro al oído?, ¿el puente es contraste o relleno? Sonido: ¿se entiende la voz en el primer verso?, ¿hay un momento en que el grave se vuelve indefinible? Intención: ¿el final es deliberado o se corta a media idea? Si fallas dos puntos de la misma pregunta, tienes una decisión que tomar, no un arreglo que corregir.',
          'Cada punto se evalúa con una marca de tiempo. Sin tiempo no hay evidencia: «el coro abre bien» no se puede auditar; «0:52 entra la segunda capa y se siente la apertura» sí. Esta disciplina parece escolar y es la misma que usan los editores de música para devolverse tomas entre sí.',
        ] },
      { heading: 'Cómo justificar la versión seleccionada', body: [
          'Un criterio de selección honesto nombra tres cosas: qué gana la elegida, qué pierde respecto a las otras y qué se haría después con ella. Ejemplo de justificación válida: «elijo B; gana claridad de voz en el verso y apertura del coro, pierde la textura del sinte del puente, y el siguiente paso es exportarla y alargar cuatro compases el outro». Una justificación inválida: «me gustó más». No es una opinión malintencionada, es una decisión que no se puede repetir mañana.',
          'Cierra siempre con un plan de una línea: publicar, seguir iterando una variable, pedir feedback ciego a otra persona o archivarla para un destino distinto (un reel, un loop, una base para letra). Una versión no elegida no es un fracaso: es un activo sin destino asignado. Ese plan convierte el ejercicio en parte de un flujo y no en un triángulo de muestras.',
        ] },
    ],
    examples: [
      'Gancho de trabajo: «no me busques cuando ya no hay luz», cuatro sílabas por pie, cae en el tiempo fuerte del tercer compás. Versión A (base): «pop alternativo, 96 BPM, La menor, voz femenina con aire, tres capas en verso, cinco en coro, reverberación corta». Versión B: idéntica, cambiando solo «cinco capas en coro» por «coro con cuerdas en notas largas y guitarra de feedback en segundo plano». Versión C: idéntica a B, cambiando solo 96 BPM por 104 BPM.',
      'Tabla de resultado: A aparece el gancho en 0:58 y la voz se entiende bien, pero el coro no abre. B abre el coro en 1:02 con las cuerdas, aunque el gancho aparece tarde y la letra se confunde en el segundo verso. C con 104 BPM adelanta el gancho a 0:47, abre el coro y conserva la dicción. Selección justificada: C gana en memoria y forma; pierde la textura de feedback del puente; siguiente paso: exportar y pedir una escucha ciega.',
      'Checklist aplicada con tiempos: «0:11 primer verso, dicción clara», «0:47 gancho», «1:22 puente: contraste real, se queda voz y pad», «2:31 final con caída a silencio, deliberado», «1:05-1:10 el grave se vuelve indefinible cuando entran el bombo y el sub juntos».',
    ],
    techniques: [
      'Gancho ancla: escribe el gancho literal y añade la instrucción de repetición idéntica; así las tres versiones son versiones y no tres canciones.',
      'Rotación de variable por versión: versión A base, B arreglo, C tempo o interpretación. Nunca dos cambios en la misma versión.',
      'Checklist con marcas de tiempo: cada punto de calidad se responde con mm:ss. Sin tiempo no hay evidencia auditable.',
      'Justificación de tres partes: qué gana, qué pierde, qué sigue. Si te falta la tercera parte, todavía no elegiste: te convenció la novedad.',
      'Feedback ciego: envía A, B y C sin etiquetas a dos personas y pide «cuál volverías a escuchar». La repetición espontánea es el mejor criterio de memoria que existe.',
    ],
    prompts: [
      { name: 'Tres versiones del mismo gancho', outcome: 'Un set A/B/C con una sola variable rotando por versión, listo para la checklist.',
        variables: ['frase de 4 a 10 palabras', 'género', 'BPM', 'feel', 'tonalidad', 'modo', 'registro, textura, articulación, acento', 'n', 'm', 'segundos por bloque', 'graves, agudos, espacio', 'campo de arreglo', 'valor', 'tempo, feel o instrucción de interpretación'],
        text: 'Gancho literal que se repite idéntico en cada coro: {frase de 4 a 10 palabras}. Base: {género}, {BPM} BPM {feel}, {tonalidad} {modo}, voz {registro, textura, articulación, acento}, {n} capas en verso y {m} en coro, estructura {segundos por bloque}, mezcla {graves, agudos, espacio}. Versión B = base, cambia solo {campo de arreglo} a {valor}. Versión C = versión B, cambia solo {tempo, feel o instrucción de interpretación} a {valor}. En las tres: el gancho se canta con la misma melodía y no se añade material nuevo en los coros.' },
      { name: 'Checklist de calidad de ocho puntos', outcome: 'Un formato de evaluación para seleccionar versión con evidencia.',
        variables: ['0:60', 'mm:ss', 'sí o no', 'fade, golpe seco o caída a silencio', 'n', 'versión', 'algo', 'una línea'],
        text: 'Memoria: el gancho aparece antes de {0:60} ({mm:ss}), ¿lo tararearía sin audio? {sí o no}. Forma: se distinguen verso {mm:ss}, pre-coro {mm:ss}, coro {mm:ss}; el puente es contraste {sí o no}. Sonido: se entiende la voz en el primer verso {sí o no}, problema de grave en {mm:ss}; artefactos en {mm:ss}. Intención: el final es {fade, golpe seco o caída a silencio} y es deliberado {sí o no}. Puntuación: {n} de 8 puntos cumplidos. Selección: {versión}, gana {algo}, pierde {algo}, siguiente paso {una línea}.' },
    ],
    exercise: {
      title: 'Set A/B/C del mismo gancho con selección justificada', deliverable: 'Entregable del módulo: tres generaciones documentadas del mismo gancho, la checklist con tiempos aplicada y una versión seleccionada con justificación escrita.',
      steps: [
        'Escribe un gancho de 4 a 10 palabras y una melodía interior que puedas cantar; déjalo literal en la caja de letra con etiquetas de sección.',
        'Genera la versión A con tu prompt maestro de siete campos y dos tomas; guarda el prompt exacto.',
        'Genera la versión B cambiando solo un campo de arreglo (capas del coro, instrumentación del puente o mezcla) y dos tomas.',
        'Genera la versión C cambiando solo tempo, feel o dirección de interpretación sobre B, y dos tomas.',
        'Aplica la checklist de ocho puntos con marcas de tiempo a la mejor toma de cada versión y puntúa.',
        'Selecciona una versión con justificación de tres partes (gana, pierde, sigue) y envíala a dos personas a ciegas para un voto de repetición.',
      ],
      checklist: [
        'El gancho es idéntico en las tres versiones y se canta en la misma melodía.',
        'Cada versión cambia una sola variable respecto a la anterior, con nota explícita del campo.',
        'La checklist está respondida con marcas de tiempo, no con adjetivos, y tiene puntuación numérica.',
        'La justificación de selección nombra qué gana, qué pierde y cuál es el siguiente paso.',
      ],
    },
    listening: [
      { title: 'Ganchos que llegan antes del minuto', search: 'pop latino gancho hook primer minuto estructura radio_analysis',
        focus: 'Toma tres éxitos de pop latino recientes y cronometra en qué segundo aparece la frase que se repite. Vas a encontrar que rara vez pasan el 1:00. Después identifica cuántas palabras tiene el gancho y si cabe en una respiración.' },
      { title: 'Versión que abre el coro con arreglo', search: 'cómo abrir el coro en producción urbana capas que entran en el estribillo',
        focus: 'Escucha un tema urbano y marca qué entra exactamente en el coro: una capa aguda, un doble de voz, un cambio de subdivisión. Esa entrada es el resultado de una instrucción de arreglo, y es lo que buscas cuando tu versión B «no abre».' },
    ],
    pitfalls: [
      { mistake: 'Cambiar el gancho entre versiones «para ver cuál funciona mejor».', fix: 'Un gancho, tres direccionalidades. Si el material melódico cambia, necesitas un ejercicio de composición, no de prompting.' },
      { mistake: 'Puntuar la checklist por impresión general.', fix: 'Cada punto exige una marca de tiempo y un sí o no. Sin evidencia temporal, estás recordando la última toma que escuchaste.' },
      { mistake: 'Elegir la versión más reciente.', fix: 'Compara A, B y C en el mismo orden en las tres pasadas y decide con puntuación; la novedad se siente como calidad.' },
      { mistake: 'No definir destino para las versiones no elegidas.', fix: 'Asigna un uso a cada descarte: loop, reel, base para otra letra, archivo con fecha. Nada se tira, todo se reubica.' },
    ],
    takeaway: 'Tres versiones del mismo gancho con una variable cada una te dicen más que treinta canciones al azar.',
  },
  {
    id: 'm03-l08', moduleIndex: 3, lessonNumber: 8,
    title: 'Registro, textura, articulación y acento de voz', kicker: 'Sesión 08 · Voz', minutes: 18,
    objective: 'Dirigir una voz con los cuatro ejes y entender qué se puede pedir y qué no en una plataforma de IA.',
    blocks: [
      { heading: 'Registro: dónde vive la voz', body: [
          'El registro es la zona de notas donde se canta, no el sexo de la voz. Grave, medio o agudo, y sobre todo el rango que usa: un rango estrecho (unas seis o siete notas) suena íntimo y conversado; un rango amplio (una octava o más) suena eufórico o dramático. Cuando pides «voz aguda» sin rango, obtienes una voz forzada; cuando pides «registro medio con rango estrecho en versos y salto a falsete en el coro», diriges una interpretación.',
          'El registro interactúa con la tonalidad. Una melodía escrita para un registro alto obliga a beltear; si además el arreglo está lleno, la voz desaparece en la mezcla y el motor la sube de volumen con distorsión. Por eso conviene escribir en el prompt el registro que necesitas y la relación con el arreglo: «voz en registro medio, el arreglo baja una octava cuando entra la melodía vocal».',
          'Un detalle operativo: pide la transición explícita. «Cambio a falsete en la segunda línea del coro», «voz de pecho durante el verso y cabeza en el último coro». Sin esa frase, el modelo decide la transición donde quiere, y suele elegirla en el peor lugar para la letra.',
        ] },
      { heading: 'Textura: el material de la voz', body: [
          'La textura es de qué está hecha la voz: aterciopelada, con aire (breathy), metálica, rasposa, limpia, nasal, oscura. Es el eje que más define el género percibido: un mismo canto con aire suena íntimo y con textura metálica suena rock. Escríbela con dos adjetivos técnicos y no cinco emocionales: «con aire y borde rasposo en los coros» funciona; «emotiva y profunda» no describe material sonoro.',
          'El aire tiene un costo que conviene conocer: mucho aire reduce inteligibilidad en los graves de la voz y puede perderse en una mezcla densa o en el altavoz de un teléfono. Si el texto importa, pide aire en los versos y menos aire en el coro, que es la estrategia que sostiene la letra sin perder intimidad al principio.',
        ] },
      { heading: 'Articulación: cómo se sueltan las palabras', body: [
          'La articulación decide si se entiende y si se siente rápida o relajada. Percusiva y adelantada al pulso: rap, cumbia, pop bailable. Ligada y atrás del pulso: balada, bolero, neo soul. Conversada, con sílabas medio tragadas: urbano, indie cantado. Es la diferencia entre «se escucha una voz» y «se entiende lo que dicen», y es el eje que más sufren las voces generadas cuando el español del prompt se escribe con acento estadístico.',
          'La forma de controlarlo es escribir la relación con el pulso: «cada sílaba sobre una corchea, consonantes marcadas» o «fraseo legato atrasado medio tiempo, vocales abiertas». Conviene además pedir consonantes nadas suaves si el motor sisea, porque los esses y ceces distorsionadas son el artefacto más común de voz generada en español.',
        ] },
      { heading: 'Acento e idioma: lo que la plataforma sabe de ti', body: [
          'El acento es una instrucción legítima y describe una región, no una persona: español neutro, caribeño, rioplatense, andino, castellano peninsular, mexicano regional; o inglés con acento latino, portugués brasileño. Declara el acento y el idioma también en el prompt de estilo, no solo en la letra: refuerza la fonética y evita que el motor cante español con vocales de inglés, defecto extremadamente común.',
          'Y el límite, con honestidad: dirigir un acento está bien; imitar una voz identificable no. Clonar la voz de una artista o de una persona real sin consentimiento viola casi siempre los términos de servicio y puede violar derechos de imagen y de voz, que en varios países de América Latina se protegen por ley aunque no haya registro. No digas su nombre: describe las propiedades que te gustan y regístralas en tu bitácora para poder repetirlas.',
        ] },
      { heading: 'Doblajes, armonías y coros: la voz como capa múltiple', body: [
          'Una voz también se dirige en plural. Pide doblaje (la misma línea en dos tomas al mismo tiempo, que engrosa sin subir volumen), armonía (una voz adicional en tercera o quinta), o coro (muchas voces, que abre el espacio). En el prompt se escribe así: «versos a voz seca y sencilla, coros con doblaje y armonía de tercera, sin coro masivo». Con esa línea controlas la dinámica del estribillo sin tocar la instrumentación.',
          'Cuidado con el exceso: armonías pedidas sin dirección tienden a sonar de Gospel o jingle, y un coro masivo en una canción íntima la vuelve impersonal. Una sola instrucción de contraste —«solo doblaje en el último coro»— es más eficaz que describir todas las capas de voces del mundo.',
        ] },
    ],
    examples: [
      'Cuatro ejes en un prompt de estilo: «balada pop latina, 72 BPM feel recto, Mi mayor; voz femenina en registro medio con rango estrecho en versos y salto a cabeza en el último coro, textura con aire y borde limpio, articulación ligada atrasada medio tiempo, acento mexicano neutral, canto en español, consonantes sin siseo; versos a voz sencilla y seca, coros con doblaje y armonía de tercera, sin coro masivo; mezcla con voz delantera, reverberación corta en versos y larga en coros».',
      'La misma letra con tres voces: sobre «ya no hay luz en la cocina» se generaron tres perfiles. Uno con registro grave, mucho aire y articulación conversada resultó íntimo y adulto. Otro con registro medio y articulación percusiva resultó pop y entendible, pero perdió la confesión. El tercero con rango amplio y belting en el coro resultó dramático y tapó la instrumentación. La letra era idéntica: los tres resultados eran tres canciones distintas. Conclusión registrada: la dirección vocal es contenido, no adorno.',
      'Corrección de un defecto típico: «seseo distorsionado en los coros». Se añadió a la voz: «esses suaves, consonantes menos marcadas en coros» y se bajó la densidad de capas agudas en el coro. El artefacto desapareció en las dos tomas siguientes, así que la atribución fue válida.',
    ],
    techniques: [
      'Cuatro etiquetas, siempre en orden: registro (y rango), textura, articulación (y relación con el pulso), acento (y idioma). El orden te permite cambiar un eje por versión.',
      'Transición explícita: declara en qué sección y en qué línea ocurre el falsete, la cabeza o el belting. Si no la escribes, el motor la inventa en el peor sitio.',
      'Aire con plan de inteligibilidad: mucho aire en versos para intimidad, menos aire en coros para que se entienda el mensaje clave.',
      'Contraste de capas vocales: voz sencilla en verso, doblaje en pre-coro, doblaje y armonía de tercera en coro. Es dinámica hecha con voces, sin sumar instrumentos.',
      'Acento de región, no de persona: usa nombres geográficos y descriptores fonéticos; nunca nombres de artistas, que además de riesgo legal degradan la dirección.',
    ],
    prompts: [
      { name: 'Perfil vocal en cuatro ejes', outcome: 'Una descripción de voz que se puede repetir, variar y auditar.',
        variables: ['femenina, masculina o neutra', 'grave, medio o agudo', 'estrecho o amplio', 'n', 'transición a falsete, cabeza o belting', 'sección', 'con aire, aterciopelada, metálica, rasposa o limpia', 'percusiva adelantada, legada atrasada o conversada', 'región', 'idioma', 'nítidas o suavizadas, con esses sin siseo', 'ninguno, en coros, en toda la canción', 'ninguna, tercera, quinta, coro masivo', 'voz delantera pegada, voz dentro de la música, voz lejana'],
        text: 'Voz {femenina, masculina o neutra} en registro {grave, medio o agudo}, rango {estrecho o amplio} con {n} notas aproximadas; {transición a falsete, cabeza o belting} en {sección}; textura {con aire, aterciopelada, metálica, rasposa o limpia}; articulación {percusiva adelantada, legada atrasada o conversada} respecto al pulso; acento {región} cantando en {idioma}; consonantes {nítidas o suavizadas, con esses sin siseo}; doblaje: {ninguno, en coros, en toda la canción}; armonías: {ninguna, tercera, quinta, coro masivo}; colocación: {voz delantera pegada, voz dentro de la música, voz lejana}.' },
      { name: 'Dirección de doblajes y armonías por sección', outcome: 'Usar las voces como capa de dinámica, sin ensuciar el centro.',
        variables: ['sencilla, sin doblaje', 'muy poco aire', 'delantera', 'doblaje suave', 'el aire o la presencia', 'doblaje en la misma línea', 'armonía de tercera o quinta', 'sin coro masivo', 'reverberación más larga que en versos', 'voz sola con un instrumento', 'una capa vocal nueva respecto al coro anterior', 'voz', 'una octava arriba o en registro medio'],
        text: 'Versos: voz {sencilla, sin doblaje}, con {muy poco aire} y colocación {delantera}. Pre-coro: entra {doblaje suave} y sube {el aire o la presencia}. Coro: voz principal con {doblaje en la misma línea} más {armonía de tercera o quinta}, {sin coro masivo}, con {reverberación más larga que en versos}. Puente: se retiran doblajes y queda {voz sola con un instrumento}. Último coro: se añade {una capa vocal nueva respecto al coro anterior}. Centro del espectro libre para {voz}, y las armonías viven {una octava arriba o en registro medio}.' },
    ],
    exercise: {
      title: 'La misma letra, tres perfiles vocales', deliverable: 'Tres perfiles vocales documentados cantando la misma letra, con una comparación de una línea por perfil y el perfil elegido justificado.',
      steps: [
        'Escribe cuatro líneas de coro que quepan en una respiración y úsalas sin cambios en las tres tomas.',
        'Perfil 1: registro grave, mucho aire, articulación conversada, rango estrecho, sin doblajes. Genera dos tomas.',
        'Perfil 2: registro medio, textura limpia, articulación percusiva adelantada, doblaje en el coro. Genera dos tomas.',
        'Perfil 3: rango amplio con belting en el coro, articulación ligada atrasada, armonía de tercera. Genera dos tomas.',
        'Escucha las seis tomas seguidas y responde con una línea por perfil: ¿qué se entiende?, ¿qué emoción produce?, ¿en qué altavoz se pierde la letra?',
        'Elige el perfil que sirve al mensaje de la canción y registra en la bitácora qué eje exacto produjo la diferencia.',
      ],
      checklist: [
        'La letra es idéntica en los tres perfiles; solo cambian los cuatro ejes y los doblajes.',
        'Cada perfil declara los cuatro ejes más idioma y acento en el prompt de estilo.',
        'Puedes citar un segundo exacto donde la inteligibilidad cambia entre perfiles.',
        'Ningún prompt menciona nombres de artistas ni intenta reproducir una voz identificable.',
      ],
    },
    listening: [
      { title: 'Belting y rango amplio en balada latinoamericana', search: 'balada latinoamericana clímax vocal belting rango estrecho a amplio análisis',
        focus: 'Busca una balada con clímax vocal y sigue dos cosas: el rango que recorre la voz entre el primer verso y el último coro, y cuántas capas instrumentales lo acompañan en cada momento. La tensión viene de la transición de registro, no de que la letra diga «te necesito».' },
      { title: 'Voz íntima: aire, registro bajo y poco arreglo', search: 'canción de autor española voz íntima cercana registro bajo guitarra',
        focus: 'Escucha una canción de autor en español con voz muy cercana: registra cuánto aire usa, cómo el rango se queda estrecho y qué instrumento sostiene. Eso es articulación y textura dirigiendo la emoción, sin dinámicas fuertes.' },
      { title: 'Acento y dicción en rap cantado', search: 'flow conversado acento regional urbano dicción sílabas rap en español',
        focus: 'Localiza un tema urbano con flow conversado y escucha el acento regional como marca de identidad: cómo se abrevian sílabas y cómo la articulación se apoya en el pulso. Después compara con un tema del mismo género en otro acento y nota cuánto cambia el carácter con la misma música.' },
    ],
    pitfalls: [
      { mistake: 'Pedir «voz bonita» o «voz con sentimiento».', fix: 'Describe material: registro, rango, aire, articulación contra el pulso. La emoción aparece como consecuencia verificable.' },
      { mistake: 'Intentar que suene a una artista concreta.', fix: 'Describe propiedades y región de acento. Imitar una voz identificable puede violar los términos de la plataforma y derechos de imagen y voz.' },
      { mistake: 'Ignorar el idioma en el prompt de estilo.', fix: 'Declara «canto en español» y el acento también en el estilo; así evitas vocales de inglés cantando letra en español.' },
      { mistake: 'Llenar el coro de armonías sin dirección.', fix: 'Pide contraste por sección: sencilla en verso, doblaje en pre-coro, doblaje y tercera en coro, retirada en el puente.' },
    ],
    takeaway: 'Registro, textura, articulación y acento son cuatro mandos; con ellos la voz dirige la canción en vez de decorarla.',
  },
  {
    id: 'm03-l09', moduleIndex: 3, lessonNumber: 9,
    title: 'Escribir versos, pre-coro, coro y puente con métrica funcional', kicker: 'Sesión 09 · Letra y métrica', minutes: 20,
    objective: 'Escribir una letra cuya métrica sostenga el pulso y cuya forma cumpla la función de cada sección.',
    blocks: [
      { heading: 'La métrica no es poesía: es encaje', body: [
          'En una canción la métrica decide si la frase cabe en el compás. Un verso de ocho sílabas sobre cuatro tiempos en 96 BPM cae cómodo; una frase de catorce sílabas sobre el mismo espacio obliga a atropellar las palabras o a que el motor estire vocales hasta que suenan a otro idioma. Por eso el defecto «se traga sílabas» rara vez es un fallo de la IA: es una letra que no cabe donde la escribiste.',
          'Cuenta sílabas como se cuentan en español, no como se ven. La sinalefa fusiona vocales entre palabras: «no hay agua» se canta como una sola cadena vocálica, así que cuenta menos sílabas de las que marcó el procesador de texto. Y aplica la regla del acento final: si la última palabra del verso es aguda, suma una sílaba; si es llana, deja el número; si es esdrújula, resta una. Con esas dos correcciones tu conteo coincide con lo que se canta.',
          'No hace falta ser poeta. Hace falta que el conteo sea constante dentro de una misma sección: si tus cuatro versos miden 8, 8, 9 y 11, el tercero y el cuarto no van a caber igual. Y siempre: lee la letra en voz alta sobre un metrónomo al BPM de la canción antes de generar. Dos minutos de metrónomo ahorran veinte generaciones.',
        ] },
      { heading: 'Verso: información. Pre-coro: tensión. Coro: sentencia', body: [
          'El verso acumula datos concretos: quién, dónde, qué pasó. Es el lugar de los sustantivos y de las imágenes, con métrica pareja y melodía que se repite entre estrofas. Un verso que ya esloganiza deja al coro sin nada que decir, y ese es el motivo más común de una canción que «suena rara»: todas las secciones compitiendo por el mismo trabajo.',
          'El pre-coro prepara la salida: sube el rango, acorta las frases o repite una palabra, y alarga la vocal final. Es un trampolín, no una estrofa más. Cuatro líneas máximo, y si puedes dos, mejor. Su función es que el oído espere algo; si el pre-coro se canta igual que el verso, el coro llega sin impulso.',
          'El coro sentencia: una frase de cuatro a diez palabras que se pueda cantar sin leer, idealmente con el título dentro. Repetible, con métrica corta y vocal abierta en la palabra fuerte («luz», «mar», «verano» sostienen la nota mejor que «abecedario»). El coro no explica: afirma. Si tu coro tiene tres ideas, tienes un verso disfrazado.',
          'El puente reencuadra: otro punto de vista, otro tiempo verbal, otra persona gramatical, o una duda. Suele ser el único lugar de la canción donde puedes romper la métrica a propósito, porque su función es el contraste. Después de un buen puente, el último coro suena a decisión y no a repetición.',
        ] },
      { heading: 'Rima, acento y dónde recae la palabra fuerte', body: [
          'La rima consonante (todos los sonidos finales coinciden) se nota y ayuda a la memoria, pero en exceso se vuelve infantil y previsibles; la asonante (solo coinciden las vocales) suena natural y en español sostiene muchísimas canciones populares. Regla práctica: rima en el coro, suelta o asonante en los versos, para que la estructura se escuche aunque la melodía cambie.',
          'Más importante que la rima es la recurrencia del acento. El español es una lengua de acentos, y la melodía debe respetarlos: si acentúas «te amo» en «a», funciona; si la música obliga a decir «te Ámo» o «te AMO» fuera de lugar, el oyente siente un error aunque no sepa nombrarlo. Revisa cada línea cantada: la sílaba tónica de la palabra final debería caer en un tiempo fuerte del compás.',
          'Y una táctica de gancho: repite el acento y el contorno, no la rima. «Ya no hay luz / ya no hay voz» funciona por estructura paralela y métrica gemela, no por la rima de «luz» y «voz». Las paralelas son la herramienta más subestimada del pop en español: dos líneas de idéntica longitud y distinto contenido, con la misma melodía.',
        ] },
      { heading: 'Cómo entregar la letra a un generador sin que la maltrate', body: [
          'Escribe la letra con etiquetas de sección en su propio campo: [Verso 1], [Pre-coro], [Coro], [Verso 2], [Puente], [Coro final]. Añade, si la plataforma lo permite, indicaciones cortas entre corchetes dentro de la sección: [hablado], [pausa], [solo de guitarra]. Esas etiquetas son la única manera de decirle al modelo dónde va la información y dónde el silencio.',
          'No escribas instrucciones de interpretación dentro de la letra como si fueran verso. «(suave, casi susurrado)» mezclado con la letra puede terminar cantado. Las indicaciones de emoción van en el prompt de estilo o en tu bitácora de dirección; dentro de la letra van etiquetas estructurales, breves y coherentes.',
          'Y un recordatorio de derechos: si la letra es tuya, eso es autoría humana, y es la parte de tu canción con la protección más clara. Guárdala con fecha, versión y tu nombre, antes de generar. Cuando en el módulo 5 hables de registro y splits, ese archivo con fecha es tu mejor evidencia.',
        ] },
    ],
    examples: [
      'Métrica funcional verificada. Verso en ocho sílabas: «se apagó la luz del patio» (contando sinalefa: se-a-pa-gó-la-luz-del-pa-tio; con «apagó» aguda la suma final queda en ocho). Coro en seis: «ya no hay luz, ya no hay voz» (paralelas gemelas, acentos en «luz» y «voz» cayendo en tiempo fuerte). Ambas se leen sobre metrónomo a 96 BPM antes de generar, y encajan sin forzar vocales.',
      'Letra con etiquetas lista para pegar: [Intro instrumental: pad y guitarra], [Verso 1: voz baja y seca] cuatro líneas de ocho sílabas, [Pre-coro: sube el rango] dos líneas de seis, [Coro: doblaje, acento en el primer tiempo] «ya no hay luz / ya no hay voz / sigo encendiendo / lo que se apagó», [Verso 2], [Coro], [Puente: voz y pad, cambio de persona] cuatro líneas de diez, [Coro final: una capa vocal más], [Outro: caída a silencio].',
      'Error real y su corrección: verso original de trece sílabas («y me quedé mirando la cocina vacía que ya no va a volver»), resultado cantado con sílabas atropelladas. Reescrito en dos líneas de siete y seis: «me quedé mirando / la cocina vacía». La idea es idéntica y ahora cabe en el compás; la segunda corrección, añadir [pausa] antes, resolvió el resto. Cero cambios en el prompt de estilo.',
    ],
    techniques: [
      'Conteo con sinalefa y acento final: fusiona vocales entre palabras y aplica +1 si la última palabra es aguda, 0 si es llana, -1 si es esdrújula. Ese número es tu longitud real.',
      'Prueba del metrónomo: lee la letra en voz alta sobre el BPM de la canción antes de generar; donde tropiezas, el modelo también tropieza.',
      'Una función por sección: verso informa, pre-coro tensa, coro sentencia, puente reencuadra. Si dos secciones hacen lo mismo, reescribe una.',
      'Paralelas gemelas: dos líneas con idéntica métrica y contorno melódico, contenido distinto. Es el atajo más fiable para un gancho memorable.',
      'Vocales sostenibles en el gancho: coloca en la nota larga una palabra con vocal abierta y final agudo o llano; evita palabras esdrújulas en el punto de clímax.',
      'Etiquetas estructurales dentro de la letra y direcciones de interpretación fuera: la forma viaja con la letra, la emoción viaja en el prompt de estilo.',
    ],
    prompts: [
      { name: 'Plantilla de letra con métrica por sección', outcome: 'Una letra completa que cabe en el compás y con funciones separadas.',
        variables: ['qué información entrega', 'n', 'sílabas por verso', 'asonante o suelta', 'tiempo fuerte del compás', 'qué sube', '2 a 4', 'sílabas más cortas', 'vocal abierta para el salto', 'la sentencia', '4 a 10', 'título dentro', 'consonante', 'paralela gemela', 'nueva información, misma métrica del verso 1', 'cambio de persona, tiempo o punto de vista', 'métrica distinta a propósito', 'variación o capa vocal nueva', 'cómo termina la idea'],
        text: '[Verso 1: {qué información entrega}] {n} líneas de {sílabas por verso}, rima {asonante o suelta}, acentos finales en {tiempo fuerte del compás}.\n[Pre-coro: {qué sube}] {2 a 4} líneas de {sílabas más cortas}, terminando en {vocal abierta para el salto}.\n[Coro: {la sentencia}] gancho de {4 a 10} palabras con {título dentro}, {2 a 4} líneas, rima {consonante}, {paralela gemela} en las dos primeras.\n[Verso 2: {nueva información, misma métrica del verso 1}]\n[Puente: {cambio de persona, tiempo o punto de vista}] {n} líneas de {métrica distinta a propósito}.\n[Coro final: {variación o capa vocal nueva}]\n[Outro: {cómo termina la idea}].' },
      { name: 'Revisión de encaje silábico', outcome: 'Detectar y arreglar la línea que el motor no alcanza a cantar.',
        variables: ['línea', 'BPM', 'n', 'duración de la frase', 'm', 'partir la línea en dos, quitar átonos, cambiar la palabra final por otra más corta o moverla a otro tiempo del compás', 'tiempo fuerte'],
        text: 'Línea que se traga sílabas: {línea}. BPM de la canción: {BPM}. Sílabas contadas con sinalefa y acento final: {n}. Sílabas que caben en {duración de la frase}: {m}. Corrección aplicada: {partir la línea en dos, quitar átonos, cambiar la palabra final por otra más corta o moverla a otro tiempo del compás}. Vuelve a leerla en voz alta con metrónomo antes de regenerar y verifica que la sílaba tónica caiga en {tiempo fuerte}.' },
      { name: 'Puente que reencuadra', outcome: 'Escribir un contraste que haga sonar el último coro como decisión.',
        variables: ['la persona gramatical, el tiempo verbal o el punto de vista', 'distinta, por ejemplo de 8 a 11 sílabas', 'más grave o más agudo', 'lo que el narrador todavía no admitía', 'palabra con vocal abierta', 'frase del gancho', 'qué se retira', 'voz con un instrumento'],
        text: 'Puente: cambia {la persona gramatical, el tiempo verbal o el punto de vista}; métrica {distinta, por ejemplo de 8 a 11 sílabas}; melodía en registro {más grave o más agudo} que el coro; letra que dice {lo que el narrador todavía no admitía}; termina en {palabra con vocal abierta} que encadena con el gancho {frase del gancho}. Arreglo: {qué se retira} y queda {voz con un instrumento}.' },
    ],
    exercise: {
      title: 'Letra completa con métrica verificada', deliverable: 'Una letra completa con etiquetas de sección, conteo silábico anotado por línea y una lista de las líneas reescritas tras la prueba del metrónomo.',
      steps: [
        'Define el título y el gancho primero: una frase de 4 a 10 palabras que contenga el título y quepa en una respiración.',
        'Escribe dos versos de ocho sílabas (o el número que elijas) con rimas asonantes, y un pre-coro de dos líneas más cortas.',
        'Cuenta cada línea con sinalefa y regla del acento final, y anota el número al lado; iguala el conteo dentro de cada sección.',
        'Pon el metrónomo al BPM de la canción y lee toda la letra en voz alta: marca con una X cada línea donde tropieces.',
        'Reescribe solo las líneas marcadas, sin cambiar el gancho, y vuelve a leer hasta que ninguna tropiece.',
        'Escribe el puente con métrica deliberadamente distinta y un cambio de persona, y graba una lectura hablada de la letra completa para oír la forma.',
      ],
      checklist: [
        'El conteo silábico está escrito al lado de cada verso y coincide dentro de cada sección.',
        'La letra se lee completa sobre metrónomo sin tropezar en ninguna línea.',
        'El gancho contiene el título y se mantiene igual en todos los coros.',
        'Verso, pre-coro, coro y puente cumplen funciones distintas y el puente cambia algo estructural.',
      ],
    },
    listening: [
      { title: 'Bachata: métrica corta y fraseo ligado', search: 'bachata métrica de verso fraseo ligado guitarra arpegio patrón regular',
        focus: 'Escucha cómo las líneas del coro son breves, cantadas con vocales abiertas en la nota final, y cómo el patrón arpegiado de la guitarra sostiene una métrica muy regular. Cuenta las sílabas de una línea del coro: vas a encontrar un número pequeño y constante.' },
      { title: 'Rap cantado: acentos de palabra contra acentos de compás', search: 'rap en español acento de palabra contra acento de compás flow síncopa',
        focus: 'Sigue una estrofa y comprueba si las sílabas tónicas caen en los golpes del bombo. Donde no caen, el rapero adelanta o atrasa la frase: eso es resolver un conflicto métrico con interpretación, y es una solución que puedes pedir en el prompt.' },
      { title: 'Pop de autor: coro como sentencia', search: 'estructura de canción pop verso cuenta coro afirma función de secciones',
        focus: 'Identifica cuántas palabras tiene el gancho y cuánto tiempo ocupa. Compara la densidad de información del verso con la del coro: el verso cuenta, el coro afirma. Ese contraste es la función de sección hecha audible.' },
    ],
    pitfalls: [
      { mistake: 'Contar sílabas visuales en lugar de cantadas.', fix: 'Aplica sinalefa y la regla del acento final (+1 aguda, 0 llana, -1 esdrújula), y verifica leyendo sobre metrónomo.' },
      { mistake: 'Escribir el coro con más de una idea.', fix: 'El coro sentencia: cuatro a diez palabras y el título dentro. Mueve el resto de las ideas al segundo verso.' },
      { mistake: 'Forzar rima consonante y deformar la palabra.', fix: 'Usa asonante o paralelas gemelas. Ninguna rima vale una sílaba tónica fuera de lugar.' },
      { mistake: 'Poner indicaciones de emoción dentro de la letra.', fix: 'Déjalas en el prompt de estilo; dentro de la letra solo etiquetas estructurales cortas como [Coro] o [puente: voz y pad].' },
    ],
    takeaway: 'Una letra que no cabe en el compás no la arregla la IA: la arregla el conteo de sílabas.',
  },
  {
    id: 'm03-l10', moduleIndex: 3, lessonNumber: 10,
    title: 'Ejercicio: dirección vocal para una interpretación real', kicker: 'Sesión 10 · Práctica de módulo', minutes: 16,
    objective: 'Entregar una letra anotada con dirección vocal y dinámica por sección, y verificarla en dos generaciones.',
    blocks: [
      { heading: 'Anotar la interpretación: un lenguaje mínimo', body: [
          'Una letra anotada es una partitura de intención. Usa seis marcas y no inventes más: [baja] para registro o volumen menor, [sube] para rango o energía, [aire] para textura susurrada, [seco] para voz sin reverberación y sin doblaje, [doblaje] para capa doble en el coro, [pausa] para silencio antes de la línea siguiente. Al lado de cada sección escribes qué pasa en los cuatro ejes vocales. Con eso, cualquier colaborador puede entender tu dirección sin leer tu mente.',
          'La anotación vive en dos lugares. Dentro de la letra van las etiquetas estructurales y las marcas de forma ([Coro], [puente: voz y pad]). En la bitácora de dirección va la traducción al prompt de estilo, que es donde realmente el modelo puede ejecutarlas: «versos con voz aireada y registro medio con rango estrecho, coros con doblaje y armonía de tercera, esses sin siseo, acento mexicano neutral, canto en español».',
        ] },
      { heading: 'Del guion de emoción al instructivo de sonido', body: [
          'El paso más difícil de este ejercicio es traducir lo que sientes en instrucciones oíbles. «Quiero que suene a que se rinde» se descompone: registro que baja, ritmo que se atrasa, aire que sube, y arreglo que se retira. «Quiero que suene desafiante»: articulación percusiva, consonantes marcadas, rango que se mantiene, doblaje en el coro. Escribe la emoción y debajo sus cuatro traducciones técnicas; esa tabla es tu guion de interpretación.',
          'Y una advertencia honesta: no todo se puede dirigir con prompt. El matiz de una sílaba concreta, un quejido a mitad de frase o un respiro escuchado suelen quedar fuera de tu control fino en estas plataformas. Cuando eso importe, la solución profesional es generar varias tomas y elegir, o exportar y grabar una guía de voz propia encima. Anotar la interpretación sigue sirviendo: ahora sabes qué buscar en cada toma.',
        ] },
      { heading: 'Cómo evaluar si tu dirección llegó', body: [
          'Tres pruebas rápidas sobre la toma generada. Primera, el primer verso: ¿se canta en el registro y con el aire que pediste? Si suena igual que el coro, tu dirección de dinámica no se aplicó: reescríbela con qué capas se retiran, no con adjetivos. Segunda, inteligibilidad: ¿entiendes la frase clave del coro sin ver la letra? Si no, falló el eje de articulación o la densidad del arreglo. Tercera, contraste: señala tres segundos del puente y tres del último coro; si suenan parecido, no hay curva.',
          'Registra los resultados en la bitácora con marcas de tiempo, y cierra con una sola corrección para la versión siguiente. Este ejercicio entrena el hábito que más vale en el curso: escribir qué querías, oír qué obtuviste, y nombrar la distancia con una palabra técnica.',
        ] },
    ],
    examples: [
      'Guion de interpretación anotado: [Verso 1] [aire][baja] «me quedé mirando / la cocina vacía»; [Pre-coro] [sube][seco] dos líneas; [Coro] [doblaje] «ya no hay luz / ya no hay voz»; [Puente] [aire][pausa][baja] cuatro líneas; [Coro final] [doblaje][armonía de tercera]; [Outro] [seco][pausa]. Cada marca corresponde a una instrucción concreta del prompt de estilo.',
      'Traducción de una emoción: quiero «renuncia». Registro: desciende una quinta en la última línea del coro. Ritmo: fraseo atrasado, la frase termina antes del tiempo fuerte. Textura: más aire, menos borde. Arreglo: sale la percusión y queda pad. Resultado buscado: que el oyente perciba que se suelta, sin que la letra lo diga.',
      'Ficha de una toma evaluada: «Prueba 1 verso: cumple (registro medio, aire audible en 0:14). Prueba 2 inteligibilidad: falla en el coro (0:52, la palabra luz se cierra por densidad de agudos). Prueba 3 contraste: cumple (puente 1:58 solo voz y pad). Corrección única para v2: bajo una capa aguda del coro y pido consonantes nítidas; no toco nada más.»',
    ],
    techniques: [
      'Seis marcas nada más: [baja], [sube], [aire], [seco], [doblaje], [pausa]. Un lenguaje pequeño y constante se puede auditar; un lenguaje rico, no.',
      'Tabla emoción→instrucción: escribe la emoción y debajo cuatro traducciones técnicas (registro, ritmo contra el pulso, textura, arreglo). Diriges la segunda fila.',
      'Prueba de los tres segundos: compara tres segundos del puente con tres del último coro. Si suenan parecidos, no hay dirección de dinámica.',
      'Corrección única por versión: de las tres pruebas, arregla primero la que más duele y regenera. Arreglar todo a la vez borra el aprendizaje.',
      'Guía vocal propia: cuando el matiz fino no se puede pedir, graba una guía cantada aunque sea tarareada y genera sobre esa referencia si la plataforma lo permite; si no, usa la guía para elegir toma.',
    ],
    prompts: [
      { name: 'Prompt de dirección vocal por sección', outcome: 'Alinear cada sección de la letra con una instrucción vocal ejecutable.',
        variables: ['registro base', 'tonalidad', 'textura', 'articulación', 'región', 'idioma', 'más grave', 'alto', 'sencilla, sin doblaje', 'legado atrasado', 'el rango o la densidad', 'seco', 'acortando frases', 'doblaje', 'más agudo', 'nítidas', 'tercera o quinta', 'solo en el último coro', 'voz con un instrumento', 'pausa', 'baja', 'una capa vocal nueva', 'suaves, sin siseo'],
        text: 'Voz {registro base} en {tonalidad}, {textura} y {articulación}, acento {región}, canto en {idioma}. Versos: registro {más grave}, aire {alto}, voz {sencilla, sin doblaje}, fraseo {legado atrasado}. Pre-coro: sube {el rango o la densidad}, {seco} y {acortando frases}. Coros: {doblaje}, registro {más agudo}, consonantes {nítidas}, armonía {tercera o quinta} {solo en el último coro}. Puente: {voz con un instrumento}, {pausa} antes de la última línea, {baja}. Último coro: {una capa vocal nueva}. Es esse y cece: {suaves, sin siseo}.' },
      { name: 'Ficha de evaluación de interpretación', outcome: 'Convertir la escucha en tres veredictos y una corrección.',
        variables: ['título', 'v', 'mm:ss', 'cumple o falla', 'qué se oye', 'qué palabra se pierde y por qué', 'un solo eje de los cuatro', 'campos conservados'],
        text: 'Canción: {título} · versión {v}. Prueba 1, primer verso ({mm:ss}): {cumple o falla}, evidencia {qué se oye}. Prueba 2, inteligibilidad de la frase clave ({mm:ss}): {cumple o falla}, evidencia {qué palabra se pierde y por qué}. Prueba 3, contraste puente/último coro ({mm:ss} vs {mm:ss}): {cumple o falla}. Corrección única para la siguiente versión: {un solo eje de los cuatro}. Lo que dejo de tocar: {campos conservados}.' },
    ],
    exercise: {
      title: 'Letra anotada, dirección ejecutada y evaluación con tres pruebas', deliverable: 'Entregable del módulo: letra completa con anotaciones de interpretación y dinámica, el prompt de dirección correspondiente y la ficha de evaluación con tres veredictos.',
      steps: [
        'Toma la letra de la Sesión 09 y anótala con las seis marcas, al menos una por sección.',
        'Escribe la tabla emoción→instrucción para las dos emociones centrales de la canción, cuatro traducciones técnicos por emoción.',
        'Construye el prompt de dirección vocal por sección y pégalo junto a la letra en tu bitácora.',
        'Genera dos tomas en el estudio con voces, o dos en el estudio local si trabajas instrumental con una melodía silbada como referencia.',
        'Aplica las tres pruebas con marcas de tiempo y elige UNA sola corrección; ejecuta v2 cambiando únicamente ese eje.',
        'Cierra con tres líneas: qué pidió tu dirección, qué devolvió el motor y qué aprendiste sobre qué se puede dirigir.',
      ],
      checklist: [
        'Cada sección de la letra tiene al menos una marca de las seis, sin marcas nuevas inventadas.',
        'El prompt de estilo repite literalmente la dirección anotada: cada marca tiene su traducción.',
        'La ficha de evaluación tiene tres veredictos con marca de tiempo y una única corrección para v2.',
        'La frase clave del coro se entiende sin leer la letra en la versión final.',
      ],
    },
    listening: [
      { title: 'Interpretación de balada con curva escrita', search: 'balada interpretación vocal curva de dinámica registro aire vibrato análisis',
        focus: 'Escucha una balada con arreglo orquestal y sigue solo la voz del primer verso al último coro: dónde baja el registro, dónde sube el aire, dónde aparece el vibrato. Después deduce las cuatro líneas de guion que habrían producido eso.' },
      { title: 'Doblaje y armonías como dinámica', search: 'vocal doubling chorus harmonies layered pop dynamics when do they enter',
        focus: 'Localiza en un pop actual en qué segundo entran los doblajes de voz y cuántas capas vocales hay en el primer verso frente al último coro. Esa entrada tardía es una instrucción de dirección vocal, no un truco de mezcla.' },
      { title: 'Dicción en español cantado', search: 'dicción y acento regional en canto pop español comparación consonantes',
        focus: 'Compara dos cantantes del mismo género con acentos regionales distintos y escucha cómo cambia el carácter sin cambiar la melodía. Registra qué consonantes se suavizan y cuáles se marcan: es la materia de tu eje de articulación.' },
    ],
    pitfalls: [
      { mistake: 'Anotar emociones sueltas («triste aquí») sin traducción técnica.', fix: 'Cada marca de emoción debe bajar a registro, ritmo contra el pulso, textura o arreglo. Si no baja, no es dirección.' },
      { mistake: 'Pedir la misma intensidad vocal en verso y coro.', fix: 'Escribe el contraste con qué se retira en el verso y qué se suma en el coro, no con adjetivos de volumen.' },
      { mistake: 'Corregir cinco cosas después de una mala toma.', fix: 'Una corrección por versión, con marca de tiempo como evidencia. Así sabrás qué arregló qué.' },
      { mistake: 'Confiar en que el matiz fino de una sílaba va a salir igual dos veces.', fix: 'Acepta que eso no es dirigible por prompt: genera varias tomas y elige, o graba una guía vocal propia.' },
    ],
    takeaway: 'Dirigir una voz es escribir qué se oye en cada sección y verificarlo con marcas de tiempo.',
  },
  {
    id: 'm04-l11', moduleIndex: 4, lessonNumber: 11,
    title: 'Instrumentación por género y función de cada capa', kicker: 'Sesión 11 · Capas', minutes: 20,
    objective: 'Asignar a cada instrumento una función y un lugar en el espectro, según el género que elegiste.',
    blocks: [
      { heading: 'Las siete funciones de una producción', body: [
          'Toda producción se reparte en funciones, no en instrumentos. Una: pulso, lo que marca el tiempo (bombo, cajón, kick, tambora). Dos: groove, lo que hace que el cuerpo se mueva (dembow, güira, hi-hat en corcheas, montuno). Tres: fundamental, la nota grave que ancla la armonía (bajo eléctrico, synth bass, tuba). Cuatro: armonía, lo que sostiene los acordes (piano, guitarra, pad, cuerdas). Cinco: melodía complementaria, la contra melodía que responde a la voz. Seis: voz. Siete: aire, lo que llena sin informar (perk, ruidos, texturas, platillos).',
          'Escribe siempre el prompt en esos términos y después pon el instrumento: «groove: güira en corcheas», «fundamental: bajo eléctrico redondo duplicando el bombo». Con eso eliminas el modo lista de compras, que es la causa de que todo suene todo el tiempo. Y detectas la capa vacía: si no tienes quién haga la fundamental, el motor la inventa o la canción se queda sin piso.',
          'Regla de oro por sección: una función puede quedar vacía; dos funciones en el mismo instrumento, casi nunca. Un pad que hace armonía, contra melodía y aire al mismo tiempo produce una masa informe, y eso es lo que la gente llama «suena amateur» sin saber nombrarlo.',
        ] },
      { heading: 'Mapa por género: qué capa es obligatoria', body: [
          'Reggaetón y trap: dembow o patrón de hi-hat como groove, sub-bajo como fundamental sin melodía, pad o arpegio corto como armonía, voz con flow como melodía principal, poco aire. Si falta el patrón rítmico característico, no es urbano, es pop con percusión. El sub-bajo debe ser corto y rítmico, no una nota larga que emborra el centro.',
          'Pop y balada: pulso en batería o escobillas, armonía en piano o guitarra acústica, fundamental en bajo, cuerdas o sintetizador como capa que entra en el coro, contra melodía en el puente. El presupuesto 3-5-1 funciona aquí mejor que en cualquier otro género, porque la forma es la que pide la curva.',
          'Rock: pulso en bombo y caja, groove en corcheas de guitarra con palm mute, fundamental en bajo siguiendo la raíz, armonía en acordes abiertos del segundo plano, voz al frente con doblaje en coros. La guitarra debe tener función declarada: rítmica con palm mute en versos y acordes abiertos en coros; «guitarra eléctrica» sin función te devuelve un solo donde querías un colchón.',
          'Música caribeña y latinoamericana: la güira, el tres, la tambora, el cajón, el bajo tumbao y los metales no son color local, son funciones específicas. Antes de pedir «salsa» o «bachata» o «cumbia», escríbelas: quién hace la clave, quién el montuno, quién el tumbao, quién el mambó. Los metales son capa de acento, no armonía continua, y pedirlos siempre suena a jingle.',
        ] },
      { heading: 'Espectro: quién vive dónde', body: [
          'Reparte las capas por territorio de frecuencia y tendrás claridad sin mezclar. Graves de 20 a 120 Hz: solo el sub y el bombo, y decide cuál de los dos manda; si ambos son «muy presentes», pelean. Bajos de 120 a 400 Hz: bajo, cuerpo de guitarra, fundamental de piano. Medios de 400 a 2000 Hz: territorio de la voz, y aquí cualquier instrumento «presente» compite con ella. Medios-agudos de 2 a 6 kHz: consonantes, ataque de cuerdas, presencia. Agudos de 6 a 20 kHz: platillos, aire, brillo.',
          'Escribirlo en el prompt se ve así: «guitarras en registro medio-grave sin invadir la voz», «cuerdas en notas largas una octava sobre la melodía y muy suave», «teclas cortas sin brillo, no pasan de 4 kHz». Es la forma de pedir espacio sin tener un ecualizador en la mano, y suele ser más eficaz que cualquier adjetivo de calidad.',
          'El truco más rentable de esta lección: cuando algo suene a barro, no le subas a nada; quita una capa o bájale una octava. La mayoría de los problemas de densidad se arreglan por sustracción, y la sustracción sí es dirigible con prompt.',
        ] },
      { heading: 'Cuántas capas: presupuesto y silencio', body: [
          'El presupuesto clásico es tres capas en el verso, cinco en el coro, uno o dos en el puente. No es una norma estética: es una técnica para que la curva de energía exista sin mover volúmenes. Si empiezas con cinco en el verso, llegas al coro sin nada que sumar, y a partir de ahí solo te queda subir, que es exactamente lo que hace que una canción se sienta plana y cansada.',
          'El silencio también es una capa. Un compás sin nada antes del último verso, una batería que sale durante dos tiempos, la voz sola una línea: son decisiones que el motor ejecuta si las escribes («caja de ritmos se detiene un compás antes del coro, entra la voz sola»). Si nunca pides silencio, tu producción va a sonar ocupada siempre, y ocupada no significa intensa.',
        ] },
    ],
    examples: [
      'Prompt de capas con función, género urbano: «reggaetón nocturno, 92 BPM feel de medio tiempo, Fa menor; groove: dembow suave con hi-hat en corcheas; fundamental: sub-bajo senoidal corto y rítmico que duplica el bombo, sin contenido melódico; armonía: pad de sintetizador oscuro en registro medio, sin pasar de 3 kHz; melodía complementaria: guitarra con trémolo solo en el puente, una octava sobre la voz; voz masculina en registro bajo con flow conversado y mucho aire, canto en español con acento caribeño; mezcla: centro reservado a voz y sub, agudos sin filo, reverberación corta». Siete funciones declaradas, ninguna decorativa.',
      'Prompt de capas, rock: «rock alternativo, 132 BPM feel recto, Sol menor; pulso: bombo y caja secos; groove: guitarra con palm mute en corcheas solo en versos; fundamental: bajo que sigue la raíz con ataque redondo; armonía: segunda guitarra en acordes abiertos entrando en pre-coro; voz masculina media con borde rasposo y articulación percusiva; doblaje en coros; puente: batería fuera, queda bajo y voz; último coro: una capa de sintetizador muy suave en agudos; mezcla con voz al frente, graves cortos, estéreo moderado en guitarras». Aquí la guitarra cambia de función entre secciones y eso está escrito.',
      'Auditoría de una toma real: «suena embarrado» → conteo de capas: 6 en el verso (2 de ellas en el mismo territorio medio), sub-bajo y bombo ambos marcados como muy presentes, pad ocupando 300-900 Hz donde canta la voz. Corrección en una sola versión: «bajo y bombo, solo el bombo manda en el centro grave; pad movido a registro agudo y reducido; quito una capa del verso». Resultado: se entendió la voz en 0:18, sin cambiar género, tempo ni mezcla.',
    ],
    techniques: [
      'Prompt por función: escribe primero la tarea (pulso, groove, fundamental, armonía, melodía complementaria, aire) y después el instrumento. Nunca empieces por la lista de instrumentos.',
      'Auditoría de vacíos: revisa las siete funciones y marca cuál no tiene dueño. Un vacío de fundamental o de groove se oye como canción que no aterriza.',
      'Reparto espectral en una línea: declara qué instrumento no puede entrar en 400-2000 Hz mientras canta la voz, y quién manda en el centro grave.',
      'Presupuesto 3-5-1: tres capas en verso, cinco en coro, una o dos en puente. Es la forma más barata de crear dinámica real.',
      'Sustracción antes que adición: ante un resultado sucio, quita una capa o baja una octava; no añadas claridad ni subas presencia.',
      'Silencio escrito: pide un compás sin percusión o una línea a voz sola. El contraste negativo se dirige igual que el positivo.',
    ],
    prompts: [
      { name: 'Matriz de capas con función', outcome: 'Un prompt donde cada instrumento tiene tarea, sección y territorio.',
        variables: ['género', 'BPM', 'tonalidad', 'modo', 'instrumento', 'patrón', 'subdivisión', 'bajo o sub', 'duplica el bombo o sigue la raíz', 'corto o largo', 'manda él o el bombo', 'medio o grave', 'sección', '400-2000 Hz', 'una octava sobre la voz', 'registro, textura, articulación, acento', 'texturas o perk', 'estéreo', 'fondo', 'n', 'm', 'k', 'qué se detiene y cuándo'],
        text: 'Género: {género} · {BPM} BPM · {tonalidad} {modo}. Pulso: {instrumento} con {patrón}. Groove: {instrumento} en {subdivisión}. Fundamental: {bajo o sub} que {duplica el bombo o sigue la raíz}, {corto o largo}, {manda él o el bombo} en el centro grave. Armonía: {instrumento} en registro {medio o grave}, entra en {sección}, sin invadir {400-2000 Hz}. Melodía complementaria: {instrumento} solo en {sección}, {una octava sobre la voz}. Voz: {registro, textura, articulación, acento}. Aire: {texturas o perk} en {estéreo}, al {fondo}. Presupuesto: {n} capas en versos, {m} en coros, {k} en el puente. Silencio: {qué se detiene y cuándo}.' },
      { name: 'Ficha de género con sus funciones obligatorias', outcome: 'No dejar nunca vacía la capa que define al género.',
        variables: ['género y subgénero', 'dembow, güira, tambora, montuno, clave, hi-hat en corcheas, palm mute, escobillas', 'descripción del patrón', 'sub-bajo corto, bajo tumbao, bajo con ataque redondo', 'bombo o bajo', 'tres cubano, guitarra de bachata, Rhodes, pad oscuro, cuerdas largas', 'metales, perk, sintetizador brillante', 'solo en coros o solo en el puente', 'idioma y acento', 'género'],
        text: 'Género declarado: {género y subgénero}. Capa rítmica definitoria: {dembow, güira, tambora, montuno, clave, hi-hat en corcheas, palm mute, escobillas}, patrón: {descripción del patrón}. Capa grave definitoria: {sub-bajo corto, bajo tumbao, bajo con ataque redondo}, quiénes mandan en el centro: {bombo o bajo}. Capa armónica definitoria: {tres cubano, guitarra de bachata, Rhodes, pad oscuro, cuerdas largas}. Capa de acento: {metales, perk, sintetizador brillante} que entra {solo en coros o solo en el puente}, no continua. Canto: {idioma y acento}. Si falta alguna de estas cuatro, el resultado no es {género}, es genérico.' },
    ],
    exercise: {
      title: 'Auditoría de capas de una canción propia y de una referencia', deliverable: 'Una matriz con siete funciones por versión (referencia y tu v1 y v2), el mapa espectral en tres líneas y una nota de qué sustracción resolvió la claridad.',
      steps: [
        'Elige una referencia del género que estás trabajando y una toma tuya con el mismo género.',
        'Cuenta cuántas capas suenan en el primer verso de cada una, y luego en el coro; anota los números y los segundos exactos.',
        'Clasifica cada capa en las siete funciones e identifica qué función está vacía o duplicada en tu toma.',
        'Escribe el mapa espectral de tu toma en tres líneas: quién manda en el centro grave, quién ocupa los medios donde canta la voz, quién está en los agudos.',
        'Genera v2 aplicando una sustracción (quitar una capa o bajar una octava) y una redistribución, sin cambiar género ni tempo.',
        'Compara ambas en volumen igual y responde si la voz se entiende mejor en la primera estrofa.',
      ],
      checklist: [
        'Las siete funciones tienen dueño asignado o vacío declarado, tanto en la referencia como en tu toma.',
        'El conteo de capas por sección está expresado en números, no en impresiones.',
        'La corrección de v2 es una sustracción o una redistribución, no un añadido.',
        'La voz se entiende en el primer verso de v2 sin leer la letra, escuchando en el mismo volumen.',
      ],
    },
    listening: [
      { title: 'Salsa: funciones repartidas sin solaparse', search: 'salsa clásica clave montuno tumbao metales funciones de arreglos análisis',
        focus: 'Escucha una salsa clásica e identifica quién hace la clave, quién el montuno del piano, quién el tumbao del bajo y quién los acentos de metales. Ninguna capa hace dos trabajos. Cuenta cuántas suenan en un mambo frente a un verso: ahí está el presupuesto de capas.' },
      { title: 'Lo-fi: armonía con función doble declarada', search: 'lo fi hip hop rhodes acordes swing batería textura de vinilo función de capas',
        focus: 'Detecta en un beat de lo-fi qué instrumento trae los acordes (piano eléctrico), qué hace el groove (batería con swing) y qué textura ocupa el aire (vinilo). Escucha cómo el ruido de fondo funciona como capa legítima sin tapar la melodía.' },
      { title: 'Pop actual: silencio como arreglo', search: 'pop production drop out silence vocal solo then rebuild layers order',
        focus: 'Busca un pasaje donde la producción se detiene y queda la voz sola, y cronométralo. Escucha qué entra después y en qué orden, capa por capa. Ese orden es literalmente un prompt de arreglo.' },
    ],
    pitfalls: [
      { mistake: 'Pedir una lista de instrumentos sin funciones.', fix: 'Escribe la función primero y el instrumento después; si una capa no tiene tarea, no la pidas.' },
      { mistake: 'Sub-bajo y bombo ambos «muy presentes».', fix: 'Declara quién manda en el centro grave y deja al otro en segundo plano o en otra octava.' },
      { mistake: 'Metales o cuerdas sonando todo el tema.', fix: 'Conviértelos en capa de acento con sección de entrada («metales solo en el mambo y el último coro»).' },
      { mistake: 'Empezar el verso con la densidad del coro.', fix: 'Aplica el presupuesto 3-5-1; si no te queda nada por sumar en el coro, el problema es el verso.' },
    ],
    takeaway: 'Un instrumento entra a una mezcla por una función; dos funciones en el mismo lugar es lo que suena a amateur.',
  },
  {
    id: 'm04-l12', moduleIndex: 4, lessonNumber: 12,
    title: 'Tempo, groove, dinámica, tonalidad y referencias', kicker: 'Sesión 12 · Producción', minutes: 18,
    objective: 'Convertir una decisión de género en un groove concreto con curva de dinámica y una referencia legalmente usable.',
    blocks: [
      { heading: 'Tempo no es groove', body: [
          'Dos canciones a 96 BPM pueden sentirse radicalmente distintas: una con pulso en negras suela caminar, otra con hi-hat en tresillos corre sin avanzar. El tempo es el número; el groove es la distribución de acentos y subdivisiones alrededor de ese número. Por eso el prompt debe decir las dos cosas: «96 BPM, feel recto con hi-hat en corcheas y caja en el tercer tiempo» o «96 BPM, feel de tresillos con patrón de dembow y acento atrasado».',
          'Aprende cuatro grooves y con ellos diriges media discografía contemporánea en español: dembow (patrón de tres tres y caja, acento característico), cuatro de bachata con güira en corcheas, montuno cubano (arpegio en corcheas sobre clave), y swing de lo-fi (batería atrasada con hi-hat en corcheas con acento en las débiles). Declara el groove con nombre cuando exista, y con descripción cuando no: los nombres anclan vecindarios, las descripciones los corrigen.',
        ] },
      { heading: 'Curva de dinámica: el plano de la canción', body: [
          'La dinámica es un plano de entradas y salidas. Escríbelo como una sucesión: verso 2 capas con pulso en negras; pre-coro 3 capas con subdivisión doblada; coro 5 capas con platillos y doblaje vocal; verso 2 igual que el primero pero con un elemento nuevo; puente 1 capa y voz; último coro 6 capas o, al revés, se cae todo y queda voz antes de reventar. Ese texto es una instrucción, y el motor la ejecuta mejor que cualquier «que explote».',
          'Tres dispositivos producen el 80% de las dinámicas que reconoces: el drop-out (todo se detiene un compás y entra la voz), el build (una capa por compás hasta el clímax) y el drop (el clímax sin melodía, todo rítmico). Decláralos con nombre y con lugar: «drop-out un compás antes del último coro», «build de cuatro compases en el pre-coro», «drop instrumental después del segundo coro». Con eso diriges energía sin tocar volúmenes.',
        ] },
      { heading: 'Tonalidad y modo al servicio del groove', body: [
          'La tonalidad cumple tres trabajos en producción: define el registro cómodo de la voz, define el color y define dónde pueden bajar los instrumentos. En música bailable, el modo menor y el mayor funcionan distinto aunque el groove sea idéntico: menor suena nocturno, mayor suena festivo. Cambiar solo el modo entre dos versiones es la manera más limpia de probar dos destinos comerciales para la misma canción.',
          'Para generar, la armonía simple resiste mejor: cuatro grados que se repiten permiten que el modelo se concentre en timbre y groove. Pide tensión donde importe («el puente con un acorde prestado, resuelve en el coro») en lugar de una progresión elaborada de principio a fin. Si necesitas exactitud para un arreglo posterior, escribe la progresión en grados romanos: el motor los respeta mejor que las notas.',
          'Y una decisión práctica: no cambies de tonalidad a mitad de género. Si pides «cumbia electrónica en Do# menor con pads oscuros» y luego «coro eufórico en mayor», el motor tiene que modular sin haber sido entrenado para modular así. Es mejor cambiar la energía con capas que cambiar el modo dentro de la misma canción.',
        ] },
      { heading: 'Referencias: cómo usarlas sin copiar', body: [
          'Una referencia es una descripción de destino, no un permiso de copia. Lo que puedes tomar sin problema: tempo aproximado, densidad de capas, tipo de groove, balance entre voz y música, cantidad de espacio, curva de energía. Lo que no: melodías, letras, giros armónicos característicos, riffs reconocibles, ni la voz de esa artista. La diferencia legal está en la idea musical concreta, y los arreglos de producción general no son la obra protegida.',
          'La forma profesional de usar referencias es hacer una ficha de cuatro líneas: qué capto de aquí (espacio), qué de aquí (groove), qué de aquí (curva de energía), qué de aquí (voz y lugar en la mezcla). Escribiendo las cuatro fuentes como propiedades, y no una sola como nombre, obtienes un sonido propio con estándar de calidad profesional. Además: no pegues el título de una obra en el prompt de estilo; varias plataformas bloquean o degradan esos intentos.',
        ] },
    ],
    examples: [
      'Prompt con groove, dinámica y referencia descrita: «cumbia electrónica, 98 BPM feel recto con güira en corcheas y bajo tumbao en tiempos 2 y 4, La menor; armonía en sintetizador corto que no pasa de 3 kHz; versos 2 capas y pulso en negras; build de cuatro compases en el pre-coro sumando perk y arpegio; coro 5 capas con bajo desplazado; drop-out de un compás antes del último coro con voz sola; puente drop instrumental sin melodía; mezcla con percusión seca al frente y estéreo moderado». Fíjate que no hay ninguna obra nombrada.',
      'Dinámica con tres dispositivos en una misma canción: build de cuatro compases en el pre-coro, drop instrumental de ocho compases después del segundo coro, drop-out de un compás antes del último coro. Tres momentos que el oyente recuerda, y cada uno se puede pedir por su nombre.',
      'Ficha de referencia en uso: referencia A (espacio: reverberación corta, voz seca), referencia B (groove: patrón de medio tiempo con hi-hat en tresillos), referencia C (curva: 2-2-3-5-3), referencia D (voz: registro bajo con flow conversado). El prompt final mezcla las cuatro propiedades y el resultado no se parece a ninguna de ellas.',
    ],
    techniques: [
      'Tempo + feel + acento: tres palabras obligatorias después del número, para que 96 no signifique dos canciones distintas.',
      'Cuatro grooves base: dembow, güira de bachata en corcheas, montuno, swing de lo-fi. Decláralos con su nombre cuando exista y con una línea de descripción cuando no.',
      'Nombra tus dispositivos: build, drop, drop-out. Un lenguaje corto y estándar te deja escribir la curva de dinámica en una línea por sección.',
      'Modo como experimento controlado: genera la misma canción en menor y en mayor conservando tempo y capas. Dos destinos comerciales con una sola variable.',
      'Progresión en grados: para tensiones específicas escribe I-vi-IV-V o «con un acorde prestado en el puente»; el modelo respeta mejor grados que notas sueltas.',
      'Ficha de referencia de cuatro líneas: espacio, groove, curva, voz. Cada propiedad viene de una fuente distinta, así que el resultado es tuyo.',
    ],
    prompts: [
      { name: 'Groove y curva de dinámica', outcome: 'Dirigir el movimiento rítmico y los tres momentos de energía con nombre propio.',
        variables: ['género', 'BPM', 'recto, tresillos o medio tiempo', 'tiempo o subdivisión', 'nombre del patrón', 'instrumento', 'subdivisión', 'tiempos', 'bombo o sub', 'dónde', 'ataque', 'n', 'elemento que sostiene', 'build de cuántos compases sumando qué', 'm', 'elemento que abre', 'drop instrumental o voz sola durante cuántos compases', 'drop-out de un compás antes y luego qué', 'tonalidad', 'modo', 'grados romanos', 'tensión donde importa'],
        text: '{género}, {BPM} BPM, feel {recto, tresillos o medio tiempo}, acento característico en {tiempo o subdivisión}. Groove: {nombre del patrón} con {instrumento} en {subdivisión} y {instrumento} marcando {tiempos}. Pulso grave: {bombo o sub} en {dónde} y con {ataque}. Curva de dinámica: versos {n} capas con {elemento que sostiene}; pre-coro {build de cuántos compases sumando qué}; coros {m} capas con {elemento que abre}; puente {drop instrumental o voz sola durante cuántos compases}; último coro {drop-out de un compás antes y luego qué}. Tonalidad: {tonalidad} {modo}, progresión {grados romanos} y {tensión donde importa}.' },
      { name: 'Ficha de referencia en cuatro líneas', outcome: 'Extraer propiedades legales de varias fuentes sin nombrar ninguna obra.',
        variables: ['cantidad de reverberación y cercanía de la voz', 'patrón, subdivisión y dónde está el acento', 'niveles 1-5 en verso, pre-coro, coro, puente, último coro', 'registro, textura, articulación y función de los doblajes', 'cuatro referencias distintas, una propiedad por fuente', 'melodía, letra, riff, giro armónico característico, identidad vocal', 'pegar aquí solo las propiedades'],
        text: 'Espacio: {cantidad de reverberación y cercanía de la voz}. Groove: {patrón, subdivisión y dónde está el acento}. Curva: {niveles 1-5 en verso, pre-coro, coro, puente, último coro}. Voz: {registro, textura, articulación y función de los doblajes}. Fuentes consultadas: {cuatro referencias distintas, una propiedad por fuente}. Lo que conscientemente NO copio: {melodía, letra, riff, giro armónico característico, identidad vocal}. Prompt derivado: {pegar aquí solo las propiedades}.' },
    ],
    exercise: {
      title: 'Diseñar la curva de una canción con groove nombrado', deliverable: 'Un prompt de producción con groove nombrado, curva de dinámica en cinco secciones, dos dispositivos con nombre y una ficha de referencia de cuatro propiedades.',
      steps: [
        'Elige un género y define su groove con nombre y descripción de una línea, más el lugar del acento.',
        'Fija el tempo con feel y acento: tres palabras después del número de BPM.',
        'Escribe la curva de dinámica en cinco secciones con niveles de 1 a 5 y qué entra o sale en cada cambio.',
        'Asigna al menos dos dispositivos con nombre (build, drop, drop-out) a secciones concretas, con compases indicados.',
        'Elige el modo y justifica por qué ese color conviene al destino de la canción; genera la misma idea en el modo opuesto.',
        'Arma la ficha de referencia de cuatro líneas con cuatro fuentes distintas y pega solo las propiedades en el prompt final.',
      ],
      checklist: [
        'Después del BPM aparecen feel y lugar del acento, sin ambigüedad.',
        'La curva tiene niveles del 1 al 5 y especifica qué instrumento entra o sale en cada cambio.',
        'Al menos dos momentos están declarados con nombre de dispositivo y con su posición en compases.',
        'La ficha de referencia cita cuatro fuentes distintas sin copiar melodía ni voz, y se generaron ambas versiones modales con el mismo arreglo y tempo.',
      ],
    },
    listening: [
      { title: 'Clave y groove en música cubana', search: 'son cubano clave y montuno de piano análisis de groove capas',
        focus: 'Escucha un son clásico y sigue dos capas independientes: la clave (quién la marca) y el montuno del piano. Identifica en qué momento entran los metales como acento y no como armonía. Es el mejor ejemplo de groove con repartición limpia de funciones.' },
      { title: 'Dembow y su acento', search: 'dembow patrón acento tiempos reggaetón análisis de groove',
        focus: 'Localiza en un tema urbano el patrón de percusión y marca en qué tiempos cae el acento. Después escucha qué NO suena en el verso y cuántas cosas entran en el coro. Vas a oír la curva de dinámica hecha con un solo patrón.' },
      { title: 'Swing de lo-fi: atrasos deliberados', search: 'lo fi drums unquantized swing late groove human feel',
        focus: 'Escucha una batería de lo-fi e identifica que el bombo y la caja llegan ligeramente tarde. Esa holgura rítmica es la sensación de «humano», y se puede pedir en el prompt. Compara con una batería electrónica quantizada y nota la diferencia de temperatura.' },
    ],
    pitfalls: [
      { mistake: 'Pedir tempo y asumir que eso define el groove.', fix: 'Agrega feel, subdivisión y lugar del acento; o nombra el patrón (dembow, montuno, güira en corcheas).' },
      { mistake: 'Escribir «sube la energía» sin qué entra o sale.', fix: 'Nombra el instrumento, la subdivisión y la sección. La dinámica se describe con entradas y salidas.' },
      { mistake: 'Poner el nombre de una canción como referencia en el prompt.', fix: 'Extrae las cuatro propiedades a tu ficha y escríbelas como descripción. Evitas bloqueo, degradación y riesgo legal.' },
      { mistake: 'Cambiar de modo a mitad de la canción para generar emoción.', fix: 'Conserva el modo y cambia la energía con capas; si la modulación es esencial, hazla entre canciones o con edición externa.' },
    ],
    takeaway: 'El groove se nombra, la dinámica se planifica con entradas y salidas, y la referencia se copia solo en propiedades.',
  },
  {
    id: 'm04-l13', moduleIndex: 4, lessonNumber: 13,
    title: 'Ejercicio: transformar una idea pop en tres géneros', kicker: 'Sesión 13 · Práctica de módulo', minutes: 22,
    objective: 'Demostrar que una misma idea sostiene tres producciones distintas cambiando solo las variables dirigibles.',
    blocks: [
      { heading: 'Qué se conserva y qué se cambia', body: [
          'La idea es el material que no se toca: el gancho de cuatro a diez palabras, la melodía del coro, la métrica de los versos y la función de cada sección. Todo lo demás es vestuario: tempo y feel, groove nombrado, capas con función, perfil vocal, presupuesto de capas, mezcla y idioma del acento. En este ejercicio conservas la primera lista y cambias la segunda, tres veces. Si además cambias el gancho, ya no estás haciendo arreglos: estás escribiendo tres canciones.',
          'Al terminar vas a poder afirmar qué parte de tu canción es composición y qué parte es producción, y esa distinción es exactamente lo que necesitas en el módulo 5 para hablar de autoría, splits y licencias. Un arreglo nuevo no crea una obra nueva; una melodía y una letra nuevas sí.',
        ] },
      { heading: 'Tres recetas escritas como se dirigen', body: [
          'Bachata: 126 BPM feel recto, guitarra con arpegio en corcheas como groove, güira marcando corcheas y tambora en tiempos fuertes, bajo siguiendo la raíz, voz en registro medio con vibrato al final de cada frase, acento caribeño, doblaje en coros, mezcla con voz al frente y reverberación corta. La guitarra hace dos funciones: groove y armonía; decláralo para que no se apile.',
          'Regional mexicano norteño: 104 BPM feel recto en compás de tres por cuatro o seis por ocho según tu melodía, acordeón como melodía complementaria, bajo sexto arpegiando la armonía, tambora marcando el pulso y tololoche o bajo eléctrico en la raíz; voz masculina con borde rasposo y articulación percusiva, acento norteño, sin sintetizadores. Aquí el ejercicio es honesto: si tu melodía está escrita en cuatro tiempos, puede no funcionar en tres por cuatro, y esa es una decisión de composición, no de arreglo.',
          'House bailable: 124 BPM con kick en cada tiempo, hi-hat en corcheas con acento off-beat, bajo sintetizado rítmico que no hace melodía, pad abierto en coros, voz fragmentada convertida en riff repetido, build de ocho compases antes del drop y drop sin melodía. El gancho se repite muchas más veces que en el original: la forma del género manda sobre tu forma de pop.',
        ] },
      { heading: 'La matriz comparativa: tu entregable', body: [
          'Construye una tabla con las siete funciones como filas y los tres géneros como columnas. En cada celda escribe el instrumento y su función, o «vacío» si esa función no existe en ese género. Al terminar verás dos cosas útiles: qué funciones son universales (voz, fundamental, pulso) y cuáles son las que definen el género (groove y aire, casi siempre). Esa columna de groove es la que convierte «otra canción pop» en «bachata de verdad».',
          'Después agrega tres filas de decisión: cuánto tarda en aparecer el gancho en cada versión, cuántas capas hay en el coro y qué dispositivo de dinámica elegiste (build, drop o drop-out). Con eso tu matriz ya no es solo descriptiva: es un comparativo de producción, y puedes justificar cuál versión va a cuál destino.',
        ] },
      { heading: 'Cómo elegir la versión final sin adivinar', body: [
          'Tres preguntas de destino, por escrito. ¿Dónde va a sonar: playlist de género, reel, pista de baile, evento familiar? ¿Quién lo va a escuchar y qué espera del género: la comunidad que reconoce ese groove lo acepta o lo rechaza en veinte segundos? ¿Qué puedes sostener tú: si no puedes tocar esa música en vivo ni conseguiste quien la cante como corresponde, la versión más simple gana.',
          'La versión que gana no es la que suena «mejor»: es la que tiene destino. Regístralo con una línea por versión, porque en la Sesión 15 vas a necesitar explicar por qué publicaste la que publicaste, y porque en un portafolio profesional esa línea es lo que demuestra criterio. Un portafolio sin decisiones escritas es una colección de audios.',
        ] },
    ],
    examples: [
      'Idea de partida, conservada sin cambios en las tres versiones (gancho «sigo encendiendo lo que se apagó», coro de ocho compases en La menor, versos de ocho sílabas, duración objetivo 2:50) y transformada a bachata: «bachata, 126 BPM feel recto, La menor; groove: guitarra con arpegio en corcheas y güira en corcheas, tambora en tiempos fuertes; fundamental: bajo siguiendo la raíz con ataque corto; armonía: la misma guitarra en registro medio sin invadir la voz; voz masculina en registro medio con vibrato al final de cada frase, articulación ligada, acento caribeño, canto en español; doblaje en coros, sin coro masivo; el gancho aparece en 0:42; mezcla con voz delantera y reverberación corta, agudos sin filo». Melodía y letra: las de la idea pop, intactas.',
      'Prompt norteño: «norteño, 104 BPM, La menor en compás de tres por cuatro; pulso: tambora en tiempos fuertes; groove: bajo sexto arpegiado en corcheas; fundamental: tololoche o bajo eléctrico en la raíz; melodía complementaria: acordeón respondiendo entre frases vocales, nunca durante la voz; voz masculina con borde rasposo y articulación percusiva, acento norteño, canto en español; sin sintetizadores ni pads; puente: acordeón solo ocho compases; mezcla seca con percusión al frente y estéreo estrecho en el acordeón».',
      'Prompt house: «house bailable, 124 BPM, La menor; pulso: kick en cada tiempo; groove: hi-hat en corcheas con acento off-beat y percusión metálica en estéreo; fundamental: bajo sintetizado corto y rítmico sin melodía; armonía: pad abierto entrando en el coro; voz femenina fragmentada repitiendo el gancho como riff, con poco aire; build de ocho compases antes del drop; drop sin melodía con percusión y bajo; el gancho aparece en 0:28; mezcla con grave controlado y brillo alto sin siseo». El mismo material, otro destino.',
    ],
    techniques: [
      'Congela la idea: antes de transformar, escribe en una tarjeta el gancho, la melodía y la métrica, y no los toques en ninguna de las tres versiones.',
      'Tabla de siete funciones por tres columnas: llena cada celda con instrumento y función, y escribe «vacío» cuando el género no la usa. Los vacíos son información.',
      'Columna de groove como identidad: en cada género hay una capa que lo define; declárala primero y con su patrón, porque sin ella el resultado suena a pop con otro traje.',
      'Verificación comunitaria: pide a alguien que escuche tu versión de género y diga si el groove es creíble. El oído entrenado en ese género detecta en diez segundos lo que a ti te toma tres escuchas.',
      'Frase de destino por versión: escribe para dónde sirve cada arreglo. Sin destino, la comparación de tres versiones no se puede decidir.',
    ],
    prompts: [
      { name: 'Transformación de género conservando la idea', outcome: 'Un prompt de arreglo nuevo que mantiene el material de composición intacto.',
        variables: ['frase del gancho', 'descripción', 'n', 'secciones', 'mm:ss', 'género destino', 'BPM', 'recto, tresillos o medio tiempo', 'tonalidad', 'modo', 'y compás si cambia', 'instrumento y patrón', 'patrón con nombre', 'instrumento', 'sección', 'cuándo responde', 'registro, textura, articulación, acento', 'doblajes o armonías vocales', 'graves, agudos, espacio', 'build, drop o drop-out'],
        text: 'Material conservado sin cambios: gancho «{frase del gancho}», melodía del coro {descripción}, versos de {n} sílabas, estructura {secciones}, duración objetivo {mm:ss}. Arreglo nuevo: {género destino}, {BPM} BPM feel {recto, tresillos o medio tiempo}, {tonalidad} {modo} {y compás si cambia}; pulso: {instrumento y patrón}; groove definitorio: {patrón con nombre}; fundamental: {instrumento}; armonía: {instrumento} que entra en {sección}; melodía complementaria: {instrumento} {cuándo responde}; voz: {registro, textura, articulación, acento}; {doblajes o armonías vocales}; mezcla: {graves, agudos, espacio}; el gancho entra en {mm:ss}; dispositivo de dinámica: {build, drop o drop-out} en {sección}.' },
      { name: 'Matriz comparativa de tres arreglos', outcome: 'El entregable del módulo, en formato que se puede revisar y justificar.',
        variables: ['género 1', 'género 2', 'género 3', 'instrumento', 'función', 'mm:ss', 'n', 'build, drop o drop-out', 'dónde va a sonar', 'sí o no', 'quién escuchó'],
        text: 'Filas: pulso, groove, fundamental, armonía, melodía complementaria, voz, aire. Columnas: {género 1}, {género 2}, {género 3}. En cada celda: {instrumento} haciendo {función}, o vacío. Filas de decisión añadidas: gancho entra en {mm:ss} por versión; capas en coro {n} por versión; dispositivo elegido {build, drop o drop-out} por versión; destino declarado {dónde va a sonar} por versión; verificación de género creíble {sí o no} con comentario de {quién escuchó}.' },
    ],
    exercise: {
      title: 'Una idea, tres producciones', deliverable: 'Entregable del módulo: matriz comparativa con tres arreglos del mismo material, los tres prompts completos, la validación de género y el prompt final de producción justificado.',
      steps: [
        'Elige tu mejor idea pop hasta ahora y anota en una tarjeta el gancho, la melodía del coro, la métrica de los versos y la estructura. Desde ese momento queda congelada.',
        'Selecciona tres géneros que te interesen y declara para cada uno su capa de groove definitoria con nombre y patrón.',
        'Escribe tres prompts de transformación con la plantilla, cambiando solo la segunda lista: tempo, feel, groove, capas, voz, mezcla y momento del gancho.',
        'Genera dos tomas por género y llena la matriz comparativa de siete funciones por tres columnas, marcando los vacíos.',
        'Pide a una persona por género que valide si el groove es creíble, y registra su veredicto con una línea.',
        'Cierra con la versión seleccionada y una frase de destino por arreglo: dónde sonaría cada una.',
      ],
      checklist: [
        'El gancho, la melodía y la métrica son idénticos en las tres versiones y la tarjeta lo certifica.',
        'Cada género declara su capa de groove con nombre y patrón, no con la etiqueta del género solamente.',
        'La matriz tiene las siete funciones llenas o declaradas como vacías en las tres columnas.',
        'Hay una frase de destino por versión y una selección final con justificación.',
      ],
    },
    listening: [
      { title: 'Crossover de género: la misma canción en dos mundos', search: 'misma canción versión en dos géneros crossover comparación arreglo original y versión',
        focus: 'Busca una canción versionada en dos géneros distintos y escucha qué se conservó (melodía, letra, forma) y qué cambió (groove, instrumentación, tempo, voz). Ese par de versiones es exactamente el ejercicio que estás haciendo.' },
      { title: 'Bachata contemporánea: una guitarra con dos funciones', search: 'bachata guitarra arpegio requinto función de groove y armonía análisis',
        focus: 'Identifica cómo la guitarra hace groove y armonía a la vez, y cuándo aparece el arpegio continuo frente a los silencios. Localiza también el momento exacto en que entra la segunda capa y cuántas suenan en el coro.' },
      { title: 'House: el gancho convertido en riff', search: 'house vocal hook repeated as riff build and drop structure analysis',
        focus: 'Escucha una pista bailable con voz y cuenta cuántas veces se repite la misma frase. Observa cómo la voz deja de narrar y pasa a ser textura rítmica, y dónde está el build y dónde el drop. Es la lección de forma aplicada a otro género.' },
    ],
    pitfalls: [
      { mistake: 'Cambiar el gancho o la melodía al cambiar de género.', fix: 'Congela el material de composición en una tarjeta y revísala después de cada generación.' },
      { mistake: 'Pedir el género por etiqueta y no por su capa definitoria.', fix: 'Escribe siempre el groove del género con nombre y patrón; la etiqueta sola produce pop disfrazado.' },
      { mistake: 'Forzar una melodía escrita en cuatro tiempos a un compás de tres.', fix: 'Reconoce que eso es un problema de composición: adapta la melodía o elige un género en cuatro tiempos.' },
      { mistake: 'Elegir la versión que suena más espectacular.', fix: 'Decide por destino: dónde suena, quién lo escucha y qué puedes sostener tú después.' },
    ],
    takeaway: 'Si tu canción solo funciona en un género, tienes una producción; si funciona en tres, tienes una composición.',
  },
  {
    id: 'm05-l14', moduleIndex: 5, lessonNumber: 14,
    title: 'Selección, edición y control de versiones', kicker: 'Sesión 14 · Versiones', minutes: 18,
    objective: 'Pasar de veinte tomas prometedoras a un paquete de entrega con versión final, archivos y trazabilidad.',
    blocks: [
      { heading: 'Selección con criterios, no con cansancio', body: [
          'Después de tres sesiones de generación tienes veinte archivos, todos con algo bueno y nada terminable. Selecciona con cuatro filtros en este orden, y detente en el primero que falle: inteligibilidad (¿se entiende la frase clave del coro sin leer?), forma (¿se distinguen las secciones?), artefactos (¿hay sílabas pegadas, costuras, ruido bajo, un final cortado a media idea?) y repetición (¿la volverías a escuchar sin obligarte?). Un archivo que falla el segundo filtro se archiva, no se repara.',
          'Añade dos pruebas técnicas rápidas: escucha en el altavoz del teléfono y escucha en mono. La mayoría de las canciones generadas se escuchan bien en estéreo con audífonos y se desarman en mono o en un celular: la voz se entierra, el grave desaparece. Estas dos pruebas toman un minuto y salvan releases.',
          'Ponte un número máximo de candidatas: tres. Con cinco o más, la decisión se pospone indefinidamente y empiezas a comparar novedades en lugar de criterios. Tres candidatas, una elegida, y las otras dos reciben un destino escrito: loop, reel, base para otra letra, archivo con fecha.',
        ] },
      { heading: 'Edición: lo que se arregla fuera del motor', body: [
          'Hay cosas que la generación rara vez te da y la edición te da siempre: un intro de ocho compases que resulta de veinte, un final que se corta, un verso repetido de más, una costura de dos segundos entre secciones. Recorta, coloca fundidos de entrada y salida de uno a dos segundos y elimina compases muertos. Con eso solo ya tienes una canción radial y no una maqueta.',
          'Después, dos operaciones de alto rendimiento: acortar la canción y duplicar el coro final. El estándar de plataformas para canciones cortas funciona: si tus datos de escucha muestran que la mayor caída ocurre antes del segundo 40, el intro sobra. Y un repeat del último coro con una capa menos suele cerrar mejor que cualquier outro nuevo que inventes.',
          'Si la plataforma entrega pistas separadas, úsalas con moderación: la voz aislada sirve para ajustar su nivel, corregir un siseo o bajarla en el intro. No la uses para reconstruir la canción entera, porque los stems generados suelen tener filtrados y solapamientos: lo que ganas en control lo pierdes en coherencia. Edita para resolver un problema concreto, no para mezclar de cero.',
        ] },
      { heading: 'Control de versiones: que tu yo de dentro de un mes te entienda', body: [
          'Nombra los archivos sin poesía: CANCION_v03_R2_take1.wav, y el nombre final CANCION_FINAL_v05.wav, con la fecha dentro del nombre si vas a colaborar. En paralelo, el manifiesto de versiones: una fila por archivo con prompt pegado, fecha, plataforma y plan, qué cambió respecto a la versión anterior, quién escuchó y veredicto. Con esas dos cosas puedes reconstruir una decisión meses después; sin ellas, no.',
          'El manifiesto además te protege. Cuando hables de derechos, colaboraciones o licencias, necesitarás poder responder cuándo se hizo, con qué herramienta, qué parte era tuya y qué parte generó la máquina. Ese registro con fechas es tu evidencia; un correo a ti mismo con el archivo adjunto y la fecha ya sirve como prueba rudimentaria de existencia anterior.',
          'Cierra cada sesión con tres líneas: qué elegí, por qué, y cuál es el siguiente movimiento concreto. Si el siguiente movimiento es «generar más», cambia «generar» por «probar esta variable específica». Un control de versiones que no termina nada no es control: es acumulación.',
        ] },
      { heading: 'Empaquetado para entrega', body: [
          'Un paquete de release mínimo tiene cinco elementos: el audio final en la máxima calidad que la herramienta te entregue (WAV si existe, no MP3 recodificado), metadatos correctos (título, artista, género, año, lenguaje de la letra), arte con el título legible en miniatura, la letra con créditos y una nota de uso de IA, y el manifiesto de versiones. Lo que no va: catorce tomas alternativas, el archivo de sesión o tus notas internas.',
          'Y una regla de loudness honesta: las plataformas de streaming normalizan la reproducción, así que subir el volumen hasta deformar no hace que tu canción suene más fuerte que la de al lado, y sí puede hacerla sonar peor. El objetivo es una versión sin distorsión auditable, con picos verdaderos por debajo de cero dBTP y un nivel comparable al de tu referencia al mismo volumen. Los números de normalización los publica cada plataforma y cambian: verifícalos en su documentación oficial antes de masterizar para un destino específico.',
        ] },
    ],
    examples: [
      'Manifiesto real de cuatro versiones: «SOMBRA_v01 2026-02-03 plataforma A plan Pro: prompt base, coro en 0:58, voz se pierde en 1:12 → se descarta. v02 mismo prompt, 20 s de recorte de intro: gancho en 0:44, conserva. v03 cambia solo arreglo del coro (quita una capa aguda): se entiende la frase clave, artefacto de siseo nuevo en 2:04. v04 = v03 con esses suaves y final recortado 3 s. Elegida: v04. Destinos de descartes: v01 loop para reel, v02 archivo, v03 base para versión acústica». Todo el proceso cabe en una tarjeta y es reproducible.',
      'Edición que resolvió un problema no dirigible: una toma con un bridge excelente y un intro de 32 segundos. El prompt no lograba acortarlo. Se exportó, se recortó a 6 segundos y se aplicó un fade de 1,5 s. La decisión quedó registrada en el manifiesto como «edición externa: recorte de intro, no es cambio de prompt», para que en el futuro no se pida al motor algo que se arregla en dos minutos fuera.',
      'Chequeo de mono y teléfono: «en estéreo con audífonos: todo bien. En mono (0:52): la voz baja de nivel respecto al pad y el gancho se entierra. En el altavoz del teléfono (1:20): el sub-bajo desaparece y el coro pierde cuerpo». Conclusión de producción: pedir sub-bajo con contenido en armónicas medias y menos pad en 300-900 Hz en la siguiente versión, no subir el volumen de la voz.',
    ],
    techniques: [
      'Cuatro filtros en orden: inteligibilidad, forma, artefactos, repetición. El primero que falla decide el archivo, y no se discute.',
      'Doble prueba barata: altavoz del teléfono y escucha en mono. Detectan el 90% de los problemas que se vuelven públicos.',
      'Techo de tres candidatas: máximo tres archivos a evaluación final; el resto recibe destino o archivo con fecha.',
      'Nombre determinista: CANCION_vNN_Rr_takeN.wav y un FINAL con fecha. Nunca «definitiva», «última» o «ahora sí».',
      'Manifiesto de versiones: una fila por archivo con prompt pegado, fecha, plataforma, plan, cambio único y veredicto de quien escuchó.',
      'Edición fuera con propósito: recorta intros, arregla finales, duplica el último coro. Registra qué fue edición y qué fue prompt para no repetir el error de pedirlo al motor.',
    ],
    prompts: [
      { name: 'Manifiesto de control de versiones', outcome: 'Un registro que hace reproducible y auditable cualquier decisión de la sesión.',
        variables: ['CANCION', 'NN', 'AAAA-MM-DD', 'nombre y plan', 'si se declara', 'nombre.ext', 'mm:ss', 'pegado', 'NN-1', 'campo de valor a valor', 'qué cambió en mm:ss', 'cumple o falla', 'recorte, fade, duplicado, nada', 'final, candidata, descartada con destino'],
        text: '{CANCION}_v{NN} · fecha {AAAA-MM-DD} · plataforma {nombre y plan} · modelo {si se declara} · archivo {nombre.ext} · duración {mm:ss} · prompt exacto: {pegado} · cambio único respecto a v{NN-1}: {campo de valor a valor} · resultado escuchado: {qué cambió en mm:ss} · verificación mono y teléfono: {cumple o falla} · edición aplicada: {recorte, fade, duplicado, nada} · decisión: {final, candidata, descartada con destino}.' },
      { name: 'Paquete de entrega de una canción', outcome: 'Todo lo que necesitas antes de subir a un agregador o enviar a un colaborador.',
        variables: ['formato y nombre con versión', 'mm:ss', 'bajo cero dBTP', 'título', 'nombre real o artístico', 'género', 'AAAA', 'idioma', 'créditos por porcentaje', 'archivo', 'tamaño miniatura', 'archivo con secciones', 'qué fue letra propia, qué fue melodía propia, qué generó la herramienta, con fechas', 'acuerdo firmado o captura con fecha', 'listado con destino'],
        text: '1) Audio final: {formato y nombre con versión}, duración {mm:ss}, picos verdaderos {bajo cero dBTP}, sin distorsión auditable en {mm:ss} de clímax. 2) Metadatos: título {título}, artista {nombre real o artístico}, género {género}, año {AAAA}, idioma de la letra {idioma}, compositor {créditos por porcentaje}. 3) Arte: {archivo}, legible a {tamaño miniatura}. 4) Letra: {archivo con secciones}. 5) Declaración: {qué fue letra propia, qué fue melodía propia, qué generó la herramienta, con fechas}. 6) Splits: {acuerdo firmado o captura con fecha}. 7) Versiones alternativas: {listado con destino}.' },
    ],
    exercise: {
      title: 'De diez tomas a un paquete de release', deliverable: 'Un paquete de release con audio final editado, metadatos, arte, letra, declaración de participación, splits y manifiesto de tres versiones.',
      steps: [
        'Reúne todas tus tomas actuales y aplícales los cuatro filtros en orden; quédate con tres candidatas.',
        'Haz la prueba del teléfono y la de mono a las tres, con marcas de tiempo de lo que falla.',
        'Edita la elegida: recorta el intro, arregla el final y evalúa si duplicar el último coro mejora el cierre.',
        'Completa el manifiesto de versiones de cada una de las tres candidatas, con prompt pegado y cambio único.',
        'Arma el paquete de entrega con los siete elementos y escribe la declaración de qué fue tuyo y qué generó la herramienta.',
        'Asigna destino por escrito a cada archivo descartado y guarda el paquete en una carpeta con fecha.',
      ],
      checklist: [
        'Tres candidatas evaluadas con los cuatro filtros y con las pruebas de mono y teléfono documentadas.',
        'El archivo final tiene nombre con número de versión y fecha, y está en la máxima calidad disponible.',
        'El manifiesto permite reconstruir la decisión sin abrir la plataforma.',
        'La declaración separa letra, melodía, arreglos generados y edición externa, con fechas.',
      ],
    },
    listening: [
      { title: 'Comparar masters de un mismo álbum en distintas plataformas', search: 'loudness normalization streaming platforms same song volume difference phone speaker',
        focus: 'Busca una misma canción en dos servicios de música y comprueba si el volumen percibido cambia. Vas a notar que la normalización manda: por eso un master deformado por volumen no gana nada. Escucha además en el altavoz del teléfono una referencia del género y compara qué se pierde.' },
      { title: 'Estructura editada: intros cortos en el pop actual', search: 'pop song intro length vocal entry hook timing current releases analysis',
        focus: 'Cronometra en cinco canciones actuales en cuánto aparece la voz y en cuánto el gancho. Vas a encontrar intros mucho más cortos que los de hace quince años. Esa edición de recorte es una decisión de la que hablamos en este módulo y se puede hacer fuera del motor.' },
    ],
    pitfalls: [
      { mistake: 'Guardar todo y no decidir nada.', fix: 'Techo de tres candidatas y destino escrito para cada descarte. Decidir no es perder, es elegir.' },
      { mistake: 'Volver a codificar un MP3 sobre otro MP3.', fix: 'Trabaja siempre desde el archivo de mayor calidad disponible y exporta una sola vez al formato que pide el destino.' },
      { mistake: 'Masterizar más fuerte para «sonar como la referencia».', fix: 'Compara al mismo volumen de escucha y entrega una versión sin distorsión; la normalización de la plataforma hace el resto.' },
      { mistake: 'No registrar fecha, plataforma ni plan de cada toma.', fix: 'Agrega esos tres campos al manifiesto. Son la evidencia que vas a necesitar al hablar de derechos y colaboraciones.' },
    ],
    takeaway: 'Una canción termina cuando tiene versión final, manifiesto y un paquete que otros puedan usar sin preguntarte nada.',
  },
  {
    id: 'm05-l15', moduleIndex: 5, lessonNumber: 15,
    title: 'Brief profesional para colaborar y publicar', kicker: 'Sesión 15 · Brief y derechos', minutes: 22,
    objective: 'Preparar una canción para colaboración y publicación entendiendo qué es autoría, qué es licencia de plataforma y qué es distribución.',
    blocks: [
      { heading: 'El brief de colaboración: ocho campos antes de grabar', body: [
          'Un brief de colaboración se escribe antes de abrir el estudio, y tiene ocho campos: objetivo de la canción, destino (playlist, sync, live, regalo, venta), referencia de sonido descrita en propiedades, entregables con formato y calidad, plazos con fecha, decisión de créditos y porcentaje, quién aprueba la versión final y qué se considera terminado. Sin los dos últimos campos, toda colaboración termina en discusión; con ellos, termina en entrega.',
          'Los porcentajes se acuerdan antes, no después. En una canción hay dos capas de autoría: la composición (letra y música) y la grabación (el máster). Un colaborador que solo aporta un arreglo puede llevar 0% de composición y un pago único por su trabajo; quien escribe la mitad de la letra lleva una parte de composición. Escribe quién hizo qué con fechas: tu letra con fecha es la evidencia más clara de autoría humana en una canción hecha con IA.',
          'Y una convención que evita pleitos: el split sheet. Una hoja con los nombres, el porcentaje de cada uno sobre la composición y la fecha de acuerdo. Es simple, se firma en dos minutos y es lo primero que va a pedir cualquier agregador, sello o editor con experiencia. En muchas plataformas de distribución existe la función de splits, que además automatiza el pago: úsala en lugar de repartir dinero a mano cada mes.',
        ] },
      { heading: 'Quién posee lo que genera una IA: lo que es ley y lo que es política', body: [
          'Separemos dos cosas que la gente mezcla. El derecho de autor protege creaciones humanas: en la mayoría de los sistemas jurídicos, para que exista obra protegida hace falta autoría humana suficiente. Eso significa que una melodía y una letra que escribiste tú son tuyas con independencia de qué herramienta las grabó, mientras que una salida generada íntegramente por la máquina, sin intervención creativa humana determinable, puede no ser registrable o recibir una protección más débil.',
          'Cómo se resuelve cambia por país y cambia rápido. En Estados Unidos la oficina de copyright ha instruido que el material generado por IA sin autoría humana no es registrable, y que al registrar hay que declarar qué partes generó la IA y cuáles son humanas. En varios países latinoamericanos y en España se exige creación intelectual humana, con regímenes distintos para obras asistidas. Ningún tutorial resuelve esto: verifica la guía vigente de tu oficina nacional o consulta a un abogado antes de firmar una exclusividad.',
          'Lo que sí está en tu mano: maximizar tu autoría documentada. Letra escrita por ti, melodía del gancho definida por ti, selección y orden de secciones decidido por ti, edición y montaje hechos por ti, y todo eso con fecha. No son detalles burocráticos: son los elementos que la ley reconoce como aportación humana, y son también los que un tribunal o una oficina van a preguntarte.',
        ] },
      { heading: 'Licencia de la plataforma: permiso contractual, no un derecho de autor', body: [
          'Cuando una plataforma dice que «tú tienes los derechos de lo que generas», casi siempre está concediendo una licencia contractual de uso, no creando una obra registrable a tu nombre. Esos términos cambian según el plan: en muchas herramientas el uso comercial se permite solo a usuarios de pago, y los planes gratuitos imponen atribución, restricciones o ni siquiera otorgan permiso comercial. No asumas: lee los términos vigentes, guarda una captura fechada de la versión que aplicaba cuando generaste, y revisa si tu plan seguía activo en esa fecha.',
          'La responsabilidad del input es siempre tuya, aunque la plataforma se haga cargo del output. Si subes la letra de otra persona, una melodía reconocible de alguien más o una voz clonada sin consentimiento, el problema legal es tuyo y suele quedar expresamente en tu contra en los términos de servicio. Esto es especialmente relevante con voces: imitar una identidad vocal identificable puede violar derechos de imagen y de voz, que en varios países se protegen con o sin registro.',
          'Y una advertencia práctica: varias plataformas permiten usar el material de tus canciones para entrenar o mejorar sus modelos, salvo que desactives esa opción en configuración. Busca ese ajuste explícito, porque no está en todos lados en el mismo lugar. Lo mismo con los créditos: no afirmes en la ficha pública que compusiste en solitario algo que generó la máquina; la desinformación no te da protección y puede costarte distribuciones.',
        ] },
      { heading: 'Registro de la obra y distribución: ISRC y agregadores', body: [
          'Registrar una obra no crea el derecho: lo prueba. En México se acude al instituto nacional del derecho de autor; en España al registro territorial de la propiedad intelectual; en Estados Unidos a la oficina federal de copyright, con casillas específicas para declarar material generado por IA. Se registran letra y música como obra musical, y por separado el máster como grabación, cuando corresponde. El costo y el trámite varían; la ventaja es la misma en todos lados: una fecha oficial y una descripción de autoría.',
          'El ISRC es el código internacional que identifica una grabación concreta, no la composición. Está compuesto por un prefijo de país, un código de registrante, el año y un número secuencial de designación, todo definido por el estándar internacional administrado por la IFPI y sus agencias nacionales. Su uso práctico: cada versión distinta (máster nuevo, remix, edit para radio, regrabación) lleva un ISRC nuevo; la misma grabación en todas las tiendas comparte uno solo. Si un agregador te lo asigna, no lo inventes ni lo reutilices.',
          'Los agregadores (por ejemplo DistroKid, TuneCore, CD Baby y otros regionales) son los que entregan tu grabación a las tiendas y plataformas, y suelen ser quien te genera el ISRC. Se diferencian en el modelo de cobro — anualidad por artista, pago por lanzamiento o comisión sobre ingresos —, en los países donde pagan, en si permiten repartir splits automáticamente, y en qué políticas tienen sobre contenido generado con IA. Verifica siempre lo vigente en su propia página: esto cambia sin previo aviso.',
          'Responde con honestidad si el formulario pregunta por IA. Un agregador puede rechazar o retirar un lanzamiento por declaración falsa, y los sistemas de identificación de contenido exigen que declares tener todos los derechos sobre el audio que subes. La declaración no te quita oportunidades: te quita el riesgo de que te borren el catálogo con las regalías dentro.',
        ] },
    ],
    examples: [
      'Brief de colaboración real (ocho campos): «Objetivo: versión urbana de SOMBRA para playlist de género. Destino: plataformas y un reel de difusión. Referencia de sonido: espacio corto, voz delantera, sub-bajo rítmico, dembow suave, 92 BPM, feel de medio tiempo. Entregables: WAV final, pista sin voz, letra con secciones, manifiesto. Plazo: idea 3 días, voz propia 5, entrega final 12. Créditos: letra 100% mía, música compartida 70/30 por acuerdo escrito antes de generar. Aprueba: yo, porque la masterizo yo. Terminado: paquete de siete elementos más split firmado». Con eso no hay conversación pendiente.',
      'Split sheet en una línea de ejemplo de texto (no es un modelo legal): «SOMBRA — letra: 60% nombre A, 40% nombre B; música: 100% nombre A; fecha de acuerdo 2026-02-20; cada firmante declara contribuir con autoría humana y conoce que la grabación se realizó con una herramienta de IA identificada en el manifiesto». Esto es lo que se firma; las plantillas propias de cada país o sociedad son las que valen.',
      'Situación real de plataforma: «generé una canción en el plan gratuito, la subí a una tienda con mi nombre y ahora quiero monetizar». Acción correcta: leer los términos vigentes de ese momento, verificar si el plan gratuito concedía uso comercial, y si no, generar de nuevo en un plan con permiso o contactar a la plataforma por escrito. Guarda la respuesta: es tu licencia.',
    ],
    techniques: [
      'Ocho campos obligatorios del brief: objetivo, destino, referencia por propiedades, entregables, plazos, créditos y porcentajes, quién aprueba, qué es terminado.',
      'Split sheet antes de grabar: acuerdo de porcentajes con fecha, antes de la primera generación; si el agregador tiene splits automáticos, configúralos al subir, no después.',
      'Separar composición de máster: la obra (letra y música) y la grabación (el archivo) tienen dueños y registros distintos; nunca los escribas en una sola línea.',
      'Captura fechada de términos: guarda el texto de la política que regía cuando generaste. Es el documento que responde «podías usar esto comercialmente?» años después.',
      'Verificar el ajuste de entrenamiento: busca la opción de uso de tu material para entrenar modelos y decide conscientemente; no está en el mismo lugar en cada plataforma.',
      'Un ISRC por versión: máster nuevo, remix o edit = código nuevo. Pídelo al agregador y registra la correspondencia código-versión en el manifiesto.',
    ],
    prompts: [
      { name: 'Brief de colaboración en ocho campos', outcome: 'Un documento que se envía a un colaborador y evita la pelea de créditos.',
        variables: ['qué debe lograr la canción', 'playlist, reel, sync, live, venta directa', 'espacio', 'groove', 'curva de energía', 'voz y su lugar', 'audio final y formato', 'pista sin voz', 'letra con secciones', 'manifiesto', 'propuesta', 'grabación o generación', 'entrega final', 'porcentajes y nombres', 'porcentaje o pago único', 'nombre', 'lista de verificación', 'medio'],
        text: '1) Objetivo: {qué debe lograr la canción}. 2) Destino: {playlist, reel, sync, live, venta directa}. 3) Referencia de sonido por propiedades: {espacio}, {groove}, {curva de energía}, {voz y su lugar}. 4) Entregables: {audio final y formato}, {pista sin voz}, {letra con secciones}, {manifiesto}. 5) Plazos con fecha: {propuesta}, {grabación o generación}, {entrega final}. 6) Créditos y porcentajes: letra {porcentajes y nombres}, música {porcentajes y nombres}, arreglo {porcentaje o pago único}. 7) Quién aprueba la versión final: {nombre}. 8) Qué se considera terminado: {lista de verificación}. Firmas o constancia con fecha: {medio}.' },
      { name: 'Checklist de derechos antes de publicar', outcome: 'Una verificación final que evita retiradas, bloqueos y pleitos.',
        variables: ['original, con fecha y autoría humana declarada', 'propia o colaborativa, con split', 'confirmé no subir letra ni melodía de terceros, ni voces clonadas', 'captura fechada, plan activo, uso comercial permitido sí o no', 'revisado y decidido', 'describen con honestidad qué es humano y qué es generado', 'oficina nacional, fecha y número si existe', 'asignado por el agregador, uno por versión', 'configurados en el agregador o firmados', 'original o con licencia, sin marcas ni fotos sin permiso', 'contestada con verdad'],
        text: 'Letra: {original, con fecha y autoría humana declarada}. Melodía del gancho: {propia o colaborativa, con split}. Entrada de la herramienta: {confirmé no subir letra ni melodía de terceros, ni voces clonadas}. Términos de la plataforma al momento de generar: {captura fechada, plan activo, uso comercial permitido sí o no}. Ajuste de entrenamiento: {revisado y decidido}. Créditos públicos: {describen con honestidad qué es humano y qué es generado}. Registro: {oficina nacional, fecha y número si existe}. ISRC: {asignado por el agregador, uno por versión}. Splits: {configurados en el agregador o firmados}. Arte de portada: {original o con licencia, sin marcas ni fotos sin permiso}. Declaración de IA al agregador: {contestada con verdad}.' },
      { name: 'Plantilla de nota de créditos para la ficha pública', outcome: 'Describir tu trabajo sin inventar autoría ni esconder la herramienta.',
        variables: ['Título', 'nombre', 'fecha de escritura', 'género, BPM, tonalidad y capas', 'plataforma y plan', 'fechas', 'qué se recortó o montó a mano', 'quién o qué', 'licencia de la plataforma verificada el AAAA-MM-DD'],
        text: '{Título} · letra: {nombre}, {fecha de escritura}. Melodía del gancho: {nombre}. Arreglo y producción: {nombre} con dirección de {género, BPM, tonalidad y capas}, generado con {plataforma y plan} entre {fechas}. Edición final: {qué se recortó o montó a mano}. Mezcla y master: {quién o qué}. Se publican con los derechos correspondientes según {licencia de la plataforma verificada el AAAA-MM-DD}.' },
    ],
    exercise: {
      title: 'Preparar una canción para publicación con su expediente de derechos', deliverable: 'Un expediente de publicación con brief de ocho campos, split fechado, notas de términos de plataforma con captura, checklist de derechos resuelta y la comparación de dos agregadores.',
      steps: [
        'Elige la canción final de la Sesión 14 y redacta su brief de colaboración con los ocho campos, aunque trabajes en solitario.',
        'Lee los términos vigentes de la plataforma donde la generaste y anota: plan, fecha, permiso de uso comercial, política sobre voces y sobre entrenamiento. Guarda una captura.',
        'Prepara el split sheet con nombres, porcentajes de letra y música, y fecha; acuerdalo por escrito con quien participó.',
        'Verifica qué parte de la obra es autoría humana documentada (letra, melodía del gancho, selección, edición) y escríbela con fechas.',
        'Arma la checklist de derechos de quince puntos y resuelve cada vacío antes de contactar a un agregador.',
        'Compara dos agregadores con datos actuales de su propia página: modelo de cobro, países de pago, splits automáticos, política sobre contenido generado con IA y tiempo de revisión.',
      ],
      checklist: [
        'El brief declara créditos y porcentajes antes de cualquier generación nueva.',
        'Hay captura fechada de los términos de la plataforma y confirmación de que el plan permitía uso comercial.',
        'La checklist de derechos está completa sin casillas en blanco y la nota de créditos describe con honestidad qué hizo la máquina.',
        'La comparación de agregadores cita la página oficial de cada uno con la fecha de consulta, no información de terceros.',
      ],
    },
    listening: [
      { title: 'Leer los créditos reales de un lanzamiento', search: 'cómo leer los créditos de una canción compositor intérprete editor splits bases de datos de obras',
        focus: 'Busca en la ficha técnica de un álbum o en la base de datos de una sociedad de autores los créditos de una canción que te guste: quién figura como compositor, quién como productor, quién como intérprete. Vas a ver que el reparto no es «quien tocó más», sino quien aportó obra. Así se leen los splits en la práctica.' },
      { title: 'La misma canción, tres versiones con ISRC distinto', search: 'ISRC original remix radio edit different recording identifier metadata',
        focus: 'Localiza una canción en su versión original, un remix y una edición para radio, y revisa en la ficha de metadatos que cada grabación tenga su propio identificador. Eso confirma la regla operativa: una versión, un ISRC, y nunca reutilizar códigos.' },
      { title: 'Derechos de voz e identidad vocal en la conversación pública', search: 'AI voice cloning likeness rights artist impersonation platform policy news',
        focus: 'Busca coberturas periodísticas sobre imitación de voces con IA y los reclamos de artistas y sellos. Objetivo: entender por qué clonar una voz identificable es un problema jurídico distinto al del derecho de autor de la obra, y por qué las plataformas lo prohíben en sus términos.' },
    ],
    pitfalls: [
      { mistake: 'Asumir que «la plataforma dice que es mío» equivale a tener derechos registrables.', fix: 'Separa permiso contractual de autoría. Lee los términos de tu plan y verifica qué exige tu oficina nacional de registro.' },
      { mistake: 'Negociar porcentajes después de publicar.', fix: 'Split sheet antes de generar. Si la colaboración ya ocurrió, regularízalo por escrito con fecha y alcances claros.' },
      { mistake: 'Subir con otro nombre una letra o una melodía de terceros como input.', fix: 'Usa solo material propio o con licencia escrita; la responsabilidad del input casi siempre recae en tu cuenta.' },
      { mistake: 'Copiar información de derechos o regalías de un video o hilo de internet.', fix: 'Consulta fuentes primarias: la política vigente de la plataforma, la guía de tu oficina de registro y la página del agregador, con fecha de consulta.' },
    ],
    takeaway: 'Publicar sin expediente de derechos es publicar con fecha de caducidad: el brief, el split y la captura de términos son parte del release.',
  },
  {
    id: 'm05-l16', moduleIndex: 5, lessonNumber: 16,
    title: 'Proyecto final: produce dos canciones y presenta tu portafolio', kicker: 'Sesión 16 · Proyecto final', minutes: 25,
    objective: 'Entregar dos canciones terminadas con su evidencia y un portafolio que muestre criterio, no solo audios.',
    blocks: [
      { heading: 'La especificación del proyecto final', body: [
          'Dos canciones, un mismo estándar. Canción A: con voz, letra tuya completa, mínimo tres secciones distinguibles, gancho antes del minuto, paquete de entrega completo y expediente de derechos resuelto. Canción B: instrumental o con voz propia grabada encima de la generación, en un género distinto al de A, para demostrar que diriges direcciones diferentes y no un solo molde. Si una de las dos no tiene letra o melodía tuya documentada, no cuenta como canción: cuenta como experimento.',
          'El proceso también se entrega: mínimo tres versiones documentadas por canción, una prueba A/B de una variable, una matriz de siete funciones, y la decisión final con qué gana y qué pierde. Eso es lo que diferencia un portafolio de una lista de Spotify. Nadie contrata a alguien por tener canciones; se le contrata por poder explicarlas.',
          'Ponte límite de tiempo realista: dos semanas, tres sesiones por semana. El plazo obliga a decidir, y decidir es la habilidad que estás demostrando. Si en dos semanas no terminas, no es falta de talento: es un brief demasiado grande, y acotar la idea está bien.',
        ] },
      { heading: 'Cómo se estructura un portafolio que sirva', body: [
          'Cinco elementos, en este orden: quién eres y qué diriges (cuatro líneas), las dos canciones con su ficha, la evidencia de proceso por canción (prompt final, versiones, decisión), el detalle técnico (plataformas que dominas, qué sabes editar fuera, qué no), y un contacto con una petición concreta. La petición concreta hace más que cualquier adjetivo: «busco colaboraciones para voz femenina en urbano» obtiene respuestas; «abierto a oportunidades» no.',
          'Cada ficha de canción se escribe igual: género, BPM, tonalidad, voz y dirección, capas con función, estructura con segundos, prompt final, plataforma y plan, qué fue autoría humana, qué se editó fuera y en qué fecha. Diez líneas por canción. Ese formato demuestra que controlas el proceso y, de paso, te deja el texto listo para responder cualquier pregunta de un cliente, un colaborador o un agregador.',
          'Sé honesto con el rol de la IA: declarar «letra y melodía mías, arreglos generados y dirigidos por mí, mezclada en casa» no te resta credibilidad. Lo que te resta es afirmar autoría total sobre algo que no puedes explicar. La honestidad sobre la herramienta es hoy una señal de profesionalismo, no una debilidad.',
        ] },
      { heading: 'De dónde puede entrar dinero: canales, sin promesas', body: [
          'Primero, lo que no existe: no hay una tarifa universal por reproducción. El pago por stream lo acuerdan la plataforma y el distribuidor, y depende del país, del tipo de cuenta, del mix de escuchas y del contrato; varía tanto que cualquier cifra sin fuente primaria es ruido. Pide siempre la tarifa vigente al agregador y habla en rangos, no en promesas. Y ten presente: una canción aislada casi nunca genera ingresos relevantes; los canales que escalan son catálogo sostenido, uso en video y presentación en vivo.',
          'Segundo, los canales reales: regalías de ejecución pública a través de una sociedad de autores (en México SOCIM, en Colombia SAYCO, en España SGAE, en Estados Unidos ASCAP o BMI, entre otras), regalías mecánicas de reproducción y streaming a través de las entidades y servicios que correspondan en tu país, ingresos del agregador por tiendas, venta directa de audio y merchandising, presentaciones en vivo, encargos de música para creadores de contenido y licencias de sincronización. Cada canal tiene su propio registro, su propio trámite y sus propios tiempos de pago.',
          'Tercero, lo que depende de tu autoría demostrable: muchas sociedades y sistemas de identificación de contenido exigen declarar con precisión quién compuso qué y quién tiene derechos para cederlos. Si la obra no es registrable en tu jurisdicción por falta de autoría humana, puede que no puedas cobrar ciertas regalías aunque la canción se escuche. No es una razón para dejar de publicar; es una razón para escribir tú la letra y la melodía, y dejar constancia fechada.',
        ] },
      { heading: 'Cómo se cobra un sync: dos licencias y una negociación', body: [
          'Sincronización es el permiso para usar tu música junto a una imagen: serie, anuncio, videojuego, reel, documental. Se pagan dos licencias separadas y ambas tienen que estar en regla: la de sincronización sobre la composición, que depende de quien tiene los derechos de letra y música, y la de uso del máster sobre la grabación, que depende de quién es dueño de ese archivo concreto. Si trabajaste con una editorial, un sello o un colaborador, quizá no controles las dos, y entonces no puedes firmar.',
          'El precio lo fija un cruce de variables, no una tarifa: medio (televisión, cine, publicidad, plataforma, contenido de un tercero), territorio, plazo, exclusividad, duración del fragmento usado, prominencia (fondo o tema principal) y si incluye música como parte argumental o solo acompañamiento. Se suele pagar un fijo por uso, y en algunos acuerdos hay además regalías posteriores declaradas mediante un cue sheet ante la sociedad de autores. Negocia con datos y por escrito: jamás envíes un audio sin saber qué uso se pide.',
          'Las trampas frecuentes: «all media, perpetuity, worldwide, exclusive» sin límite de monto, que es un cesión total disfrazada; el work-for-hire que te quita la obra a cambio de un pago único, válido si es negocio pero debe ser consciente; y las bibliotecas de música que piden exclusividad de catálogo a cambio de distribución. Regla simple: si no puedes explicar el acuerdo en dos frases, no firmes. Y guarda siempre una versión sin exclusividad para otros usos.',
          'Ojo con el sync y la IA: muchos clientes piden garantías de que controlas todos los derechos del máster. Si tu grabación no tiene autoría humana clara, quizá puedas ceder un uso pero no una exclusividad defendible. Sé preciso en la propuesta: «música y letra de mi autoría, producción asistida con IA, controlo el máster, no puedo conceder garantía de no-infracción sobre el modelo» es una respuesta profesional; «es 100% mía» es un riesgo para las dos partes.',
        ] },
    ],
    examples: [
      'Ficha de portafolio, canción A: «SOMBRA — urbano pop, 92 BPM feel de medio tiempo, Do# menor. Letra y melodía del gancho: mías, escritas el 2026-02-01, archivo con fecha. Arreglos: dirección propia con prompt de siete capas, generado en plataforma con plan activo. Versiones: 5 documentadas, una prueba A/B de BPM. Edición externa: recorte de intro de 26 a 6 segundos, fade final de 1,5 s. Duración final 2:48. Créditos declarados, split firmado, ISRC asignado por el agregador». Diez líneas, cero humo.',
      'Propuesta de sync bien escrita: «Título: SOMBRA. Géneros y moods: urbano pop nocturno, 92 BPM, Do# menor, voz femenina en español, gancho en el segundo 44. Duración total 2:48, con versiones: completa, 60 s, 30 s, 15 s sin voz y loop instrumental de 8 compases. Uso solicitado: {medio, territorio, plazo, exclusividad}. Lo que cedo: sincronización y uso del máster, no exclusividad de catálogo. Lo que no puedo garantizar: no-infracción sobre el modelo de generación, que se declara en los créditos». Con eso un supervisor musical puede responderte con una cifra.',
      'Reflexión de aprendizaje útil (estructura, no plantilla): «Lo que más cambió mi resultado no fue el modelo: fue escribir el groove con nombre y dejar tres capas en el verso. El error que más repetí fue cambiar dos variables a la vez: en v3 perdí dos sesiones creyendo que el problema era la voz. La próxima etapa: grabar mis propias voces para el 50% de las canciones, porque ahí está mi problema de identidad y de derechos». Una reflexión con un error nombrado y un plan concreto vale más que diez líneas de entusiasmo.',
    ],
    techniques: [
      'Ficha de diez líneas por canción: género, tempo, tonalidad, voz, capas con función, estructura, prompt final, plataforma y plan, participación humana documentada y edición externa con fecha.',
      'Prueba de la explicación oral: si no puedes explicar tu canción en dos minutos a alguien que no conoce tu proyecto, el portafolio todavía no está listo.',
      'Versiones para sync: entrega siempre completa, 60, 30 y 15 segundos, más una versión sin voz y un loop instrumental. Un supervisor compra lo que puede montar, no lo que te gusta a ti.',
      'Lectura de acuerdo en dos frases: medio, territorio, plazo, exclusividad y qué cesión concreta das. Si no cabe en dos frases, pide aclaración antes de firmar.',
      'Catálogo con destinos: una canción para publicar, una para sync, una para regalo o vivo. Diversificar destinos rinde más que repetir el mismo intento monetario.',
      'Cierre con pedido: el portafolio termina con una solicitud específica, no con «abierto a oportunidades». Define el tipo de colaboración que buscas.',
    ],
    prompts: [
      { name: 'Ficha de portafolio por canción', outcome: 'El documento que convierte una pista en evidencia de criterio profesional.',
        variables: ['título', 'vNN', 'AAAA-MM-DD', 'género', 'destino', 'BPM', 'recto, medio tiempo o doble', 'tonalidad', 'modo', 'mm:ss', 'registro, textura, articulación, acento', 'pulso', 'groove', 'fundamental', 'armonía', 'melodía complementaria', 'aire', 'título del archivo y fecha', 'cómo la definiste', 'qué decidiste', 'plataforma y plan', 'fechas', 'n', 'variable', 'qué gana y qué pierde', 'splits firmados, términos verificados, registro si existe, ISRC asignado'],
        text: 'Título: {título} · versión final {vNN} · fecha {AAAA-MM-DD}. Género y destino: {género}, para {destino}. Datos: {BPM} BPM feel {recto, medio tiempo o doble}, {tonalidad} {modo}, duración {mm:ss}, gancho en {mm:ss}. Voz: {registro, textura, articulación, acento}. Capas con función: {pulso}, {groove}, {fundamental}, {armonía}, {melodía complementaria}, {aire}. Autoría humana documentada: letra {título del archivo y fecha}, melodía del gancho {cómo la definiste}, selección de secciones y edición {qué decidiste}. Herramienta: {plataforma y plan}, generado entre {fechas}. Versiones: {n} documentadas, prueba A/B de {variable}, decisión {qué gana y qué pierde}. Estado legal: {splits firmados, términos verificados, registro si existe, ISRC asignado}.' },
      { name: 'Cotización de sync en dos frases', outcome: 'Responder a un pedido de uso sin regalarte ni perder el trato.',
        variables: ['Título', 'duración total', 'completa, 60 s, 30 s, 15 s, sin voz, loop', 'medio', 'territorio', 'plazo', 'exclusividad sí o no', 'duración del fragmento', 'prominencia: fondo o principal', 'licencia de sincronización sobre composición y licencia de uso de máster, con o sin exclusividad', 'cesión total, perpetuidad, todos los medios', 'monto', 'rango propio por tipo de uso y medio, que defines tú y defiendes por escrito'],
        text: 'Dos frases de control antes de cotizar: «Qué uso concreto piden» y «Qué estoy cediendo». Respuesta al cliente: {Título}, {duración total} con versiones {completa, 60 s, 30 s, 15 s, sin voz, loop}. Uso solicitado: {medio}, {territorio}, {plazo}, {exclusividad sí o no}, {duración del fragmento}, {prominencia: fondo o principal}. Cedo: {licencia de sincronización sobre composición y licencia de uso de máster, con o sin exclusividad}. No cedo: {cesión total, perpetuidad, todos los medios} salvo acuerdo aparte de {monto}. Base de cotización: {rango propio por tipo de uso y medio, que defines tú y defiendes por escrito}. Nota de origen: producción asistida con IA declarada en créditos; controlo el máster; no garantizo derechos sobre el modelo de generación.' },
      { name: 'Reflexión final de tres párrafos', outcome: 'Cerrar el curso con lo que vas a hacer distinto, escrito con evidencia.',
        variables: ['la decisión que más cambió tu resultado', 'versión y mm:ss', 'el error que más cometiste', 'sesiones o tiempo', 'regla que aplicaste', 'qué vas a hacer con las canciones terminadas', 'qué habilidad vas a entrenar', 'qué vas a dejar de hacer'],
        text: 'Párrafo 1, decisión técnica: {la decisión que más cambió tu resultado}, evidenciado en {versión y mm:ss}. Párrafo 2, error repetido: {el error que más cometiste}, qué costó {sesiones o tiempo} y cómo lo corregiste {regla que aplicaste}. Párrafo 3, plan de tres meses: {qué vas a hacer con las canciones terminadas}, {qué habilidad vas a entrenar}, {qué vas a dejar de hacer}.' },
    ],
    exercise: {
      title: 'Proyecto final: dos canciones, portafolio y plan de uso', deliverable: 'Entregable final: portafolio con dos canciones terminadas y trazables, dos expedientes de derechos, fichas de producción con prompt final y evidencia de versiones, cuatro versiones listas para sync y una reflexión de tres párrafos con plan a tres meses.',
      steps: [
        'Escribe letra y melodía del gancho de dos canciones distintas, con fecha y archivo propio, en géneros diferentes.',
        'Genera cada canción con prompt de siete campos, documenta mínimo tres versiones y aplica una prueba A/B de una variable.',
        'Cierra el paquete de entrega de cada canción: audio final, metadatos, arte, letra, nota de créditos, split y manifiesto de versiones.',
        'Completa el expediente de derechos con la checklist de quince puntos y, si vas a publicar, elige agregador con datos de su página oficial fechados.',
        'Arma el portafolio con las dos fichas de diez líneas, la evidencia de proceso, el detalle técnico y un contacto con petición concreta.',
        'Prepara para la canción A las cuatro versiones de sync (60, 30, 15 y sin voz) con su cotización en dos frases y escribe la reflexión final de tres párrafos.',
      ],
      checklist: [
        'Las dos canciones tienen letra y melodía de autoría humana documentada con fecha, en géneros distintos.',
        'Cada canción trae paquete de entrega completo, manifiesto de mínimo tres versiones y expediente de derechos sin casillas en blanco.',
        'El portafolio permite explicar cada canción en dos minutos y termina con una petición concreta de colaboración.',
        'La canción A incluye versiones de 60, 30 y 15 segundos más una sin voz, con su propuesta de sync redactada en dos frases, y la reflexión final nombra un error propio, su costo y el plan de tres meses.',
      ],
    },
    listening: [
      { title: 'Auditoría de una licencia de sync en la conversación pública', search: 'synchronization license variables media territory term exclusivity explained',
        focus: 'Busca coberturas sobre canciones usadas en publicidad o cine y localiza qué variables se mencionan: medio, territorio, plazo y exclusividad. No busques cifras: busca estructura del acuerdo. Eso es lo que vas a negociar con dos frases.' },
      { title: 'Edit de una misma canción para distintos usos', search: 'radio edit versus album version what is cut shorter structure comparison',
        focus: 'Escucha una canción en su versión álbum y en su edit para radio o trailer: qué se corta, qué se repite y qué se deja de lado para caber en 30 o 60 segundos. Ese ejercicio de recorte es el mismo que harás con tus cuatro versiones de sync.' },
      { title: 'Portafolios de productores que explican sus decisiones', search: 'music supervisor portfolio producer credits listing bpm versions available',
        focus: 'Busca páginas profesionales de productores o compositores de música para medios y observa cuánta información escrita acompaña cada audio: géneros, moods, BPM, versiones disponibles, contacto. El audio es la mitad; la ficha es la que cierra el negocio.' },
    ],
    pitfalls: [
      { mistake: 'Prometer ingresos por stream con cifras copiadas de internet.', fix: 'Habla en rangos y cita la tarifa vigente de tu agregador y de tu país, consultada en su página y con fecha. Si no la sabes, no la cites.' },
      { mistake: 'Firmar una cesión total creyendo que firmas un uso.', fix: 'Exige medio, territorio, plazo y exclusividad por escrito. «Todos los medios, perpetuidad, mundial, exclusiva» es otra cosa y se cobra distinto.' },
      { mistake: 'Presentar un portafolio con veinte audios y cero explicaciones.', fix: 'Dos canciones con ficha, versiones y decisión escrita valen más que una lista de pistas que nadie puede interpretar.' },
      { mistake: 'Declarar autoría total sobre una obra generada.', fix: 'Describe con precisión qué es tuyo y qué hizo la herramienta. Es más creíble, y te protege cuando alguien pida garantías.' },
    ],
    takeaway: 'El curso termina cuando tienes dos canciones explicables, un expediente de derechos y un plan para usarlas.',
  },
]

export const COURSE_TOTAL_LESSONS = 16 // debe coincidir con COURSE_LESSONS.length; el SQL tiene 16 en course_total_lessons()

export function lessonById(id: string): Lesson | undefined {
  return COURSE_LESSONS.find((lesson) => lesson.id === id)
}

export function lessonsByModule(index: number): Lesson[] {
  return COURSE_LESSONS.filter((lesson) => lesson.moduleIndex === index)
}

export const COURSE_BADGES: Array<{ code: string; name: string; requirement: string }> = [
  {
    code: 'primer_prompt',
    name: 'Primer prompt',
    requirement: 'Completa tu primera lección y escribe un prompt con las cinco decisiones básicas.',
  },
  {
    code: 'oido_critico',
    name: 'Oído crítico',
    requirement: 'Completa 5 lecciones comparando versiones y documentando qué cambió en el audio.',
  },
  {
    code: 'productor_ia',
    name: 'Productor IA',
    requirement: 'Completa las 16 lecciones del curso, incluida la entrega del portafolio final.',
  },
  {
    code: 'primera_cancion',
    name: 'Primera canción',
    requirement: 'Marca una canción como lista en el estudio: tu primera pieza terminada y trazable.',
  },
]
