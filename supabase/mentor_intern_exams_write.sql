-- Rehber koç, stajyerlerinin öğrencilerine deneme ekleyebilir / güncelleyebilir / silebilir.
-- Önceden yalnızca okuyabiliyordu ("mentors read interns exams"); toplu deneme yükleme ve
-- "Kazanım ve sıralama ekle" stajyer öğrencilerine kayıt yazamıyordu.
-- mentor_can_see_student: öğrencinin koçu, giriş yapan kullanıcının stajyeri mi (canlı veritabanında var).
drop policy if exists "mentors write interns exams" on exams;
create policy "mentors write interns exams" on exams for all to authenticated
  using (mentor_can_see_student(student_id))
  with check (mentor_can_see_student(student_id));
