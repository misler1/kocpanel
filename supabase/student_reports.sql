-- ============================================================
-- Öğrenci dönem raporları: her pazartesi 08:00'de son haftanın raporu + koçun istediği tarih aralığı için rapor
-- ============================================================
-- • Rapor verisi site tarafında hesaplanır (src/lib/period-report.ts) ve bu tabloya kaydedilir; öğrenci sayfasında listelenir.
-- • Otomatik rapor: pg_cron her pazartesi 05:00 UTC'de (Türkiye 08:00) sitenin /api/cron/haftalik-rapor adresini çağırır;
--   istek push_notifications.sql'deki ortak parolayla (app_settings.push_secret) doğrulanır.
-- • Okuma/silme: öğrencinin koçu, sorumlu koçu, yönetici ve "haftalık takip" izni olan personel (silme yalnızca koç/yönetici).
--   Yazma yalnızca site üzerinden (service_role).
-- ÖNCE push_notifications.sql çalıştırılmış olmalı (push_secret ve pg_net). Supabase SQL Editor'da BİR KEZ çalıştırın;
-- tekrar çalıştırmak zararsızdır. Site adresi farklıysa aşağıdaki 'weekly_report_url' değerini değiştirin.
--
-- Geri alma: select cron.unschedule('haftalik-ogrenci-raporu'); drop table if exists public.student_reports;

create table if not exists student_reports (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references students(id) on delete cascade,
  period_start date not null,
  period_end date not null,
  kind text not null default 'elle' check (kind in ('otomatik', 'elle')),
  data jsonb not null,
  created_by uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  check (period_end >= period_start)
);
create index if not exists idx_student_reports_student on student_reports(student_id, period_end desc);
-- Aynı hafta için tek otomatik rapor
create unique index if not exists uq_student_reports_auto on student_reports(student_id, period_start, period_end) where kind = 'otomatik';

alter table student_reports enable row level security;

drop policy if exists student_reports_select on student_reports;
create policy student_reports_select on student_reports for select to authenticated
  using (exists (select 1 from students s where s.id = student_reports.student_id
                 and (s.coach_id = auth.uid() or s.responsible_coach_id = auth.uid()))
         or exists (select 1 from profiles p where p.id = auth.uid() and p.is_admin)
         or intern_can_access_student(student_id, 'weekly_tracking'));

drop policy if exists student_reports_delete on student_reports;
create policy student_reports_delete on student_reports for delete to authenticated
  using (exists (select 1 from students s where s.id = student_reports.student_id
                 and (s.coach_id = auth.uid() or s.responsible_coach_id = auth.uid()))
         or exists (select 1 from profiles p where p.id = auth.uid() and p.is_admin));

revoke all on student_reports from public, anon, authenticated;
grant select, delete on student_reports to authenticated;
grant all on student_reports to service_role;

-- Haftalık otomatik rapor: siteyi çağırır
insert into app_settings (key, value) values ('weekly_report_url', 'https://www.kocdefterim.com.tr/api/cron/haftalik-rapor')
  on conflict (key) do nothing;

create or replace function trigger_weekly_reports() returns void
language plpgsql security definer set search_path = public as $$
declare v_url text; v_secret text;
begin
  select value into v_url from app_settings where key = 'weekly_report_url';
  select value into v_secret from app_settings where key = 'push_secret';
  if v_url is null or v_secret is null then return; end if;
  perform net.http_post(
    url := v_url,
    body := '{}'::jsonb,
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-push-secret', v_secret),
    timeout_milliseconds := 60000
  );
end $$;
revoke all on function trigger_weekly_reports() from public, anon, authenticated;

do $$ begin
  perform cron.unschedule(jobid) from cron.job where jobname = 'haftalik-ogrenci-raporu';
end $$;
select cron.schedule('haftalik-ogrenci-raporu', '0 5 * * 1', $cron$select public.trigger_weekly_reports()$cron$);

notify pgrst, 'reload schema';
