-- ============================================================
-- Kurum personeli (ör. Hüdayi Vakfı Çekmeköy YKS Yurdu): yurt yöneticisi ve belletmen hesapları
-- ============================================================
-- Statüler (teacher_access_profiles.status):
--   dorm_manager    = Yurt yöneticisi (müdür, müdür yardımcısı, akşam müdür yardımcısı):
--                     öğrenci bilgileri (görme + düzenleme), deneme, haftalık takip, konu ilerleyişi (görme + düzenleme)
--   dorm_supervisor = Belletmen: öğrenci listesi (yalnızca ad/sınıf), deneme (yalnızca görme), program ve günlük (görme),
--                     haftalık takip ve konu ilerleyişi (görme + düzenleme)
-- Personel, bağlı olduğu koçun (mentor) öğrencilerinden izin verilen kurumdakileri görür (mevcut stajyer altyapısı).
-- Mesajlaşma: personel kendi kurumundaki öğrencilerle, aynı koça bağlı personelle, koçuyla ve yöneticilerle yazışır.
-- ÖNCE teacher_permissions.sql, messaging.sql, appointments.sql çalıştırılmış olmalı.
-- Supabase SQL Editor'da BİR KEZ çalıştırın. Tekrar çalıştırmak zararsızdır.

-- 1) Yeni statü ve sayfa izni
alter table teacher_access_profiles drop constraint if exists teacher_access_profiles_status_check;
alter table teacher_access_profiles add constraint teacher_access_profiles_status_check
  check (status in ('coach', 'intern', 'dorm_supervisor', 'dorm_manager'));
alter table teacher_access_profiles add column if not exists title text; -- "Müdür", "Belletmen" ...

alter table teacher_page_permissions drop constraint if exists teacher_page_permissions_page_check;
alter table teacher_page_permissions add constraint teacher_page_permissions_page_check
  check (page in ('student_info', 'student_list', 'exams', 'topic_progress', 'weekly_tracking', 'meetings', 'tasks'));

-- İlk giriş: hoş geldiniz e-postası bir kez gider
alter table profiles add column if not exists welcome_sent_at timestamptz;

-- 2) Yardımcılar
create or replace function _staff_status(p uuid) returns text
language sql stable security definer set search_path = public as $$
  select status from teacher_access_profiles where teacher_id = p;
$$;

-- Kurum personeli (koça bağlı, koç olmayan) bu öğrenciye herhangi bir izinle erişebiliyor mu?
create or replace function _scoped_staff_student(p_staff uuid, p_student uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from students s
    join teacher_access_profiles ap on ap.teacher_id = p_staff and ap.status <> 'coach' and ap.mentor_id = s.coach_id
    where s.id = p_student
      and exists (select 1 from teacher_page_permissions pp
                  where pp.teacher_id = p_staff and pp.enabled
                    and pp.scopes ? coalesce(nullif(btrim(s.kurum), ''), '__kurumsuz__'))
  );
$$;
revoke all on function _staff_status(uuid), _scoped_staff_student(uuid, uuid) from public, anon;

-- 3) Öğrenciler: belletmen listeyi görür; yurt yöneticisi bilgileri düzenleyebilir (koçu değiştiremez: kontrol aynı izin)
drop policy if exists "staff read listed students" on students;
create policy "staff read listed students" on students for select to authenticated
  using (intern_can_access_student(id, 'student_list'));

drop policy if exists "managers update permitted students" on students;
create policy "managers update permitted students" on students for update to authenticated
  using (_staff_status(auth.uid()) = 'dorm_manager' and intern_can_access_student(id, 'student_info'))
  with check (_staff_status(auth.uid()) = 'dorm_manager' and intern_can_access_student(id, 'student_info'));

-- 4) Denemeler: belletmen yalnızca görür (yazma izni belletmen dışındakilere)
drop policy if exists "interns write permitted exams" on exams;
create policy "interns write permitted exams" on exams for all to authenticated
  using (intern_can_access_student(student_id, 'exams') and coalesce(_staff_status(auth.uid()), '') <> 'dorm_supervisor')
  with check (intern_can_access_student(student_id, 'exams') and coalesce(_staff_status(auth.uid()), '') <> 'dorm_supervisor');

-- 5) Program ve günlük: haftalık takip izni olan personel görür
drop policy if exists "staff read permitted daily_logs" on daily_logs;
create policy "staff read permitted daily_logs" on daily_logs for select to authenticated
  using (intern_can_access_student(student_id, 'weekly_tracking'));
drop policy if exists "staff read permitted ders_programi" on ders_programi;
create policy "staff read permitted ders_programi" on ders_programi for select to authenticated
  using (intern_can_access_student(student_id, 'weekly_tracking'));

-- 6) Mesajlaşma
-- Öğrenci tarafı: kurum personeli de öğrencinin "öğretmeni" sayılır
create or replace function _staff_has_student(p_staff uuid, p_student_profile uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from profiles where id = p_staff and is_admin)
      or exists (select 1 from students s
                 where s.profile_id = p_student_profile
                   and (s.coach_id = p_staff or s.responsible_coach_id = p_staff
                        or exists (select 1 from student_teachers t where t.student_id = s.id and t.teacher_id = p_staff)
                        or _scoped_staff_student(p_staff, s.id)));
$$;

-- Personel ↔ personel: koça bağlı personel yalnızca koçuyla, aynı koçun personeliyle ve yöneticilerle yazışır;
-- bağımsız koçlar arasında değişiklik yok
create or replace function _staff_pair_ok(a uuid, b uuid) returns boolean
language sql stable security definer set search_path = public as $$
  with x as (
    select (select mentor_id from teacher_access_profiles where teacher_id = a and status <> 'coach') as ma,
           (select mentor_id from teacher_access_profiles where teacher_id = b and status <> 'coach') as mb,
           coalesce((select is_admin from profiles where id = a), false) as aa,
           coalesce((select is_admin from profiles where id = b), false) as ab
  )
  select case
    when ma is null and mb is null then true
    else (ma is not null and (b = ma or ma = mb or ab)) or (mb is not null and (a = mb or ma = mb or aa))
  end from x;
$$;
revoke all on function _staff_pair_ok(uuid, uuid) from public, anon;

create or replace function can_direct_message(a uuid, b uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select a <> b and (
    (_is_staff(a) and _is_staff(b) and _staff_pair_ok(a, b))
    or (_is_staff(a) and _staff_has_student(a, b))
    or (_is_staff(b) and _staff_has_student(b, a))
  );
$$;

create or replace function message_contacts()
returns table (id uuid, full_name text, role text, kurum text, sinif text, is_my_student boolean)
language sql stable security definer set search_path = public as $$
  -- öğrencinin koçları/öğretmenleri (kurum personeli dahil)
  select p.id, p.full_name, p.role::text, null::text, null::text, false
  from profiles p
  where not _is_staff(auth.uid()) and p.id <> auth.uid() and can_direct_message(auth.uid(), p.id)
  union all
  -- koç/öğretmen için: diğer koç/öğretmenler (kurum personeli için yalnızca kendi ekibi)
  select p.id, p.full_name, p.role::text, null, null, false
  from profiles p
  where _is_staff(auth.uid()) and p.id <> auth.uid() and _is_staff(p.id) and _staff_pair_ok(auth.uid(), p.id)
  union all
  -- koç/öğretmen için: hesabı olan öğrencileri
  select p.id, p.full_name, 'ogrenci', s.kurum, s.sinif_sube, true
  from students s join profiles p on p.id = s.profile_id
  where _is_staff(auth.uid()) and s.status::text = 'aktif' and _staff_has_student(auth.uid(), p.id);
$$;

-- 7) Ajanda: kurum personeli kendi kurumundaki öğrenciyle görüşme planlayabilir
create or replace function _staff_can_plan_student(p_staff uuid, p_student uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from profiles where id = p_staff and is_admin)
      or exists (select 1 from students s
                 where s.id = p_student
                   and (s.coach_id = p_staff or s.responsible_coach_id = p_staff
                        or exists (select 1 from student_teachers t where t.student_id = s.id and t.teacher_id = p_staff)))
      or _scoped_staff_student(p_staff, p_student);
$$;

notify pgrst, 'reload schema';
