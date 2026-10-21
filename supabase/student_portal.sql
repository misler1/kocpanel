-- Öğrenci paneli (Aşama 1): Supabase Dashboard > SQL Editor'da BİR KEZ çalıştırın.
-- Hepsi geriye dönük uyumludur; mevcut veri silinmez/değiştirilmez.

-- 1) İlk girişte şifre değiştirtmek için bayrak
alter table profiles add column if not exists must_change_password boolean not null default false;

-- 2) GÜVENLİK: kullanıcılar kendi profilinde role / is_admin / is_approved alanlarını değiştirememeli.
--    (profiles_self_update politikası bunu engellemiyordu; öğrenci hesapları açılmadan önce kapatılmalı.)
create or replace function protect_profile_privileged_columns()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null or auth.role() = 'service_role' then
    return new;
  end if;
  if (new.role is distinct from old.role
      or new.is_admin is distinct from old.is_admin
      or new.is_approved is distinct from old.is_approved)
     and not exists (select 1 from profiles p where p.id = auth.uid() and p.is_admin = true) then
    raise exception 'Bu alanları değiştirme yetkiniz yok';
  end if;
  return new;
end $$;

drop trigger if exists trg_protect_profile_privileged_columns on profiles;
create trigger trg_protect_profile_privileged_columns
  before update on profiles
  for each row execute function protect_profile_privileged_columns();

-- 3) Öğrenci kendi verilerini OKUYABİLSİN (sadece kendi satırları)
drop policy if exists "exams_student_select" on exams;
create policy "exams_student_select" on exams for select
  using (exists (select 1 from students s where s.id = exams.student_id and s.profile_id = auth.uid()));

drop policy if exists "topic_progress_student_select" on topic_progress;
create policy "topic_progress_student_select" on topic_progress for select
  using (exists (select 1 from students s where s.id = topic_progress.student_id and s.profile_id = auth.uid()));

-- Öğrenci konu adımlarını işaretleyebilsin (konu ekleme/silme koçta kalır)
drop policy if exists "topic_progress_student_update" on topic_progress;
create policy "topic_progress_student_update" on topic_progress for update
  using (exists (select 1 from students s where s.id = topic_progress.student_id and s.profile_id = auth.uid()))
  with check (exists (select 1 from students s where s.id = topic_progress.student_id and s.profile_id = auth.uid()));

drop policy if exists "daily_logs_student_select" on daily_logs;
create policy "daily_logs_student_select" on daily_logs for select
  using (exists (select 1 from students s where s.id = daily_logs.student_id and s.profile_id = auth.uid()));

drop policy if exists "daily_logs_student_insert" on daily_logs;
create policy "daily_logs_student_insert" on daily_logs for insert
  with check (exists (select 1 from students s where s.id = daily_logs.student_id and s.profile_id = auth.uid()));

drop policy if exists "daily_logs_student_update" on daily_logs;
create policy "daily_logs_student_update" on daily_logs for update
  using (exists (select 1 from students s where s.id = daily_logs.student_id and s.profile_id = auth.uid()))
  with check (exists (select 1 from students s where s.id = daily_logs.student_id and s.profile_id = auth.uid()));

drop policy if exists "daily_logs_student_delete" on daily_logs;
create policy "daily_logs_student_delete" on daily_logs for delete
  using (exists (select 1 from students s where s.id = daily_logs.student_id and s.profile_id = auth.uid()));

-- daily_logs.coach_id zorunlu: öğrenci eklerken boş gelirse öğrencinin koçundan doldur
create or replace function fill_daily_log_coach()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.coach_id is null then
    select coach_id into new.coach_id from students where id = new.student_id;
  end if;
  return new;
end $$;

drop trigger if exists trg_fill_daily_log_coach on daily_logs;
create trigger trg_fill_daily_log_coach
  before insert on daily_logs
  for each row execute function fill_daily_log_coach();

-- 4) Deneme karnesi sıralaması: başka öğrencilerin verisini AÇMADAN yalnızca sıra/sayı/ortalama döndürür.
--    "Aynı deneme" = aynı ad + aynı tarih + aynı tür (tüm koçlardaki öğrenciler dahil).
create or replace function student_exam_ranks()
returns table (exam_id uuid, rank bigint, total bigint, avg_net numeric, max_net numeric)
language sql stable security definer set search_path = public as $$
  with mine as (
    select e.id, e.exam_name, e.exam_date, e.exam_type, e.net_score
    from exams e join students s on s.id = e.student_id
    where s.profile_id = auth.uid()
  )
  select m.id,
         (select count(*) + 1 from exams o
            where o.exam_name = m.exam_name and o.exam_date = m.exam_date
              and o.exam_type is not distinct from m.exam_type and o.net_score > m.net_score),
         (select count(*) from exams o
            where o.exam_name = m.exam_name and o.exam_date = m.exam_date
              and o.exam_type is not distinct from m.exam_type),
         (select round(avg(o.net_score), 2) from exams o
            where o.exam_name = m.exam_name and o.exam_date = m.exam_date
              and o.exam_type is not distinct from m.exam_type),
         (select max(o.net_score) from exams o
            where o.exam_name = m.exam_name and o.exam_date = m.exam_date
              and o.exam_type is not distinct from m.exam_type)
  from mine m;
$$;
revoke all on function student_exam_ranks() from public;
grant execute on function student_exam_ranks() to authenticated;

notify pgrst, 'reload schema';
