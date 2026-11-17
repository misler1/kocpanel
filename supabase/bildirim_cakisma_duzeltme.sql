-- ============================================================
-- Bildirim çakışmaları düzeltmesi
-- ============================================================
-- 1) Öğrencinin koçu stajyer, sorumlu koçu da rehber koçun kendisiyse aynı olay (deneme girişi, ilk giriş vb.)
--    rehber koça iki kez düşüyordu: biri doğrudan, biri stajyer kopyası. Artık aynı işlemde aynı tür ve aynı
--    bağlantıyla ikinci bildirim açılmaz; doğrudan bildirim kopyanın yerine geçer.
-- 2) Sabah 10:00 "dün günlük girmeyenler" özetinde stajyerin özetinin kopyası rehber koçun kendi özetiyle
--    aynı bağlantıyı kullandığından birbirine karışabiliyordu; özetin bağlantısı alıcıya göre ayrıldı.
-- stajyer_bildirim_kopyasi.sql ve gunluk_bildirimleri.sql'den SONRA çalıştırın. Tekrar çalıştırmak zararsızdır.

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

-- Sabah özeti: bağlantı alıcıya göre ayrı (stajyer kopyası rehber koçun kendi özetine karışmaz)
create or replace function send_missing_daily_digest()
returns int language plpgsql security definer set search_path = public as $$
declare
  v_day date := (now() at time zone 'Europe/Istanbul')::date - 1;
  v_dow int := extract(isodow from v_day)::int - 1; -- Pazartesi=0
  v_gun text := (array['Pazartesi','Salı','Çarşamba','Perşembe','Cuma','Cumartesi','Pazar'])[v_dow + 1];
  r record;
  v_sent int := 0;
  v_names text;
begin
  delete from missing_daily_digest_log where for_day < v_day - 30;

  for r in
    with eksik as (
      select s.id, s.full_name, s.coach_id, s.responsible_coach_id
      from students s
      where s.profile_id is not null
        and s.status is distinct from 'pasif'
        and not coalesce(s.platform_only, false)
        and coalesce((to_jsonb(s) -> 'reminder_days') @> to_jsonb(v_dow), true)
        and not exists (select 1 from daily_logs d
                        where d.student_id = s.id and d.log_date = v_day and coalesce(d.archived, false) = false)
        and not exists (select 1 from question_logs q
                        where q.student_id = s.id and q.plan_day = v_dow
                          and q.week_start <= v_day and coalesce(q.week_end, q.week_start + 6) >= v_day
                          and (q.student_done or coalesce(q.student_missed, false)))
    ),
    alici as (
      select coach_id as recipient_id, id, full_name from eksik where coach_id is not null
      union
      select responsible_coach_id, id, full_name from eksik where responsible_coach_id is not null
    )
    select recipient_id, count(*) as n, array_agg(full_name order by full_name) as names
    from alici group by recipient_id
  loop
    insert into missing_daily_digest_log (recipient_id, for_day) values (r.recipient_id, v_day) on conflict do nothing;
    if not found then continue; end if;
    v_names := array_to_string(r.names[1:12], ', ') || case when r.n > 12 then ' ve ' || (r.n - 12) || ' öğrenci daha' else '' end;
    perform notify_user(r.recipient_id, 'gunluk',
      'Dün günlük girmeyen ' || r.n || ' öğrenci 📒',
      to_char(v_day, 'DD.MM') || ' ' || v_gun || ': ' || v_names,
      '/haftalik-takip?ozet=' || r.recipient_id, 0);
    v_sent := v_sent + 1;
  end loop;
  return v_sent;
end $$;
revoke all on function send_missing_daily_digest() from public, anon, authenticated;
grant execute on function send_missing_daily_digest() to service_role;

notify pgrst, 'reload schema';
