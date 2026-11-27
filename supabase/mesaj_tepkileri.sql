-- ============================================================
-- Mesajlar: emoji tepkileri
-- ============================================================
-- * Sohbetteki her üye bir mesaja en fazla bir tepki bırakır; yenisini seçerse eskisinin yerine geçer,
--   aynısına tekrar dokunursa tepki kalkar.
-- * Tepkiler yalnızca sohbet üyelerince görülür; yazma yalnızca react_message() ile.
-- * Geri alınan mesaja tepki bırakılamaz.
-- messaging.sql ve mesaj_okundu_duzenleme.sql'den SONRA çalıştırın. Tekrar çalıştırmak zararsızdır.

create table if not exists message_reactions (
  message_id uuid not null references messages(id) on delete cascade,
  conversation_id uuid not null references conversations(id) on delete cascade,
  profile_id uuid not null references profiles(id) on delete cascade,
  emoji text not null check (char_length(emoji) between 1 and 16),
  created_at timestamptz not null default now(),
  primary key (message_id, profile_id)
);
create index if not exists idx_message_reactions_conv on message_reactions(conversation_id);

alter table message_reactions enable row level security;
drop policy if exists "message_reactions_member_select" on message_reactions;
create policy "message_reactions_member_select" on message_reactions
  for select using (is_conversation_member(conversation_id));
revoke all on message_reactions from anon;
grant select on message_reactions to authenticated;

-- p_emoji boş (null) ise tepki kaldırılır; aynı emoji tekrar gönderilirse de kalkar
create or replace function react_message(p_id uuid, p_emoji text)
returns text language plpgsql security definer set search_path = public as $$
declare
  v_me uuid := auth.uid();
  v_msg messages%rowtype;
  v_emoji text := nullif(trim(coalesce(p_emoji, '')), '');
  v_old text;
begin
  if v_me is null then raise exception 'Giriş gerekli'; end if;
  select * into v_msg from messages where id = p_id;
  if v_msg.id is null or not is_conversation_member(v_msg.conversation_id) then raise exception 'Mesaj bulunamadı'; end if;
  if v_msg.deleted_at is not null then raise exception 'Geri alınan mesaja tepki verilemez'; end if;
  if v_emoji is not null and char_length(v_emoji) > 16 then raise exception 'Geçersiz tepki'; end if;

  select emoji into v_old from message_reactions where message_id = p_id and profile_id = v_me;
  if v_emoji is null or v_old = v_emoji then
    delete from message_reactions where message_id = p_id and profile_id = v_me;
    return null;
  end if;
  insert into message_reactions (message_id, conversation_id, profile_id, emoji)
  values (p_id, v_msg.conversation_id, v_me, v_emoji)
  on conflict (message_id, profile_id) do update set emoji = excluded.emoji, created_at = now();
  return v_emoji;
end $$;

revoke all on function react_message(uuid, text) from public, anon;
grant execute on function react_message(uuid, text) to authenticated;

-- Görülmemiş tepkiler: başkalarının benim mesajlarıma, sohbeti en son açmamdan sonra bıraktığı tepkiler.
-- Bildirim üretmez; yalnızca Mesajlar rozeti ve sohbet listesindeki işaret için. Sohbet açılınca
-- (mark_conversation_read son okuma zamanını günceller) sıfırlanır.
create or replace function my_reaction_alerts()
returns table (conversation_id uuid, cnt int, last_emoji text, last_by text)
language sql stable security definer set search_path = public as $$
  select r.conversation_id, count(*)::int,
    (array_agg(r.emoji order by r.created_at desc))[1],
    (array_agg(p.full_name order by r.created_at desc))[1]
  from message_reactions r
  join messages m on m.id = r.message_id and m.sender_id = auth.uid() and m.deleted_at is null
  join conversation_participants cp on cp.conversation_id = r.conversation_id and cp.profile_id = auth.uid()
  left join profiles p on p.id = r.profile_id
  where r.profile_id <> auth.uid()
    and (cp.last_read_at is null or r.created_at > cp.last_read_at)
  group by r.conversation_id;
$$;
revoke all on function my_reaction_alerts() from public, anon;
grant execute on function my_reaction_alerts() to authenticated;

-- Canlı: tepkiler açık sohbette anında görünsün (silmede eski satır da gelsin)
alter table message_reactions replica identity full;
do $$ begin
  alter publication supabase_realtime add table message_reactions;
exception when duplicate_object then null; when undefined_object then null;
end $$;

notify pgrst, 'reload schema';
