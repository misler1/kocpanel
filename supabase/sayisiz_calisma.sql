-- ============================================================
-- Öğrencinin çalışma kaydında soru sayısı / süre isteğe bağlı
-- ============================================================
-- Önceden plan dışı çalışmada "Soru sayısı ya da süre girin" zorunluydu; öğrenci hatırlamayınca uyduruyordu.
-- Şimdi ders yeterli: sayı girilmezse çalışma konu adıyla, "no_numbers" işaretiyle günlüğe yazılır
-- (süre 0 olduğu için toplamlar değişmez). Görev tiklenirken de konu bilgisi böylece kaybolmaz.
-- student_daily_log.sql'den SONRA çalıştırın. Tekrar çalıştırmak zararsızdır.

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
  -- Soru sayısı ve süre isteğe bağlı: öğrenci hatırlamıyorsa uydurmasın. Sayısız çalışma "no_numbers" işaretiyle
  -- konu çalışması olarak kaydedilir; koç programda ve günlükte "sayı girilmedi" görür.

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
  elsif v_count = 0 then
    v_t := jsonb_strip_nulls(jsonb_build_object(
      'subject', v_subject, 'topic', coalesce(v_topic, ''), 'resource', v_resource, 'duration_minutes', 0,
      'no_numbers', true, 'task_id', p_task_id::text, 'by', 'ogrenci'));
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

notify pgrst, 'reload schema';
