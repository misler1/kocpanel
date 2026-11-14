-- Ekip kayıtları: bir koça / yöneticiye bağlı stajyer koç, yurt yöneticisi ya da belletmen (teacher_access_profiles.mentor_id)
-- bir kayıt eklediğinde, değiştirdiğinde ya da sildiğinde burada iz kalır. Bağlı olduğu kişi /ekip-kayitlari sayfasında görür
-- ve bildirim alır (aynı kişiden okunmamış bildirim varsa yenisi açılmaz, mevcut olan güncellenir).
-- Kayıtlar veritabanı tetikleyicisiyle tutulur: ekrandan, RPC'den (ör. staff_log_study) ya da başka yoldan yapılan her yazma yakalanır.
-- Yöneticiler (is_admin) bütün personelin kayıtlarını görebilir.
-- Supabase SQL Editor'da bir kez çalıştırın (tekrar çalıştırmak güvenli).

create table if not exists staff_activity (
  id bigserial primary key,
  actor_id uuid not null references profiles(id) on delete cascade,
  actor_name text,
  actor_status text,
  mentor_id uuid references profiles(id) on delete set null,
  student_id uuid references students(id) on delete set null,
  student_name text,
  area text not null,
  action text not null check (action in ('ekledi', 'güncelledi', 'sildi')),
  summary text not null,
  changes jsonb,
  link text,
  created_at timestamptz not null default now()
);
create index if not exists idx_staff_activity_mentor on staff_activity(mentor_id, created_at desc);
create index if not exists idx_staff_activity_actor on staff_activity(actor_id, created_at desc);
create index if not exists idx_staff_activity_created on staff_activity(created_at desc);

alter table staff_activity enable row level security;
drop policy if exists "staff_activity_select" on staff_activity;
create policy "staff_activity_select" on staff_activity for select using (
  mentor_id = auth.uid()
  or exists (select 1 from profiles p where p.id = auth.uid() and p.is_admin)
);
-- Ekleme yalnızca tetikleyiciden (security definer); doğrudan yazma/silme izni yok.

create or replace function _log_staff_activity() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_status text;
  v_mentor uuid;
  v_new jsonb;
  v_old jsonb;
  v_row jsonb;
  v_student uuid;
  v_sname text;
  v_name text;
  v_area text;
  v_action text;
  v_summary text;
  v_changes jsonb;
  v_link text;
  v_desc text;
begin
  if v_uid is null then return null; end if;
  select status, mentor_id into v_status, v_mentor from teacher_access_profiles where teacher_id = v_uid;
  if v_mentor is null or v_status is null or v_status = 'coach' then return null; end if;

  v_new := case when TG_OP <> 'DELETE' then to_jsonb(NEW) end;
  v_old := case when TG_OP <> 'INSERT' then to_jsonb(OLD) end;
  v_row := coalesce(v_new, v_old);
  v_action := case TG_OP when 'INSERT' then 'ekledi' when 'UPDATE' then 'güncelledi' else 'sildi' end;

  if TG_OP = 'UPDATE' then
    select jsonb_object_agg(e.key, jsonb_build_object('once', v_old -> e.key, 'sonra', e.value))
      into v_changes
      from jsonb_each(v_new) e
      where e.key not in ('updated_at', 'created_at', 'student_done_at', 'student_missed_at', 'steps_updated_at',
                          'updated_by', 'updated_by_name', 'updated_by_role', 'decided_at', 'last_message_at',
                          'question_results')
        and (v_new -> e.key) is distinct from (v_old -> e.key);
    if v_changes is null then return null; end if; -- yalnızca zaman damgası değişti
    if length(v_changes::text) > 6000 then
      v_changes := jsonb_build_object('_alanlar', (select jsonb_agg(k) from jsonb_object_keys(v_changes) k));
    end if;
  end if;

  if TG_TABLE_NAME = 'students' then
    v_student := (v_row ->> 'id')::uuid;
    v_sname := v_row ->> 'full_name';
  else
    v_student := nullif(v_row ->> 'student_id', '')::uuid;
    if v_student is not null then select full_name into v_sname from students where id = v_student; end if;
  end if;
  select full_name into v_name from profiles where id = v_uid;

  case TG_TABLE_NAME
    when 'question_logs' then
      v_area := 'gunluk';
      v_desc := concat_ws(' · ', nullif(v_row ->> 'subject', ''), nullif(v_row ->> 'topic', ''));
      v_summary := case TG_OP
        when 'INSERT' then 'Çalışma ekledi: ' || coalesce(v_desc, 'görev')
          || case when coalesce((v_row ->> 'done_count')::numeric, 0) > 0 then ' — ' || (v_row ->> 'done_count') || ' soru' else '' end
        when 'DELETE' then 'Görev sildi: ' || coalesce(v_desc, 'görev')
        else 'Günlük giriş: ' || coalesce(v_desc, 'görev') ||
          case
            when coalesce((v_new ->> 'student_missed')::boolean, false) then ' — yapmadı'
            when coalesce((v_new ->> 'student_done')::boolean, false) then ' — yaptı'
              || case when coalesce((v_new ->> 'done_count')::numeric, 0) > 0 then ' (' || (v_new ->> 'done_count') || ' soru)' else '' end
            when (v_old ->> 'student_done')::boolean and not coalesce((v_new ->> 'student_done')::boolean, false) then ' — işaret geri alındı'
            else ''
          end
      end;
      v_link := '/ogrenciler/' || v_student;
    when 'student_programs' then
      v_area := 'program';
      v_summary := case
        when TG_OP = 'INSERT' then 'Haftalık program hazırladı (' || (v_row ->> 'week_start') || ' – ' || (v_row ->> 'week_end') || ')'
        when TG_OP = 'DELETE' then 'Haftalık programı sildi'
        when v_new ->> 'status' = 'geri_cekildi' then 'Haftalık programı geri çekti'
        else 'Haftalık programı değiştirdi' end;
      v_link := '/ogrenciler/' || v_student;
    when 'topic_progress' then
      v_area := 'konu';
      v_summary := 'Konu ilerleyişi: ' || concat_ws(' · ', nullif(v_row ->> 'subject', ''), nullif(v_row ->> 'topic', ''));
      v_link := '/konu-ilerleyisi?ogrenci=' || v_student;
    when 'exams' then
      v_area := 'deneme';
      v_summary := 'Deneme: ' || coalesce(v_row ->> 'exam_name', '') || coalesce(' (' || (v_row ->> 'exam_type') || ', net ' || (v_row ->> 'net_score') || ')', '');
      v_link := '/denemeler?ogrenci=' || v_student;
    when 'meetings' then
      v_area := 'gorusme';
      v_summary := case when v_row ->> 'meeting_type' = 'veli' then 'Veli görüşmesi' else 'Görüşme kaydı' end
        || coalesce(': ' || nullif(v_row ->> 'topic', ''), '');
      v_link := '/gorusmeler/' || v_student;
    when 'students' then
      v_area := 'ogrenci';
      v_summary := case TG_OP when 'INSERT' then 'Öğrenci ekledi' when 'DELETE' then 'Öğrenciyi sildi' else 'Öğrenci bilgilerini değiştirdi' end;
      v_link := '/ogrenciler/' || v_student;
    when 'tasks' then
      v_area := 'gorev';
      v_summary := 'Görev: ' || coalesce(v_row ->> 'title', '');
      v_link := '/ogrenciler/' || v_student;
    when 'appointments' then
      v_area := 'randevu';
      v_summary := 'Randevu: ' || coalesce(nullif(v_row ->> 'title', ''), to_char((v_row ->> 'starts_at')::timestamptz at time zone 'Europe/Istanbul', 'DD.MM HH24:MI'));
      v_link := '/ajanda';
    when 'feed_posts' then
      v_area := 'paylasim';
      v_summary := 'Paylaşım: ' || coalesce(nullif(v_row ->> 'title', ''), left(coalesce(v_row ->> 'body', v_row ->> 'url', ''), 80));
      v_link := '/anasayfa';
    else
      v_area := TG_TABLE_NAME;
      v_summary := TG_TABLE_NAME;
      v_link := case when v_student is not null then '/ogrenciler/' || v_student end;
  end case;
  v_summary := left(v_summary, 300);

  insert into staff_activity (actor_id, actor_name, actor_status, mentor_id, student_id, student_name, area, action, summary, changes, link)
  values (v_uid, v_name, v_status, v_mentor, v_student, v_sname, v_area, v_action, v_summary, v_changes, v_link);

  -- Bildirim: aynı kişiden okunmamış bildirim varsa güncellenir (bildirimler yığılmaz)
  begin
    perform notify_user(v_mentor, 'personel',
      coalesce(v_name, 'Personel') || ': yeni kayıt',
      v_summary || coalesce(' · ' || v_sname, ''),
      '/ekip-kayitlari?kisi=' || v_uid, 720);
  exception when others then null; -- bildirim hatası asıl işlemi bozmasın
  end;
  return null;
exception when others then
  return null; -- kayıt tutulamasa da personelin işlemi engellenmez
end $$;

do $$
declare t text;
begin
  foreach t in array array['question_logs', 'student_programs', 'topic_progress', 'exams', 'meetings', 'students',
                           'tasks', 'appointments', 'feed_posts'] loop
    if to_regclass('public.' || t) is not null then
      execute format('drop trigger if exists trg_staff_activity on %I', t);
      execute format('create trigger trg_staff_activity after insert or update or delete on %I for each row execute function _log_staff_activity()', t);
    end if;
  end loop;
end $$;

-- Bir yıldan eski kayıtlar her ayın 1'inde silinir (pg_cron yoksa atlanır)
do $$
begin
  perform cron.unschedule('ekip-kayitlari-temizlik');
exception when others then null;
end $$;
do $$
begin
  perform cron.schedule('ekip-kayitlari-temizlik', '0 3 1 * *', $c$delete from staff_activity where created_at < now() - interval '365 days'$c$);
exception when others then null;
end $$;

notify pgrst, 'reload schema';
