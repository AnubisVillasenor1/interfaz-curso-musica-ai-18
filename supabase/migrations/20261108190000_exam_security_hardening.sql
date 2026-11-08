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

-- Remove every pre-existing policy on these two tables. This also closes
-- unexpected permissive policies whose names are not present in the old
-- migration history. Only the owner SELECT policies below are recreated.
do $
declare
  policy_row record;
begin
  for policy_row in
    select schemaname, tablename, policyname
      from pg_policies
     where schemaname = 'public'
       and tablename in ('exam_attempts', 'certificates')
  loop
    execute format(
      'drop policy %I on %I.%I',
      policy_row.policyname,
      policy_row.schemaname,
      policy_row.tablename
    );
  end loop;
end;
$;

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
