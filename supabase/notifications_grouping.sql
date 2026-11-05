-- ============================================================
-- Mesaj bildirimleri sohbet başına tek bildirimde birikir
-- ============================================================
-- Önce: aynı kişiden art arda gelen mesajlar, 30 dakika geçince ya da bildirim okununca ayrı ayrı bildirim oluyordu.
-- Şimdi: her sohbet için tek bildirim satırı tutulur; yeni mesaj gelince o satır güncellenir (son mesaj metni,
-- "n yeni mesaj" sayısı, zaman), okunmamış hale gelir ve en üste çıkar. Telefon bildirimi aynen gider
-- (push_notifications.sql tetikleyicisi 'mesaj' güncellemelerini de gönderir; telefonda da sohbet başına tek bildirim).
-- Diğer bildirim türleri değişmez. notify_user'ın imzası aynı kalır; send_message'a dokunulmaz.
-- Supabase SQL Editor'da BİR KEZ çalıştırın. Tekrar çalıştırmak zararsızdır.

alter table notifications add column if not exists group_count int not null default 1;

create or replace function notify_user(
  p_recipient uuid, p_kind text, p_title text, p_body text, p_link text, p_dedupe_minutes int default 0
) returns void language plpgsql security definer set search_path = public as $$
declare
  v_existing notifications%rowtype;
begin
  if p_recipient is null then return; end if;

  -- Mesaj: aynı sohbetin bildirimi (okunmuş olsa da) güncellenir
  if p_kind = 'mesaj' and p_link is not null then
    select * into v_existing from notifications
      where recipient_id = p_recipient and kind = 'mesaj' and link = p_link
      order by created_at desc limit 1;
    if v_existing.id is not null then
      update notifications set
        title = p_title,
        body = p_body,
        group_count = case when v_existing.read_at is null then v_existing.group_count + 1 else 1 end,
        read_at = null,
        created_at = now()
      where id = v_existing.id;
      return;
    end if;
    insert into notifications (recipient_id, kind, title, body, link) values (p_recipient, p_kind, p_title, p_body, p_link);
    return;
  end if;

  if p_dedupe_minutes > 0 then
    select * into v_existing from notifications
      where recipient_id = p_recipient and kind = p_kind and link is not distinct from p_link
        and read_at is null and created_at > now() - make_interval(mins => p_dedupe_minutes)
      order by created_at desc limit 1;
    if v_existing.id is not null then
      update notifications set title = p_title, body = p_body, created_at = now() where id = v_existing.id;
      return;
    end if;
  end if;
  insert into notifications (recipient_id, kind, title, body, link) values (p_recipient, p_kind, p_title, p_body, p_link);
end $$;
revoke all on function notify_user(uuid, text, text, text, text, int) from public, anon, authenticated;

-- Push tetikleyicisi read_at değişince (null'a dönünce) de gönderebilsin diye created_at güncellemesi yeterli;
-- mevcut _push_notification yalnızca 'mesaj' güncellemelerini ve okunmamışları gönderir, değişiklik gerekmez.

notify pgrst, 'reload schema';
