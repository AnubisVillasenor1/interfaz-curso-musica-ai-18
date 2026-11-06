-- Play and Go · Storage para las canciones
--
-- El audio que genera el proveedor vive en su CDN y caduca; el que genera el
-- motor local no existe fuera de la pestaña del navegador. Los dos casos
-- necesitan un sitio propio, o la biblioteca se llena de enlaces muertos.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'song-audio',
  'song-audio',
  false,
  -- 25 MB: una pista de 5 minutos a 44.1 kHz estéreo en WAV sin comprimir pasa
  -- de 50 MB, así que el render local guarda MP3/AAC cuando puede.
  26_214_400,
  array['audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/mp4', 'audio/x-wav']
)
on conflict (id) do nothing;

-- Ruta de objeto: <user_id>/<song_id>.audio — el prefijo es la política.
create policy "song-audio: el dueño sube a su carpeta"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'song-audio'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
  );

create policy "song-audio: el dueño lee sus archivos"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'song-audio'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
  );

create policy "song-audio: el dueño reemplaza sus archivos"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'song-audio'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
  );

create policy "song-audio: el dueño borra sus archivos"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'song-audio'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
  );

-- El bucket es privado: la biblioteca se sirve con URLs firmadas de corta
-- duración desde la API, no con enlaces públicos indefinidos.
