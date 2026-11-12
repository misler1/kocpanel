-- ============================================================
-- Video izlenme takibi: koçun ana sayfadan paylaştığı içerikleri hangi öğrenci açtı, ne kadar izledi
-- ============================================================
-- • Öğrenci içeriği açınca (oynat'a basınca ya da bağlantıyı açınca) kayıt düşer.
-- • YouTube ve Vimeo'da izlenen süre ve videonun yüzde kaçı izlendiği tutulur;
--   Instagram, TikTok, X ve diğer sitelerde yalnızca "açtı" bilgisi tutulur (bu siteler süre bilgisi vermez).
-- • Koç yalnızca kendi paylaşımlarının izlenme bilgisini görür (feed_view_summary, feed_post_viewers).
-- Tabloya doğrudan erişim kapalı; yazma record_feed_view, okuma yukarıdaki iki fonksiyonla.
-- home_feed.sql ve feed_schedule.sql'den SONRA çalıştırın. Supabase SQL Editor'da BİR KEZ çalıştırın; tekrar çalıştırmak zararsızdır.
--
-- Geri alma: drop table if exists public.feed_views cascade;

create table if not exists feed_views (
  post_id uuid not null references feed_posts(id) on delete cascade,
  student_id uuid not null references students(id) on delete cascade,
  opened_at timestamptz not null default now(),
  last_at timestamptz not null default now(),
  open_count int not null default 1,
  watched_seconds int not null default 0,
  duration_seconds int,
  max_percent int not null default 0,
  primary key (post_id, student_id)
);
create index if not exists idx_feed_views_student on feed_views(student_id);

alter table feed_views enable row level security;
revoke all on feed_views from public, anon, authenticated;
grant all on feed_views to service_role;

-- Öğrenci: içeriği açtı / izlemeye devam ediyor. p_watched: bu oturumda izlenen saniye, p_duration: video süresi (bilinmiyorsa null)
create or replace function record_feed_view(p_post uuid, p_watched int default 0, p_duration int default null, p_new_open boolean default false)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_author uuid;
  v_all boolean;
  v_student uuid;
  v_w int := greatest(0, least(coalesce(p_watched, 0), 36000));
  v_d int := case when p_duration > 0 and p_duration < 36000 then p_duration end;
  v_pct int;
begin
  select p.author_id, p.all_students into v_author, v_all
    from feed_posts p where p.id = p_post and p.audience = 'ogrenciler' and p.kind = 'icerik';
  if v_author is null then return; end if;
  select s.id into v_student from students s
   where s.profile_id = auth.uid() and _feed_author_has_student(v_author, s.id)
     and (v_all or exists (select 1 from feed_post_students fs where fs.post_id = p_post and fs.student_id = s.id))
   limit 1;
  if v_student is null then return; end if;
  if v_d is not null then v_w := least(v_w, v_d); end if;
  v_pct := case when v_d is not null then least(100, round(v_w * 100.0 / v_d))::int else 0 end;

  insert into feed_views (post_id, student_id, watched_seconds, duration_seconds, max_percent)
  values (p_post, v_student, v_w, v_d, v_pct)
  on conflict (post_id, student_id) do update set
    last_at = now(),
    open_count = feed_views.open_count + case when p_new_open then 1 else 0 end,
    watched_seconds = greatest(feed_views.watched_seconds, excluded.watched_seconds),
    duration_seconds = coalesce(excluded.duration_seconds, feed_views.duration_seconds),
    max_percent = greatest(feed_views.max_percent, excluded.max_percent);
end $$;

-- Paylaşımın hedef öğrencileri (paylaşımı görebilecek aktif öğrenciler)
create or replace function _feed_targets(p_post uuid)
returns table (student_id uuid) language sql stable security definer set search_path = public as $$
  select s.id from feed_posts p
  join students s on s.status::text <> 'pasif' and _feed_author_has_student(p.author_id, s.id)
   and (p.all_students or exists (select 1 from feed_post_students fs where fs.post_id = p.id and fs.student_id = s.id))
  where p.id = p_post;
$$;
revoke all on function _feed_targets(uuid) from public, anon, authenticated;

-- Koç: kendi paylaşımları için özet (kaç öğrenciye gitti, kaçı açtı, ortalama izlenme yüzdesi)
create or replace function feed_view_summary(p_ids uuid[])
returns table (post_id uuid, target int, opened int, avg_percent int)
language sql stable security definer set search_path = public as $$
  select p.id,
         (select count(*) from _feed_targets(p.id))::int,
         (select count(*) from feed_views v where v.post_id = p.id)::int,
         (select round(avg(v.max_percent))::int from feed_views v where v.post_id = p.id and v.duration_seconds is not null)
  from feed_posts p
  where p.id = any(p_ids) and p.author_id = auth.uid() and p.kind = 'icerik';
$$;

-- Koç: bir paylaşımın öğrenci öğrenci izlenme listesi (açanlar önce, sonra açmayanlar)
create or replace function feed_post_viewers(p_post uuid)
returns table (student_id uuid, full_name text, has_account boolean, opened_at timestamptz, last_at timestamptz,
               open_count int, watched_seconds int, duration_seconds int, max_percent int)
language sql stable security definer set search_path = public as $$
  select s.id, s.full_name, s.profile_id is not null, v.opened_at, v.last_at,
         v.open_count, v.watched_seconds, v.duration_seconds, v.max_percent
  from feed_posts p
  join students s on s.id in (select t.student_id from _feed_targets(p.id) t)
                  or exists (select 1 from feed_views x where x.post_id = p.id and x.student_id = s.id)
  left join feed_views v on v.post_id = p.id and v.student_id = s.id
  where p.id = p_post and p.author_id = auth.uid()
  order by v.opened_at is null, v.max_percent desc nulls last, s.full_name;
$$;

do $$
declare f text;
begin
  foreach f in array array['record_feed_view(uuid, int, int, boolean)', 'feed_view_summary(uuid[])', 'feed_post_viewers(uuid)'] loop
    execute format('revoke all on function %s from public, anon', f);
    execute format('grant execute on function %s to authenticated', f);
  end loop;
end $$;

notify pgrst, 'reload schema';
