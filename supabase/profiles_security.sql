-- GÜVENLİK DÜZELTMESİ — Supabase Dashboard > SQL Editor'da BİR KEZ çalıştırın.
-- Amaç: kullanıcı kendi profilinde yetki alanlarını (role, is_admin, is_approved) kendisi belirleyemesin.
-- Veri silmez/değiştirmez. Mevcut kayıt, giriş, admin onayı ve koç akışları aynen çalışır.
-- Sunucu tarafı (service_role) işlemleri ve yöneticiler (is_admin = true) bu kuralların dışındadır.

-- 1) GÜNCELLEME koruması: yönetici olmayan biri role / is_admin / is_approved değiştiremez
create or replace function protect_profile_privileged_columns()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null or auth.role() = 'service_role' then
    return new;
  end if;
  if (new.role is distinct from old.role
      or new.is_admin is distinct from old.is_admin
      or new.is_approved is distinct from old.is_approved)
     and not exists (select 1 from profiles p where p.id = auth.uid() and p.is_admin = true) then
    raise exception 'Bu alanları değiştirme yetkiniz yok';
  end if;
  return new;
end $$;

drop trigger if exists trg_protect_profile_privileged_columns on profiles;
create trigger trg_protect_profile_privileged_columns
  before update on profiles
  for each row execute function protect_profile_privileged_columns();

-- 2) EKLEME koruması: kayıt sırasında kendini yönetici/onaylı yapamaz (her zaman onaysız ve yönetici değil başlar)
create or replace function protect_profile_insert()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null or auth.role() = 'service_role' then
    return new;
  end if;
  new.is_admin := false;
  new.is_approved := false;
  return new;
end $$;

drop trigger if exists trg_protect_profile_insert on profiles;
create trigger trg_protect_profile_insert
  before insert on profiles
  for each row execute function protect_profile_insert();

-- 3) KONTROL: hangi hesaplar yönetici / onaylı? Beklemediğiniz bir kişi varsa hemen inceleyin.
select id, full_name, email, role, is_admin, is_approved, created_at
from profiles
where is_admin = true
order by created_at;
