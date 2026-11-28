-- ============================================================
-- "Bize bildir"e fotoğraf / ekran görüntüsü (en fazla 3). Fotoğraflar herkese kapalı "geri-bildirim-fotolari"
-- deposunda durur; yalnızca sunucu kısa süreli bağlantıyla açar (gönderen kişi ve yönetici): /api/geri-bildirim/foto
-- Yol biçimi: <kullanıcı id>/<rastgele id>.<uzantı> — kişi yalnızca kendi yüklediği fotoğrafı ekleyebilir.
-- ÖNCE geri_bildirim.sql çalıştırılmış olmalı. Supabase SQL Editor'da BİR KEZ çalıştırın; tekrar çalıştırmak zararsızdır.
--
-- Geri alma: alter table feedback_reports drop column photos; (depodaki dosyalar Storage'dan silinir)
-- ============================================================

alter table public.feedback_reports add column if not exists photos text[] not null default '{}';
alter table public.feedback_reports drop constraint if exists feedback_photos_max;
alter table public.feedback_reports add constraint feedback_photos_max check (cardinality(photos) <= 3);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('geri-bildirim-fotolari', 'geri-bildirim-fotolari', false, 10485760, array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'])
on conflict (id) do update set public = false;

-- Ekleme: yalnızca kendi klasöründeki fotoğraflar
drop policy if exists feedback_insert_own on public.feedback_reports;
create policy feedback_insert_own on public.feedback_reports for insert to authenticated
  with check (
    user_id = auth.uid() and status = 'yeni' and admin_note is null
    and not exists (select 1 from unnest(photos) p where p not like auth.uid()::text || '/%')
  );

-- Yönetici listesi fotoğraflarla (dönüş tipi değiştiği için önce kaldırılır)
drop function if exists feedback_admin_list();
create function feedback_admin_list()
returns table (id uuid, user_id uuid, full_name text, role text, email text, kind text, message text, page text,
               user_agent text, status text, admin_note text, created_at timestamptz, updated_at timestamptz, photos text[])
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_admin_user() then raise exception 'Yalnızca yönetici'; end if;
  return query
  select f.id, f.user_id, p.full_name, p.role::text, p.email, f.kind, f.message, f.page, f.user_agent, f.status, f.admin_note,
         f.created_at, f.updated_at, f.photos
  from feedback_reports f left join profiles p on p.id = f.user_id
  order by (f.status = 'cozuldu'), f.created_at desc
  limit 500;
end $$;
revoke all on function feedback_admin_list() from public, anon;
grant execute on function feedback_admin_list() to authenticated;

notify pgrst, 'reload schema';
