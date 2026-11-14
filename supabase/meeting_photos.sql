-- Görüşme kayıtlarına defter fotoğrafı: görüşme notları deftere alındıysa fotoğrafı yüklenir (isteğe bağlı olarak
-- yapay zekâ yazıyı okuyup notlara ekler). Fotoğraflar herkese kapalı "gorusme-fotolari" deposunda durur; yalnızca
-- sunucu (öğrenciyi görebilen kullanıcı için) kısa süreli bağlantıyla açar: /api/gorusme/foto
-- Supabase SQL Editor'da bir kez çalıştırın (tekrar çalıştırmak güvenli).

alter table meetings add column if not exists photos text[] not null default '{}';

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('gorusme-fotolari', 'gorusme-fotolari', false, 10485760, array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'])
on conflict (id) do update set public = false;

notify pgrst, 'reload schema';
