# ADR 0002 · Concesión de derechos transaccional

- **Fecha:** 2026-11-11
- **Estado:** Aceptado
- **Contexto:** `grantProduct` leía `entitlements`, calculaba el estado en
  JavaScript y hacía `upsert`. Dos webhooks concurrentes podían pisarse y dos
  entregas de la misma sesión podían sumar la extensión dos veces.

## Decisión

Toda escritura de derechos pasa por
`public.grant_product_entitlement(...)`:

- `pg_advisory_xact_lock` por usuario, incluso si la fila no existe;
- `select ... for update` sobre la fila;
- registro del `stripe_session_id` en `stripe_session_grants` con clave primaria;
- validación de la suscripción dentro de la transacción;
- derivación de plan y cupos con `sync_entitlement_effective_state`.

## Consecuencias

- El estado efectivo se calcula en un único lugar (Postgres).
- Un evento reenviado no concede derechos adicionales.
- La migración debe aplicarse antes del código. Si falta, la webhook devuelve
  error y Stripe reintenta; no hay concesión parcial.
- `scripts/verify-entitlement-lifecycle.mjs` impide que vuelva el `upsert`
  directo.
