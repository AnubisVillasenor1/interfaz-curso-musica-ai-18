# Play and Go — estrategia de pila abierta

Documento de decisión. Responde las cinco preguntas del brief (estructura Python/Next.js,
flujo MusicGen + Demucs, capa educativa, costos reales de autoalojamiento, identidad visual)
y corrige dos premisas del brief con evidencia del repositorio y de las licencias oficiales.

Fecha: 2026-11-06 · Estado del producto: el código publicado en `main` de
`AnubisVillasenor1/interfaz-curso-musica-ai-18` incluye ya la rodaja editorial 3
(estudio, cuenta y páginas sueltas, commit `a2c9eb9`) y sirve en
`https://interfaz-curso-musica-ai.vercel.app`, verificado por sonda HTTP en §0.

---

## 0. Qué se verificó y qué no

| Afirmación | Cómo se comprobó | Estado |
| --- | --- | --- |
| El curso (5 módulos, 16 lecciones, insignias, progreso) está construido y publicado | `lib/course.ts` (1386 líneas); `generateStaticParams` en `app/curso/[modulo]/page.tsx` y `next build` local marcando `/curso/m01…m05` como SSG (`●`); sonda HTTP a producción devolvió `pg-panel` y `pg-check` en el HTML de la lección | **Verificado** |
| El motor local compone en el navegador sin proveedor | `app/api/generate/route.ts` doc de dos motores y `LOCAL_SEED_SALT = 'play-and-go-local-v1'`; `components/local-composer.tsx` | **Verificado** (código); no se escuchó el audio en esta sesión |
| Licencias de MusicGen, Demucs, Stable Audio Open, Essentia, ACE-Step, MinIO | Fetch directo a model cards, `LICENSE` de repos y páginas de licencia (§9) | **Verificado con fuente** |
| Precios de GPU 2026 | Fuentes de comparadores y páginas de proveedor (§9). Son precio de lista, no factura | **Indicativo** |
| El flujo Python de §4 | Escrito como `docs/stack-reference/pipeline.py` y **ejecutado** en esta máquina: `py_compile` limpio y `--selfcheck` bajo Python 3.12.10 (la puerta de licencia bloquea MusicGen en modo comercial, tal como se afirma en §2) | **Verificado en la parte de control**; las fases de audio no corren aquí (sin CUDA, sin ffmpeg, sin torch/demucs/librosa instalados) |
| El monorepo de §3 | `pnpm-workspace.yaml` existe en la raíz pero **no** declara `packages:`: no hay `apps/`, `services/` ni `packages/`. §3 sigue siendo propuesta, no refactor empezado | **No iniciado** |
| Pagos reales de punta a punta | El webhook de Stripe sigue pendiente; las 4 migraciones Supabase están **escritas en el repo** (`supabase/migrations/20261105190000_schema`, `190100_rls`, `190200_functions`, `190300_storage`) y lo que falta es aplicarlas; `NEXT_PUBLIC_*` sin declarar en Vercel | **Pendiente del dueño** |
| La rodaja editorial 3 sirve en producción | Sonda HTTP a `https://interfaz-curso-musica-ai.vercel.app` tras el push de `a2c9eb9`: el chunk CSS desplegado `/_next/static/immutable/chunks/25es38oebukhx.css` (78 576 B) contiene `--pg-mint`, `.pg-seg` y `.pg-status[data-tone=error]`; el HTML de `/studio` trae `pg-seg` y `data-audio-fft-canvas`; `/curso` y `/precios` traen `data-size=`; 10 rutas responden 200 | **Verificado en vivo** |
| `/musica`, `/estudio`, `/cuenta` existen | **No**: no son rutas del proyecto (las reales son `/curso`, `/studio`, `/perfil`). Responden 404 y eso es correcto | **Corregido** |
| `pg-card` / `pg-label` en biblioteca y perfil | Confirmados dentro de los bundles JS desplegados de `/biblioteca` y `/perfil` (aparecen en JS, no en el SSR inicial, porque los paneles son client) | **Verificado en vivo** |
| Revisión de la documentación y del API | Calidad editorial con la rúbrica de 7 dimensiones en `docs/quality/review-report.json` (**83/100**, umbral 80; sus 4 bloqueos son r001, r002, r003 y r005 — r001/r003/r005 corregidos en §5 y §6, r002 corregido alineando `pipeline.py` con las migraciones reales). Agent-readiness en `docs/api/agent-readiness.json` (**69,5/100, cero críticos, 16 fallos**, a 0,5 del sello «Agent Ready» y sólo gracias a que el spec `docs/api/openapi.yaml` ya existe: el servidor aprueba Performance 0,5/6) | **Verificado; el API aún no es agent-ready** |
| De los 16 fallos del API, qué está ya corregido en el código | Detalle en `docs/api/AGENT-READY.md` (§ «Correcciones aplicadas»). Cerrados: códigos de máquina en las 11 rutas (27 emisores, 27 documentados, verificado con `scripts/check-openapi.py`), `Retry-After` + `X-RateLimit-*` en el 429 del chat, `Cache-Control` en las 4 rutas por-usuario y caché público corto en la búsqueda, `quota` en los éxitos de `/api/generate`, y la fuga de nombres de variables en los 503 y en `songs.error`. Abiertos: `total`/cursor en listados, casing camel unificado, `/v1`, bucket de tasa en `/generate`–`/checkout`–`/search` | **Corregido en parte, verificado en vivo** (los `code` y el `public, max-age=60` se ven en las respuestas reales del deploy) |
| ¿Ve un buscador el sitio? | **No estaba viendo**: con `NEXT_PUBLIC_APP_URL` sin declarar, `getAppUrl()` devuelve `""` y el build generaba `sitemap.xml` vacío, `robots.txt` con `disallow: '/'` y `metadataBase` en `localhost:3000`. Corregido con `getSeoOrigin()` en `lib/app-url.ts` (el dominio canónico queda en el código; el cierre total lo decide `VERCEL_ENV`). **Medido en producción tras el push de `598a0b7`**: `GET /sitemap.xml` → 200 con 4 539 B y `<loc>https://interfaz-curso-musica-ai.vercel.app/</loc>`; `GET /robots.txt` → 200 con `Allow: /`, `Host:` y `Sitemap:` en el dominio real | **Corregido y verificado en vivo** |
| La forma del error y el caché viajan hasta el navegador | 13 sondas anónimas reales contra el deploy (detalle en `docs/api/AGENT-READY.md`, § «Verificado contra el deploy»): `/api/music/search` responde 200 con `cache-control: public, max-age=60` — esa cabecera la pone el handler, no la plataforma; los 400/413/401 llevan `code` (`query_too_short`, `message_too_long` + `limit: 2000`, `unauthorized` en las cinco rutas de cuenta); `POST /api/agent` con pregunta válida responde 200 en 164 ms con `"source":"fallback"` | **Verificado en vivo**; los `200` de las rutas por-usuario con `private, no-store` no son verificables sin sesión y quedan probados sólo en código y build |

Regla del producto que se conserva en todo lo de abajo: **la interfaz nunca finge IA.** Cada
resultado muestra su procedencia (motor local del navegador / proveedor / plantilla determinista),
igual que hoy `/api/generate` distingue motores y devuelve la cuota cuando el intento muere.

---

## 1. Premisa corregida #1: la capa educativa no hay que construirla, ya está

El brief describe como pendiente lo que el repositorio ya tiene publicado:

| Lo que el brief pide como nuevo | Dónde está hoy |
| --- | --- |
| "Academia integrada" | `/curso`, `/curso/[modulo]`, `/curso/[modulo]/[leccion]` con 5 módulos y 16 sesiones |
| Lección con teoría + ejercicio + entregable | `Lesson.blocks`, `exercise.steps`, `exercise.deliverable`, `exercise.checklist` en `lib/course.ts` |
| Escucha guiada y errores frecuentes | `Lesson.listening` (con término buscable), `Lesson.pitfalls` (par error/corrección) |
| Progreso e insignias por alumno | `app/api/progress`, `COURSE_BADGES` (`primer_prompt`, `oido_critico`, `productor_ia`, `primera_cancion`), `components/course/progress-bar.tsx` |
| Prompts copiables con variables | `PromptTemplate.text` + `variables` en `lib/course.ts`; `PromptCard` con copiar al portapapeles en `components/course/lesson-view.tsx` (línea 67, `navigator.clipboard` en la 73) |
| Monetización (curso, extensión, pro, plan gratuito) | `lib/products.ts`, `lib/fulfilment.ts`, `/api/checkout`, `/precios` |
| Estudio con waveform y mezcla | `components/real-audio-studio.tsx`, `components/music-studio.tsx`, `components/local-composer.tsx` |

Consecuencia práctica: **el diferencial no es "añadir educación", es cerrar el bucle entre
educación y generación.** Hoy la lección explica y el estudio produce, pero la lección no abre
el estudio con la receta del ejercicio, y el estudio no sabe qué lección estás cursando. Ese
enlace (§5) cuesta una fracción de lo que costaría construir una academia desde cero, y es lo
que Beatoven, Suno y Udio no pueden copiar porque no tienen curso.

## 2. Premisa corregida #2: la pila abierta propuesta no es legal para un producto de pago

El brief recomienda "MusicGen/AudioCraft" como motor propio y "Essentia" para análisis, y menciona
MinIO para objetos. Los tres son la peor combinación posible para un producto cobrado en Stripe:

| Componente propuesto | Licencia real | Efecto en Play and Go (producto de pago) |
| --- | --- | --- |
| AudioCraft / MusicGen — **código** | MIT | Uso permitido |
| MusicGen / EnCodec — **pesos** | **CC-BY-NC 4.0** | **Prohibido**: generar canciones cobrables con esos pesos es uso comercial |
| Stable Audio Open 1.0 | Stability AI Community License | **Permitido bajo umbral**: comercial si la organización factura < 1 M USD anuales, con registro obligatorio en Stability; encima del umbral toca Enterprise |
| ACE-Step (v1 3.5B) | Pesos **Apache-2.0** (model card); `LICENSE` del repo es texto MIT | **Permitido** — es el sustituto natural de MusicGen. Dejar constancia escrita de la discrepancia y congelar la versión |
| DiffRhythm | Apache-2.0 | **Permitido** (canciones completas, vocales) |
| Demucs — código y pesos | MIT | **Permitido**, con matiz: el entrenamiento incluye MUSDB18-HQ, licencia de investigación; el derecho del *resultado* depende del audio de entrada, no del modelo |
| Open-Unmix | MIT | **Permitido** y entrenado con datos licenciados (MedleyDB): opción conservadora para separación |
| **Essentia** | **AGPL-3.0 sólo para uso no comercial** (comercial = licencia pagada a MTG/UPF) | **Excluir** o pagar. Es la única librería del brief con licencia explícitamente comercial |
| librosa | MIT | **Permitido** — cubre tempo, tonalidad, espectro, segmentos |
| aubio | GPLv3 | **Excluir** en un servicio cerrado (GPL en red = obligación de publicar) |
| SuperCollider | GPLv3 (y su clase `Server` LGPL) | Usar como proceso externo, no ligado a código propio; o evitar |
| Csound, Pure Data, FluidSynth | LGPL | **Permitidos** como dependencias dinámicas |
| Magenta, pretty_midi, mido, Whisper, Tone.js, Howler.js, Wavesurfer.js, D3, Recharts, R3F | Apache-2.0 / MIT | **Permitidos** |
| **MinIO** | AGPL-3.0 **y** repositorio en modo mantenimiento (2025-12), consola web retirada de la edición comunitaria | **No lo elijas como base nueva**. Alternativas: SeaweedFS o RustFS (Apache-2.0), Garage (AGPL), o S3 real (Cloudflare R2 / Backblaze B2) |
| PostgreSQL | PostgreSQL License (permissiva) | **Permitido**, autohosteable sin fricción |
| Docker Engine (Apache) vs Docker Desktop | El *Desktop* tiene EULA de pago para empresa >100 empleados / >10 M USD | Para CI no importa; para desarrolladores con laptop de empresa, Podman (Apache-2.0) |

**Decisión que hay que tomar antes de escribir una línea de Python:** o (i) motor de pago con
pesos Apache/MIT (ACE-Step / DiffRhythm) + Open-Unmix para separación, o (ii) MusicGen sólo en
el modo gratuito y sin fines de lucro. La opción (ii) envenena el catálogo: un alumno no puede
"sólo a veces" pagar. Elegir **(i)**. Y si se usa Stable Audio Open para textura/foley, registrar
la cuenta en Stability antes del primer cobro.

---

## 3. (a) Estructura del código base: Python y Next.js conviviendo

Principio: **Next.js es la cara y la ley; Python es el músculo y no conoce a los usuarios.**
El producto ya tiene autenticidad de Supabase, cuotas, RLS y Stripe en TypeScript. Nada de eso
se reescribe en Python. El servicio audio no autentica personas: valida un token de trabajo de
corta vida emitido por Next.

```
play-and-go/
├── apps/web/                     ← lo que hoy es app/, components/, lib/ (Next 16, App Router)
│   ├── app/{curso,studio,precios,biblioteca,perfil,auth}/
│   ├── app/api/{generate,progress,checkout,songs,stripe/webhook}/   ← orquestan, no generan
│   └── lib/{course,products,fulfilment,quota,callback-signature}.ts
│
├── services/audio-py/            ← nuevo; imagen propia, nunca expuesto al público
│   ├── pyproject.toml            (uv o PEP 621; congelar torch+cu121)
│   ├── src/pgaudio/
│   │   ├── api/main.py           FastAPI: /healthz /v1/jobs /v1/jobs/{id}
│   │   ├── api/auth.py           verificación JWT de trabajo firmado por Next (HMAC, 5 min)
│   │   ├── domain/spec.py        Recipe: género, mood, bpm, tonalidad, duración, seeds
│   │   ├── domain/results.py     JobResult: artefactos, métricas, procedencia, versión de modelo
│   │   ├── engines/base.py       EngineProtocol: .capabilities() .generate(spec) -> wav uri
│   │   ├── engines/ace_step.py   ← motor de pago (Apache-2.0)
│   │   ├── engines/musicgen.py   ← sólo investigación / modo no comercial
│   │   ├── engines/local_recipe.py  ← espejo de la receta del navegador, para validar paridad
│   │   ├── separation/demucs.py  + separation/open_unmix.py
│   │   ├── analysis/traits.py    librosa: bpm detectado, clave estimada, estructura, LUFS
│   │   ├── storage/objects.py    S3-compatible (R2/B2/SeaweedFS) con claves inmutables
│   │   ├── queue/worker.py       consumidor; timeouts, reintentos con tope, dead-letter
│   │   └── registry/models.py    ← huella SHA-256 + licencia de cada peso cargado
│   └── tests/{unit,golden}/      oro de audio: hash del WAV de una semilla fija
│
├── packages/shared-contract/     ← contrato único entre TS y Python
│   ├── schema/job.spec.json      JSON Schema ( Recipe )
│   ├── schema/job.result.json    JSON Schema ( JobResult )
│   └── codegen: types/*.ts generados y committeados (nunca adivinar un campo)
├── supabase/migrations/          ← SQL versionado; la cola vive aquí, no en Redis propietario
└── infra/                        compose/ para desarrollo; k8s o VMs para producción
```

Cuatro reglas que evitan el 90 % del dolor de esta arquitectura:

1. **Trabajo asíncrono, nunca petición sincrónica.** Una generación tarda 15–60 s en GPU; una
   función serverless de Vercel no debe sostener eso. Next crea el job (INSERT con estado
   `queued`), el worker lo toma, y Next consulta o recibe el callback firmado que ya existe en
   `lib/callback-signature.ts`.
2. **La cola es PostgreSQL.** Tabla `generation_jobs` con `SELECT … FOR UPDATE SKIP LOCKED`.
   Se gana transaccionalidad con la cuota (misma base, mismo commit) y se evita un Redis nuevo
   que haya que vigilar. Redis sólo cuando el throughput justifique un broker real.
3. **Los pesos viven fuera del código**, en un bucket versionado, y `registry/models.py` guarda
   SHA-256 + licencia + URL de origen. Eso es a la vez reproducibilidad y defensa ante una
   auditoría de derechos: puedes probar qué pesos generaron cada canción.
4. **Un solo contrato, generado.** Si el JSON Schema cambia, el tipo TypeScript se regenera y el
   build falla en vez de romper en producción a medianoche.

## 4. (b) Flujo básico MusicGen + Demucs (referencia ejecutada a medias: control sí, audio no)

El archivo ejecutable está en `docs/stack-reference/pipeline.py`. Aquí el esqueleto y por qué
cada pieza está donde está. Para producción se cambia `musicgen` por `ace_step` (§2).

```
Alumno pulsa «Generar» en /studio
      │
      ▼
Next /api/generate ──► comprueba cuota (rpc consume_generation_quota)
      │                 si no hay: 402 con el precio del cupo, sin tocar GPU
      ▼
INSERT generation_jobs(status='queued', spec, user_id, engine)   ← mismo commit que la cuota
      │
      ▼  (HTTP interno, token JWT de 5 min firmado con HMAC)
FastAPI POST /v1/jobs ──► worker:
      1. descarga/conserva el modelo en RAM (lru por versión; cold start 20–60 s)
      2. musicgen.generate(prompt, bpm, tonalidad, duration, seed)   → mezcla.wav
      3. demucs.separate(mezcla.wav, model='htdemucs')               → stems/{vocals,drums,bass,other}.wav
      4. analysis.traits(mezcla.wav)                                 → bpm_real, clave_est, lufs, secciones
      5. storage.put(...)                                            → URIs inmutables
      6. UPDATE generation_jobs SET status='succeeded', result, provenance
      │
      ▼
callback firmado a /api/generate/callback ──► la biblioteca del alumno recibe la pista
      │                                        y /curso registra el entregable si la lección lo pedía
      ▼
El reproductor del estudio muestra: mezcla + 4 stems muteables + etiqueta de procedencia
```

Por qué se separa *después* de generar y no al revés: el valor didáctico aparece cuando el alumno
puede silenciar la batería de su propia canción y oír qué hacía la IA. Un stem suelto sin contexto
no enseña nada.

Puntos que el brief no menciona y que rompen implementations ingenuas:

- **Devolver la cuota cuando el motor muere.** Ya existe en TS (`refund_generation_quota`); el
  worker tiene que reportar el fallo en el mismo lenguaje o la paridad se pierde.
- **Semilla guardada.** Sin `seed` persistida, "regenerar sólo el coro" es una promesa falsa.
- **Duración declarada vs real.** Demucs recorta colas; si la lección promete 90 s, `traits.duration_s`
  es la que se muestra, no la pedida.
- **Loudness.** Un WAV a −16 LUFS y otro a −9 LUFS parecen distintos aunque la música sea igual; el
  análisis lo normaliza y lo informa.

## 5. (c) Integración de la capa educativa (la que sí diferencia)

Cuatro superficies, todas ancladas a datos que ya existen:

**1. La lección abre el estudio con la receta del ejercicio.**
Las plantillas ya declaran sus variables entre llaves: el prompt «Ficha de los cuatro conceptos» de
`m02-l03` (lib/course.ts:230) usa `{BPM}`, `{tonalidad}`, `{modo}` y `{duración}`, y la interfaz las lista
en `PromptTemplate.variables`. Un enlace
`/studio?recipe=m02-l03&v=BPM:96,tonalidad:F#m,duración:90` rellena el estudio y deja constancia de que la
receta vino del curso. Cuesta: un parser de `searchParams` en el estudio, una whitelist de nombres de
variable tomados de `lib/course.ts` y una tabla de recetas. Las claves no whitelisted se ignoran con aviso
visible, nunca en silencio.
Sin esto, el curso y el estudio son dos webs.

**2. Mapa Emocional TAMV.** En lugar de un slider de "mood", un plano de dos ejes (energía ×
valencia) donde cada canción generada cae como punto, calculado con `traits` (tempo, modo,
espectro, dinámica) —**no** con una IA de emociones. El alumno ve su propio mapa: "tus últimas
10 canciones viven en tensión alta / valencia baja". Eso es material de clase y es honesto porque
el cálculo es determinista y explicable.

**3. Timeline Regenerativa con responsabilidad de sección.** Bloques intro/verso/coro/puente/outro
heredados de la propuesta de Suno, pero con una restricción didáctica: regenerar un bloque exige
nombrar *qué cambias y por qué* (una frase obligatoria en el registro del intento). Al final del
módulo, esa bitácora es el portafolio que pide la lección 16.

**4. Evaluación con criterio visible.** El checklist de `exercise.checklist` hoy es autoinforme.
Se puede complementar con comprobaciones automáticas sobre el audio del alumno (¿hay contraste de
dinámica entre verso y coro? ¿el BPM cae en el rango pedido?) mostrando *el número* y el umbral,
nunca un "aprobado" opaque. La insignia la da el profesor del curso (o el alumno mismo), la
métrica la da el motor.

Roadmap de cuatro pasos, cada uno publicable solo:

| Paso | Qué se entrega | Criterio de aceptación |
| --- | --- | --- |
| E1 | Recetas lección → estudio (enlace + parser + persistencia de `lesson_id` en la canción) | Una lección abre el estudio con sus variables ya sustituidas; la biblioteca muestra "de m02-l05" |
| E2 | Análisis determinista (`traits`) guardado por canción | `/biblioteca` muestra BPM real, duración real, LUFS |
| E3 | Mapa Emocional TAMV sobre el catálogo del alumno | Un punto por canción; filtro por módulo; leyenda que explica el cálculo |
| E4 | Stems por canción pagada (Demucs/Open-Unmix en GPU) | 4 pistas muteables; etiqueta de procedencia y de modelo |

## 6. (d) Costos reales de autoalojamiento

Precios de lista de 2026 (§9). La cuenta que importa no es la de la tarjeta, es la de la persona.

Supuestos: 3.5 min de audio por canción; modelo de 3–4 B params en 4090 (24 GB) con inferencia de
25–40 s; separación 15–30 s adicionales → **40–70 s de GPU por pista**. WAV 44.1 kHz estéreo 16 bit
≈ 37 MB por pista; el almacenamiento resuelve con MP3/Opus y es el problema menor, el tiempo de GPU
es el que manda en la factura.

Con esos supuestos se puede escribir la cuenta en una línea, de modo que cualquier lector pueda rehacer
las filas o meter sus propios precios:

```
USD/mes ≈ N · (t_gen + t_sep)/3600 · USD_h · 1.15  +  N · 0.037 GB · 0.015  +  fijos
  N        canciones al mes
  t_gen    25–40 s   t_sep 15–30 s   USD_h 0.34–0.89 (4090, precio de lista 2026, §9)
  1.15     arranque frío + reintentos            fijos  web 20 + bd 25 + observabilidad 10–40
→ coste marginal del escenario B: 0,004–0,020 USD por canción
→ techo de una 4090: 86 400 s/día ÷ 40–70 s = 1 230–2 160 pistas/día al 100 % de ocupación,
  1 070–1 880 con el margen del 15 %; a 30 000/mes (1 000/día) la ocupación real es 46–64 %
```

| Concepto | A. Todo gestionado (hoy) | B. Híbrido (recomendado) | C. GPU propia siempre encendida |
| --- | --- | --- | --- |
| Web (Next en Vercel) | Pro ≈ 20 USD/mes por usuario | igual | VPS 12–24 USD/mes |
| Base de datos | Supabase Pro 25 USD/mes | igual | Postgres en el mismo VPS, 0 USD de licencia, ~1 h/mes de mantenimiento |
| Generación | API de proveedor de pago por uso — **la tarifa por pista no está en ninguna fuente pública: hay que ponerla desde el contrato firmado antes de comparar A** | **serverless por segundo**: 4090 a 0.34–0.89 USD/h → 40–70 s ≈ 0.004–0.017 USD por canción | 4090 dedicada 245–640 USD/mes **aunque nadie genere** |
| Separación de stems | no existe | mismo modelo serverless (ya entra en los 40–70 s) | incluido en la misma GPU, con cola |
| Objetos | Vercel/Supabase storage | R2/B2: 0.015 USD/GB-mes, egreso 0 → 1 000 pistas ≈ 37 GB ≈ **0.6 USD/mes**; 30 000 ≈ **17 USD/mes** | SeaweedFS/RustFS en el VPS (0 USD licencia, 1 disco de más) |
| Cold start | n/a | 20–60 s por arranque de modelo (se amortiza con worker caliente y cola; entró como el 15 %) | 0 |
| Observabilidad/errores | incluido en SaaS | 10–40 USD/mes (sentry/uptime) | igual, más lo que rompa a las 3 a.m. |
| **Efectivo, 1 000 canciones/mes** (≈ 33/día) | ≈ 45–70 USD + la tarifa del proveedor | **≈ 60–110 USD** | **≈ 300–700 USD** |
| **10 000/mes** (≈ 333/día, ocupación 15–23 %) | proveedor dominante | **≈ 100–290 USD** | ≈ 320–700 USD |
| **30 000/mes** (≈ 1 000/día, ocupación 46–64 %) | 3–6× el proveedor | **≈ 190–700 USD** | ≈ 320–700 USD (una sola 4090 basta, sin holgura para picos) |
| **100 000/mes** (≈ 3 333/día) | crece lineal con el margen del tercero | ≈ 660–1 700 USD | **490–1 920 USD y hace falta una segunda GPU** (3 333/día supera el techo de 1 880) |
| **El costo que nadie escribe** | 0 | ~0.1 FTE | **0.3–0.5 FTE**: drivers, CUDA, versión de torch, pesos corruptos, disco lleno, cola atascada. Es la fila decisiva y no es comparable con las de arriba hasta que se le ponga un precio |

Lectura honesta:

- **El autoalojamiento no es más barato a baja demanda.** A 1 000 canciones/mes la GPU propia
  cuesta ~5× y no aporta nada que el cliente note.
- **El cruce B↔C no es un punto, es una banda, y la versión anterior de este documento se equivocaba.**
  Igualando `N · (0,004–0,020) = 245–640` el cruce cae entre **≈ 12 000 y ≈ 160 000 canciones/mes**
  según qué extremo de cada horquilla se tome; con los valores medios (0,012 USD/pista y 440 USD/mes)
  sale **≈ 37 000/mes**. El «entre 10 000 y 20 000» que estaba escrito aquí no era derivable de los datos
  del propio §6 y queda corregido.
- **Y el cruce desaparece si se paga la mano de obra.** A 0,3–0,5 FTE el escenario C necesita dos GPUs
  y más mantenimiento antes de 100 000/mes; con el ingeniero tasado, C deja de ganar por caja en
  cualquier volumen que Play and Go vaya a ver este año. Se elige C por control, no por ahorro.
- **Con demanda en picos el serverless gana aún más**: un curso concentra el uso el lunes por la noche y
  antes de una entrega, y una GPU fija se paga también el martes a las 4 a.m.
- **El argumento real para tener Python propio no es el costo, es el control**: procedencia de
  pesos, reproducibilidad por semilla, stems locales sin pasar audio ajeno por un tercero, y no
  depender del EULA de un proveedor que cambia. Eso vale para una academia que vende soberanía
  técnica; no vale por ahorro.
- **Recomendación**: escenario B ahora, con el contrato de §3 ya escrito en formato worker, para
  que moverse a C sea cambiar dónde corre el mismo código, no reescribirlo.

## 7. (e) Identidad visual: ya existe, falta extenderla

La marca visual no hay que inventarla: `app/globals.css` define el sistema editorial publicado en
producción. Tokens en `.pg-shell` — cyan `#75e9f2`, cyan-soft `#8cecf3`, violeta `#c09eff`, magenta
`#ff9eea`, ámbar `#ffcf72`, menta `#83d7b4`, tinta `#edfaff`, texto `#adc4d0`, apagado `#7f9aa7`, fondo `#07121f`,
superficie `#0b1f2e`, hairline `rgba(150,214,232,.14)` y keyline `rgba(150,214,232,.30)` — con una escala tipográfica de 7 pasos
(`--pg-step--2` 9.5 px → `--pg-step-4` clamp 5.2 rem) y una curva de movimiento única
`cubic-bezier(0.16,0.84,0.24,1)`.

Las reglas que la sostienen (y que hay que seguir defendiendo en cada pantalla nueva):

1. **Un vocabulario, no cuarenta hex.** Si una pantalla necesita un color, se añade un token o una
   primitiva; nunca un literal en el JSX. (Fue la causa de que la landing y el curso se vieran como
   seis webs distintas.)
2. **Jerarquía por tamaño y silencio, no por grosor de borde.** El plan destacado cambia de tinte,
   no de geometría; si cambia el grosor, la rejilla se desalinea.
3. **El estado vive en el ARIA, y el CSS lo lee.** `.pg-check[aria-pressed='true']`: la semántica y
   la pintura no pueden contradecirse.
4. **Movimiento de 8 px.** El revelado por scroll es opacidad y 8 px; si es más, es presentación.
5. **Un matiz por función**: cyan = acción/IA local, violeta = objeto/prompts, ámbar = advertencia y
   entregable, menta = logrado, magenta = ruta/subtítulo. Nunca decorativo.

Lo que falta para que la identidad sea *sonora*, que es el activo real de una academia de música:

- **Sello acústico de 1.5 s** (una nota larga con armónicos que se resuelven), reproducido en el
  primer render de la sesión y en la exportación final, generado con el mismo motor local para que
  el sello no dependa de un archivo.
- **Firma de página**: cada sección del curso tiene un ambiente corto (módulo 1 grave y hueco,
  módulo 5 brillante), con un `prefers-reduced-motion`/`audio-off` por defecto y un control visible.
- **Color de procedencia**: en toda pista generada, una etiqueta con el color del *motor* — cyan si
  fue el navegador, violeta si fue proveedor con pesos Apache. La transparencia se vuelve legible
  sin leer.
- **Tipografía mono para datos** (BPM, LUFS, semilla) y serif/redonda para prosa: el alumno debe
  distinguir un número medido de una opinión escrita sin leer el contexto.

## 8. Decisiones pendientes (nadie más puede tomarlas)

1. **Elegir el motor de pago**: ACE-Step (Apache-2.0) o DiffRhythm (Apache-2.0); MusicGen queda
   fuera del flujo cobrado. Y decidir si se registra el uso de Stable Audio Open en Stability.
2. Declarar las variables de entorno en Vercel (hoy: cero declaradas) — sin ellas el alta, la cuota
   y Stripe no funcionan en producción. Matiz de esta revisión: la visibilidad pública ya no
   depende de `NEXT_PUBLIC_APP_URL` porque `PRODUCTION_ORIGIN` fija el dominio canónico en el
   código (`lib/app-url.ts`), pero esa variable sigue siendo la que manda y la que hay que declarar
   en cuanto exista un dominio propio distinto del de Vercel.
3. Aplicar al proyecto Supabase las 4 migraciones ya escritas en el repo (`20261105190000_schema`,
   `190100_rls`, `190200_functions`, `190300_storage`) y probar el webhook con una carga real
   (efectivo, OXXO/SPEI y `async_payment_succeeded`).
4. Montar `visitarealdelmonte.online` (hoy resuelve a un deploy muerto) o decir en la portada que
   el dominio es el de Vercel.
5. Decidir el escenario de costo (§6) — recomiendo B con contrato de worker.

## 9. Matriz competitiva: las ocho plataformas del brief

Se compara lo que cada plataforma **autoriza a hacer**, no la calidad subjetiva del audio. Precios y
licencias leídos en páginas oficiales el 6-nov-2026; lo que no pudo respaldarse en fuente primaria está
marcado *sin verificar*.

| Plataforma | Modelo de negocio | Derechos del audio generado | API / stems / regeneración parcial | Capa educativa |
| --- | --- | --- | --- | --- |
| **Suno** | Freemium; pago desde ~10 USD/mes | Uso comercial sólo con suscripción; litigios con UMG/Sony → acuerdo y plataforma nueva (ene-2026) | v5.5 (5-nov-2026) añade stems y exportación a DAW; sin API pública | No |
| **Udio** | Suscripción tras el acuerdo con las mayor | Comercial con plan de pago; términos cambian con cada revision | Fragmentos de 19 s cosidos a mano; API «no todavía»; stems *sin verificar* | No |
| **MusicFX → Flow Music (Google)** | **MusicFX y MusicFX DJ cerraron el 31-jul-2026**; la URL de Labs redirige a Flow Music. Free con créditos diarios; Starter 6 USD, Plus 18 USD, Member 48 USD | La página de precios **no declara** uso comercial ni regalías («no verificado» en fuente primaria); el audio sale marcado con SynthID | Lyria 3.5 + Veo; sin API de producto; descarga mp3/wav/m4a; los stems aparecen sólo como fila en su propia comparativa. **Demanda de accionistas de Alphabet (oct-nov 2026) por entrenar Lyria con material con derechos** | No: publicación y votación (Turntable), nada de curso |
| **SOUNDRAW** | Creator 5,99 USD/m (anual) → Artist Unlimited 17,49 USD/m; Enterprise a medida | Licencia mundial perpetua y «100 % de las regalías» con plan pago, pero **prohíbe distribuir el beat sin modificarlo** y la sincronización en contenido ajeno exige acuerdo aparte | **Stems WAV** (drums, bass, melody, vocals, FX) desde Pro; mixer por compás; API oficial desde 29,99 USD/m (100 temas) y 300 USD/m (1 000), usada en Canva, Filmora y Captions | Parcial: «SOUNDRAW for Schools» y blog; sin temario ni certificación |
| **AIVA** | Free / Standard 11 € / Pro 33 € | En Free y Standard el copyright **es de AIVA** (Free sólo no comercial, con crédito); la cesión completa llega con Pro; Standard monetiza sólo YouTube/Twitch/TikTok/Instagram | Su diferencial real es el **MIDI exportable** y el editor piano-roll por capas con regenerado de notas («Magic button»); API *sin verificar* | No: tutoriales de helpdesk y Discord, sin curso |
| **Boomy** | Free (25 guardados, sin descarga ni uso comercial); Creator 9,99 USD/mes; Pro 29,99 USD/mes | **«Boomy retiene el copyright de toda la música creada en la plataforma por defecto»**; el uso comercial persiste tras cancelar y la compra total de derechos se pide por correo | Sin API, sin stems, sin edición por secciones; distribución propia a DSP y remasterizado Dolby a 9,99 USD/tema | No: Discord y ayuda, nada de temario |
| **Mubert** | Ambassador gratis (25 temas/mes, marca de agua); Creator 14 USD (aún **no comercial**); Pro 39 USD; Business 199 USD | Comercial desde Pro con canales monetizados; publicar a DSP y Content ID **no incluidos** en ningún plan | API REST (`music-api.mubert.com`, prueba de 49 USD sólo in-app; sublicencia para usuarios finales sólo desde el plan Startup, abr-2026); «Quick Remix» regenera stems en todos los planes; editor de estructura sólo Pro/Business | No: docs, blog y Copyright Checker |
| **Beatoven.ai** | Suscripción para creadores de vídeo | Royalty-free con plan de pago | Mood-by-timeline; API orientada a vídeo | No |

Las cuatro columnas en las que **ninguna** compite, y por eso son el posicionamiento de Play and Go y no
una lista de deseos:

1. **Enseñar.** Ocho plataformas y ninguna con un curso estructurado: la única aproximación formal es
   «SOUNDRAW for Schools», que es una licencia de aula, no un temario con entregables. El brief pedía
   «la única plataforma educativa con generación integrada» y sigue siendo cierto: lo que Suno o Udio
   tienen es una caja de prompt, y lo que SOUNDRAW o Mubert tienen es una licencia y un blog. Aquí ya hay
   5 módulos y 16 lecciones publicados (§1), y el trabajo real es cerrar el bucle lección ↔ estudio (§5),
   no añadir una tercera columna.
2. **Regeneración con memoria.** Pedir «rehaz sólo el estribillo, misma semilla, mismo tempo» no existe
   en ninguna de las ocho: o regeneran todo (y pierdes lo que te gustaba) o son clips. La
   *Timeline Regenerativa* es diferenciable precisamente porque el contrato del trabajo lleva `seed`,
   ventana y procedencia (§4).
3. **Procedencia y licencia a la vista.** Todas son caja negra respecto a los datos de entrenamiento, y
   varias cambian los derechos retroactivamente cuando firman con las mayor (Suno, Udio). Mostrar *qué
   pesos* generaron cada pista, bajo qué licencia, es un activo de confianza que una caja negra no puede
   copiar sin cambiar de negocio.
4. **Soberanía.** Ninguna de las ocho te deja ejecutar los pesos en tu infraestructura. Mubert sí permite
   sublicencia a usuarios finales, pero sólo a partir del plan Startup (abr-2026): sigue siendo una licencia
   de terceros, no un peso propio. SOUNDRAW cobra la API por escalones (29,99 y 300 USD/mes), Boomy vive
   del reparto de regalías y retiene el copyright por defecto, Suno y Udio operan bajo acuerdos con
   discográficas que han cambiado términos de forma retroactiva. El escenario B de §6 no es un capricho
   técnico: es la única pata del posicionamiento que ningún competidor puede igualar este año.

Lo que **ninguna** combina es la tríada, no las columnas sueltas: academia con entregables y certificación
+ stack ejecutable fuera de la plataforma + identidad sonora regional. Hay cajas de prompt con escuela
informal (SOUNDRAW for Schools), hay motores con licencia perpetua (SOUNDRAW, AIVA Pro) y hay plataformas
con distribución a DSP (Boomy), pero el que quiere aprender *y* conservar el control de sus pesos tiene hoy
dos sitios: uno que le enseña sin dejarle salir, y otro que le deja salir sin enseñarle. Ese hueco es el
posicionamiento de Play and Go, y se sostiene sólo si las cinco promesas del brief (Mapa Emocional,
Compositor Multisensorial, Timeline Regenerativa, Consola TAMV, Motor Adaptativo) se entregan sobre datos
auditable, no sobre una promesa de marketing.

Consecuencia de riesgo que hay que escribir en la portada del plan: las ocho dependen de un acuerdo legal
que puede cambiar el precio o la licencia **de un día para otro**. La pila propia (Apache-2.0, §2) es cara
de montar y barata de defender; la contraria es la trampa del competidor.

## 10. Fuentes

Licencias:
- [facebook/musicgen-small — model card: código MIT, pesos CC-BY-NC 4.0](https://huggingface.co/facebook/musicgen-small/blob/4862286b0abe21ad2fdba3530ddb4b9c2bf5aa04/README.md)
- [audiocraft issue #198 — "the model weights are licensed under CC-By-NC license that prevents any commercial usage"](https://github.com/facebookresearch/audiocraft/issues/198)
- [ACE-Step-v1-3.5B — model card con `License: apache-2.0`](https://huggingface.co/ACE-Step/ACE-Step-v1-3.5B)
- [ACE-Step-1.5 `LICENSE` (texto MIT) ](https://raw.githubusercontent.com/ace-step/ACE-Step-1.5/main/LICENSE)
- [Stability AI License — umbral de 1 M USD anuales para uso comercial gratuito](https://stability.ai/license)
- [stable-audio-open-1.0 `LICENSE.md` — registro obligatorio para uso comercial](https://huggingface.co/stabilityai/stable-audio-open-1.0/blob/main/LICENSE.md)
- [Licensing Essentia — AGPL-3.0 sólo para aplicaciones no comerciales](https://essentia.upf.edu/licensing_information.html)
- [facebookresearch/demucs (código MIT)](https://github.com/facebookresearch/demucs)
- [¿Puede usarse Demucs comercialmente? matiz MUSDB18-HQ](https://audioshake.ai/post/can-demucs-be-used-commercially-musdb18-model-weights-licensing)
- [MinIO en modo mantenimiento (InfoQ, dic 2025)](https://www.infoq.com/news/2025/12/minio-s3-api-alternatives/)
- [Comparativa de alternativas y licencias (SeaweedFS, RustFS, Garage)](https://solanica.io/blog/4-minio-alternatives/)
- [Panorama de modelos musicales abiertos y sus licencias en 2026](https://boppy.me/blog/best-open-source-ai-music-models)

Costos:
- [RunPod pricing (4090 0.34–0.89 USD/h por nube)](https://www.runpod.io/pricing)
- [Comparación de precios de GPU, julio 2026 (spot desde 0.14 USD/h)](https://altstreet.investments/tools/gpu/gpu-price-comparison)
- [Costo por hora de GPU en la nube 2026](https://www.promptquorum.com/prompt-bites/cloud-gpu-cost-per-hour)
- [RunPod vs Lambda 2026 (A100 1.39–1.49 USD/h)](https://www.spheron.network/blog/runpod-vs-lambda-labs-2026/)

Competencia (§9):
- [SOUNDRAW — precios](https://www.soundraw.io/pricing) · [licencia (sincronización y Content ID: «Not OK»)](https://soundraw.io/license) · [API Starter 29,99 y Pro 300 USD/mes](https://www.soundraw.io/api)
- [AIVA — precios (Free/Standard 11 €/Pro 33 €)](https://www.aiva.ai/pricing) · [End User License Agreement: «copyright owned by AIVA» salvo Pro](https://www.aiva.ai/legal/1) · [manual del editor (piano-roll, Magic button)](https://aiva.crisp.help/en/article/general-user-manual-44klp4/)
- [Mubert — precios (Ambassador free / Creator 14 / Pro 39 / Business 199)](https://mubert.com/pricing) · [API y régimen de sublicencia desde abr-2026](https://mubert.com/blog/mubert-api-sublicensing-the-hidden-truth-every-developer-must-know) · [Mubert vs Suno, feb 2026](https://mubert.com/blog/mubert-vs-suno-which-ai-music-generator-is-better-in-2026)
- [Google Labs — MusicFX cerrado y redirigido a Flow Music](https://labs.google/fx) · [anuncio del cierre](https://x.com/GoogleLabs/status/2072417166952136789) · [Flow Music: precios](https://www.flowmusic.app/pricing) · [Lyria 3.5 + Veo](https://www.flowmusic.app/) · [marca SynthID](https://deepmind.google/models/synthid/) · [demanda de accionistas de Alphabet por entrenar Lyria con material con derechos](https://www.musicbusinessworldwide.com/alphabet-shareholder-sues-sundar-pichai-and-12-others-over-training-googles-ai-including-lyria-on-copyrighted-works/)
- [Boomy — precios](https://boomy.com/pricing) · [「Boomy retiene el copyright por defecto」](https://support.boomy.com/hc/en-us/articles/14581348824973) · [comercial tras cancelar y compra de derechos](https://support.boomy.com/hc/en-us/articles/16238363656845)
- [Udio](https://www.udio.com) (API «not yet» en su propio sitio; acuerdos con UMG/Sony → suscripción desde nov-2025)
- Nota de honestidad: el reparto de regalías 80/20 que se le atribuía a Boomy viene de una [fuente secundaria de 2023](https://makebestmusic.com/blog/boomy-ai-music-generator-2026) y **no aparece en su centro de ayuda actual**; el dato que sí está en la fuente primaria es la retención del copyright. En el pie de su help center figura «© 2026 Grow Shine Services Pvt. Ltd.» mientras el sitio habla de Boomy Corporation: cambio de operador **sin verificar**.
