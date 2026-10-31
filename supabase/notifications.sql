-- ============================================================
-- Bildirimler (Aşama 2) — panel içi 🔔 zil
-- ============================================================
-- Bildirimler veritabanı tetikleyicileriyle üretilir; olay hangi ekrandan/API'den yapılırsa yapılsın düşer.
--   • Yeni öğrenci başvurusu            → yöneticiler (is_admin)
--   • Başvuru koç onayına gönderildi     → atanan koç
--   • Başvuru onaylandı                  → öğrenci
--   • Yeni koç kaydı                     → yöneticiler
--   • Öğrenci program talebi             → koç
--   • Program talebi sonuçlandı          → öğrenci
--   • Koç programa görev ekledi          → öğrenci (aynı haftaya art arda eklenenler tek bildirim)
--   • Yeni deneme sonucu                 → öğrenci
-- Mesaj bildirimleri mesajlaşma aşamasında aynı tabloya eklenecek.
-- Supabase SQL Editor'da BİR KEZ çalıştırın. Mevcut veriyi değiştirmez; tekrar çalıştırmak zararsızdır.

create table if not exists notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references profiles(id) on delete cascade,
  kind text not null,
  title text not null,
  body text,
  link text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists idx_notifications_recipient on notifications(recipient_id, created_at desc);
create index if not exists idx_notifications_unread on notifications(recipient_id) where read_at is null;

alter table notifications enable row level security;

drop policy if exists "notifications_own_select" on notifications;
create policy "notifications_own_select" on notifications for select using (recipient_id = auth.uid());

drop policy if exists "notifications_own_update" on notifications;
create policy "notifications_own_update" on notifications for update
  using (recipient_id = auth.uid()) with check (recipient_id = auth.uid());

drop policy if exists "notifications_own_delete" on notifications;
create policy "notifications_own_delete" on notifications for delete using (recipient_id = auth.uid());

-- Kullanıcı yalnızca okundu bilgisini değiştirebilir (başlık/metin/bağlantı değiştirilemez)
create or replace function protect_notification_update()
returns trigger language plpgsql as $$
begin
  -- current_user: doğrudan kullanıcı isteğinde 'authenticated'; tetikleyici/fonksiyon (security definer) içinde sahibi olur
  if current_user = 'authenticated' and
     (to_jsonb(new) - 'read_at') is distinct from (to_jsonb(old) - 'read_at') then
    raise exception 'Bildirimin yalnızca okundu bilgisi değiştirilebilir';
  end if;
  return new;
end $$;
drop trigger if exists trg_protect_notification_update on notifications;
create trigger trg_protect_notification_update before update on notifications
  for each row execute function protect_notification_update();

-- Ekleme yalnızca tetikleyicilerden ve sunucudan (service_role) yapılır; kullanıcıya insert yetkisi verilmez
grant select, update, delete on notifications to authenticated;
grant all on notifications to service_role;

-- Canlı zil için Realtime yayını
do $$ begin
  alter publication supabase_realtime add table notifications;
exception when duplicate_object then null; when undefined_object then null;
end $$;

-- ---------- Yardımcı: bildirim üret ----------
-- p_dedupe_minutes > 0 ise: aynı alıcıya aynı tür+bağlantı ile bu süre içinde okunmamış bildirim varsa yenisi açılmaz,
-- yalnızca mevcut bildirimin zamanı/metni güncellenir (örn. koç 20 görev ekleyince 20 bildirim yerine 1).
create or replace function notify_user(
  p_recipient uuid, p_kind text, p_title text, p_body text, p_link text, p_dedupe_minutes int default 0
) returns void language plpgsql security definer set search_path = public as $$
declare
  v_existing uuid;
begin
  if p_recipient is null then return; end if;
  if p_dedupe_minutes > 0 then
    select id into v_existing from notifications
      where recipient_id = p_recipient and kind = p_kind and link is not distinct from p_link
        and read_at is null and created_at > now() - make_interval(mins => p_dedupe_minutes)
      order by created_at desc limit 1;
    if v_existing is not null then
      update notifications set title = p_title, body = p_body, created_at = now() where id = v_existing;
      return;
    end if;
  end if;
  insert into notifications (recipient_id, kind, title, body, link) values (p_recipient, p_kind, p_title, p_body, p_link);
end $$;
revoke all on function notify_user(uuid, text, text, text, text, int) from public, anon, authenticated;

create or replace function notify_admins(p_kind text, p_title text, p_body text, p_link text)
returns void language plpgsql security definer set search_path = public as $$
declare r record;
begin
  for r in select id from profiles where is_admin = true loop
    perform notify_user(r.id, p_kind, p_title, p_body, p_link, 0);
  end loop;
end $$;
revoke all on function notify_admins(text, text, text, text) from public, anon, authenticated;

-- ---------- Öğrenci başvuruları ----------
create or replace function trg_notify_student_registration()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if TG_OP = 'INSERT' then
    perform notify_admins('basvuru', 'Yeni öğrenci başvurusu', new.full_name || ' kayıt oldu, onayınızı bekliyor.', '/ayarlar');
  elsif new.status is distinct from old.status then
    if new.status = 'koc_bekliyor' then
      perform notify_user(new.assigned_coach_id, 'basvuru', 'Öğrenci başvurusu onayınızda',
        new.full_name || ' size atandı. Başvuruyu inceleyin.', '/ogrenciler', 0);
    elsif new.status = 'onaylandi' then
      perform notify_user(new.profile_id, 'basvuru', 'Kaydın onaylandı 🎉',
        'Hoş geldin! Artık panelini kullanabilirsin.', '/ogrenci', 0);
    end if;
  end if;
  return new;
end $$;
drop trigger if exists trg_notify_student_registration on student_registrations;
create trigger trg_notify_student_registration after insert or update on student_registrations
  for each row execute function trg_notify_student_registration();

-- ---------- Yeni koç kaydı ----------
create or replace function trg_notify_new_coach()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.role = 'koc' and coalesce(new.is_approved, false) = false then
    perform notify_admins('koc', 'Yeni koç kaydı', coalesce(new.full_name, 'Bir koç') || ' kayıt oldu, onayınızı bekliyor.', '/ayarlar');
  end if;
  return new;
end $$;
drop trigger if exists trg_notify_new_coach on profiles;
create trigger trg_notify_new_coach after insert on profiles
  for each row execute function trg_notify_new_coach();

-- ---------- Haftalık program talepleri ----------
create or replace function trg_notify_plan_request()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_student students%rowtype;
  v_what text;
begin
  select * into v_student from students where id = new.student_id;
  v_what := case new.kind when 'yeni_program' then 'yeni program' else 'program değişikliği' end;
  if TG_OP = 'INSERT' then
    perform notify_user(new.coach_id, 'plan_talebi', 'Program talebi',
      v_student.full_name || ' ' || v_what || ' istedi.', '/haftalik-takip', 0);
  elsif new.status is distinct from old.status and new.status in ('onaylandi', 'reddedildi') then
    perform notify_user(v_student.profile_id, 'plan_talebi',
      case when new.status = 'onaylandi' then
        case when new.kind = 'yeni_program' then 'Yeni programın hazır 🎉' else 'Değişiklik talebin onaylandı ✅' end
      else 'Talebin reddedildi' end,
      case when new.status = 'onaylandi' then 'Haftalık programına göz at.' else 'Koçunla konuşabilirsin.' end,
      '/ogrenci/haftalik-takip', 0);
  end if;
  return new;
end $$;
drop trigger if exists trg_notify_plan_request on weekly_plan_requests;
create trigger trg_notify_plan_request after insert or update on weekly_plan_requests
  for each row execute function trg_notify_plan_request();

-- ---------- Koç programa görev ekledi ----------
create or replace function trg_notify_new_task()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_profile uuid;
begin
  if coalesce(new.student_added, false) then return new; end if; -- öğrencinin kendi eklediği görev
  select profile_id into v_profile from students where id = new.student_id;
  if v_profile is null or v_profile = auth.uid() then return new; end if;
  perform notify_user(v_profile, 'gorev', 'Programına yeni görev eklendi 📋',
    'Koçun haftalık programını güncelledi.', '/ogrenci/haftalik-takip', 60);
  return new;
end $$;
drop trigger if exists trg_notify_new_task on question_logs;
create trigger trg_notify_new_task after insert on question_logs
  for each row execute function trg_notify_new_task();

-- ---------- Yeni deneme sonucu ----------
create or replace function trg_notify_new_exam()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_profile uuid;
begin
  select profile_id into v_profile from students where id = new.student_id;
  if v_profile is null or v_profile = auth.uid() then return new; end if;
  perform notify_user(v_profile, 'deneme', 'Yeni deneme sonucun var 📊',
    coalesce(new.exam_name, 'Deneme') || ' sonucun eklendi. Karnene göz at!', '/ogrenci/denemeler', 30);
  return new;
end $$;
drop trigger if exists trg_notify_new_exam on exams;
create trigger trg_notify_new_exam after insert on exams
  for each row execute function trg_notify_new_exam();

notify pgrst, 'reload schema';
