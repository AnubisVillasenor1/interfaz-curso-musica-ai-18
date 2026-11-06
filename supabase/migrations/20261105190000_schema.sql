-- Play and Go · esquema base
-- Aplicar con: supabase db push   (o pegar en el SQL Editor del Dashboard)
--
-- Este archivo existía solo implícitamente: el código consultaba `songs` y
-- `entitlements` desde `app/api/generate/route.ts`, pero en el repo no había
-- ni una línea de SQL. Sin estas tablas ninguna ruta de ingreso funciona, y
-- sin `profiles` no hay dónde colgar el rol que hoy se decide comparando un
-- correo escrito en el fuente.

create extension if not exists pgcrypto;

-- ─────────────────────────────────────────────
-- profiles · espejo público de auth.users
-- ─────────────────────────────────────────────
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null default '',
  role text not null default 'user' check (role in ('user', 'admin')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- El rol vive aquí y no en un correo compilado: con la confirmación de correo
-- desactivada, cualquiera podía registrarse con la dirección de administrador
-- y obtener cupo ilimitado.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'display_name', ''))
  on conflict (id) do nothing;
  insert into public.entitlements (user_id)
  values (new.id)
  on conflict (user_id) do nothing;

  -- Si esta persona ya había pagado antes de registrarse, su acceso se
  -- activa en el mismo instante del alta. El webhook no podía entregarla y la
  -- guardó en la cola; aquí se liquida.
  perform public.resolve_pending_fulfilments(new.id, new.email);

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ─────────────────────────────────────────────
-- songs · lo que el usuario crea
-- ─────────────────────────────────────────────
create table if not exists public.songs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  title text not null check (char_length(title) between 1 and 80),
  prompt text not null check (char_length(prompt) between 1 and 2000),
  genre text,
  tempo integer check (tempo is null or (tempo >= 40 and tempo <= 200)),
  vocal_style text,
  instrumentation text,
  lyrics text,
  -- 'local' = motor Tone.js propio, coste cero. 'provider' = API de pago con
  -- voces. La cuota se cobra distinto según el origen.
  engine text not null default 'local' check (engine in ('local', 'provider')),
  status text not null default 'queued'
    check (status in ('queued', 'generating', 'ready', 'error')),
  audio_url text,
  -- Copia del audio en Storage del proyecto: los CDN del proveedor caducan y
  -- una biblioteca con enlaces muertos no es un producto.
  storage_path text,
  duration_seconds numeric(7, 2),
  provider_task_id text,
  error text,
  lesson_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- La biblioteca se lee siempre igual: las canciones de un usuario, de la más
-- nueva a la más vieja. Sin este índice el escaneo es secuencial y empeora
-- con cada canción que alguien crea.
create index if not exists songs_user_created_idx
  on public.songs (user_id, created_at desc);

-- Reconciliación: las filas abandonadas en 'generating' se buscan por tarea.
create index if not exists songs_provider_task_idx
  on public.songs (provider_task_id)
  where provider_task_id is not null;

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists songs_touch_updated_at on public.songs;
create trigger songs_touch_updated_at
  before update on public.songs
  for each row execute function public.touch_updated_at();

drop trigger if exists profiles_touch_updated_at on public.profiles;
create trigger profiles_touch_updated_at
  before update on public.profiles
  for each row execute function public.touch_updated_at();

-- El rol de un perfil no puede autoasignarse desde la sesión del propio
-- usuario. Hoy `app/api/generate/route.ts` decidía quién era administrador
-- comparando un correo escrito en el fuente: con la confirmación de correo
-- desactivada en Supabase, registrarse con esa dirección daba cupo ilimitado.
-- Aquí el ascenso solo lo permite el servicio, y se lee de las claims del JWT
-- en lugar de consultar `profiles` (eso sería recursión bajo RLS).
create or replace function public.protect_profile_role()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  caller_role text = coalesce(
    (current_setting('request.jwt.claims', true)::jsonb ->> 'role'),
    'anon'
  );
begin
  if new.role is distinct from old.role and caller_role <> 'service_role' then
    raise 'el rol de perfil solo lo cambia el servicio' using errcode = '42501';
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_protect_role on public.profiles;
create trigger profiles_protect_role
  before update on public.profiles
  for each row execute function public.protect_profile_role();

-- ─────────────────────────────────────────────
-- entitlements · plan y cupo
-- ─────────────────────────────────────────────
create table if not exists public.entitlements (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  plan text not null default 'free'
    check (plan in ('free', 'enrolled', 'extension', 'pro')),
  active boolean not null default false,
  -- Cupo del proveedor de pago: lo que cuesta dinero.
  daily_limit integer not null default 0 check (daily_limit >= 0),
  used_today integer not null default 0 check (used_today >= 0),
  -- Cupo del motor local: no le cuesta nada a nadie, así que es generoso por
  -- diseño; sin esto el plan gratuito no puede ni probar la plataforma.
  local_daily_limit integer not null default 10 check (local_daily_limit >= 0),
  local_used_today integer not null default 0 check (local_used_today >= 0),
  -- DATE y no texto: comparar '2026-11-05' contra la hora local del contenedor
  -- serverless hacía que el reinicio del día dependiera de la región del host.
  reset_date date not null default (now() at time zone 'utc')::date,
  stripe_customer_id text,
  subscription_id text,
  current_period_end timestamptz,
  -- La extensión se vende con validez de 30 días; el curso no caduca. Sin esta
  -- columna no había forma de apagar un cupo ampliado cuando vencía.
  access_expires_at timestamptz,
  last_stripe_session_id text,
  updated_at timestamptz not null default now()
);

drop trigger if exists entitlements_touch_updated_at on public.entitlements;
create trigger entitlements_touch_updated_at
  before update on public.entitlements
  for each row execute function public.touch_updated_at();

-- ─────────────────────────────────────────────
-- lesson_progress · badges · el curso deja de ser fachada
-- ─────────────────────────────────────────────
create table if not exists public.lesson_progress (
  user_id uuid not null references public.profiles (id) on delete cascade,
  lesson_id text not null,
  completed_at timestamptz not null default now(),
  primary key (user_id, lesson_id)
);

create table if not exists public.badges (
  user_id uuid not null references public.profiles (id) on delete cascade,
  code text not null,
  earned_at timestamptz not null default now(),
  primary key (user_id, code)
);

-- ─────────────────────────────────────────────
-- stripe_events · idempotencia
-- ─────────────────────────────────────────────
-- Stripe reintenta los webhooks. Sin registro de event.id, cada reintento
-- re-ejecutaba la entrega y podía pisar el plan ya contratado.
create table if not exists public.stripe_events (
  id text primary key,
  type text not null,
  processed_at timestamptz not null default now()
);

-- ─────────────────────────────────────────────
-- pending_fulfilments · el pagó y aún no tiene cuenta
-- ─────────────────────────────────────────────
-- Antes, si el correo del pago no aparecía en auth.users el webhook devolvía
-- 200 y el dinero se perdía sin rastro. Aquí queda la deuda hasta que la
-- cuenta exista.
create table if not exists public.pending_fulfilments (
  id uuid primary key default gen_random_uuid(),
  stripe_session_id text not null unique,
  email text not null,
  product_id text not null,
  resolved_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists pending_fulfilments_unresolved_idx
  on public.pending_fulfilments (email)
  where resolved_at is null;
