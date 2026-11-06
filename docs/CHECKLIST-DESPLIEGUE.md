# Checklist de despliegue — Play and Go / TAMV Online Network

Inventario 2026-11-06 · Vercel: 24 claves · Código: Next 16.4.5 (`main`).

## 🟢 OK — funcionando (valor en Vercel, código lo usa)

- [x] `NEXT_PUBLIC_SUPABASE_URL` — Supabase (auth, BD, storage)
- [x] `NEXT_PUBLIC_SUPABASE_ANON_KEY` — clave pública del navegador
- [x] `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` — alias nuevo de la anon (el código acepta ambas)
- [x] `SUPABASE_SERVICE_ROLE_KEY` — webhook + callbacks (solo servidor)
- [x] `NEXT_PUBLIC_APP_URL` — fijada hoy para checkout/SEO: `https://interfaz-curso-musica-ai.vercel.app`
- [x] `STRIPE_SECRET_KEY` — checkout (cobros)
- [x] `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` — clave pública de Stripe
- [x] `API_KEY` — proveedor musical con voces (Suno, histórico)
- [x] `MUSIC_PROVIDER=suno` — fijado hoy (autodetección: `API_KEY` → Suno)
- [x] `GENERATOR_CALLBACK_SECRET` — fijado hoy (HMAC de callbacks)
- [x] Variables de código leídas: `NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL`, `SUNO_API_URL` (opcional), `HUGGINGFACE_*` (opcional), `OLLAMA_*` (opcional), `JAMENDO_CLIENT_ID` (opcional), `AI_AGENT_BASE_URL`, `AI_AGENT_MODEL`

## 🟡 Extra — en Vercel, el código no las lee (no rompen nada; borrar si se desea)

- [ ] `POSTGRES_URL`, `POSTGRES_URL_NON_POOLING`, `POSTGRES_PRISMA_URL`, `POSTGRES_HOST`, `POSTGRES_DATABASE`, `POSTGRES_USER`, `POSTGRES_PASSWORD` (7) — conexión directa Postgres de la integración Supabase×Vercel. La app solo usa el REST de Supabase (`NEXT_PUBLIC_SUPABASE_URL` + keys).
- [ ] `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY`, `SUPABASE_JWT_SECRET` (5) — mismas del plano de control de Supabase, no leídas por el código.
- [ ] `STRIPE_PUBLISHABLE_KEY` — duplicada de `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` (esta sí se lee).
- [ ] `STRIPE_MCP_KEY` — solo para el agente MCP de Stripe, ninguna ruta la consume.
- [ ] `APP_URL` (solo en `.env.local`) — alias de `NEXT_PUBLIC_APP_URL` en `lib/app-url.ts`; dejar vacío.

> No borré las 12 de la integración Supabase/Stripe automáticamente: suelen recrearse solas al conectar el proyecto y quitarlas ocultaría el vínculo. Bórralas en Settings → Environment Variables si no las usas para nada más.

## 🔴 Falta — el código las necesita, Vercel no las tiene

- [ ] **`STRIPE_WEBHOOK_SECRET`** — sin ella `/api/stripe/webhook` responde 503. Cómo crearla: Stripe Dashboard → Developers → Webhooks → Add endpoint → `https://interfaz-curso-musica-ai.vercel.app/api/stripe/webhook` → eventos `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `customer.subscription.deleted`, `invoice.payment_failed` → pegar el `whsec_…` en Vercel. *No se puede generar desde aquí: requiere tu sesión de Stripe.*
- [ ] **`AI_AGENT_API_KEY`** — sin ella el chat responde con la guía determinista **gratis** (sin factura). Cómo tenerla: OpenAI (`platform.openai.com/api-keys`) u otro proveedor compatible (`AI_AGENT_BASE_URL` + `AI_AGENT_MODEL`). Opcional pero recomendado para IA real.

## Pendiente fuera de variables (ya documentado antes)

- [ ] Aplicar migraciones en Supabase (incluida `20261105190500_exam.sql`).
- [ ] Dominio propio (`visitarealdelmonte.online` → CNAME Vercel).

## Cómo probarlo

```bash
pnpm typecheck && pnpm build   # 0 errores, 41 rutas
curl https://interfaz-curso-musica-ai.vercel.app/        # 200
curl -X POST .../api/music/plan -H 'Content-Type: application/json' -d '{"prompt":"lofi"}'  # 200 con plan
```
