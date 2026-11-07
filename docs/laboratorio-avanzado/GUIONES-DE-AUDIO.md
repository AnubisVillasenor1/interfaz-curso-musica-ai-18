# Guiones de audio — Laboratorio técnico de audio e IA musical

**Institución:** TAMV Online Network · Play & Go  
**Autor del curso:** Edwin Oswaldo Castillo Trejo  
**Atribución de apoyo:** contenido planificado y revisado con apoyo de IA; el autor conserva la responsabilidad académica y editorial.

## Criterio de producción sonora

Cada audio guía debe tener objetivo observable, explicación conceptual, un ejemplo identificado, una demostración reproducible, un error común, una limitación del método y una acción final. Las medidas se narran únicamente después de ejecutar el código con la pista concreta que se muestra. No se inventan resultados de escucha, de tempo, de LUFS o de separación.

## Guion A — Cómo leer la STFT sin sobreinterpretarla

**Duración prevista:** 6–7 minutos.  
**Objetivo:** explicar qué muestran los ejes de una STFT y elegir una ventana según la pregunta analítica.  
**Apoyos visuales:** forma de onda, espectrograma lineal y cuatro configuraciones STFT.

### 0:00–0:30 — Introducción

Hoy vamos a convertir una canción en una representación que podamos estudiar. Al terminar podrás leer una STFT, identificar qué muestra el tiempo y qué muestra la frecuencia, y explicar por qué no existe un tamaño de ventana perfecto para todos los instrumentos. No vamos a dejar que una gráfica decida por nosotros: la vamos a contrastar con la escucha.

### 0:30–1:15 — Contexto

Cuando escuchas una mezcla, suceden varias cosas al mismo tiempo. Un bombo puede durar unos milisegundos; un bajo puede sostener una nota; un platillo puede generar una cola brillante. Una FFT aplicada a toda la canción resume el contenido frecuencial de la grabación, pero pierde la ubicación temporal de esos eventos. Necesitamos mirar la señal en fragmentos consecutivos.

### 1:15–3:15 — Concepto central

La STFT es la transformada de Fourier aplicada sobre ventanas sucesivas. Primero dividimos la señal en tramos, normalmente solapados. Aplicamos una ventana como Hann para reducir discontinuidades en los bordes. Calculamos el espectro de ese tramo y repetimos el proceso para el siguiente. Al colocar los espectros uno junto a otro obtenemos la evolución tiempo-frecuencia.

El parámetro n_fft determina cuántas muestras intervienen en cada ventana y cuántos bins frecuenciales contiene el resultado. Una ventana mayor permite distinguir componentes frecuenciales más cercanos, algo útil en notas graves que comparten bandas próximas. Pero la ventana dura más tiempo: el ataque de una caja o un bombo queda distribuido en una región temporal más amplia.

Una ventana menor localiza mejor los transitorios, pero separa las frecuencias con menos detalle. Por eso no se trata de escoger el número más grande. Se trata de formular la pregunta: ¿quiero saber cuándo ocurrió un ataque o distinguir componentes frecuenciales cercanos?

Hop_length es otro parámetro. Controla el salto entre el inicio de una ventana y la siguiente. Un salto pequeño genera más columnas y aumenta la densidad temporal de representación, pero no crea más resolución frecuencial. n_fft y hop_length tienen funciones distintas y deben registrarse por separado.

### 3:15–4:30 — Ejemplo visual

En la gráfica, el eje horizontal representa el tiempo y el vertical la frecuencia. El color muestra magnitud relativa, expresada respecto a la referencia elegida para este gráfico. No es una medición de presión sonora calibrada en una sala. Un ataque puede aparecer como una banda vertical; una nota sostenida puede dibujar una estructura más horizontal. Sin embargo, un sintetizador puede imitar el timbre de un instrumento acústico y varias fuentes pueden compartir la misma región frecuencial.

### 4:30–5:45 — Demostración

Ejecuta el comparador de STFT con una pista que tengas derecho a analizar. Compara ventanas de 256, 1024, 2048 y 4096 muestras. Mira la batería y después una nota grave sostenida. Escribe qué detalle aparece con una ventana menor y cuál aparece con una mayor. No elijas según el color más llamativo; elige según lo que necesitas medir.

### 5:45–6:30 — Error común

Un error frecuente es decir que un pico en el espectrograma demuestra qué instrumento está sonando. La STFT describe energía espectral; no etiqueta fuentes por sí sola. Otro error es pensar que la escala mel siempre es más exacta. La escala mel puede ser útil para una representación aproximada a la percepción auditiva, mientras que una escala lineal sigue siendo útil para localizar frecuencias en Hz.

### 6:30–7:00 — Cierre y acción

Entrega una comparación de dos configuraciones, una razón técnica para cada una y una marca de tiempo confirmada por escucha. Separa lo que mide la gráfica, lo que oyes y lo que supones. En la próxima lección extraeremos características y veremos por qué el tempo automático también necesita verificación humana.

## Guion B — Masterizar con criterio, no con un número mágico

**Duración prevista:** 7–8 minutos.  
**Objetivo:** distinguir peak, RMS, LUFS y true peak estimado; preparar un plan de masterización según el destino.  
**Apoyos visuales:** reporte JSON, espectro promedio, comparación A/B y un medidor de loudness.

### 0:00–0:35 — Introducción

Hoy vamos a hacer que una mezcla sea más fiable, no simplemente más fuerte. Al terminar podrás leer un informe de loudness, distinguir peak de true peak, diagnosticar un posible problema de balance y elegir una versión final mediante escucha y medición. La masterización no es una carrera hacia el número más alto: es una etapa de control de calidad para un destino concreto.

### 0:35–1:20 — Contexto

Una mezcla puede parecer impresionante por el volumen y, aun así, perder transitorios, cansar rápido o distorsionar durante la codificación. Otra puede conservar dinámica útil pero necesitar una corrección de balance. Antes de tocar un limitador, registra el estado original. Si guardamos esa versión, podremos demostrar qué cambió y por qué.

### 1:20–3:20 — Concepto central

Peak sample-based identifica la muestra digital de mayor magnitud respecto a la escala completa. RMS resume el nivel cuadrático medio bajo una convención. LUFS integrados utiliza ponderación y gating definidos por el método de medición para aproximar la sonoridad percibida. Son unidades relacionadas, pero no intercambiables.

True peak intenta estimar los picos de la señal reconstruida entre muestras. Ese máximo puede estar por encima del peak sample-based. El laboratorio sobremuestrea cuatro veces y etiqueta el resultado como estimación. No lo presenta como una certificación conforme a un estándar. Para una entrega comercial o de broadcast, utiliza un medidor apropiado y vuelve a medir el archivo codificado cuando lo exija el destino.

Tampoco hay una meta LUFS única para todo. EBU R 128 se dirige a un contexto de radiodifusión y propone una referencia de sonoridad para programas dentro de ese marco. Las plataformas musicales publican sus propias recomendaciones de reproducción. No conviertas la normalización de playback en una obligación universal de masterización. El destino y la intención artística determinan el criterio que debes consultar y documentar.

### 3:20–4:35 — Ejemplo

En el reporte aparecen peak sample-based, RMS, LUFS y una estimación de true peak. Si el pico de muestras se mantiene por debajo de cero pero la estimación de picos intersample se acerca al límite de entrega, no basta con mirar el primer medidor. Si la correlación estéreo resulta negativa, revisa la relación de fase y escucha en mono; un valor cercano a cero no demuestra por sí solo que la imagen estéreo sea amplia o correcta.

### 4:35–5:50 — Demostración

Ejecuta el diagnóstico de la mezcla original. Revisa duración, canales, niveles, espectro y reporte JSON. Antes de abrir un ecualizador, escribe una hipótesis: qué fuente compite, en qué tramo y qué deberías oír si la corrección funciona. Si decides comprimir, cambia parámetros de forma controlada y guarda una versión nueva. No apliques filtros pasa-altos indiscriminadamente ni confundas centroide alto con mejora automática.

### 5:50–7:00 — Comparación A/B y error común

Compara la mezcla original con la versión final. El gráfico de diferencia espectral bruta también refleja variaciones de ganancia global. Escucha ambas versiones a sonoridad igualada: de lo contrario la más fuerte puede parecer mejor aunque tenga menos definición o dinámica. Un error común es aprobar una mezcla por un número LUFS aislado y no documentar destino, true peak, formato de salida ni derechos del material.

### 7:00–7:40 — Cierre y acción

Entrega original, versión corregida, master, reportes y gráfica de diferencia. Indica el destino, el método de medición y la decisión más importante que tomaste. Distingue resultados medidos de juicios auditivos. La siguiente persona debe poder reconstruir el proceso y discutir tu conclusión. La herramienta no firma el master por ti: la responsabilidad final sigue en tus manos.

## Guiones aún por producir

Los audios sobre RMS/centroide/chroma/onsets, separación de fuentes y comparación A/B seguirán esta misma estructura de siete segmentos. Cada guion debe nombrar la configuración, utilizar resultados reales de una ejecución y dedicar al menos una sección a límites de inferencia y derechos de la fuente.
