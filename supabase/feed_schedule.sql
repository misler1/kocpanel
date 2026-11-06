-- ============================================================
-- Ana sayfa paylaşımları: yayın aralığı, yayından kaldırma, yeni içerik eskisinin yerini alır
-- ============================================================
-- • Her paylaşımın başlangıç (starts_at) ve isteğe bağlı bitiş (ends_at, boş = süresiz) zamanı olur.
--   İleri tarihli paylaşım o zamana kadar öğrencide görünmez; bildirimi yayın başlayınca gider (10 dakikada bir).
-- • Koç paylaşımı istediği an yayından kaldırabilir (ends_at = şimdi) ve tekrar yayınlayabilir.
-- • İçerik (video/bağlantı): öğrenci her koçundan/öğretmeninden yalnızca EN SON yayına giren içeriği görür;
--   yeni içerik eskisinin yerini alır. Pano duyuruları birden fazla kalabilir.
-- ÖNCE home_feed.sql çalıştırılmış olmalı. Supabase SQL Editor'da BİR KEZ çalıştırın; tekrar çalıştırmak zararsızdır.
--
-- Geri alma:
--   select cron.unschedule('ana-sayfa-paylasim-yayin');
--   alter table feed_posts drop column starts_at, drop column ends_at, drop column notified_at;
--   ardından home_feed.sql'i yeniden çalıştırın.

do $$ begin
  if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'feed_posts' and column_name = 'starts_at') then
    alter table feed_posts add column starts_at timestamptz;
    alter table feed_posts add column ends_at timestamptz;
    alter table feed_posts add column notified_at timestamptz;
    update feed_posts set starts_at = created_at, notified_at = created_at; -- mevcutlar zaten yayında ve bildirildi
    alter table feed_posts alter column starts_at set default now();
    alter table feed_posts alter column starts_at set not null;
  end if;
end $$;
create index if not exists idx_feed_posts_pending on feed_posts(starts_at) where notified_at is null;

-- Paylaşımın alıcılarına bildirim (bir kez)
create or replace function _feed_notify(p_id uuid) returns void
language plpgsql security definer set search_path = public as $$
declare
  p feed_posts%rowtype;
  v_name text;
  v_ntitle text;
  v_nbody text;
  r record;
begin
  update feed_posts set notified_at = now() where id = p_id and notified_at is null returning * into p;
  if p.id is null then return; end if;
  select full_name into v_name from profiles where id = p.author_id;
  if p.audience = 'koclar' then
    for r in select id from profiles where role in ('koc', 'ogretmen') and coalesce(is_approved, false) and id <> p.author_id loop
      perform notify_user(r.id, 'oneri', 'Yöneticiden içerik önerisi 💡',
        coalesce(p.title, 'Öğrencilerinize gönderebileceğiniz bir içerik önerildi.'), '/anasayfa', 0);
    end loop;
  else
    v_ntitle := case when p.kind = 'duyuru' then 'Panoda yeni duyuru 📌' else 'Koçundan yeni içerik 🎬' end;
    v_nbody := coalesce(p.title, left(p.body, 120), coalesce(v_name, 'Koçun') || ' senin için bir içerik paylaştı.');
    for r in
      select distinct s.profile_id from students s
      where s.profile_id is not null and s.status::text <> 'pasif'
        and _feed_author_has_student(p.author_id, s.id)
        and (p.all_students or exists (select 1 from feed_post_students fs where fs.post_id = p.id and fs.student_id = s.id))
    loop
      perform notify_user(r.profile_id, p.kind, v_ntitle, v_nbody, '/ogrenci', 0);
    end loop;
  end if;
end $$;
revoke all on function _feed_notify(uuid) from public, anon, authenticated;

-- Eski 7 parametreli sürüm kalkar (aynı adlı iki sürüm PostgREST'te karışıklık yaratır)
drop function if exists create_feed_post(text, text, text, text, text, uuid[], uuid);

create or replace function create_feed_post(
  p_kind text, p_audience text, p_url text, p_title text, p_body text,
  p_student_ids uuid[] default null, p_source uuid default null,
  p_starts timestamptz default null, p_ends timestamptz default null
) returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_me uuid := auth.uid();
  v_id uuid;
  v_url text := nullif(trim(coalesce(p_url, '')), '');
  v_title text := nullif(left(trim(coalesce(p_title, '')), 150), '');
  v_body text := nullif(trim(coalesce(p_body, '')), '');
  v_all boolean := coalesce(array_length(p_student_ids, 1), 0) = 0;
  v_start timestamptz := greatest(coalesce(p_starts, now()), now());
  sid uuid;
begin
  if not public.auth_is_staff() then raise exception 'Yalnızca koç ve öğretmenler paylaşım yapabilir'; end if;
  if p_kind not in ('icerik', 'duyuru') then raise exception 'Geçersiz paylaşım türü'; end if;
  if p_audience not in ('ogrenciler', 'koclar') then raise exception 'Geçersiz alıcı'; end if;
  if p_audience = 'koclar' and not public.is_admin_user() then raise exception 'Koçlara öneriyi yalnızca yönetici yapabilir'; end if;
  if p_kind = 'icerik' and (v_url is null or v_url !~* '^https?://[^\s/]+\.[^\s]+$' or length(v_url) > 1000) then
    raise exception 'Geçerli bir bağlantı yapıştırın (https:// ile başlayan)';
  end if;
  if p_kind = 'duyuru' and v_body is null then raise exception 'Duyuru metni boş olamaz'; end if;
  if length(coalesce(v_body, '')) > 2000 then raise exception 'Metin en fazla 2000 karakter olabilir'; end if;
  if contains_profanity(coalesce(v_title, '') || ' ' || coalesce(v_body, '')) then
    raise exception 'Metin uygunsuz bir ifade içeriyor';
  end if;
  if v_start > now() + interval '1 year' then raise exception 'Başlangıç en fazla 1 yıl sonrası olabilir'; end if;
  if p_ends is not null and p_ends <= v_start then raise exception 'Bitiş tarihi başlangıçtan sonra olmalı'; end if;
  if p_audience = 'koclar' then v_all := true; end if;

  if not v_all then
    if array_length(p_student_ids, 1) > 500 then raise exception 'En fazla 500 öğrenci seçilebilir'; end if;
    foreach sid in array p_student_ids loop
      if not _feed_author_has_student(v_me, sid) then raise exception 'Seçilen öğrencilerden biri sizin öğrenciniz değil'; end if;
    end loop;
  end if;

  insert into feed_posts (author_id, kind, audience, url, title, body, all_students, source_post_id, starts_at, ends_at)
    values (v_me, p_kind, p_audience, case when p_kind = 'icerik' then v_url end, v_title, v_body, v_all,
            (select id from feed_posts where id = p_source and audience = 'koclar'), v_start, p_ends)
    returning id into v_id;
  if not v_all then
    insert into feed_post_students (post_id, student_id) select v_id, x from (select distinct unnest(p_student_ids) as x) s;
  end if;

  if v_start <= now() then perform _feed_notify(v_id); end if; -- ileri tarihliyse zamanlayıcı gönderir
  return v_id;
end $$;

-- Yayından kaldır / tekrar yayınla (yalnızca kendi paylaşımı)
create or replace function set_feed_post_live(p_id uuid, p_live boolean)
returns void language plpgsql security definer set search_path = public as $$
begin
  if p_live then
    update feed_posts set starts_at = now(), ends_at = null where id = p_id and author_id = auth.uid();
    if not found then raise exception 'Paylaşım bulunamadı'; end if;
    perform _feed_notify(p_id); -- daha önce hiç bildirilmediyse
  else
    update feed_posts set ends_at = now(), notified_at = coalesce(notified_at, now())
      where id = p_id and author_id = auth.uid();
    if not found then raise exception 'Paylaşım bulunamadı'; end if;
  end if;
end $$;

-- Öğrencinin ana sayfası: yayında olan duyurular + her paylaşandan en son yayına giren içerik (süresi geçmemişse)
create or replace function student_feed()
returns table (id uuid, kind text, url text, title text, body text, created_at timestamptz, author_name text)
language sql stable security definer set search_path = public as $$
  with mine as (
    select p.*, row_number() over (partition by p.author_id, p.kind order by p.starts_at desc, p.created_at desc) as rn
    from feed_posts p
    where p.audience = 'ogrenciler' and p.starts_at <= now()
      and exists (
        select 1 from students s
        where s.profile_id = auth.uid()
          and _feed_author_has_student(p.author_id, s.id)
          and (p.all_students or exists (select 1 from feed_post_students fs where fs.post_id = p.id and fs.student_id = s.id))
      )
  )
  select m.id, m.kind, m.url, m.title, m.body, m.starts_at, a.full_name
  from mine m join profiles a on a.id = m.author_id
  where (m.ends_at is null or m.ends_at > now())
    and (m.kind = 'duyuru' or m.rn = 1)
  order by m.starts_at desc
  limit 40;
$$;

-- Zamanı gelen ileri tarihli paylaşımların bildirimleri
create or replace function feed_publish_due() returns int
language plpgsql security definer set search_path = public as $$
declare r record; n int := 0;
begin
  for r in select id from feed_posts
           where notified_at is null and starts_at <= now() and (ends_at is null or ends_at > now())
           order by starts_at limit 200 loop
    perform _feed_notify(r.id);
    n := n + 1;
  end loop;
  return n;
end $$;
revoke all on function feed_publish_due() from public, anon, authenticated;
grant execute on function feed_publish_due() to service_role;

do $$ begin
  perform cron.unschedule(jobid) from cron.job where jobname = 'ana-sayfa-paylasim-yayin';
end $$;
select cron.schedule('ana-sayfa-paylasim-yayin', '*/10 * * * *', $cron$select public.feed_publish_due()$cron$);

do $$
declare f text;
begin
  foreach f in array array[
    'create_feed_post(text, text, text, text, text, uuid[], uuid, timestamptz, timestamptz)',
    'set_feed_post_live(uuid, boolean)', 'student_feed()'
  ] loop
    execute format('revoke all on function %s from public, anon', f);
    execute format('grant execute on function %s to authenticated', f);
  end loop;
end $$;

notify pgrst, 'reload schema';
