-- ============================================================
-- Sabah 10:00 "Dün günlük girmeyenler" bildirimi: yeni sayfa, sessize alma, ilk giriş kuralı
-- ============================================================
-- 1) Bildirim artık /gunluk-eksikler sayfasını açar (önceden Haftalık Program'ın boş sayfası açılıyordu).
--    O sayfada: hiç girmeyenler, eksik girenler (işaretlenmemiş görevleriyle), mesaj / program / sessize alma.
-- 2) Sisteme HİÇ giriş yapmamış öğrenciler (hesabı açılmış ama ilk girişi yapılmamış) listeye girmez.
-- 3) Koç bir öğrenciyi belirli bir tarihe kadar ya da süresiz "sessize alabilir" (izin, hastalık, tatil):
--    students.daily_alert_muted_until (bu tarih DAHİL sessiz; 9999-12-31 = süresiz), daily_alert_mute_reason.
-- 4) Bildirimde, bir şey girip görevlerinin bir kısmını işaretlemeyen ("eksik giren") öğrenci sayısı da yazar.
-- bildirim_cakisma_duzeltme.sql'den SONRA çalıştırın. Tekrar çalıştırmak zararsızdır.

alter table students add column if not exists daily_alert_muted_until date;
alter table students add column if not exists daily_alert_mute_reason text;

-- Sayfa için: verilen öğrencilerden sisteme en az bir kez giriş yapmış olanlar (auth.users'a yalnızca burada bakılır)
create or replace function students_signed_in(p_ids uuid[])
returns setof uuid language sql stable security definer set search_path = public as $$
  select s.id from students s join auth.users u on u.id = s.profile_id
   where s.id = any(p_ids) and u.last_sign_in_at is not null and _is_staff(auth.uid());
$$;
revoke all on function students_signed_in(uuid[]) from public, anon;
grant execute on function students_signed_in(uuid[]) to authenticated;

create or replace function send_missing_daily_digest()
returns int language plpgsql security definer set search_path = public as $$
declare
  v_day date := (now() at time zone 'Europe/Istanbul')::date - 1;
  v_dow int := extract(isodow from v_day)::int - 1; -- Pazartesi=0
  v_gun text := (array['Pazartesi','Salı','Çarşamba','Perşembe','Cuma','Cumartesi','Pazar'])[v_dow + 1];
  r record;
  v_sent int := 0;
  v_names text;
  v_title text;
  v_body text;
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
    -- (bağlantı alıcıya özel: stajyerin özetinin kopyası rehber koçun kendi özetiyle birleşmesin)
    v_sent := v_sent + 1;
  end loop;
  return v_sent;
end $$;
revoke all on function send_missing_daily_digest() from public, anon, authenticated;
grant execute on function send_missing_daily_digest() to service_role;

-- Daha önce gelmiş bildirimler de yeni sayfayı açsın
update notifications set link = '/gunluk-eksikler?gun=' || to_char(created_at at time zone 'Europe/Istanbul' - interval '1 day', 'YYYY-MM-DD')
       || '&k=' || substr(link, length('/haftalik-takip?ozet=') + 1)
 where kind = 'gunluk' and link like '/haftalik-takip?ozet=%';

notify pgrst, 'reload schema';
