-- Store the visible responsible coach/teacher for a student without changing ownership.
-- Run once in the Supabase SQL editor before using the new field in production.

alter table students add column if not exists responsible_coach_id uuid references profiles(id) on delete set null;
alter table students add column if not exists responsible_coach_other_name text;

update students
set responsible_coach_id = coach_id
where responsible_coach_id is null
  and responsible_coach_other_name is null;

create index if not exists idx_students_responsible_coach on students(responsible_coach_id);

notify pgrst, 'reload schema';

