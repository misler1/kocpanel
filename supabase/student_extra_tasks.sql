-- Öğrencinin kendi eklediği (koçun vermediği) ekstra görevler — Supabase SQL Editor'da BİR KEZ çalıştırın.
-- Öğrenci ekler, onay beklemez; koç tarafında "Öğrenci ekledi" etiketiyle görünür. Mevcut veriyi değiştirmez.

alter table question_logs add column if not exists student_added boolean not null default false;

-- Öğrenci kendi görevini ekleyebilsin (yalnızca kendi student_id'sine, mevcut bir haftaya)
drop policy if exists "question_logs_student_insert" on question_logs;
create policy "question_logs_student_insert" on question_logs for insert
  with check (
    exists (select 1 from students s where s.id = question_logs.student_id and s.profile_id = auth.uid())
    and week_start is not null
  );

-- Öğrenci yalnızca KENDİ eklediği görevi silebilsin (koçun verdiği görevi silemez)
drop policy if exists "question_logs_student_delete" on question_logs;
create policy "question_logs_student_delete" on question_logs for delete
  using (
    student_added = true
    and exists (select 1 from students s where s.id = question_logs.student_id and s.profile_id = auth.uid())
  );

-- Eklerken: student_added her zaman true'ya zorlanır, done_count/topic alanları sıfırlanır, coach_id öğrencinin koçundan doldurulur.
-- Güncellerken: öğrenci kendi eklediği (student_added=true) görevin tüm alanlarını değiştirebilir;
--   koçun verdiği görevlerde ise yalnızca "yaptım" işaretini (student_done, student_done_at) değiştirebilir.
create or replace function protect_question_logs_student_write()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  is_student boolean;
begin
  if auth.uid() is null or auth.role() = 'service_role' then
    return new;
  end if;

  is_student := exists (
    select 1 from students s
    where s.id = new.student_id and s.profile_id = auth.uid()
  );
  if not is_student then
    return new;
  end if;

  if TG_OP = 'INSERT' then
    new.student_added := true;
    new.done_count := 0;
    new.topic_done_minutes := 0;
    new.coach_id := (select coach_id from students where id = new.student_id);
    return new;
  end if;

  -- UPDATE: kendi eklediği görevde serbest, koçun görevinde yalnızca işaret
  if not old.student_added then
    if (to_jsonb(new) - 'student_done' - 'student_done_at')
       is distinct from (to_jsonb(old) - 'student_done' - 'student_done_at') then
      raise exception 'Öğrenci programı doğrudan değiştiremez; koça değişiklik talebi gönderin';
    end if;
  else
    new.student_added := true; -- etiketini kendi kaldıramaz
  end if;
  return new;
end $$;

drop trigger if exists trg_protect_question_logs_student_update on question_logs; -- eski tetikleyici, yerini alır
drop trigger if exists trg_protect_question_logs_student_write on question_logs;
create trigger trg_protect_question_logs_student_write
  before insert or update on question_logs
  for each row execute function protect_question_logs_student_write();

grant insert, delete on question_logs to authenticated;

notify pgrst, 'reload schema';
