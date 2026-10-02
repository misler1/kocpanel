-- Öğretmen statüleri, hiyerarşi ve kurum/sınıf/öğrenci izinleri
-- Supabase SQL editor'da bir kez çalıştırın.

do $$
begin
  if not exists (select 1 from pg_type where typname = 'teacher_access_status') then
    create type teacher_access_status as enum ('coach', 'intern', 'dorm_supervisor');
  end if;

  if not exists (select 1 from pg_type where typname = 'teacher_permission_page') then
    create type teacher_permission_page as enum (
      'student_info',
      'exams',
      'topic_progress',
      'weekly_tracking',
      'meetings',
      'schedule',
      'tasks'
    );
  end if;
end $$;

create table if not exists teacher_access_profiles (
  teacher_id uuid primary key references profiles(id) on delete cascade,
  status teacher_access_status not null default 'coach',
  mentor_id uuid references profiles(id) on delete set null,
  updated_at timestamptz not null default now(),
  constraint teacher_access_profiles_not_self_mentor check (teacher_id is distinct from mentor_id)
);

create table if not exists teacher_page_permissions (
  teacher_id uuid not null references profiles(id) on delete cascade,
  page teacher_permission_page not null,
  enabled boolean not null default false,
  allowed_kurums text[] not null default '{}',
  allowed_classes text[] not null default '{}',
  excluded_student_ids uuid[] not null default '{}',
  scopes jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  primary key (teacher_id, page)
);

alter table teacher_page_permissions add column if not exists allowed_kurums text[] not null default '{}';
alter table teacher_page_permissions add column if not exists scopes jsonb not null default '{}'::jsonb;

alter table meetings add column if not exists created_by uuid references profiles(id) on delete set null;
alter table meetings add column if not exists created_by_other_name text;
update meetings set created_by = coach_id where created_by is null;
create index if not exists idx_meetings_created_by on meetings(created_by);
create index if not exists idx_teacher_access_profiles_mentor on teacher_access_profiles(mentor_id);
create index if not exists idx_teacher_page_permissions_teacher on teacher_page_permissions(teacher_id);

alter table teacher_access_profiles enable row level security;
alter table teacher_page_permissions enable row level security;

drop policy if exists "students_admin_select" on students;
create policy "students_admin_select" on students for select
  using (exists (select 1 from profiles p where p.id = auth.uid() and p.is_admin = true));


drop policy if exists "profiles_mentor_subordinate_select" on profiles;
create policy "profiles_mentor_subordinate_select" on profiles for select
  using (
    exists (
      select 1 from teacher_access_profiles tap
      where tap.teacher_id = profiles.id
        and tap.mentor_id = auth.uid()
    )
  );
drop policy if exists "teacher_access_admin_all" on teacher_access_profiles;
create policy "teacher_access_admin_all" on teacher_access_profiles for all
  using (exists (select 1 from profiles p where p.id = auth.uid() and p.is_admin = true))
  with check (exists (select 1 from profiles p where p.id = auth.uid() and p.is_admin = true));

drop policy if exists "teacher_access_self_select" on teacher_access_profiles;
create policy "teacher_access_self_select" on teacher_access_profiles for select
  using (teacher_id = auth.uid() or mentor_id = auth.uid());

drop policy if exists "teacher_page_permissions_admin_all" on teacher_page_permissions;
create policy "teacher_page_permissions_admin_all" on teacher_page_permissions for all
  using (exists (select 1 from profiles p where p.id = auth.uid() and p.is_admin = true))
  with check (exists (select 1 from profiles p where p.id = auth.uid() and p.is_admin = true));

drop policy if exists "teacher_page_permissions_self_select" on teacher_page_permissions;
create policy "teacher_page_permissions_self_select" on teacher_page_permissions for select
  using (
    teacher_id = auth.uid()
    or exists (
      select 1 from teacher_access_profiles tap
      where tap.teacher_id = teacher_page_permissions.teacher_id
        and tap.mentor_id = auth.uid()
    )
  );

create or replace function can_teacher_access_student(
  p_teacher_id uuid,
  p_student_id uuid,
  p_page teacher_permission_page
) returns boolean
language sql stable security definer
set search_path = public
as $$
  select exists (
    select 1
    from students s
    join teacher_access_profiles tap on tap.teacher_id = p_teacher_id
    join teacher_page_permissions tpp on tpp.teacher_id = tap.teacher_id and tpp.page = p_page
    where s.id = p_student_id
      and tpp.enabled = true
      and s.coach_id = tap.mentor_id
      and (
        coalesce(array_length(tpp.allowed_kurums, 1), 0) = 0
        or coalesce(nullif(trim(s.kurum), ''), '__kurumsuz__') = any(tpp.allowed_kurums)
      )
      and (
        coalesce(array_length(tpp.allowed_classes, 1), 0) = 0
        or s.sinif_sube = any(tpp.allowed_classes)
      )
      and not (s.id = any(tpp.excluded_student_ids))
  );
$$;