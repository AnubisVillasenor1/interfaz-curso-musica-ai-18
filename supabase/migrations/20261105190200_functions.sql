-- Play and Go · funciones de negocio
--
-- Todo lo que tiene que pasar como una sola operación atómica vive aquí. En
-- SQL no se puede partir un chequeo y su escritura en dos peticiones desde el
-- cliente: dos requests concurrentes leían `used_today = k`, ambos pasaban el
-- filtro y ambos escribían `k + 1`, así que el cupo pagado se saltaba con solo
-- hacer doble clic.

-- ─────────────────────────────────────────────
-- consume_generation_quota · el único camino al cupo
-- ─────────────────────────────────────────────
-- Devuelve allowed=false con un motivo legible en vez de dejar que la ruta
-- adivine. `for update` serializea los intentos del mismo usuario.
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
  is_local boolean := p_engine = 'local';
begin
  if p_owner is distinct from (select auth.uid()) then
    return query select false, 0, 0, 'no puedes consumir el cupo de otra cuenta';
    return;
  end if;

  select * into e from public.entitlements where user_id = p_owner for update;

  if not found then
    insert into public.entitlements (user_id) values (p_owner)
    returning * into e;
  end if;

  -- Cambio de día: se reinicia el contador y solo entonces se persiste.
  if e.reset_date is distinct from today then
    update public.entitlements
       set used_today = 0, local_used_today = 0, reset_date = today
     where user_id = p_owner
     returning * into e;
  end if;

  if is_local then
    if e.local_used_today >= e.local_daily_limit then
      return query select false, e.local_daily_limit, e.local_used_today,
        'Ya usaste las composiciones locales de hoy. Vuelve mañana o sube de plan.';
      return;
    end if;
    update public.entitlements
       set local_used_today = e.local_used_today + 1
     where user_id = p_owner
     returning * into e;
    return query select true, e.local_daily_limit, e.local_used_today, null::text;
    return;
  end if;

  -- El proveedor de pago cuesta dinero real: sin plan activo no se concede,
  -- aunque `daily_limit` hubiera quedado alto de una extensión anterior.
  if not e.active or e.daily_limit <= 0 then
    return query select false, greatest(e.daily_limit, 0), e.used_today,
      'Tu inscripción no está activa.';
    return;
  end if;

  if e.used_today >= e.daily_limit then
    return query select false, e.daily_limit, e.used_today,
      'Tu cupo diario está agotado. Activa una extensión o vuelve mañana.';
    return;
  end if;

  update public.entitlements
     set used_today = e.used_today + 1
   where user_id = p_owner
   returning * into e;

  return query select true, e.daily_limit, e.used_today, null::text;
end;
$$;

-- ─────────────────────────────────────────────
-- refund_generation_quota · el intento no produjo nada
-- ─────────────────────────────────────────────
-- Si el proveedor cae o falta configuración, la unidad reservada se devuelve.
-- Nunca baja de cero, y solo toca el contador del motor que se reservó.
create or replace function public.refund_generation_quota(p_owner uuid, p_engine text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_owner is distinct from (select auth.uid()) then
    return;
  end if;

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

-- ─────────────────────────────────────────────
-- read_entitlement · lo que la UI muestra en el perfil
-- ─────────────────────────────────────────────
-- Incluye el rol: la app necesita saber si quien mira es administrador para
-- ofrecer la reconciliación, y eso no puede adivinarse desde un correo.
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
begin
  if uid is null then return null; end if;

  select jsonb_build_object(
    'plan', e.plan,
    'active', e.active,
    'daily_limit', e.daily_limit,
    'used_today', e.used_today,
    'local_daily_limit', e.local_daily_limit,
    'local_used_today', e.local_used_today,
    'reset_date', e.reset_date,
    'current_period_end', e.current_period_end,
    'role', p.role,
    'display_name', p.display_name,
    'songs_total', (select count(*) from public.songs s where s.user_id = uid),
    'songs_ready', (select count(*) from public.songs s where s.user_id = uid and s.status = 'ready'),
    'lessons_done', (select count(*) from public.lesson_progress lp where lp.user_id = uid)
  ) into result
  from public.entitlements e
  join public.profiles p on p.id = e.user_id
  where e.user_id = uid;

  return result;
end;
$$;

-- ─────────────────────────────────────────────
-- complete_lesson · progreso real e insignias
-- ─────────────────────────────────────────────
-- `course_total_lessons()` es un scalar, no una lectura de `lesson_progress`
-- dentro de su propia política: se mantiene fuera del ciclo RLS.
create or replace function public.course_total_lessons()
returns integer
language sql
immutable
as $$
  select 16;
$$;

create or replace function public.complete_lesson(p_lesson_id text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := (select auth.uid());
  done integer;
  total integer := public.course_total_lessons();
  awarded text[] := '{}';
  code text;
begin
  if uid is null then
    return jsonb_build_object('error', 'inicia sesión para registrar tu progreso');
  end if;
  if p_lesson_id is null or char_length(p_lesson_id) > 64 then
    return jsonb_build_object('error', 'identificador de lección inválido');
  end if;

  insert into public.lesson_progress (user_id, lesson_id)
  values (uid, p_lesson_id)
  on conflict (user_id, lesson_id) do nothing;

  select count(*) into done from public.lesson_progress where user_id = uid;

  -- Insignias por hitos, no por un literal hardcodeado en la landing.
  -- `found` tras ON CONFLICT DO NOTHING distingue la insignia recién ganada de
  -- la que ya existía, así que la respuesta solo presume lo que de verdad pasó.
  foreach code in array array['primer_prompt', 'oido_critico', 'productor_ia'] loop
    if (code = 'primer_prompt' and done >= 1)
       or (code = 'oido_critico' and done >= 5)
       or (code = 'productor_ia' and done >= total)
    then
      insert into public.badges (user_id, code)
      values (uid, code)
      on conflict (user_id, code) do nothing;
      if found then
        awarded := array_append(awarded, code);
      end if;
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

-- ─────────────────────────────────────────────
-- song_ready · cierre del círculo de la insignia de composiciones
-- ─────────────────────────────────────────────
create or replace function public.mark_song_ready(p_song_id uuid, p_audio_url text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare uid uuid := (select auth.uid());
begin
  if uid is null then return false; end if;
  update public.songs
     set status = 'ready', audio_url = p_audio_url, error = null
   where id = p_song_id and user_id = uid;
  if not found then return false; end if;
  insert into public.badges (user_id, code) values (uid, 'primera_cancion')
  on conflict (user_id, code) do nothing;
  return true;
end;
$$;

-- ─────────────────────────────────────────────
-- resolve_pending_fulfilments · el pago que llegó antes que la cuenta
-- ─────────────────────────────────────────────
-- La llama `handle_new_user()` en el alta: si alguien pagó sin estar registrado
-- y después crea la cuenta con ese correo, su acceso se activa solo.
create or replace function public.resolve_pending_fulfilments(p_user_id uuid, p_email text)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  rec record;
  applied integer := 0;
  is_extension boolean;
begin
  if p_email is null then return 0; end if;

  for rec in
    select id, product_id from public.pending_fulfilments
     where lower(email) = lower(p_email) and resolved_at is null
     order by created_at
  loop
    is_extension := rec.product_id = 'play-and-go-extension';
    insert into public.entitlements (user_id) values (p_user_id)
    on conflict (user_id) do nothing;

    update public.entitlements
       set plan = case
             when is_extension and plan in ('free', 'extension') then 'extension'
             when is_extension then plan
             else 'enrolled'
           end,
           active = true,
           daily_limit = case
             when is_extension then greatest(daily_limit, 10)
             else greatest(daily_limit, 2)
           end,
           local_daily_limit = case
             when is_extension then greatest(local_daily_limit, 40)
             else greatest(local_daily_limit, 10)
           end
     where user_id = p_user_id;

    update public.pending_fulfilments
       set resolved_at = now()
     where id = rec.id;

    applied := applied + 1;
  end loop;

  return applied;
end;
$$;

-- ─────────────────────────────────────────────
-- generate/callback · reconciliación con estado previo
-- ─────────────────────────────────────────────
-- El callback del proveedor ya no escribe a ciegas: solo acepta transiciones
-- desde 'queued' o 'generating', y devuelve 'not_found' si la fila no existe,
-- para que un songId inventado no reciba un 200 que mime el fallo.
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
set search_path = public
as $$
declare
  current_status text;
begin
  select status into current_status from public.songs where id = p_song_id;
  if not found then return 'not_found'; end if;
  if current_status not in ('queued', 'generating') then
    return 'already_settled';
  end if;
  if p_status not in ('ready', 'error') then return 'bad_status'; end if;
  if p_status = 'ready' and (p_audio_url is null or p_audio_url !~ '^https?://') then
    return 'bad_audio_url';
  end if;

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

-- ─────────────────────────────────────────────
-- stale_generating · las filas huérfanas que nadie iba a recoger
-- ─────────────────────────────────────────────
-- Si el proveedor aceptaba la petición y el callback nunca llegaba, la canción
-- se quedaba en 'generating' para siempre. Esto las lista para reintentar o
-- caducarlas; lo llama una ruta autenticada de administrador.
create or replace function public.stale_generating(p_older_than interval default interval '20 minutes')
returns table (id uuid, user_id uuid, provider_task_id text, created_at timestamptz)
language plpgsql
security definer
stable
set search_path = public
as $$
begin
  if not public.is_service_or_admin() then
    return;
  end if;
  return query
    select s.id, s.user_id, s.provider_task_id, s.created_at
    from public.songs s
    where s.status = 'generating'
      and s.created_at < now() - p_older_than
    order by s.created_at
    limit 200;
end;
$$;

-- Helper sin recursión RLS: el rol se lee de las claims del JWT, no de la
-- tabla que estamos protegiendo.
create or replace function public.is_service_or_admin()
returns boolean
language sql
stable
set search_path = public
as $$
  select coalesce(
    (current_setting('request.jwt.claims', true)::jsonb ->> 'role') = 'service_role',
    false
  ) or coalesce(
    exists (
      select 1 from public.profiles p
      where p.id = (select auth.uid()) and p.role = 'admin'
    ) and (select auth.uid()) is not null,
    false
  );
$$;

-- ─────────────────────────────────────────────
-- Permisos de ejecución
-- ─────────────────────────────────────────────
revoke all on function public.consume_generation_quota(uuid, text) from public;
revoke all on function public.refund_generation_quota(uuid, text) from public;
revoke all on function public.read_entitlement() from public;
revoke all on function public.complete_lesson(text) from public;
revoke all on function public.mark_song_ready(uuid, text) from public;
revoke all on function public.resolve_pending_fulfilments(uuid, text) from public;
revoke all on function public.apply_generation_result(uuid, text, text, numeric, text) from public;
revoke all on function public.stale_generating(interval) from public;
revoke all on function public.is_service_or_admin() from public;

grant execute on function public.consume_generation_quota(uuid, text) to authenticated;
grant execute on function public.read_entitlement() to authenticated;
grant execute on function public.complete_lesson(text) to authenticated;
grant execute on function public.mark_song_ready(uuid, text) to authenticated;
grant execute on function public.apply_generation_result(uuid, text, text, numeric, text) to service_role;
grant execute on function public.resolve_pending_fulfilments(uuid, text) to service_role;
grant execute on function public.stale_generating(interval) to authenticated, service_role;
grant execute on function public.is_service_or_admin() to authenticated, service_role;
