# Módulo técnico 4 — Plugins de audio y sistemas multiagente

**Trayecto:** Laboratorio técnico de audio e IA musical · TAMV Online Network
**Autor del curso:** Edwin Oswaldo Castillo Trejo · **Apoyo declarado:** IA para estructuración y revisión.
**Nivel:** avanzado · **Tiempo orientativo:** 7–9 horas.
**Resultado:** un presupuesto de latencia defendible y un pipeline multiagente con trazas y parada ante error.

## Competencia de salida

La persona estudiante distingue el callback de audio del worker de inferencia, calcula si un procesamiento cabe en un bloque, decide qué modelo puede ejecutarse localmente y diseña agentes con roles, dependencias y salidas verificables.

## Lecciones

1. **VST3/CLAP, JUCE y ciclo de audio.** El host entrega buffers y controla el reloj. El callback no asigna memoria, no bloquea y no espera red.
2. **Buffers, latencia y presupuesto.** Un bloque de 128 muestras a 48 kHz dura 2.67 ms. La latencia total incluye búferes del host y del dispositivo; no es la duración de un bloque.
3. **ONNX Runtime e inferencia local.** Precisión, memoria y proveedor de ejecución cambian latencia y calidad. El modelo se carga fuera del callback y existe un fallback explícito.
4. **Agentes especializados.** Rol acotado, entradas y salidas declaradas, dependencias en orden, traza sin secretos y parada ante error.

## Laboratorio: presupuesto y orquestador

1. Declara hardware, interfaz, tasa y tamaño de bloque.
2. Ejecuta el cálculo de presupuesto para 64, 128 y 512 muestras.
3. Decide qué corre en el callback y qué en un worker o servicio externo.
4. Diseña un pipeline de análisis → generación → mezcla → gobernanza.
5. Ejecuta una prueba correcta y una con dependencia ausente; conserva ambas trazas.
6. Documenta fallback, límites y siguiente medición pendiente.

## Comandos

```bash
python -m src.presupuesto_latencia --sample-rate 48000 --block-size 128 --buffers 2 --processing-ms 1.5
python -m src.orquestador_agentes
python -m unittest tests.test_gobernanza_y_sistemas -v
```

## Rúbrica (100 puntos)

| Criterio | Peso |
|---|---|
| Arquitectura de plugin | 15 |
| Tiempo real y latencia | 20 |
| Inferencia local | 15 |
| Orquestación multiagente | 15 |
| Pruebas y fallback | 15 |
| Empaquetado y compatibilidad | 10 |
| Documentación y ética | 10 |

## Límites

El cálculo de latencia es una herramienta de diseño; la latencia real se mide en el hardware de destino. ONNX Runtime no garantiza que todos los modelos u operadores funcionen en todos los proveedores. Ningún plugin debe prometer latencia cero ni cargar un modelo pesado dentro del callback.
