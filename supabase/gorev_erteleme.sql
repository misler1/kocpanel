-- ============================================================
-- Görev erteleme
-- ============================================================
-- * Koç, yapılmamış bir program görevini daha sonraki bir güne erteler: görev o güne kopyalanır,
--   eski görev "Yapılmadı · ertelendi → 18.11" olarak silik durur (ertelenmiş görev yapılmadı sayılır).
-- * Rapor: eski görev yapılmadı görünür; ertelenen kopya yapıldıysa yüzde hesabında yapıldı sayılır
--   (kopya ayrıca sayılmaz, aynı görev iki kez hesaba girmez).
-- * Kopya, öğrencinin o tarihi kapsayan program haftasına yazılır; o hafta için program yoksa hafta
--   öğrencinin "hafta başlangıç günü"ne göre hesaplanır (Ajanda görüşmeleriyle aynı kural).
-- * Erteleme geri alınabilir (kopya henüz yapılmadıysa).
-- Fonksiyonlar çağıranın yetkisiyle çalışır: görevi yalnızca programı düzenleyebilen (koç) erteleyebilir.
-- Supabase SQL Editor'da çalıştırın. Mevcut veriyi değiştirmez; tekrar çalıştırmak zararsızdır.

alter table question_logs add column if not exists postponed_to_id uuid references question_logs(id) on delete set null;
alter table question_logs add column if not exists postponed_to_date date;
alter table question_logs add column if not exists postponed_from_id uuid references question_logs(id) on delete set null;
alter table question_logs add column if not exists postponed_from_date date;
create index if not exists idx_question_logs_postponed_from on question_logs(postponed_from_id) where postponed_from_id is not null;

-- Görevin takvim tarihi: program haftasının başladığı günden plan_day'e (Pazartesi = 0) kadar
create or replace function _task_date(p_week_start date, p_plan_day int)
returns date language sql immutable as $$
  select p_week_start + ((coalesce(p_plan_day, 0) - (extract(isodow from p_week_start)::int - 1) + 7) % 7);
$$;

create or replace function postpone_task(p_id uuid, p_date date)
returns uuid language plpgsql security invoker set search_path = public as $$
declare
  t question_logs;
  v_from date;
  v_day int := extract(isodow from p_date)::int - 1;
  v_start_day int;
  v_ws date;
  v_we date;
  v_new uuid := gen_random_uuid();
begin
  if auth.uid() is null then raise exception 'Giriş gerekli'; end if;
  select * into t from question_logs where id = p_id;
  if t.id is null then raise exception 'Görev bulunamadı'; end if;
  if t.appointment_id is not null then raise exception 'Görüşme görevleri Ajanda''dan taşınır'; end if;
  if t.student_done then raise exception 'Yapılmış görev ertelenemez'; end if;
  if t.postponed_to_id is not null then raise exception 'Bu görev zaten ertelendi'; end if;
  v_from := _task_date(t.week_start, t.plan_day);
  if p_date is null or p_date <= v_from then raise exception 'Görevin gününden sonraki bir gün seçin'; end if;

  -- Bu tarihi kapsayan program haftası (Ajanda görüşmeleri hariç)
  select week_start, coalesce(week_end, week_start + 6) into v_ws, v_we
    from question_logs
   where student_id = t.student_id and appointment_id is null
     and week_start <= p_date and coalesce(week_end, week_start + 6) >= p_date
   order by week_start desc limit 1;
  if v_ws is null then
    select coalesce(week_start_day, 0) into v_start_day from students where id = t.student_id;
    v_ws := p_date - ((v_day - coalesce(v_start_day, 0) + 7) % 7);
    v_we := v_ws + 6;
  end if;

  -- Kopya: görevin tüm alanları, işaretler sıfırlanmış olarak yeni güne
  insert into question_logs
  select (jsonb_populate_record(null::question_logs, to_jsonb(t) || jsonb_build_object(
    'id', v_new, 'created_at', now(),
    'week_start', v_ws, 'week_end', v_we, 'plan_day', v_day,
    'done_count', 0, 'topic_done_minutes', 0,
    'student_done', false, 'student_done_at', null,
    'student_missed', false, 'student_missed_at', null, 'student_missed_note', null, 'student_missed_by', null,
    'postponed_to_id', null, 'postponed_to_date', null,
    'postponed_from_id', t.id, 'postponed_from_date', v_from
  ))).*;

  update question_logs set postponed_to_id = v_new, postponed_to_date = p_date where id = t.id;
  return v_new;
end $$;

-- Ertelemeyi geri al: kopya silinir, eski görev eski haline döner
create or replace function unpostpone_task(p_id uuid)
returns void language plpgsql security invoker set search_path = public as $$
declare
  t question_logs;
  c question_logs;
begin
  if auth.uid() is null then raise exception 'Giriş gerekli'; end if;
  select * into t from question_logs where id = p_id;
  if t.id is null or t.postponed_to_id is null then raise exception 'Ertelenmiş görev bulunamadı'; end if;
  select * into c from question_logs where id = t.postponed_to_id;
  if c.id is not null and (c.student_done or c.postponed_to_id is not null) then
    raise exception 'Ertelenen görev yapıldı ya da yeniden ertelendi; geri alınamaz';
  end if;
  if c.id is not null then delete from question_logs where id = c.id; end if;
  update question_logs set postponed_to_id = null, postponed_to_date = null where id = t.id;
end $$;

revoke all on function postpone_task(uuid, date) from public, anon;
grant execute on function postpone_task(uuid, date) to authenticated;
revoke all on function unpostpone_task(uuid) from public, anon;
grant execute on function unpostpone_task(uuid) to authenticated;

notify pgrst, 'reload schema';
