-- ============================================================
-- Stajyerin öğrencisinden gelen bildirimler rehber koça da düşer
-- ============================================================
-- Stajyer koçun (teacher_access_profiles.status = 'intern') öğrencisi günlük girdiğinde, deneme girdiğinde,
-- kendine program yaptığında / program talebi gönderdiğinde, konu ilerleyişini güncellediğinde ya da hesabıyla
-- ilk kez giriş yaptığında giden bildirimin bir kopyası stajyerin rehber koçuna (mentor_id) da gider.
-- Sabah 10:00 "dün günlük girmeyenler" özeti de kopyalanır. Kopyanın metninin başında stajyerin adı yazar.
-- Stajyerin mesajları ve kendisine ait hesap bildirimleri kopyalanmaz.
-- Günlük bildirimleri öğrenci başına tek bildirimde toplanır (rehber koç ayrıca sorumlu koçsa da tek bildirim kalır).
-- notify_user'ın imzası ve davranışı aynı kalır; yalnızca kopyalama eklenir.
-- notifications_grouping.sql'den SONRA çalıştırın. Tekrar çalıştırmak zararsızdır.

-- Tek alıcıya bildirim (önceki notify_user'ın gövdesi aynen)
create or replace function _notify_user_one(
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
revoke all on function _notify_user_one(uuid, text, text, text, text, int) from public, anon, authenticated;

create or replace function notify_user(
  p_recipient uuid, p_kind text, p_title text, p_body text, p_link text, p_dedupe_minutes int default 0
) returns void language plpgsql security definer set search_path = public as $$
declare
  v_mentor uuid;
  v_intern_name text;
  v_copy_kind boolean := p_kind in ('gunluk', 'deneme', 'plan_talebi', 'konu')
                         or (p_kind = 'hesap' and p_title like 'Öğrencin%');
  v_dup uuid;
begin
  if p_recipient is null then return; end if;

  -- Aynı işlemde bu alıcıya aynı olayın stajyer kopyası zaten düştüyse, doğrudan bildirim onun yerine geçer
  if v_copy_kind then
    select id into v_dup from notifications
      where recipient_id = p_recipient and kind = p_kind and link is not distinct from p_link
        and created_at = now() and body like 'Stajyer %'
      limit 1;
    if v_dup is not null then
      update notifications set title = p_title, body = p_body where id = v_dup;
    else
      perform _notify_user_one(p_recipient, p_kind, p_title, p_body, p_link, p_dedupe_minutes);
    end if;
  else
    perform _notify_user_one(p_recipient, p_kind, p_title, p_body, p_link, p_dedupe_minutes);
    return;
  end if;

  -- Stajyerin öğrencisinden gelen bildirim → rehber koça kopya
  begin
    select t.mentor_id, p.full_name into v_mentor, v_intern_name
      from teacher_access_profiles t join profiles p on p.id = t.teacher_id
      where t.teacher_id = p_recipient and t.status::text = 'intern';
    if v_mentor is null or v_mentor = p_recipient then return; end if;
    -- Rehber koç aynı olayı bu işlemde zaten doğrudan aldıysa kopya açılmaz
    if exists (select 1 from notifications
               where recipient_id = v_mentor and kind = p_kind and link is not distinct from p_link
                 and created_at = now()) then
      return;
    end if;
    perform _notify_user_one(v_mentor, p_kind, p_title,
      'Stajyer ' || coalesce(v_intern_name, '') || ' · ' || coalesce(p_body, ''),
      p_link, coalesce(p_dedupe_minutes, 0));
  exception when others then null; -- kopya gönderilemese de asıl bildirim etkilenmez
  end;
end $$;
revoke all on function notify_user(uuid, text, text, text, text, int) from public, anon, authenticated;

notify pgrst, 'reload schema';
