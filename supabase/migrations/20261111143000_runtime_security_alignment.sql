-- Runtime alignment: live database history included entitlement changes that were
-- not present in the live schema. This migration is additive and safe to rerun.

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

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.entitlements'::regclass
      and conname = 'entitlements_base_plan_check'
  ) then
    alter table public.entitlements
      add constraint entitlements_base_plan_check check (base_plan in ('free', 'enrolled'));
  end if;
end;
$$;

update public.entitlements
   set base_plan = 'enrolled'
 where plan = 'enrolled' and base_plan <> 'enrolled';

update public.entitlements
   set extension_expires_at = access_expires_at
 where plan = 'extension'
   and access_expires_at is not null
   and extension_expires_at is null;

-- Never infer an active Stripe subscription from a legacy plan label or ID.
-- Ambiguous paid rows remain explicitly marked until a verified Stripe event
-- updates their lifecycle fields.
update public.entitlements
   set entitlement_reconciliation_required = true
 where (plan = 'pro' and (
          subscription_id is null
          or subscription_status is null
          or current_period_end is null
        ))
    or (plan = 'extension' and extension_expires_at is null);

create index if not exists entitlements_extension_expiry_idx
  on public.entitlements (extension_expires_at)
  where extension_expires_at is not null;

create index if not exists entitlements_reconciliation_required_idx
  on public.entitlements (user_id)
  where entitlement_reconciliation_required;

create or replace function public.sync_entitlement_effective_state(p_owner uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  e public.entitlements%rowtype;
  v_pro_active boolean;
  v_course_active boolean;
  v_extension_active boolean;
  v_plan text;
  v_provider_limit integer;
  v_local_limit integer;
begin
  if p_owner is null then return; end if;

  select * into e
    from public.entitlements
   where user_id = p_owner
   for update;
  if not found then return; end if;

  v_pro_active := coalesce(
    not e.entitlement_reconciliation_required
    and e.subscription_id is not null
    and e.subscription_status in ('active', 'trialing', 'past_due')
    and e.current_period_end is not null
    and e.current_period_end > now(),
    false
  );
  v_course_active := e.base_plan = 'enrolled';
  v_extension_active := coalesce(
    not e.entitlement_reconciliation_required
    and e.extension_expires_at is not null
    and e.extension_expires_at > now(),
    false
  );

  v_plan := case
    when v_pro_active then 'pro'
    when v_course_active then 'enrolled'
    when v_extension_active then 'extension'
    else 'free'
  end;
  v_provider_limit := case
    when v_pro_active then 20
    when v_course_active and v_extension_active then 10
    when v_course_active then 2
    when v_extension_active then 10
    else 0
  end;
  v_local_limit := case
    when v_pro_active then 100
    when v_course_active and v_extension_active then 40
    when v_course_active then 20
    when v_extension_active then 40
    else 10
  end;

  update public.entitlements
     set plan = v_plan,
         active = v_pro_active or v_course_active or v_extension_active,
         daily_limit = v_provider_limit,
         local_daily_limit = v_local_limit,
         access_expires_at = case when v_plan = 'extension' then e.extension_expires_at else null end
   where user_id = p_owner;
end;
$$;

create or replace function public.consume_generation_quota(p_owner uuid, p_engine text)
returns table (allowed boolean, limit_total integer, limit_used integer, reason text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  e public.entitlements%rowtype;
  today date := (now() at time zone 'utc')::date;
  v_pro_active boolean;
  v_course_active boolean;
  v_extension_active boolean;
  v_provider_limit integer;
  v_local_limit integer;
begin
  if p_owner is distinct from (select auth.uid()) then
    return query select false, 0, 0, 'no puedes consumir el cupo de otra cuenta';
    return;
  end if;

  if p_engine is null or p_engine not in ('local', 'provider') then
    return query select false, 0, 0, 'motor de generación no válido';
    return;
  end if;

  insert into public.entitlements (user_id)
  values (p_owner)
  on conflict (user_id) do nothing;

  select * into e
    from public.entitlements
   where user_id = p_owner
   for update;

  if e.reset_date is distinct from today then
    update public.entitlements
       set used_today = 0,
           local_used_today = 0,
           reset_date = today
     where user_id = p_owner
     returning * into e;
  end if;

  v_pro_active := coalesce(
    not e.entitlement_reconciliation_required
    and e.subscription_id is not null
    and e.subscription_status in ('active', 'trialing', 'past_due')
    and e.current_period_end is not null
    and e.current_period_end > now(),
    false
  );
  v_course_active := e.base_plan = 'enrolled';
  v_extension_active := coalesce(
    not e.entitlement_reconciliation_required
    and e.extension_expires_at is not null
    and e.extension_expires_at > now(),
    false
  );
  v_provider_limit := case
    when v_pro_active then 20
    when v_course_active and v_extension_active then 10
    when v_course_active then 2
    when v_extension_active then 10
    else 0
  end;
  v_local_limit := case
    when v_pro_active then 100
    when v_course_active and v_extension_active then 40
    when v_course_active then 20
    when v_extension_active then 40
    else 10
  end;

  update public.entitlements
     set plan = case
           when v_pro_active then 'pro'
           when v_course_active then 'enrolled'
           when v_extension_active then 'extension'
           else 'free'
         end,
         active = v_pro_active or v_course_active or v_extension_active,
         daily_limit = v_provider_limit,
         local_daily_limit = v_local_limit,
         access_expires_at = case when v_extension_active and not v_course_active and not v_pro_active
           then e.extension_expires_at else null end
   where user_id = p_owner;

  if p_engine = 'local' then
    if e.local_used_today >= v_local_limit then
      return query select false, v_local_limit, e.local_used_today,
        'Ya usaste las composiciones locales de hoy. Vuelve mañana o sube de plan.';
      return;
    end if;
    update public.entitlements
       set local_used_today = local_used_today + 1
     where user_id = p_owner
     returning * into e;
    return query select true, v_local_limit, e.local_used_today, null::text;
    return;
  end if;

  if e.entitlement_reconciliation_required and not v_course_active then
    return query select false, 0, e.used_today,
      'Tu acceso de pago requiere revisión antes de usar generaciones con proveedor.';
    return;
  end if;

  if v_provider_limit <= 0 then
    return query select false, 0, e.used_today, 'Tu inscripción o extensión no está activa.';
    return;
  end if;
  if e.used_today >= v_provider_limit then
    return query select false, v_provider_limit, e.used_today,
      'Tu cupo diario está agotado. Activa una extensión o vuelve mañana.';
    return;
  end if;

  update public.entitlements
     set used_today = used_today + 1
   where user_id = p_owner
   returning * into e;
  return query select true, v_provider_limit, e.used_today, null::text;
end;
$$;

create or replace function public.refund_generation_quota(p_owner uuid, p_engine text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_owner is null or p_engine not in ('local', 'provider') then return; end if;
  if p_engine = 'local' then
    update public.entitlements
       set local_used_today = greatest(local_used_today - 1, 0)
     where user_id = p_owner;
  else
    update public.entitlements
       set used_today = greatest(used_today - 1, 0)
     where user_id = p_owner;
  end if;
end;
$$;

create or replace function public.read_entitlement()
returns jsonb
language plpgsql
security definer
stable
set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
  result jsonb;
  today date := (now() at time zone 'utc')::date;
begin
  if uid is null then return null; end if;

  with state as (
    select e.*,
      coalesce(
        not e.entitlement_reconciliation_required
        and e.subscription_id is not null
        and e.subscription_status in ('active', 'trialing', 'past_due')
        and e.current_period_end is not null
        and e.current_period_end > now(),
        false
      ) as pro_active,
      (e.base_plan = 'enrolled') as course_active,
      coalesce(
        not e.entitlement_reconciliation_required
        and e.extension_expires_at is not null
        and e.extension_expires_at > now(),
        false
      ) as extension_active
    from public.entitlements e
    where e.user_id = uid
  ), derived as (
    select state.*,
      case when pro_active then 'pro'
           when course_active then 'enrolled'
           when extension_active then 'extension'
           else 'free' end as effective_plan
    from state
  )
  select jsonb_build_object(
    'plan', d.effective_plan,
    'active', (d.pro_active or d.course_active or d.extension_active),
    'daily_limit', case when d.pro_active then 20
      when d.course_active and d.extension_active then 10
      when d.course_active then 2
      when d.extension_active then 10 else 0 end,
    'used_today', case when d.reset_date = today then d.used_today else 0 end,
    'local_daily_limit', case when d.pro_active then 100
      when d.course_active and d.extension_active then 40
      when d.course_active then 20
      when d.extension_active then 40 else 10 end,
    'local_used_today', case when d.reset_date = today then d.local_used_today else 0 end,
    'reset_date', d.reset_date,
    'current_period_end', d.current_period_end,
    'extension_expires_at', d.extension_expires_at,
    'entitlement_reconciliation_required', d.entitlement_reconciliation_required,
    'role', p.role,
    'display_name', p.display_name,
    'songs_total', (select count(*) from public.songs s where s.user_id = uid),
    'songs_ready', (select count(*) from public.songs s where s.user_id = uid and s.status = 'ready'),
    'lessons_done', (select count(*) from public.lesson_progress lp where lp.user_id = uid and lp.is_completed)
  ) into result
  from derived d
  join public.profiles p on p.id = d.user_id;

  return result;
end;
$$;

create or replace function public.course_total_lessons()
returns integer
language sql
immutable
set search_path = ''
as $$ select 16 $$;

drop function if exists public.complete_lesson(text);
create function public.complete_lesson(p_owner uuid, p_lesson_id text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  done integer;
  total integer := 16;
  awarded text[] := '{}';
  code text;
  valid_ids text[] := array[
    'm01-l01', 'm01-l02', 'm01-l03', 'm02-l04', 'm02-l05', 'm02-l06', 'm02-l07',
    'm03-l08', 'm03-l09', 'm03-l10', 'm04-l11', 'm04-l12', 'm04-l13',
    'm05-l14', 'm05-l15', 'm05-l16'
  ];
begin
  if p_owner is null or not exists (select 1 from public.profiles where id = p_owner) then
    raise exception 'invalid progress owner' using errcode = '22023';
  end if;
  if p_lesson_id is null or not (p_lesson_id = any(valid_ids)) then
    raise exception 'invalid lesson id' using errcode = '22023';
  end if;

  insert into public.lesson_progress (user_id, lesson_id, is_completed)
  values (p_owner, p_lesson_id, true)
  on conflict (user_id, lesson_id) do update set is_completed = true;
  select count(*) into done from public.lesson_progress where user_id = p_owner and is_completed;

  foreach code in array array['primer_prompt', 'oido_critico', 'productor_ia'] loop
    if (code = 'primer_prompt' and done >= 1)
       or (code = 'oido_critico' and done >= 5)
       or (code = 'productor_ia' and done >= total) then
      insert into public.badges (user_id, code)
      values (p_owner, code)
      on conflict (user_id, code) do nothing;
      if found then awarded := array_append(awarded, code); end if;
    end if;
  end loop;

  return jsonb_build_object(
    'lessons_done', done,
    'lessons_total', total,
    'percent', round((100.0 * done / total)::numeric, 0),
    'badges', awarded
  );
end;
$$;

drop function if exists public.save_lesson_checkpoint(text, jsonb);
create function public.save_lesson_checkpoint(p_owner uuid, p_lesson_id text, p_checkpoint jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  valid_ids text[] := array[
    'm01-l01', 'm01-l02', 'm01-l03', 'm02-l04', 'm02-l05', 'm02-l06', 'm02-l07',
    'm03-l08', 'm03-l09', 'm03-l10', 'm04-l11', 'm04-l12', 'm04-l13',
    'm05-l14', 'm05-l15', 'm05-l16'
  ];
begin
  if p_owner is null or not exists (select 1 from public.profiles where id = p_owner) then
    raise exception 'invalid progress owner' using errcode = '22023';
  end if;
  if p_lesson_id is null or not (p_lesson_id = any(valid_ids)) then
    raise exception 'invalid lesson id' using errcode = '22023';
  end if;
  if p_checkpoint is null or jsonb_typeof(p_checkpoint) <> 'object'
    or octet_length(p_checkpoint::text) > 20000 then
    raise exception 'invalid checkpoint' using errcode = '22023';
  end if;

  insert into public.lesson_progress (user_id, lesson_id, checkpoint, is_completed)
  values (p_owner, p_lesson_id, p_checkpoint, false)
  on conflict (user_id, lesson_id)
  do update set checkpoint = excluded.checkpoint;
  return p_checkpoint;
end;
$$;

drop function if exists public.mark_song_ready(uuid, text);
drop function if exists public.mark_song_ready(uuid, text, numeric, text);
create function public.mark_song_ready(
  p_owner uuid,
  p_song_id uuid,
  p_audio_url text,
  p_duration_seconds numeric,
  p_storage_path text
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_status text;
  file_name text;
begin
  if p_owner is null or p_song_id is null or p_storage_path is null then return false; end if;
  if p_audio_url is null or p_audio_url !~ '^https?://' then return false; end if;
  if p_duration_seconds is null or p_duration_seconds <= 0 or p_duration_seconds >= 3600 then return false; end if;
  if array_length(string_to_array(p_storage_path, '/'), 1) <> 2
    or split_part(p_storage_path, '/', 1) <> p_owner::text then return false; end if;
  file_name := split_part(p_storage_path, '/', 2);
  if array_length(string_to_array(file_name, '.'), 1) <> 2
    or split_part(file_name, '.', 1) <> p_song_id::text
    or split_part(file_name, '.', 2) not in ('mp3', 'wav', 'ogg', 'm4a') then return false; end if;

  select status into current_status
    from public.songs
   where id = p_song_id and user_id = p_owner
   for update;
  if not found then return false; end if;
  if current_status = 'ready' then
    return exists (
      select 1 from public.songs
       where id = p_song_id and user_id = p_owner and storage_path = p_storage_path
    );
  end if;
  if current_status not in ('queued', 'generating') then return false; end if;

  update public.songs
     set status = 'ready',
         audio_url = p_audio_url,
         storage_path = p_storage_path,
         duration_seconds = p_duration_seconds,
         error = null
   where id = p_song_id and user_id = p_owner;
  insert into public.badges (user_id, code)
  values (p_owner, 'primera_cancion')
  on conflict (user_id, code) do nothing;
  return true;
end;
$$;

create or replace function public.apply_generation_result(
  p_song_id uuid,
  p_status text,
  p_audio_url text,
  p_duration numeric,
  p_error text
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_status text;
begin
  if p_song_id is null or p_status not in ('ready', 'error') then return 'bad_status'; end if;
  select status into current_status from public.songs where id = p_song_id for update;
  if not found then return 'not_found'; end if;
  if current_status not in ('queued', 'generating') then return 'already_settled'; end if;
  if p_status = 'ready' and (p_audio_url is null or p_audio_url !~ '^https?://') then return 'bad_audio_url'; end if;

  update public.songs
     set status = p_status,
         audio_url = case when p_status = 'ready' then p_audio_url else null end,
         duration_seconds = case when p_status = 'ready' then p_duration else duration_seconds end,
         error = case when p_status = 'error' then left(coalesce(p_error, 'El proveedor no devolvió audio.'), 400) else null end
   where id = p_song_id and status in ('queued', 'generating');

  if p_status = 'ready' then
    insert into public.badges (user_id, code)
    select user_id, 'primera_cancion' from public.songs where id = p_song_id
    on conflict (user_id, code) do nothing;
  end if;
  return 'applied';
end;
$$;

create or replace function public.resolve_pending_fulfilments(p_user_id uuid, p_email text)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  rec record;
  applied integer := 0;
begin
  if p_user_id is null or p_email is null then return 0; end if;
  if not exists (select 1 from public.profiles where id = p_user_id) then return 0; end if;

  insert into public.entitlements (user_id)
  values (p_user_id)
  on conflict (user_id) do nothing;

  for rec in
    select id, stripe_session_id, product_id, stripe_customer_id,
           subscription_id, subscription_status, current_period_end, created_at
      from public.pending_fulfilments
     where lower(email) = lower(p_email) and resolved_at is null
     order by created_at
     for update
  loop
    if rec.product_id = 'play-and-go-course' then
      update public.entitlements
         set base_plan = 'enrolled',
             last_stripe_session_id = rec.stripe_session_id,
             stripe_customer_id = coalesce(rec.stripe_customer_id, stripe_customer_id)
       where user_id = p_user_id;
    elsif rec.product_id = 'play-and-go-extension' then
      update public.entitlements
         set extension_expires_at = greatest(coalesce(extension_expires_at, rec.created_at), rec.created_at) + interval '30 days',
             last_stripe_session_id = rec.stripe_session_id,
             stripe_customer_id = coalesce(rec.stripe_customer_id, stripe_customer_id)
       where user_id = p_user_id;
    elsif rec.product_id = 'play-and-go-pro' then
      if rec.subscription_id is null
        or rec.subscription_status not in ('active', 'trialing', 'past_due')
        or rec.current_period_end is null
        or rec.current_period_end <= now() then
        continue;
      end if;
      update public.entitlements
         set subscription_id = rec.subscription_id,
             subscription_status = rec.subscription_status,
             current_period_end = rec.current_period_end,
             stripe_customer_id = coalesce(rec.stripe_customer_id, stripe_customer_id),
             last_stripe_session_id = rec.stripe_session_id,
             entitlement_reconciliation_required = false
       where user_id = p_user_id;
    else
      continue;
    end if;

    perform public.sync_entitlement_effective_state(p_user_id);
    update public.pending_fulfilments set resolved_at = now() where id = rec.id;
    applied := applied + 1;
  end loop;
  return applied;
end;
$$;

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

alter table public.lesson_progress
  add column if not exists is_completed boolean not null default true;

alter table public.songs
  add column if not exists musical_key text,
  add column if not exists analysis jsonb not null default '{}'::jsonb,
  add column if not exists core_version text not null default '2.0.0',
  add column if not exists analyzed_at timestamptz;

do $$
begin
  if not exists (select 1 from pg_constraint where conrelid = 'public.songs'::regclass and conname = 'songs_musical_key_length') then
    alter table public.songs add constraint songs_musical_key_length
      check (musical_key is null or char_length(musical_key) between 1 and 32);
  end if;
  if not exists (select 1 from pg_constraint where conrelid = 'public.songs'::regclass and conname = 'songs_analysis_is_object') then
    alter table public.songs add constraint songs_analysis_is_object
      check (jsonb_typeof(analysis) = 'object');
  end if;
  if not exists (select 1 from pg_constraint where conrelid = 'public.songs'::regclass and conname = 'songs_core_version_format') then
    alter table public.songs add constraint songs_core_version_format
      check (core_version ~ '^[0-9]+\.[0-9]+\.[0-9]+$');
  end if;
end;
$$;

comment on column public.songs.musical_key is 'Tonalidad estimada por TAMV-AudioCore.';
comment on column public.songs.analysis is 'Resultado estructurado del análisis armónico.';
comment on column public.songs.core_version is 'Versión del contrato de análisis que produjo el resultado.';
comment on column public.songs.analyzed_at is 'Último análisis completado.';

create table if not exists public.audio_analysis_jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  song_id uuid references public.songs(id) on delete cascade,
  status text not null default 'queued' check (status in ('queued', 'processing', 'completed', 'failed')),
  engine text not null default 'numpy' check (engine in ('numpy', 'native', 'tensorrt')),
  sample_rate integer not null default 48000 check (sample_rate between 8000 and 192000),
  fft_size integer not null default 2048 check (fft_size between 256 and 32768 and (fft_size & (fft_size - 1)) = 0),
  hop_size integer not null default 512 check (hop_size between 64 and 8192),
  storage_path text,
  result jsonb not null default '{}'::jsonb check (jsonb_typeof(result) = 'object'),
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

alter table public.audio_analysis_jobs enable row level security;
drop policy if exists "audio_analysis_jobs: el dueño lee sus trabajos" on public.audio_analysis_jobs;
create policy "audio_analysis_jobs: el dueño lee sus trabajos"
  on public.audio_analysis_jobs for select to authenticated
  using (user_id = (select auth.uid()));
revoke all privileges on table public.audio_analysis_jobs from public, anon, authenticated;
grant select on table public.audio_analysis_jobs to authenticated;
grant all privileges on table public.audio_analysis_jobs to service_role;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('song-audio', 'song-audio', false, 26214400,
  array['audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/mp4', 'audio/x-wav'])
on conflict (id) do update
  set public = false,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "song-audio: el dueño sube a su carpeta" on storage.objects;
create policy "song-audio: el dueño sube a su carpeta"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'song-audio' and (storage.foldername(name))[1] = (select auth.uid()::text));
drop policy if exists "song-audio: el dueño lee sus archivos" on storage.objects;
create policy "song-audio: el dueño lee sus archivos"
  on storage.objects for select to authenticated
  using (bucket_id = 'song-audio' and (storage.foldername(name))[1] = (select auth.uid()::text));
drop policy if exists "song-audio: el dueño reemplaza sus archivos" on storage.objects;
create policy "song-audio: el dueño reemplaza sus archivos"
  on storage.objects for update to authenticated
  using (bucket_id = 'song-audio' and (storage.foldername(name))[1] = (select auth.uid()::text))
  with check (bucket_id = 'song-audio' and (storage.foldername(name))[1] = (select auth.uid()::text));
drop policy if exists "song-audio: el dueño borra sus archivos" on storage.objects;
create policy "song-audio: el dueño borra sus archivos"
  on storage.objects for delete to authenticated
  using (bucket_id = 'song-audio' and (storage.foldername(name))[1] = (select auth.uid()::text));

-- State transitions happen through ownership-checked RPCs or service-role routes;
-- browser sessions may read/insert/delete only their own tracks, not mark them ready.
drop policy if exists "songs: solo el dueño edita las suyas" on public.songs;
revoke update on table public.songs from public, anon, authenticated;

-- Progress rows are writable only through the validated, atomic RPC below.
drop policy if exists "lesson_progress: dueño total" on public.lesson_progress;
drop policy if exists "lesson_progress: dueño lee sus datos" on public.lesson_progress;
create policy "lesson_progress: dueño lee sus datos"
  on public.lesson_progress for select to authenticated
  using (user_id = (select auth.uid()));
revoke insert, update, delete on table public.lesson_progress from public, anon, authenticated;
grant select on table public.lesson_progress to authenticated;
revoke insert, update, delete on table public.badges from public, anon, authenticated;
grant select on table public.badges to authenticated;
revoke all privileges on table public.oauth_audit_events from public, anon, authenticated;
grant all privileges on table public.oauth_audit_events to service_role;

-- Internal triggers are not RPC endpoints. Legacy quota/certificate writers are
-- disabled; the current authenticated routes use the functions below.
alter function public.handle_new_user() set search_path = '';
alter function public.protect_profile_role() set search_path = '';
revoke all on function public.handle_new_user() from public, anon, authenticated;
revoke all on function public.protect_profile_role() from public, anon, authenticated;
revoke all on function public.consume_generation(uuid, text) from public, anon, authenticated;
revoke all on function public.issue_certificate(uuid, text) from public, anon, authenticated;
revoke all on function public.sync_entitlement_effective_state(uuid) from public, anon, authenticated;
revoke all on function public.consume_generation_quota(uuid, text) from public, anon, authenticated;
revoke all on function public.refund_generation_quota(uuid, text) from public, anon, authenticated;
revoke all on function public.read_entitlement() from public, anon, authenticated;
revoke all on function public.complete_lesson(uuid, text) from public, anon, authenticated;
revoke all on function public.save_lesson_checkpoint(uuid, text, jsonb) from public, anon, authenticated;
revoke all on function public.mark_song_ready(uuid, uuid, text, numeric, text) from public, anon, authenticated;
revoke all on function public.apply_generation_result(uuid, text, text, numeric, text) from public, anon, authenticated;
revoke all on function public.resolve_pending_fulfilments(uuid, text) from public, anon, authenticated;

grant execute on function public.sync_entitlement_effective_state(uuid) to service_role;
grant execute on function public.consume_generation_quota(uuid, text) to authenticated;
grant execute on function public.refund_generation_quota(uuid, text) to service_role;
grant execute on function public.read_entitlement() to authenticated;
grant execute on function public.complete_lesson(uuid, text) to service_role;
grant execute on function public.save_lesson_checkpoint(uuid, text, jsonb) to service_role;
grant execute on function public.mark_song_ready(uuid, uuid, text, numeric, text) to service_role;
grant execute on function public.apply_generation_result(uuid, text, text, numeric, text) to service_role;
grant execute on function public.resolve_pending_fulfilments(uuid, text) to service_role;
revoke all on function public.touch_updated_at() from public, anon, authenticated;
revoke all on function public.course_total_lessons() from public, anon, authenticated;
grant execute on function public.course_total_lessons() to service_role;
