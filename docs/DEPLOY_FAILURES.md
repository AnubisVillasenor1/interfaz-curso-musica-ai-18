# Dónde están las fallas del deploy

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


---

## Falla 2 — El build fallaba por tipos, no por el código (ya arreglada)

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

## Falla 5 — No hay dominio: la cuenta no tiene ninguno y la marca no resuelve

Medido por API y por DNS, con controles para que el método no sea la explicación:

| dato | valor | cómo se midió |
|---|---|---|
| dominios registrados en el equipo `tamvonlinenetwork` | **0** | `GET /v8/domains?teamId=tamvonlinenetwork` |
| dominio montado en el proyecto | solo `interfaz-curso-musica-ai.vercel.app` | `GET /v6/projects/…/domains` |
| `interfaz-curso-musica-ai.vercel.app` | alias vivo del deployment `dpl_HhW5…` | `GET /v4/aliases/…` |
| `visitaraldelmonte.online` | **NXDOMAIN** — sin delegación de nameserver en el registro `.online` | `nslookup -type=NS/A` contra 8.8.8.8 y 1.1.1.1, dos veces |
| `weboficial.com` | **SERVFAIL** (zona existe pero no resuelve; no es lo mismo que estar libre) | misma consulta |
| control de que el método funciona | `github.com` → `dns1.p08.nsone.net`, `vercel.com` → `ns2.vercel-dns.com`, `qoder.online` → `launch1.spaceship.net` | misma consulta |

Lo de `.online` importa más que el deploy: si el dominio no tiene NS en el
registry, **tampoco funciona el correo** que cuelga de él, aunque Hostinger siga
con los registros MX configurados del lado del proveedor de correo. Cualquier
tarjeta, presupuesto o PDF que diga `@visitaraldelmonte.online` está apuntando a
un nombre que hoy el DNS global declara inexistente. Antes de montar nada en
Vercel hay que saber si la renovación está vencida o si se movieron los
nameservers sin dejar delegación.

Nada de esto lo toqué: DNS y pagos de dominio son escritura en infraestructura
ajena.

---

## Orden para salir

1. Decidir qué rama es la real, porque hoy hay dos y Vercel lee la que pierde.
   Las opciones, con su costo:
   - **Remontar el proyecto a `OsoPanda1/…`** (cambio de vínculo en Vercel). El
     build pasa en cuanto se monte: `d215ccb` ya compila verificado con pnpm.
     v0 deja de poder pisar la rama de producción.
   - **Merge de los 10 de OsoPanda a `AnubisVillasenor1/main`** sin tocar el
     vínculo. Menos pasos de plataforma, pero deja las dos cuentas escribiendo
     la misma rama: el siguiente push de v0 puede deshacer la marca o volver a
     romper el build, y hay que resolver 3 commits ajenos en el camino.
   Cualquiera de las dos hay que hacerla antes de mirar lo demás: hoy cualquier
   comprobación contra producción se hace sobre `fde148c`, un build de hace dos
   días. Lo que sí se puede sin tocar nada es un deploy manual desde `d215ccb`
   para ver el sitio entero funcionando en una URL de preview.
2. Añadir `NEXT_PUBLIC_APP_URL`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`,
   `SUPABASE_SERVICE_ROLE_KEY`, `GENERATOR_CALLBACK_SECRET` y `API_KEY` al
   proyecto, y volver a desplegar para que las variables de `NEXT_PUBLIC_*`
   lleguen al bundle.
3. Aplicar las cuatro migraciones en Supabase.
4. Montar el endpoint de webhook de Stripe contra el dominio real y probar un
   cobro de test de punta a punta: pago → webhook → `entitlements` → canción
   diaria disponible.
5. Antes de montar el dominio, resolver el registro: `visitaraldelmonte.online`
   está NXDOMAIN, así que no hay nada que conectar hasta que el nombre vuelva a
   tener nameservers (renovación o delegación en el registrador — escritura en
   infraestructura ajena, no la hago). Después conectar al proyecto y verificar
   `/robots.txt` y `/sitemap.xml` con el dominio puesto.
