-- Öğrencinin kendi yaptığı haftalık program. Supabase SQL Editor'da BİR KEZ çalıştırın. Veri silmez.
--
-- Kurallar:
--  * Sadece platform öğrencisi ya da o tarihlerde koçun programı OLMAYAN öğrenci: program hemen geçerli olur
--    (question_logs'a yazılır, student_plan = true). Koçu varsa koça bilgi gider.
--  * O tarihlerde koçun programı VARSA: program onay bekler (student_programs.status = 'bekliyor').
--    Koç onaylarsa koçun o tarihlerdeki programı silinir, öğrencininki geçerli olur.
--    Reddederse koçun programı geçerli kalır. Cevap gelmezse öğrenci iki programı da görür,
--    işaretlemeyi koçun programında yapar.

alter table question_logs add column if not exists student_plan boolean not null default false;

create table if not exists student_programs (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references students(id) on delete cascade,
  coach_id uuid references profiles(id) on delete set null,
  week_start date not null,
  week_end date not null,
  tasks jsonb not null default '[]'::jsonb,
  note text,
  status text not null default 'bekliyor' check (status in ('aktif', 'bekliyor', 'onaylandi', 'reddedildi', 'geri_cekildi')),
  created_at timestamptz not null default now(),
  decided_at timestamptz
);
create index if not exists idx_student_programs_student on student_programs(student_id, created_at desc);
create index if not exists idx_student_programs_pending on student_programs(coach_id) where status = 'bekliyor';

alter table student_programs enable row level security;

drop policy if exists "student_programs_student_select" on student_programs;
create policy "student_programs_student_select" on student_programs for select
  using (exists (select 1 from students s where s.id = student_programs.student_id and s.profile_id = auth.uid()));

drop policy if exists "student_programs_coach_select" on student_programs;
create policy "student_programs_coach_select" on student_programs for select
  using (exists (select 1 from students s where s.id = student_programs.student_id
                 and (s.coach_id = auth.uid() or s.responsible_coach_id = auth.uid()))
         or exists (select 1 from profiles p where p.id = auth.uid() and p.is_admin));

revoke insert, update, delete on student_programs from authenticated;
grant select on student_programs to authenticated;

-- Görevleri question_logs'a yazar (öğrenci oturumunda çağrılır; koruma tetikleyicisi student_added=true yapar)
create or replace function _apply_student_program(p_student uuid, p_coach uuid, p_start date, p_end date, p_tasks jsonb)
returns void language plpgsql security definer set search_path = public as $$
declare t jsonb;
begin
  -- Öğrencinin aynı tarihlerdeki önceki kendi programı yenisiyle değişir
  delete from question_logs
   where student_id = p_student and student_plan and appointment_id is null
     and week_start <= p_end and coalesce(week_end, week_start + 6) >= p_start;
  for t in select * from jsonb_array_elements(p_tasks) loop
    insert into question_logs (student_id, coach_id, subject, topic, resource_name, week_start, week_end, plan_day,
                               target_count, start_time, end_time, student_added, student_plan)
    values (p_student, p_coach, left(trim(t->>'subject'), 120), nullif(left(trim(coalesce(t->>'topic', '')), 200), ''),
            nullif(left(trim(coalesce(t->>'resource_name', '')), 200), ''), p_start, p_end,
            greatest(0, least(6, coalesce((t->>'plan_day')::int, 0))),
            greatest(0, least(2000, coalesce((t->>'target_count')::int, 0))),
            nullif(t->>'start_time', '')::time, nullif(t->>'end_time', '')::time, true, true);
  end loop;
end $$;
revoke all on function _apply_student_program(uuid, uuid, date, date, jsonb) from public, anon, authenticated;

-- Öğrenci programını gönderir. Dönüş: 'aktif' (hemen geçerli) ya da 'bekliyor' (koç onayı bekliyor)
create or replace function submit_student_program(p_start date, p_tasks jsonb, p_note text default null)
returns text language plpgsql security definer set search_path = public as $$
declare
  s record;
  v_end date := p_start + 6;
  v_conflict boolean;
  v_id uuid;
begin
  select id, full_name, coach_id, responsible_coach_id, coalesce(platform_only, false) as platform_only
    into s from students where profile_id = auth.uid() limit 1;
  if s.id is null then raise exception 'Öğrenci kaydı bulunamadı'; end if;
  if jsonb_typeof(p_tasks) <> 'array' or jsonb_array_length(p_tasks) = 0 then raise exception 'Programa en az bir görev ekle'; end if;
  if jsonb_array_length(p_tasks) > 150 then raise exception 'Programda en fazla 150 görev olabilir'; end if;
  if exists (select 1 from jsonb_array_elements(p_tasks) t where coalesce(trim(t->>'subject'), '') = '') then
    raise exception 'Her görevin dersi yazılmalı';
  end if;
  if p_start < (now() at time zone 'Europe/Istanbul')::date - 7 then raise exception 'Geçmiş bir hafta için program yapılamaz'; end if;

  -- Bu tarihlerde koçun (öğrencinin kendi yapmadığı) programı var mı?
  v_conflict := not s.platform_only and exists (
    select 1 from question_logs q
     where q.student_id = s.id and q.appointment_id is null and not q.student_plan and not coalesce(q.student_added, false)
       and q.week_start <= v_end and coalesce(q.week_end, q.week_start + 6) >= p_start);

  -- Aynı tarihler için bekleyen eski gönderim varsa yenisi onun yerini alır
  update student_programs set status = 'geri_cekildi', decided_at = now()
   where student_id = s.id and status = 'bekliyor' and week_start <= v_end and week_end >= p_start;

  insert into student_programs (student_id, coach_id, week_start, week_end, tasks, note, status)
  values (s.id, case when s.platform_only then null else coalesce(s.responsible_coach_id, s.coach_id) end,
          p_start, v_end, p_tasks, nullif(left(trim(coalesce(p_note, '')), 500), ''),
          case when v_conflict then 'bekliyor' else 'aktif' end)
  returning id into v_id;

  if v_conflict then
    perform notify_user(coalesce(s.responsible_coach_id, s.coach_id), 'plan_talebi', 'Öğrencin kendine program yaptı 📝',
      s.full_name || ' kendi programını yaptı; senin programının yerine geçmesi için onayını bekliyor.', '/haftalik-takip', 0);
    return 'bekliyor';
  end if;

  perform _apply_student_program(s.id, s.coach_id, p_start, v_end, p_tasks);
  if not s.platform_only then
    perform notify_user(coalesce(s.responsible_coach_id, s.coach_id), 'plan_talebi', 'Öğrencin kendine program yaptı 📝',
      s.full_name || ' ' || to_char(p_start, 'DD.MM') || ' – ' || to_char(v_end, 'DD.MM') || ' için kendi programını yaptı.',
      '/ogrenciler/' || s.id, 0);
  end if;
  return 'aktif';
end $$;
revoke all on function submit_student_program(date, jsonb, text) from public, anon;
grant execute on function submit_student_program(date, jsonb, text) to authenticated;

-- Öğrenci bekleyen programını geri çeker
create or replace function withdraw_student_program(p_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  update student_programs sp set status = 'geri_cekildi', decided_at = now()
   where sp.id = p_id and sp.status = 'bekliyor'
     and exists (select 1 from students s where s.id = sp.student_id and s.profile_id = auth.uid());
end $$;
revoke all on function withdraw_student_program(uuid) from public, anon;
grant execute on function withdraw_student_program(uuid) to authenticated;

-- Koç kararı. Onay: koçun o tarihlerdeki programı silinir, öğrencininki geçerli olur.
create or replace function decide_student_program(p_id uuid, p_approve boolean)
returns void language plpgsql security definer set search_path = public as $$
declare
  sp record;
  s record;
begin
  select * into sp from student_programs where id = p_id for update;
  if sp.id is null or sp.status <> 'bekliyor' then raise exception 'Bu program artık onay beklemiyor'; end if;
  select id, profile_id, coach_id, responsible_coach_id into s from students where id = sp.student_id;
  if not (s.coach_id = auth.uid() or s.responsible_coach_id = auth.uid()
          or exists (select 1 from profiles p where p.id = auth.uid() and p.is_admin)) then
    raise exception 'Yetkisiz';
  end if;

  if p_approve then
    delete from question_logs q
     where q.student_id = s.id and q.appointment_id is null and not q.student_plan
       and q.week_start <= sp.week_end and coalesce(q.week_end, q.week_start + 6) >= sp.week_start;
    perform _apply_student_program(s.id, s.coach_id, sp.week_start, sp.week_end, sp.tasks);
    update student_programs set status = 'onaylandi', decided_at = now() where id = p_id;
    perform notify_user(s.profile_id, 'gorev', 'Programın onaylandı ✅',
      'Koçun kendi yaptığın programı onayladı; artık programın bu.', '/ogrenci/haftalik-takip', 0);
  else
    update student_programs set status = 'reddedildi', decided_at = now() where id = p_id;
    perform notify_user(s.profile_id, 'gorev', 'Programın onaylanmadı',
      'Koçun hazırladığı program geçerli olmaya devam ediyor.', '/ogrenci/haftalik-takip', 0);
  end if;
end $$;
revoke all on function decide_student_program(uuid, boolean) from public, anon;
grant execute on function decide_student_program(uuid, boolean) to authenticated;

-- Koçu olmayan (sadece platform) öğrenci alanını kendisi seçer
create or replace function set_my_track(p_track text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if p_track not in ('YKS_SAY', 'YKS_SOZ', 'YKS_EA', 'YKS_DIL', 'LGS', 'DIGER') then raise exception 'Geçersiz alan'; end if;
  update students set track = p_track::exam_track where profile_id = auth.uid() and coalesce(platform_only, false);
end $$;
revoke all on function set_my_track(text) from public, anon;
grant execute on function set_my_track(text) to authenticated;

notify pgrst, 'reload schema';
