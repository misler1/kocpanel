-- ============================================================
-- Ayarlar > Otomasyonlar
-- ============================================================
-- Her koç/öğretmen kendi hesabı için otomatik bildirimleri ve işleri açıp kapatır (profiles.automation_prefs).
-- Anahtar yoksa ilgili şey AÇIK sayılır (varsayılan davranış değişmez).
--
-- Koça gelen bildirimler (alıcının kendi ayarı):
--   koc_mesaj, koc_sabah (dün günlük girmeyenler), koc_gunluk, koc_deneme, koc_konu, koc_ilk_giris,
--   koc_program (program onayı / talebi), koc_randevu, koc_ekip (ekip kayıtları), koc_stajyer (stajyer kopyası),
--   koc_rapor (haftalık raporlar hazır), koc_oneri (yönetici içerik önerisi), koc_basvuru (öğrenci başvurusu)
-- Öğrenciye giden bildirimler (öğrencinin koçunun ayarı):
--   ogr_program, ogr_deneme, ogr_randevu, ogr_paylasim (ana sayfa paylaşımı), ogr_hatirlatma (çalışma hatırlatması)
--   Öğrencinin mesaj bildirimleri ve hesap bildirimleri her zaman gider.
-- Otomatik işler:
--   sabah_saati (7–12, varsayılan 10): dün günlük girmeyenler listesinin geleceği saat
--   rapor_otomatik (varsayılan açık), rapor_gunu (0=Pazartesi … 6=Pazar, varsayılan 0): haftalık rapor; o günden
--     önceki 7 günü kapsar
--   gorusme_gorevi (varsayılan açık): Ajandaya eklenen öğrenci görüşmesi programa "Görüşme" görevi olarak düşer
--
-- stajyer_bildirim_kopyasi.sql, bildirim_cakisma_duzeltme.sql, gunluk_eksikler.sql, student_reports.sql ve
-- appointments_program.sql'den SONRA çalıştırın. Tekrar çalıştırmak zararsızdır.

alter table profiles add column if not exists automation_prefs jsonb not null default '{}'::jsonb;

-- Kendi ayarlarını kaydet (yalnızca bu sütun)
create or replace function set_automation_prefs(p_prefs jsonb)
returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'Giriş gerekli'; end if;
  if jsonb_typeof(p_prefs) <> 'object' then raise exception 'Geçersiz ayar'; end if;
  update profiles set automation_prefs = p_prefs where id = auth.uid();
end $$;
revoke all on function set_automation_prefs(jsonb) from public, anon;
grant execute on function set_automation_prefs(jsonb) to authenticated;

create or replace function _pref_on(p_owner uuid, p_key text)
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select (automation_prefs ->> p_key)::boolean from profiles where id = p_owner), true);
$$;
revoke all on function _pref_on(uuid, text) from public, anon, authenticated;

-- Bildirimin hangi ayara bağlı olduğu (null = her zaman gider)
create or replace function _notif_pref_key(p_kind text, p_title text, p_link text, p_to_student boolean)
returns text language sql immutable as $$
  select case
    when p_to_student then case
      when p_kind in ('gorev', 'plan_talebi') then 'ogr_program'
      when p_kind = 'deneme' then 'ogr_deneme'
      when p_kind = 'randevu' then 'ogr_randevu'
      when p_kind in ('icerik', 'duyuru') then 'ogr_paylasim'
      when p_kind = 'hatirlatma' then 'ogr_hatirlatma'
    end
    else case
      when p_kind = 'mesaj' then 'koc_mesaj'
      when p_kind = 'gunluk' and (p_link like '/gunluk-eksikler%' or p_link like '/haftalik-takip?ozet=%') then 'koc_sabah'
      when p_kind = 'gunluk' then 'koc_gunluk'
      when p_kind = 'deneme' then 'koc_deneme'
      when p_kind = 'konu' then 'koc_konu'
      when p_kind = 'hesap' and p_title like 'Öğrencin%' then 'koc_ilk_giris'
      when p_kind in ('plan_talebi', 'gorev') then 'koc_program'
      when p_kind = 'randevu' then 'koc_randevu'
      when p_kind = 'personel' then 'koc_ekip'
      when p_kind = 'rapor' then 'koc_rapor'
      when p_kind = 'oneri' then 'koc_oneri'
      when p_kind = 'basvuru' then 'koc_basvuru'
    end
  end;
$$;

create or replace function _notif_allowed(p_recipient uuid, p_kind text, p_title text, p_link text)
returns boolean language plpgsql stable security definer set search_path = public as $$
declare
  v_role text;
  v_owner uuid;
  v_key text;
begin
  select role::text into v_role from profiles where id = p_recipient;
  if v_role = 'ogrenci' then
    select coach_id into v_owner from students where profile_id = p_recipient and coach_id is not null limit 1;
    v_key := _notif_pref_key(p_kind, p_title, p_link, true);
  else
    v_owner := p_recipient;
    v_key := _notif_pref_key(p_kind, p_title, p_link, false);
  end if;
  if v_key is null or v_owner is null then return true; end if;
  return _pref_on(v_owner, v_key);
exception when others then return true;
end $$;
revoke all on function _notif_allowed(uuid, text, text, text) from public, anon, authenticated;

-- notify_user: önceki davranış aynen (stajyer_bildirim_kopyasi.sql), yalnızca ayar kontrolü eklendi
create or replace function notify_user(
  p_recipient uuid, p_kind text, p_title text, p_body text, p_link text, p_dedupe_minutes int default 0
) returns void language plpgsql security definer set search_path = public as $$
declare
  v_mentor uuid;
  v_intern_name text;
  v_copy_kind boolean := p_kind in ('gunluk', 'deneme', 'plan_talebi', 'konu')
                         or (p_kind = 'hesap' and p_title like 'Öğrencin%');
  v_dup uuid;
  v_ok boolean;
begin
  if p_recipient is null then return; end if;
  v_ok := _notif_allowed(p_recipient, p_kind, p_title, p_link);

  if not v_copy_kind then
    if v_ok then perform _notify_user_one(p_recipient, p_kind, p_title, p_body, p_link, p_dedupe_minutes); end if;
    return;
  end if;

  -- Aynı işlemde bu alıcıya aynı olayın stajyer kopyası zaten düştüyse, doğrudan bildirim onun yerine geçer
  if v_ok then
    select id into v_dup from notifications
      where recipient_id = p_recipient and kind = p_kind and link is not distinct from p_link
        and created_at = now() and body like 'Stajyer %'
      limit 1;
    if v_dup is not null then
      update notifications set title = p_title, body = p_body where id = v_dup;
    else
      perform _notify_user_one(p_recipient, p_kind, p_title, p_body, p_link, p_dedupe_minutes);
    end if;
  end if;

  -- Stajyerin öğrencisinden gelen bildirim → rehber koça kopya (rehber koçun kendi ayarlarına göre)
  begin
    select t.mentor_id, p.full_name into v_mentor, v_intern_name
      from teacher_access_profiles t join profiles p on p.id = t.teacher_id
      where t.teacher_id = p_recipient and t.status::text = 'intern';
    if v_mentor is null or v_mentor = p_recipient then return; end if;
    if not _pref_on(v_mentor, 'koc_stajyer') or not _notif_allowed(v_mentor, p_kind, p_title, p_link) then return; end if;
    -- Rehber koç aynı olayı bu işlemde zaten doğrudan aldıysa kopya açılmaz
    if exists (select 1 from notifications
               where recipient_id = v_mentor and kind = p_kind and link is not distinct from p_link
                 and created_at = now()) then
      return;
    end if;
    perform _notify_user_one(v_mentor, p_kind, p_title,
      'Stajyer ' || coalesce(v_intern_name, '') || ' · ' || coalesce(p_body, ''),
      p_link, coalesce(p_dedupe_minutes, 0));
  exception when others then null; -- kopya gönderilemese de asıl bildirim etkilenmez
  end;
end $$;
revoke all on function notify_user(uuid, text, text, text, text, int) from public, anon, authenticated;

-- ------------------------------------------------------------
-- Dün günlük girmeyenler: her saat çalışır, her koça seçtiği saatte gider (gunluk_eksikler.sql'deki gövde aynen)
-- ------------------------------------------------------------
create or replace function send_missing_daily_digest()
returns int language plpgsql security definer set search_path = public as $$
declare
  v_day date := (now() at time zone 'Europe/Istanbul')::date - 1;
  v_hour int := extract(hour from now() at time zone 'Europe/Istanbul')::int;
  v_dow int := extract(isodow from v_day)::int - 1; -- Pazartesi=0
  v_gun text := (array['Pazartesi','Salı','Çarşamba','Perşembe','Cuma','Cumartesi','Pazar'])[v_dow + 1];
  r record;
  v_sent int := 0;
  v_names text;
  v_title text;
  v_body text;
  v_want int;
begin
  delete from missing_daily_digest_log where for_day < v_day - 30;

  for r in
    with takip as (
      select s.id, s.full_name, s.coach_id, s.responsible_coach_id
      from students s join auth.users u on u.id = s.profile_id
      where u.last_sign_in_at is not null                      -- sisteme ilk girişini yapmış
        and s.status is distinct from 'pasif'
        and not coalesce(s.platform_only, false)
        and coalesce((to_jsonb(s) -> 'reminder_days') @> to_jsonb(v_dow), true)
        and (s.daily_alert_muted_until is null or s.daily_alert_muted_until < v_day) -- koç sessize almamış
    ),
    durum as (
      select t.*,
        exists (select 1 from daily_logs d
                 where d.student_id = t.id and d.log_date = v_day and coalesce(d.archived, false) = false) as has_log,
        (select count(*) filter (where q.student_done or coalesce(q.student_missed, false))
           from question_logs q
          where q.student_id = t.id and q.plan_day = v_dow and q.appointment_id is null and not coalesce(q.student_added, false)
            and q.week_start = (select max(w.week_start) from question_logs w
                                 where w.student_id = t.id and w.appointment_id is null and w.week_start <= v_day
                                   and coalesce(w.week_end, w.week_start + 6) >= v_day)) as n_marked,
        (select count(*)
           from question_logs q
          where q.student_id = t.id and q.plan_day = v_dow and q.appointment_id is null and not coalesce(q.student_added, false)
            and q.week_start = (select max(w.week_start) from question_logs w
                                 where w.student_id = t.id and w.appointment_id is null and w.week_start <= v_day
                                   and coalesce(w.week_end, w.week_start + 6) >= v_day)) as n_tasks
      from takip t
    ),
    sinif as (
      select id, full_name, coach_id, responsible_coach_id,
        case when not has_log and n_marked = 0 then 'yok'
             when n_tasks > n_marked then 'eksik' end as tur
      from durum
    ),
    alici as (
      select coach_id as recipient_id, id, full_name, tur from sinif where tur is not null and coach_id is not null
      union
      select responsible_coach_id, id, full_name, tur from sinif where tur is not null and responsible_coach_id is not null
    )
    select recipient_id,
      count(*) filter (where tur = 'yok') as n,
      count(*) filter (where tur = 'eksik') as n_eksik,
      array_agg(full_name order by full_name) filter (where tur = 'yok') as names
    from alici group by recipient_id
  loop
    -- Koçun seçtiği saat (Otomasyonlar; varsayılan 10:00)
    select coalesce(nullif(automation_prefs ->> 'sabah_saati', '')::int, 10) into v_want from profiles where id = r.recipient_id;
    if coalesce(v_want, 10) <> v_hour then continue; end if;
    insert into missing_daily_digest_log (recipient_id, for_day) values (r.recipient_id, v_day) on conflict do nothing;
    if not found then continue; end if; -- bugün zaten gönderildi
    if r.n > 0 then
      v_names := array_to_string(r.names[1:12], ', ') || case when r.n > 12 then ' ve ' || (r.n - 12) || ' öğrenci daha' else '' end;
      v_title := 'Dün günlük girmeyen ' || r.n || ' öğrenci 📒';
      v_body := to_char(v_day, 'DD.MM') || ' ' || v_gun || ': ' || v_names
        || case when r.n_eksik > 0 then ' · ' || r.n_eksik || ' öğrenci eksik girdi' else '' end;
    else
      v_title := 'Dün ' || r.n_eksik || ' öğrenci günlüğü eksik girdi 📒';
      v_body := to_char(v_day, 'DD.MM') || ' ' || v_gun || ': işaretlenmemiş görevleri görmek için dokunun.';
    end if;
    perform notify_user(r.recipient_id, 'gunluk', v_title, v_body, '/gunluk-eksikler?gun=' || v_day || '&k=' || r.recipient_id, 0);
    v_sent := v_sent + 1;
  end loop;
  return v_sent;
end $$;
revoke all on function send_missing_daily_digest() from public, anon, authenticated;
grant execute on function send_missing_daily_digest() to service_role;

do $$ begin
  perform cron.unschedule(jobid) from cron.job where jobname = 'gunluk-girmeyenler-ozeti';
end $$;
select cron.schedule('gunluk-girmeyenler-ozeti', '0 * * * *', $cron$select public.send_missing_daily_digest()$cron$);

-- ------------------------------------------------------------
-- Haftalık rapor: her sabah 08:00 çalışır; site, raporu koçun seçtiği günde üretir (/api/cron/haftalik-rapor)
-- ------------------------------------------------------------
do $$ begin
  perform cron.unschedule(jobid) from cron.job where jobname = 'haftalik-ogrenci-raporu';
end $$;
select cron.schedule('haftalik-ogrenci-raporu', '0 5 * * *', $cron$select public.trigger_weekly_reports()$cron$);

-- ------------------------------------------------------------
-- Ajanda görüşmesi → programa "Görüşme" görevi: koç kapattıysa görev eklenmez
-- ------------------------------------------------------------
create or replace function _appointment_task_pref()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.appointment_id is not null and not _pref_on(new.coach_id, 'gorusme_gorevi') then
    return null;
  end if;
  return new;
end $$;
revoke all on function _appointment_task_pref() from public, anon, authenticated;

drop trigger if exists trg_appointment_task_pref on question_logs;
create trigger trg_appointment_task_pref before insert on question_logs
  for each row execute function _appointment_task_pref();

notify pgrst, 'reload schema';
