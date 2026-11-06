# Dónde están las fallas del deploy

Medido el 2026-11-05 sobre `https://interfaz-curso-musica-ai.vercel.app` y sobre
el log de build de Vercel. Nada de esta página es inferencia sin comprobación:
cada afirmación trae la prueba que la sostiene.

---

## Falla 1 — Vercel no despliega el `main` que estamos construyendo

**Prueba.** El log de build dice:

```
Cloning github.com/AnubisVillasenor1/interfaz-curso-musica-ai-18 (Branch: main, Commit: 0efc8ec)
```

y los dos remotos del proyecto responden cosas distintas:

| remoto | `refs/heads/main` |
|---|---|
| `AnubisVillasenor1/…` (el que clona Vercel) | `0efc8ec` |
| `OsoPanda1/…` (donde van mis commits) | `d215ccb` |

Las historias divergen: Anubis tiene 2 commits que yo no tengo y yo tengo 9 que
Anubis no tiene.

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
gente**, no porque estén mal, sino porque el deploy lee otro repositorio.

**Los 2 commits que solo están en Anubis**, revisados uno por uno:

- `0efc8ec` — README de 54 líneas.
- `cd7e7b5` — reescritura de `components/cinematic/cinematic-intro.tsx` con
  registro de timeouts. Mi árbol ya hace eso y mejor: `transitionTimers` con
  cancelación explícita en las líneas 140, 157 y 170, más `bed.dispose()` en
  115 y 121. El commit de Anubis añade además una escritura de ref durante el
  render (`actRef.current = act`) y un array `timeoutIds` que crece sin límite
  mientras el componente está montado.

Ninguna de las dos es trabajo que se pierda al cambiar el deploy de origen.

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

**Verificación en el entorno del deploy, no en el mío:** copia limpia del árbol,
`pnpm install --frozen-lockfile` (pasó, prueba de que el lock no está congelado
contra un `package.json` viejo), `tsc --noEmit` en cero errores, `next build`
completo en cero.

---

## Falla 3 — Llaves de entorno: dos confirmadas ausentes, una presente

Se puede saber sin ver valores: cada ruta responde distinto según qué le falta.

| variable | estado en el proyecto de Vercel | cómo se sabe |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` + clave anónima | **configuradas** | `POST /api/checkout` vivo da 401 «Inicia sesión para inscribirte.», y esa ruta devuelve 503 por `SUPABASE_NOT_CONFIGURED` *antes* de mirar la sesión |
| `SUPABASE_SERVICE_ROLE_KEY` | **ausente** | `POST /api/stripe/webhook` vivo da 503 «Stripe webhook no configurado.», que se dispara con `!secret \|\| !webhookSecret` |
| `STRIPE_WEBHOOK_SECRET` | **ausente** (o falta la anterior, el chequeo es conjunto) | misma línea 503 |
| `STRIPE_SECRET_KEY` | sin medir | el checkout exige sesión antes de leer la clave; un visitante anónimo no puede provocar ese ramal |
| `API_KEY` (generación de pago) | sin medir | `/api/generate` también corta por sesión primero |
| `GENERATOR_CALLBACK_SECRET` | **no existe en el deploy** | la ruta que la usa es mía, y hoy no está desplegada (Falla 1) |
| `NEXT_PUBLIC_APP_URL` | **no existe en el deploy** | idem; sin ella el checkout devuelve 503 a propósito y `robots.txt` cierra el indexado |

Lo que significa la segunda fila: aunque alguien pague, **Stripe no puede
entregar el acceso**. El cobro se produce y la plataforma nunca se entera.

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

## Falla 5 — El dominio no apunta al proyecto

```
https://visitaraldelmonte.online   → sin respuesta HTTP (000, ~0.12 s)
https://interfaz-curso-musica-ai.vercel.app → 200
```

El `.online` no sirve la app. Los correos siguen en Hostinger (eso es DNS de
MX y no estorba para esto), pero el registro `A`/`CNAME` del sitio no está
conectado al proyecto de Vercel, o está conectado a uno que ya no existe.

---

## Orden para salir

1. Conectar el proyecto de Vercel al repositorio cuyo `main` sí compila y ya
   está verificado, y hacer un deploy manual desde `d215ccb`. Sin esto, todo lo
   demás se comprueba contra un build viejo.
2. Añadir `NEXT_PUBLIC_APP_URL`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`,
   `SUPABASE_SERVICE_ROLE_KEY`, `GENERATOR_CALLBACK_SECRET` y `API_KEY` al
   proyecto, y volver a desplegar para que las variables de `NEXT_PUBLIC_*`
   lleguen al bundle.
3. Aplicar las cuatro migraciones en Supabase.
4. Montar el endpoint de webhook de Stripe contra el dominio real y probar un
   cobro de test de punta a punta: pago → webhook → `entitlements` → canción
   diaria disponible.
5. Conectar `visitaraldelmonte.online` al proyecto y, después, verificar
   `/robots.txt` y `/sitemap.xml` con el dominio puesto.
