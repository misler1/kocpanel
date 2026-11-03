-- ============================================================
-- Öğrenci çalışma hatırlatması
-- ============================================================
-- Koç, öğrenci detayından hatırlatma saatlerini (en fazla 3) ve günleri seçer.
-- pg_cron 5 dakikada bir send_study_reminders() çalıştırır; saati gelen öğrenciye "Günlüğünü doldurma zamanı"
-- bildirimi gider (panelde 🔔, telefon bildirimi açıksa telefona da: push_notifications.sql).
-- Gönderilmez: o günün görevlerinin hepsi işaretlenmişse; görev yoksa ve o gün zaten günlük girilmişse.
-- Bildirim /ogrenci?gunluk=1 açar: öğrenci doğrudan "Bugünün görevleri"ne gelir.
-- Önce push_notifications.sql çalıştırılmış olmalı. Supabase SQL Editor'da BİR KEZ çalıştırın; tekrar çalıştırmak zararsızdır.

create extension if not exists pg_cron;

-- Saatler Türkiye saatiyle; günler Pazartesi=0 … Pazar=6 (haftalık programdaki plan_day ile aynı)
alter table students add column if not exists reminder_times time[] not null default '{}';
alter table students add column if not exists reminder_days smallint[] not null default '{0,1,2,3,4,5,6}';
do $$ begin
  alter table students add constraint students_reminder_times_max check (coalesce(array_length(reminder_times, 1), 0) <= 3);
exception when duplicate_object then null;
end $$;

-- Aynı saat diliminde iki kez gönderilmesin
create table if not exists study_reminder_log (
  student_id uuid not null references students(id) on delete cascade,
  sent_on date not null,
  slot time not null,
  primary key (student_id, sent_on, slot)
);
alter table study_reminder_log enable row level security; -- politika yok: yalnızca zamanlayıcı yazar
revoke all on study_reminder_log from public, anon, authenticated;

create or replace function send_study_reminders()
returns int language plpgsql security definer set search_path = public as $$
declare
  v_now timestamp := now() at time zone 'Europe/Istanbul';
  v_today date := v_now::date;
  v_dow int;
  r record;
  v_week date;
  v_total int;
  v_done int;
  v_sent int := 0;
  v_body text;
begin
  delete from study_reminder_log where sent_on < v_today - 14;

  -- Zamanlayıcı gecikse de kaçmasın: son 20 dakika içinde saati gelenler. Karşılaştırma tarih+saat ile yapılır;
  -- böylece gece yarısını geçen pencere de çalışır (ör. 23:55 hatırlatması 00:05'teki turda dünün hatırlatması sayılır).
  for r in
    select s.id, s.profile_id, t.slot, d.day
    from students s
    cross join lateral unnest(s.reminder_times) as t(slot)
    cross join (values (v_today), (v_today - 1)) as d(day)
    where s.profile_id is not null
      and coalesce(s.status, '') <> 'pasif'
      and (extract(isodow from d.day)::int - 1) = any(s.reminder_days)
      and d.day + t.slot <= v_now and d.day + t.slot > v_now - interval '20 minutes'
  loop
    insert into study_reminder_log (student_id, sent_on, slot) values (r.id, r.day, r.slot) on conflict do nothing;
    if not found then continue; end if; -- bu saat için o gün zaten bakıldı
    v_dow := extract(isodow from r.day)::int - 1; -- Pazartesi=0

    -- Bugünü içeren en güncel program haftası ve bugünün görevleri (görüşme satırları sayılmaz)
    select max(week_start) into v_week from question_logs
      where student_id = r.id and week_start <= r.day and (week_end is null or week_end >= r.day);
    v_total := 0; v_done := 0;
    if v_week is not null then
      select count(*), count(*) filter (where student_done) into v_total, v_done
        from question_logs
        where student_id = r.id and week_start = v_week and plan_day = v_dow and appointment_id is null;
    end if;

    if v_total > 0 then
      if v_done >= v_total then continue; end if;
      v_body := case when v_done = 0
        then 'Bugün ' || v_total || ' görevin var. Ne çalıştığını işaretlemeyi unutma ✍️'
        else 'Bugünkü ' || v_total || ' görevinden ' || (v_total - v_done) || ' tanesi henüz işaretlenmedi ✍️' end;
    else
      if exists (select 1 from daily_logs where student_id = r.id and log_date = r.day) then continue; end if;
      v_body := 'Bugün ne çalıştın? Çalışmalarını girmeyi unutma ✍️';
    end if;

    -- Okunmamış eski hatırlatmalar birikmesin
    update notifications set read_at = now()
      where recipient_id = r.profile_id and kind = 'hatirlatma' and read_at is null;
    perform notify_user(r.profile_id, 'hatirlatma', 'Günlüğünü doldurma zamanı 📒', v_body, '/ogrenci?gunluk=1', 0);
    v_sent := v_sent + 1;
  end loop;
  return v_sent;
end $$;
revoke all on function send_study_reminders() from public, anon, authenticated;

-- 5 dakikada bir
do $$ begin
  perform cron.unschedule(jobid) from cron.job where jobname = 'ogrenci-calisma-hatirlatma';
end $$;
select cron.schedule('ogrenci-calisma-hatirlatma', '*/5 * * * *', $cron$select public.send_study_reminders()$cron$);

notify pgrst, 'reload schema';
