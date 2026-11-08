-- Play & Go · ciclo de vida explícito de derechos y cuotas.
-- Esta migración es aditiva; no toca pagos ni lee secretos.
-- Las filas históricas ambiguas quedan marcadas para reconciliación manual con Stripe.

alter table public.entitlements
  add column if not exists base_plan text not null default 'free';
alter table public.entitlements
  add column if not exists extension_expires_at timestamptz;
alter table public.entitlements
  add column if not exists subscription_status text;
alter table public.entitlements
  add column if not exists entitlement_reconciliation_required boolean not null default false;

alter table public.pending_fulfilments
  add column if not exists stripe_customer_id text;
alter table public.pending_fulfilments
  add column if not exists subscription_id text;
alter table public.pending_fulfilments
  add column if not exists subscription_status text;
alter table public.pending_fulfilments
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

-- La compra permanente solo se conserva automáticamente cuando la forma
-- anterior de la fila la identifica sin ambigüedad.
update public.entitlements
   set base_plan = 'enrolled'
 where plan = 'enrolled' and base_plan <> 'enrolled';

-- En la implementación anterior se perdía la diferencia entre la compra
-- permanente, la extensión de 30 días y Pro. Se conserva el dato conocido y se
-- marca lo que necesita comparación con las sesiones de Stripe.
update public.entitlements
   set entitlement_reconciliation_required = true
 where plan = 'pro';

update public.entitlements
   set entitlement_reconciliation_required = true,
       extension_expires_at = now() + interval '30 days'
 where plan = 'extension'
   and access_expires_at is null
   and extension_expires_at is null;

update public.entitlements
   set extension_expires_at = access_expires_at
 where plan = 'extension'
   and access_expires_at is not null
   and extension_expires_at is null;

update public.entitlements
   set subscription_status = 'active'
 where plan = 'pro'
   and subscription_id is not null
   and subscription_status is null;

create index if not exists entitlements_extension_expiry_idx
  on public.entitlements (extension_expires_at)
  where extension_expires_at is not null;

create index if not exists entitlements_reconciliation_required_idx
  on public.entitlements (user_id)
  where entitlement_reconciliation_required;

-- Un único derivador para webhooks y reconciliación de filas. El cliente no
-- puede invocarlo con una identidad arbitraria: solo service_role tiene EXECUTE.
create or replace function public.sync_entitlement_effective_state(p_owner uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  e public.entitlements;
  v_pro_active boolean;
  v_course_active boolean;
  v_extension_active boolean;
  v_plan text;
  v_active boolean;
  v_provider_limit integer;
  v_local_limit integer;
begin
  if p_owner is null then return; end if;

  select * into e
    from public.entitlements
   where user_id = p_owner
   for update;
  if not found then return; end if;

  v_pro_active :=
    e.subscription_id is not null
    and coalesce(e.subscription_status, case when e.plan = 'pro' then 'active' else '' end)
      in ('active', 'trialing', 'past_due')
    and (e.current_period_end is null or e.current_period_end > now());
  v_course_active := e.base_plan = 'enrolled';
  v_extension_active := e.extension_expires_at is not null and e.extension_expires_at > now();

  v_plan := case
    when v_pro_active then 'pro'
    when v_course_active then 'enrolled'
    when v_extension_active then 'extension'
    else 'free'
  end;
  v_active := v_pro_active or v_course_active or v_extension_active;
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
         active = v_active,
         daily_limit = v_provider_limit,
         local_daily_limit = v_local_limit,
         access_expires_at = case when v_plan = 'extension' then e.extension_expires_at else null end
   where user_id = p_owner;
end;
$$;

-- Reserva de cuota atómica y vencimientos verificados dentro de la base de datos.
create or replace function public.consume_generation_quota(
  p_owner uuid,
  p_engine text
)
returns table (allowed boolean, limit_total integer, limit_used integer, reason text)
language plpgsql
security definer
set search_path = public
as $$
declare
  e public.entitlements;
  today date := (now() at time zone 'utc')::date;
  v_pro_active boolean;
  v_course_active boolean;
  v_extension_active boolean;
  v_plan text;
  v_active boolean;
  v_provider_limit integer;
  v_local_limit integer;
begin
  if p_owner is distinct from (select auth.uid()) then
    return query select false, 0, 0, 'no puedes consumir el cupo de otra cuenta';
    return;
  end if;

  if p_engine not in ('local', 'provider') then
    return query select false, 0, 0, 'motor de generación no válido';
    return;
  end if;

  select * into e from public.entitlements where user_id = p_owner for update;
  if not found then
    insert into public.entitlements (user_id) values (p_owner)
    on conflict (user_id) do nothing;
    select * into e from public.entitlements where user_id = p_owner for update;
  end if;

  if e.reset_date is distinct from today then
    update public.entitlements
       set used_today = 0, local_used_today = 0, reset_date = today
     where user_id = p_owner
     returning * into e;
  end if;

  v_pro_active :=
    e.subscription_id is not null
    and coalesce(e.subscription_status, case when e.plan = 'pro' then 'active' else '' end)
      in ('active', 'trialing', 'past_due')
    and (e.current_period_end is null or e.current_period_end > now());
  v_course_active := e.base_plan = 'enrolled';
  v_extension_active := e.extension_expires_at is not null and e.extension_expires_at > now();

  v_plan := case
    when v_pro_active then 'pro'
    when v_course_active then 'enrolled'
    when v_extension_active then 'extension'
    else 'free'
  end;
  v_active := v_pro_active or v_course_active or v_extension_active;
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
         active = v_active,
         daily_limit = v_provider_limit,
         local_daily_limit = v_local_limit,
         access_expires_at = case when v_plan = 'extension' then e.extension_expires_at else null end
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

  if not v_active or v_provider_limit <= 0 then
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

-- Lectura coherente con el mismo cálculo: la UI nunca muestra un límite ya vencido.
create or replace function public.read_entitlement()
returns jsonb
language plpgsql
security definer
stable
set search_path = public
as $$
declare
  uid uuid := (select auth.uid());
  result jsonb;
  today date := (now() at time zone 'utc')::date;
begin
  if uid is null then return null; end if;

  with state as (
    select
      e.*,
      (
        e.subscription_id is not null
        and coalesce(e.subscription_status, case when e.plan = 'pro' then 'active' else '' end)
          in ('active', 'trialing', 'past_due')
        and (e.current_period_end is null or e.current_period_end > now())
      ) as pro_active,
      (e.base_plan = 'enrolled') as course_active,
      (e.extension_expires_at is not null and e.extension_expires_at > now()) as extension_active
    from public.entitlements e
    where e.user_id = uid
  ), derived as (
    select state.*,
      case
        when pro_active then 'pro'
        when course_active then 'enrolled'
        when extension_active then 'extension'
        else 'free'
      end as effective_plan
    from state
  )
  select jsonb_build_object(
    'plan', d.effective_plan,
    'active', (d.pro_active or d.course_active or d.extension_active),
    'daily_limit', case
      when d.pro_active then 20
      when d.course_active and d.extension_active then 10
      when d.course_active then 2
      when d.extension_active then 10
      else 0
    end,
    'used_today', case when d.reset_date = today then d.used_today else 0 end,
    'local_daily_limit', case
      when d.pro_active then 100
      when d.course_active and d.extension_active then 40
      when d.course_active then 20
      when d.extension_active then 40
      else 10
    end,
    'local_used_today', case when d.reset_date = today then d.local_used_today else 0 end,
    'reset_date', d.reset_date,
    'current_period_end', d.current_period_end,
    'extension_expires_at', d.extension_expires_at,
    'role', p.role,
    'display_name', p.display_name,
    'songs_total', (select count(*) from public.songs s where s.user_id = uid),
    'songs_ready', (select count(*) from public.songs s where s.user_id = uid and s.status = 'ready'),
    'lessons_done', (select count(*) from public.lesson_progress lp where lp.user_id = uid)
  )
  into result
  from derived d
  join public.profiles p on p.id = d.user_id;

  return result;
end;
$$;

-- Pagos anteriores al alta de la cuenta conservan tipo, cliente y vigencia.
create or replace function public.resolve_pending_fulfilments(p_user_id uuid, p_email text)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  rec record;
  applied integer := 0;
begin
  if p_email is null then return 0; end if;

  insert into public.entitlements (user_id)
  values (p_user_id)
  on conflict (user_id) do nothing;

  for rec in
    select id, stripe_session_id, product_id, stripe_customer_id,
           subscription_id, subscription_status, current_period_end
      from public.pending_fulfilments
     where lower(email) = lower(p_email)
       and resolved_at is null
     order by created_at
  loop
    if rec.product_id = 'play-and-go-course' then
      update public.entitlements
         set base_plan = 'enrolled',
             last_stripe_session_id = rec.stripe_session_id,
             stripe_customer_id = coalesce(rec.stripe_customer_id, stripe_customer_id)
       where user_id = p_user_id;
    elsif rec.product_id = 'play-and-go-extension' then
      update public.entitlements
         set extension_expires_at = greatest(coalesce(extension_expires_at, now()), now()) + interval '30 days',
             last_stripe_session_id = rec.stripe_session_id,
             stripe_customer_id = coalesce(rec.stripe_customer_id, stripe_customer_id)
       where user_id = p_user_id;
    elsif rec.product_id = 'play-and-go-pro' then
      -- Una suscripción sin ID/estado verificado queda pendiente para revisión,
      -- en vez de convertirse en acceso Pro sin vencimiento.
      if rec.subscription_id is null
        or rec.subscription_status not in ('active', 'trialing', 'past_due') then
        continue;
      end if;
      update public.entitlements
         set plan = 'pro',
             active = true,
             subscription_id = rec.subscription_id,
             subscription_status = rec.subscription_status,
             current_period_end = rec.current_period_end,
             stripe_customer_id = coalesce(rec.stripe_customer_id, stripe_customer_id),
             last_stripe_session_id = rec.stripe_session_id
       where user_id = p_user_id;
    else
      -- Producto desconocido: no conceder el curso como alternativa silenciosa.
      continue;
    end if;

    perform public.sync_entitlement_effective_state(p_user_id);

    update public.pending_fulfilments
       set resolved_at = now()
     where id = rec.id;

    applied := applied + 1;
  end loop;

  return applied;
end;
$$;

revoke all on function public.sync_entitlement_effective_state(uuid) from public;
revoke all on function public.sync_entitlement_effective_state(uuid) from anon;
revoke all on function public.sync_entitlement_effective_state(uuid) from authenticated;
grant execute on function public.sync_entitlement_effective_state(uuid) to service_role;

revoke all on function public.consume_generation_quota(uuid, text) from public;
revoke all on function public.consume_generation_quota(uuid, text) from anon;
grant execute on function public.consume_generation_quota(uuid, text) to authenticated;

revoke all on function public.read_entitlement() from public;
revoke all on function public.read_entitlement() from anon;
grant execute on function public.read_entitlement() to authenticated;

revoke all on function public.resolve_pending_fulfilments(uuid, text) from public;
revoke all on function public.resolve_pending_fulfilments(uuid, text) from anon;
grant execute on function public.resolve_pending_fulfilments(uuid, text) to service_role;
