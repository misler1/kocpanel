-- ============================================================
-- Belletmen / yurt personeli: öğrenciye program hazırlama (koç onayıyla) ve "yapmadı" işaretleme
-- ============================================================
-- • Belletmen öğrenci için 7 günlük program hazırlar → koçun onayına gider (student_programs, prepared_by dolu).
--   Koç onaylarsa: koçun o tarihlerdeki programı silinir, belletmenin programı koçun programı gibi geçerli olur.
--   Reddederse: hiçbir şey değişmez. Karar belletmene bildirilir.
--   Koçun kendisi (ya da yönetici) bu ekrandan program hazırlarsa onay beklemeden geçerli olur.
-- • Belletmen, telefonu olmayan öğrenci adına görevi "yapmadı" olarak işaretleyebilir (isteğe bağlı neden ile).
-- Yetki: belletmen_gunluk.sql'deki _staff_can_log (koç, yönetici ya da öğrencide "haftalık takip" izni olan personel).
-- student_programs.sql, student_task_missed.sql ve belletmen_gunluk.sql'den SONRA çalıştırın.
-- Supabase SQL Editor'da BİR KEZ çalıştırın; tekrar çalıştırmak zararsızdır. Veri silmez.

alter table student_programs add column if not exists prepared_by uuid references profiles(id) on delete set null;
alter table student_programs add column if not exists prepared_by_name text;
alter table question_logs add column if not exists student_missed_by text;

-- Belletmen hazırladığı programları görebilir
drop policy if exists "student_programs_preparer_select" on student_programs;
create policy "student_programs_preparer_select" on student_programs for select
  using (prepared_by = auth.uid());

-- Personelin hazırladığı programı koçun programı olarak yazar (o tarihlerdeki koç programının yerine geçer)
create or replace function _apply_staff_program(p_student uuid, p_coach uuid, p_start date, p_end date, p_tasks jsonb)
returns void language plpgsql security definer set search_path = public as $$
declare t jsonb;
begin
  delete from question_logs q
   where q.student_id = p_student and q.appointment_id is null and not q.student_plan and not coalesce(q.student_added, false)
     and q.week_start <= p_end and coalesce(q.week_end, q.week_start + 6) >= p_start;
  for t in select * from jsonb_array_elements(p_tasks) loop
    insert into question_logs (student_id, coach_id, subject, topic, resource_name, week_start, week_end, plan_day,
                               target_count, start_time, end_time, student_added, student_plan)
    values (p_student, p_coach, left(trim(t->>'subject'), 120), nullif(left(trim(coalesce(t->>'topic', '')), 200), ''),
            nullif(left(trim(coalesce(t->>'resource_name', '')), 200), ''), p_start, p_end,
            greatest(0, least(6, coalesce((t->>'plan_day')::int, 0))),
            greatest(0, least(2000, coalesce((t->>'target_count')::int, 0))),
            nullif(t->>'start_time', '')::time, nullif(t->>'end_time', '')::time, false, false);
  end loop;
end $$;
revoke all on function _apply_staff_program(uuid, uuid, date, date, jsonb) from public, anon, authenticated;

-- Belletmen programı gönderir. Dönüş: 'bekliyor' (koç onayı bekliyor) ya da 'aktif' (koç/yönetici kendisi hazırladı)
create or replace function staff_submit_program(p_student uuid, p_start date, p_tasks jsonb, p_note text default null)
returns text language plpgsql security definer set search_path = public as $$
declare
  s record;
  v_end date := p_start + 6;
  v_me uuid := auth.uid();
  v_name text;
  v_is_coach boolean;
  v_coach uuid;
begin
  if not _staff_can_log(p_student) then raise exception 'Bu öğrenci için program hazırlama yetkiniz yok'; end if;
  select id, full_name, profile_id, coach_id, responsible_coach_id, coalesce(platform_only, false) as platform_only
    into s from students where id = p_student;
  if s.id is null then raise exception 'Öğrenci bulunamadı'; end if;
  if jsonb_typeof(p_tasks) <> 'array' or jsonb_array_length(p_tasks) = 0 then raise exception 'Programa en az bir görev ekleyin'; end if;
  if jsonb_array_length(p_tasks) > 150 then raise exception 'Programda en fazla 150 görev olabilir'; end if;
  if exists (select 1 from jsonb_array_elements(p_tasks) t where coalesce(trim(t->>'subject'), '') = '') then
    raise exception 'Her görevin dersi yazılmalı';
  end if;
  if p_start < (now() at time zone 'Europe/Istanbul')::date - 7 then raise exception 'Geçmiş bir hafta için program yapılamaz'; end if;

  select full_name into v_name from profiles where id = v_me;
  v_coach := coalesce(s.responsible_coach_id, s.coach_id);
  v_is_coach := s.coach_id = v_me or s.responsible_coach_id = v_me
             or exists (select 1 from profiles where id = v_me and is_admin);

  -- Aynı öğrenci ve tarihler için bu kişinin bekleyen eski gönderimi yenisiyle değişir
  update student_programs set status = 'geri_cekildi', decided_at = now()
   where student_id = s.id and prepared_by = v_me and status = 'bekliyor' and week_start <= v_end and week_end >= p_start;

  insert into student_programs (student_id, coach_id, week_start, week_end, tasks, note, status, prepared_by, prepared_by_name, decided_at)
  values (s.id, v_coach, p_start, v_end, p_tasks, nullif(left(trim(coalesce(p_note, '')), 500), ''),
          case when v_is_coach then 'onaylandi' else 'bekliyor' end, v_me, v_name,
          case when v_is_coach then now() end);

  if v_is_coach then
    perform _apply_staff_program(s.id, s.coach_id, p_start, v_end, p_tasks);
    if s.profile_id is not null then
      perform notify_user(s.profile_id, 'gorev', 'Yeni haftalık programın hazır 🗓️',
        to_char(p_start, 'DD.MM') || ' – ' || to_char(v_end, 'DD.MM') || ' programın hazırlandı.', '/ogrenci/haftalik-takip', 0);
    end if;
    return 'aktif';
  end if;

  perform notify_user(v_coach, 'plan_talebi', 'Program onayınızı bekliyor 📝',
    coalesce(v_name, 'Personel') || ', ' || s.full_name || ' için ' || to_char(p_start, 'DD.MM') || ' – ' || to_char(v_end, 'DD.MM')
      || ' programı hazırladı.', '/haftalik-takip', 0);
  return 'bekliyor';
end $$;
revoke all on function staff_submit_program(uuid, date, jsonb, text) from public, anon;
grant execute on function staff_submit_program(uuid, date, jsonb, text) to authenticated;

-- Belletmen bekleyen programını geri çeker
create or replace function staff_withdraw_program(p_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  update student_programs set status = 'geri_cekildi', decided_at = now()
   where id = p_id and status = 'bekliyor' and prepared_by = auth.uid();
end $$;
revoke all on function staff_withdraw_program(uuid) from public, anon;
grant execute on function staff_withdraw_program(uuid) to authenticated;

-- Koç kararı (student_programs.sql'deki fonksiyonun yerine geçer): personelin hazırladığı program da burada onaylanır
create or replace function decide_student_program(p_id uuid, p_approve boolean)
returns void language plpgsql security definer set search_path = public as $$
declare
  sp record;
  s record;
begin
  select * into sp from student_programs where id = p_id for update;
  if sp.id is null or sp.status <> 'bekliyor' then raise exception 'Bu program artık onay beklemiyor'; end if;
  select id, full_name, profile_id, coach_id, responsible_coach_id into s from students where id = sp.student_id;
  if not (s.coach_id = auth.uid() or s.responsible_coach_id = auth.uid()
          or exists (select 1 from profiles p where p.id = auth.uid() and p.is_admin)) then
    raise exception 'Yetkisiz';
  end if;

  if sp.prepared_by is not null then
    -- Personelin hazırladığı program
    if p_approve then
      perform _apply_staff_program(s.id, s.coach_id, sp.week_start, sp.week_end, sp.tasks);
      update student_programs set status = 'onaylandi', decided_at = now() where id = p_id;
      perform notify_user(sp.prepared_by, 'gorev', 'Hazırladığınız program onaylandı ✅',
        s.full_name || ' için hazırladığınız program geçerli oldu.', '/gunluk-giris?ogrenci=' || s.id, 0);
      if s.profile_id is not null then
        perform notify_user(s.profile_id, 'gorev', 'Yeni haftalık programın hazır 🗓️',
          to_char(sp.week_start, 'DD.MM') || ' – ' || to_char(sp.week_end, 'DD.MM') || ' programın hazırlandı.', '/ogrenci/haftalik-takip', 0);
      end if;
    else
      update student_programs set status = 'reddedildi', decided_at = now() where id = p_id;
      perform notify_user(sp.prepared_by, 'gorev', 'Hazırladığınız program onaylanmadı',
        s.full_name || ' için koçun programı geçerli kalıyor.', '/gunluk-giris?ogrenci=' || s.id, 0);
    end if;
    return;
  end if;

  -- Öğrencinin kendi programı
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

-- Öğrenci adına "yapmadı" işareti (p_missed = false: işareti kaldırır)
create or replace function staff_mark_missed(p_student uuid, p_task_id uuid, p_missed boolean, p_note text default null)
returns void language plpgsql security definer set search_path = public as $$
declare v_name text;
begin
  if not _staff_can_log(p_student) then raise exception 'Bu öğrenci için giriş yetkiniz yok'; end if;
  if not exists (select 1 from question_logs where id = p_task_id and student_id = p_student) then
    raise exception 'Görev bulunamadı';
  end if;
  select full_name into v_name from profiles where id = auth.uid();
  perform set_config('app.student_log_rpc', 'on', true);
  if p_missed then
    -- Yapıldı kaydı varsa önce kaldırılır (ikisi aynı anda olamaz)
    if exists (select 1 from question_logs where id = p_task_id and student_done) then
      perform _remove_task_entries(p_student, p_task_id);
    end if;
    update question_logs set
      student_done = false, student_done_at = null, done_count = 0, topic_done_minutes = 0,
      student_missed = true, student_missed_at = now(),
      student_missed_note = nullif(left(trim(coalesce(p_note, '')), 300), ''),
      student_missed_by = v_name
    where id = p_task_id;
  else
    update question_logs set student_missed = false, student_missed_by = null where id = p_task_id;
  end if;
  perform set_config('app.student_log_rpc', 'off', true);
end $$;
revoke all on function staff_mark_missed(uuid, uuid, boolean, text) from public, anon;
grant execute on function staff_mark_missed(uuid, uuid, boolean, text) to authenticated;

-- "Yaptı" ve "yapmadı" aynı anda olamaz (student_task_missed.sql'deki fonksiyon + işaretleyenin adı da temizlenir)
create or replace function question_logs_done_clears_missed()
returns trigger language plpgsql as $$
begin
  if new.student_done then
    new.student_missed := false;
  end if;
  if new.student_missed is distinct from true then
    new.student_missed_at := null;
    new.student_missed_note := null;
    new.student_missed_by := null;
  end if;
  if length(coalesce(new.student_missed_note, '')) > 300 then
    new.student_missed_note := left(new.student_missed_note, 300);
  end if;
  return new;
end $$;

notify pgrst, 'reload schema';
