# ADR 0001 · Backend del control de solicitudes

- **Fecha:** 2026-11-11
- **Estado:** Aceptado
- **Contexto:** la ejecución CI #76 falló 3 de 38 checks porque el limitador
  devolvía 503 cuando no había Redis. `next start` define `NODE_ENV=production`
  también en local y CI, así que usarlo como señal de producción era incorrecto.

## Decisión

El backend se elige con `PLAY_AND_GO_ENV` o `VERCEL_ENV`:

- desarrollo, CI y Preview → memoria por proceso;
- producción con `KV_REST_API_URL` y `KV_REST_API_TOKEN` → Redis distribuido;
- producción sin Redis → 503 explícito, salvo
  `RATE_LIMIT_ALLOW_MEMORY_FALLBACK=true`, que se registra como degradado.

Un fallo de Redis en producción devuelve 503; nunca permiso ilimitado.

## Consecuencias

- La memoria no es global entre instancias: no se usa como control de gasto.
- Los endpoints deterministas vuelven a funcionar sin credenciales.
- El modo distribuido sólo se certifica con Upstash real y dos instancias.
- `lib/rate-limit-engine.mjs` queda libre de Next para probarlo con
  `node --test`.
