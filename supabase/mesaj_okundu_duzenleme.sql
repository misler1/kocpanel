-- ============================================================
-- Mesajlar: okundu bilgisi (açılıp kapatılabilir) + düzenleme, geri alma, benden silme
-- ============================================================
-- Okundu bilgisi:
--   * profiles.read_receipts (varsayılan AÇIK). Kişi Mesajlar > ⋮ menüsünden kapatabilir.
--   * Karşılıklıdır: kapatan, okuduğunu göstermez ve başkalarının okuduğunu da göremez.
--   * Diğer üyelerin "son okuma" zamanı artık doğrudan tablodan okunamaz; yalnızca conversation_read_state()
--     ile ve iki taraf da açıksa görünür (önceden üyeler birbirinin katılım satırını okuyabiliyordu).
-- Düzenleme / geri alma:
--   * Gönderen, mesajını 24 saat içinde düzenleyebilir (mesajda "düzenlendi" yazar) ya da geri alabilir
--     ("Bu mesaj geri alındı" görünür, metin silinir). Grup yöneticisi gruptaki her mesajı kaldırabilir.
--   * "Benden sil": herkes, istediği mesajı yalnızca kendi ekranından kaldırır (message_hides).
--   * Okunmamış mesaj bildirimi de düzenlenir / "Mesaj geri alındı" olur (telefona düşmüş bildirim geri alınamaz).
-- messaging.sql'den SONRA çalıştırın. Tekrar çalıştırmak zararsızdır.

alter table profiles add column if not exists read_receipts boolean not null default true;
alter table messages add column if not exists edited_at timestamptz;
alter table messages add column if not exists deleted_at timestamptz;
alter table messages add column if not exists deleted_by uuid references profiles(id) on delete set null;

create table if not exists message_hides (
  message_id uuid not null references messages(id) on delete cascade,
  profile_id uuid not null references profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (message_id, profile_id)
);
create index if not exists idx_message_hides_profile on message_hides(profile_id);
alter table message_hides enable row level security;
drop policy if exists "message_hides_own_select" on message_hides;
create policy "message_hides_own_select" on message_hides for select using (profile_id = auth.uid());
revoke all on message_hides from anon;
grant select on message_hides to authenticated;

-- Katılım satırları: herkes yalnızca kendi satırını görür (okuma zamanları conversation_read_state ile)
drop policy if exists "participants_select" on conversation_participants;
create policy "participants_select" on conversation_participants for select using (profile_id = auth.uid());

-- Canlı güncelleme (düzenleme / geri alma) için mesaj güncellemeleri de yayınlanır
alter table messages replica identity full;

-- ---------- Okundu ----------
create or replace function my_read_receipts()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select read_receipts from profiles where id = auth.uid()), true);
$$;

create or replace function set_read_receipts(p_on boolean)
returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'Giriş gerekli'; end if;
  update profiles set read_receipts = coalesce(p_on, true) where id = auth.uid();
end $$;

-- Sohbetteki diğer üyelerin son okuma zamanı (iki taraf da okundu bilgisini açık tuttuysa; değilse boş)
create or replace function conversation_read_state(p_conv uuid)
returns table (profile_id uuid, read_at timestamptz)
language sql stable security definer set search_path = public as $$
  select cp.profile_id,
    case when coalesce(p.read_receipts, true) and my_read_receipts() then cp.last_read_at end
  from conversation_participants cp join profiles p on p.id = cp.profile_id
  where cp.conversation_id = p_conv and cp.profile_id <> auth.uid() and is_conversation_member(p_conv);
$$;

-- ---------- Düzenleme / geri alma / benden silme ----------
create or replace function edit_message(p_id uuid, p_content text)
returns void language plpgsql security definer set search_path = public as $$
declare
  m messages%rowtype;
  v_content text := trim(coalesce(p_content, ''));
begin
  select * into m from messages where id = p_id;
  if m.id is null or m.sender_id is distinct from auth.uid() then raise exception 'Yalnızca kendi mesajını düzenleyebilirsin'; end if;
  if m.deleted_at is not null then raise exception 'Geri alınmış mesaj düzenlenemez'; end if;
  if m.created_at < now() - interval '24 hours' then raise exception 'Mesajlar yalnızca gönderildikten sonraki 24 saat içinde düzenlenebilir'; end if;
  if v_content = '' then raise exception 'Mesaj boş olamaz'; end if;
  if length(v_content) > 2000 then raise exception 'Mesaj en fazla 2000 karakter olabilir'; end if;
  if contains_profanity(v_content) then raise exception 'Mesaj uygunsuz bir ifade içeriyor. Lütfen düzeltip yeniden kaydet.'; end if;
  if v_content = m.content then return; end if;

  update messages set content = v_content, edited_at = now() where id = p_id;
  -- Henüz okunmamış bildirimin önizlemesi de güncellenir
  update notifications set body = left(v_content, 120)
   where kind = 'mesaj' and read_at is null and link like '%?c=' || m.conversation_id::text and body = left(m.content, 120);
end $$;

create or replace function unsend_message(p_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  m messages%rowtype;
  v_owner boolean;
begin
  select * into m from messages where id = p_id;
  if m.id is null or not is_conversation_member(m.conversation_id) then raise exception 'Mesaj bulunamadı'; end if;
  if m.deleted_at is not null then return; end if;
  -- Grup yöneticisi (grubu kuran) gruptaki her mesajı süre sınırı olmadan kaldırabilir
  select exists (select 1 from conversations c where c.id = m.conversation_id and c.kind = 'group' and c.created_by = auth.uid()) into v_owner;
  if m.sender_id is distinct from auth.uid() and not v_owner then raise exception 'Yalnızca kendi mesajını geri alabilirsin'; end if;
  if m.sender_id = auth.uid() and not v_owner and m.created_at < now() - interval '24 hours' then
    raise exception 'Mesajlar yalnızca gönderildikten sonraki 24 saat içinde geri alınabilir. "Benden sil" ile kendi ekranından kaldırabilirsin.';
  end if;

  update messages set content = '', deleted_at = now(), deleted_by = auth.uid() where id = p_id;
  update notifications set body = 'Mesaj geri alındı'
   where kind = 'mesaj' and read_at is null and link like '%?c=' || m.conversation_id::text and body = left(m.content, 120);
end $$;

create or replace function hide_message(p_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v_conv uuid;
begin
  select conversation_id into v_conv from messages where id = p_id;
  if v_conv is null or not is_conversation_member(v_conv) then raise exception 'Mesaj bulunamadı'; end if;
  insert into message_hides (message_id, profile_id) values (p_id, auth.uid()) on conflict do nothing;
end $$;

-- ---------- Sohbet listesi: geri alınan / kendinden silinen mesajlar ----------
create or replace function my_conversations()
returns table (
  id uuid, kind text, title text, other_id uuid, other_role text, member_count int, created_by uuid,
  last_message text, last_sender uuid, last_at timestamptz, unread int
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
       and not exists (select 1 from user_blocks b where b.blocker_id = auth.uid() and b.blocked_id = m.sender_id))
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
    'my_read_receipts()', 'set_read_receipts(boolean)', 'conversation_read_state(uuid)',
    'edit_message(uuid, text)', 'unsend_message(uuid)', 'hide_message(uuid)', 'my_conversations()'
  ] loop
    execute format('revoke all on function %s from public, anon', f);
    execute format('grant execute on function %s to authenticated', f);
  end loop;
end $$;

notify pgrst, 'reload schema';
