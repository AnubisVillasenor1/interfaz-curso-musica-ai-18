-- P1-001 · Concesión transaccional e idempotente de derechos.
--
-- La entrega de `lib/fulfilment.ts` leía la fila de `entitlements`, calculaba el
-- nuevo estado en JavaScript y hacía `upsert`. Dos webhooks concurrentes del
-- mismo usuario podían leer el mismo estado y pisarse: una compra del curso
-- podía quedar como extensión, o dos eventos de la misma sesión podían sumar
-- 60 días en lugar de 30. La solución no es reintentar con más suerte, sino
-- mover la decisión a una única transacción con bloqueo por usuario.
--
-- La función es la única vía de escritura de derechos desde la aplicación:
--   * `pg_advisory_xact_lock` serializa incluso cuando la fila aún no existe;
--   * `select ... for update` bloquea la fila existente;
--   * `stripe_session_grants` registra qué sesión de Checkout ya se aplicó, de
--     modo que un evento viejo reenviado no vuelve a sumar una extensión;
--   * `sync_entitlement_effective_state` deriva plan, acceso y cupos con las
--     mismas reglas que el resto de la base.
--
-- Rollback de migración: `drop function public.grant_product_entitlement(...)`
-- y `drop table public.stripe_session_grants`. No revierte derechos concedidos.

create table if not exists public.stripe_session_grants (
  stripe_session_id text primary key,
  user_id uuid not null references public.profiles (id) on delete cascade,
  product_id text not null,
  granted_at timestamptz not null default now()
);

alter table public.stripe_session_grants enable row level security;
-- Sin políticas: sólo `service_role` (que omite RLS) puede leer o escribir.
-- El cliente público no necesita esta tabla y no debe poder enumerarla.
revoke all on table public.stripe_session_grants from public, anon, authenticated;
grant select, insert on table public.stripe_session_grants to service_role;

create index if not exists stripe_session_grants_user_idx
  on public.stripe_session_grants (user_id, granted_at desc);

create or replace function public.grant_product_entitlement(
  p_user_id uuid,
  p_product_id text,
  p_session_id text,
  p_customer_id text default null,
  p_subscription_id text default null,
  p_subscription_status text default null,
  p_current_period_end timestamptz default null,
  p_extension_days integer default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  e public.entitlements%rowtype;
  v_base text;
  v_extension timestamptz;
  v_session_applied boolean := false;
  v_affected integer := 0;
begin
  if p_user_id is null then
    raise exception 'grant_product_entitlement: falta el usuario';
  end if;
  if p_session_id is null or btrim(p_session_id) = '' then
    raise exception 'grant_product_entitlement: falta la sesión de Checkout';
  end if;
  if p_product_id not in (
    'play-and-go-course',
    'play-and-go-extension',
    'play-and-go-pro'
  ) then
    raise exception 'grant_product_entitlement: producto no reconocido: %', p_product_id;
  end if;

  -- El bloqueo es por usuario, no por usuario+producto: es más estricto y evita
  -- que dos productos distintos del mismo usuario se pisen al recalcular el
  -- estado efectivo. `hashtextextended` acepta el uuid como texto.
  perform pg_advisory_xact_lock(hashtextextended('entitlement:' || p_user_id::text, 0));

  -- La fila puede no existir todavía; el advisory lock ya cubre ese hueco.
  insert into public.entitlements (user_id)
  values (p_user_id)
  on conflict (user_id) do nothing;

  select * into e
    from public.entitlements
   where user_id = p_user_id
   for update;

  -- Registro idempotente por sesión de Checkout. Se hace antes de mutar para
  -- que un duplicado salga sin tocar el estado. En la misma transacción, un
  -- fallo posterior revierte tanto el registro como la concesión.
  insert into public.stripe_session_grants (stripe_session_id, user_id, product_id)
  values (p_session_id, p_user_id, p_product_id)
  on conflict (stripe_session_id) do nothing;
  get diagnostics v_affected = row_count;
  v_session_applied := v_affected > 0;

  if not v_session_applied then
    return jsonb_build_object(
      'status', 'duplicate',
      'user_id', p_user_id,
      'plan', e.plan,
      'active', e.active
    );
  end if;

  v_base := coalesce(
    e.base_plan,
    case when e.plan = 'enrolled' then 'enrolled' else 'free' end
  );
  v_extension := coalesce(e.extension_expires_at, e.access_expires_at);

  if p_product_id = 'play-and-go-course' then
    v_base := 'enrolled';

  elsif p_product_id = 'play-and-go-extension' then
    if p_extension_days is null or p_extension_days <= 0 then
      raise exception 'grant_product_entitlement: extensión sin duración válida';
    end if;
    -- Se suma desde el mayor entre ahora y la expiración vigente. `greatest`
    -- con `now()` evita que una extensión comprada tras el vencimiento reste
    -- días por haber expirado.
    v_extension := greatest(coalesce(v_extension, now()), now())
      + make_interval(days => p_extension_days);

  else -- play-and-go-pro
    if p_subscription_id is null
      or p_subscription_status not in ('active', 'trialing', 'past_due')
      or p_current_period_end is null
      or p_current_period_end <= now() then
      raise exception 'grant_product_entitlement: suscripción sin vigencia verificada';
    end if;
  end if;

  update public.entitlements
     set base_plan = v_base,
         extension_expires_at = v_extension,
         plan = case
           when p_product_id = 'play-and-go-pro' then 'pro'
           else plan
         end,
         active = case
           when p_product_id = 'play-and-go-pro' then true
           else active
         end,
         last_stripe_session_id = p_session_id,
         stripe_customer_id = coalesce(p_customer_id, stripe_customer_id),
         subscription_id = case
           when p_product_id = 'play-and-go-pro' then p_subscription_id
           else subscription_id
         end,
         subscription_status = case
           when p_product_id = 'play-and-go-pro' then p_subscription_status
           else subscription_status
         end,
         current_period_end = case
           when p_product_id = 'play-and-go-pro' then p_current_period_end
           else current_period_end
         end,
         entitlement_reconciliation_required = case
           when p_product_id = 'play-and-go-pro' then false
           else entitlement_reconciliation_required
         end
   where user_id = p_user_id;

  -- Deriva plan, acceso y cupos con las reglas únicas de la base. No se
  -- duplican aquí los umbrales para que no diverjan de consume_generation_quota.
  perform public.sync_entitlement_effective_state(p_user_id);

  select * into e
    from public.entitlements
   where user_id = p_user_id;

  return jsonb_build_object(
    'status', 'granted',
    'user_id', p_user_id,
    'plan', e.plan,
    'active', e.active,
    'base_plan', e.base_plan,
    'extension_expires_at', e.extension_expires_at,
    'subscription_id', e.subscription_id
  );
end;
$$;

revoke all on function public.grant_product_entitlement(
  uuid, text, text, text, text, text, timestamptz, integer
) from public, anon, authenticated;
grant execute on function public.grant_product_entitlement(
  uuid, text, text, text, text, text, timestamptz, integer
) to service_role;
