-- ============================================================
-- Ajanda → haftalık program: öğrenciyle planlanan görüşme, öğrencinin haftalık programına
-- "Görüşme" görevi olarak otomatik eklenir.
-- ============================================================
-- • Görüşmenin günü/saati değişirse görev de taşınır; görüşme iptal edilirse ya da öğrenci
--   kaldırılırsa görev silinir. Bağ question_logs.appointment_id ile kurulur.
-- • Görev, öğrencinin o tarihi kapsayan program haftasına yazılır; o hafta için henüz program
--   yoksa hafta, öğrencinin "hafta başlangıç günü"ne göre hesaplanır.
-- • appointments.sql'den SONRA, BİR KEZ çalıştırın. Mevcut veriyi değiştirmez; tekrar çalıştırmak zararsızdır.

alter table question_logs add column if not exists appointment_id uuid references appointments(id) on delete cascade;
create unique index if not exists idx_question_logs_appointment on question_logs(appointment_id) where appointment_id is not null;

create or replace function _sync_appointment_program()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_local timestamp := new.starts_at at time zone 'Europe/Istanbul';
  v_date date := (new.starts_at at time zone 'Europe/Istanbul')::date;
  v_day int := extract(isodow from new.starts_at at time zone 'Europe/Istanbul')::int - 1; -- Pazartesi = 0
  v_start_day int;
  v_ws date;
  v_we date;
  v_existing question_logs;
  v_topic text := coalesce(nullif(trim(new.title), ''), 'Koçluk görüşmesi');
begin
  -- Öğrencisiz ya da iptal edilmiş görüşmenin programda yeri yok
  if new.status <> 'planlandi' or new.student_id is null then
    delete from question_logs where appointment_id = new.id;
    return new;
  end if;

  -- Bu tarihi kapsayan mevcut program haftası (yalnızca koçun yazdığı görevlere bakılır)
  select week_start, coalesce(week_end, week_start + 6) into v_ws, v_we
    from question_logs
   where student_id = new.student_id and appointment_id is null
     and week_start <= v_date and coalesce(week_end, week_start + 6) >= v_date
   order by week_start desc limit 1;
  if v_ws is null then
    select coalesce(week_start_day, 0) into v_start_day from students where id = new.student_id;
    v_ws := v_date - ((v_day - v_start_day + 7) % 7);
    v_we := v_ws + 6;
  end if;

  select * into v_existing from question_logs where appointment_id = new.id;
  if v_existing.id is null then
    insert into question_logs (
      student_id, coach_id, subject, topic, resource_name, week_start, week_end, plan_day,
      start_time, end_time, target_count, done_count, student_done, student_added, appointment_id
    ) values (
      new.student_id, new.owner_id, 'Görüşme', v_topic, nullif(trim(new.location), ''), v_ws, v_we, v_day,
      v_local::time, (v_local + make_interval(mins => new.duration_minutes))::time, 0, 0, false, false, new.id
    );
  else
    update question_logs set
      student_id = new.student_id, coach_id = new.owner_id, topic = v_topic, resource_name = nullif(trim(new.location), ''),
      week_start = v_ws, week_end = v_we, plan_day = v_day,
      start_time = v_local::time, end_time = (v_local + make_interval(mins => new.duration_minutes))::time,
      -- Başka öğrenciye ya da başka güne taşındıysa "yapıldı" işareti sıfırlanır
      student_done = case when v_existing.student_id = new.student_id and v_existing.week_start = v_ws
                               and v_existing.plan_day = v_day then v_existing.student_done else false end,
      student_done_at = case when v_existing.student_id = new.student_id and v_existing.week_start = v_ws
                                  and v_existing.plan_day = v_day then v_existing.student_done_at else null end
    where id = v_existing.id;
  end if;
  return new;
end $$;

drop trigger if exists trg_appointment_program on appointments;
create trigger trg_appointment_program
  after insert or update of starts_at, duration_minutes, title, location, student_id, status on appointments
  for each row execute function _sync_appointment_program();

-- ------------------------------------------------------------
-- Öğrencinin görüşme saati için değişiklik talebi
-- ------------------------------------------------------------
-- Öğrenci görüşmeyi doğrudan değiştiremez (programdaki görevi de; protect_question_logs_student_write).
-- Bunun yerine yeni bir saat önerir ve not yazar; talep görüşmeyi planlayana bildirim olarak gider.
-- Planlayan görüşmenin saatini değiştirdiğinde ya da iptal ettiğinde talep kendiliğinden kapanır.
alter table appointments add column if not exists change_request_at timestamptz;      -- önerilen yeni zaman
alter table appointments add column if not exists change_request_note text;
alter table appointments add column if not exists change_requested_at timestamptz;    -- talebin gönderildiği an

create or replace function request_appointment_change(p_id uuid, p_proposed timestamptz, p_note text)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_appt appointments;
  v_student students;
  v_body text;
begin
  select * into v_appt from appointments where id = p_id;
  if v_appt.id is null or v_appt.status <> 'planlandi' then raise exception 'Görüşme bulunamadı'; end if;
  select * into v_student from students where id = v_appt.student_id;
  if v_student.id is null or v_student.profile_id is distinct from auth.uid() then
    raise exception 'Bu görüşme için talepte bulunamazsınız';
  end if;
  if v_appt.starts_at < now() then raise exception 'Geçmiş bir görüşme için talep gönderilemez'; end if;
  if p_proposed is null and nullif(trim(coalesce(p_note, '')), '') is null then
    raise exception 'Önerdiğin zamanı ya da bir not yaz';
  end if;
  if p_proposed is not null and p_proposed < now() then raise exception 'Önerdiğin zaman geçmişte kalıyor'; end if;

  update appointments set change_request_at = p_proposed, change_request_note = nullif(trim(p_note), ''),
    change_requested_at = now()
  where id = p_id;

  v_body := v_student.full_name || ' · mevcut: ' || _tr_datetime(v_appt.starts_at)
    || coalesce(' · önerilen: ' || _tr_datetime(p_proposed), '')
    || coalesce(' · "' || nullif(trim(p_note), '') || '"', '');
  perform notify_user(v_appt.owner_id, 'randevu', 'Görüşme saati için değişiklik talebi', v_body, '/ajanda', 0);
end $$;
revoke all on function request_appointment_change(uuid, timestamptz, text) from public, anon;
grant execute on function request_appointment_change(uuid, timestamptz, text) to authenticated;

-- Planlayan talebi kabul etmeden kapatır (saat aynı kalır); öğrenciye bildirim gider
create or replace function dismiss_appointment_request(p_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_appt appointments;
  v_student_profile uuid;
begin
  update appointments set change_request_at = null, change_request_note = null, change_requested_at = null
    where id = p_id and owner_id = auth.uid() and change_requested_at is not null
    returning * into v_appt;
  if v_appt.id is null then raise exception 'Açık talep bulunamadı'; end if;
  select profile_id into v_student_profile from students where id = v_appt.student_id;
  perform notify_user(v_student_profile, 'randevu', 'Görüşme saatin aynı kaldı',
    'Koçun görüşmeyi planlandığı saatte yapmak istiyor: ' || _tr_datetime(v_appt.starts_at), '/ogrenci/haftalik-takip', 0);
end $$;
revoke all on function dismiss_appointment_request(uuid) from public, anon;
grant execute on function dismiss_appointment_request(uuid) to authenticated;

-- Planlayan saati değiştirince ya da iptal edince açık talep kapanır
create or replace function _clear_appointment_request()
returns trigger language plpgsql as $$
begin
  if new.starts_at is distinct from old.starts_at or new.status is distinct from old.status then
    new.change_request_at := null;
    new.change_request_note := null;
    new.change_requested_at := null;
  end if;
  return new;
end $$;
drop trigger if exists trg_appointment_clear_request on appointments;
create trigger trg_appointment_clear_request
  before update of starts_at, status on appointments
  for each row execute function _clear_appointment_request();

-- Bu dosyadan önce planlanmış (bugünden sonraki) öğrenci görüşmelerini de programa işle
update appointments set status = status
 where status = 'planlandi' and student_id is not null and starts_at >= now() - interval '1 day';

notify pgrst, 'reload schema';
