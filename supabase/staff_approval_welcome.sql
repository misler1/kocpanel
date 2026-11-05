-- ============================================================
-- Koç/öğretmen hesabı onaylanınca: bildirim + hoş geldiniz mesajı + e-posta
-- ============================================================
-- Yönetici Ayarlar > Öğretmen Yönetimi'nde "Onayla"ya bastığında (profiles.is_approved false → true):
--   1) Panel içi bildirim "Hesabınız onaylandı" (telefon bildirimi push_notifications.sql tetikleyicisiyle gider).
--   2) Onayı veren yöneticiden öğretmene Mesajlar bölümünde hoş geldiniz mesajı (yalnızca ilk onayda).
--   3) Site /api/eposta/hesap-onay ile "hesabınız onaylandı" e-postası gönderir (yalnızca ilk onayda;
--      sitede RESEND_API_KEY tanımlı değilse e-posta atlanır, diğerleri yine çalışır).
-- Bu işlemlerden biri hata verirse onay yine kaydedilir (hata yalnızca uyarı olarak loglanır).
-- ÖNCE notifications.sql, push_notifications.sql ve messaging.sql çalıştırılmış olmalı.
-- Supabase SQL Editor'da BİR KEZ çalıştırın. Tekrar çalıştırmak zararsızdır.
--
-- Geri alma:
--   drop trigger if exists trg_staff_approved on public.profiles;

-- Hoş geldiniz mesajı ve e-postanın bir kez gönderildiğini tutar (onay kaldırılıp tekrar verilirse yinelenmez)
create table if not exists staff_welcomes (
  profile_id uuid primary key references profiles(id) on delete cascade,
  sent_at timestamptz not null default now()
);
alter table staff_welcomes enable row level security; -- politika yok: yalnızca tetikleyici ve service_role
revoke all on staff_welcomes from public, anon, authenticated;
grant all on staff_welcomes to service_role;

insert into app_settings (key, value) values ('approval_email_url', 'https://www.kocdefterim.com.tr/api/eposta/hesap-onay')
  on conflict (key) do nothing;

create or replace function trg_staff_approved()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_name text := coalesce(nullif(trim(new.full_name), ''), 'Hocam');
  v_sender uuid;
  v_conv uuid;
  v_url text;
  v_secret text;
begin
  if new.role not in ('koc', 'ogretmen') or coalesce(old.is_approved, false) or not coalesce(new.is_approved, false) then
    return new;
  end if;

  perform notify_user(new.id, 'hesap', 'Hesabınız onaylandı 🎉',
    'Hoş geldiniz! Artık KoçDefterim panelini kullanabilirsiniz.', '/anasayfa', 0);

  -- Hoş geldiniz mesajı ve e-posta yalnızca bir kez
  insert into staff_welcomes (profile_id) values (new.id) on conflict do nothing;
  if not found then return new; end if;

  -- Gönderen: onayı veren yönetici; değilse ilk yönetici
  select id into v_sender from profiles where id = auth.uid() and is_admin;
  if v_sender is null then
    select id into v_sender from profiles where is_admin and id <> new.id order by created_at limit 1;
  end if;

  if v_sender is not null and v_sender <> new.id then
    select c.id into v_conv from conversations c
      where c.kind = 'direct'
        and exists (select 1 from conversation_participants where conversation_id = c.id and profile_id = v_sender)
        and exists (select 1 from conversation_participants where conversation_id = c.id and profile_id = new.id)
      limit 1;
    if v_conv is null then
      insert into conversations (kind, created_by) values ('direct', v_sender) returning id into v_conv;
      insert into conversation_participants (conversation_id, profile_id, last_read_at)
        values (v_conv, v_sender, now()), (v_conv, new.id, null);
    end if;
    insert into messages (conversation_id, sender_id, content) values (v_conv, v_sender,
      'Merhaba ' || v_name || ', KoçDefterim''e hoş geldiniz! 🎉' || E'\n\n' ||
      'Hesabınız onaylandı. Öğrencilerinizi "Öğrenciler" bölümünden ekleyebilir; haftalık programlarını, ' ||
      'deneme sonuçlarını ve görüşmelerini panelden takip edebilirsiniz.' || E'\n\n' ||
      'Aklınıza takılan bir şey olursa bu sohbetten bana yazabilirsiniz. Kolay gelsin!');
    update conversations set last_message_at = now() where id = v_conv;
    update conversation_participants set last_read_at = now() where conversation_id = v_conv and profile_id = v_sender;
  end if;

  -- E-posta: site gönderir (istek işlem kaydedildikten sonra çıkar)
  select value into v_url from app_settings where key = 'approval_email_url';
  select value into v_secret from app_settings where key = 'push_secret';
  if v_url is not null and v_secret is not null then
    perform net.http_post(
      url := v_url,
      body := jsonb_build_object('id', new.id),
      headers := jsonb_build_object('Content-Type', 'application/json', 'x-push-secret', v_secret),
      timeout_milliseconds := 5000
    );
  end if;
  return new;
exception when others then
  raise warning 'trg_staff_approved: %', sqlerrm;
  return new; -- onay her durumda kaydedilsin
end $$;
revoke all on function trg_staff_approved() from public, anon, authenticated;

drop trigger if exists trg_staff_approved on profiles;
create trigger trg_staff_approved after update of is_approved on profiles
  for each row execute function trg_staff_approved();

notify pgrst, 'reload schema';
