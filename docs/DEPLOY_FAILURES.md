# Dónde están las fallas del deploy

**Estado al 6 de noviembre 05:15 UTC (5 nov, 23:15 hora del centro de México):
las fallas 1 y 2 están resueltas y verificadas en producción.** El proyecto
migró a `AnubisVillasenor1`, el build pasó y `interfaz-curso-musica-ai.vercel.app`
sirve el código real. Quedan la 3 (variables), la 4 (migraciones) y la 5
(dominio), que necesitan escrituras que no puedo hacer yo. Lo de abajo se queda
como estaba porque es la evidencia; donde algo ya no aplica está marcado.

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
