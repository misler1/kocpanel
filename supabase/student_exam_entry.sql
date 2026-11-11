-- Öğrenci kendi deneme sonucunu girebilir. Supabase SQL Editor'da BİR KEZ çalıştırın. Veri silmez.
-- Öğrencinin girdiği deneme entered_by_student = true ile işaretlenir; öğrenci yalnızca kendi girdiği denemeyi
-- düzeltip silebilir (koçun girdiğine dokunamaz). Koçu olan öğrenci deneme girince koça bildirim gider.

alter table exams add column if not exists entered_by_student boolean not null default false;

grant insert, update, delete on exams to authenticated;

drop policy if exists "exams_student_insert" on exams;
create policy "exams_student_insert" on exams for insert
  with check (exists (select 1 from students s where s.id = exams.student_id and s.profile_id = auth.uid()));

drop policy if exists "exams_student_update" on exams;
create policy "exams_student_update" on exams for update
  using (entered_by_student and exists (select 1 from students s where s.id = exams.student_id and s.profile_id = auth.uid()))
  with check (entered_by_student and exists (select 1 from students s where s.id = exams.student_id and s.profile_id = auth.uid()));

drop policy if exists "exams_student_delete" on exams;
create policy "exams_student_delete" on exams for delete
  using (entered_by_student and exists (select 1 from students s where s.id = exams.student_id and s.profile_id = auth.uid()));

-- Öğrenci yazarken: "öğrenci girdi" işareti zorlanır, analiz alanları koça aittir
create or replace function protect_exams_student_write()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null or auth.role() = 'service_role' then return new; end if;
  if not exists (select 1 from students s where s.id = new.student_id and s.profile_id = auth.uid()) then
    return new;
  end if;
  new.entered_by_student := true;
  if TG_OP = 'INSERT' then
    new.analysis_done := false;
    new.analysis_notes := null;
  else
    new.analysis_done := old.analysis_done;
    new.analysis_notes := old.analysis_notes;
  end if;
  return new;
end $$;
drop trigger if exists trg_protect_exams_student_write on exams;
create trigger trg_protect_exams_student_write before insert or update on exams
  for each row execute function protect_exams_student_write();

-- Öğrenci deneme girdi → koçuna (ve varsa sorumlu koçuna) bildirim. Sadece platform öğrencisinde bildirim yok.
create or replace function trg_notify_student_exam()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  s record;
begin
  if not new.entered_by_student then return new; end if;
  select id, full_name, coach_id, responsible_coach_id, coalesce(platform_only, false) as platform_only
    into s from students where id = new.student_id;
  if s.id is null or s.platform_only then return new; end if;
  perform notify_user(s.coach_id, 'deneme', 'Öğrencin deneme sonucu girdi 📊',
    s.full_name || ': ' || coalesce(new.exam_name, 'Deneme') || ' · ' || new.net_score || ' net', '/denemeler?ogrenci=' || s.id, 0);
  if s.responsible_coach_id is not null and s.responsible_coach_id <> s.coach_id then
    perform notify_user(s.responsible_coach_id, 'deneme', 'Öğrencin deneme sonucu girdi 📊',
      s.full_name || ': ' || coalesce(new.exam_name, 'Deneme') || ' · ' || new.net_score || ' net', '/denemeler?ogrenci=' || s.id, 0);
  end if;
  return new;
end $$;
drop trigger if exists trg_notify_student_exam on exams;
create trigger trg_notify_student_exam after insert on exams
  for each row execute function trg_notify_student_exam();

notify pgrst, 'reload schema';
