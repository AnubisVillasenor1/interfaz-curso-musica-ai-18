create table if not exists public.tamv_license_devices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  device_hash text not null check (device_hash ~ '^[0-9a-f]{64}$'),
  label text not null default 'Navegador' check (char_length(label) between 1 and 80),
  status text not null default 'active' check (status in ('active', 'revoked')),
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  revoked_at timestamptz,
  unique (user_id, device_hash)
);

create table if not exists public.tamv_licenses (
  id uuid primary key default gen_random_uuid(),
  jti text not null unique check (char_length(jti) between 8 and 96),
  user_id uuid not null references auth.users(id) on delete cascade,
  device_id uuid not null references public.tamv_license_devices(id) on delete cascade,
  device_hash text not null check (device_hash ~ '^[0-9a-f]{64}$'),
  product text not null default 'play-and-go',
  edition text not null default 'commercial' check (edition = 'commercial'),
  plan text not null check (plan in ('starter', 'core', 'pro')),
  status text not null default 'active' check (status in ('active', 'revoked', 'expired')),
  claims jsonb not null check (jsonb_typeof(claims) = 'object'),
  token text not null,
  issued_at timestamptz not null,
  expires_at timestamptz not null,
  revoked_at timestamptz,
  revoke_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (expires_at > issued_at)
);

create unique index if not exists tamv_license_active_user_device_idx
  on public.tamv_licenses (user_id, device_id)
  where status = 'active';
create index if not exists tamv_licenses_user_status_expiry_idx
  on public.tamv_licenses (user_id, status, expires_at desc);
create index if not exists tamv_licenses_device_hash_idx
  on public.tamv_licenses (device_hash, status);

create table if not exists public.tamv_license_usage (
  license_id uuid not null references public.tamv_licenses(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  period_start date not null,
  bucket text not null check (bucket in ('monthly', 'voice')),
  used integer not null default 0 check (used >= 0),
  updated_at timestamptz not null default now(),
  primary key (license_id, period_start, bucket)
);

create table if not exists public.tamv_license_jobs (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  license_id uuid not null references public.tamv_licenses(id) on delete cascade,
  feature text not null,
  status text not null default 'active' check (status in ('active', 'completed', 'failed')),
  started_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '15 minutes'),
  completed_at timestamptz
);
create index if not exists tamv_license_jobs_user_active_idx
  on public.tamv_license_jobs (user_id, status, expires_at);

create table if not exists public.tamv_license_events (
  id uuid primary key default gen_random_uuid(),
  event_id text not null unique,
  user_id uuid references auth.users(id) on delete set null,
  license_id uuid references public.tamv_licenses(id) on delete set null,
  event_type text not null,
  payload jsonb not null check (jsonb_typeof(payload) = 'object'),
  signature text,
  created_at timestamptz not null default now()
);
create index if not exists tamv_license_events_user_created_idx
  on public.tamv_license_events (user_id, created_at desc);

create index if not exists tamv_license_devices_user_status_idx
  on public.tamv_license_devices (user_id, status, last_seen_at desc);

alter table public.tamv_license_devices enable row level security;
alter table public.tamv_licenses enable row level security;
alter table public.tamv_license_usage enable row level security;
alter table public.tamv_license_jobs enable row level security;
alter table public.tamv_license_events enable row level security;

revoke all privileges on table public.tamv_license_devices from public, anon, authenticated;
revoke all privileges on table public.tamv_licenses from public, anon, authenticated;
revoke all privileges on table public.tamv_license_usage from public, anon, authenticated;
revoke all privileges on table public.tamv_license_jobs from public, anon, authenticated;
revoke all privileges on table public.tamv_license_events from public, anon, authenticated;
grant all privileges on table public.tamv_license_devices to service_role;
grant all privileges on table public.tamv_licenses to service_role;
grant all privileges on table public.tamv_license_usage to service_role;
grant all privileges on table public.tamv_license_jobs to service_role;
grant all privileges on table public.tamv_license_events to service_role;

create or replace function public.register_tamv_license_device(
  p_user_id uuid,
  p_device_hash text,
  p_label text,
  p_max_devices integer default 3
)
returns table (device_id uuid, status text, active_count integer)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_existing public.tamv_license_devices%rowtype;
  v_active_count integer;
  v_device_id uuid;
begin
  if p_user_id is null or p_device_hash is null or p_device_hash !~ '^[0-9a-f]{64}$' then
    return query select null::uuid, 'invalid_device'::text, 0;
    return;
  end if;

  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_user_id::text, 1));

  select d.* into v_existing
    from public.tamv_license_devices as d
   where d.user_id = p_user_id and d.device_hash = p_device_hash
   for update;

  if found and v_existing.status = 'revoked' then
    select count(*)::integer into v_active_count
      from public.tamv_license_devices as d
     where d.user_id = p_user_id and d.status = 'active';
    return query select v_existing.id, 'revoked'::text, v_active_count;
    return;
  end if;

  if found then
    update public.tamv_license_devices as d
       set last_seen_at = pg_catalog.now(),
           label = coalesce(nullif(pg_catalog.btrim(p_label), ''), d.label)
     where d.id = v_existing.id
     returning d.id into v_device_id;
    select count(*)::integer into v_active_count
      from public.tamv_license_devices as d
     where d.user_id = p_user_id and d.status = 'active';
    return query select v_device_id, 'existing'::text, v_active_count;
    return;
  end if;

  select count(*)::integer into v_active_count
    from public.tamv_license_devices as d
   where d.user_id = p_user_id and d.status = 'active';
  if v_active_count >= pg_catalog.least(pg_catalog.greatest(coalesce(p_max_devices, 3), 1), 10) then
    return query select null::uuid, 'device_limit'::text, v_active_count;
    return;
  end if;

  insert into public.tamv_license_devices (user_id, device_hash, label)
  values (p_user_id, p_device_hash, coalesce(nullif(pg_catalog.btrim(p_label), ''), 'Navegador'))
  returning id into v_device_id;

  return query select v_device_id, 'registered'::text, v_active_count + 1;
end;
$$;

create or replace function public.authorize_tamv_license_feature(
  p_user_id uuid,
  p_device_hash text,
  p_feature text,
  p_consume boolean default false,
  p_job_id uuid default null
)
returns table (
  allowed boolean,
  reason text,
  license_id uuid,
  plan text,
  limit_total integer,
  limit_used integer,
  expires_at timestamptz,
  limits jsonb
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_license public.tamv_licenses%rowtype;
  v_entitlement public.entitlements%rowtype;
  v_job public.tamv_license_jobs%rowtype;
  v_pro_active boolean := false;
  v_course_active boolean := false;
  v_extension_active boolean := false;
  v_current_plan text := 'starter';
  v_current_rank integer := 0;
  v_license_rank integer := 0;
  v_period_start date := pg_catalog.date_trunc('month', pg_catalog.now() at time zone 'utc')::date;
  v_buckets text[];
  v_bucket text;
  v_limit integer;
  v_voice_limit integer := 0;
  v_monthly_limit integer := 0;
  v_used integer;
  v_monthly_used integer := 0;
  v_voice_used integer := 0;
  v_max_jobs integer := 1;
  v_active_jobs integer := 0;
  v_claim_limits jsonb;
begin
  if p_user_id is null
     or p_device_hash is null
     or p_device_hash !~ '^[0-9a-f]{64}$'
     or p_feature is null
     or p_feature not in (
       'studio.basic', 'audiocore.basic', 'audiocore.advanced',
       'voice_identity', 'creator_growth.basic', 'creator_growth',
       'monetization_advisor', 'tamv_research'
     ) then
    return query select false, 'invalid_request'::text, null::uuid, null::text, 0, 0, null::timestamptz, null::jsonb;
    return;
  end if;

  select l.* into v_license
    from public.tamv_licenses as l
    join public.tamv_license_devices as d
      on d.id = l.device_id and d.user_id = l.user_id
   where l.user_id = p_user_id
     and l.device_hash = p_device_hash
     and l.status = 'active'
     and l.revoked_at is null
     and l.expires_at > pg_catalog.now()
     and d.status = 'active'
   order by l.issued_at desc
   limit 1
   for update of l;

  if not found then
    return query select false, 'license_missing_or_expired'::text, null::uuid, null::text, 0, 0, null::timestamptz, null::jsonb;
    return;
  end if;

  select e.* into v_entitlement
    from public.entitlements as e
   where e.user_id = p_user_id;

  if found then
    v_pro_active := not v_entitlement.entitlement_reconciliation_required
      and v_entitlement.subscription_id is not null
      and coalesce(v_entitlement.subscription_status, '') in ('active', 'trialing', 'past_due')
      and (v_entitlement.current_period_end is null or v_entitlement.current_period_end > pg_catalog.now());
    v_course_active := v_entitlement.base_plan = 'enrolled';
    v_extension_active := not v_entitlement.entitlement_reconciliation_required
      and v_entitlement.extension_expires_at is not null
      and v_entitlement.extension_expires_at > pg_catalog.now();
    v_current_plan := case
      when v_pro_active then 'pro'
      when v_course_active or v_extension_active then 'core'
      else 'starter'
    end;
  end if;

  v_current_rank := case v_current_plan when 'pro' then 2 when 'core' then 1 else 0 end;
  v_license_rank := case v_license.plan when 'pro' then 2 when 'core' then 1 else 0 end;
  if v_license_rank > v_current_rank then
    return query select false, 'entitlement_inactive_or_downgraded'::text, v_license.id, v_license.plan, 0, 0, v_license.expires_at, v_license.claims -> 'limits';
    return;
  end if;

  if not coalesce(v_license.claims -> 'features' ? p_feature, false) then
    return query select false, 'feature_not_licensed'::text, v_license.id, v_license.plan, 0, 0, v_license.expires_at, v_license.claims -> 'limits';
    return;
  end if;

  v_claim_limits := v_license.claims -> 'limits';
  v_monthly_limit := case
    when coalesce(v_claim_limits ->> 'monthlyGenerations', '') ~ '^[0-9]{1,7}$'
      then (v_claim_limits ->> 'monthlyGenerations')::integer
    else 0
  end;
  v_voice_limit := case
    when coalesce(v_claim_limits ->> 'maxVoiceGenerations', '') ~ '^[0-9]{1,7}$'
      then (v_claim_limits ->> 'maxVoiceGenerations')::integer
    else 0
  end;
  v_max_jobs := case
    when coalesce(v_claim_limits ->> 'maxConcurrentJobs', '') ~ '^[0-9]{1,3}$'
      then pg_catalog.least(pg_catalog.greatest((v_claim_limits ->> 'maxConcurrentJobs')::integer, 1), 20)
    else 1
  end;

  if p_feature = 'voice_identity' then
    v_buckets := array['monthly', 'voice'];
    v_limit := v_voice_limit;
  else
    v_buckets := array['monthly'];
    v_limit := v_monthly_limit;
  end if;

  if p_consume then
    if p_job_id is not null then
      select j.* into v_job
        from public.tamv_license_jobs as j
       where j.id = p_job_id and j.user_id = p_user_id
       for update;
      if found then
        if v_job.license_id = v_license.id and v_job.status = 'active' and v_job.expires_at > pg_catalog.now() then
          return query select true, 'duplicate_reservation'::text, v_license.id, v_license.plan, v_limit, 0, v_license.expires_at, v_claim_limits;
          return;
        end if;
        return query select false, 'job_id_already_used'::text, v_license.id, v_license.plan, v_limit, 0, v_license.expires_at, v_claim_limits;
        return;
      end if;

      select count(*)::integer into v_active_jobs
        from public.tamv_license_jobs as j
       where j.user_id = p_user_id and j.status = 'active' and j.expires_at > pg_catalog.now();
      if v_active_jobs >= v_max_jobs then
        return query select false, 'concurrency_limit'::text, v_license.id, v_license.plan, v_max_jobs, v_active_jobs, v_license.expires_at, v_claim_limits;
        return;
      end if;
    end if;

    foreach v_bucket in array v_buckets loop
      v_limit := case v_bucket when 'voice' then v_voice_limit else v_monthly_limit end;
      if v_limit <= 0 then
        return query select false, 'quota_not_configured'::text, v_license.id, v_license.plan, 0, 0, v_license.expires_at, v_claim_limits;
        return;
      end if;
      insert into public.tamv_license_usage (license_id, user_id, period_start, bucket, used)
      values (v_license.id, p_user_id, v_period_start, v_bucket, 0)
      on conflict (license_id, period_start, bucket) do nothing;
      select u.used into v_used
        from public.tamv_license_usage as u
       where u.license_id = v_license.id and u.period_start = v_period_start and u.bucket = v_bucket
       for update;
      if v_bucket = 'voice' then v_voice_used := coalesce(v_used, 0); else v_monthly_used := coalesce(v_used, 0); end if;
      if coalesce(v_used, 0) >= v_limit then
        return query select false, 'monthly_quota_exhausted'::text, v_license.id, v_license.plan, v_limit, coalesce(v_used, 0), v_license.expires_at, v_claim_limits;
        return;
      end if;
    end loop;

    foreach v_bucket in array v_buckets loop
      update public.tamv_license_usage as u
         set used = u.used + 1,
             updated_at = pg_catalog.now()
       where u.license_id = v_license.id and u.period_start = v_period_start and u.bucket = v_bucket
       returning u.used into v_used;
      if v_bucket = 'voice' then v_voice_used := coalesce(v_used, 0); else v_monthly_used := coalesce(v_used, 0); end if;
    end loop;

    if p_job_id is not null then
      insert into public.tamv_license_jobs (id, user_id, license_id, feature)
      values (p_job_id, p_user_id, v_license.id, p_feature);
    end if;
  else
    select coalesce(u.used, 0) into v_monthly_used
      from public.tamv_license_usage as u
     where u.license_id = v_license.id and u.period_start = v_period_start and u.bucket = 'monthly';
    select coalesce(u.used, 0) into v_voice_used
      from public.tamv_license_usage as u
     where u.license_id = v_license.id and u.period_start = v_period_start and u.bucket = 'voice';
  end if;

  if p_feature = 'voice_identity' then
    v_limit := v_voice_limit;
    v_used := v_voice_used;
  else
    v_limit := v_monthly_limit;
    v_used := v_monthly_used;
  end if;

  return query select true, 'ok'::text, v_license.id, v_license.plan, v_limit, coalesce(v_used, 0), v_license.expires_at, v_claim_limits;
end;
$$;

create or replace function public.finish_tamv_license_job(
  p_user_id uuid,
  p_job_id uuid,
  p_status text
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_updated integer;
begin
  if p_user_id is null or p_job_id is null or p_status not in ('completed', 'failed') then
    return false;
  end if;

  update public.tamv_license_jobs as j
     set status = p_status,
         completed_at = pg_catalog.now()
   where j.id = p_job_id
     and j.user_id = p_user_id
     and j.status = 'active';
  get diagnostics v_updated = row_count;
  return v_updated > 0;
end;
$$;

revoke all on function public.register_tamv_license_device(uuid, text, text, integer) from public, anon, authenticated;
revoke all on function public.authorize_tamv_license_feature(uuid, text, text, boolean, uuid) from public, anon, authenticated;
revoke all on function public.finish_tamv_license_job(uuid, uuid, text) from public, anon, authenticated;
grant execute on function public.register_tamv_license_device(uuid, text, text, integer) to service_role;
grant execute on function public.authorize_tamv_license_feature(uuid, text, text, boolean, uuid) to service_role;
grant execute on function public.finish_tamv_license_job(uuid, uuid, text) to service_role;
