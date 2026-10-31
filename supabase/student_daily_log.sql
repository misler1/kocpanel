-- ============================================================
-- Öğrenci günlük çalışma kaydı + hedef net (Aşama 1)
-- ============================================================
-- Öğrenci programdaki görevi tiklediğinde "kaç soru, kaç doğru/yanlış" bilgisini girer;
-- bu bilgi o günün daily_logs satırına yazılır ve görev otomatik tiklenir. Böylece öğrenci
-- aynı çalışmayı iki kez girmez, koçun gördüğü günlük ve "yapılan" sayıları anında güncellenir.
-- Programda olmayan çalışmalar da (plan dışı) aynı yolla günlüğe eklenir.
-- Supabase SQL Editor'da BİR KEZ çalıştırın. Mevcut veriyi silmez; tekrar çalıştırmak zararsızdır.

-- 1) Hedef netler: { "TYT": 90, "AYT": 55, "LGS": 80 }
alter table students add column if not exists target_nets jsonb not null default '{}'::jsonb;

-- 2) Öğrenci kendi günlüklerini okuyabilsin (yazma yalnızca aşağıdaki fonksiyonlarla)
drop policy if exists "daily_logs_student_select" on daily_logs;
create policy "daily_logs_student_select" on daily_logs for select
  using (exists (select 1 from students s where s.id = daily_logs.student_id and s.profile_id = auth.uid()));
grant select on daily_logs to authenticated;

-- 3) Görev koruma tetikleyicisi: öğrencinin koç görevinde yalnızca tik değiştirebildiği kural aynen kalır,
--    tek fark aşağıdaki güvenli fonksiyonların "yapılan soru" sayısını da güncelleyebilmesidir.
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
    if (to_jsonb(new) - 'student_done' - 'student_done_at')
       is distinct from (to_jsonb(old) - 'student_done' - 'student_done_at') then
      raise exception 'Öğrenci programı doğrudan değiştiremez; koça değişiklik talebi gönderin';
    end if;
  else
    new.student_added := true;
  end if;
  return new;
end $$;

-- Bir görevin (task_id) tüm günlük kayıtlarını öğrencinin günlüklerinden çıkarır
create or replace function _remove_task_entries(p_student uuid, p_task uuid)
returns void language sql security definer set search_path = public as $$
  update daily_logs d set
    question_solved = coalesce((select jsonb_agg(e) from jsonb_array_elements(coalesce(d.question_solved::jsonb, '[]'::jsonb)) e
                                where e->>'task_id' is distinct from p_task::text), '[]'::jsonb),
    topic_studies   = coalesce((select jsonb_agg(e) from jsonb_array_elements(coalesce(d.topic_studies::jsonb, '[]'::jsonb)) e
                                where e->>'task_id' is distinct from p_task::text), '[]'::jsonb)
  where d.student_id = p_student
    and (coalesce(d.question_solved::jsonb, '[]'::jsonb) @> jsonb_build_array(jsonb_build_object('task_id', p_task::text))
      or coalesce(d.topic_studies::jsonb, '[]'::jsonb) @> jsonb_build_array(jsonb_build_object('task_id', p_task::text)));
$$;
revoke all on function _remove_task_entries(uuid, uuid) from public, anon, authenticated;

-- 4) Çalışma kaydet. p_task_id doluysa görev de tiklenir; boşsa plan dışı çalışmadır.
create or replace function student_log_study(
  p_task_id uuid, p_log_date date, p_subject text, p_topic text,
  p_count int, p_correct int, p_wrong int, p_minutes int
) returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_student students%rowtype;
  v_task question_logs%rowtype;
  v_subject text := nullif(trim(coalesce(p_subject, '')), '');
  v_topic text := nullif(trim(coalesce(p_topic, '')), '');
  v_resource text;
  v_count int := greatest(coalesce(p_count, 0), 0);
  v_correct int := greatest(coalesce(p_correct, 0), 0);
  v_wrong int := greatest(coalesce(p_wrong, 0), 0);
  v_minutes int := greatest(coalesce(p_minutes, 0), 0);
  v_log_id uuid;
  v_q jsonb := null;
  v_t jsonb := null;
begin
  select * into v_student from students where profile_id = auth.uid() limit 1;
  if v_student.id is null then raise exception 'Öğrenci kaydı bulunamadı'; end if;

  if p_log_date is null or p_log_date > current_date + 1 or p_log_date < current_date - 7 then
    raise exception 'Yalnızca son 7 günün çalışması kaydedilebilir';
  end if;
  if v_count > 2000 or v_minutes > 1440 then raise exception 'Sayılar çok büyük görünüyor'; end if;
  if v_correct + v_wrong > v_count and v_count > 0 then raise exception 'Doğru + yanlış, çözülen soru sayısını geçemez'; end if;
  if v_count = 0 and v_correct + v_wrong > 0 then v_count := v_correct + v_wrong; end if;

  if p_task_id is not null then
    select * into v_task from question_logs where id = p_task_id and student_id = v_student.id;
    if v_task.id is null then raise exception 'Görev bulunamadı'; end if;
    v_subject := coalesce(v_subject, v_task.subject);
    v_topic := coalesce(v_topic, v_task.topic);
    v_resource := v_task.resource_name;
    perform _remove_task_entries(v_student.id, p_task_id); -- aynı görev yeniden kaydedilirse eskisinin yerine geçer
  end if;

  if v_subject is null then raise exception 'Ders seçin'; end if;
  if v_count = 0 and v_minutes = 0 and p_task_id is null then raise exception 'Soru sayısı ya da süre girin'; end if;

  if v_count > 0 then
    v_q := jsonb_strip_nulls(jsonb_build_object(
      'subject', v_subject, 'topic', coalesce(v_topic, ''), 'resource', v_resource, 'count', v_count,
      'correct', nullif(v_correct, 0), 'wrong', nullif(v_wrong, 0),
      'task_id', p_task_id::text, 'by', 'ogrenci'));
  end if;
  if v_minutes > 0 then
    v_t := jsonb_strip_nulls(jsonb_build_object(
      'subject', v_subject, 'topic', coalesce(v_topic, ''), 'resource', v_resource, 'duration_minutes', v_minutes,
      'task_id', p_task_id::text, 'by', 'ogrenci'));
  end if;

  if v_q is not null or v_t is not null then
    select id into v_log_id from daily_logs
      where student_id = v_student.id and log_date = p_log_date and coalesce(archived, false) = false
      order by created_at limit 1;
    if v_log_id is null then
      insert into daily_logs (student_id, coach_id, log_date, source, question_solved, topic_studies, exams, book_reading)
      values (v_student.id, v_student.coach_id, p_log_date, 'ogrenci',
              case when v_q is null then '[]'::jsonb else jsonb_build_array(v_q) end,
              case when v_t is null then '[]'::jsonb else jsonb_build_array(v_t) end,
              '[]'::jsonb, '[]'::jsonb);
    else
      update daily_logs set
        question_solved = coalesce(question_solved::jsonb, '[]'::jsonb) || case when v_q is null then '[]'::jsonb else jsonb_build_array(v_q) end,
        topic_studies   = coalesce(topic_studies::jsonb, '[]'::jsonb)   || case when v_t is null then '[]'::jsonb else jsonb_build_array(v_t) end
      where id = v_log_id;
    end if;
  end if;

  if p_task_id is not null then
    perform set_config('app.student_log_rpc', 'on', true);
    update question_logs set
      student_done = true, student_done_at = now(),
      done_count = greatest(coalesce(done_count, 0), v_count),
      topic_done_minutes = greatest(coalesce(topic_done_minutes, 0), v_minutes)
    where id = p_task_id;
    perform set_config('app.student_log_rpc', 'off', true);
  end if;

  return jsonb_build_object('ok', true, 'count', v_count, 'minutes', v_minutes);
end $$;

-- 5) Tiki kaldır: görevin günlükteki kaydını da siler
create or replace function student_unlog_task(p_task_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_student uuid;
begin
  select id into v_student from students where profile_id = auth.uid() limit 1;
  if v_student is null then raise exception 'Öğrenci kaydı bulunamadı'; end if;
  if not exists (select 1 from question_logs where id = p_task_id and student_id = v_student) then
    raise exception 'Görev bulunamadı';
  end if;

  perform _remove_task_entries(v_student, p_task_id);
  perform set_config('app.student_log_rpc', 'on', true);
  update question_logs set student_done = false, student_done_at = null where id = p_task_id;
  perform set_config('app.student_log_rpc', 'off', true);
end $$;

-- 6) Öğrenci kendi hedef netini koyar (koç da öğrenci düzenleme ekranından değiştirebilir)
create or replace function student_set_target_net(p_exam_type text, p_net numeric)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_max numeric := case p_exam_type when 'TYT' then 120 when 'AYT' then 80 when 'LGS' then 90 else null end;
  v_result jsonb;
begin
  if v_max is null then raise exception 'Geçersiz sınav türü'; end if;
  if p_net is not null and (p_net <= 0 or p_net > v_max) then
    raise exception 'Hedef net 0 ile % arasında olmalı', v_max;
  end if;
  update students set target_nets = case
      when p_net is null then coalesce(target_nets, '{}'::jsonb) - p_exam_type
      else coalesce(target_nets, '{}'::jsonb) || jsonb_build_object(p_exam_type, round(p_net, 2)) end
    where profile_id = auth.uid()
    returning target_nets into v_result;
  if v_result is null then raise exception 'Öğrenci kaydı bulunamadı'; end if;
  return v_result;
end $$;

revoke all on function student_log_study(uuid, date, text, text, int, int, int, int) from public, anon;
revoke all on function student_unlog_task(uuid) from public, anon;
revoke all on function student_set_target_net(text, numeric) from public, anon;
grant execute on function student_log_study(uuid, date, text, text, int, int, int, int) to authenticated;
grant execute on function student_unlog_task(uuid) to authenticated;
grant execute on function student_set_target_net(text, numeric) to authenticated;

notify pgrst, 'reload schema';
