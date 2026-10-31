-- ============================================================
-- Mesajlaşma + grup sohbeti + küfür filtresi + engelleme (Aşama 3)
-- ============================================================
-- ÖNCE notifications.sql çalıştırılmış olmalı (mesaj bildirimi onu kullanır).
-- Kurallar:
--   • Öğrenci yalnızca kendi koçuna / sorumlu koçuna / kendisine atanmış öğretmenlere yazabilir.
--   • Öğrenciler birbirine özel mesaj atamaz; yalnızca koçun kurduğu gruplarda konuşur (koç her şeyi görür).
--   • Koç/öğretmen: kendi öğrencilerine ve tüm onaylı koç/öğretmenlere yazabilir. Yönetici tüm öğrencilere yazabilir.
--   • Küfür/hakaret içeren mesaj veritabanında reddedilir (boşluklu, noktalı, rakamlı yazımlar da yakalanır).
--   • Engellenen kişiyle özel mesajlaşma iki yönde de kapanır; grupta engellenenin mesajları gizlenir.
--   • Mesajlar yalnızca send_message fonksiyonuyla yazılır (doğrudan insert kapalı); dakikada en fazla 20 mesaj.
-- Supabase SQL Editor'da BİR KEZ çalıştırın. Tekrar çalıştırmak zararsızdır.

-- ---------- Tablo ekleri ----------
alter table conversations add column if not exists kind text not null default 'direct';
alter table conversations add column if not exists title text;
alter table conversations add column if not exists created_by uuid references profiles(id) on delete set null;
alter table conversations add column if not exists last_message_at timestamptz;
alter table conversations drop constraint if exists conversations_kind_check;
alter table conversations add constraint conversations_kind_check check (kind in ('direct', 'group'));

alter table conversation_participants add column if not exists last_read_at timestamptz;
alter table conversation_participants add column if not exists joined_at timestamptz not null default now();

create index if not exists idx_conv_participants_profile on conversation_participants(profile_id);
create index if not exists idx_messages_conversation_time on messages(conversation_id, created_at desc);

create table if not exists user_blocks (
  blocker_id uuid not null references profiles(id) on delete cascade,
  blocked_id uuid not null references profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);
alter table user_blocks enable row level security;
drop policy if exists "user_blocks_own_select" on user_blocks;
create policy "user_blocks_own_select" on user_blocks for select using (blocker_id = auth.uid());
grant select on user_blocks to authenticated;

-- ---------- Yetki yardımcıları ----------
create or replace function is_conversation_member(p_conv uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from conversation_participants where conversation_id = p_conv and profile_id = auth.uid());
$$;

-- Eski kural kendi tablosuna başvurduğu için sonsuz döngü hatası verir; yardımcı fonksiyonla değiştirildi
drop policy if exists "conversations_participant_select" on conversations;
create policy "conversations_participant_select" on conversations for select using (is_conversation_member(id));
drop policy if exists "participants_select" on conversation_participants;
create policy "participants_select" on conversation_participants for select using (is_conversation_member(conversation_id));
drop policy if exists "messages_participant_select" on messages;
create policy "messages_participant_select" on messages for select using (is_conversation_member(conversation_id));
drop policy if exists "messages_participant_insert" on messages; -- yazma yalnızca send_message ile

-- Okundu bilgisi: kişi kendi katılım satırını güncelleyebilir (yalnızca last_read_at anlamlı)
drop policy if exists "participants_self_update" on conversation_participants;
create policy "participants_self_update" on conversation_participants for update
  using (profile_id = auth.uid()) with check (profile_id = auth.uid());

revoke insert, update, delete on messages from authenticated;
revoke insert, update, delete on conversations, conversation_participants from authenticated;
grant select on conversations, conversation_participants, messages to authenticated;
grant update (last_read_at) on conversation_participants to authenticated;

create or replace function _is_staff(p uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from profiles where id = p and role in ('koc', 'ogretmen') and coalesce(is_approved, false));
$$;

-- p_staff, p_student_profile'in koçu / sorumlu koçu / öğretmeni mi (ya da yönetici mi)?
create or replace function _staff_has_student(p_staff uuid, p_student_profile uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from profiles where id = p_staff and is_admin)
      or exists (select 1 from students s
                 where s.profile_id = p_student_profile
                   and (s.coach_id = p_staff or s.responsible_coach_id = p_staff
                        or exists (select 1 from student_teachers t where t.student_id = s.id and t.teacher_id = p_staff)));
$$;

-- a, b'ye özel mesaj atabilir mi?
create or replace function can_direct_message(a uuid, b uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select a <> b and (
    (_is_staff(a) and _is_staff(b))
    or (_is_staff(a) and _staff_has_student(a, b))
    or (_is_staff(b) and _staff_has_student(b, a))
  );
$$;

-- ---------- Küfür / hakaret filtresi ----------
-- Normalleştirme: küçük harf, Türkçe harfler sadeleşir, rakam/simge benzerleri harfe döner,
-- tek harfli parçalar birleştirilir ("k ü f ü r", "k.ü.f.ü.r"), tekrar eden harfler teke iner ("siiiik").
create or replace function _normalize_for_filter(p text)
returns text language plpgsql immutable as $$
declare
  t text := lower(coalesce(p, ''));
begin
  t := translate(t, 'ıİşŞçÇğĞüÜöÖâîû', 'iissccgguuooaiu');
  t := translate(t, '0134578@$€!|', 'oieastbassii');
  t := regexp_replace(t, '[^a-z]+', ' ', 'g');
  -- tek harfli parçaları birleştir: "k u f u r" -> "kufur"
  t := regexp_replace(t, '(?<=\m[a-z]) (?=[a-z]\M)', '', 'g');
  t := regexp_replace(t, '([a-z])\1+', '\1', 'g');
  return ' ' || trim(regexp_replace(t, '\s+', ' ', 'g')) || ' ';
end $$;

create or replace function contains_profanity(p text)
returns boolean language plpgsql immutable as $$
declare
  t text := _normalize_for_filter(p);
  -- kelimenin başında geçerse yakalanır (ekli halleri de: "orospunun", "siktirgit").
  -- Not: "sık", "sıkıcı", "sıkış", "kodum" gibi masum kelimeler sadeleşince benzer göründüğü için listede değil.
  prefixes text[] := array[
    'orospu','orosbu','siktir','hasiktir','sikerim','sikeyim','yarak','yarag','dalyarak','pezevenk','pezeveng',
    'kahpe','ibne','gavat','pust','amcik','amina','amq','gotveren','gotlek','yavsak','kaltak','surtuk','fahise',
    'serefsiz','haysiyetsiz','namussuz','gerizekali','dangalak','piclik','kodugum',
    'sokay','avradini'
  ];
  -- yalnızca kelimenin tamamıysa yakalanır (başka kelimelerin içinde zararsız geçebilenler)
  exact text[] := array['amk','aq','mk','sg','oc','pic','pici','got','bok','am','aptal','salak','ahmak'];
  w text;
begin
  -- tekrar eden harfler teke indiği için "yarrak" -> "yarak", "hassiktir" -> "hasiktir" olarak aranır
  foreach w in array prefixes loop
    if position(' ' || w in t) > 0 then return true; end if;
  end loop;
  foreach w in array exact loop
    if position(' ' || w || ' ' in t) > 0 then return true; end if;
  end loop;
  return false;
end $$;

-- ---------- Sohbet açma ----------
create or replace function start_direct_conversation(p_other uuid)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_me uuid := auth.uid();
  v_conv uuid;
begin
  if v_me is null then raise exception 'Giriş gerekli'; end if;
  if not can_direct_message(v_me, p_other) then raise exception 'Bu kişiye mesaj gönderemezsiniz'; end if;

  select c.id into v_conv from conversations c
    where c.kind = 'direct'
      and exists (select 1 from conversation_participants where conversation_id = c.id and profile_id = v_me)
      and exists (select 1 from conversation_participants where conversation_id = c.id and profile_id = p_other)
    limit 1;
  if v_conv is not null then return v_conv; end if;

  insert into conversations (kind, created_by) values ('direct', v_me) returning id into v_conv;
  insert into conversation_participants (conversation_id, profile_id, last_read_at) values (v_conv, v_me, now()), (v_conv, p_other, null);
  return v_conv;
end $$;

-- Grup: yalnızca koç/öğretmen kurar; üyeler kendi öğrencileri ya da diğer koç/öğretmenler olabilir
create or replace function create_group_conversation(p_title text, p_members uuid[])
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_me uuid := auth.uid();
  v_conv uuid;
  m uuid;
  v_title text := nullif(trim(coalesce(p_title, '')), '');
begin
  if not _is_staff(v_me) then raise exception 'Grup yalnızca koçlar tarafından kurulabilir'; end if;
  if v_title is null or length(v_title) > 80 then raise exception 'Grup adı 1-80 karakter olmalı'; end if;
  if contains_profanity(v_title) then raise exception 'Grup adı uygunsuz ifade içeriyor'; end if;
  if coalesce(array_length(p_members, 1), 0) = 0 then raise exception 'En az bir üye seçin'; end if;
  if array_length(p_members, 1) > 300 then raise exception 'Bir grupta en fazla 300 üye olabilir'; end if;

  foreach m in array p_members loop
    if m <> v_me and not (_is_staff(m) or _staff_has_student(v_me, m)) then
      raise exception 'Seçilen kişilerden biri grubunuza eklenemez';
    end if;
  end loop;

  insert into conversations (kind, title, created_by) values ('group', v_title, v_me) returning id into v_conv;
  insert into conversation_participants (conversation_id, profile_id, last_read_at)
    select v_conv, x, case when x = v_me then now() end from (select distinct unnest(p_members || v_me) as x) s;
  return v_conv;
end $$;

-- Grubu kuran koç üye ekler/çıkarır, adını değiştirir; üyeler gruptan ayrılabilir
create or replace function update_group(p_conv uuid, p_title text, p_add uuid[], p_remove uuid[])
returns void language plpgsql security definer set search_path = public as $$
declare
  v_me uuid := auth.uid();
  v_conv conversations%rowtype;
  m uuid;
begin
  select * into v_conv from conversations where id = p_conv and kind = 'group';
  if v_conv.id is null then raise exception 'Grup bulunamadı'; end if;
  if v_conv.created_by is distinct from v_me and not exists (select 1 from profiles where id = v_me and is_admin) then
    raise exception 'Grubu yalnızca kuran koç düzenleyebilir';
  end if;
  if nullif(trim(coalesce(p_title, '')), '') is not null then
    if contains_profanity(p_title) then raise exception 'Grup adı uygunsuz ifade içeriyor'; end if;
    update conversations set title = left(trim(p_title), 80) where id = p_conv;
  end if;
  foreach m in array coalesce(p_add, '{}') loop
    if not (_is_staff(m) or _staff_has_student(v_me, m)) then raise exception 'Seçilen kişilerden biri gruba eklenemez'; end if;
    insert into conversation_participants (conversation_id, profile_id) values (p_conv, m) on conflict do nothing;
  end loop;
  delete from conversation_participants where conversation_id = p_conv and profile_id = any(coalesce(p_remove, '{}')) and profile_id <> v_me;
end $$;

create or replace function leave_conversation(p_conv uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if exists (select 1 from conversations where id = p_conv and kind = 'group' and created_by = auth.uid()) then
    -- kuran koç ayrılırsa grup tamamen silinir
    delete from conversations where id = p_conv;
  else
    delete from conversation_participants where conversation_id = p_conv and profile_id = auth.uid()
      and exists (select 1 from conversations where id = p_conv and kind = 'group');
  end if;
end $$;

-- ---------- Mesaj gönder ----------
create or replace function send_message(p_conv uuid, p_content text)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_me uuid := auth.uid();
  v_conv conversations%rowtype;
  v_content text := trim(coalesce(p_content, ''));
  v_other uuid;
  v_id uuid;
  v_sender text;
  r record;
begin
  if v_me is null then raise exception 'Giriş gerekli'; end if;
  select * into v_conv from conversations where id = p_conv;
  if v_conv.id is null or not exists (select 1 from conversation_participants where conversation_id = p_conv and profile_id = v_me) then
    raise exception 'Bu sohbete yazamazsınız';
  end if;
  if v_content = '' then raise exception 'Boş mesaj gönderilemez'; end if;
  if length(v_content) > 2000 then raise exception 'Mesaj en fazla 2000 karakter olabilir'; end if;
  if contains_profanity(v_content) then
    raise exception 'Mesajın uygunsuz bir ifade içeriyor. Lütfen saygılı bir dille yeniden yaz.';
  end if;
  if (select count(*) from messages where sender_id = v_me and created_at > now() - interval '1 minute') >= 20 then
    raise exception 'Çok hızlı mesaj gönderiyorsun, biraz bekle.';
  end if;

  if v_conv.kind = 'direct' then
    select profile_id into v_other from conversation_participants where conversation_id = p_conv and profile_id <> v_me limit 1;
    if exists (select 1 from user_blocks where (blocker_id = v_me and blocked_id = v_other) or (blocker_id = v_other and blocked_id = v_me)) then
      raise exception 'Bu kişiyle mesajlaşma engellenmiş';
    end if;
    if not can_direct_message(v_me, v_other) then raise exception 'Bu kişiye artık mesaj gönderemezsiniz'; end if;
  end if;

  insert into messages (conversation_id, sender_id, content) values (p_conv, v_me, v_content) returning id into v_id;
  update conversations set last_message_at = now() where id = p_conv;
  update conversation_participants set last_read_at = now() where conversation_id = p_conv and profile_id = v_me;

  select full_name into v_sender from profiles where id = v_me;
  for r in
    select cp.profile_id, p.role from conversation_participants cp join profiles p on p.id = cp.profile_id
    where cp.conversation_id = p_conv and cp.profile_id <> v_me
      and not exists (select 1 from user_blocks b where b.blocker_id = cp.profile_id and b.blocked_id = v_me)
  loop
    perform notify_user(r.profile_id, 'mesaj',
      case when v_conv.kind = 'group' then coalesce(v_conv.title, 'Grup') || ' · ' || v_sender else v_sender end,
      left(v_content, 120),
      case when r.role = 'ogrenci' then '/ogrenci/mesajlar?c=' else '/mesajlar?c=' end || p_conv, 30);
  end loop;
  return v_id;
end $$;

-- ---------- Okundu ----------
create or replace function mark_conversation_read(p_conv uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  update conversation_participants set last_read_at = now() where conversation_id = p_conv and profile_id = auth.uid();
  update notifications set read_at = now()
    where recipient_id = auth.uid() and kind = 'mesaj' and read_at is null and link like '%?c=' || p_conv::text;
end $$;

-- ---------- Engelleme ----------
create or replace function set_block(p_other uuid, p_block boolean)
returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null or p_other is null or p_other = auth.uid() then raise exception 'Geçersiz işlem'; end if;
  if p_block then
    insert into user_blocks (blocker_id, blocked_id) values (auth.uid(), p_other) on conflict do nothing;
  else
    delete from user_blocks where blocker_id = auth.uid() and blocked_id = p_other;
  end if;
end $$;

-- ---------- Listeler ----------
-- Sohbet listesi: başlık, son mesaj, okunmamış sayısı
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
    lm.content, lm.sender_id, coalesce(lm.created_at, c.created_at),
    (select count(*)::int from messages m where m.conversation_id = c.id and m.sender_id <> auth.uid()
       and (me.last_read_at is null or m.created_at > me.last_read_at)
       and not exists (select 1 from user_blocks b where b.blocker_id = auth.uid() and b.blocked_id = m.sender_id))
  from conversation_participants me
  join conversations c on c.id = me.conversation_id
  left join lateral (
    select p.id, p.full_name, p.role from conversation_participants o join profiles p on p.id = o.profile_id
    where o.conversation_id = c.id and o.profile_id <> auth.uid() limit 1
  ) op on true
  left join lateral (
    select m.content, m.sender_id, m.created_at from messages m where m.conversation_id = c.id
    order by m.created_at desc limit 1
  ) lm on true
  where me.profile_id = auth.uid()
    and (c.kind = 'group' or lm.created_at is not null or c.created_by = auth.uid())
  order by coalesce(lm.created_at, c.created_at) desc;
$$;

-- Yeni sohbet başlatılabilecek kişiler (ve grup kurarken seçilebilecekler)
create or replace function message_contacts()
returns table (id uuid, full_name text, role text, kurum text, sinif text, is_my_student boolean)
language sql stable security definer set search_path = public as $$
  -- öğrencinin koçları/öğretmenleri
  select p.id, p.full_name, p.role::text, null::text, null::text, false
  from profiles p
  where not _is_staff(auth.uid()) and p.id <> auth.uid() and can_direct_message(auth.uid(), p.id)
  union all
  -- koç/öğretmen için: diğer koç/öğretmenler
  select p.id, p.full_name, p.role::text, null, null, false
  from profiles p
  where _is_staff(auth.uid()) and p.id <> auth.uid() and _is_staff(p.id)
  union all
  -- koç/öğretmen için: hesabı olan öğrencileri
  select p.id, p.full_name, 'ogrenci', s.kurum, s.sinif_sube, true
  from students s join profiles p on p.id = s.profile_id
  where _is_staff(auth.uid()) and s.status::text = 'aktif' and _staff_has_student(auth.uid(), p.id);
$$;

-- Bir sohbetin üyeleri
create or replace function conversation_members(p_conv uuid)
returns table (id uuid, full_name text, role text, blocked boolean)
language sql stable security definer set search_path = public as $$
  select p.id, p.full_name, p.role::text,
    exists (select 1 from user_blocks b where b.blocker_id = auth.uid() and b.blocked_id = p.id)
  from conversation_participants cp join profiles p on p.id = cp.profile_id
  where cp.conversation_id = p_conv and is_conversation_member(p_conv)
  order by p.full_name;
$$;

-- Fonksiyon yetkileri: yalnızca giriş yapmış kullanıcılar
do $$
declare f text;
begin
  foreach f in array array[
    'start_direct_conversation(uuid)', 'create_group_conversation(text, uuid[])', 'update_group(uuid, text, uuid[], uuid[])',
    'leave_conversation(uuid)', 'send_message(uuid, text)', 'mark_conversation_read(uuid)', 'set_block(uuid, boolean)',
    'my_conversations()', 'message_contacts()', 'conversation_members(uuid)'
  ] loop
    execute format('revoke all on function %s from public, anon', f);
    execute format('grant execute on function %s to authenticated', f);
  end loop;
end $$;
revoke all on function _is_staff(uuid) from public, anon;
revoke all on function _staff_has_student(uuid, uuid) from public, anon;
revoke all on function can_direct_message(uuid, uuid) from public, anon;

-- Canlı mesajlar için Realtime
do $$ begin
  alter publication supabase_realtime add table messages;
exception when duplicate_object then null; when undefined_object then null;
end $$;

notify pgrst, 'reload schema';
