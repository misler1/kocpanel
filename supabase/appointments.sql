-- ============================================================
-- Ajanda: koçun/öğretmenin takvime planladığı görüşmeler
-- ============================================================
-- • appointments: planlanan görüşme (öğrenciyle, bir öğretmen/koçla ya da sistemde olmayan biriyle).
--   "Görüşme kayıtları" (meetings) yapılmış görüşmenin notlarıdır; burası ileriye dönük takvimdir.
-- • Yazma yalnızca RPC ile: yetki kontrolü + katılımcıya panel içi bildirim aynı yerde yapılır.
-- • Görebilenler: planlayan, davet edilen öğretmen/koç ve (öğrenciyle görüşmeyse) öğrencinin kendisi.
-- Supabase SQL Editor'da BİR KEZ çalıştırın. Mevcut veriyi değiştirmez; tekrar çalıştırmak zararsızdır.

create table if not exists appointments (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references profiles(id) on delete cascade,
  starts_at timestamptz not null,
  duration_minutes int not null default 40 check (duration_minutes between 5 and 600),
  title text,
  note text,
  location text,
  student_id uuid references students(id) on delete cascade,
  participant_id uuid references profiles(id) on delete set null,
  other_name text,
  status text not null default 'planlandi' check (status in ('planlandi', 'iptal')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_appointments_owner_time on appointments(owner_id, starts_at);
create index if not exists idx_appointments_participant_time on appointments(participant_id, starts_at);
create index if not exists idx_appointments_student_time on appointments(student_id, starts_at);

alter table appointments enable row level security;

drop policy if exists "appointments_select" on appointments;
create policy "appointments_select" on appointments for select using (
  owner_id = auth.uid()
  or participant_id = auth.uid()
  or exists (select 1 from students s where s.id = appointments.student_id and s.profile_id = auth.uid())
);

revoke insert, update, delete on appointments from authenticated, anon;
grant select on appointments to authenticated;
grant all on appointments to service_role;

-- "5 Kasım Çarşamba 15:00" biçiminde Türkiye saatiyle tarih
create or replace function _tr_datetime(p timestamptz)
returns text language sql immutable set search_path = public as $$
  select extract(day from p at time zone 'Europe/Istanbul')::int || ' '
    || (array['Ocak','Şubat','Mart','Nisan','Mayıs','Haziran','Temmuz','Ağustos','Eylül','Ekim','Kasım','Aralık'])
         [extract(month from p at time zone 'Europe/Istanbul')::int] || ' '
    || (array['Pazar','Pazartesi','Salı','Çarşamba','Perşembe','Cuma','Cumartesi'])
         [extract(dow from p at time zone 'Europe/Istanbul')::int + 1] || ' '
    || to_char(p at time zone 'Europe/Istanbul', 'HH24:MI');
$$;

-- Planlayan, bu öğrenciyle görüşme planlayabilir mi? (koçu, sorumlu koçu, öğretmeni ya da yönetici)
create or replace function _staff_can_plan_student(p_staff uuid, p_student uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from profiles where id = p_staff and is_admin)
      or exists (select 1 from students s
                 where s.id = p_student
                   and (s.coach_id = p_staff or s.responsible_coach_id = p_staff
                        or exists (select 1 from student_teachers t where t.student_id = s.id and t.teacher_id = p_staff)));
$$;

-- Katılımcılara bildirim (öğrenci → öğrenci paneli, öğretmen/koç → ajanda)
create or replace function _notify_appointment(p_appt appointments, p_title text)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_owner text;
  v_body text;
  v_student_profile uuid;
begin
  select full_name into v_owner from profiles where id = p_appt.owner_id;
  v_body := coalesce(v_owner, 'Koçunuz') || ' · ' || _tr_datetime(p_appt.starts_at)
    || ' (' || p_appt.duration_minutes || ' dk)'
    || coalesce(' · ' || nullif(trim(p_appt.title), ''), '')
    || coalesce(' · ' || nullif(trim(p_appt.location), ''), '');
  if p_appt.student_id is not null then
    select profile_id into v_student_profile from students where id = p_appt.student_id;
    perform notify_user(v_student_profile, 'randevu', p_title, v_body, '/ogrenci', 0);
  end if;
  if p_appt.participant_id is not null and p_appt.participant_id <> p_appt.owner_id then
    perform notify_user(p_appt.participant_id, 'randevu', p_title, v_body, '/ajanda', 0);
  end if;
end $$;
revoke all on function _notify_appointment(appointments, text) from public, anon, authenticated;

-- Oluştur (p_id null) ya da güncelle. Planlayan dışında kimse değiştiremez.
create or replace function save_appointment(
  p_id uuid, p_starts_at timestamptz, p_duration int, p_title text, p_note text, p_location text,
  p_student_id uuid, p_participant_id uuid, p_other_name text
) returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_old appointments;
  v_new appointments;
begin
  if not _is_staff(v_uid) and not exists (select 1 from profiles where id = v_uid and is_admin) then
    raise exception 'Görüşme planlama yetkiniz yok';
  end if;
  if p_starts_at is null then raise exception 'Tarih ve saat seçin'; end if;
  if p_duration is null or p_duration < 5 or p_duration > 600 then raise exception 'Süre 5-600 dakika olmalı'; end if;
  if p_student_id is not null and not _staff_can_plan_student(v_uid, p_student_id) then
    raise exception 'Bu öğrenciyle görüşme planlayamazsınız';
  end if;
  if p_participant_id is not null and (p_participant_id = v_uid or not _is_staff(p_participant_id)) then
    raise exception 'Seçilen kişi bir öğretmen/koç değil';
  end if;
  if p_student_id is null and p_participant_id is null and nullif(trim(coalesce(p_other_name, '')), '') is null
     and nullif(trim(coalesce(p_title, '')), '') is null then
    raise exception 'Kiminle görüşüleceğini ya da bir başlık yazın';
  end if;

  if p_id is null then
    insert into appointments (owner_id, starts_at, duration_minutes, title, note, location, student_id, participant_id, other_name)
    values (v_uid, p_starts_at, p_duration, nullif(trim(p_title), ''), nullif(trim(p_note), ''), nullif(trim(p_location), ''),
            p_student_id, p_participant_id, nullif(trim(p_other_name), ''))
    returning * into v_new;
    perform _notify_appointment(v_new, 'Yeni görüşme planlandı');
    return v_new.id;
  end if;

  select * into v_old from appointments where id = p_id;
  if v_old.id is null or v_old.owner_id <> v_uid then raise exception 'Görüşme bulunamadı'; end if;

  update appointments set
    starts_at = p_starts_at, duration_minutes = p_duration, title = nullif(trim(p_title), ''),
    note = nullif(trim(p_note), ''), location = nullif(trim(p_location), ''),
    student_id = p_student_id, participant_id = p_participant_id, other_name = nullif(trim(p_other_name), ''),
    status = 'planlandi', updated_at = now()
  where id = p_id returning * into v_new;

  -- Yalnızca katılımcıyı ilgilendiren değişikliklerde bildirim (not/başlık düzeltmesi bildirim üretmez)
  if v_old.status = 'iptal' then
    perform _notify_appointment(v_new, 'Görüşme yeniden planlandı');
  elsif v_new.starts_at <> v_old.starts_at or v_new.duration_minutes <> v_old.duration_minutes then
    perform _notify_appointment(v_new, 'Görüşme saati değişti');
  elsif v_new.student_id is distinct from v_old.student_id or v_new.participant_id is distinct from v_old.participant_id then
    perform _notify_appointment(v_new, 'Yeni görüşme planlandı');
  end if;
  return v_new.id;
end $$;

create or replace function cancel_appointment(p_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_appt appointments;
begin
  update appointments set status = 'iptal', updated_at = now()
    where id = p_id and owner_id = auth.uid() and status <> 'iptal'
    returning * into v_appt;
  if v_appt.id is null then raise exception 'Görüşme bulunamadı'; end if;
  perform _notify_appointment(v_appt, 'Görüşme iptal edildi');
end $$;

revoke all on function save_appointment(uuid, timestamptz, int, text, text, text, uuid, uuid, text) from public, anon;
revoke all on function cancel_appointment(uuid) from public, anon;
grant execute on function save_appointment(uuid, timestamptz, int, text, text, text, uuid, uuid, text) to authenticated;
grant execute on function cancel_appointment(uuid) to authenticated;

notify pgrst, 'reload schema';
