-- TAMV-AudioCore v2.0 · análisis armónico persistente
--
-- Esta migración es aditiva. No crea una tabla `generated_tracks` paralela:
-- la pista canónica sigue siendo `public.songs`, con su RLS, su cuota y su
-- objeto en el bucket privado `song-audio`. Aquí se guarda el resultado del
-- análisis y la cola de trabajos del servicio nativo.
--
-- El audio no se duplica. `audio_analysis_jobs.storage_path` apunta al mismo
-- objeto `<user_id>/<song_id>.audio` que ya protege 20261105190300_storage.sql.
-- El resultado estructurado vive en `result` (jsonb), no en otro bucket.

begin;

-- ─────────────────────────────────────────────
-- songs · metadatos del análisis
-- ─────────────────────────────────────────────
alter table public.songs
  add column if not exists musical_key text,
  add column if not exists analysis jsonb not null default '{}'::jsonb,
  add column if not exists core_version text not null default '2.0.0',
  add column if not exists analyzed_at timestamptz;

do $$
begin
  if not exists (
    select 1 from pg_constraint
     where conname = 'songs_musical_key_length'
       and conrelid = 'public.songs'::regclass
  ) then
    alter table public.songs
      add constraint songs_musical_key_length
      check (musical_key is null or char_length(musical_key) between 1 and 32);
  end if;

  if not exists (
    select 1 from pg_constraint
     where conname = 'songs_analysis_is_object'
       and conrelid = 'public.songs'::regclass
  ) then
    alter table public.songs
      add constraint songs_analysis_is_object
      check (jsonb_typeof(analysis) = 'object');
  end if;

  if not exists (
    select 1 from pg_constraint
     where conname = 'songs_core_version_format'
       and conrelid = 'public.songs'::regclass
  ) then
    alter table public.songs
      add constraint songs_core_version_format
      check (core_version ~ '^[0-9]+\.[0-9]+\.[0-9]+$');
  end if;
end
$$;

comment on column public.songs.musical_key is
  'Tonalidad estimada por TAMV-AudioCore, p. ej. "C major" o "A minor".';
comment on column public.songs.analysis is
  'Resultado estructurado: chroma[12], contraste por bandas, nivel y parámetros DSP.';
comment on column public.songs.core_version is
  'Versión del contrato de análisis que produjo el resultado.';
comment on column public.songs.analyzed_at is
  'Última vez que el análisis se completó; null si nunca se analizó.';

-- ─────────────────────────────────────────────
-- audio_analysis_jobs · cola de análisis externo
-- ─────────────────────────────────────────────
create table if not exists public.audio_analysis_jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  song_id uuid references public.songs (id) on delete cascade,
  status text not null default 'queued'
    check (status in ('queued', 'processing', 'completed', 'failed')),
  -- `numpy` = referencia Python; `native` = extensión C++; `tensorrt` queda
  -- reservado para un perfil GPU que no se ejecuta en Vercel Functions.
  engine text not null default 'numpy'
    check (engine in ('numpy', 'native', 'tensorrt')),
  sample_rate integer not null default 48000
    check (sample_rate between 8000 and 192000),
  -- Potencia de dos: la FFT del núcleo no acepta tamaños arbitrarios.
  fft_size integer not null default 2048
    check (fft_size between 256 and 32768 and (fft_size & (fft_size - 1)) = 0),
  hop_size integer not null default 512
    check (hop_size between 64 and 8192),
  storage_path text,
  result jsonb not null default '{}'::jsonb
    check (jsonb_typeof(result) = 'object'),
  error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists audio_analysis_jobs_user_created_idx
  on public.audio_analysis_jobs (user_id, created_at desc);

create index if not exists audio_analysis_jobs_song_idx
  on public.audio_analysis_jobs (song_id);

create index if not exists audio_analysis_jobs_pending_idx
  on public.audio_analysis_jobs (status, created_at)
  where status in ('queued', 'processing');

drop trigger if exists audio_analysis_jobs_touch_updated_at on public.audio_analysis_jobs;
create trigger audio_analysis_jobs_touch_updated_at
  before update on public.audio_analysis_jobs
  for each row execute function public.touch_updated_at();

-- ─────────────────────────────────────────────
-- RLS · el dueño lee; solo el servidor escribe
-- ─────────────────────────────────────────────
alter table public.audio_analysis_jobs enable row level security;

drop policy if exists "audio_analysis_jobs: el dueño lee sus trabajos" on public.audio_analysis_jobs;
create policy "audio_analysis_jobs: el dueño lee sus trabajos"
  on public.audio_analysis_jobs for select
  to authenticated
  using (user_id = (select auth.uid()));

-- Igual que `entitlements`: no hay INSERT/UPDATE/DELETE para el cliente.
-- Crear o completar un trabajo regala CPU y puede falsear un resultado; lo
-- hace una ruta de servidor con `service_role`.
revoke all privileges on table public.audio_analysis_jobs from public, anon, authenticated;
grant select on table public.audio_analysis_jobs to authenticated;
grant all privileges on table public.audio_analysis_jobs to service_role;

commit;
