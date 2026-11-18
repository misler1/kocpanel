-- ============================================================
-- Toplu mesaj: koç, grup kurmadan seçtiği öğrencilerin HER BİRİNE ayrı özel mesaj gönderir.
-- Mesaj metni kişiye özel olabilir ({ad} → öğrencinin adı); kişiselleştirme ekranda yapılır,
-- her alıcının metni ayrı gelir. Her alıcı için yetki, engel, uzunluk ve küfür kontrolü burada yapılır.
-- ÖNCE messaging.sql (ve yurt_personeli.sql) çalıştırılmış olmalı.
-- Supabase SQL Editor'da BİR KEZ çalıştırın. Tekrar çalıştırmak zararsızdır.
-- ============================================================

create or replace function send_bulk_message(p_items jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_me uuid := auth.uid();
  v_sender text;
  it jsonb;
  v_to uuid;
  v_content text;
  v_conv uuid;
  v_role text;
  v_sent int := 0;
  v_skipped jsonb := '[]'::jsonb;
begin
  if v_me is null then raise exception 'Giriş gerekli'; end if;
  if not _is_staff(v_me) then raise exception 'Toplu mesajı yalnızca koçlar gönderebilir'; end if;
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then raise exception 'En az bir alıcı seçin'; end if;
  if jsonb_array_length(p_items) > 300 then raise exception 'Bir seferde en fazla 300 kişiye gönderilebilir'; end if;
  -- Kötüye kullanım sınırı: son 1 saatte en fazla 1000 toplu mesaj
  if (select count(*) from messages where sender_id = v_me and created_at > now() - interval '1 hour') + jsonb_array_length(p_items) > 1000 then
    raise exception 'Son bir saatte çok fazla mesaj gönderildi, biraz sonra tekrar deneyin.';
  end if;

  -- Metin kontrolleri önce: biri uygunsuzsa hiçbiri gitmez
  for it in select * from jsonb_array_elements(p_items) loop
    v_content := trim(coalesce(it->>'content', ''));
    if v_content = '' then raise exception 'Boş mesaj gönderilemez'; end if;
    if length(v_content) > 2000 then raise exception 'Mesaj en fazla 2000 karakter olabilir'; end if;
    if contains_profanity(v_content) then
      raise exception 'Mesaj uygunsuz bir ifade içeriyor. Lütfen düzeltip yeniden gönderin.';
    end if;
  end loop;

  select full_name into v_sender from profiles where id = v_me;

  for it in select * from jsonb_array_elements(p_items) loop
    v_to := nullif(it->>'to', '')::uuid;
    v_content := trim(it->>'content');
    if v_to is null or not can_direct_message(v_me, v_to) then
      v_skipped := v_skipped || jsonb_build_object('to', v_to, 'reason', 'Bu kişiye mesaj gönderemezsiniz');
      continue;
    end if;
    if exists (select 1 from user_blocks where (blocker_id = v_me and blocked_id = v_to) or (blocker_id = v_to and blocked_id = v_me)) then
      v_skipped := v_skipped || jsonb_build_object('to', v_to, 'reason', 'Mesajlaşma engellenmiş');
      continue;
    end if;

    -- Var olan özel sohbeti bul, yoksa aç
    select c.id into v_conv from conversations c
      where c.kind = 'direct'
        and exists (select 1 from conversation_participants where conversation_id = c.id and profile_id = v_me)
        and exists (select 1 from conversation_participants where conversation_id = c.id and profile_id = v_to)
      limit 1;
    if v_conv is null then
      insert into conversations (kind, created_by) values ('direct', v_me) returning id into v_conv;
      insert into conversation_participants (conversation_id, profile_id, last_read_at) values (v_conv, v_me, now()), (v_conv, v_to, null);
    end if;

    insert into messages (conversation_id, sender_id, content) values (v_conv, v_me, v_content);
    update conversations set last_message_at = now() where id = v_conv;
    update conversation_participants set last_read_at = now() where conversation_id = v_conv and profile_id = v_me;

    select role::text into v_role from profiles where id = v_to;
    perform notify_user(v_to, 'mesaj', v_sender, left(v_content, 120),
      case when v_role = 'ogrenci' then '/ogrenci/mesajlar?c=' else '/mesajlar?c=' end || v_conv, 30);
    v_sent := v_sent + 1;
    v_conv := null;
  end loop;

  return jsonb_build_object('sent', v_sent, 'skipped', v_skipped);
end $$;

revoke all on function send_bulk_message(jsonb) from public, anon;
grant execute on function send_bulk_message(jsonb) to authenticated;

notify pgrst, 'reload schema';
