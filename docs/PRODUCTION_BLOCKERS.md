# Production blockers and secret isolation review

**Scope:** read-only review of Vercel environment-variable metadata for project `interfaz-curso-musica-ai`. Secret values were not decrypted or copied into this report.

## Findings

### P0 — Preview, Production and Development share service credentials

The Vercel project currently assigns a number of service variables to multiple targets, including Production and Preview; Supabase/database integration variables are also shared with Development. This means a Preview build may connect to the same backend as production unless the services themselves enforce a separate project/tenant boundary.

**Risk:** functional tests can create or mutate real profiles, progress, songs, entitlements or payment-related records. A checkout or webhook test can have real financial consequences if the configured Stripe key is live.

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

The GitHub workflow `.github/workflows/preview-readiness.yml` runs with intentionally unconfigured service variables. Its API smoke tests expect sensitive routes to fail closed with 503 when their required credentials are absent and verify the local music-planner and course-assistant fallback contracts.

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
