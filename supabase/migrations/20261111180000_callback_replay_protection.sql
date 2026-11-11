-- P1-002 · Expiración y nonce de un solo uso en callbacks de generación.
--
-- La firma anterior cubría únicamente `songId`: valía para siempre y no
-- distinguía una notificación de otra. Una URL filtrada podía reutilizarse y no
-- había forma de demostrar que un callback ya se había procesado (más allá del
-- estado de la canción).
--
-- La URL que se entrega al proveedor ahora incluye `exp` y `nonce`. Este
-- ticket registra el nonce y su caducidad; el callback sólo se acepta una vez
-- por ticket. El consumo se hace después de aplicar un resultado terminal, de
-- modo que un fallo de base de datos no quema el reintento del proveedor.
--
-- Rollback: `drop function public.consume_generation_callback_ticket(text, uuid)`
-- y `drop table public.generation_callback_tickets`. Las URLs ya emitidas dejan
-- de validar si el código nuevo sigue activo.

create table if not exists public.generation_callback_tickets (
  nonce text primary key,
  song_id uuid not null references public.songs (id) on delete cascade,
  expires_at timestamptz not null,
  consumed_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.generation_callback_tickets enable row level security;
-- Sin políticas: sólo `service_role` desde la ruta Node.js.
revoke all on table public.generation_callback_tickets from public, anon, authenticated;
grant select, insert, update on table public.generation_callback_tickets to service_role;

create index if not exists generation_callback_tickets_expiry_idx
  on public.generation_callback_tickets (expires_at);

create or replace function public.consume_generation_callback_ticket(
  p_nonce text,
  p_song_id uuid
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  ticket public.generation_callback_tickets%rowtype;
begin
  if p_nonce is null or btrim(p_nonce) = '' or p_song_id is null then
    return 'invalid';
  end if;

  -- UPDATE condicional: dos callbacks concurrentes no pueden consumir el mismo
  -- nonce. El primero actualiza; el segundo no encuentra fila y cae al
  -- diagnóstico de abajo.
  update public.generation_callback_tickets
     set consumed_at = now()
   where nonce = p_nonce
     and song_id = p_song_id
     and consumed_at is null
     and expires_at > now()
   returning * into ticket;

  if found then
    -- Limpieza oportunista de tickets vencidos hace más de un día.
    delete from public.generation_callback_tickets
     where expires_at < now() - interval '1 day';
    return 'consumed';
  end if;

  select * into ticket
    from public.generation_callback_tickets
   where nonce = p_nonce;

  if not found then return 'not_found'; end if;
  if ticket.song_id is distinct from p_song_id then return 'song_mismatch'; end if;
  if ticket.consumed_at is not null then return 'replay'; end if;
  return 'expired';
end;
$$;

revoke all on function public.consume_generation_callback_ticket(text, uuid)
  from public, anon, authenticated;
grant execute on function public.consume_generation_callback_ticket(text, uuid)
  to service_role;

-- Retención: los tickets consumidos o vencidos no hacen falta pasados 30 días.
-- Se puede programar con pg_cron; si no está disponible, el DELETE oportunista
-- de la función mantiene la tabla acotada.
