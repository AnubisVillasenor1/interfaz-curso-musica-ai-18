# Módulo técnico 2 — Diagnóstico de mezcla, dinámica y masterización

**Trayecto:** Laboratorio técnico de audio e IA musical · TAMV Online Network  
**Autor del curso:** Edwin Oswaldo Castillo Trejo · **Apoyo declarado:** IA para estructuración y revisión de materiales.  
**Nivel:** inicial–intermedio con práctica de mezcla · **Tiempo orientativo:** 5–7 horas.  
**Resultado:** un diagnóstico con métricas, dos o más versiones comparables, un master exportado y una justificación que no se apoya solo en “suena más fuerte”.

## Competencia de salida

La persona estudiante podrá interpretar peak sample-based, RMS, LUFS integrados, crest factor, correlación entre canales y una estimación de true peak; corregir un problema de balance/dinámica con decisiones justificadas; comparar A/B a volumen percibido equivalente; documentar el destino de entrega y explicar los límites del medidor y del oído.

## Lección 1 — Medir sin confundir las unidades

- **Peak sample-based (dBFS):** magnitud de la muestra de mayor nivel respecto a la escala digital completa. No captura necesariamente picos intersample.
- **RMS:** nivel cuadrático medio de la señal; útil para describir energía, no idéntico a loudness.
- **LUFS integrados:** medición de sonoridad con ponderación y gating basados en ITU-R BS.1770. Debe calcularse sobre los canales reales de la señal, no sobre un promedio mono que podría cancelar parte del estéreo.
- **Crest factor:** diferencia entre peak y RMS en la ventana/convención usada. Ayuda a describir dinámica, pero no resume por sí solo el impacto musical.
- **True peak (dBTP):** estima picos de la señal reconstruida entre muestras; puede superar el peak sample-based. Una interpolación 4x es útil para un laboratorio, pero no es una medición certificada.
- **Correlación L/R:** describe similitud estadística de canales. Valor negativo invita a revisar fase y compatibilidad mono; un valor próximo a cero no prueba por sí solo una imagen estéreo amplia.

**Práctica:** analiza la mezcla sin master. Guarda los valores iniciales. Verifica que el audio no contiene silencio absoluto, error de canal o clipping evidente y registra la duración y tasa de muestreo.

## Lección 2 — EQ, enmascaramiento y decisiones de balance

El espectro promedio permite localizar regiones que merecen escucha, pero no determina automáticamente qué EQ aplicar. El enmascaramiento depende de frecuencia, nivel, duración, arreglo y reproducción. El bombo y el bajo pueden competir en el grave; la solución puede estar en ritmo, envolvente, arreglo, paneo o automatización, además de EQ. Un filtro pasa-altos no debe aplicarse indiscriminadamente a todo lo que no sea bombo/bajo: una guitarra, voz o pad pueden necesitar parte de su cuerpo.

Antes de mover un ecualizador, escribe una hipótesis auditiva: qué elemento enmascara a cuál, en qué sección, y qué cambio esperas oír. Ajusta poco, compara a nivel igualado y conserva una versión A intacta. Si no puedes describir el cambio, deshazlo.

## Lección 3 — Compresión, ataque, release y soft knee

Un compresor controla la envolvente o nivel, pero el efecto depende del detector, threshold, ratio, knee, ataque, release y compensación de ganancia. Un ataque rápido puede reducir el transitorio; un ataque demasiado lento puede dejar pasar picos; un release demasiado rápido puede generar distorsión o bombeo. Una compresión más intensa no es una mejora por definición.

El script didáctico usa un detector enlazado entre canales y una curva soft-knee, y aplica una ganancia de seguridad global si el resultado excede el techo sample-based. Esa etapa no es un limitador true-peak. Está diseñada para mostrar los parámetros sin producir clipping duro oculto, no para reemplazar un procesador de estudio.

**Práctica A/B:** prueba configuraciones suave, moderada y agresiva. Reproduce a volumen percibido igualado y toma nota sobre transitorios, estabilidad vocal, bombeo, distorsión y coherencia del groove.

## Lección 4 — Masterización, loudness y entrega al destino

Una cadena típica puede incluir edición, balance/EQ correctivo, compresión o saturación si la música lo necesita, limitación y control final de calidad. No es una receta obligatoria: un buen master puede necesitar pocos procesos. Registra versión de origen, procesadores, parámetros y exportación; conserva un master de alta calidad y prueba el archivo codificado cuando el destino lo requiera.

No existe una meta LUFS universal. EBU R 128 recomienda -23 LUFS para programas de radiodifusión y un máximo de -1 dBTP de producción conforme a su contexto; no significa que una canción comercial deba masterizarse siempre a -23 LUFS. Spotify documenta normalización de reproducción alrededor de -14 LUFS y recomienda mantener el true peak por debajo de -1 dBTP en su guía; para masters muy altos recomienda más margen, como -2 dBTP, ante distorsión de codificación. Las especificaciones del distribuidor, plataforma, género e intención dinámica deben consultarse en su versión vigente.

**Criterio de calidad:** no persigas un número aislado. Define primero el destino, escucha a nivel igualado, evita clipping, conserva la dinámica que comunica la canción y documenta por qué el resultado corresponde al encargo.

## Laboratorio integrado — “Rescata una mezcla sin destruirla”

### Material y versiones
Usa una mezcla propia, una sesión educativa o un archivo cuya licencia permita el análisis y la transformación. Crea:
- mezcla_A_original.wav: copia intacta.
- mezcla_B_balance.wav: cambios de balance/EQ documentados.
- master_C.wav: resultado final para un destino especificado.

### Procedimiento
1. Ejecuta el comando: python -m src.analisis_masterizacion audio/mezcla_A_original.wav --output output/A
2. Escucha con monitores o auriculares de referencia, a volumen moderado, y escribe una hipótesis con marcas de tiempo.
3. Corrige solo las causas que puedas identificar; guarda cada versión con su ficha de parámetros.
4. Si sirve, ejecuta el compresor didáctico para comprender threshold, ratio, knee, attack y release. No lo presentes como herramienta de mastering final.
5. Mide el master, compara con la versión A y crea el gráfico de diferencia espectral.
6. Iguala volumen de reproducción antes de emitir un juicio A/B. Registra qué mejoró, qué empeoró y qué queda incierto.
7. Documenta destino, codec/format, sample rate, bit depth, peak, LUFS y el método de medición.

### Entregables mínimos
- Las tres versiones o evidencia de la cadena usada.
- Reportes JSON A/C y gráfico espectral.
- Capturas o lista de parámetros de EQ/dinámica.
- Informe de 1–2 páginas con hipótesis, resultados, limitaciones y decisión final.
- Manifiesto de procedencia/derechos y ficha de exportación.

## Rúbrica de práctica (100 puntos)

| Criterio | Puntos | Evidencia excelente |
|---|---:|---|
| Diagnóstico | 20 | Relaciona métricas con escucha y señala las limitaciones de cada indicador. |
| EQ y balance | 15 | Corrige conflictos sin cortes genéricos ni daños de cuerpo. |
| Dinámica | 15 | Justifica threshold/ratio/knee/attack/release y conserva la intención musical. |
| Masterización | 20 | Cumple el destino declarado, sin clipping audible, con dinámica justificada y medición documentada. |
| A/B | 10 | Compara versiones a nivel igualado y no decide solo por volumen. |
| Documentación | 10 | Parámetros, versiones, destino y resultados se reconstruyen. |
| Derechos y trazabilidad | 10 | Procedencia, permiso y licencias quedan declarados. |

**Aprobación de práctica:** 70/100. **Dominio sólido recomendado:** 85/100 o más. Una cifra alta no sustituye una escucha competente ni una revisión humana.

## Fuentes técnicas primarias

- EBU R 128, versión 5.0: <https://tech.ebu.ch/publications/r128>
- EBU Tech 3343, directrices prácticas de producción: <https://tech.ebu.ch/docs/tech/tech3343.pdf>
- ITU-R BS.1770 (sonoridad y true peak): <https://www.itu.int/rec/R-REC-BS.1770>
- Spotify, normalización y recomendaciones para su destino: <https://support.spotify.com/artists/article/loudness-normalization/>
- pyloudnorm: <https://github.com/csteinmetz1/pyloudnorm>
