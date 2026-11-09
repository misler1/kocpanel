-- ============================================================
-- Öğrenci "Yapmadım" işareti
-- ============================================================
-- Öğrenci programdaki görevi yaptıysa tikliyordu; yapmadıysa bunu bildirmenin yolu yoktu.
-- Bu dosya görevlere "yapılmadı" durumunu (ve isteğe bağlı nedenini) ekler.
-- Supabase SQL Editor'da BİR KEZ çalıştırın. Mevcut veriyi silmez; tekrar çalıştırmak zararsızdır.

alter table question_logs add column if not exists student_missed boolean not null default false;
alter table question_logs add column if not exists student_missed_at timestamptz;
alter table question_logs add column if not exists student_missed_note text;

-- Koruma tetikleyicisi: öğrenci koçun görevinde yalnızca işaret alanlarını (yaptım / yapmadım) değiştirebilir.
create or replace function protect_question_logs_student_write()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  is_student boolean;
begin
  if auth.uid() is null or auth.role() = 'service_role' then
    return new;
  end if;
  if coalesce(current_setting('app.student_log_rpc', true), '') = 'on' then
    return new; -- student_log_study / student_unlog_task kendi kontrollerini yaptı
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

  if not old.student_added then
    if (to_jsonb(new) - 'student_done' - 'student_done_at' - 'student_missed' - 'student_missed_at' - 'student_missed_note')
       is distinct from (to_jsonb(old) - 'student_done' - 'student_done_at' - 'student_missed' - 'student_missed_at' - 'student_missed_note') then
      raise exception 'Öğrenci programı doğrudan değiştiremez; koça değişiklik talebi gönderin';
    end if;
  else
    new.student_added := true;
  end if;
  return new;
end $$;

-- "Yaptım" ve "Yapmadım" aynı anda olamaz: görev yapıldı işaretlenince "yapmadım" kalkar.
create or replace function question_logs_done_clears_missed()
returns trigger language plpgsql as $$
begin
  if new.student_done then
    new.student_missed := false;
    new.student_missed_at := null;
    new.student_missed_note := null;
  end if;
  if new.student_missed is distinct from true then
    new.student_missed_at := null;
    new.student_missed_note := null;
  end if;
  if length(coalesce(new.student_missed_note, '')) > 300 then
    new.student_missed_note := left(new.student_missed_note, 300);
  end if;
  return new;
end $$;

drop trigger if exists trg_question_logs_done_clears_missed on question_logs;
create trigger trg_question_logs_done_clears_missed
  before insert or update on question_logs
  for each row execute function question_logs_done_clears_missed();

notify pgrst, 'reload schema';
