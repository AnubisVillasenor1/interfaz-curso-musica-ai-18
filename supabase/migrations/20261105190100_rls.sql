-- Play and Go · Row Level Security
--
-- Sin estas políticas la anon key publicada en el bundle del navegador podía
-- leer y escribir cualquier fila: el `service_role` era el único control, y el
-- `service_role` no llega al navegador precisamente porque hace lo que quiera.
--
-- Nota de diseño: no existe una política "el admin ve todos los perfiles". Un
-- helper `is_admin()` que consulta `profiles` dentro de una política de
-- `profiles` es recursión infinita en Postgres. La administración se hace por
-- Dashboard o con `service_role`, no con una columna mágica leída desde la
-- propia tabla protegida.

alter table public.profiles enable row level security;
alter table public.songs enable row level security;
alter table public.entitlements enable row level security;
alter table public.lesson_progress enable row level security;
alter table public.badges enable row level security;
alter table public.stripe_events enable row level security;
alter table public.pending_fulfilments enable row level security;

-- ─────────────────────────────────────────────
-- profiles
-- ─────────────────────────────────────────────
create policy "profiles: el dueño lee su perfil"
  on public.profiles for select
  using (id = (select auth.uid()));

-- El cliente escribe su nombre artístico. El rol lo bloquea un trigger
-- (`protect_profile_role` en la migración de esquema): sin ese bloqueo esta
-- misma política permitiría ascenderse a admin con un UPDATE.
create policy "profiles: el dueño edita su perfil"
  on public.profiles for update
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

create policy "profiles: el dueño se crea el perfil"
  on public.profiles for insert
  with check (id = (select auth.uid()));

-- ─────────────────────────────────────────────
-- songs
-- ─────────────────────────────────────────────
create policy "songs: solo el dueño ve las suyas"
  on public.songs for select
  using (user_id = (select auth.uid()));

create policy "songs: solo el dueño crea"
  on public.songs for insert
  with check (user_id = (select auth.uid()));

create policy "songs: solo el dueño edita las suyas"
  on public.songs for update
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "songs: solo el dueño borra las suyas"
  on public.songs for delete
  using (user_id = (select auth.uid()));

-- ─────────────────────────────────────────────
-- entitlements · lectura propia, escritura solo por servicio
-- ─────────────────────────────────────────────
-- No hay política de insert/update/delete a propósito. La entrega del plan la
-- hace el webhook con `service_role` y el consumo de cuota la hace una RPC
-- `security definer`; si el cliente pudiera escribir aquí, se regalaría el cupo.
create policy "entitlements: solo el dueño lee su plan"
  on public.entitlements for select
  using (user_id = (select auth.uid()));

-- ─────────────────────────────────────────────
-- lesson_progress · badges
-- ─────────────────────────────────────────────
create policy "lesson_progress: dueño total"
  on public.lesson_progress for all
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "badges: solo lectura del dueño"
  on public.badges for select
  using (user_id = (select auth.uid()));

-- `stripe_events` y `pending_fulfilments` quedan sin política: RLS activado y
-- cero políticas significa negado para anon y authenticated. Solo accede el
-- `service_role`, que los escribe desde el webhook.
