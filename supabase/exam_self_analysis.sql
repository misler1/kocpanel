-- Öğrencinin kendi deneme analizi: yanlış/boş her soruya hata türü + not. Supabase SQL Editor'da BİR KEZ çalıştırın.
-- Notlar exams.student_analysis'e yazılır: { "items": [{ "key": "turkce|12", "type": "dikkat", "note": "..." }], "done_at": "..." }
-- Analiz tamamlanınca exams.analysis_done = true olur (koçun deneme listesindeki "analiz yapıldı" işareti).
-- student_exam_entry.sql'den SONRA çalıştırın (koruma tetikleyicisini günceller).

alter table exams add column if not exists student_analysis jsonb;

-- Koruma tetikleyicisi: öğrenci analiz alanlarını yalnızca save_exam_self_analysis üzerinden değiştirebilir
create or replace function protect_exams_student_write()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null or auth.role() = 'service_role' then return new; end if;
  if not exists (select 1 from students s where s.id = new.student_id and s.profile_id = auth.uid()) then
    return new;
  end if;
  if TG_OP = 'UPDATE' and coalesce(current_setting('app.self_analysis', true), '') = '1' then
    return new; -- öğrencinin kendi analizi (yalnızca analiz alanları değişir, fonksiyon bunu garanti eder)
  end if;
  new.entered_by_student := true;
  if TG_OP = 'INSERT' then
    new.analysis_done := false;
    new.analysis_notes := null;
    new.student_analysis := null;
  else
    new.analysis_done := old.analysis_done;
    new.analysis_notes := old.analysis_notes;
    new.student_analysis := old.student_analysis;
  end if;
  return new;
end $$;

create or replace function save_exam_self_analysis(p_exam uuid, p_items jsonb, p_done boolean)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_student uuid;
begin
  select e.student_id into v_student from exams e join students s on s.id = e.student_id
   where e.id = p_exam and s.profile_id = auth.uid();
  if v_student is null then raise exception 'Deneme bulunamadı'; end if;
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) > 400 then raise exception 'Geçersiz analiz'; end if;

  perform set_config('app.self_analysis', '1', true);
  update exams set
    student_analysis = jsonb_build_object(
      'items', (select coalesce(jsonb_agg(jsonb_build_object(
                  'key', left(i->>'key', 60),
                  'type', left(coalesce(i->>'type', ''), 20),
                  'note', left(coalesce(i->>'note', ''), 300))), '[]'::jsonb)
                from jsonb_array_elements(p_items) i),
      'done_at', case when p_done then to_jsonb(now()) else coalesce(student_analysis->'done_at', 'null'::jsonb) end,
      'updated_at', to_jsonb(now())),
    analysis_done = case when p_done then true else analysis_done end
  where id = p_exam;
  perform set_config('app.self_analysis', '', true);
end $$;
revoke all on function save_exam_self_analysis(uuid, jsonb, boolean) from public, anon;
grant execute on function save_exam_self_analysis(uuid, jsonb, boolean) to authenticated;

notify pgrst, 'reload schema';
