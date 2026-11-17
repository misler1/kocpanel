-- ============================================================
-- Günlük bildirimleri (koça)
-- ============================================================
-- 1) Öğrenci kendi hesabından günlük girdiğinde (çalışma kaydı, görev "yaptım"/"yapmadım" işareti) koçuna
--    ve varsa ayrı sorumlu koçuna bildirim gider. Aynı gün art arda girişler tek bildirimde toplanır
--    (okunmamış bildirim güncellenir: "4/6 görev yapıldı · 120 soru" gibi o günün özeti).
-- 2) Her sabah 10:00'da (Türkiye saati) koça, dün günlük girmeyen öğrencilerinin listesi gider.
--    Sayılmaz: hesabı olmayan, pasif, yalnızca platform öğrencileri; hatırlatma günlerinden dün çıkarılmış öğrenciler.
--    "Girdi" sayılır: dün tarihli günlük kaydı var ya da dünkü görevlerden en az biri "yaptım/yapmadım" işaretli.
-- Önce notifications.sql ve push_notifications.sql çalıştırılmış olmalı.
-- Supabase SQL Editor'da BİR KEZ çalıştırın; tekrar çalıştırmak zararsızdır.

create extension if not exists pg_cron;

-- Bir öğrencinin belirli bir gündeki giriş özeti (görev ve soru sayıları)
create or replace function _gunluk_ozet(p_student uuid, p_day date)
returns text language plpgsql stable security definer set search_path = public as $$
declare
  v_dow int := extract(isodow from p_day)::int - 1; -- Pazartesi=0
  v_total int; v_done int; v_missed int; v_soru int;
  v_parts text[] := '{}';
begin
  select count(*), count(*) filter (where student_done), count(*) filter (where student_missed)
    into v_total, v_done, v_missed
    from question_logs
    where student_id = p_student and plan_day = v_dow and appointment_id is null
      and week_start <= p_day and coalesce(week_end, week_start + 6) >= p_day;
  select coalesce(sum(coalesce((e ->> 'count')::int, 0)), 0) into v_soru
    from daily_logs d, jsonb_array_elements(coalesce(d.question_solved::jsonb, '[]'::jsonb)) e
    where d.student_id = p_student and d.log_date = p_day and coalesce(d.archived, false) = false;
  if v_total > 0 then
    v_parts := v_parts || (v_done || '/' || v_total || ' görev yapıldı');
    if v_missed > 0 then v_parts := v_parts || (v_missed || ' yapılmadı'); end if;
  end if;
  if v_soru > 0 then v_parts := v_parts || (v_soru || ' soru'); end if;
  return array_to_string(v_parts, ' · ');
end $$;
revoke all on function _gunluk_ozet(uuid, date) from public, anon, authenticated;

-- 1) Öğrenci giriş yaptı → koça bildirim
create or replace function _notify_coach_student_daily()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  s record;
  v_today date := (now() at time zone 'Europe/Istanbul')::date;
  v_day date;
  v_ozet text;
  v_body text;
  v_link text;
begin
  if auth.uid() is null then return null; end if;
  select id, full_name, coach_id, responsible_coach_id, profile_id, coalesce(platform_only, false) as platform_only
    into s from students where id = new.student_id;
  if s.id is null or s.platform_only or s.profile_id is distinct from auth.uid() then return null; end if; -- yalnızca öğrencinin kendi girişi

  if TG_TABLE_NAME = 'daily_logs' then
    v_day := new.log_date;
  else
    -- Görev işareti: yalnızca "yaptım" ya da "yapmadım" yeni işaretlendiyse
    if TG_OP = 'UPDATE' and not (
         (coalesce(new.student_done, false) and not coalesce(old.student_done, false))
      or (coalesce(new.student_missed, false) and not coalesce(old.student_missed, false))) then
      return null;
    end if;
    if TG_OP = 'INSERT' and not coalesce(new.student_done, false) then return null; end if;
    -- Görevin günü: programın içinde, bugüne kadarki o haftanın gününe denk gelen son tarih
    select max(x::date) into v_day
      from generate_series(new.week_start, least(coalesce(new.week_end, new.week_start + 6), v_today), interval '1 day') x
      where extract(isodow from x)::int - 1 = new.plan_day;
    v_day := coalesce(v_day, v_today);
  end if;

  v_ozet := _gunluk_ozet(s.id, v_day);
  v_body := s.full_name || ': ' ||
    case when v_day = v_today then 'bugünün' when v_day = v_today - 1 then 'dünün' else to_char(v_day, 'DD.MM') || ' tarihinin' end
    || ' günlüğü' || case when v_ozet <> '' then ' — ' || v_ozet else ' girildi' end;
  v_link := '/ogrenciler/' || s.id || '?sekme=program';

  -- Aynı öğrencinin aynı gün içindeki girişleri tek (okunmamış) bildirimde güncellenir
  perform notify_user(s.coach_id, 'gunluk', 'Öğrencin günlüğünü girdi ✍️', v_body, v_link, 720);
  if s.responsible_coach_id is not null and s.responsible_coach_id is distinct from s.coach_id then
    perform notify_user(s.responsible_coach_id, 'gunluk', 'Öğrencin günlüğünü girdi ✍️', v_body, v_link, 720);
  end if;
  return null;
exception when others then
  return null; -- bildirim hatası öğrencinin kaydını engellemesin
end $$;

drop trigger if exists trg_notify_coach_student_daily on daily_logs;
create trigger trg_notify_coach_student_daily after insert or update on daily_logs
  for each row execute function _notify_coach_student_daily();
drop trigger if exists trg_notify_coach_student_daily on question_logs;
create trigger trg_notify_coach_student_daily after insert or update of student_done, student_missed on question_logs
  for each row execute function _notify_coach_student_daily();

-- 2) Sabah 10:00: dün günlük girmeyen öğrenciler
create table if not exists missing_daily_digest_log (
  recipient_id uuid not null references profiles(id) on delete cascade,
  for_day date not null,
  primary key (recipient_id, for_day)
);
alter table missing_daily_digest_log enable row level security; -- politika yok: yalnızca zamanlayıcı yazar
revoke all on missing_daily_digest_log from public, anon, authenticated;

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
        -- Koç hatırlatma günlerinden dünü çıkardıysa (ör. Pazar tatil) sayılmaz
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
    if not found then continue; end if; -- bugün zaten gönderildi
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

-- Her gün 07:00 UTC = 10:00 Türkiye
do $$ begin
  perform cron.unschedule(jobid) from cron.job where jobname = 'gunluk-girmeyenler-ozeti';
end $$;
select cron.schedule('gunluk-girmeyenler-ozeti', '0 7 * * *', $cron$select public.send_missing_daily_digest()$cron$);

notify pgrst, 'reload schema';
