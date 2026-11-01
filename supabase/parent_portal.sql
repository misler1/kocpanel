-- ============================================================
-- Veli erişimi (Aşama 4): paylaşılabilir rapor linki + veli hesabı
-- ============================================================
-- • parent_report_links: koçun veliye gönderdiği, giriş gerektirmeyen salt okunur rapor linki.
--   Link rastgele ve tahmin edilemez bir anahtar taşır; süresi dolar ve koç istediği an iptal edebilir.
--   Rapor sayfası veriyi sunucuda (service_role) okur; tarayıcıya yalnızca rapor özeti gider.
-- • Veli hesabı: profiles.role = 'veli', öğrenciyle bağı student_parents tablosunda (zaten var).
--   Hesap ve bağ koçun isteğiyle sunucuda açılır; veli yalnızca bağlı olduğu öğrencilerin raporunu görür.
-- Supabase SQL Editor'da BİR KEZ çalıştırın. Mevcut veriyi değiştirmez; tekrar çalıştırmak zararsızdır.

create table if not exists parent_report_links (
  id uuid primary key default gen_random_uuid(),
  token text not null unique,
  student_id uuid not null references students(id) on delete cascade,
  created_by uuid not null references profiles(id) on delete cascade,
  note text,
  expires_at timestamptz not null,
  revoked_at timestamptz,
  last_viewed_at timestamptz,
  view_count int not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists idx_parent_report_links_student on parent_report_links(student_id);

alter table parent_report_links enable row level security;

-- Koç (öğrencinin koçu ya da sorumlu koçu) kendi öğrencisinin linklerini görür, oluşturur, iptal eder
drop policy if exists "prl_coach_select" on parent_report_links;
create policy "prl_coach_select" on parent_report_links for select
  using (exists (select 1 from students s where s.id = parent_report_links.student_id
                 and (s.coach_id = auth.uid() or s.responsible_coach_id = auth.uid())));

drop policy if exists "prl_coach_insert" on parent_report_links;
create policy "prl_coach_insert" on parent_report_links for insert
  with check (created_by = auth.uid() and exists (select 1 from students s where s.id = parent_report_links.student_id
                 and (s.coach_id = auth.uid() or s.responsible_coach_id = auth.uid())));

drop policy if exists "prl_coach_update" on parent_report_links;
create policy "prl_coach_update" on parent_report_links for update
  using (exists (select 1 from students s where s.id = parent_report_links.student_id
                 and (s.coach_id = auth.uid() or s.responsible_coach_id = auth.uid())));

grant select, insert, update on parent_report_links to authenticated;
grant all on parent_report_links to service_role;

-- Veli kendi bağlarını görebilsin (panelde çocuk listesi için); bağ ekleme/silme yalnızca sunucudan
alter table student_parents enable row level security;
drop policy if exists "student_parents_self_select" on student_parents;
create policy "student_parents_self_select" on student_parents for select using (parent_id = auth.uid());
-- NOT: student_parents üzerinde students'a bakan bir kural YAZILMAMALI. students tablosunun veli kuralı
-- student_parents'a baktığı için sonsuz döngü (42P17) oluşur. Koç tarafı bağları sunucudan okur.
drop policy if exists "student_parents_coach_select" on student_parents;
grant select on student_parents to authenticated;
grant all on student_parents to service_role;

notify pgrst, 'reload schema';
