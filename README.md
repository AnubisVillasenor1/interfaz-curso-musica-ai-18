# Play and Go by TAMV ONLINE

# **Orgullosamente Realmontenses**

# Cuando tengas un sueño, lucha por el con todas tus fuerzas, sin importar que el mundo entero este en tu contra. El mundo sobrevive y avanza gracias a aquellos que jamas se rindieron, aun cuando el mundo estaba en su contra. 
- Edwin O. Castillo Trejo CEO & Founder TAMV ONLINE 

Curso y estudio de producción musical con IA: 16 sesiones originales en 5 módulos, motor de audio local en el navegador, asistente basado en el currículo y un trayecto técnico complementario con análisis DSP, mezcla y masterización reproducibles.
El autor del curso es Edwin Oswaldo Castillo Trejo; el diseño y la documentación del trayecto técnico declaran apoyo de IA, sin atribuirle autoría humana ni acreditación académica.

Hecho en Mineral del Monte, Hidalgo. `by TAMV ONLINE` — la marca visible en el
sitio es **Play and Go**, no `Sonora IA` (nombre que dejó v0 y que seguía en
producción).

Estado del despliegue: [docs/DEPLOY_FAILURES.md](docs/DEPLOY_FAILURES.md). Ese
documento mide, no supone: cada afirmación trae la prueba y el comando.

---

## Qué hay aquí de verdad

| pieza | dónde | estado |
|---|---|---|
| Programa del curso (16 sesiones, 5 módulos) | `lib/course.ts` | completo, tipado, servido desde `app/curso/…` |
| Páginas de curso, precios, perfil y biblioteca | `app/`, `components/account/`, `components/course/` | renderizan y degradan honesto sin claves |
| Intro cinemática 3D (Three.js + React Three Fiber) | `components/cinematic/` | cinco actos de 12 s (60 s totales), alineados con la presentación oficial, eco 0.12 s y materiales estables |
| Portada cinematic y manifiesto | `components/cinematic/hero-slider.tsx`, `module-grid.tsx`, `manifesto.tsx`, `app/globals.css` | hero carrusel, partículas, rejilla de los 5 módulos con detalle y cinco actos del deck; conserva el curso real |
| Hook & Bridge / Instant Composer | `app/crear/`, `components/instant-composer.tsx`, `lib/music/hook-bridge.ts` | una idea → una pista generada y reproducida en el navegador, sin registro; la pista local no se sube |
| Análisis DSP y sistema multiagente | `lib/music/analysis-core.mjs`, `lib/music/multiagent.ts`, `app/api/music/` | STFT/CQT, chroma, tonalidad y contraste reales; plan multiagente determinista que declara `source: 'rules'` |
| Núcleo nativo TAMV-AudioCore v2 | `native/tamv-audiocore/`, `services/audiocore/` | C++17 + pybind11 opcional, servicio HTTP con NumPy, pruebas y Docker multi-etapa; no corre dentro de Vercel |
| Motor de audio local (síntesis con Tone.js) | `lib/music/engine.ts`, `components/music-studio.tsx` | funciona sin backend ni pago |
| Voz y canción pagada (proveedor externo) | `app/api/music/` | requiere claves; sin ellas responde 503 |
| Asistente con IA | `app/api/agent/` | con `AI_AGENT_API_KEY` usa un LLM real; sin ella responde con el temario y lo dice |
| Laboratorio técnico de audio e IA musical | `app/curso/laboratorio-audio/`, `lib/advanced-audio-curriculum.ts` | seis módulos complementarios con 24 lecciones, código, rúbricas y fuentes técnicas |
| Exámenes y revisión formativa | `app/api/advanced-audio/`, `lib/advanced-audio-exam.ts` | 20 preguntas por módulo; claves solo en servidor; IA revisa texto aportado y requiere login/proveedor |
| Pagos | `app/api/checkout/`, `app/api/stripe/` | flujo escrito, pendiente de claves y de montar el webhook |
| Base de datos | `supabase/migrations/` | ocho archivos SQL versionados en la rama de hardening; el historial aplicado en Supabase debe verificarse antes de ejecutar o reparar migraciones |

Nada de lo anterior es maqueta: se puede levantar con `pnpm dev` y tocar. Pero
el sitio **no cobra ni guarda progreso hasta que haya variables de entorno y
migraciones aplicadas**, y las páginas lo dicen en vez de fingir que funcionan.

## Estructura real

```text
app/                    # App Router: páginas, rutas de API, layout raíz
components/             # UI: cinematic/, course/, account/, music-studio
lib/                    # course.ts, music/, agent/, cinematic/, supabase/, utils
native/tamv-audiocore/  # C++17, FFT propia, chroma/tonalidad/contraste y bindings pybind11
services/audiocore/     # servicio HTTP de análisis, referencia NumPy, pruebas y Dockerfiles
supabase/migrations/    # schema, RLS, RPC, storage, examen, derechos y hardening
public/                 # marca local (tamv-official.jpg, play-go-official.png) y audio/
docs/                   # DEPLOY_FAILURES.md y el análisis del proyecto
proxy.ts                # refresco de sesión (reemplaza a middleware.ts en Next 16)
```

## Estado de la base de datos y migraciones

Vercel utiliza el proyecto prj_ogAIlFJ2Vs9Sll0NIT0h0YKricG4 y la URL pública de Supabase configurada apunta al proyecto qtfuflqujpblyklewclm. Los ocho archivos SQL de esta rama describen el orden de cambios en el repositorio; no prueban cuáles están aplicados en la base remota. Consulta docs/VERCEL_SUPABASE_AUDIT_2026-11-07.md y verifica supabase_migrations.schema_migrations en el proyecto correcto antes de ejecutar db push o reparar el historial.

## Laboratorio técnico complementario

El núcleo didáctico conserva sus **16 sesiones en 5 módulos** y sus identificadores de progreso. El laboratorio técnico se encuentra en la ruta [/curso/laboratorio-audio](./app/curso/laboratorio-audio/page.tsx) y añade seis módulos: fundamentos acústicos/DSP/extracción espectral, mezcla/masterización, IA generativa musical, plugins y sistemas multiagente, trazabilidad/gobernanza y sistema integrador. Su evaluación no renumera las lecciones originales ni emite un grado académico oficial.

Código, instrucciones y pruebas Python viven en `laboratorio-audio-ia/`. Desde esa carpeta, en Python 3.11 o 3.12:

```bash
python -m venv .venv
# Windows PowerShell:
.venv\Scripts\Activate.ps1
# macOS/Linux:
source .venv/bin/activate
python -m pip install --upgrade pip
pip install -r requirements.txt
python -m unittest discover -s tests -v
python -m compileall -q src tests
python -m src.analisis_musical audio/cancion.wav --output output --source-license "Permiso declarado"
```

La suite Python usa señales sintéticas; no descarga pesos de modelos ni requiere audio comercial. La separación con Demucs es opcional y está sujeta a los permisos del audio, los términos del modelo y los recursos del equipo. El indicador true peak del laboratorio se etiqueta como estimación y no reemplaza una medición conforme. Los exámenes teóricos guardan intentos solo cuando hay sesión y base configurada; la revisión por IA es provisional, basada en un resumen textual y no en una escucha automática del archivo.

**Atribución:** Autor del curso: Edwin Oswaldo Castillo Trejo. Marca institucional: TAMV Online Network · Play & Go. Apoyo técnico/editorial de IA declarado; evaluación académica final y validez de evidencias requieren verificación humana.

## Hook & Bridge, análisis DSP y multiagente

La ruta [/crear](./app/crear/page.tsx) implementa el Hook & Bridge: una idea, un
campo, un botón. El compositor local (`lib/music/engine.ts`) genera y reproduce
la pista con Web Audio/Tone.js sin registro y sin subir el audio a ningún
servidor. El popup de curiosidad aparece al terminar la escucha, tras unos 15 s,
al pausar, al pedir otra versión o al compartir; no interrumpe la primera
escucha. Las tres salidas —productor, desarrollador y emprendedor/monetización—
son rutas de aprendizaje, no promesas de ingresos.

El análisis real vive en `lib/music/analysis-core.mjs` (STFT/CQT, Mel, chroma,
tonalidad, contraste) y en `native/tamv-audiocore/` (C++17, FFT propia, AVX2
opcional con fallback escalar). El plan multiagente es determinista y declara
`source: 'rules'`; no finge un modelo remoto ni confianzas calibradas.

```bash
node scripts/verify-audio-core.mjs        # contratos del DSP de navegador y nativo

cd services/audiocore                     # servicio HTTP opcional
python -m pip install -r requirements.txt
python -m unittest discover -s tests -v   # 16 pruebas con NumPy
TAMV_AUDIO_CORE_HOST=127.0.0.1 TAMV_AUDIO_CORE_PORT=8000 python service.py
```

El servicio se empaqueta con `services/audiocore/Dockerfile` (NumPy) o
`Dockerfile.native` (pybind11 multi-etapa). En Vercel sólo se usa el proxy
`/api/music/analyze`; sin `TAMV_AUDIO_CORE_URL` responde 503 y el DSP del
navegador sigue disponible. Las migraciones de análisis están en
`supabase/migrations/20261108200000_audio_core.sql`.

## Arrancar en local

```bash
pnpm install            # el lockfile es pnpm-lock.yaml; package-lock.json está gitignoreado
cp .env.example .env.local
pnpm dev                # http://localhost:3000, sin claves: el sitio degrada a 503 honesto
```

Verificación que sí significa algo antes de cualquier push:

```bash
pnpm typecheck          # tsc --noEmit
pnpm build              # next build completo
```

El typecheck local con npm **puede mentir**: npm sube `@types/*` a la raíz y
TypeScript los incluye sin que nadie se los pida, así que un tipo ausente pasa
aquí y falla en Vercel. Vercel instala con pnpm. Para comprobar como Vercel,
hacer una copia limpia del árbol y correr `pnpm install --frozen-lockfile` antes
del `pnpm build`.

## Variables de entorno

Están descritas en `.env.example`. Las que el proyecto necesita para dejar de
degradar: `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_SUPABASE_URL`,
`NEXT_PUBLIC_SUPABASE_ANON_KEY` (o `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`),
`SUPABASE_SERVICE_ROLE_KEY`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`,
`GENERATOR_CALLBACK_SECRET`, `API_KEY` y las tres de `AI_AGENT_*`. Las
`NEXT_PUBLIC_*` viajan en el bundle: cambiarlas exige reconstruir, no solo
reiniciar. El análisis nativo es opcional: `TAMV_AUDIO_CORE_URL` y
`TAMV_AUDIO_CORE_TOKEN` sólo hacen falta si despliegas el servicio externo.

### Control de solicitudes y Redis

El limitador elige su backend según el entorno, no según `NODE_ENV`: `next
start` también define `NODE_ENV=production` en local y en CI, y confundirlos fue
la causa de la regresión del 11/11/2026 (tres endpoints en 503).

| Entorno | Backend | Comportamiento |
|---|---|---|
| Desarrollo, CI, Preview | memoria por proceso | aplica el cupo; no es global entre instancias |
| Producción con `KV_REST_API_URL` + `KV_REST_API_TOKEN` | Redis (Upstash) | cupo distribuido entre funciones |
| Producción sin Redis | ninguna | falla cerrado con 503 y lo registra |
| Producción sin Redis y `RATE_LIMIT_ALLOW_MEMORY_FALLBACK=true` | memoria degradada | sólo emergencia declarada |

Producción se detecta con `VERCEL_ENV=production` (Vercel) o
`PLAY_AND_GO_ENV=production` (self-hosting). Un fallo de Redis en producción
tampoco abre el límite: devuelve 503 con `Retry-After`, nunca permiso
ilimitado. Las respuestas rechazadas incluyen `X-RateLimit-Limit`,
`X-RateLimit-Remaining`, `X-RateLimit-Reset`, `X-RateLimit-Mode` y
`Retry-After`.

Los límites se separan por endpoint y por costo (`local`, `service`,
`provider`, `external`): una composición determinista no consume el mismo cupo
que una llamada a un proveedor de pago. Las rutas autenticadas de pago
(`checkout`), examen, progreso y subida de audio también tienen cupo por
`userId`. `/api/health` publica el modo del limitador y la presencia de
configuración, sin valores ni secretos.

### Callbacks de generación

La URL que se entrega al proveedor musical lleva una firma HMAC de
`songId + expiración + nonce`, con 24 h de vigencia. El nonce se registra en
`generation_callback_tickets` y se consume una sola vez después de aplicar un
resultado terminal; un fallo de base de datos no quema el reintento. La canción
objetivo siempre sale de la firma, nunca del `taskId` que llega en el cuerpo.

Requiere `GENERATOR_CALLBACK_SECRET` y las migraciones
`20261111170000_transactional_fulfilment.sql` y
`20261111180000_callback_replay_protection.sql` aplicadas **antes** del
despliegue. Sin ellas la generación externa falla cerrada con 503 y devuelve el
cupo.

## Cuenta y rama

GitHub está escribiendo aquí desde `AnubisVillasenor1`, que es la cuenta a la
que Vercel está vinculado (`productionBranch = main`). La cuenta
`OsoPanda1` quedó inaccesible por un problema de acceso en curso; el trabajo
que se hizo allí está fusionado en `main` y no se perdió. Mientras `main` sea
el destino, un push desde v0 vuelve a construir producción: hay que cuidar qué
se firma antes de empujar.

Licencia: privada / institucional.
