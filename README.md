# Play and Go by TAMV ONLINE

Curso y estudio de producción musical con IA: 16 sesiones en 5 módulos, motor de
audio local en el navegador, análisis espectral en tiempo real, un asistente que
responde con el contenido real del programa y cobro por producto con Stripe.

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
| Intro cinemática 3D (Three.js + React Three Fiber) | `components/cinematic/` | seis actos de 60 s, eco 0.12 s, materiales estables |
| Motor de audio local (síntesis con Tone.js) | `lib/music/engine.ts`, `components/music-studio.tsx` | funciona sin backend ni pago |
| Voz y canción pagada (proveedor externo) | `app/api/music/` | requiere claves; sin ellas responde 503 |
| Asistente con IA | `app/api/agent/` | con `AI_AGENT_API_KEY` usa un LLM real; sin ella responde con el temario y lo dice |
| Pagos | `app/api/checkout/`, `app/api/stripe/` | flujo escrito, pendiente de claves y de montar el webhook |
| Base de datos | `supabase/migrations/` | cuatro migraciones escritas, **todavía no aplicadas** |

Nada de lo anterior es maqueta: se puede levantar con `pnpm dev` y tocar. Pero
el sitio **no cobra ni guarda progreso hasta que haya variables de entorno y
migraciones aplicadas**, y las páginas lo dicen en vez de fingir que funcionan.

## Estructura real

```text
app/                    # App Router: páginas, rutas de API, layout raíz
components/             # UI: cinematic/, course/, account/, music-studio
lib/                    # course.ts, music/, agent/, cinematic/, supabase/, utils
supabase/migrations/    # schema, RLS, funciones RPC y storage
public/                 # marca local (logo.svg, hero-studio.svg) y audio/
docs/                   # DEPLOY_FAILURES.md y el análisis del proyecto
proxy.ts                # refresco de sesión (reemplaza a middleware.ts en Next 16)
```

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
reiniciar.

## Cuenta y rama

GitHub está escribiendo aquí desde `AnubisVillasenor1`, que es la cuenta a la
que Vercel está vinculado (`productionBranch = main`). La cuenta
`OsoPanda1` quedó inaccesible por un problema de acceso en curso; el trabajo
que se hizo allí está fusionado en `main` y no se perdió. Mientras `main` sea
el destino, un push desde v0 vuelve a construir producción: hay que cuidar qué
se firma antes de empujar.

Licencia: privada / institucional.
