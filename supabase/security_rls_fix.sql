-- ACİL GÜVENLİK DÜZELTMESİ: profiles, conversations, conversation_participants, messages tablolarında RLS kapalıydı.
-- RLS kapalıyken politikalar uygulanmaz; tarayıcıdaki anon anahtarla tüm profiller ve mesajlar okunabilir/değiştirilebilir,
-- canlı (realtime) mesaj dinleyicisi de herkesin mesajını herkese iletir.
--
-- ÖNCE test_rls_profiles.sql'i çalıştırıp sonucun doğru olduğunu görün; bu dosya o testtekiyle aynı değişiklikleri kalıcı yapar.
--
-- Mesajlaşma yazma işlemleri SECURITY DEFINER fonksiyonlarla (send_message, start_direct_conversation, ...) yapıldığı için
-- bu tablolarda RLS'i açmak yeterli. profiles için uygulamanın ihtiyaç duyduğu dar okuma/güncelleme politikaları eklenir:
--   • Onaylı koç/öğretmen, diğer koç/öğretmen profillerini okuyabilir (stajyer listeleri, görüşmeyi oluşturan adı, ajanda).
--   • Yönetici tüm profilleri okuyabilir ve güncelleyebilir (Ayarlar > öğretmen onayı / yönetici / kayıt formunda görünme).
--   Yetki alanlarının (role, is_admin, is_approved) korunması mevcut protect_profile_privileged_columns tetikleyicisiyle sürer.
-- Öğrenci ve veli yalnızca kendi profilini görür (mevcut profiles_self_select).
--
-- Politikalarda kullanılan fonksiyonlar 'authenticated' rolünce çalıştırılabilmeli; yoksa politika "permission denied for function"
-- hatası verir ve kullanıcı kendi profilini de okuyamaz (ilk denemede _is_staff bu yüzden herkesi "Onay bekleniyor"a düşürdü).
-- auth_is_staff() parametre almaz, yalnızca oturumdaki kullanıcıyı kontrol eder; başkası hakkında bilgi vermez.
--
-- Geri alma (sorun çıkarsa):
--   alter table public.profiles disable row level security;
--   alter table public.conversations disable row level security;
--   alter table public.conversation_participants disable row level security;
--   alter table public.messages disable row level security;

begin;

create or replace function public.auth_is_staff() returns boolean
  language sql stable security definer set search_path = public as
  $f$ select exists (select 1 from profiles where id = auth.uid() and role in ('koc', 'ogretmen') and coalesce(is_approved, false)) $f$;
revoke all on function public.auth_is_staff() from public, anon;
grant execute on function public.auth_is_staff() to authenticated;
grant execute on function public.is_admin_user() to authenticated;
grant execute on function public.is_conversation_member(uuid) to authenticated;

drop policy if exists profiles_staff_read_staff on public.profiles;
create policy profiles_staff_read_staff on public.profiles for select to authenticated
  using (role in ('koc', 'ogretmen') and public.auth_is_staff());

drop policy if exists profiles_admin_read_all on public.profiles;
create policy profiles_admin_read_all on public.profiles for select to authenticated
  using (public.is_admin_user());

drop policy if exists profiles_admin_update_all on public.profiles;
create policy profiles_admin_update_all on public.profiles for update to authenticated
  using (public.is_admin_user()) with check (public.is_admin_user());

alter table public.profiles enable row level security;
alter table public.conversations enable row level security;
alter table public.conversation_participants enable row level security;
alter table public.messages enable row level security;

-- Oturumsuz (anon) erişime bu tablolarda gerek yok: politikalar zaten auth.uid() ister, yine de yetkiyi kaldır.
revoke all on public.profiles, public.conversations, public.conversation_participants, public.messages from anon;

commit;

-- Kontrol: dört satırın hepsinde rls = true olmalı
select relname, relrowsecurity as rls from pg_class
where relnamespace = 'public'::regnamespace
  and relname in ('profiles', 'conversations', 'conversation_participants', 'messages');
