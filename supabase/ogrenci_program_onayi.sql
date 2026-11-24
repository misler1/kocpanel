-- ============================================================
-- Öğrencinin kendi programı her zaman koçun onayına gider
-- ============================================================
-- Önceden: öğrencinin o tarihlerde koçun hazırladığı programı YOKSA öğrencinin yaptığı program hemen geçerli
-- oluyordu, koça yalnızca bilgi gidiyordu. Artık koçu olan öğrencinin programı her durumda koçun onayına gider
-- (student_programs.status = 'bekliyor'):
--   * Onay (ya da düzenleyerek onay): program geçerli olur; o tarihlerde koçun programı varsa onun yerine geçer.
--   * Ret: hiçbir şey değişmez; öğrenciye bildirim gider.
-- Sadece platform öğrencisinin (koçu olmayan) programı eskisi gibi hemen geçerli olur.
-- staff_programs.sql ve program_duzenleyerek_onay.sql'den SONRA çalıştırın.
-- Supabase SQL Editor'da BİR KEZ çalıştırın; tekrar çalıştırmak zararsızdır. Veri silmez.

create or replace function submit_student_program(p_start date, p_tasks jsonb, p_note text default null)
returns text language plpgsql security definer set search_path = public as $$
declare
  s record;
  v_end date := p_start + 6;
  v_conflict boolean;
  v_coach uuid;
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

  v_coach := case when s.platform_only then null else coalesce(s.responsible_coach_id, s.coach_id) end;

  -- Aynı tarihler için bekleyen eski gönderim varsa yenisi onun yerini alır
  update student_programs set status = 'geri_cekildi', decided_at = now()
   where student_id = s.id and status = 'bekliyor' and prepared_by is null and week_start <= v_end and week_end >= p_start;

  -- Koçu olmayan (sadece platform) öğrenci: program hemen geçerli
  if v_coach is null then
    insert into student_programs (student_id, coach_id, week_start, week_end, tasks, note, status)
    values (s.id, null, p_start, v_end, p_tasks, nullif(left(trim(coalesce(p_note, '')), 500), ''), 'aktif');
    perform _apply_student_program(s.id, s.coach_id, p_start, v_end, p_tasks);
    return 'aktif';
  end if;

  -- Bu tarihlerde koçun (öğrencinin kendi yapmadığı) programı var mı? (yalnızca bildirim metni için)
  v_conflict := exists (
    select 1 from question_logs q
     where q.student_id = s.id and q.appointment_id is null and not q.student_plan and not coalesce(q.student_added, false)
       and q.week_start <= v_end and coalesce(q.week_end, q.week_start + 6) >= p_start);

  insert into student_programs (student_id, coach_id, week_start, week_end, tasks, note, status)
  values (s.id, v_coach, p_start, v_end, p_tasks, nullif(left(trim(coalesce(p_note, '')), 500), ''), 'bekliyor');

  perform notify_user(v_coach, 'plan_talebi', 'Öğrencin kendine program yaptı 📝',
    s.full_name || ' ' || to_char(p_start, 'DD.MM') || ' – ' || to_char(v_end, 'DD.MM') || ' için kendi programını yaptı'
      || case when v_conflict then '; senin programının yerine geçmesi için onayını bekliyor.' else ' ve onayını bekliyor.' end,
    '/haftalik-takip', 0);
  return 'bekliyor';
end $$;
revoke all on function submit_student_program(date, jsonb, text) from public, anon;
grant execute on function submit_student_program(date, jsonb, text) to authenticated;

-- Koç kararı (staff_programs.sql'deki ile aynı; yalnızca öğrencinin programı reddedilince giden bildirim,
-- o tarihlerde koçun programı yoksa ona göre yazılır)
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
    if exists (select 1 from question_logs q
                where q.student_id = s.id and q.appointment_id is null and not q.student_plan and not coalesce(q.student_added, false)
                  and q.week_start <= sp.week_end and coalesce(q.week_end, q.week_start + 6) >= sp.week_start) then
      perform notify_user(s.profile_id, 'gorev', 'Programın onaylanmadı',
        'Koçun hazırladığı program geçerli olmaya devam ediyor.', '/ogrenci/haftalik-takip', 0);
    else
      perform notify_user(s.profile_id, 'gorev', 'Programın onaylanmadı',
        'Koçunla konuşup programını yeniden düzenleyebilir ya da koçundan program isteyebilirsin.', '/ogrenci/haftalik-takip', 0);
    end if;
  end if;
end $$;
revoke all on function decide_student_program(uuid, boolean) from public, anon;
grant execute on function decide_student_program(uuid, boolean) to authenticated;


notify pgrst, 'reload schema';
