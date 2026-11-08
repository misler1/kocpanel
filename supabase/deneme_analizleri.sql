-- ============================================================
-- Deneme analizleri: kaydedilir, koç isterse öğrenciye gönderir
-- ============================================================
-- • Koç/öğretmen Deneme sonuçları > Analiz > "Yapay zeka ile analiz et" dediğinde analiz kaydedilir.
-- • "Öğrenciye gönder" ile öğrenci panelinde görünür ve öğrenciye bildirim gider.
-- • Görüşme notlarına dayanan değerlendirme (capraz_degerlendirme) öğrenciye gösterilmez.
-- ÖNCE notifications.sql çalıştırılmış olmalı. Supabase SQL Editor'da BİR KEZ çalıştırın; tekrar çalıştırmak zararsızdır.
--
-- Geri alma: drop table if exists public.exam_analyses cascade;

create table if not exists exam_analyses (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid not null references profiles(id) on delete cascade, -- analizi yapan
  student_id uuid not null references students(id) on delete cascade,
  exam_ids uuid[] not null default '{}',
  exam_names text[] not null default '{}',
  exam_dates text[] not null default '{}',
  analysis jsonb not null,
  shared_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists idx_exam_analyses_student on exam_analyses(student_id, created_at desc);

alter table exam_analyses enable row level security;

-- Analizi yapan görür/siler; öğrenci yalnızca kendisine gönderilmiş olanları görür
drop policy if exists exam_analyses_author on exam_analyses;
create policy exam_analyses_author on exam_analyses for select to authenticated using (coach_id = auth.uid());
drop policy if exists exam_analyses_author_delete on exam_analyses;
create policy exam_analyses_author_delete on exam_analyses for delete to authenticated using (coach_id = auth.uid());
drop policy if exists exam_analyses_student on exam_analyses;
create policy exam_analyses_student on exam_analyses for select to authenticated
  using (shared_at is not null and exists (select 1 from students s where s.id = student_id and s.profile_id = auth.uid()));
-- Ekleme: yalnızca deneme sonuçlarını görebildiği öğrenci için, kendi adına
drop policy if exists exam_analyses_insert on exam_analyses;
create policy exam_analyses_insert on exam_analyses for insert to authenticated
  with check (coach_id = auth.uid() and exists (select 1 from exams e where e.student_id = exam_analyses.student_id));

revoke all on exam_analyses from public, anon, authenticated;
grant select, insert, delete on exam_analyses to authenticated;
grant all on exam_analyses to service_role;

-- Öğrenciye gönder (yalnızca analizi yapan); öğrenciye bildirim gider
create or replace function share_exam_analysis(p_id uuid) returns void
language plpgsql security definer set search_path = public as $$
declare a exam_analyses%rowtype; v_profile uuid;
begin
  select * into a from exam_analyses where id = p_id and coach_id = auth.uid();
  if a.id is null then raise exception 'Analiz bulunamadı'; end if;
  select profile_id into v_profile from students where id = a.student_id;
  if v_profile is null then raise exception 'Öğrencinin hesabı yok; önce öğrenci hesabı açılmalı'; end if;
  if a.shared_at is null then
    update exam_analyses set shared_at = now() where id = a.id;
  end if;
  perform notify_user(v_profile, 'deneme', 'Deneme analizin hazır 📊',
    'Koçun son denemelerinin analizini gönderdi. Güçlü ve geliştirmen gereken konulara göz at.',
    '/ogrenci/analiz/' || a.id::text, 0);
end $$;
revoke all on function share_exam_analysis(uuid) from public, anon;
grant execute on function share_exam_analysis(uuid) to authenticated;

notify pgrst, 'reload schema';
