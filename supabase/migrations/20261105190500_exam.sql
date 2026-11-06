-- Examen y constancias · 20 preguntas, 70% para aprobar
create table if not exists public.exam_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  score integer not null check (score between 0 and 100),
  passed boolean not null,
  answers jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.certificates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  code text not null unique,
  exam_attempt_id uuid references public.exam_attempts (id) on delete set null,
  issued_at timestamptz not null default now()
);

alter table public.exam_attempts enable row level security;
alter table public.certificates enable row level security;
drop policy if exists "exam_attempts_owner" on public.exam_attempts;
create policy "exam_attempts_owner" on public.exam_attempts for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "certificates_owner" on public.certificates;
create policy "certificates_owner" on public.certificates for select using (auth.uid() = user_id);
-- Verificación pública: lectura por código (la página /certificados/verificar)
drop policy if exists "certificates_verify_public" on public.certificates;
create policy "certificates_verify_public" on public.certificates for select using (true);
