-- ============================================================
-- Telefon bildirimleri (Web Push) — PWA
-- ============================================================
-- Panel içi bildirim (notifications tablosu) oluştuğunda, alıcının bildirime izin verdiği cihazlarına
-- telefon bildirimi de gönderilir:
--   1) Tarayıcı izin verince cihaz aboneliği push_subscriptions'a yazılır (/api/push/subscription).
--   2) notifications'a satır eklenince tetikleyici pg_net ile /api/push/send'e bildirim kimliğini yollar.
--   3) Site, bildirimi ve aboneleri service_role ile okuyup Web Push gönderir.
-- Gizli anahtarlar (tetikleyici parolası, VAPID anahtarları) app_settings'te durur; tarayıcıdan okunamaz.
-- VAPID anahtarları ilk kullanımda sitede otomatik üretilip buraya yazılır.
-- Supabase SQL Editor'da BİR KEZ çalıştırın. Tekrar çalıştırmak zararsızdır, anahtarları değiştirmez.

create extension if not exists pg_net;

-- ---------- Sunucuya özel ayarlar ----------
create table if not exists app_settings (
  key text primary key,
  value text not null,
  updated_at timestamptz not null default now()
);
alter table app_settings enable row level security; -- politika yok: yalnızca service_role / security definer
revoke all on app_settings from public, anon, authenticated;
grant all on app_settings to service_role;

insert into app_settings (key, value) values ('push_url', 'https://www.kocdefterim.com.tr/api/push/send')
  on conflict (key) do nothing;
insert into app_settings (key, value)
  values ('push_secret', replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', ''))
  on conflict (key) do nothing;

-- ---------- Cihaz abonelikleri ----------
create table if not exists push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  user_agent text,
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);
create index if not exists idx_push_subscriptions_user on push_subscriptions(user_id);
alter table push_subscriptions enable row level security; -- politika yok: kayıt/silme sunucu API'si üzerinden
revoke all on push_subscriptions from public, anon, authenticated;
grant all on push_subscriptions to service_role;

-- ---------- Bildirim → telefon ----------
-- Yeni bildirimde gönderilir. notify_user'ın birleştirdiği (dedupe) bildirimlerde yalnızca mesajlar tekrar
-- gönderilir: art arda gelen mesajlar telefona düşsün, ama koçun eklediği 20 görev 20 kez çalmasın.
create or replace function _push_notification()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_url text;
  v_secret text;
begin
  if TG_OP = 'UPDATE' then
    if new.created_at is not distinct from old.created_at or new.kind <> 'mesaj' or new.read_at is not null then
      return new;
    end if;
  end if;
  if not exists (select 1 from push_subscriptions where user_id = new.recipient_id) then return new; end if;
  select value into v_url from app_settings where key = 'push_url';
  select value into v_secret from app_settings where key = 'push_secret';
  if v_url is null or v_secret is null then return new; end if;
  perform net.http_post(
    url := v_url,
    body := jsonb_build_object('id', new.id),
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-push-secret', v_secret),
    timeout_milliseconds := 5000
  );
  return new;
exception when others then
  return new; -- telefon bildirimi gönderilemese de panel bildirimi kaydedilmeli
end $$;
revoke all on function _push_notification() from public, anon, authenticated;

drop trigger if exists trg_push_notification on notifications;
create trigger trg_push_notification after insert or update of created_at on notifications
  for each row execute function _push_notification();

notify pgrst, 'reload schema';
