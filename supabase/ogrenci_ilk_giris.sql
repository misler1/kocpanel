-- ============================================================
-- Öğrenci ilk kez giriş yaptı → koça bildirim
-- ============================================================
-- Koçun açtığı öğrenci hesabıyla sisteme ilk giriş yapıldığında koçuna (ve varsa ayrı sorumlu koçuna)
-- "Öğrencin sisteme ilk kez giriş yaptı 🎉" bildirimi gider (panelde 🔔, telefon bildirimi açıksa telefona da).
-- Giriş anı Supabase'in oturum kaydından (auth.users.last_sign_in_at boştan doluya geçince) yakalanır.
-- Yalnızca platform öğrencileri için bildirim yok. Önce notifications.sql çalıştırılmış olmalı.
-- Supabase SQL Editor'da BİR KEZ çalıştırın; tekrar çalıştırmak zararsızdır.

create or replace function public._notify_student_first_login()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  s record;
begin
  if old.last_sign_in_at is not null or new.last_sign_in_at is null then return null; end if;
  for s in
    select id, full_name, coach_id, responsible_coach_id
    from students
    where profile_id = new.id and not coalesce(platform_only, false)
  loop
    perform notify_user(s.coach_id, 'hesap', 'Öğrencin sisteme ilk kez giriş yaptı 🎉',
      s.full_name || ' hesabıyla ilk girişini yaptı.', '/ogrenciler/' || s.id, 0);
    if s.responsible_coach_id is not null and s.responsible_coach_id is distinct from s.coach_id then
      perform notify_user(s.responsible_coach_id, 'hesap', 'Öğrencin sisteme ilk kez giriş yaptı 🎉',
        s.full_name || ' hesabıyla ilk girişini yaptı.', '/ogrenciler/' || s.id, 0);
    end if;
  end loop;
  return null;
exception when others then
  return null; -- bildirim hatası girişi asla engellemesin
end $$;
revoke all on function public._notify_student_first_login() from public, anon, authenticated;

drop trigger if exists trg_notify_student_first_login on auth.users;
create trigger trg_notify_student_first_login
  after update of last_sign_in_at on auth.users
  for each row execute function public._notify_student_first_login();

-- Şu ana kadar hesabı açılıp hiç giriş yapmamış öğrenciler (bilgi için; ad listesi döner)
select s.full_name, s.phone, u.created_at as hesap_acilis
from students s join auth.users u on u.id = s.profile_id
where u.last_sign_in_at is null and not coalesce(s.platform_only, false)
order by u.created_at desc;
