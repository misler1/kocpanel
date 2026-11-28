-- ============================================================
-- "Bize bildir": koç, öğrenci ve personel ana sayfadaki düğmeyle sorun/öneri/mesaj iletir.
-- Yöneticilere zil bildirimi gider; Ayarlar > Geri bildirimler'de listelenir. Yönetici "Çözüldü" deyip not yazarsa
-- bildiren kişiye bildirim gider. Kod: src/components/FeedbackButton.tsx, src/app/ayarlar/geri-bildirimler
-- ÖNCE notifications.sql (notify_user) çalıştırılmış olmalı. Supabase SQL Editor'da BİR KEZ çalıştırın;
-- tekrar çalıştırmak zararsızdır.
--
-- Geri alma: drop table if exists public.feedback_reports cascade;
-- ============================================================

create table if not exists public.feedback_reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references profiles(id) on delete cascade,
  kind text not null check (kind in ('sorun', 'oneri', 'diger')),
  message text not null check (length(trim(message)) between 1 and 4000),
  page text check (page is null or length(page) <= 300),
  user_agent text check (user_agent is null or length(user_agent) <= 400),
  status text not null default 'yeni' check (status in ('yeni', 'inceleniyor', 'cozuldu')),
  admin_note text check (admin_note is null or length(admin_note) <= 2000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_feedback_reports_created on public.feedback_reports(created_at desc);

alter table public.feedback_reports enable row level security;
revoke all on public.feedback_reports from public, anon, authenticated;
grant select, insert on public.feedback_reports to authenticated;

drop policy if exists feedback_insert_own on public.feedback_reports;
create policy feedback_insert_own on public.feedback_reports for insert to authenticated
  with check (user_id = auth.uid() and status = 'yeni' and admin_note is null);
drop policy if exists feedback_read on public.feedback_reports;
create policy feedback_read on public.feedback_reports for select to authenticated
  using (user_id = auth.uid() or public.is_admin_user());

-- Yeni bildirim → yöneticilere zil bildirimi
create or replace function _feedback_notify() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  r record;
  v_name text;
begin
  select full_name into v_name from profiles where id = new.user_id;
  for r in select id from profiles where coalesce(is_admin, false) and id <> new.user_id loop
    perform notify_user(r.id, 'geri_bildirim',
      case new.kind when 'sorun' then 'Sorun bildirimi 🐞' when 'oneri' then 'Yeni öneri 💡' else 'Yeni mesaj ✉️' end,
      coalesce(v_name, 'Bir kullanıcı') || ': ' || left(new.message, 140), '/ayarlar/geri-bildirimler', 0);
  end loop;
  return new;
exception when others then
  raise warning '_feedback_notify: %', sqlerrm; -- bildirim gitmese de kayıt kalır
  return new;
end $$;
revoke all on function _feedback_notify() from public, anon, authenticated;
drop trigger if exists trg_feedback_notify on public.feedback_reports;
create trigger trg_feedback_notify after insert on public.feedback_reports for each row execute function _feedback_notify();

-- Yönetici: liste (bildirenin adı ve rolüyle)
create or replace function feedback_admin_list()
returns table (id uuid, user_id uuid, full_name text, role text, email text, kind text, message text, page text,
               user_agent text, status text, admin_note text, created_at timestamptz, updated_at timestamptz)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_admin_user() then raise exception 'Yalnızca yönetici'; end if;
  return query
  select f.id, f.user_id, p.full_name, p.role::text, p.email, f.kind, f.message, f.page, f.user_agent, f.status, f.admin_note,
         f.created_at, f.updated_at
  from feedback_reports f left join profiles p on p.id = f.user_id
  order by (f.status = 'cozuldu'), f.created_at desc
  limit 500;
end $$;

-- Yönetici: durum ve not. "Çözüldü"ye geçince bildirene bildirim gider (not varsa notla).
create or replace function feedback_admin_update(p_id uuid, p_status text, p_note text default null) returns void
language plpgsql security definer set search_path = public as $$
declare
  f feedback_reports%rowtype;
begin
  if not public.is_admin_user() then raise exception 'Yalnızca yönetici'; end if;
  if p_status not in ('yeni', 'inceleniyor', 'cozuldu') then raise exception 'Geçersiz durum'; end if;
  select * into f from feedback_reports where id = p_id for update;
  if not found then raise exception 'Bulunamadı'; end if;
  update feedback_reports set status = p_status, admin_note = nullif(trim(coalesce(p_note, '')), ''), updated_at = now() where id = p_id;
  if p_status = 'cozuldu' and f.status <> 'cozuldu' and f.user_id <> auth.uid() then
    perform notify_user(f.user_id, 'geri_bildirim', 'Bildiriminiz için teşekkürler ✅',
      coalesce(nullif(trim(coalesce(p_note, '')), ''), 'İlettiğiniz konu ele alındı.'), null, 0);
  end if;
end $$;

create or replace function feedback_admin_delete(p_id uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin_user() then raise exception 'Yalnızca yönetici'; end if;
  delete from feedback_reports where id = p_id;
end $$;

do $$
declare fn text;
begin
  foreach fn in array array['feedback_admin_list()', 'feedback_admin_update(uuid, text, text)', 'feedback_admin_delete(uuid)'] loop
    execute format('revoke all on function %s from public, anon', fn);
    execute format('grant execute on function %s to authenticated', fn);
  end loop;
end $$;

notify pgrst, 'reload schema';
