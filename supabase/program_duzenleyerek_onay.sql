-- ============================================================
-- Onay bekleyen programı düzenleyerek onaylama
-- ============================================================
-- Öğrencinin kendi yaptığı ya da belletmenin hazırladığı program koçun onayına geldiğinde koç, görevleri
-- düzenleyip (ekle / sil / ders, konu, soru sayısı, saat değiştir) "Değişikliklerle onayla" diyebilir.
-- Program görevleri değiştirilir, ardından normal onay (decide_student_program) yapılır; öğrenciye
-- "düzenlenerek onaylandı" bildirimi gider.
-- staff_programs.sql'den SONRA çalıştırın. Supabase SQL Editor'da BİR KEZ çalıştırın; tekrar çalıştırmak zararsızdır.

create or replace function decide_student_program_edited(p_id uuid, p_tasks jsonb)
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
  if jsonb_typeof(p_tasks) <> 'array' or jsonb_array_length(p_tasks) = 0 then raise exception 'Programda en az bir görev olmalı'; end if;
  if jsonb_array_length(p_tasks) > 150 then raise exception 'Programda en fazla 150 görev olabilir'; end if;
  if exists (select 1 from jsonb_array_elements(p_tasks) t where coalesce(trim(t->>'subject'), '') = '') then
    raise exception 'Her görevin dersi yazılmalı';
  end if;

  update student_programs set tasks = p_tasks where id = p_id;
  perform decide_student_program(p_id, true);

  -- Onay bildirimi "düzenlenerek onaylandı" olarak güncellenir (aynı bildirim, yenisi açılmaz)
  if s.profile_id is not null then
    perform notify_user(s.profile_id, 'gorev', 'Programın düzenlenerek onaylandı ✅',
      'Koçun programında bazı değişiklikler yaparak onayladı; güncel programına göz at.', '/ogrenci/haftalik-takip', 5);
  end if;
end $$;
revoke all on function decide_student_program_edited(uuid, jsonb) from public, anon;
grant execute on function decide_student_program_edited(uuid, jsonb) to authenticated;

notify pgrst, 'reload schema';
