# Play and Go — estrategia de pila abierta

Documento de decisión. Responde las cinco preguntas del brief (estructura Python/Next.js,
flujo MusicGen + Demucs, capa educativa, costos reales de autoalojamiento, identidad visual)
y corrige dos premisas del brief con evidencia del repositorio y de las licencias oficiales.

Fecha: 2026-11-06 · Estado del producto: `b1493f2` publicado en `AnubisVillasenor1/interfaz-curso-musica-ai-18`
y sirviendo en producción (`https://interfaz-curso-musica-ai.vercel.app`, ver §0).

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
| Prompts copiables con variables | `PromptTemplate.text` + `variables`; `PromptCard` con copiar al portapapeles |
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

## 4. (b) Flujo básico MusicGen + Demucs (referencia, sin ejecutar)

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
`PromptTemplate.text` ya contiene `{bpm}`, `{tonalidad}`, `{duracion}`. Un enlace
`/studio?recipe=m02-l05&v=bpm:96,tonalidad:F#m` rellena el estudio y deja constancia de que la
receta vino del curso. Cuesta: un parser de `searchParams` en el estudio y una tabla de recetas.
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
25–40 s; separación 15–30 s adicionales; WAV 44.1 kHz estéreo 16 bit ≈ 37 MB por pista (→ el
almacenamiento es el segundo problema, el MP3/Opus es el primero que hay que resolver).

| Concepto | A. Todo gestionado (hoy) | B. Híbrido (recomendado) | C. GPU propia siempre encendida |
| --- | --- | --- | --- |
| Web (Next en Vercel) | Pro ≈ 20 USD/mes por usuario | igual | VPS 12–24 USD/mes |
| Base de datos | Supabase Pro 25 USD/mes | igual | Postgres en el mismo VPS, 0 USD de licencia, ~1 h/mes de mantenimiento |
| Generación | API de proveedor de pago por uso | **serverless por segundo**: 4090 a 0.34–0.89 USD/h → 25 s ≈ 0.002–0.006 USD por canción | 4090 dedicada 245–640 USD/mes **aunque nadie genere** |
| Separación de stems | no existe | mismo modelo serverless | included en la misma GPU, con cola |
| Objetos | Vercel/Supabase storage | R2/B2: 0.015 USD/GB-mes, egreso 0 → 10 000 pistas ≈ 370 GB ≈ **5.5 USD/mes** | SeaweedFS/RustFS en el VPS (0 USD licencia, 1 disco de más) |
| Cold start | n/a | 20–60 s por arranque de modelo (se amortiza con worker caliente y cola) | 0 |
| Observabilidad/errores | incluido en SaaS | 10–40 USD/mes (sentry/uptime) | igual, más lo que rompa a las 3 a.m. |
| **Efectivo mensual, 1 000 canciones/mes** | **≈ 45–70 USD** + el precio del proveedor | **≈ 65–110 USD** | **≈ 300–700 USD** |
| **Efectivo mensual, 30 000 canciones/mes** | 3–6× el coste de proveedor (se vuelve el ítem dominante) | **≈ 350–700 USD** | ≈ 320–700 USD (la misma GPU rinde ~1 500–3 000 canciones/día) |
| **El costo que nadie escribe** | 0 | ~0.1 FTE | **0.3–0.5 FTE**: drivers, CUDA, versión de torch, pesos corruptos, disco lleno, cola atascada |

Lectura honesta:

- **El autoalojamiento no es más barato a baja demanda.** A 1 000 canciones/mes la GPU propia
  cuesta ~5× y no aporta nada que el cliente note.
- **El punto de cruce está entre 10 000 y 20 000 canciones/mes**, y sólo si la demanda es plana.
  Con demanda en picos (típicos de un curso: lunes noche y antes de una entrega), el serverless con
  cola gana porque no pagas el ocioso.
- **El argumento real para tener Python propio no es el costo, es el control**: procedencia de
  pesos, reproducibilidad por semilla, stems locales sin pasar audio ajeno por un tercero, y no
  depender del EULA de un proveedor que cambia. Eso vale para una academia que vende soberanía
  técnica; no vale por ahorro.
- **Recomendación**: escenario B ahora, con el contrato de §3 ya escrito en formato worker, para
  que moverse a C sea cambiar dónde corre el mismo código, no reescribirlo.

## 7. (e) Identidad visual: ya existe, falta extenderla

La marca visual no hay que inventarla: `app/globals.css` define el sistema editorial publicado en
producción. Tokens en `.pg-shell` — cyan `#75e9f2`, cyan-soft `#8cecf3`, violeta `#c09eff`, magenta
`#ff9eea`, ámbar `#ffcf72`, tinta `#edfaff`, texto `#adc4d0`, apagado `#7f9aa7`, fondo `#07121f`,
superficie `#0b1f2e`, hairline y keyline translúcidos — con una escala tipográfica de 7 pasos
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
   y Stripe no funcionan en producción.
3. Aplicar al proyecto Supabase las 4 migraciones ya escritas en el repo (`20261105190000_schema`,
   `190100_rls`, `190200_functions`, `190300_storage`) y probar el webhook con una carga real
   (efectivo, OXXO/SPEI y `async_payment_succeeded`).
4. Montar `visitarealdelmonte.online` (hoy resuelve a un deploy muerto) o decir en la portada que
   el dominio es el de Vercel.
5. Decidir el escenario de costo (§6) — recomiendo B con contrato de worker.

## 9. Fuentes

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
