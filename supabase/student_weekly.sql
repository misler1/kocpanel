-- Öğrenci paneli Aşama 2: haftalık takip (görev işaretleme + koç onaylı düzenleme/yeni program talebi)
-- Supabase SQL Editor'da BİR KEZ çalıştırın. Mevcut veriyi silmez/değiştirmez.

-- 1) Öğrencinin "yaptım" işareti (koçun hesapladığı done_count'tan ayrıdır, birbirini ezmez)
alter table question_logs add column if not exists student_done boolean not null default false;
alter table question_logs add column if not exists student_done_at timestamptz;

-- 2) Öğrenci kendi görevlerini OKUYABİLSİN ve yalnızca işaret alanlarını GÜNCELLEYEBİLSİN
drop policy if exists "question_logs_student_select" on question_logs;
create policy "question_logs_student_select" on question_logs for select
  using (exists (select 1 from students s where s.id = question_logs.student_id and s.profile_id = auth.uid()));

drop policy if exists "question_logs_student_update" on question_logs;
create policy "question_logs_student_update" on question_logs for update
  using (exists (select 1 from students s where s.id = question_logs.student_id and s.profile_id = auth.uid()))
  with check (exists (select 1 from students s where s.id = question_logs.student_id and s.profile_id = auth.uid()));

-- RLS kolon kısıtlayamadığı için tetikleyici: öğrenci student_done / student_done_at dışında HİÇBİR alanı değiştiremez
create or replace function protect_question_logs_student_update()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is not null and auth.role() <> 'service_role'
     and exists (select 1 from students s where s.id = old.student_id and s.profile_id = auth.uid()) then
    if (to_jsonb(new) - 'student_done' - 'student_done_at')
       is distinct from (to_jsonb(old) - 'student_done' - 'student_done_at') then
      raise exception 'Öğrenci programı doğrudan değiştiremez; koça değişiklik talebi gönderin';
    end if;
  end if;
  return new;
end $$;

drop trigger if exists trg_protect_question_logs_student_update on question_logs;
create trigger trg_protect_question_logs_student_update
  before update on question_logs
  for each row execute function protect_question_logs_student_update();

-- 3) Değişiklik / yeni program talepleri
create table if not exists weekly_plan_requests (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references students(id) on delete cascade,
  coach_id uuid not null references profiles(id) on delete cascade,
  kind text not null check (kind in ('duzenleme', 'yeni_program')),
  week_start date,                       -- 'duzenleme' için hangi hafta
  payload jsonb not null default '{}'::jsonb,  -- { ops: [...], summary: [...] }
  note text,                             -- öğrencinin notu
  status text not null default 'bekliyor' check (status in ('bekliyor', 'onaylandi', 'reddedildi')),
  decided_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_weekly_plan_requests_coach on weekly_plan_requests(coach_id, status);
create index if not exists idx_weekly_plan_requests_student on weekly_plan_requests(student_id);
-- Aynı hafta için tek açık düzenleme talebi, aynı öğrenciden tek açık yeni program talebi
create unique index if not exists uq_wpr_open_edit on weekly_plan_requests(student_id, week_start)
  where status = 'bekliyor' and kind = 'duzenleme';
create unique index if not exists uq_wpr_open_new on weekly_plan_requests(student_id)
  where status = 'bekliyor' and kind = 'yeni_program';

alter table weekly_plan_requests enable row level security;

drop policy if exists "wpr_student_select" on weekly_plan_requests;
create policy "wpr_student_select" on weekly_plan_requests for select
  using (exists (select 1 from students s where s.id = weekly_plan_requests.student_id and s.profile_id = auth.uid()));

drop policy if exists "wpr_student_insert" on weekly_plan_requests;
create policy "wpr_student_insert" on weekly_plan_requests for insert
  with check (
    status = 'bekliyor'
    and exists (select 1 from students s
                where s.id = weekly_plan_requests.student_id
                  and s.profile_id = auth.uid()
                  and s.coach_id = weekly_plan_requests.coach_id)
  );

drop policy if exists "wpr_coach_select" on weekly_plan_requests;
create policy "wpr_coach_select" on weekly_plan_requests for select
  using (coach_id = auth.uid());

-- Koç kararını sunucu API'si verir (RLS'e tabi koç oturumuyla); güncelleme yetkisi yalnızca ilgili koçta
drop policy if exists "wpr_coach_update" on weekly_plan_requests;
create policy "wpr_coach_update" on weekly_plan_requests for update
  using (coach_id = auth.uid()) with check (coach_id = auth.uid());

-- Bu projede yeni tablolara otomatik yetki verilmediği için açıkça veriyoruz
grant select, insert on weekly_plan_requests to authenticated;
grant update on weekly_plan_requests to authenticated;
grant all on weekly_plan_requests to service_role;
grant select, update on question_logs to authenticated;

notify pgrst, 'reload schema';
