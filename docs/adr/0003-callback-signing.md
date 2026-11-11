# ADR 0003 · Firma y nonce de callbacks de generación

- **Fecha:** 2026-11-11
- **Estado:** Aceptado
- **Contexto:** el proveedor musical no firma sus notificaciones. La firma
  anterior cubría sólo `songId`, valía para siempre y `/api/callback` resolvía la
  canción por el `taskId` del cuerpo.

## Decisión

- La URL entregada al proveedor incluye `sig`, `exp` y `nonce`.
- La firma es HMAC-SHA256 de `v1.<songId>.<exp>.<nonce>`, con 24 h de vigencia.
- `generation_callback_tickets` registra el nonce; el consumo es un `UPDATE`
  condicional atómico.
- El nonce se consume después de aplicar un resultado terminal, para no quemar
  el reintento si falla la base.
- `/api/callback` usa el `songId` firmado como objetivo, no el `taskId` del
  cuerpo, cuando la autorización viene del query.
- `apply_generation_result` sigue rechazando transiciones desde estados ya
  terminales.

## Consecuencias

- Una URL filtrada deja de servir al caducar y no puede aplicarse dos veces.
- La migración debe aplicarse antes del despliegue; sin ella la generación
  `suno` falla cerrado con 503 y devuelve el cupo.
- Los proveedores que sólo firman el cuerpo no ofrecen expiración propia: para
  ellos la ventana la impone el estado de la canción. Queda documentado como
  pendiente de validación por proveedor.
