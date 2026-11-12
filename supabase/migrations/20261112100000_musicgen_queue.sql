-- Asynchronous MusicGen generation jobs. Audio bytes stay in private object storage.
begin;

create table if not exists public.audio_generation_tasks (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null unique,
  user_id uuid not null references auth.users(id) on delete cascade,
  federation_id text not null default 'FED-01',
  idempotency_key uuid not null,
  prompt text not null check (char_length(prompt) between 3 and 2000),
  mode text not null default 'instrumental' check (mode = 'instrumental'),
  status text not null default 'queued'
    check (status in ('queued', 'processing', 'completed', 'failed', 'cancelled')),
  progress integer not null default 0 check (progress between 0 and 100),
  parameters jsonb not null default '{}'::jsonb check (jsonb_typeof(parameters) = 'object'),
  audio_object_key text,
  audio_bucket text,
  audio_mime_type text,
  byte_size bigint check (byte_size is null or byte_size >= 0),
  duration_seconds numeric(8,3) check (duration_seconds is null or duration_seconds >= 0),
  sample_rate integer check (sample_rate is null or sample_rate between 8000 and 192000),
  content_hash text check (content_hash is null or content_hash ~ '^[a-f0-9]{64}$'),
  spectral_metadata jsonb check (spectral_metadata is null or jsonb_typeof(spectral_metadata) = 'object'),
  error_message text,
  created_at timestamptz not null default now(),
  started_at timestamptz,
  completed_at timestamptz,
  constraint audio_generation_completed_has_object check (
    status <> 'completed' or (audio_object_key is not null and content_hash is not null and byte_size > 0)
  )
);

create unique index if not exists audio_generation_user_idempotency_idx
  on public.audio_generation_tasks (user_id, idempotency_key);
create index if not exists audio_generation_user_created_idx
  on public.audio_generation_tasks (user_id, created_at desc);
create index if not exists audio_generation_queue_idx
  on public.audio_generation_tasks (status, created_at)
  where status in ('queued', 'processing');

alter table public.audio_generation_tasks enable row level security;
drop policy if exists "audio_generation_tasks_select_own" on public.audio_generation_tasks;
create policy "audio_generation_tasks_select_own"
  on public.audio_generation_tasks for select to authenticated
  using (user_id = (select auth.uid()));

revoke all privileges on table public.audio_generation_tasks from public, anon, authenticated;
grant select on table public.audio_generation_tasks to authenticated;
grant all privileges on table public.audio_generation_tasks to service_role;

comment on table public.audio_generation_tasks is
  'Private asynchronous MusicGen jobs. Only service_role may enqueue or update; authenticated users can read their own rows.';
comment on column public.audio_generation_tasks.content_hash is
  'SHA-256 of the final WAV bytes, computed by the worker after generation.';

commit;
