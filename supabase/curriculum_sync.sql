-- ============================================================
-- Kazanım Havuzu → öğrenci konu ilerleyişi senkronu ve konu birleştirme
-- ============================================================
-- 1) Yöneticinin "Eksik konuları öğrencilere ata" düğmesi, yöneticinin koçu olmadığı öğrencilerde
--    veritabanı izni olmadığı için sessizce başarısız oluyordu. Yöneticiye topic_progress'e EKLEME izni verilir
--    (yalnızca ekleme; mevcut kayıtları değiştirme/silme izni verilmez).
-- 2) Havuzda bir konunun adı/kodu düzenlenince, öğrencilerdeki karşılığı (topic_id ile bağlı satırlar) da güncellenir.
-- 3) Birleştirme: aynı dersteki birden fazla konu/kazanım tek başlıkta toplanır.
--    • Yeni başlık havuza eklenir; eskiler pasife alınır (havuzda "birleştirildi" olarak görünür).
--    • Her öğrenci için eski satırlar tek satıra iner. Bir adım (konu tamamlandı, kaynak soruları, yanlış kontrolü)
--      yalnızca TÜM alt başlıklarda işaretliyse birleşik başlıkta işaretli olur.
--    • Eski satırlar silinmeden önce arşive kopyalanır; "Geri al" ile birebir geri gelir.
-- Supabase SQL Editor'da BİR KEZ çalıştırın. Tekrar çalıştırmak zararsızdır.
--
-- Geri alma (özelliği kaldırır, birleştirme arşivi de silinir):
--   drop function if exists merge_curriculum_topics(uuid[], text), unmerge_curriculum_topics(uuid);
--   drop trigger if exists trg_curriculum_topic_rename on curriculum_topics;
--   drop table if exists topic_progress_archive, curriculum_merges;
--   drop policy if exists topic_progress_admin_insert on topic_progress;

-- 1) Yönetici ekleyebilir
drop policy if exists topic_progress_admin_insert on topic_progress;
create policy topic_progress_admin_insert on topic_progress for insert to authenticated
  with check (public.is_admin_user());

-- 2) Ad/kod değişikliği öğrencilere yansır (koçun öğrenciye özel elle değiştirdiği satırlar da havuz adını alır)
create or replace function trg_curriculum_topic_rename() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.name is distinct from old.name or new.code is distinct from old.code then
    update topic_progress
       set topic = case when new.code is not null and new.code <> '' then new.code || ' · ' || new.name else new.name end,
           updated_at = now()
     where topic_id = new.id;
  end if;
  return new;
end $$;
drop trigger if exists trg_curriculum_topic_rename on curriculum_topics;
create trigger trg_curriculum_topic_rename after update of name, code on curriculum_topics
  for each row execute function trg_curriculum_topic_rename();

-- 3) Birleştirme kayıtları ve arşiv
create table if not exists curriculum_merges (
  id uuid primary key default gen_random_uuid(),
  subject_id uuid not null references curriculum_subjects(id) on delete cascade,
  new_topic_id uuid references curriculum_topics(id) on delete set null,
  old_topic_ids uuid[] not null,
  created_by uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  undone_at timestamptz
);
create table if not exists topic_progress_archive (
  merge_id uuid not null references curriculum_merges(id) on delete cascade,
  row_data jsonb not null
);
create index if not exists idx_topic_progress_archive_merge on topic_progress_archive(merge_id);

alter table curriculum_merges enable row level security;
alter table topic_progress_archive enable row level security;
drop policy if exists curriculum_merges_admin_read on curriculum_merges;
create policy curriculum_merges_admin_read on curriculum_merges for select to authenticated using (public.is_admin_user());
revoke all on curriculum_merges, topic_progress_archive from public, anon, authenticated;
grant select on curriculum_merges to authenticated;
grant all on curriculum_merges, topic_progress_archive to service_role;

create or replace function merge_curriculum_topics(p_ids uuid[], p_name text)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_ids uuid[];
  v_subject uuid;
  v_unit text;
  v_sort int;
  v_name text := nullif(trim(coalesce(p_name, '')), '');
  v_new uuid;
  v_merge uuid;
begin
  if not public.is_admin_user() then raise exception 'Yalnızca yönetici birleştirebilir'; end if;
  select array_agg(distinct x) into v_ids from unnest(p_ids) x;
  if coalesce(array_length(v_ids, 1), 0) < 2 then raise exception 'Birleştirmek için en az iki başlık seçin'; end if;
  if v_name is null then raise exception 'Birleşik başlığın adını yazın'; end if;
  if length(v_name) > 300 then raise exception 'Başlık en fazla 300 karakter olabilir'; end if;
  if (select count(*) from curriculum_topics where id = any(v_ids)) <> array_length(v_ids, 1) then
    raise exception 'Seçilen başlıklardan biri bulunamadı';
  end if;
  if (select count(distinct subject_id) from curriculum_topics where id = any(v_ids)) <> 1 then
    raise exception 'Yalnızca aynı dersteki başlıklar birleştirilebilir';
  end if;

  select subject_id, min(sort_order), case when count(distinct coalesce(unit, '')) = 1 then max(unit) end
    into v_subject, v_sort, v_unit
    from curriculum_topics where id = any(v_ids) group by subject_id;

  insert into curriculum_topics (subject_id, kind, code, name, unit, sort_order, is_active)
    values (v_subject, 'konu', null, v_name, v_unit, v_sort, true) returning id into v_new;
  insert into curriculum_merges (subject_id, new_topic_id, old_topic_ids, created_by)
    values (v_subject, v_new, v_ids, auth.uid()) returning id into v_merge;

  -- Eski satırları arşivle
  insert into topic_progress_archive (merge_id, row_data)
    select v_merge, to_jsonb(tp) from topic_progress tp where tp.topic_id = any(v_ids);

  -- Her öğrenci için tek satır: bir adım ancak tüm alt başlıklarda işaretliyse işaretli
  insert into topic_progress (student_id, subject, topic, topic_id, status, konu_tamamlandi,
                              kaynak1_sorular, kaynak2_sorular, kaynak3_sorular, yanlislar_kontrol, updated_at)
    select tp.student_id, min(tp.subject), v_name, v_new,
           case when count(distinct tp.status) = 1 then min(tp.status) else 'baslanmadi' end,
           bool_and(coalesce(tp.konu_tamamlandi, false)),
           bool_and(coalesce(tp.kaynak1_sorular, false)),
           bool_and(coalesce(tp.kaynak2_sorular, false)),
           bool_and(coalesce(tp.kaynak3_sorular, false)),
           bool_and(coalesce(tp.yanlislar_kontrol, false)),
           now()
      from topic_progress tp where tp.topic_id = any(v_ids)
     group by tp.student_id;

  delete from topic_progress where topic_id = any(v_ids);
  update curriculum_topics set is_active = false where id = any(v_ids);
  return v_merge;
end $$;

-- Geri al: birleşik başlık ve onun satırları silinir, eski satırlar ve başlıklar birebir geri gelir.
-- (Birleştirmeden sonra birleşik başlıkta yapılan işaretlemeler kaybolur.)
create or replace function unmerge_curriculum_topics(p_merge uuid)
returns void language plpgsql security definer set search_path = public as $$
declare m curriculum_merges%rowtype;
begin
  if not public.is_admin_user() then raise exception 'Yalnızca yönetici geri alabilir'; end if;
  select * into m from curriculum_merges where id = p_merge and undone_at is null;
  if m.id is null then raise exception 'Birleştirme bulunamadı ya da zaten geri alındı'; end if;

  if m.new_topic_id is not null then
    delete from topic_progress where topic_id = m.new_topic_id;
    delete from curriculum_topics where id = m.new_topic_id;
  end if;
  update curriculum_topics set is_active = true where id = any(m.old_topic_ids);
  -- Öğrenci silindiyse onun arşiv satırı atlanır; havuzdan silinmiş başlığın bağlantısı boşaltılır
  insert into topic_progress
    select r.* from topic_progress_archive a
      cross join lateral jsonb_populate_record(null::topic_progress,
        case when exists (select 1 from curriculum_topics ct where ct.id::text = a.row_data->>'topic_id') then a.row_data
             else a.row_data || '{"topic_id": null}'::jsonb end) r
     where a.merge_id = m.id and exists (select 1 from students s where s.id = r.student_id)
    on conflict (id) do nothing;
  update curriculum_merges set undone_at = now() where id = m.id;
  delete from topic_progress_archive where merge_id = m.id;
end $$;

do $$
declare f text;
begin
  foreach f in array array['merge_curriculum_topics(uuid[], text)', 'unmerge_curriculum_topics(uuid)'] loop
    execute format('revoke all on function %s from public, anon', f);
    execute format('grant execute on function %s to authenticated', f);
  end loop;
end $$;

notify pgrst, 'reload schema';
