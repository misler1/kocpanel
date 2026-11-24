-- ============================================================
-- Mesajlar: sohbete (kişiye) özel okundu bilgisi + sessize alma
-- ============================================================
-- * Okundu bilgisi artık sohbet bazında açılıp kapatılabilir (sohbetin ⋮ menüsü).
--   conversation_participants.read_receipts: boş = genel ayara uy (profiles.read_receipts, sohbet listesinin üstündeki ayar),
--   true/false = bu sohbete özel. Karşılıklıdır: o sohbette kapatan, okuduğunu göstermez, karşı tarafınkini de göremez.
-- * Sessize alma: conversation_participants.muted_until (bu ana kadar; 9999 yılı = süresiz).
--   Sessizdeki sohbetin mesajları için 🔔 bildirim ve telefon bildirimi gelmez; mesajlar ve okunmamış sayısı yine görünür.
-- mesaj_okundu_duzenleme.sql'den SONRA çalıştırın. Tekrar çalıştırmak zararsızdır.

alter table conversation_participants add column if not exists read_receipts boolean;
alter table conversation_participants add column if not exists muted_until timestamptz;

-- Bir kişinin bir sohbetteki geçerli okundu ayarı
create or replace function _conv_receipts(p_conv uuid, p_profile uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce(
    (select cp.read_receipts from conversation_participants cp where cp.conversation_id = p_conv and cp.profile_id = p_profile),
    (select p.read_receipts from profiles p where p.id = p_profile),
    true);
$$;
revoke all on function _conv_receipts(uuid, uuid) from public, anon, authenticated;

create or replace function conversation_read_state(p_conv uuid)
returns table (profile_id uuid, read_at timestamptz)
language sql stable security definer set search_path = public as $$
  select cp.profile_id,
    case when _conv_receipts(p_conv, cp.profile_id) and _conv_receipts(p_conv, auth.uid()) then cp.last_read_at end
  from conversation_participants cp
  where cp.conversation_id = p_conv and cp.profile_id <> auth.uid() and is_conversation_member(p_conv);
$$;

-- p_on: true/false = bu sohbete özel; null = genel ayara dön
create or replace function set_conversation_receipts(p_conv uuid, p_on boolean)
returns void language plpgsql security definer set search_path = public as $$
begin
  update conversation_participants set read_receipts = p_on where conversation_id = p_conv and profile_id = auth.uid();
  if not found then raise exception 'Sohbet bulunamadı'; end if;
end $$;

-- p_until: bu ana kadar sessiz; null = sessizden çıkar
create or replace function set_conversation_mute(p_conv uuid, p_until timestamptz)
returns void language plpgsql security definer set search_path = public as $$
begin
  update conversation_participants set muted_until = p_until where conversation_id = p_conv and profile_id = auth.uid();
  if not found then raise exception 'Sohbet bulunamadı'; end if;
end $$;

-- Sessizdeki sohbetin mesaj bildirimi oluşturulmaz (yeni satır = telefon bildirimi; birleştirme = yeniden çalma)
create or replace function _skip_muted_message_notification()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_conv uuid;
begin
  if new.kind <> 'mesaj' then return new; end if;
  -- Güncellemede yalnızca yeni mesajla "yeniden çalma" (created_at yenilenmesi) engellenir; okundu işaretleme vb. serbest
  if TG_OP = 'UPDATE' and new.created_at is not distinct from old.created_at then return new; end if;
  begin
    v_conv := substring(new.link from '\?c=([0-9a-fA-F-]{36})')::uuid;
  exception when others then return new;
  end;
  if v_conv is not null and exists (
       select 1 from conversation_participants
        where conversation_id = v_conv and profile_id = new.recipient_id and muted_until > now()) then
    return null; -- eklenmez / güncellenmez
  end if;
  return new;
end $$;
revoke all on function _skip_muted_message_notification() from public, anon, authenticated;

drop trigger if exists trg_skip_muted_message_notification on notifications;
create trigger trg_skip_muted_message_notification before insert or update on notifications
  for each row execute function _skip_muted_message_notification();

-- Sohbet listesi: sessiz ve okundu ayarı da döner (dönüş tipi değiştiği için önce kaldırılır)
drop function if exists my_conversations();
create function my_conversations()
returns table (
  id uuid, kind text, title text, other_id uuid, other_role text, member_count int, created_by uuid,
  last_message text, last_sender uuid, last_at timestamptz, unread int,
  muted_until timestamptz, read_receipts boolean, read_receipts_custom boolean
) language sql stable security definer set search_path = public as $$
  select c.id, c.kind,
    case when c.kind = 'group' then c.title else op.full_name end,
    case when c.kind = 'direct' then op.id end,
    case when c.kind = 'direct' then op.role::text end,
    (select count(*)::int from conversation_participants x where x.conversation_id = c.id),
    c.created_by,
    case when lm.deleted_at is not null then '🚫 Mesaj geri alındı' else lm.content end,
    lm.sender_id, coalesce(lm.created_at, c.created_at),
    (select count(*)::int from messages m where m.conversation_id = c.id and m.sender_id <> auth.uid()
       and m.deleted_at is null
       and (me.last_read_at is null or m.created_at > me.last_read_at)
       and not exists (select 1 from message_hides h where h.message_id = m.id and h.profile_id = auth.uid())
       and not exists (select 1 from user_blocks b where b.blocker_id = auth.uid() and b.blocked_id = m.sender_id)),
    case when me.muted_until > now() then me.muted_until end,
    coalesce(me.read_receipts, (select p.read_receipts from profiles p where p.id = auth.uid()), true),
    me.read_receipts is not null
  from conversation_participants me
  join conversations c on c.id = me.conversation_id
  left join lateral (
    select p.id, p.full_name, p.role from conversation_participants o join profiles p on p.id = o.profile_id
    where o.conversation_id = c.id and o.profile_id <> auth.uid() limit 1
  ) op on true
  left join lateral (
    select m.content, m.sender_id, m.created_at, m.deleted_at from messages m
    where m.conversation_id = c.id
      and not exists (select 1 from message_hides h where h.message_id = m.id and h.profile_id = auth.uid())
    order by m.created_at desc limit 1
  ) lm on true
  where me.profile_id = auth.uid()
    and (c.kind = 'group' or lm.created_at is not null or c.created_by = auth.uid())
  order by coalesce(lm.created_at, c.created_at) desc;
$$;

do $$
declare f text;
begin
  foreach f in array array[
    'conversation_read_state(uuid)', 'set_conversation_receipts(uuid, boolean)', 'set_conversation_mute(uuid, timestamptz)', 'my_conversations()'
  ] loop
    execute format('revoke all on function %s from public, anon', f);
    execute format('grant execute on function %s to authenticated', f);
  end loop;
end $$;

notify pgrst, 'reload schema';
