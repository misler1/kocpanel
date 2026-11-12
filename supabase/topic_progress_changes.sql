-- ============================================================
-- Konu ilerleyişi: değişikliği kimin yaptığı + öğrenci/belletmen işaretleyince koça bildirim
-- ============================================================
-- • Konu adımları (konu, 1./2./3. kaynak, yanlışlar) değişince satıra son değiştirenin adı ve rolü yazılır
--   (koc / ogrenci / personel). Koçun Konu İlerleyişi sayfasında konunun yanında görünür.
-- • Öğrenci ya da belletmen işaretleyince koça bildirim gider; okunmamış bildirim varsa 12 saat içindeki
--   değişiklikler aynı bildirimde toplanır (bildirim yağmuru olmaz). Sadece platform öğrencilerinde bildirim gitmez.
-- Supabase SQL Editor'da BİR KEZ çalıştırın; tekrar çalıştırmak zararsızdır. Veri silmez.

alter table topic_progress add column if not exists updated_by uuid references profiles(id) on delete set null;
alter table topic_progress add column if not exists updated_by_name text;
alter table topic_progress add column if not exists updated_by_role text;
alter table topic_progress add column if not exists steps_updated_at timestamptz;

create or replace function topic_progress_track_change()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  s record;
  v_me uuid := auth.uid();
begin
  if v_me is null then return new; end if;
  if (new.konu_tamamlandi, new.kaynak1_sorular, new.kaynak2_sorular, new.kaynak3_sorular, new.yanlislar_kontrol)
     is not distinct from (old.konu_tamamlandi, old.kaynak1_sorular, old.kaynak2_sorular, old.kaynak3_sorular, old.yanlislar_kontrol) then
    return new;
  end if;
  select profile_id, coach_id, responsible_coach_id into s from students where id = new.student_id;
  new.updated_by := v_me;
  new.updated_by_name := (select full_name from profiles where id = v_me);
  new.updated_by_role := case
    when s.profile_id = v_me then 'ogrenci'
    when s.coach_id = v_me or s.responsible_coach_id = v_me
      or exists (select 1 from profiles where id = v_me and is_admin) then 'koc'
    else 'personel' end;
  new.steps_updated_at := now();
  return new;
end $$;

drop trigger if exists trg_topic_progress_track_change on topic_progress;
create trigger trg_topic_progress_track_change
  before update on topic_progress
  for each row execute function topic_progress_track_change();

create or replace function topic_progress_notify_coach()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  s record;
  v_body text;
begin
  if new.updated_by_role not in ('ogrenci', 'personel') or new.steps_updated_at is not distinct from old.steps_updated_at then
    return null;
  end if;
  select id, full_name, coach_id, responsible_coach_id, coalesce(platform_only, false) as platform_only
    into s from students where id = new.student_id;
  if s.id is null or s.platform_only then return null; end if;
  v_body := case when new.updated_by_role = 'ogrenci'
    then s.full_name || ' konu ilerleyişini güncelledi (son: ' || new.subject || ' · ' || left(new.topic, 60) || ').'
    else coalesce(new.updated_by_name, 'Personel') || ', ' || s.full_name || ' için konu ilerleyişini güncelledi (son: '
         || new.subject || ' · ' || left(new.topic, 60) || ').' end;
  perform notify_user(coalesce(s.responsible_coach_id, s.coach_id), 'konu', 'Konu ilerleyişi güncellendi 📚',
    v_body, '/konu-ilerleyisi?ogrenci=' || s.id, 720);
  return null;
end $$;

drop trigger if exists trg_topic_progress_notify_coach on topic_progress;
create trigger trg_topic_progress_notify_coach
  after update on topic_progress
  for each row execute function topic_progress_notify_coach();

notify pgrst, 'reload schema';
