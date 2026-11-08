# Auditoría e integración de la presentación cinematográfica Play & Go

**Fecha:** 8 de noviembre de 2026  
**Repositorio canónico:** `AnubisVillasenor1/play-and-go`  
**Proyecto Vercel:** `prj_ogAIlFJ2Vs9Sll0NIT0h0YKricG4`

## Dictamen

La introducción visual del proyecto se integra a través de `components/cinematic/cinematic-intro.tsx` y `components/cinematic/cinematic-stage.tsx`, que usan React Three Fiber/Three.js y WebGL. El HTML aportado es una referencia narrativa y de paleta, no debe publicarse tal cual como experiencia principal: pese a titularse “3D AAA/WebGL”, su render utiliza `canvas.getContext('2d')`; el botón de ingreso muestra una alerta y navega a un portafolio externo; no implementa navegación por teclado ni respeta la preferencia de movimiento reducido.

Por eso, la integración conserva el motor WebGL existente, los controles accesibles y el dashboard real, y alinea el guion con las cinco diapositivas del PPTX.

## Correspondencia de las cinco diapositivas

| Diapositiva original | Acto integrado | Función narrativa |
|---|---|---|
| 01 — Sistema nervioso tecnológico / PLAY & GO by TAMV ONLINE NETWORK | `bienvenida` | Identidad, bienvenida y origen en Mineral del Monte |
| 02 — Diagnóstico histórico / El giro erróneo de la industria | `diagnostico` | Enmarca el problema histórico |
| 03 — Perspectiva crítica / Desorientación y dependencia | `dependencia` | Expone la sobrecarga de actualización y la dependencia tecnológica |
| 04 — La propuesta transformadora / Más que una aplicación | `propuesta` | Presenta el curso y la transferencia de conocimiento técnico |
| 05 — Declaración de existencia / TAMV ONLINE NETWORK & PLAY & GO | `declaracion` | Cierre institucional y tecnología latinoamericana |

Cada acto dura 12 segundos; cinco actos suman 60 segundos, manteniendo el arco de la cama sonora. La paleta del guion usa negro, cian eléctrico (`#00E5FF`), azul profundo (`#0052FF`), terracota (`#E05A47`) y blanco platino (`#E5E4E2`).

## Comportamiento funcional

- Primera visita: `IntroGate` puede abrir la introducción, con el dashboard de curso ya montado detrás.
- Ruta directa `/presentacion`: fuerza la apertura mediante `/?intro=on`, aunque el navegador ya hubiera visto la intro.
- Navegación: controles de capítulo, siguiente secuencia, flechas izquierda/derecha, números de capítulo y Escape para salir.
- Audio: puede activarse/desactivarse; si la política del navegador bloquea el autoplay, queda disponible el control manual.
- Degradación visual: conserva el fallback cuando WebGL no está disponible y el modo de movimiento reducido.
- Repetición: el botón “Ver presentación” se mantiene visible también en pantallas pequeñas.
- Cierre: la presentación desaparece y deja disponible el dashboard del curso. No redirige al portafolio externo del prototipo HTML.
- CI: `scripts/verify-cinematic-presentation.mjs` verifica los cinco actos, la duración, la paleta, los controles y la ruta. `scripts/smoke-preview.mjs` verifica que la ruta redirija a `/?intro=on`.

## Criterio editorial

El texto de “curso de nivel máster” se mantiene porque aparece en el material fuente. Se trata de lenguaje de posicionamiento del curso; no se presenta como título oficial, grado académico ni acreditación universitaria. El resto del dashboard, los módulos, las rutas y sus operaciones permanecen bajo el código existente.

## Límite de verificación

La validación de esta rama depende de CI y del deployment Preview de Vercel. No se considera verificada en producción hasta que el build y los smoke tests pasen y el deployment de producción apunte al commit integrado.
