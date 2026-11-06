# Sistema editorial «Play and Go» — primitivas, tokens y contrastes medidos

Inventario del sistema visual real del repo `interfaz-curso-musica-ai-18`, medido sobre
`app/globals.css` y sobre el CSS desplegado. No es una propuesta: cada número de esta
página salió de contar el código o de calcular contraste con la fórmula WCAG 2.1.

Fecha: 2026-11-06 · Fuente única: `app/globals.css`, bloque `@layer components`, sección
rotulada «SISTEMA EDITORIAL ‹PLAY AND GO›» (líneas 980-2030 aprox.).

---

## 1. Tokens

Viven una sola vez, declarados en `.pg-shell`. Las primitivas descienden de ellos; cambiar
la marca es cambiar este bloque.

| Token | Valor | Uso |
| --- | --- | --- |
| `--pg-cyan` | `#75e9f2` | acción, motor local, acento primario |
| `--pg-cyan-soft` | `#8cecf3` | trazo del espectro en canvas |
| `--pg-violet` | `#c09eff` | objeto, prompt, proveedor externo |
| `--pg-magenta` | `#ff9eea` | ruta, subtítulo, estado de error |
| `--pg-amber` | `#ffcf72` | advertencia, entregable, precio |
| `--pg-mint` | `#83d7b4` | logrado, checklist cumplido |
| `--pg-ink` | `#edfaff` | texto de título |
| `--pg-text` | `#adc4d0` | cuerpo |
| `--pg-muted` | `#7f9aa7` | metadatos y etiquetas secundarias |
| `--pg-bg` | `#07121f` | fondo de página |
| `--pg-surface` | `#0b1f2e` | superficie de tarjetas y paneles |
| `--pg-hairline` | `rgba(150,214,232,.14)` | separador de 1 px |
| `--pg-keyline` | `rgba(150,214,232,.30)` | borde de contenedor |
| `--pg-rise` | `cubic-bezier(0.16,0.84,0.24,1)` | única curva de movimiento |

Escala tipográfica (un solo sistema, sin tamaños inventados por sección):
`--pg-step--2` 9,5 px · `--pg-step--1` 11 px · `--pg-step-0` 14 px · `--pg-step-1` 17 px ·
`--pg-step-2` 22 px · `--pg-step-read` 0,9375 rem (15 px, el único cuerpo de prosa larga) ·
`--pg-step-3` `clamp(2rem, 1.3rem + 2.6vw, 3.1rem)` · `--pg-step-4` `clamp(2.9rem, 1.6rem + 5.4vw, 5.2rem)`.

## 2. Primitivas

**68 primitivas declaradas y las 68 tienen al menos un uso** (contado con
`scripts/inventario-editorial.mjs` sobre todos los `.ts` y `.tsx` del repo —el CSS no se
cuenta a sí mismo—; cero clases huérfanas). **15 archivos montan `.pg-shell`**, es decir,
heredan los tokens.

Las doce con más uso medido:

| Primitiva | Usos | Familia |
| --- | --- | --- |
| `.pg-btn` | 82 | control |
| `.pg-card` | 56 | contenedor |
| `.pg-note` | 42 | aviso |
| `.pg-eyebrow` | 33 | jerarquía tipográfica |
| `.pg-title` | 29 | jerarquía tipográfica |
| `.pg-label` | 27 | etiqueta de dato |
| `.pg-container` | 24 | estructura |
| `.pg-navlink` | 22 | navegación |
| `.pg-btn-primary` | 19 | control |
| `.pg-lede` | 18 | jerarquía tipográfica |
| `.pg-shell` | 17 | estructura (token scope) |
| `.pg-btn-ghost` | 17 | control |

Agrupación funcional (no es una lista decorativa: cada grupo tiene una responsabilidad):

- **Estructura**: `pg-shell`, `pg-container`, `pg-section`, `pg-glow`, `pg-panel`, `pg-inset`,
  `pg-frame`, `pg-backdrop`, `pg-dialog`, `pg-scroll`, `pg-rule`.
- **Texto**: `pg-eyebrow`, `pg-title`, `pg-title-display`, `pg-lede`, `pg-lead`, `pg-prose`,
  `pg-section-title`, `pg-block-title`, `pg-item-title`, `pg-card-title`, `pg-quote`,
  `pg-pitfall-fix`, `pg-num`, `pg-num-inline`, `pg-meta`, `pg-item-meta`, `pg-label`,
  `pg-code`, `pg-var`, `pg-var-chip`, `pg-minilink`, `pg-notice`.
- **Datos y estado**: `pg-table`, `pg-list`, `pg-meter`, `pg-meter-fill`, `pg-metric`,
  `pg-chip`, `pg-pill`, `pg-flag`, `pg-status`, `pg-check`, `pg-check-box`, `pg-mark`,
  `pg-figure`, `pg-bubble`, `pg-provenance`.
- **Control**: `pg-btn`, `pg-btn-primary`, `pg-btn-ghost`, `pg-btn-sm`, `pg-icon-btn`,
  `pg-field`, `pg-navlink`, `pg-row-arrow`, `pg-seg`.
- **Color por función**: `pg-accent-cyan|violet|magenta|amber|mint|muted`.

## 3. Tonos: 32 relaciones `clase[data-tone]`

El tono no pinta, **significa**. Las 32 combinaciones declaradas:

| Primitiva | Tonos |
| --- | --- |
| `pg-eyebrow` | magenta, violet, amber |
| `pg-label` | cyan, violet, mint, amber, muted |
| `pg-chip` | violet, amber, mint |
| `pg-pill` | cyan, mint, amber, error |
| `pg-card-title` | cyan, violet, amber, mint |
| `pg-figure` | cyan, violet, amber, mint |
| `pg-callout` | violet |
| `pg-var` | violet |
| `pg-flag` | amber |
| `pg-status` | error, pending |
| `pg-note` | pending, error |
| `pg-btn-ghost` | cyan |
| `pg-icon-btn` | danger |

Regla del producto que sostiene el CSS: **la interfaz nunca finge IA**. `.pg-provenance` y
los tonos de `pg-status`/`pg-note` son la superficie donde eso se ve; `/api/generate`
etiqueta `engine: local | provider` y `/api/agent` etiqueta `source: llm | fallback`, y el
front no puede promover un `fallback` a color de IA.

## 4. Contraste medido (WCAG 2.1)

Fórmula de luminancia relativa de la recomendación (umbral 0,03928, exponente 2,4),
composición `over` canal por canal. AA = 4,5:1 en texto normal, AAA = 7:1.
Reproducible con `node scripts/contraste-editorial.mjs`.

Fondo puro `#07121f` · superficie `#0b1f2e` · **peor caso real** = una capa del resplandor
a plena alfa sobre el fondo = `#152e3a`.

| Token | bg | surface | glow (1 capa) | techo geométrico (2 capas) |
| --- | --- | --- | --- | --- |
| `--pg-ink` | 17,68 AAA | 15,78 AAA | 13,29 AAA | 10,89 AAA |
| `--pg-text` | 10,39 AAA | 9,27 AAA | 7,81 AAA | 6,40 AA |
| `--pg-muted` | 6,35 AA | 5,67 AA | 4,77 AA | 3,91 **no** |
| `--pg-cyan` | 13,17 AAA | 11,76 AAA | 9,90 AAA | 8,11 AAA |
| `--pg-violet` | 8,59 AAA | 7,66 AAA | 6,45 AA | 5,29 AA |
| `--pg-magenta` | 10,16 AAA | 9,07 AAA | 7,64 AAA | 6,26 AA |
| `--pg-amber` | 12,93 AAA | 11,54 AAA | 9,72 AAA | 7,96 AAA |
| `--pg-mint` | 11,07 AAA | 9,88 AAA | 8,32 AAA | 6,82 AA |

Tres lecturas, sin redondear hacia arriba:

1. **La columna «techo geométrico» no es alcanzable.** Es el producto de suponer las dos
   capas del glow a plena alfa en el mismo píxel. `node scripts/glow-solapamiento.mjs` mide
   los rayos útiles de ambos degradados (farthest-corner × 33 % y × 35 %) contra la distancia
   entre sus centros (76 % 2 % y 14 % 86 %) en cinco viewports: 1280×800 → 867 px de radios
   sumados frente a 1040 px de distancia; 1440×900 → 975/1170; 1920×1080 → 1258/1497;
   390×844 → 570/749; 768×1024 → 768/983. **En todos los casos los discos no se tocan**, así
   que ningún píxel recibe doble alfa y la única columna que obliga es «glow (1 capa)».
2. `--pg-muted` **no llega a AAA** (6,35 sobre fondo puro, 4,77 en el peor punto real). Es un
   color de metadatos: si alguien lo usa para prosa de lectura, falla la regla. Se deja
   deliberadamente en la banda AA y se documenta en vez de disimularlo.
3. Todos los tonos de función pasan AA en el peor punto real; `--pg-violet` es el más débil
   del grupo (6,45), y por eso el violeta se usa en etiquetas cortas y no en párrafos.

## 5. Reglas de contribución

1. **Un vocabulario, no cuarenta hex.** Si una pantalla necesita un color, se añade un
   token o una primitiva; nunca un literal en el JSX. Las excepciones están marcadas en la
   tabla de abajo y en el párrafo que la sigue.
   Estado medido (6 de noviembre, `scripts/inventario-editorial.mjs`): **55 literales** de
   color fuera de `globals.css` en 5 archivos, de los cuales **40 son tablas de datos y 15
   son deuda real**. La cifra en bruto mentía —contaba también los literales que aparecen
   dentro de un comentario— así que el script separa las dos cosas y hay que leerla así:

   | Dónde | Cuántos | Qué son | Veredicto |
   |---|---|---|---|
   | `lib/cinematic/scenes.ts` | 26 | Paleta por escena (`key`/`core`/`fog`/`ember`), seis escenas. | Excepción legítima: el literal es el token de su propio dominio, no es UI. |
   | `lib/music/arrangement.ts` | 14 | Mapa de color por capa instrumental. | Excepción legítima por lo mismo. |
   | `components/course-dashboard.tsx` | 13 | `style` en línea: 4 fondos de superficie y 9 veladuras de matiz. | **Deuda real.** |
   | `components/cinematic/cinematic-intro.tsx` | 1 | `text-[rgba(176,203,214,.6)]`, clase arbitraria de Tailwind. | **Deuda real.** |
   | `components/local-composer.tsx` | 1 | Borde cian al 25 %. | **Deuda real.** |

   Fuera del recuento quedan tres excepciones que el script conoce por nombre:
   `app/opengraph-image.tsx` (Satori no resuelve variables CSS), los respaldos de
   `components/real-audio-studio.tsx` (primero leen el token con `getComputedStyle`) y el
   `themeColor: '#04101a'` de `app/layout.tsx` (es metadata, no se pinta en el árbol).

   La deuda no es solo estética: cuatro de esos fondos —`rgba(7,21,34,.82)`,
   `rgba(13,32,48,.95)`, `rgba(11,29,43,.96)` y `rgba(11,38,53,.95)`— son superficies
   inventadas que no coinciden con `--pg-surface` (`#0b1f2e`), así que esas cuatro zonas no
   se mueven si algún día cambia la paleta. Los otros nueve son alfas exactas de tokens que
   ya existen (`rgba(117,233,242,x)` es `--pg-cyan`, `rgba(255,207,114,x)` es `--pg-amber`,
   `rgba(7,18,31,.78)` es `--pg-bg`): esos se convierten a `color-mix` sin tocar un pixel.
   Los cuatro primeros no: sustituirlos por el token cambia el tinte de la pantalla, así que
   hay que hacerlos con la pantalla abierta.
   `scripts/inventario-editorial.mjs` imprime la tabla en cada corrida para que la cifra
   no vuelva a crecer sin que nadie la vea.
2. **Ritmo vertical idéntico** en todas las secciones (`.pg-section`), no un `py` arbitrario.
3. **El estado vive en el ARIA y el CSS lo lee** (`.pg-check[aria-pressed='true']`).
4. **Movimiento de 8 px** de revelado; si es más, es presentación.
5. **Un matiz por función** (§3). Nunca decorativo.

## 6. Cómo se verificó

- `node scripts/inventario-editorial.mjs` → 68 primitivas declaradas, **cero sin uso**,
  32 relaciones `clase[data-tone]`, 15 archivos que montan `.pg-shell`.
- `node scripts/contraste-editorial.mjs` y `node scripts/glow-solapamiento.mjs` → los
  números de §4.
- `next build` (16.4.5, Turbopack) → exit 0, 34 páginas estáticas; un único chunk CSS de
  79 431 B local con `.pg-glow` y `color-mix`.
- En producción, tras el push de `0a0f15a`: `/_next/static/immutable/chunks/29ba-xbja8fjf.css`
  = 79 446 B con `.pg-glow` y `color-mix`; el HTML de `/curso` lleva `class="pg-glow"` y
  **cero** `radial-gradient` inline. La diferencia de 15 B entre el chunk local y el
  desplegado es del pipeline de la plataforma, no del fuente.
- `tsc --noEmit` → exit 0.

## 7. Lo que falta (no está construido)

Del §7 de `docs/ESTRATEGIA-ABIERTA-PLAY-AND-GO.md`, la parte *sonora* de la identidad, que
es el activo real de una academia de música:

- Sello acústico de 1,5 s generado con el motor local (no un archivo estático).
- Firma de página por módulo, con control visible y silencio por defecto.
- Color de procedencia por pista (cian si fue el navegador, violeta si fue proveedor).
- Tipografía mono para datos medidos (BPM, LUFS, semilla) frente a redonda para prosa.
