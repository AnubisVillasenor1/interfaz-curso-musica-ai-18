# Agent-Ready API — informe de auditoría (Play and Go / interfaz-curso-musica-ai-18)

Fecha: 2026-11-06 · Marco: 8 pilares / 48 comprobaciones del plugin Postman (`skills/agent-ready-apis/pillars.md`) · Alcance: los 12 route handlers de `app/api/**` (el spec documenta 11; `POST /api/stripe/webhook` queda excluido porque solo recibe a Stripe — ver comentario en `openapi.yaml`).

## Resultado

| | |
|---|---|
| **Score ponderado** | **69.5 / 100** (peso obtenido 44.5 sobre máximo aplicable 64.0) |
| **Críticos fallados** | **0** |
| **Checks** | 30 pass · 16 fail (0 crítico / 6 alto / 5 medio / 5 bajo) · 2 noAplica |
| **Veredicto** | **Necesita trabajo** (escala: 90-100 excelente · 70-89 agent ready · 50-69 necesita trabajo · 0-49 no lista) |

Matiz honesto: el score descansa en que **ya existe `docs/api/openapi.yaml`**. Solo el spec se lleva del aire (pilares Metadata, Introspección y Discoverability casi llenos); **el servidor en sí** falla todo el pilar Performance (0.5/6) y buena parte de Errors y Predictability. Nota metodológica: la fórmula impresa del plugin da max 65.5, pero el recuento real de sus propios pesos por check es 4 crítico + 14 alto + 13 medio + 17 bajo = 65.5 y, excluidos los 2 noAplica, 64.0 aplicable; se usó el recuento de la tabla.

## Los 8 pilares

| Pilar | Puntos | % | Leyenda |
|---|---|---|---|
| Metadata | 8.5/9 | 94% | Cubierto por el spec (operationIds snake_case, summary, description, tags) |
| Errors | 5.5/11.5 | 48% | El código no tiene códigos de máquina ni forma unificada |
| Introspección | 11/11 | 100% | Tipos/required/enums/ejemplos extraídos de las validaciones reales |
| Naming | 4/7 | 57% | Verbos en URLs y casing de propiedades mezclado |
| Predictability | 4.5/9 | 50% | Paginación y formatos de id/fecha inconsistente |
| Documentation | 5.5/6 | 92% | Solo falta versionado de API |
| Performance | 0.5/6 | **8%** | Sin cabeceras de tasa, sin caché en rutas por-usuario, un listado sin paginar |
| Discoverability | 6.5/6.5 | 100% | OpenAPI 3.1, servers, info, contacto y licencia (propietaria, marcada x-no-verificado) |

## Regla de negocio verificada: procedencia, cuota y "nunca finge IA"

La regla del producto tiene **tres patas y el código solo cumple dos**:

1. **Procedencia — CUMPLE.** `/api/generate` etiqueta siempre el motor: `song.engine` ∈ {local, provider} (generate/route.ts:107,111) y en local un bloque `render.engine: 'local'` con `seed` determinista (123-138); en provider devuelve `taskId` (201). `/api/agent` etiqueta `source: 'llm'|'fallback'` con `model` solo en llm y `note` explicando la degradación (agent/route.ts:164,173-176; lib/agent/guide.ts:22-30). La promesa "la interfaz nunca finge IA" es cierta en el contrato: la rama determinista jamás se marca como IA.
2. **Cuota restante — NO CUMPLE.** En las respuestas de **éxito** de `/api/generate` (local y provider) no viaja ningún dato de cupo; `{limit, used}` solo aparece en el rechazo **402** (generate/route.ts:80-87). El cliente tiene que hacer una segunda llamada a `/api/entitlement` (sin garantía de atomicidad con la generación). `/api/songs/complete` (cierre del ciclo local) tampoco informa cupo. **Arreglo recomendado** — en generate/route.ts, la RPC ya devuelve `limit_total`/`limit_used` incluso cuando `allowed:true`; basta propagarlos:
   ```ts
   // generate/route.ts: éxito local (líneas 126-138) y éxito provider (201)
   return NextResponse.json({
     song,
     quota: {
       engine,                          // procedencia
       limit: granted?.limit_total ?? 0,
       used: granted?.limit_used ?? 0,
       remaining: (granted?.limit_total ?? 0) - (granted?.limit_used ?? 0),
     },
     // ...render / taskId
   }, { headers: { 'Cache-Control': 'private, no-store' } })
   ```
3. `/api/music/compose` (descarga MIDI) no exige sesión ni informa cuota: coherente con "el motor local no cuesta dinero", pero si el plan gratuito tiene tope diario (FREE_TIER.localDailyLimit=10), **esa ruta lo ignora por completo** — el tope solo lo aplica `consume_generation_quota` en `/api/generate`. Vale la pena decidir si compose debe contar o declararse explícitamente fuera de cuota (está declarado fuera en el spec).

## Fallos de severidad ALTO (críticos: 0) con su arreglo

### E2/E3 — error sin códigos de máquina y con 5 formas distintas (Errors, 2+2)
Hoy conviven: `{error:'frase'}` (mayoría), `{error, available[]}` (checkout:41), `{error, limit, used}` (generate:84), `{song, error, fallback}` en un 503 (generate:148-154), `{error:'not_configured'}` token de máquina (callback:50) y un 429 con **shape de éxito** (`answer/source/rateLimited`, agent:151-159). Un agente no puede distinguir "sin Supabase" de "sin API_KEY de proveedor" sin parsear español.

**Arreglo** — crear `lib/api-error.ts` y usarlo en los 12 handlers:
```ts
export function apiError(code: string, message: string, status: number, extra?: object, headers?: HeadersInit) {
  return NextResponse.json({ error: { code, message, ...extra } }, { status, headers: { 'Cache-Control': 'private, no-store', ...headers } })
}
// Ejemplos literales a sustituir:
// generate cupo agotado (hoy línea 83):
return apiError('quota_exhausted', granted?.reason ?? 'Sin cupo disponible.', 402, { quota: { limit: granted?.limit_total, used: granted?.limit_used } })
// checkout sin sesión (hoy 34): apiError('unauthenticated', 'Inicia sesión para inscribirte.', 401)
// callback sin config (hoy 50): apiError('not_configured', 'Service credentials absent.', 503)
```
El 429 del agent route debe migrar al esquema de error conservando la respuesta útil como payload: `{ error: { code:'rate_limited', message, retryAt }, answer: <fallback>, source:'fallback' }`.

### N1 — verbos en URLs (Naming, 2)
`/music/compose`, `/generate`, `/songs/complete`, `/auth/logout`, `/checkout`. Arreglo de bajo rendimiento a corto plazo (los operationIds del spec ya dan nombres estables); si se moderniza: `POST /api/songs` (=generate), `PATCH /api/songs/{id}` con `status:ready` (=complete), `POST /api/sessions`/`DELETE /api/sessions` (=logout), manteniendo aliases con 308.

### P2 / PF2 — paginación inconsistente o ausente (Predictability/Performance, 2+2)
`/api/songs` pagina (`page/limit≤50`, songs/route.ts:41-42) pero **sin `total` ni cursor**; `/api/music/search` devuelve hasta 24 resultados fijos (12+12, search/route.ts:19,33) sin parámetros. Arreglo: añadir `{ total }` (o `nextCursor`) al 200 de songs y aceptar `limit/page` en search pasándolos a `rows`/`limit` de los proveedores.

### PF1 — ningún handler emite cabeceras de tasa (Performance, 2)
Solo `/api/agent` limita (6/min anónimo, 20/min autenticado, en memoria por nodo — agent/route.ts:30-48) y su 429 no trae `Retry-After` pese a conocer `resetAt`. Las rutas caras (`/generate`, `/checkout`, `/search`) no tienen **ningún** límite; el techo real lo pone el panel del proveedor externo, invisible para el cliente. Arreglo mínimo en agent/route.ts:
```ts
return NextResponse.json(
  { error: { code: 'rate_limited', message: 'Espera un minuto y vuelve a preguntar.', retryAt: new Date(entry.resetAt).toISOString() }, answer: '...', source: 'fallback', lessonIds: [], rateLimited: true },
  { status: 429, headers: {
      'Retry-After': String(Math.ceil((entry.resetAt - Date.now()) / 1000)),
      'X-RateLimit-Limit': String(limit),
      'X-RateLimit-Remaining': '0',
      'X-RateLimit-Reset': String(Math.floor(entry.resetAt / 1000)),
      'Cache-Control': 'no-store',
  } },
)
```
y extrapolar el mismo bucket a `/generate` y `/search` (o moverlo a Vercel WAF/Firewall, porque en memoria no resiste scale-to-zero ni multi-nodo).

## Fallos MEDIO y BAJO (resumen con evidencia en agent-readiness.json)

- **E5** reintento sin `Retry-After`/`retryAt` (incluido en el bloque anterior).
- **E6** los 400 no dicen qué campo falló: `generate/route.ts:67` fusiona título+prompt en una frase. Añadir `details:[{field,issue}]`.
- **PF3** solo `compose` fija `Cache-Control: no-store` (compose:22). `GET /api/songs`, `/api/entitlement`, `/api/progress` devuelven datos por-usuario con URLs firmadas **sin** `private, no-store` en el handler (next.config.mjs:35-50 solo cubre /perfil, /biblioteca, /audio/*). Arreglo: `{ headers: { 'Cache-Control': 'private, no-store, max-age=0, must-revalidate' } }` en cada NextResponse.json de esas rutas, o una entrada `{ source: '/api/:path*', headers: [...] }` en next.config.mjs.
- **P3** dates: ISO-8601 en todas partes menos `expiresAt` epoch (songs/complete:139). **P4** ids: UUID vs prefijos `ia-`/`jamendo-` sin convención declarada. **N5** snake/camel mezclado en un mismo cuerpo (playableUrl vs created_at; lessonId vs lessons_done). **N6** derivado de N1. **P6** null explícito vs omisión (`?? undefined` en generate:133-134). **D6** API sin `/v1` ni changelog. **M6** sin metadata de extensión (decisión del encargo: no decorativo).

## Lo que los routes hacen bien (y conviene no tocar)

- Seguridad real, no decorativa: callback firmado con HMAC time-safe sobre el songId (lib/callback-signature.ts:17-61) tras haber sido un endpoint público que aceptaba cualquier audio_url; cuota reservada por RPC `security definer FOR UPDATE` con **devolución de cupo** en todos los caminos de fallo (generate:29-32,116,145,159,166,206); idempotencyKey de 1 minuto en checkout (:59); lista blanca de productos y de lecciones; `productId` desconocido en el webhook no regala planes (:75-84); `poweredByHeader:false` y headers de seguridad en next.config.mjs.
- El webhook y el callback **responden 500 a propósito** para provocar reintentos del emisor — patrón correcto documentado en el spec.
- Errores sin stack traces ni detalles internos en el cuerpo (los `console.error` se quedan en servidor: checkout:99-105, agent:93-98). Reparo: los mensajes 503 **nominan variables de entorno** (`NEXT_PUBLIC_SUPABASE_URL` config.ts:46, `NEXT_PUBLIC_APP_URL` app-url.ts:53): útil para ops, ruido para clientes; mover a un `code` de máquina y dejar la frase genérica.
- **No hay CORS en ninguna parte** (ni next.config.mjs ni handlers). Es correcto para consumo same-origin con cookies; pero significa que **ningún agente de terceros puede llamar**: la autenticación es solo cookie de sesión Supabase, no existe Bearer. Queda documentado en `securitySchemes`.
- 429 del agent route con forma de éxito (answer de relleno): decisión deliberada de UX que rompe E2; el arreglo propuesto la preserva dentro del esquema de error.

## Quick wins ordenados por impacto/costo (tabla del plugin + medición propia)

| # | Quick win | Ganancia estimada | Costo | Dónde |
|---|---|---|---|---|
| 1 | Esquema de error unificado con `code` (E2+E3+E5+E6 en un golpe) | **+7 a +10** pts | 1 helper + ~40 llamadas sustituidas | `lib/api-error.ts` nuevo; los 12 routes |
| 2 | Cabeceras `Retry-After` + `X-RateLimit-*` en el 429 y bucket en /generate y /search | +3 a +5 (PF1, D2→creíble) | ~30 líneas (el bucket ya existe en agent:30-48) | app/api/agent/route.ts:150-159 + reuso |
| 3 | `Cache-Control: private, no-store` en las 4 rutas JSON por-usuario | +1 (PF3) | 1 entrada en next.config.mjs:21-51 | next.config.mjs |
| 4 | `quota.remaining` en las respuestas de éxito de /generate y /songs/complete | 0 pts del marco — **cumple la regla de negocio del producto** | ~8 líneas (RPC ya devuelve los números) | generate:126-138, 201; complete:135-140 |
| 5 | `total`/cursor en listados (P2/PF2) | +3 a +4 | query count + 2 campos | songs:44-75; search:15-39 |
| 6 | OperationIds + spec publicado (M1-M4, I1-I7, DC1-DC5) | +8 a +15 sobre el código crudo | **ya hecho** en `docs/api/openapi.yaml` | — |
| 7 | Unificar casing de propiedades a camelCase (N5, P6) | +1 | rename en selects/proyecciones | songs:46; generate:99-111; entitlement:40-51 |
| 8 | Versionar `/api/v1/*` con aliases 308 (D6, y habilita N1/N6) | +1 | middleware de reescritura | app/ |

Con #1, #2, #3 y #5 la API cruza el umbral **≥70 con cero críticos → "Agent Ready"** sin tocar la arquitectura.

## Correcciones aplicadas después de la medición (2026-11-06, mismo día)

El 69,5 es una foto del estado anterior. Esto es lo que ya está en el código, medido
con `scripts/check-openapi.py` (typecheck y build aparte):

| Quick win | Estado | Qué se hizo realmente |
|---|---|---|
| #1 códigos de máquina | **Aplicado con forma distinta** | No se creó `lib/api-error.ts` ni el objeto anidado `{error:{code,message}}`: se añadió `code` como hermano de `error` en los 27 sitios de las 11 rutas. Razón: la UI ya lee `response.error` como string en 9 componentes; anidarlo habría roto la interfaz por una preferencia de estilo. El enum completo vive en `components.schemas.ErrorResponse` del spec y `scripts/check-openapi.py` verifica que emitidos == documentados (27/27, cero deriva en ambos sentidos). |
| #2 `Retry-After` + `X-RateLimit-*` | **Aplicado en `/api/agent`** | El 429 emite `Retry-After`, `X-RateLimit-Limit`, `X-RateLimit-Remaining: 0` y repite `retryAfter` en el cuerpo; el éxito con modelo emite Limit/Remaining. `rateCheck()` sustituyó a `rateLimited()` y devuelve `{allowed, remaining, retryAfterS}`. **No extrapolado** a `/generate`, `/checkout` ni `/search`: ahí el bucket en memoria seguiría siendo falso en multi-nodo, y prefiero un vacío conocido a un límite que no existe. |
| #3 `Cache-Control` por-usuario | **Aplicado** | `private, no-store` en los 200 de `/api/songs` (GET), `/api/entitlement`, `/api/progress` (GET) y `/api/songs/complete`, todos vía la constante `PRIVATE_HEADERS` de cada handler. `/api/music/search` recibe `public, max-age=60, stale-while-revalidate=300` porque es catálogo público y un caché corto además descarga a Internet Archive. Se eligió el handler y no `next.config.mjs`: una regla `/api/:path*` habría obligado a un solo valor para las dos semánticas. |
| #4 cuota en el éxito | **Aplicado** | `{quota:{limit, used}}` en las dos ramas de éxito de `/api/generate`; `remaining` se dejó fuera porque se deriva con una resta y el spec ya documenta ambos campos. `/api/songs/complete` sigue sin cuota: cerrarla habría costado una lectura extra de `entitlements` en cada subida y así queda declarado en el spec. |
| Reparos de fuga de configuración | **Aplicado** | Los 503 dejaron de nombrar variables. `SUPABASE_NOT_CONFIGURED` es ahora una frase para clientes y `SUPABASE_NOT_CONFIGURED_DETAIL` (con los nombres) solo va al log; `requireAppUrl` y los dos 503 de `/api/generate` hicieron lo mismo. El campo `songs.error` que ve el usuario ya no contiene nombres de secreto. |
| E6 (qué campo falló) | **Parcial** | `/api/agent` y `/api/songs/complete` sí informan el motivo exacto (`message_too_long` con `limit`, `missing_audio`, `empty_audio`, `audio_too_large`, `unsupported_media_type` con `allowed[]`). `/api/generate` sigue fusionando título y prompt en un solo 400. |
| #5 `total` en los listados | **Aplicado** (segunda tanda, mismo día) | `/api/songs` GET ahora pide `count: 'exact'` al Select de PostgREST —el total no cuesta una segunda query— y devuelve `total` y `totalPages`. `/api/music/search` acepta `limit` (1-48, default 24) y `page` (1-50) y los traduce a `rows`/`page` en Internet Archive y `limit`/`offset` en Jamendo; responde además `total: {internetArchive, jamendo}`. `numFound` de Archive está **medido en vivo** (117 917 para "piano"); Jamendo no expone recuento en `v3.0/tracks`, así que su `total` es `null` y el spec lo documenta como "desconocido", no como cero. |
| #7 casing, #8 `/v1` | **No aplicados** | Siguen abiertos y siguen marcados en el spec. #7 se dejó a propósito: renombrar `created_at`→`createdAt` en `/api/songs` y `engine`/`status` rompe los tipos que la UI ya consume (`components/account/library-panel.tsx` espeja el cuerpo actual), y una API pública aún sin consumidores externos no justifica ese coste ahora. #8 necesita middleware de reescritura y aliases 308; es decisión de arquitectura, no un arreglo de superficie. |

### Hallazgo nuevo añadido después de la auditoría: el sitio era invisible para buscadores

`getAppUrl()` devuelve `""` cuando el entorno no declara `NEXT_PUBLIC_APP_URL`, y con
cero variables declaradas en Vercel eso pasaba **en producción**. Consecuencia medida
en el build: `app/sitemap.ts` retornaba `[]` (sitemap.xml vacío), `app/robots.ts`
entraba en la rama `disallow: '/'` (el bot queda fuera de todo el dominio) y
`metadataBase` se iba a `undefined` — Next avisaba con `http://localhost:3000` para
las imágenes Open Graph, es decir, tarjetas sociales muertas. Se corrigió con
`getSeoOrigin()` + `PRODUCTION_ORIGIN` en `lib/app-url.ts`: el dominio canónico pasa a
estar declarado en el código para las tres superficies de visibilidad, el cierre total
lo decide `VERCEL_ENV` (los preview siguen excluidos) y `requireAppUrl()` conserva su
strictness para el retorno de pago, donde adivinar sí es un riesgo. Tras el cambio,
`next build` sale con 0 avisos de `metadataBase` y `/sitemap.xml` y `/robots.txt`
generados con el dominio real.

Un agente que hoy llegue a la API pasa por `/robots.txt` y `/sitemap.xml`: esta corrección
cuenta en Performance y Discoverability aunque no esté en la lista original de checks.

### Verificado contra el deploy (2026-11-06, tras el push de `598a0b7`)

13 peticiones anónimas reales a `https://interfaz-curso-musica-ai.vercel.app`, sin sesión
y sin tocar credenciales (script: `C:/Users/tamvo/.qoder/tmp/probe-live.mjs`, salida cruda
en `probe-out.txt`). Lo que se midió:

| Superficie | Estado medido | Cabecera / cuerpo relevante |
|---|---|---|
| `GET /sitemap.xml` | 200, 4 539 B | `<loc>https://interfaz-curso-musica-ai.vercel.app/</loc>` — el sitemap ya no está vacío |
| `GET /robots.txt` | 200, 238 B | `Allow: /` + `Host:` y `Sitemap:` con el dominio real; solo `/api/`, `/auth/callback`, `/perfil`, `/biblioteca`, `/studio` siguen excluidas |
| `GET /` (og:url) | 200 | tarjeta social con el dominio de producción, no `localhost:3000` |
| `GET /api/music/search?q=...` | 200 | `cache-control: public, max-age=60` — la #3 viaja desde el handler, no la pone Vercel |
| `GET /api/music/search?q=a` | 400 | `{"error":"La búsqueda debe tener al menos 2 caracteres.","code":"query_too_short"}` |
| `POST /api/agent` (vacio) | 400 | `{"error":"Escribe una pregunta.","code":"invalid_request"}` |
| `POST /api/agent` (mensaje largo) | 413 | `{"code":"message_too_long","limit":2000}` |
| `POST /api/agent` (pregunta válida) | 200 en 164 ms | `"source":"fallback"`, `"lessonIds":["m05-l16"]` — la procedencia sigue visible: sin proveedor configurado **no** se etiqueta como IA |
| `entitlement`, `progress`, `songs`, `generate` sin sesión | 401 | los cuatro cuerpos llevan su `code` (`unauthorized`) |
| `POST /api/checkout` sin sesión | 401 | `{"error":"Inicia sesión para inscribirte.","code":"unauthorized"}` |

Lo que **no** pudo verificarse en vivo: los `200` de las cuatro rutas por-usuario con
`private, no-store`, porque exigen sesión de Supabase y en esta sesión no se inicia sesión
en la cuenta del dueño. Quedan verificados en código y en build. Los `401` salen con el
`Cache-Control` por defecto de la plataforma (`public, max-age=0, must-revalidate`) porque
`PRIVATE_HEADERS` va en las respuestas de éxito: un 401 no contiene datos de ninguna cuenta,
así que se consideró correcto no tocarlo.

Conclusión honesta sobre el score: el 69,5 sigue siendo la foto de la auditoría original y
en el papel no se recalculará hasta que se corra de nuevo la rúbrica contra el código actual.
Los cuatro quick wins de mayor ratio (#1–#4) están aplicados y **confirmados contra el
deploy en las superficies anónimas**; #5, #7 y #8 siguen abiertos.
