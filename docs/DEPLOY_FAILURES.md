# Dónde están las fallas del deploy

**Estado al 6 de noviembre (medido sobre `main` después del pull): las fallas 1
y 2 siguen resueltas, y apareció la 6.** v0 empujó dos commits a `main` que
rompieron el build otra vez —un archivo truncado y una dependencia sin
declarar—; producción sigue servida por el último build verde (`de9516b`)
mientras `0a8b57a` y `9fc0e7a` dan ERROR. La 6 está corregida y verificada en
local con el install estricto de pnpm; queda por confirmarse en producción en
cuanto entre el commit de este documento. Siguen abiertas la 3 (variables), la
4 (migraciones) y la 5 (dominio), que necesitan escrituras que no puedo hacer
yo. Lo de abajo se queda como estaba porque es la evidencia; donde algo ya no
aplica está marcado.

Medido el 2026-11-05 contra la API de Vercel con token de `anubisvillasenor1`,
sobre la URL pública de producción y sobre el historial de git de las dos
cuentas. Nada de esta página es inferencia sin comprobación: cada afirmación
trae la prueba que la sostiene.

Contexto del proyecto, leído de la API:

| campo | valor |
|---|---|
| proyecto | `interfaz-curso-musica-ai` · `prj_ogAIlFJ2Vs9Sll0NIT0h0YKricG4` |
| equipo | `tamvonlinenetwork` (TAMV Online Network, plan hobby) |
| creado por | v0 — `v0Created: true` |
| vínculo git | `type=github`, `org=AnubisVillasenor1`, `repo=interfaz-curso-musica-ai-18`, `repoId=1445550556`, `productionBranch=main` |

---

## Falla 1 — Vercel lee otra cuenta, y esa cuenta la escribe v0

**Prueba.** El vínculo del proyecto apunta a `AnubisVillasenor1` (tabla de arriba)
y el log de build lo repite:

```
Cloning github.com/AnubisVillasenor1/interfaz-curso-musica-ai-18 (Branch: main, Commit: 89cd2d1)
```

Los dos remotos del proyecto responden cosas distintas, y **Anubis se está
moviendo solo**:

| remoto | `refs/heads/main` |
|---|---|
| `AnubisVillasenor1/…` (el que clona Vercel) | `89cd2d1` — «Revise project title and add description», 21:33, autor `AnubisVillasenor1` |
| `OsoPanda1/…` (donde van mis commits) | `5b75081` |

Lo que hay en producción ahora mismo es el deployment `dpl_HhW5KQQcMxpq8Tw4fYLahqXFjUHk`,
construido el **4 de noviembre a las 06:47** desde el commit `fde148c`
(«Merge pull request #2 from AnubisVillasenor1/feat/free-open-music-agent»). La
URL `interfaz-curso-musica-ai.vercel.app` es alias de ese deployment, confirmado
en `/v4/aliases`. Los dos intentos de production de hoy fallaron (03:29:xx y
03:33 UTC) y por eso el sitio sigue en el build de hace dos días.

**Qué se ve en producción por culpa de esto.** Sondeé la URL viva:

| ruta | producción | `main` de OsoPanda |
|---|---|---|
| `/curso`, `/precios`, `/perfil`, `/biblioteca` | 404 | 200 |
| `/robots.txt`, `/sitemap.xml` | 404 | 200 |
| `/api/entitlement`, `/api/songs`, `/api/progress` | 404 | 503 honesto |
| `<title>` | `Sonora IA — Academia musical` | `Play and Go by TAMV ONLINE` |
| `<meta name="generator">` | `v0.app` | ausente |
| portada | hotlink a `hebbkx1anhila5yf.public.blob.vercel-storage.com` | SVG local |

Es decir: el curso de 16 sesiones, el cobro por producto, el cupo diario, el
motor de audio local y la marca corrigida **no están en el sitio que ve la
gente**, no porque estén mal, sino porque el deploy lee otro repositorio. Y el
build que sí lee tampoco lleva el fix de tipos: ni `0efc8ec` ni `89cd2d1` tienen
`@types/three`.

**Los commits que solo están en Anubis**, revisados uno por uno:

- `0efc8ec` — README de 54 líneas.
- `cd7e7b5` — reescritura de `components/cinematic/cinematic-intro.tsx` con
  registro de timeouts. Mi árbol ya hace eso y mejor: `transitionTimers` con
  cancelación explícita en las líneas 140, 157 y 170, más `bed.dispose()` en
  115 y 121. El commit de Anubis añade además una escritura de ref durante el
  render (`actRef.current = act`) y un array `timeoutIds` que crece sin límite
  mientras el componente está montado.
- `89cd2d1` — 3 líneas de README.

No son la misma línea de tiempo. Las dos ramas están separadas desde `be6aa88`:
medido con `git rev-list --count`, **OsoPanda lleva 10 commits que Vercel nunca
ve** y **Anubis lleva 3 que nosotros no tenemos**. Todo lo de la tabla anterior
está en esos 10; el fix de tipos está en `d215ccb`, que es uno de ellos.

Ninguna de las tres de Anubis es trabajo que se pierda al cambiar el deploy de
origen. El riesgo va al revés: mientras v0 siga escribiendo en Anubis, cada
edición suya en `app/layout.tsx` —donde todavía vive `title: 'Sonora IA'` y
`generator: 'v0.app'`— reemplaza la marca corrigida, y cada push suyo dispara un
build que vuelve a caer en el mismo TS7016 porque el fix no está en esa rama.
Por eso los dos intentos de production de hoy fallaron con errores idénticos.

**Cómo se resolvió (y verificado, no supuesto).** Se fusionó la rama de trabajo
sobre `AnubisVillasenor1/main` en el commit `347c97f`, que toma `89cd2d1` como
ancestro: el push es fast-forward y Vercel no necesitó cambiar el vínculo. El
único conflicto funcional era `components/cinematic/cinematic-intro.tsx` y se
resolvió conservando nuestra versión, que es la que compila contra el `SoundBed`
real (la de v0 pasa `wet`/`feedback`/`dampHz`, parámetros que nuestra clase no
acepta, escribe un ref durante el render y acumula timeouts sin límite). Antes
de empujar, el árbol fusionado se verificó en un worktree limpio: `pnpm install
--frozen-lockfile` en 33 s, `tsc --noEmit` en 0 y `next build` en 0.

Después del push, la API confirmó el deployment `dpl_5fdQDjvJP1d2N2f9Jy9kTNd66Eom`
con `gitSource.sha = 347c97f`, `state = READY` y `target = production`. Sondeada
la URL viva, sin seguir redirects:

| ruta | antes | ahora |
|---|---|---|
| `/`, `/curso`, `/precios`, `/perfil`, `/biblioteca`, `/studio` | 404 | **200** |
| `/robots.txt`, `/sitemap.xml` | 404 | **200** (con cuerpo real, no el `Disallow: /` de apagón) |
| `<title>` | `Sonora IA — Academia musical` | `Play and Go by TAMV ONLINE — Música con IA` |
| `<meta name="generator">` | `v0.app` | ausente |
| `POST /api/agent` | — | 200, `source: fallback`, cita los precios reales del catálogo |

O sea: el curso, la marca, el estudio y las páginas ya no viven solo en un repo
que nadie despliega. Están en el sitio.


---

## Falla 2 — El build fallaba por tipos, no por el código (resuelta y en producción)

El fix está publicado: `347c97f` construyó `READY` con el fix de tipos presente
en `package.json` de la rama que Vercel lee. Lo de abajo se mantiene porque es
la explicación del porqué un typecheck local aprobaba.

```
cinematic-intro.tsx(5,24): error TS7016: Could not find a declaration file for module 'three'
```

**Causa real.** `three@0.187.0` no publica declaraciones: su mapa `exports` no
tiene condición `types` y el paquete no trae ni un `.d.ts`. El typecheck local
pasaba porque npm sube `@types/three` a la raíz de `node_modules` como
transitiva de `@react-three/drei → maath` (comprobado con `npm ls @types/three`),
y TypeScript incluye `@types/*` sin que nadie se lo pida. Vercel instala con
pnpm, cuyo árbol es estricto y no sube transitivas a la raíz. Un typecheck que
mentía según el gestor desde el que se corriera.

**Arreglo.** `@types/three` declarado en `devDependencies` con la misma versión
menor que `three` (commit `d215ccb`), y `pnpm-lock.yaml` regenerado.

**Verificación en el entorno del deploy, no en el mío:** copia limpia del
árbol, `pnpm install --frozen-lockfile` (pasó, prueba de que el lock no está
congelado contra un `package.json` viejo), `tsc --noEmit` en cero errores,
`next build` completo en cero.

**Y confirmado contra el log vivo.** Bajé el log completo del deployment
`dpl_3aL6GUniS6X3dvEFMeZnxNtC88hY` con `vercel inspect --logs`: después de
`Compiled successfully in 5.0s` hay exactamente dos líneas de error, ambas
TS7016 sobre `three` (`cinematic-intro.tsx:5` y `cinematic-stage.tsx:7`), y
nada más. No hay una segunda clase de fallo esperando detrás de la primera.

---

## Falla 3 — El proyecto de Vercel no tiene ni una variable de entorno

Contado por API (`GET /v9/projects/prj_ogAIlFJ2Vs9Sll0NIT0h0YKricG4/env`), sin
leer valores: **0 variables declaradas**. Como control, `isabella-terminus-v6`,
el otro proyecto del equipo, también devuelve 0, así que el cero no es un fallo
de la consulta.

Eso significa que `NEXT_PUBLIC_SUPABASE_URL`, la clave anónima,
`SUPABASE_SERVICE_ROLE_KEY`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`,
`API_KEY` y `NEXT_PUBLIC_APP_URL` no existen en el despliegue. Ningún cobro,
ninguna cuota y ninguna canción guardada pueden funcionar allí.

**La medición que antes leí mal, y por qué.** Sondeé `/api/checkout` en la URL
viva y devolvió 401 «Inicia sesión para inscribirte.», no 503
`SUPABASE_NOT_CONFIGURED`. Lo interpreté como «Supabase sí está configurado».
Es al revés: el build en producción es `fde148c`, y ese commit llama a
`createClient()` y acto seguido a `getUser()` sin el guard:

```
$ git show fde148c:app/api/checkout/route.ts
 8:  const supabase = await createClient()
10:  if (!user?.email) return NextResponse.json({ error: 'Inicia sesión para inscribirte.' }, { status: 401 })
```

Sin variables, `getUser()` no encuentra sesión y el 401 sale igual. El guard
que distingue «no hay llaves» de «no hay usuario» llegó después, en `3fcf0cf`,
y nunca se desplegó. Un falso positivo con pinta de diagnóstico.

Lo que sí queda firme medido en vivo: `POST /api/stripe/webhook` responde 503
«Stripe webhook no configurado.», y esa línea se dispara con
`!secret || !webhookSecret`.

| variable | estado | cómo se sabe |
|---|---|---|
| todas las del proyecto | **ausentes** | `env` devuelve lista vacía, y el control del otro proyecto da 0 también |
| `NEXT_PUBLIC_APP_URL` | ausente | sin ella el checkout responde 503 a propósito y `robots.txt` cierra el indexado |
| `GENERATOR_CALLBACK_SECRET` | ausente | la ruta que la usa no está desplegada (Falla 1) |


---

## Falla 4 — Las cuatro migraciones no están aplicadas

`supabase/migrations/` tiene `…190000_schema`, `…190100_rls`, `…190200_functions`,
`…190300_storage`. `entitlements`, `songs`, `lesson_progress`, `badges` y las RPC
`consume_daily_credit`, `complete_lesson`, `read_entitlement`, `mark_song_ready`
viven ahí. Con las llaves puestas pero las tablas sin crear, las rutas
autenticadas pasan de 503 a 500: el fallo se ve, pero más abajo y más caro.

No las apliqué: son escritura en infraestructura compartida y las credenciales
de esa base no las tengo.

---

## Falla 5 — No hay dominio montado, y el que sí existe apunta a un deployment muerto

Medido por API y por DNS, con controles para que el método no sea la explicación:

| dato | valor | cómo se midió |
|---|---|---|
| dominios registrados en el equipo `tamvonlinenetwork` | **0** | `GET /v8/domains?teamId=tamvonlinenetwork` |
| dominio montado en el proyecto | solo `interfaz-curso-musica-ai.vercel.app` | `GET /v6/projects/…/domains` |
| `interfaz-curso-musica-ai.vercel.app` | alias vivo del deployment `dpl_HhW5…` | `GET /v4/aliases/…` |
| `visitarealdelmonte.online` | **resuelve**: `A 2.57.91.91`, NS `orbit/horizon.dns-parking.com` (parking de Hostinger) | `nslookup -type=A/NS` contra 8.8.8.8 |
| correo de ese dominio | MX `mx1.hostinger.com` (5), `mx2.hostinger.com` (10) — el dominio sí puede recibir correo | `nslookup -type=MX` |
| HTTP sobre ese dominio | **302 → `https://isabella-ai-genesis.vercel.app/`**, y ese destino responde **404** | `curl -D -` y `curl -L` |
| alias en Vercel para `visitarealdelmonte.online` | **404** — no existe en ese equipo | `GET /v4/aliases/…` |
| control de que el método funciona | `github.com` → `dns1.p08.nsone.net`, `vercel.com` → `ns2.vercel-dns.com`, `qoder.online` → `launch1.spaceship.net` | misma consulta |

**Corrección de una afirmación mía que estaba mal.** En el borrador de este
documento escribí que el dominio de la marca estaba en **NXDOMAIN** y que por
tanto el correo también estaba muerto. Era falso y el error fue mío: consulté
`visitaraldelmonte.online` —sin la `e` que abre *real*— en lugar de
`visitarealdelmonte.online` (`visita` + `real` + `delmonte`), que es el nombre
que publicas. Repetida la
consulta con el hostname correcto, el dominio resuelve y los MX siguen
apuntando a Hostinger. El DNS nunca fue la falla; lo que está roto es el destino
de la redirección: un deployment de Vercel que ya no existe. No lo reportes
como problema de registro ni de renovación.

Lo que sí se sostiene sin matiz: el proyecto no tiene ningún dominio suyo, y el
único nombre propio de la marca que hoy resuelve devuelve una redirección a una
página 404. El arreglo es del lado de Hostinger (quitar o reescribir el registro
de redirección, o montar un CNAME a `cname.vercel-dns.com` tras añadir el
dominio al proyecto), no de comprar nada.

Lo que no pude comprobar desde esta máquina: el HTTPS de ese dominio. `curl`
falla con un error de la API criptográfica de Windows (`SEC_E_INTERNAL_ERROR`),
no del sitio, así que no sé si el certificado de Hostinger está montado. Queda
verificado por quien pueda abrirlo desde un navegador.

Nada de esto lo toqué: DNS y redirecciones del dominio son escritura en
infraestructura ajena.

---

## Falla 6 — v0 vuelve a romper `main`, y esta vez por dos cosas distintas

Medido el 6 de noviembre sobre el `main` de `AnubisVillasenor1` después del pull,
en un worktree limpio con `pnpm install --frozen-lockfile`.

Los commits `8645e1e → 0a8b57a` que entraron por v0 dejaron dos production
builds en ERROR (`9fc0e7a` y `0a8b57a`) mientras `de9516b` seguía READY y
sigue siendo el que atiende la URL de producción. Es decir: el sitio no se ve
roto, pero lleva dos push sin publicarse. Las dos causas son independientes:

1. **Un archivo truncado.** `components/cinematic/cinematic-intro.tsx` termina
   en la línea 447 con `const washVars =` y nada después: no hay `return`, no
   hay JSX, no hay cierre de función. El corte es de la exportación de v0, no
   del refactor — las 447 líneas anteriores son coherentes y compilan. `tsc` lo
   dice literal:

   ```
   cinematic-intro.tsx(447,19): error TS1109: Expression expected.
   cinematic-intro.tsx(448,1): error TS1005: '}' expected.
   ```

2. **Una dependencia usada sin declararse.** El refactor importa
   `import { BlendFunction } from 'postprocessing'`, pero `postprocessing` no
   estaba en `package.json`: es *peer* de `@react-three/postprocessing`, así que
   existe en el almacén de pnpm pero **no es resoluble desde la raíz del
   proyecto**. Con npm (hoisting) funciona; con el layout estricto de pnpm que
   usa Vercel, `Cannot find module 'postprocessing'`. Es la misma clase de falla
   que la de `@types/three` en la Falla 2, y la misma que no se veía en esta
   máquina por tener un `node_modules` plano.

Cómo se resolvió:

- Se completó el componente conservando el refactor (cámara `CinematicCamera`,
  `CinematicPost`, timers explícitos) y escribiendo el `washVars` y todo el JSX
  que faltaban, adaptados a las variables que el propio refactor define. El
  `EffectComposer` ahora vive dentro de `CinematicPost`, que es donde tiene que
  estar: los efectos sueltos no se aplican fuera de un composer.
- `postprocessing` se declaró como dependencia (`^6.39.6`, la versión que ya
  estaba en el lockfile como peer). El `pnpm add --lockfile-only` de pnpm
  12.3.4 escribió la entrada del importer **sin el sufijo de peer**
  (`version: 6.39.6`), y eso deja un enlace colgado en `node_modules`: el
  directorio real es `postprocessing@6.39.6_three@0.187.0`. Se corrigió el
  lockfile a `version: 6.39.6(three@0.187.0)` y `pnpm install
  --frozen-lockfile` materializó el paquete. Verificado: `tsc --noEmit` sin
  errores y `next build` verde con las 34 rutas.
- v0 además había vuelto a bajar el eco que se pidió explícito
  (`0.12 s`, pista a `2`, ecos a `4`) a `0.09 / 0.82 / 0.34`. Restaurado.

Consecuencia operativa, y es la que importa: **el vínculo de Vercel con la
cuenta hace que cada push de v0 a `main` reconstruya producción sin pasar por
ninguna revisión**, y dos de sus últimos tres push trajeron código que no
compila. Mientras ese vínculo exista, cada tanda de v0 hay que compilarla antes
de dar por buena la rama — es lo que hace esta sección y lo que no se hizo la
vez pasada.

---

## Orden para salir

1. ~~Decidir qué rama es la real.~~ **Hecho el 5 de noviembre:** el trabajo se
   fusionó en `AnubisVillasenor1/main`, que es la rama que Vercel ya leía, con
   merge fast-forward y build verificado en producción. Queda una consecuencia
   operativa: mientras v0 siga vinculado a la cuenta, un push suyo a `main`
   reconstruye producción, así que hay que revisar qué entra antes de empujar.
   El respaldo del historial completo está en `respaldo-interfaz-347c97f.bundle`,
   junto a la carpeta del proyecto.
2. Añadir las variables al proyecto, que hoy tiene **0**: `NEXT_PUBLIC_APP_URL`,
   `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
   `SUPABASE_SERVICE_ROLE_KEY`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`,
   `GENERATOR_CALLBACK_SECRET`, `API_KEY` y las tres de `AI_AGENT_*`. Hace falta
   el valor de cada una, y esos valores no pasan por este chat. Las
   `NEXT_PUBLIC_*` viajan en el bundle: cambiarlas exige reconstruir.
3. Aplicar las cuatro migraciones en Supabase.
4. Montar el endpoint de webhook de Stripe contra el dominio real y probar un
   cobro de test de punta a punta: pago → webhook → `entitlements` → canción
   diaria disponible.
5. Añadir `visitarealdelmonte.online` al proyecto en Vercel y, del lado de
   Hostinger, quitar la redirección huérfana a `isabella-ai-genesis.vercel.app`
   (hoy devuelve 404) o sustituirla por el CNAME que dé Vercel. Después
   verificar `/robots.txt` y `/sitemap.xml` con el dominio puesto, porque con
   `NEXT_PUBLIC_APP_URL` vacío ambos están declarados apagados a propósito.

---

## Auditoría 6 de noviembre — fallas de código corregidas en esta rama

`pnpm install --frozen-lockfile` + `tsc --noEmit` (0) + `next build` (35 rutas,
antes 34) + prueba en runtime (`GET /` 200, `POST /api/music/plan` devuelve
plan con tempo parseado, `POST /api/agent` 200 fallback). Fallas ya corregidas
en `main`, confirmadas en código:

| falla | corrección |
|---|---|
| callback `SUCCESS` nunca coincidía (lista con mayúscula tras `toLowerCase`) y dejaba canciones en `generating` | `app/api/generate/callback/route.ts`: lista en minúsculas; la rama "pagado sin audio" ahora devuelve 500 si la BD falla, para que el proveedor reintente |
| `refund_generation_quota` sin `GRANT` a `authenticated`: el usuario perdía cupo por fallos ajenos | `20261105190200_functions.sql` + nueva `20261105190400_refund_grant.sql` (idempotente, para BDs ya migradas) |
| `/studio` pedía `/api/agent` con `{prompt}` y esperaba `{plan}`; la ruta es el chat (`{message}` → `{answer}`) | Nueva `app/api/music/plan/route.ts` (usa `planMusic()` de Ollama/local, que existía sin llamador); `MusicStudio` apunta allí; se eliminó el `<main>` duplicado |
| Doble `EffectComposer` (Grade + CinematicPost) y doble rig de cámara (CinematicCamera + CameraRig) en el mismo Canvas | `Grade` solo ajusta exposición; `CinematicCamera` eliminado, `CameraRig` es el único conductor de cámara |
| `deactivateSubscription` degradaba a free a quien tenía compra única permanente | `lib/fulfilment.ts`: si el plan es permanente (sin vencimiento, no free/pro) solo se limpian campos de suscripción |
| Inyección de `role: 'system'` por historial + límite evadible rotando el primer `x-forwarded-for` | `trimHistory` lista blanca user/assistant; `ipOf` usa `x-real-ip` y, si no, la última entrada (la que añaden los proxies de confianza) |
| Modelos nuevos (o-series/gpt-5) rechazaban `max_tokens` → 400 silencioso siempre | Reintento con `max_completion_tokens` y caída a `max_tokens` |
| `active: false` mataba planes permanentes; `listUsers perPage:1000` (tope 50) cortaba tras 50 usuarios | Ver arriba; paginación a 50 × 20 páginas |
| `title: 'Aplicar'` o similar sin validar en `/api/songs/complete` (duración libre, `storage_path` en silencio) | Rango finite/(0,3600), 500 si el update falla, `user_id` también en código |
| Webhook 500 eterno en pago irreconciliable, `async_payment_succeeded` descartado, sin verificación de monto/moneda, fuga de nombre de variable | 200 + log en irreconciliable; async cuenta como pagado; moneda MXN y monto (sin cupón) verificados; 503 genérico |
| Redirección abierta por header Host en logout y auth/callback | `Location: /` relativo, sin construir URL desde cabeceras |
| Sin CI ni pin de versión (el patrón que rompió `main` tres veces) | `.github/workflows/ci.yml` (pnpm frozen + typecheck + build), `.nvmrc` (24), `engines.node >=20` |
| `scripts/check-openapi.py` con ruta absoluta de otra carpeta | Raíz derivada del propio archivo; PyYAML con mensaje claro si falta |

Siguen abiertas las fallas 3 (variables), 4 (aplicar migraciones) y 5 (dominio),
que requieren escrituras fuera del código — ver "Orden para salir" arriba.
