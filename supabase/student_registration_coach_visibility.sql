-- Öğrenci kayıt formunda hangi koçların görüneceğini YÖNETİCİ belirler. Supabase SQL Editor'da BİR KEZ çalıştırın.
-- Varsayılan: hiçbir koç görünmez; Ayarlar > Öğretmen Yönetimi'nden "Kayıtta görünsün" ile açılır.

alter table profiles add column if not exists student_selectable boolean not null default false;

-- Koçlar bu alanı kendileri değiştiremesin (yalnızca yönetici). Mevcut korumaya student_selectable eklenir.
create or replace function protect_profile_privileged_columns()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null or auth.role() = 'service_role' then
    return new;
  end if;
  if (new.role is distinct from old.role
      or new.is_admin is distinct from old.is_admin
      or new.is_approved is distinct from old.is_approved
      or new.student_selectable is distinct from old.student_selectable)
     and not exists (select 1 from profiles p where p.id = auth.uid() and p.is_admin = true) then
    raise exception 'Bu alanları değiştirme yetkiniz yok';
  end if;
  return new;
end $$;

notify pgrst, 'reload schema';
