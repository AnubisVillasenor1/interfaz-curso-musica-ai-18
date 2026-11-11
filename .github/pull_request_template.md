## Problema

<!-- Qué falla, a quién afecta y cómo se reproduce. -->

## Causa raíz

<!-- Por qué ocurría. Evita describir sólo el síntoma. -->

## Cambio

<!-- Qué se modificó y por qué esta solución y no otra. -->

## Evidencia

<!-- Comandos ejecutados y resultado. Enlaza el run de CI cuando exista. -->

```bash
pnpm typecheck
pnpm build
node scripts/smoke-preview.mjs
```

## Migraciones y orden de despliegue

- [ ] No hay migraciones.
- [ ] Hay migración(es) y el PR indica que deben aplicarse antes del código.
- [ ] El código falla cerrado si la migración no está aplicada.

## Riesgos y rollback

<!-- Qué puede romperse y cómo se revierte. -->

## Checklist

- [ ] No se añadieron secretos ni datos personales.
- [ ] Se mantiene RLS y no se ampliaron permisos sin justificación.
- [ ] `pnpm typecheck` pasa.
- [ ] `pnpm build` pasa.
- [ ] Las pruebas nuevas o existentes demuestran el cambio.
- [ ] La documentación afectada está actualizada.
- [ ] Lo pendiente quedó registrado con su motivo.
