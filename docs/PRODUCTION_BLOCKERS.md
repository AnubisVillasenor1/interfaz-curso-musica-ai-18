# Production blockers and secret isolation review

**Scope:** read-only review of Vercel environment-variable metadata for project `interfaz-curso-musica-ai`. Secret values were not decrypted or copied into this report.

## Findings

### P0 — Preview, Production and Development share service credentials

The Vercel project currently assigns a number of service variables to multiple targets, including Production and Preview; Supabase/database integration variables are also shared with Development. This means a Preview build may connect to the same backend as production unless the services themselves enforce a separate project/tenant boundary.

**Risk:** functional tests can create or mutate real profiles, progress, songs, entitlements or payment-related records. A checkout or webhook test can have real financial consequences if the configured Stripe key is live.

The application code now prevents a Preview deployment from falling back to the configured production origin: it prefers `PREVIEW_APP_URL`, then Vercel's `VERCEL_URL`, and returns an empty origin if neither exists. This makes checkout/callback flows fail closed when Preview origin configuration is missing. It does **not** replace backend credential isolation; shared database/provider credentials must still be scoped separately.

**Required remediation before testing write/payment flows:**

1. Create a separate Supabase staging project and database/storage buckets.
2. Create a Stripe test-mode secret key and a test webhook endpoint.
3. Set Preview-only (and, where supported, branch-specific) values for `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` or `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `GENERATOR_CALLBACK_SECRET`, and `NEXT_PUBLIC_APP_URL`.
4. Ensure the Preview callback and success/cancel URLs use the Preview origin, never the production domain.
5. Keep production variables scoped to Production; never use a production service-role key in Preview.
6. Redeploy Preview after changing variables. Public `NEXT_PUBLIC_*` variables are embedded at build time.

Until staging is configured, use the Preview for visual and navigation review only. Do not perform writes, real checkout, webhook replay or provider generation tests against the shared backend.

### P0 — Vercel flags several secret variables as `readable-secret`

Vercel environment metadata marks multiple encrypted variables as having the `readable-secret` security issue. The metadata review did not decrypt or disclose their values.

**Required remediation:**

- In Vercel, review the affected variables' visibility and access permissions; prefer sensitive/hidden values where supported.
- Audit project/team access and build-log exposure.
- Rotate credentials flagged by the platform, prioritizing database service-role/password/JWT secrets, Stripe secret/webhook keys, provider API keys and callback signing secrets. Rotation must be coordinated with the corresponding service and redeploys; do not rotate only one side of a webhook/signature pair.
- Confirm that no credential was committed to Git, printed by CI, returned by an API or embedded in a client bundle.
- Re-check Vercel's security findings after remediation.

This report intentionally does not attempt automatic secret rotation: changing a service key without updating the connected provider or database can break production or lock out the application.

### P1 — External services must be verified independently

Environment-variable presence does not prove that a database schema, RLS policies, storage bucket, Stripe webhook or generation callback is configured correctly.

Required staging checks:
- Apply migrations in order to the staging database.
- Test RLS with two different users and verify that one cannot read or mutate the other's records.
- Verify Storage policies and signed URL expiry.
- Verify Stripe test-mode checkout, signature verification, duplicate-event idempotency and entitlement delivery.
- Verify callback HMAC rejection for missing/invalid signatures.
- Verify provider timeouts, failure handling and quota refunds.
- Confirm that unconfigured providers return explicit errors rather than fake success.

## Automated validation

The GitHub workflow `.github/workflows/ci.yml` runs with intentionally unconfigured service variables. Its API smoke tests expect sensitive routes to fail closed with 503 when their required credentials are absent and verify the local music-planner and course-assistant fallback contracts.

A passing workflow validates build and basic HTTP/API contracts only. It does not certify Supabase, RLS, payment processing, provider accounts or production security.

## Release gate

Do not merge or promote to production until:
- [ ] Preview is isolated from production data and credentials.
- [ ] Vercel readable-secret findings are reviewed and remediated.
- [ ] Required secrets are rotated safely where needed.
- [ ] Staging migrations and RLS checks pass.
- [ ] Stripe test checkout/webhook checks pass.
- [ ] UI, accessibility, mobile and API checks pass on the latest commit.
- [ ] A reviewer approves the evidence attached to the PR.


### P0 — Entitlement lifecycle and historical billing reconciliation

The additional migration 20261107190000_entitlement_lifecycle.sql separates course ownership, timed extensions, and Pro subscriptions. It adds expiration-aware quotas and subscription-update handling; it does not read or mutate the live database by itself.

The older fulfillment code could overwrite a permanent course plan with Pro or an extension, and the older quota function did not enforce extension expiry. Rows whose original rights cannot be derived from the current row are marked entitlement_reconciliation_required. Extension rows with no recoverable expiry receive a provisional 30-day window. Historical Pro rows and ambiguous extension rows must be compared to Stripe purchase/subscription records before this migration is applied to production.

Required order:
1. Apply in staging and inspect the marked rows.
2. Reconcile each row using verified Stripe evidence. An extension alone is not evidence of a permanent course purchase.
3. Run the scenarios in docs/ENTITLEMENT_LIFECYCLE.md, including an old subscription deletion arriving after a newer subscription is active.
4. Apply to production only after the reconciliation query returns no unresolved rows, or document an explicit, reviewed exception for every remaining row.

The GitHub workflow includes source-contract checks, but those checks do not replace execution against staging Postgres and Stripe test mode.


### P1 — Evaluación técnica asistida por IA y evidencia académica

El nuevo trayecto de laboratorio dispone de dos exámenes de 20 reactivos corregidos en servidor y una ruta opcional de retroalimentación con IA. La evaluación asistida exige una sesión autenticada, SUPABASE configurado y AI_AGENT_API_KEY; limita el cuerpo textual y el número de intentos por usuario en cada instancia. El limitador en memoria no es global ni un control de gasto distribuido, así que deben configurarse límites de gasto en el proveedor.

La ruta de IA recibe únicamente un resumen de texto. No escucha archivos, no ejecuta código y no verifica licencias. La respuesta tiene una puntuación ponderada provisional; el frontend y la documentación advierten que el dictamen final exige revisión humana. Si el proveedor devuelve una estructura no válida, la ruta no crea una calificación y responde con error.

Los exámenes técnicos guardan intentos en la tabla existente solo cuando la sesión y la base están disponibles. La ausencia de registro se informa al usuario; el examen complementario no emite certificados ni grado académico. Para validación real en staging, prueba auth, intentos duplicados y aislamiento de usuario con datos de prueba; no uses credenciales de producción para verificar entregas.


### P1 — El examen permitía manipular intentos y exponía la tabla de constancias

La migración histórica 20261105190500_exam.sql definía exam_attempts_owner como FOR ALL. Un usuario autenticado podía insertar, modificar o borrar su propio intento desde la API REST de Supabase, incluyendo los campos score y passed. También definía certificates_verify_public con USING (true), lo que habilitaba la lectura pública directa de filas de constancias. La ruta de verificación pública ya usa createAdminClient() y devuelve una proyección limitada, por lo que ese permiso general no era necesario.

El endpoint del examen guardaba tanto el intento como la constancia usando el cliente de sesión. La política de la tabla de constancias solo concedía SELECT al dueño; el INSERT podía fallar después de guardar el examen.

**Corrección en fix/exam-rls-certificate-hardening:**
- La sesión autentica al estudiante; el ID del usuario siempre procede de auth.getUser(), no del cuerpo.
- El backend valida IDs de pregunta e índices de opción contra EXAM_QUESTIONS y calcula la nota con la clave privada del servidor.
- Los INSERT de exam_attempts y certificates se realizan con el cliente administrativo solo desde la ruta Node.js.
- La migración nueva 20261108190000_exam_security_hardening.sql sustituye el permiso FOR ALL por SELECT del propietario, elimina la lectura pública directa de la tabla de constancias y reserva las escrituras a service_role.
- scripts/verify-exam-security.mjs se integra a CI para comprobar estos contratos estáticos.

**Validación aún necesaria:** aplicar la migración en staging, verificar las operaciones con dos usuarios, comprobar que REST no permite insertar ni alterar intentos como usuario normal, confirmar que el endpoint público verifica un código sin exponer la tabla y realizar una prueba negativa con un código inexistente. Esta migración no está declarada aplicada en producción por este cambio de Git.


### P0 — La marca de conciliación de derechos no bloquea el estado efectivo

El campo entitlement_reconciliation_required documenta filas que necesitan contraste con Stripe, pero la derivación de acceso en sync_entitlement_effective_state, consume_generation_quota y read_entitlement no consulta ese campo. Una fila marcada puede seguir activando Pro si subscription_id, subscription_status y current_period_end satisfacen la condición de vigencia. Esto evita tratar la marca como una protección técnica automática.

La puerta de liberación es operativa: no aplicar la migración 20261107190000_entitlement_lifecycle.sql a producción mientras existan filas ambiguas sin reconciliar y revisar. Consultar docs/ENTITLEMENT_LIFECYCLE.md, contrastar cada cuenta con Checkout/Subscriptions en Stripe y limpiar la marca solo después de verificar los tres derechos independientes. No modificar a ciegas las cuotas ni revocar acceso de clientes históricos.
