-- Hardening del examen y de las constancias.
--
-- No se modifica 20261105190500_exam.sql porque las migraciones ya aplicadas
-- no deben reescribirse. Esta migración sustituye sus políticas inseguras:
-- el usuario puede leer sus propios resultados, pero solo el servidor puede
-- insertar o modificar intentos y constancias. La verificación pública pasa
-- por /api/certificates/verify, que devuelve un subconjunto deliberado de datos.

begin;

alter table public.exam_attempts enable row level security;
alter table public.certificates enable row level security;

drop policy if exists "exam_attempts_owner" on public.exam_attempts;
drop policy if exists "exam_attempts_owner_read" on public.exam_attempts;
create policy "exam_attempts_owner_read"
  on public.exam_attempts
  for select
  using ((select auth.uid()) = user_id);

drop policy if exists "certificates_verify_public" on public.certificates;
drop policy if exists "certificates_owner" on public.certificates;
create policy "certificates_owner"
  on public.certificates
  for select
  using ((select auth.uid()) = user_id);

-- Revocar también los grants amplios que Supabase puede conservar de los
-- defaults del esquema. La route del examen escribe usando service_role.
revoke all privileges on table public.exam_attempts from public, anon, authenticated;
revoke all privileges on table public.certificates from public, anon, authenticated;

grant select on table public.exam_attempts to authenticated;
grant select on table public.certificates to authenticated;

grant all privileges on table public.exam_attempts to service_role;
grant all privileges on table public.certificates to service_role;

commit;
