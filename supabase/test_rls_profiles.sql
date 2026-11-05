-- RLS DENEMESİ (2) — HİÇBİR ŞEYİ KALICI DEĞİŞTİRMEZ.
-- security_rls_fix.sql'deki değişikliklerin aynısını yalnızca bu blok içinde uygular, üç kullanıcıyı (yönetici, yönetici olmayan
-- koç, öğrenci) taklit eder, uygulamanın yaptığı sorguları çalıştırır ve sonucu en sonda HATA MESAJI olarak yazar.
-- Hata, bloktaki her şeyi (fonksiyon, politika, RLS açma, deneme güncellemesi) geri alır.
-- Beklenen çıktı "TEST SONUCU (hiçbir şey kaydedilmedi): ..." ile başlayan kırmızı bir hata mesajıdır.

do $$
declare
  v_out text := '';
  v_user record;
  v_self int;
  v_all int;
  v_staff int;
  v_conv int;
  v_msg int;
  v_upd int;
  v_total_msg int;
  v_other_koc uuid;
begin
  select count(*) into v_total_msg from public.messages;
  select id into v_other_koc from public.profiles
    where role = 'koc' and is_approved and not coalesce(is_admin, false) order by created_at desc limit 1;

  -- ===== security_rls_fix.sql ile aynı değişiklikler =====
  create or replace function public.auth_is_staff() returns boolean
    language sql stable security definer set search_path = public as
    $f$ select exists (select 1 from profiles where id = auth.uid() and role in ('koc', 'ogretmen') and coalesce(is_approved, false)) $f$;
  revoke all on function public.auth_is_staff() from public, anon;
  grant execute on function public.auth_is_staff() to authenticated;
  grant execute on function public.is_admin_user() to authenticated;
  grant execute on function public.is_conversation_member(uuid) to authenticated;

  drop policy if exists profiles_staff_read_staff on public.profiles;
  create policy profiles_staff_read_staff on public.profiles for select to authenticated
    using (role in ('koc', 'ogretmen') and public.auth_is_staff());
  drop policy if exists profiles_admin_read_all on public.profiles;
  create policy profiles_admin_read_all on public.profiles for select to authenticated
    using (public.is_admin_user());
  drop policy if exists profiles_admin_update_all on public.profiles;
  create policy profiles_admin_update_all on public.profiles for update to authenticated
    using (public.is_admin_user()) with check (public.is_admin_user());

  alter table public.profiles enable row level security;
  alter table public.conversations enable row level security;
  alter table public.conversation_participants enable row level security;
  alter table public.messages enable row level security;
  -- =======================================================

  for v_user in
    (select 'yonetici' as etiket, p.id from public.profiles p join auth.users u on u.id = p.id
       where u.email = 'islermusa@hotmail.com')
    union all
    (select 'koc', p.id from public.profiles p
       where p.role = 'koc' and p.is_approved and not coalesce(p.is_admin, false) order by p.created_at limit 1)
    union all
    (select 'ogrenci', p.id from public.profiles p
       where p.role = 'ogrenci' and p.is_approved order by p.created_at limit 1)
  loop
    perform set_config('request.jwt.claims',
      json_build_object('sub', v_user.id, 'role', 'authenticated')::text, true);
    execute 'set local role authenticated';
    begin
      select count(*) into v_self from public.profiles where id = auth.uid();       -- middleware'in sorgusu
      select count(*) into v_all from public.profiles;
      select count(*) into v_staff from public.profiles where role in ('koc', 'ogretmen');
      select count(*) into v_conv from public.conversations;
      select count(*) into v_msg from public.messages;
      -- Başka bir koçun profilini "değiştirmeden" güncellemeyi dene (yalnızca yönetici başarmalı)
      update public.profiles set student_selectable = student_selectable where id = v_other_koc and id <> auth.uid();
      get diagnostics v_upd = row_count;
      v_out := v_out || format(
        ' | %s: kendi_profili=%s, gordugu_profil=%s, gordugu_koc_ogretmen=%s, gordugu_sohbet=%s, gordugu_mesaj=%s/%s, baska_koc_guncelleme=%s',
        v_user.etiket, v_self, v_all, v_staff, v_conv, v_msg, v_total_msg, v_upd);
    exception when others then
      v_out := v_out || format(' | %s: HATA=%s', v_user.etiket, sqlerrm);
    end;
    execute 'reset role';
  end loop;

  raise exception 'TEST SONUCU (hiçbir şey kaydedilmedi)%', v_out;
end $$;
