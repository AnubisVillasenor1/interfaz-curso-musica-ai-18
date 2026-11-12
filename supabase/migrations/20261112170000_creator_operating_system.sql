begin;

create extension if not exists pgcrypto;

alter table public.entitlements
  add column if not exists base_plan text not null default 'free',
  add column if not exists extension_expires_at timestamptz,
  add column if not exists subscription_status text,
  add column if not exists entitlement_reconciliation_required boolean not null default false;

alter table public.pending_fulfilments
  add column if not exists stripe_customer_id text,
  add column if not exists subscription_id text,
  add column if not exists subscription_status text,
  add column if not exists current_period_end timestamptz;

alter table public.lesson_progress
  add column if not exists is_completed boolean not null default true,
  add column if not exists checkpoint jsonb not null default '{}'::jsonb;

update public.entitlements
   set base_plan = 'enrolled'
 where plan = 'enrolled' and base_plan = 'free';
update public.entitlements
   set extension_expires_at = access_expires_at
 where plan = 'extension' and access_expires_at is not null and extension_expires_at is null;
update public.entitlements
   set entitlement_reconciliation_required = true
 where plan = 'pro' and (subscription_id is null or subscription_status is null or current_period_end is null);

alter table public.songs
  add column if not exists musical_key text,
  add column if not exists analysis jsonb not null default '{}'::jsonb,
  add column if not exists core_version text not null default '2.0.0',
  add column if not exists analyzed_at timestamptz;

create table if not exists public.audio_assets (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  storage_provider text not null default 's3',
  bucket text not null,
  object_key text not null,
  mime_type text not null,
  byte_size bigint not null check (byte_size > 0),
  duration_seconds real not null check (duration_seconds > 0),
  sample_rate integer not null check (sample_rate between 8000 and 192000),
  channels integer not null check (channels between 1 and 8),
  sha256 text not null check (sha256 ~ '^[a-f0-9]{64}$'),
  is_public boolean not null default false,
  created_at timestamptz not null default now(),
  unique(bucket,object_key),
  unique(task_id)
);
create index if not exists audio_assets_user_created_idx on public.audio_assets(user_id,created_at desc);

create table if not exists public.spectral_analyses (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null unique,
  user_id uuid not null references auth.users(id) on delete cascade,
  audio_asset_id uuid not null references public.audio_assets(id) on delete cascade,
  sample_rate integer not null,
  duration_seconds real not null,
  cqt_computed boolean not null default false,
  cqt_bins integer,
  cqt_frames integer,
  chroma jsonb not null check (jsonb_typeof(chroma) = 'array'),
  true_peak_db real not null,
  rms_db real not null,
  lufs_integrated real,
  analyzer_version text not null,
  analyzer_engine text not null,
  created_at timestamptz not null default now()
);
create index if not exists spectral_analyses_user_created_idx on public.spectral_analyses(user_id,created_at desc);

create table if not exists public.audio_generation_tasks (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null unique,
  user_id uuid not null references auth.users(id) on delete cascade,
  federation_id text not null default 'FED-01',
  idempotency_key uuid not null,
  prompt text not null check (char_length(prompt) between 3 and 2000),
  mode text not null default 'instrumental' check (mode = 'instrumental'),
  status text not null default 'queued' check (status in ('queued','processing','completed','failed','cancelled')),
  progress integer not null default 0 check (progress between 0 and 100),
  parameters jsonb not null default '{}'::jsonb check (jsonb_typeof(parameters) = 'object'),
  audio_object_key text,
  audio_bucket text,
  audio_asset_id uuid references public.audio_assets(id),
  spectral_analysis_id uuid references public.spectral_analyses(id),
  audio_mime_type text,
  byte_size bigint check (byte_size is null or byte_size >= 0),
  duration_seconds numeric(8,3) check (duration_seconds is null or duration_seconds >= 0),
  sample_rate integer check (sample_rate is null or sample_rate between 8000 and 192000),
  content_hash text check (content_hash is null or content_hash ~ '^[a-f0-9]{64}$'),
  spectral_metadata jsonb check (spectral_metadata is null or jsonb_typeof(spectral_metadata) = 'object'),
  error_message text,
  quota_refunded boolean not null default false,
  created_at timestamptz not null default now(),
  started_at timestamptz,
  completed_at timestamptz,
  constraint audio_generation_completed_has_object check (
    status <> 'completed' or (audio_object_key is not null and content_hash is not null and byte_size > 0)
  )
);
create unique index if not exists audio_generation_user_idempotency_idx on public.audio_generation_tasks(user_id,idempotency_key);
create index if not exists audio_generation_user_created_idx on public.audio_generation_tasks(user_id,created_at desc);
create index if not exists audio_generation_queue_idx on public.audio_generation_tasks(status,created_at) where status in ('queued','processing');
alter table public.audio_generation_tasks enable row level security;
drop policy if exists audio_generation_tasks_select_own on public.audio_generation_tasks;
create policy audio_generation_tasks_select_own on public.audio_generation_tasks for select to authenticated using (user_id = (select auth.uid()));
revoke all privileges on table public.audio_generation_tasks from public, anon, authenticated;
grant select on table public.audio_generation_tasks to authenticated;
grant all privileges on table public.audio_generation_tasks to service_role;

create or replace function public.refund_audio_generation_quota(p_task_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $fn$
declare
  v_user_id uuid;
  v_created_at timestamptz;
  v_refunded boolean;
begin
  select user_id, created_at, quota_refunded into v_user_id, v_created_at, v_refunded
    from public.audio_generation_tasks where task_id = p_task_id for update;
  if not found or v_refunded then return false; end if;
  update public.entitlements
     set local_used_today = case
       when reset_date = (v_created_at at time zone 'utc')::date then greatest(local_used_today - 1, 0)
       else local_used_today
     end
   where user_id = v_user_id;
  update public.audio_generation_tasks set quota_refunded = true where task_id = p_task_id;
  return true;
end;
$fn$;
revoke all on function public.refund_audio_generation_quota(uuid) from public, anon, authenticated;
grant execute on function public.refund_audio_generation_quota(uuid) to service_role;

create table if not exists public.audio_analysis_jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  song_id uuid references public.songs(id) on delete cascade,
  status text not null default 'queued' check (status in ('queued','processing','completed','failed')),
  engine text not null default 'numpy' check (engine in ('numpy','native','tensorrt')),
  sample_rate integer not null default 48000 check (sample_rate between 8000 and 192000),
  fft_size integer not null default 2048 check (fft_size between 256 and 32768 and (fft_size & (fft_size - 1)) = 0),
  hop_size integer not null default 512 check (hop_size between 64 and 8192),
  storage_path text,
  result jsonb not null default '{}'::jsonb check (jsonb_typeof(result) = 'object'),
  error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists audio_analysis_jobs_user_created_idx on public.audio_analysis_jobs(user_id,created_at desc);
create index if not exists audio_analysis_jobs_pending_idx on public.audio_analysis_jobs(status,created_at) where status in ('queued','processing');
alter table public.audio_analysis_jobs enable row level security;
drop policy if exists audio_analysis_jobs_select_own on public.audio_analysis_jobs;
create policy audio_analysis_jobs_select_own on public.audio_analysis_jobs for select to authenticated using (user_id = (select auth.uid()));
revoke all privileges on table public.audio_analysis_jobs from public, anon, authenticated;
grant select on table public.audio_analysis_jobs to authenticated;
grant all privileges on table public.audio_analysis_jobs to service_role;

create table if not exists public.exam_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  score integer not null check (score between 0 and 100),
  passed boolean not null,
  answers jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create table if not exists public.certificates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  code text not null unique,
  exam_attempt_id uuid references public.exam_attempts(id) on delete set null,
  issued_at timestamptz not null default now()
);
alter table public.exam_attempts enable row level security;
alter table public.certificates enable row level security;
do $exam_policies$
declare v_policy record;
begin
  for v_policy in select schemaname,tablename,policyname from pg_catalog.pg_policies
    where schemaname='public' and tablename in ('exam_attempts','certificates')
  loop
    execute format('drop policy %I on %I.%I',v_policy.policyname,v_policy.schemaname,v_policy.tablename);
  end loop;
end;
$exam_policies$;
create policy exam_attempts_owner_read on public.exam_attempts for select to authenticated using (user_id = (select auth.uid()));
create policy certificates_owner_read on public.certificates for select to authenticated using (user_id = (select auth.uid()));
revoke all privileges on table public.exam_attempts from public, anon, authenticated;
revoke all privileges on table public.certificates from public, anon, authenticated;
grant select on table public.exam_attempts to authenticated;
grant select on table public.certificates to authenticated;
grant all privileges on table public.exam_attempts to service_role;
grant all privileges on table public.certificates to service_role;

create table if not exists public.creator_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  federation_id text not null default 'FED-01',
  stage text not null default 'explorer' check (stage in ('explorer','developing','launching','professional')),
  primary_goal text,
  genre text,
  skills jsonb not null default '[]'::jsonb check (jsonb_typeof(skills) = 'array'),
  available_hours_per_week integer check (available_hours_per_week between 1 and 80),
  budget_level text check (budget_level is null or budget_level in ('none','low','medium','high')),
  audience_size integer not null default 0 check (audience_size >= 0),
  monetization_interest jsonb not null default '[]'::jsonb check (jsonb_typeof(monetization_interest) = 'array'),
  onboarding_goal text,
  experience_level text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.growth_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  creator_profile_id uuid not null references public.creator_profiles(id) on delete cascade,
  horizon_days integer not null check (horizon_days in (30,60,90)),
  focus_area text not null,
  status text not null default 'active' check (status in ('active','completed','archived')),
  plan jsonb not null check (jsonb_typeof(plan) = 'object'),
  ai_summary text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists growth_plans_user_created_idx on public.growth_plans(user_id,created_at desc);
create table if not exists public.monetization_opportunities (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  creator_profile_id uuid not null references public.creator_profiles(id) on delete cascade,
  category text not null,
  title text not null,
  description text not null,
  difficulty text not null check (difficulty in ('low','medium','high')),
  time_to_first_result text,
  required_assets jsonb not null default '[]'::jsonb,
  recommended_actions jsonb not null default '[]'::jsonb,
  fit_score real not null default 0 check (fit_score between 0 and 1),
  status text not null default 'suggested' check (status in ('suggested','in_progress','completed','dismissed')),
  created_at timestamptz not null default now()
);
create index if not exists monetization_user_created_idx on public.monetization_opportunities(user_id,created_at desc);
create table if not exists public.growth_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  growth_plan_id uuid references public.growth_plans(id) on delete cascade,
  action_id text not null,
  event_type text not null check (event_type in ('started','completed','skipped','note')),
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists growth_events_user_created_idx on public.growth_events(user_id,created_at desc);
create table if not exists public.release_checklists (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  project_id uuid,
  title text not null,
  release_date timestamptz,
  items jsonb not null default '[]'::jsonb,
  completion_percentage integer not null default 0 check (completion_percentage between 0 and 100),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.voice_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  federation_id text not null default 'FED-01',
  name text not null check (char_length(name) between 1 and 80),
  description text,
  language text not null default 'es-MX',
  base_voice_id text not null,
  characteristics jsonb not null default '{}'::jsonb,
  is_consented boolean not null default false,
  consent_version text,
  consented_at timestamptz,
  status text not null default 'pending_sample' check (status in ('pending_sample','pending_review','active','revoked')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id,name)
);
create table if not exists public.voice_samples (
  id uuid primary key default gen_random_uuid(),
  voice_profile_id uuid not null references public.voice_profiles(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  storage_provider text not null default 's3',
  bucket text not null,
  object_key text not null,
  duration_seconds real not null check (duration_seconds between 20 and 60),
  sample_rate integer not null check (sample_rate between 8000 and 192000),
  mime_type text not null check (mime_type in ('audio/wav','audio/x-wav')),
  sha256 text not null check (sha256 ~ '^[a-f0-9]{64}$'),
  quality_score real check (quality_score is null or quality_score between 0 and 1),
  rms_db real,
  true_peak_db real,
  is_approved boolean not null default false,
  created_at timestamptz not null default now(),
  unique(bucket,object_key)
);
create table if not exists public.voice_generations (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null unique,
  voice_profile_id uuid not null references public.voice_profiles(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  federation_id text not null default 'FED-01',
  text text not null check (char_length(text) between 1 and 4000),
  language text not null default 'es-MX',
  parameters jsonb not null default '{}'::jsonb,
  idempotency_key uuid not null,
  status text not null default 'queued' check (status in ('queued','processing','completed','failed','cancelled')),
  progress integer not null default 0 check (progress between 0 and 100),
  audio_bucket text,
  audio_object_key text,
  audio_mime_type text,
  byte_size bigint,
  content_hash text,
  error_message text,
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  unique(user_id,idempotency_key)
);
create table if not exists public.voice_consents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  voice_profile_id uuid not null references public.voice_profiles(id) on delete cascade,
  consent_type text not null,
  consent_text text not null,
  consent_version text not null,
  accepted_at timestamptz not null default now()
);

create table if not exists public.agent_skills (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  category text not null,
  description text not null,
  trigger_intent jsonb not null default '[]'::jsonb,
  required_context jsonb not null default '[]'::jsonb,
  output_format text not null default 'text',
  risk_level text not null default 'low' check (risk_level in ('low','medium','high','critical')),
  requires_approval boolean not null default false,
  system_prompt text not null,
  guardrails jsonb not null default '[]'::jsonb,
  is_active boolean not null default true,
  version text not null default '1.0.0',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.agent_skill_runs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  skill_slug text not null references public.agent_skills(slug),
  input jsonb not null,
  output jsonb,
  status text not null default 'completed' check (status in ('running','completed','failed')),
  confidence_score real check (confidence_score is null or confidence_score between 0 and 1),
  latency_ms integer,
  tokens_used integer,
  error_message text,
  created_at timestamptz not null default now()
);
create index if not exists agent_skill_runs_user_created_idx on public.agent_skill_runs(user_id,created_at desc);
create table if not exists public.agent_skill_feedback (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.agent_skill_runs(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  rating integer not null check (rating between 1 and 5),
  was_helpful boolean not null,
  comment text check (comment is null or char_length(comment) <= 1000),
  created_at timestamptz not null default now()
);

create table if not exists public.audit_events (
  sequence bigserial primary key,
  id uuid not null unique default gen_random_uuid(),
  actor_user_id uuid references auth.users(id) on delete set null,
  event_type text not null,
  payload jsonb not null default '{}'::jsonb,
  previous_hash text not null default '',
  event_hash text not null check (event_hash ~ '^[a-f0-9]{64}$'),
  created_at timestamptz not null default now()
);

create table if not exists public.stripe_session_grants (
  stripe_session_id text primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  product_id text not null,
  granted_at timestamptz not null default now()
);
create index if not exists stripe_session_grants_user_idx on public.stripe_session_grants(user_id,granted_at desc);

create table if not exists public.generation_callback_tickets (
  nonce text primary key,
  song_id uuid not null references public.songs(id) on delete cascade,
  expires_at timestamptz not null,
  consumed_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists generation_callback_tickets_expiry_idx on public.generation_callback_tickets(expires_at);

-- Private Supabase Storage bucket used by the existing song-library path.
insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
values ('song-audio','song-audio',false,26214400,array['audio/mpeg','audio/wav','audio/ogg','audio/mp4','audio/x-wav'])
on conflict (id) do nothing;
do $storage_policies$
declare v_policy record;
begin
  for v_policy in select policyname from pg_catalog.pg_policies
    where schemaname='storage' and tablename='objects'
      and (coalesce(qual,'') || coalesce(with_check,'')) ilike '%song-audio%'
  loop
    execute format('drop policy %I on storage.objects',v_policy.policyname);
  end loop;
end;
$storage_policies$;
create policy song_audio_owner_insert on storage.objects for insert to authenticated with check (bucket_id='song-audio' and (storage.foldername(name))[1]=(select auth.uid()::text));
create policy song_audio_owner_select on storage.objects for select to authenticated using (bucket_id='song-audio' and (storage.foldername(name))[1]=(select auth.uid()::text));
create policy song_audio_owner_update on storage.objects for update to authenticated using (bucket_id='song-audio' and (storage.foldername(name))[1]=(select auth.uid()::text)) with check (bucket_id='song-audio' and (storage.foldername(name))[1]=(select auth.uid()::text));
create policy song_audio_owner_delete on storage.objects for delete to authenticated using (bucket_id='song-audio' and (storage.foldername(name))[1]=(select auth.uid()::text));

-- Owner-only reads; all writes go through authenticated route handlers/service_role.
do $policies$
declare
  v_table text;
  v_policy text;
begin
  foreach v_table in array array['creator_profiles','growth_plans','monetization_opportunities','growth_events','release_checklists','voice_profiles','voice_samples','voice_generations','voice_consents','agent_skill_runs','agent_skill_feedback','audio_assets','spectral_analyses'] loop
    execute format('alter table public.%I enable row level security', v_table);
    v_policy := v_table || '_select_own';
    execute format('drop policy if exists %I on public.%I', v_policy, v_table);
    execute format('create policy %I on public.%I for select to authenticated using (user_id = (select auth.uid()))', v_policy, v_table);
    execute format('revoke all privileges on table public.%I from public, anon, authenticated', v_table);
    execute format('grant select on table public.%I to authenticated', v_table);
    execute format('grant all privileges on table public.%I to service_role', v_table);
  end loop;
end;
$policies$;

alter table public.agent_skills enable row level security;
drop policy if exists agent_skills_read_active on public.agent_skills;
create policy agent_skills_read_active on public.agent_skills for select to authenticated using (is_active);
revoke all privileges on table public.agent_skills from public, anon, authenticated;
grant select on table public.agent_skills to authenticated;
grant all privileges on table public.agent_skills to service_role;

alter table public.audit_events enable row level security;
revoke all privileges on table public.audit_events from public, anon, authenticated;
grant all privileges on table public.audit_events to service_role;
alter table public.stripe_session_grants enable row level security;
revoke all privileges on table public.stripe_session_grants from public, anon, authenticated;
grant select, insert on table public.stripe_session_grants to service_role;
alter table public.generation_callback_tickets enable row level security;
revoke all privileges on table public.generation_callback_tickets from public, anon, authenticated;
grant select, insert, update on table public.generation_callback_tickets to service_role;

create or replace function public.sha256_hex(p_value text)
returns text
language plpgsql
security definer
set search_path = ''
as $fn$
declare v_hash text;
begin
  if pg_catalog.to_regprocedure('extensions.digest(bytea,text)') is not null then
    execute 'select pg_catalog.encode(extensions.digest($1, ''sha256''), ''hex'')' into v_hash using pg_catalog.convert_to(p_value,'UTF8');
  else
    execute 'select pg_catalog.encode(public.digest($1, ''sha256''), ''hex'')' into v_hash using pg_catalog.convert_to(p_value,'UTF8');
  end if;
  return v_hash;
end;
$fn$;
revoke all on function public.sha256_hex(text) from public, anon, authenticated;
grant execute on function public.sha256_hex(text) to service_role;

create or replace function public.append_audit_event(p_actor_user_id uuid,p_event_type text,p_payload jsonb)
returns uuid
language plpgsql
security definer
set search_path = ''
as $fn$
declare
  v_previous text := '';
  v_hash text;
  v_id uuid := gen_random_uuid();
  v_created_at timestamptz := now();
  v_canonical jsonb;
begin
  if p_event_type is null or char_length(p_event_type) not between 1 and 120 or jsonb_typeof(p_payload) <> 'object' then
    raise exception 'invalid audit event' using errcode='22023';
  end if;
  perform pg_catalog.pg_advisory_xact_lock(731902);
  select event_hash into v_previous from public.audit_events order by sequence desc limit 1;
  v_previous := coalesce(v_previous,'');
  v_canonical := jsonb_build_object('id',v_id,'actorUserId',p_actor_user_id,'eventType',p_event_type,'payload',p_payload,'previousHash',v_previous,'createdAt',v_created_at);
  v_hash := public.sha256_hex(v_canonical::text);
  insert into public.audit_events(id,actor_user_id,event_type,payload,previous_hash,event_hash,created_at)
  values (v_id,p_actor_user_id,p_event_type,p_payload,v_previous,v_hash,v_created_at);
  return v_id;
end;
$fn$;
revoke all on function public.append_audit_event(uuid,text,jsonb) from public, anon, authenticated;
grant execute on function public.append_audit_event(uuid,text,jsonb) to service_role;

create or replace function public.sync_entitlement_effective_state(p_owner uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $fn$
declare
  e public.entitlements%rowtype;
  v_pro boolean;
  v_course boolean;
  v_extension boolean;
  v_plan text;
begin
  if p_owner is null then return; end if;
  select * into e from public.entitlements where user_id=p_owner for update;
  if not found then return; end if;
  v_pro := coalesce(not e.entitlement_reconciliation_required and e.subscription_id is not null and e.subscription_status in ('active','trialing','past_due') and e.current_period_end is not null and e.current_period_end>now(),false);
  v_course := e.base_plan='enrolled';
  v_extension := coalesce(not e.entitlement_reconciliation_required and e.extension_expires_at is not null and e.extension_expires_at>now(),false);
  v_plan := case when v_pro then 'pro' when v_course then 'enrolled' when v_extension then 'extension' else 'free' end;
  update public.entitlements set plan=v_plan, active=(v_pro or v_course or v_extension),
    daily_limit=case when v_pro then 20 when v_course and v_extension then 10 when v_course then 2 when v_extension then 10 else 0 end,
    local_daily_limit=case when v_pro then 100 when v_course and v_extension then 40 when v_course then 20 when v_extension then 40 else 10 end,
    access_expires_at=case when v_plan='extension' then e.extension_expires_at else null end
  where user_id=p_owner;
end;
$fn$;
revoke all on function public.sync_entitlement_effective_state(uuid) from public,anon,authenticated;
grant execute on function public.sync_entitlement_effective_state(uuid) to service_role;

create or replace function public.grant_product_entitlement(
  p_user_id uuid,p_product_id text,p_session_id text,p_customer_id text default null,
  p_subscription_id text default null,p_subscription_status text default null,
  p_current_period_end timestamptz default null,p_extension_days integer default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $fn$
declare
  e public.entitlements%rowtype;
  v_rows integer;
  v_extension timestamptz;
  v_base text;
begin
  if p_user_id is null or p_session_id is null or btrim(p_session_id)='' then raise exception 'invalid checkout grant'; end if;
  if p_product_id not in ('play-and-go-course','play-and-go-extension','play-and-go-pro') then raise exception 'unknown product'; end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('entitlement:'||p_user_id::text,0));
  insert into public.entitlements(user_id) values(p_user_id) on conflict(user_id) do nothing;
  select * into e from public.entitlements where user_id=p_user_id for update;
  insert into public.stripe_session_grants(stripe_session_id,user_id,product_id) values(p_session_id,p_user_id,p_product_id) on conflict(stripe_session_id) do nothing;
  get diagnostics v_rows = row_count;
  if v_rows=0 then return jsonb_build_object('status','duplicate','user_id',p_user_id,'plan',e.plan,'active',e.active); end if;
  v_base := coalesce(e.base_plan,case when e.plan='enrolled' then 'enrolled' else 'free' end);
  v_extension := coalesce(e.extension_expires_at,e.access_expires_at);
  if p_product_id='play-and-go-course' then
    v_base := 'enrolled';
  elsif p_product_id='play-and-go-extension' then
    if p_extension_days is null or p_extension_days<=0 then raise exception 'invalid extension duration'; end if;
    v_extension := greatest(coalesce(v_extension,now()),now())+make_interval(days=>p_extension_days);
  elsif p_subscription_id is null or p_subscription_status not in ('active','trialing','past_due') or p_current_period_end is null or p_current_period_end<=now() then
    raise exception 'subscription is not verified';
  end if;
  update public.entitlements set base_plan=v_base,extension_expires_at=v_extension,
    subscription_id=case when p_product_id='play-and-go-pro' then p_subscription_id else subscription_id end,
    subscription_status=case when p_product_id='play-and-go-pro' then p_subscription_status else subscription_status end,
    current_period_end=case when p_product_id='play-and-go-pro' then p_current_period_end else current_period_end end,
    stripe_customer_id=coalesce(p_customer_id,stripe_customer_id),last_stripe_session_id=p_session_id,
    entitlement_reconciliation_required=case when p_product_id='play-and-go-pro' then false else entitlement_reconciliation_required end
  where user_id=p_user_id;
  perform public.sync_entitlement_effective_state(p_user_id);
  select * into e from public.entitlements where user_id=p_user_id;
  return jsonb_build_object('status','granted','user_id',p_user_id,'plan',e.plan,'active',e.active,'base_plan',e.base_plan,'extension_expires_at',e.extension_expires_at,'subscription_id',e.subscription_id);
end;
$fn$;
revoke all on function public.grant_product_entitlement(uuid,text,text,text,text,text,timestamptz,integer) from public,anon,authenticated;
grant execute on function public.grant_product_entitlement(uuid,text,text,text,text,text,timestamptz,integer) to service_role;

create or replace function public.read_entitlement()
returns jsonb
language plpgsql
security definer
stable
set search_path = ''
as $fn$
declare
  uid uuid := (select auth.uid());
  result jsonb;
  today date := (now() at time zone 'utc')::date;
begin
  if uid is null then return null; end if;
  select jsonb_build_object(
    'plan',case when e.entitlement_reconciliation_required then 'free' when e.subscription_id is not null and e.subscription_status in ('active','trialing','past_due') and e.current_period_end>now() then 'pro' when e.base_plan='enrolled' then 'enrolled' when e.extension_expires_at>now() then 'extension' else 'free' end,
    'active',not e.entitlement_reconciliation_required and ((e.subscription_id is not null and e.subscription_status in ('active','trialing','past_due') and e.current_period_end>now()) or e.base_plan='enrolled' or e.extension_expires_at>now()),
    'daily_limit',case when e.entitlement_reconciliation_required then 0 when e.subscription_id is not null and e.subscription_status in ('active','trialing','past_due') and e.current_period_end>now() then 20 when e.base_plan='enrolled' and e.extension_expires_at>now() then 10 when e.base_plan='enrolled' then 2 when e.extension_expires_at>now() then 10 else 0 end,
    'used_today',case when e.reset_date=today then e.used_today else 0 end,
    'local_daily_limit',case when not e.entitlement_reconciliation_required and e.subscription_id is not null and e.subscription_status in ('active','trialing','past_due') and e.current_period_end>now() then 100 when e.base_plan='enrolled' and e.extension_expires_at>now() then 40 when e.base_plan='enrolled' then 20 when e.extension_expires_at>now() then 40 else 10 end,
    'local_used_today',case when e.reset_date=today then e.local_used_today else 0 end,
    'reset_date',e.reset_date,'current_period_end',e.current_period_end,'extension_expires_at',e.extension_expires_at,
    'entitlement_reconciliation_required',e.entitlement_reconciliation_required,'role',p.role,'display_name',p.display_name,
    'songs_total',(select count(*) from public.songs s where s.user_id=uid),
    'songs_ready',(select count(*) from public.songs s where s.user_id=uid and s.status='ready'),
    'lessons_done',(select count(*) from public.lesson_progress lp where lp.user_id=uid and lp.is_completed)
  ) into result from public.entitlements e join public.profiles p on p.id=e.user_id where e.user_id=uid;
  return result;
end;
$fn$;
revoke all on function public.read_entitlement() from public,anon;
grant execute on function public.read_entitlement() to authenticated;

create or replace function public.resolve_pending_fulfilments(p_user_id uuid,p_email text)
returns integer
language plpgsql
security definer
set search_path = ''
as $fn$
declare
  rec record;
  applied integer := 0;
begin
  if p_user_id is null or p_email is null then return 0; end if;
  insert into public.entitlements(user_id) values(p_user_id) on conflict(user_id) do nothing;
  for rec in select id,stripe_session_id,product_id,stripe_customer_id,subscription_id,subscription_status,current_period_end,created_at
    from public.pending_fulfilments where lower(email)=lower(p_email) and resolved_at is null order by created_at for update
  loop
    if rec.product_id='play-and-go-course' then
      update public.entitlements set base_plan='enrolled',last_stripe_session_id=rec.stripe_session_id,stripe_customer_id=coalesce(rec.stripe_customer_id,stripe_customer_id) where user_id=p_user_id;
    elsif rec.product_id='play-and-go-extension' then
      update public.entitlements set extension_expires_at=greatest(coalesce(extension_expires_at,rec.created_at),rec.created_at)+interval '30 days',last_stripe_session_id=rec.stripe_session_id,stripe_customer_id=coalesce(rec.stripe_customer_id,stripe_customer_id) where user_id=p_user_id;
    elsif rec.product_id='play-and-go-pro' then
      if rec.subscription_id is null or rec.subscription_status not in ('active','trialing','past_due') or rec.current_period_end is null or rec.current_period_end<=now() then continue; end if;
      update public.entitlements set subscription_id=rec.subscription_id,subscription_status=rec.subscription_status,current_period_end=rec.current_period_end,stripe_customer_id=coalesce(rec.stripe_customer_id,stripe_customer_id),last_stripe_session_id=rec.stripe_session_id,entitlement_reconciliation_required=false where user_id=p_user_id;
    else continue; end if;
    perform public.sync_entitlement_effective_state(p_user_id);
    update public.pending_fulfilments set resolved_at=now() where id=rec.id;
    applied := applied+1;
  end loop;
  return applied;
end;
$fn$;
revoke all on function public.resolve_pending_fulfilments(uuid,text) from public,anon,authenticated;
grant execute on function public.resolve_pending_fulfilments(uuid,text) to service_role;

create or replace function public.complete_lesson(p_owner uuid,p_lesson_id text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $fn$
declare
  done integer;
  valid_ids text[] := array['m01-l01','m01-l02','m01-l03','m02-l04','m02-l05','m02-l06','m02-l07','m03-l08','m03-l09','m03-l10','m04-l11','m04-l12','m04-l13','m05-l14','m05-l15','m05-l16'];
  awarded text[] := '{}';
  code text;
begin
  if p_owner is null or p_lesson_id is null or not exists(select 1 from public.profiles where id=p_owner) or not (p_lesson_id=any(valid_ids)) then raise exception 'invalid lesson progress' using errcode='22023'; end if;
  insert into public.lesson_progress(user_id,lesson_id,is_completed) values(p_owner,p_lesson_id,true)
  on conflict(user_id,lesson_id) do update set is_completed=true,completed_at=coalesce(public.lesson_progress.completed_at,now());
  select count(*) into done from public.lesson_progress where user_id=p_owner and is_completed;
  foreach code in array array['primer_prompt','oido_critico','productor_ia'] loop
    if (code='primer_prompt' and done>=1) or (code='oido_critico' and done>=5) or (code='productor_ia' and done>=16) then
      insert into public.badges(user_id,code) values(p_owner,code) on conflict(user_id,code) do nothing;
      if found then awarded:=array_append(awarded,code); end if;
    end if;
  end loop;
  return jsonb_build_object('lessons_done',done,'lessons_total',16,'percent',round((100.0*done/16)::numeric,0),'badges',awarded);
end;
$fn$;
revoke all on function public.complete_lesson(uuid,text) from public,anon,authenticated;
grant execute on function public.complete_lesson(uuid,text) to service_role;

create or replace function public.save_lesson_checkpoint(p_owner uuid,p_lesson_id text,p_checkpoint jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $fn$
declare
  valid_ids text[] := array['m01-l01','m01-l02','m01-l03','m02-l04','m02-l05','m02-l06','m02-l07','m03-l08','m03-l09','m03-l10','m04-l11','m04-l12','m04-l13','m05-l14','m05-l15','m05-l16'];
begin
  if p_owner is null or p_lesson_id is null or not exists(select 1 from public.profiles where id=p_owner) or not (p_lesson_id=any(valid_ids)) or p_checkpoint is null or jsonb_typeof(p_checkpoint)<>'object' or octet_length(p_checkpoint::text)>20000 then raise exception 'invalid lesson checkpoint' using errcode='22023'; end if;
  insert into public.lesson_progress(user_id,lesson_id,checkpoint,is_completed) values(p_owner,p_lesson_id,p_checkpoint,false)
  on conflict(user_id,lesson_id) do update set checkpoint=excluded.checkpoint;
  return p_checkpoint;
end;
$fn$;
revoke all on function public.save_lesson_checkpoint(uuid,text,jsonb) from public,anon,authenticated;
grant execute on function public.save_lesson_checkpoint(uuid,text,jsonb) to service_role;

create or replace function public.consume_generation_callback_ticket(p_nonce text,p_song_id uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $fn$
declare ticket public.generation_callback_tickets%rowtype;
begin
  if p_nonce is null or btrim(p_nonce)='' or p_song_id is null then return 'invalid'; end if;
  update public.generation_callback_tickets set consumed_at=now() where nonce=p_nonce and song_id=p_song_id and consumed_at is null and expires_at>now() returning * into ticket;
  if found then delete from public.generation_callback_tickets where expires_at<now()-interval '1 day'; return 'consumed'; end if;
  select * into ticket from public.generation_callback_tickets where nonce=p_nonce;
  if not found then return 'not_found'; end if;
  if ticket.song_id is distinct from p_song_id then return 'song_mismatch'; end if;
  if ticket.consumed_at is not null then return 'replay'; end if;
  return 'expired';
end;
$fn$;
revoke all on function public.consume_generation_callback_ticket(text,uuid) from public,anon,authenticated;
grant execute on function public.consume_generation_callback_ticket(text,uuid) to service_role;

insert into public.agent_skills(slug,name,category,description,trigger_intent,output_format,risk_level,system_prompt,guardrails)
values
('academy-coach','Academy Coach','learn','Recomienda módulos y ejercicios del curso.', '["learn"]'::jsonb,'text','low','Guía el aprendizaje con lecciones reales del curso y el siguiente ejercicio concreto.','["No inventes lecciones ni resultados"]'::jsonb),
('studio-assistant','Studio Assistant','create','Refina briefs y estructuras musicales.', '["create"]'::jsonb,'text','low','Convierte una idea en decisiones de género, tempo, armonía, instrumentación y estructura.', '["No imites artistas o voces identificables"]'::jsonb),
('audiocore-analyst','AudioCore Analyst','analyze','Explica métricas DSP verificadas.', '["analyze"]'::jsonb,'text','low','Interpreta únicamente métricas reales que el usuario haya proporcionado.', '["No inventes mediciones"]'::jsonb),
('voice-identity-guide','Voice Identity Guide','voice','Guía perfiles vocales propios y consentidos.', '["voice"]'::jsonb,'text','critical','Ayuda con una voz propia consentida; rechaza imitación de terceros.', '["Consentimiento requerido","No imitar terceros"]'::jsonb),
('creator-growth-advisor','Creator Growth Advisor','grow','Crea rutas de crecimiento sostenibles.', '["grow"]'::jsonb,'json','medium','Propone acciones realistas sin prometer audiencia ni ingresos.', '["No prometas resultados"]'::jsonb),
('monetization-advisor','Monetization Advisor','monetize','Sugiere rutas creativas de monetización.', '["monetize"]'::jsonb,'text','high','Explica opciones generales y remite a profesionales para asesoría legal o fiscal.', '["No prometas ingresos","No asesoría legal"]'::jsonb),
('release-planner','Release Planner','publish','Planifica metadatos y lanzamiento.', '["publish"]'::jsonb,'text','medium','Crea una checklist de distribución y procedencia verificable.', '["No publiques sin confirmación"]'::jsonb),
('content-strategist','Content Strategist','market','Propone contenido para canales del creador.', '["market"]'::jsonb,'text','low','Propone ideas de contenido que el usuario puede revisar y aprobar.', '["No envíes ni publiques automáticamente"]'::jsonb),
('seo-discoverability','SEO Discoverability','market','Mejora títulos y descripciones.', '["market"]'::jsonb,'text','low','Optimiza metadatos sin inventar métricas de audiencia.', '["No inventes métricas"]'::jsonb),
('pricing-advisor','Pricing Advisor','monetize','Ayuda a empaquetar servicios creativos.', '["monetize"]'::jsonb,'text','medium','Propone marcos para que el creador decida precios; no garantiza ingresos.', '["No prometas ingresos"]'::jsonb),
('support-assistant','Support Assistant','support','Resuelve dudas de la plataforma.', '["support"]'::jsonb,'text','low','Responde con el funcionamiento real de Play & Go.', '["No inventes capacidades"]'::jsonb),
('rights-safety-guard','Rights & Safety Guard','safety','Revisa riesgos de derechos y consentimiento.', '["learn","create","analyze","voice","grow","monetize","publish","market","support"]'::jsonb,'text','critical','Bloquea la imitación de voces y la reproducción no autorizada.', '["No imitar terceros"]'::jsonb)
on conflict(slug) do update set name=excluded.name,category=excluded.category,description=excluded.description,trigger_intent=excluded.trigger_intent,output_format=excluded.output_format,risk_level=excluded.risk_level,system_prompt=excluded.system_prompt,guardrails=excluded.guardrails,updated_at=now();

commit;
