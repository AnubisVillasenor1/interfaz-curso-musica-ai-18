# Play & Go — Audio generation stack

This directory contains the **self-hosted, asynchronous MusicGen runtime**. It is deliberately separate from the Next.js/Vercel process: Next.js authenticates users, consumes the existing local-generation quota, creates a database task and submits a small job. The BullMQ worker performs inference orchestration, writes the WAV to private S3-compatible storage, computes a SHA-256 over the actual WAV bytes, and persists completion metadata.

## Flow

`Browser → Next.js /api/generation → Supabase task → gateway-worker → Valkey/BullMQ → MusicGen → private MinIO → Supabase task`

- `POST /api/generation` returns `202` and a task ID.
- `GET /api/generation/:taskId` only returns a row owned by the authenticated user.
- `GET /api/generation/:taskId/audio` rechecks ownership before asking the private gateway for a five-minute pre-signed URL.
- Next.js never loads model weights and never receives MinIO write credentials.
- Only instrumental mode is enabled. MusicGen does not synthesize singing; vocal/hybrid requests are rejected rather than misrepresented.
- Analysis metadata is calculated from generated samples. Chroma is optional and carries an explicit warning when unavailable; it is never fabricated.

## Deploy

1. Apply `supabase/migrations/20261112100000_musicgen_queue.sql` to the intended Supabase project only after confirming the target environment and backup.
2. Copy `.env.example` to `.env` and replace every example value with unique secrets.
3. Start MinIO, then run the one-time bootstrap with `docker compose --profile bootstrap --env-file .env -f docker-compose.yml run --rm minio-bootstrap`. It creates the private bucket and a worker identity scoped only to that bucket. Do not use MinIO root credentials for the worker.
4. Set `AUDIO_QUEUE_GATEWAY_URL` and `GATEWAY_INTERNAL_TOKEN` in the Next.js deployment. The gateway URL must be reachable privately from the web runtime; never expose port 8080 publicly without a private network or authenticated reverse proxy.
5. Build/start with `docker compose --env-file .env -f docker-compose.yml up --build -d` from this directory. For an NVIDIA GPU host with the NVIDIA Container Toolkit installed, include `-f docker-compose.gpu.yml` in the Compose command. CPU may be extremely slow. `S3_PUBLIC_ENDPOINT` must be an HTTPS endpoint that routes to the same MinIO bucket and preserves signed request paths/headers.
6. Verify `/healthz` on the gateway, `/healthz` on MusicGen from the internal network, worker metrics at port 9101 and Prometheus at localhost:9090.
7. Smoke-test using a staging Supabase project and a test account. Confirm queue completion, private object, task owner isolation, signed URL expiry, hash and actual playback before enabling production traffic.

## Important operational limits

- MusicGen weights have separate licensing terms and must be reviewed for the intended use, especially commercial use.
- This stack is not hosted by Vercel. Vercel should host the Next.js UI/API only; a persistent worker and GPU runtime are required elsewhere.
- The gateway requires a pre-created MinIO bucket and a least-privilege S3 identity. It does not create buckets with worker credentials.
- Keep Redis, MinIO API, gateway enqueue endpoint, and MusicGen service on a private network. Prometheus and Grafana are bound to loopback in this compose file.
- The Docker bridge permits outbound model downloads, but internal service ports are not published to the host. For a Vercel-hosted Next.js app, route gateway traffic over a private connector or a TLS reverse proxy with strong token authentication, rate limiting and network restrictions; never publish port 8080 directly without those controls.
- This repository integration does not prove that production secrets, Supabase migrations, DNS, GPU hardware or a Vercel deployment are configured. Those must be verified in the target environment.
