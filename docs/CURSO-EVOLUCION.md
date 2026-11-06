# Evolución magistral del curso — Creación Musical con IA

Fecha: 2026-11-06. Fuente: temario de 14 unidades de TAMV (filosofía, metodología,
Mi Nodo Cero, examen, recursos).

## Decisión de arquitectura (qué NO se tocó y por qué)

Las 16 sesiones de `lib/course.ts` contienen bloques, ejercicios, prompts y el progreso
persistido en Supabase (`lesson_progress`), con `COURSE_TOTAL_LESSONS = 16` también en SQL
(`course_total_lessons()`). Renumerar a 14 unidades habría borrado progreso de usuarios,
roto badges (`productor_ia` exige 16) y dejado rutas `/curso/[modulo]/[leccion]` muertas.

Por eso la evolución es aditiva:

- `COURSE_FRAMEWORK`: título, filosofía, manifiesto TAMV, audiencias, 14 objetivos,
  metodología 4 pasos, 10 recursos, examen (20 q / 30 min / 70% / 7 idiomas / PDF + código)
  y nota híbrida (reciclar progresiones, intercambio modal, MIDI/stems, DAW).
- `COURSE_UNITS`: las 14 unidades mapeadas a las sesiones reales (una unidad puede
  corresponder a 1–2 sesiones; la 14ª es el proyecto final).
- `FINAL_PROJECT`: «Mi Nodo Cero» con requisitos y la estructura de 8 entregables.
- Página nueva `/curso/proyecto-final` (estática, no choca con `[modulo]`).
- `/curso` muestra filosofía, las 14 unidades enlazadas a su sesión y la tarjeta del proyecto.
- El agente (`buildSystemPrompt`) ya conoce filosofía, examen y Mi Nodo Cero.

## Mapa 14 unidades → 16 sesiones

| Unidad | Tema | Sesión(es) |
|---|---|---|
| 1 | Primeros pasos | m01-l01 |
| 2 | Estilos, géneros e identidad | m04-l11 |
| 3 | Fundamentos de armonía | m01-l02 |
| 4 | Inspiración armónica con IA | m01-l03 |
| 5 | Letras efectivas | m03-l09 |
| 6 | Voces y estilos vocales | m03-l08, m03-l10 |
| 7 | Estructura de la canción | m04-l12 |
| 8 | Prompts avanzados | m02-l04 |
| 9 | Pistas instrumentales | m02-l05 |
| 10 | Edición y regeneración | m02-l06, m05-l14 |
| 11 | Remezcla y transformación | m04-l13, m02-l07 |
| 12 | Derechos y ética | m05-l15 |
| 13 | Exportación y portafolio | m05-l14, m05-l15 |
| 14 | Proyecto final | m05-l16 |

## Qué no se afirma (honestidad curricular)

- Duraciones: el marco dice ≈14 h totales con práctica; los minutos de sesiones
  suman ≈4 h 50 de contenido. Ambas cifras conviven (práctica incluida ≠ minutos lectivos).
- Certificado/examen: el marco los describe, pero el examen automático y el PDF con
  código verificable **todavía no existen** como endpoint — la página de proyecto final
  los presenta como parte del programa; construirlos es el siguiente paso.
- Inspiración: el temario original cita un curso de Domestika; este contenido es
  original (16 sesiones propias), no una copia.