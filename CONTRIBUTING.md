# Contribuir a PLAY & GO

## Estrategia de ramas

- `main` es la rama de producción y está protegida: requiere CI verde y revisión.
- Trabaja en ramas cortas: `fix/...`, `feat/...`, `docs/...`, `chore/...`.
- No reescribas el historial de `main`; los cambios llegan por pull request.
- Un PR debe resolver un problema verificable. Si incluye una migración, indica
  el orden de despliegue.

## Convención de commits

Usamos Conventional Commits en inglés o español, con alcance opcional:

```
fix(rate-limit): restaurar endpoints deterministas sin Redis
feat(callbacks): añadir expiración y nonce de un solo uso
docs(audit): registrar evidencia del 11/11/2026
```

Tipos: `feat`, `fix`, `docs`, `test`, `refactor`, `perf`, `build`, `ci`,
`chore`, `security`.

## Verificación mínima antes de abrir un PR

```bash
pnpm install --frozen-lockfile
pnpm typecheck
node --test scripts/test-rate-limit.mjs
node --test scripts/test-callback-signature.mjs
node --test scripts/test-audio-file-signature.mjs
node scripts/verify-entitlement-lifecycle.mjs
node scripts/verify-callback-security.mjs
node scripts/verify-auth-isolation.mjs
node scripts/verify-exam-security.mjs
node scripts/verify-audio-core.mjs
pnpm build
```

Con el servidor de producción levantado:

```bash
node scripts/smoke-preview.mjs        # 38/38
node scripts/test-rate-limit-http.mjs
curl http://127.0.0.1:3000/api/health
```

No se acepta un cambio sólo porque "compila". Debe existir una prueba que
demuestre el comportamiento corregido.

## Reglas de seguridad

- No commitees secretos, tokens, correos reales ni capturas con datos privados.
- No desactives RLS ni amplíes permisos sin justificar el riesgo en el PR.
- No uses credenciales de producción en Preview ni en pruebas locales.
- Los callbacks y webhooks deben fallar cerrados si falta configuración.

## Migraciones

1. La migración va en `supabase/migrations` con timestamp `YYYYMMDDHHMMSS`.
2. Debe ser aditiva e idempotente cuando sea posible.
3. El código que la usa debe fallar cerrado si no está aplicada.
4. El PR debe indicar el orden: migración primero, despliegue después.
5. Nunca se declara aplicada en producción desde el repositorio.

## Estilo

- TypeScript estricto, sin `any` nuevos.
- Comentarios en español cuando explican una decisión, no lo que el código ya
  dice.
- Componentes de servidor por defecto; `'use client'` sólo cuando haga falta.
- Reutiliza el sistema de diseño existente.

## Revisión

El PR debe incluir:

- problema y causa raíz;
- cambio y archivos afectados;
- evidencia reproducible (comando y resultado);
- riesgos y rollback;
- lo que queda pendiente y por qué.
