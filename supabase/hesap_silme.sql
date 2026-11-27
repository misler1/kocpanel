-- ============================================================
-- Hesabımı sil: silmeyi engelleyen bağlantıların düzeltilmesi
-- ============================================================
-- Hesap silme (Hesabım > Hesabımı sil) giriş hesabını siler; profil ve koçun öğrencileri bağlı
-- kayıtlarıyla birlikte veritabanının kendi kurallarıyla (on delete cascade) silinir.
-- Bazı tablolar profillere / öğrencilere silme kuralı olmadan bağlı (ör. meetings.created_by,
-- survey_responses.student_id). Bu bağlantılar silmeyi tümden engeller.
-- Bu dosya, profillere, öğrencilere ya da giriş hesaplarına kuralsız bağlanan her yabancı anahtarı şöyle düzenler:
--   * sütun boş bırakılabiliyorsa: on delete set null (ör. "oluşturan" bilgisi boşalır, kayıt kalır)
--   * boş bırakılamıyorsa: on delete cascade (silinen kişiye/öğrenciye ait kayıt da silinir)
-- Supabase SQL Editor'da çalıştırın. Mevcut veriyi değiştirmez; tekrar çalıştırmak zararsızdır.

do $$
declare
  r record;
  v_col text;
  v_nullable boolean;
begin
  for r in
    select c.conname, c.conrelid::regclass as tbl, c.confrelid::regclass as ref, c.conkey
      from pg_constraint c
     where c.contype = 'f'
       and c.confdeltype in ('a', 'r') -- no action / restrict
       and c.confrelid in ('public.profiles'::regclass, 'public.students'::regclass, 'auth.users'::regclass)
       and array_length(c.conkey, 1) = 1
       and c.connamespace = 'public'::regnamespace
  loop
    select a.attname, not a.attnotnull into v_col, v_nullable
      from pg_attribute a where a.attrelid = r.tbl and a.attnum = r.conkey[1];
    execute format('alter table %s drop constraint %I', r.tbl, r.conname);
    execute format('alter table %s add constraint %I foreign key (%I) references %s(id) on delete %s',
      r.tbl, r.conname, v_col, r.ref, case when v_nullable then 'set null' else 'cascade' end);
    raise notice '% . % → on delete %', r.tbl, v_col, case when v_nullable then 'set null' else 'cascade' end;
  end loop;
end $$;

notify pgrst, 'reload schema';
