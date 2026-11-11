-- "Sadece platformu kullanacağım" öğrencileri + "Koç öğretmen iletişime geçsin" başvuruları.
-- Supabase SQL Editor'da BİR KEZ çalıştırın. Veri silmez; yalnızca sütun ekler ve fonksiyonları günceller.

-- Görünmez sistem hesabı işareti (koçsuz öğrenciler bu hesaba bağlanır; hiçbir listede görünmez)
alter table profiles add column if not exists is_system boolean not null default false;

-- Koçu olmadan, platformu kendi başına kullanan öğrenci
alter table students add column if not exists platform_only boolean not null default false;

-- Kayıtta seçilen tercih: true = koç öğretmen iletişime geçsin, false = sadece platform
alter table student_registrations add column if not exists wants_coach boolean;

-- Sistem hesabı personel sayılmaz: mesaj alamaz, öğrencinin kişilerinde görünmez
create or replace function _is_staff(p uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from profiles where id = p and role in ('koc', 'ogretmen')
                 and coalesce(is_approved, false) and not coalesce(is_system, false));
$$;

-- Başvuru bildirimleri: koç isteyen öğrenci telefonuyla birlikte yöneticiye bildirilir
create or replace function trg_notify_student_registration()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if TG_OP = 'INSERT' then
    if new.wants_coach = false then
      perform notify_admins('basvuru', 'Yeni platform öğrencisi',
        new.full_name || ' koçsuz, sadece platformu kullanmak üzere kaydoldu.', '/ayarlar');
    elsif new.wants_coach = true then
      perform notify_admins('basvuru', 'Koç öğretmen istiyor 📞',
        new.full_name || ' koç öğretmenin kendisiyle iletişime geçmesini istiyor. Telefon: ' || new.phone, '/ayarlar');
    else
      perform notify_admins('basvuru', 'Yeni öğrenci başvurusu', new.full_name || ' kayıt oldu, onayınızı bekliyor.', '/ayarlar');
    end if;
  elsif new.status is distinct from old.status then
    if new.status = 'koc_bekliyor' then
      perform notify_user(new.assigned_coach_id, 'basvuru', 'Öğrenci başvurusu onayınızda',
        new.full_name || ' size atandı. Başvuruyu inceleyin.', '/ogrenciler', 0);
    elsif new.status = 'onaylandi' then
      perform notify_user(new.profile_id, 'basvuru', 'Kaydın onaylandı 🎉',
        'Hoş geldin! Artık panelini kullanabilirsin.', '/ogrenci', 0);
    end if;
  end if;
  return new;
end $$;

notify pgrst, 'reload schema';
