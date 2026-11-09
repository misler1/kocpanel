-- ============================================================
-- Öğrenci adına günlük takip girişi (belletmen / yurt yöneticisi / koç)
-- ============================================================
-- Yurtta öğrencilerin telefonu olmadığı için belletmen, öğrencinin o günkü program görevlerini işaretler ve
-- çözülen soru/süreyi girer. Öğrencinin kendi kullandığı student_log_study / student_unlog_task ile aynı mantık;
-- tek fark öğrenci parametre olarak verilir ve girenin adı kayda yazılır ("by": "personel", "by_name").
-- Yetki: öğrencinin koçu/sorumlu koçu, yönetici ya da öğrencide "haftalık takip" izni olan kurum personeli.
-- ÖNCE student_daily_log.sql ve yurt_personeli.sql çalıştırılmış olmalı. Tekrar çalıştırmak zararsızdır.

create or replace function _staff_can_log(p_student uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from profiles where id = auth.uid() and is_admin)
      or exists (select 1 from students s where s.id = p_student and (s.coach_id = auth.uid() or s.responsible_coach_id = auth.uid()))
      or intern_can_access_student(p_student, 'weekly_tracking');
$$;
revoke all on function _staff_can_log(uuid) from public, anon;
grant execute on function _staff_can_log(uuid) to authenticated;

create or replace function staff_log_study(
  p_student uuid, p_task_id uuid, p_log_date date, p_subject text, p_topic text,
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
  v_name text;
  v_log_id uuid;
  v_q jsonb := null;
  v_t jsonb := null;
begin
  if not _staff_can_log(p_student) then raise exception 'Bu öğrenci için giriş yetkiniz yok'; end if;
  select * into v_student from students where id = p_student;
  if v_student.id is null then raise exception 'Öğrenci bulunamadı'; end if;
  select full_name into v_name from profiles where id = auth.uid();

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
      'task_id', p_task_id::text, 'by', 'personel', 'by_name', v_name));
  end if;
  if v_minutes > 0 then
    v_t := jsonb_strip_nulls(jsonb_build_object(
      'subject', v_subject, 'topic', coalesce(v_topic, ''), 'resource', v_resource, 'duration_minutes', v_minutes,
      'task_id', p_task_id::text, 'by', 'personel', 'by_name', v_name));
  end if;

  if v_q is not null or v_t is not null then
    select id into v_log_id from daily_logs
      where student_id = v_student.id and log_date = p_log_date and coalesce(archived, false) = false
      order by created_at limit 1;
    if v_log_id is null then
      insert into daily_logs (student_id, coach_id, log_date, source, question_solved, topic_studies, exams, book_reading)
      values (v_student.id, v_student.coach_id, p_log_date, 'personel',
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

-- Tiki kaldır: görevin günlükteki kaydı da silinir
create or replace function staff_unlog_task(p_student uuid, p_task_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not _staff_can_log(p_student) then raise exception 'Bu öğrenci için giriş yetkiniz yok'; end if;
  if not exists (select 1 from question_logs where id = p_task_id and student_id = p_student) then
    raise exception 'Görev bulunamadı';
  end if;
  perform _remove_task_entries(p_student, p_task_id);
  perform set_config('app.student_log_rpc', 'on', true);
  update question_logs set student_done = false, student_done_at = null, done_count = 0, topic_done_minutes = 0
    where id = p_task_id;
  perform set_config('app.student_log_rpc', 'off', true);
end $$;

do $$
declare f text;
begin
  foreach f in array array[
    'staff_log_study(uuid, uuid, date, text, text, int, int, int, int)', 'staff_unlog_task(uuid, uuid)'
  ] loop
    execute format('revoke all on function %s from public, anon', f);
    execute format('grant execute on function %s to authenticated', f);
  end loop;
end $$;

notify pgrst, 'reload schema';
