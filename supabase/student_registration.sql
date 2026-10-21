-- Öğrenci kendi kendine kayıt + iki aşamalı onay — Supabase SQL Editor'da BİR KEZ çalıştırın.
-- Yeni tablo: student_registrations. Mevcut tablolara dokunmaz, veri silmez.
-- (students.coach_id zorunlu olduğu için, koçu henüz olmayan başvurular ayrı tabloda tutulur.)

create table if not exists student_registrations (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null unique references profiles(id) on delete cascade,
  full_name text not null,
  phone text not null,
  birth_date date not null,
  requested_coach_id uuid references profiles(id) on delete set null, -- öğrencinin seçtiği koç (boş olabilir)
  assigned_coach_id uuid references profiles(id) on delete set null,  -- onay verecek / atanan koç
  -- admin_bekliyor -> koc_bekliyor -> onaylandi   |   admin_bekliyor -> onaylandi (koç seçilmediyse)   |   reddedildi
  status text not null default 'admin_bekliyor'
    check (status in ('admin_bekliyor', 'koc_bekliyor', 'onaylandi', 'reddedildi')),
  admin_decided_at timestamptz,
  coach_decided_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_student_registrations_status on student_registrations(status);
create index if not exists idx_student_registrations_assigned on student_registrations(assigned_coach_id);

alter table student_registrations enable row level security;

-- Yalnızca OKUMA politikaları; yazma işlemleri sunucu API'sinden (service_role) yapılır.
drop policy if exists "student_registrations_admin_select" on student_registrations;
create policy "student_registrations_admin_select" on student_registrations for select
  using (exists (select 1 from profiles p where p.id = auth.uid() and p.is_admin = true));

drop policy if exists "student_registrations_coach_select" on student_registrations;
create policy "student_registrations_coach_select" on student_registrations for select
  using (assigned_coach_id = auth.uid());

drop policy if exists "student_registrations_self_select" on student_registrations;
create policy "student_registrations_self_select" on student_registrations for select
  using (profile_id = auth.uid());

grant all on student_registrations to service_role;

notify pgrst, 'reload schema';
