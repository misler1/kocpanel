-- Haftalık takipte aynı hafta/aynı ders için birden fazla görev planlanabilsin.
-- Supabase SQL Editor'da bir kez çalıştırın.
alter table question_logs
  drop constraint if exists question_logs_student_id_subject_week_start_key;

alter table question_logs
  add column if not exists plan_day int check (plan_day between 0 and 6),
  add column if not exists start_time time,
  add column if not exists end_time time;

create index if not exists idx_question_logs_weekly_plan
  on question_logs(student_id, week_start, plan_day, start_time, end_time);