-- ============================================================
-- Ana sayfa paylaşımları: koçun içerikleri (video/gönderi bağlantısı), pano duyuruları, yöneticinin koçlara önerileri
-- ============================================================
-- • Koç/öğretmen bir bağlantı (YouTube, Instagram, X, TikTok, Vimeo, Spotify ya da herhangi bir site) ya da
--   duyuru paylaşır; tüm öğrencilerine ya da seçtiği öğrencilere gider, öğrencinin ana sayfasında görünür.
-- • "Öğrencilerim" = koçu, sorumlu koçu ya da atanmış öğretmeni olduğu öğrenciler (yönetici de yalnızca kendi
--   öğrencilerine gönderir; tüm sisteme değil).
-- • Yönetici (is_admin) içerikleri koçlara önerebilir (audience = 'koclar'); koç beğenirse "Öğrencilerime gönder" der.
-- • Öneriler: diğer koçların paylaştığı bağlantılar (isimsiz) feed_suggestions() ile gelir.
-- • Yeni paylaşımda alıcılara panel içi bildirim (ve açıksa telefon bildirimi) gider.
-- Yazma yalnızca create_feed_post ile (doğrudan insert kapalı); okuma: kendi paylaşımları, koçlara öneriler,
-- öğrenci için student_feed(). ÖNCE notifications.sql, security_rls_fix.sql çalıştırılmış olmalı.
-- Supabase SQL Editor'da BİR KEZ çalıştırın. Tekrar çalıştırmak zararsızdır. Mevcut tablolara dokunmaz.
--
-- Geri alma (yalnızca bu özelliği kaldırır):
--   drop table if exists public.feed_post_students, public.feed_posts cascade;

create table if not exists feed_posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references profiles(id) on delete cascade,
  kind text not null check (kind in ('icerik', 'duyuru')),
  audience text not null default 'ogrenciler' check (audience in ('ogrenciler', 'koclar')),
  url text check (url is null or (url ~* '^https?://' and length(url) <= 1000)),
  title text check (title is null or length(title) <= 150),
  body text check (body is null or length(body) <= 2000),
  all_students boolean not null default true,
  source_post_id uuid references feed_posts(id) on delete set null,
  created_at timestamptz not null default now(),
  check (kind <> 'icerik' or url is not null),
  check (kind <> 'duyuru' or body is not null)
);
create index if not exists idx_feed_posts_author on feed_posts(author_id, created_at desc);
create index if not exists idx_feed_posts_audience on feed_posts(audience, created_at desc);

create table if not exists feed_post_students (
  post_id uuid not null references feed_posts(id) on delete cascade,
  student_id uuid not null references students(id) on delete cascade,
  primary key (post_id, student_id)
);
create index if not exists idx_feed_post_students_student on feed_post_students(student_id);

alter table feed_posts enable row level security;
alter table feed_post_students enable row level security;

-- Okuma: kendi paylaşımları; onaylı koç/öğretmen yöneticinin koçlara önerilerini görür
drop policy if exists feed_posts_select on feed_posts;
create policy feed_posts_select on feed_posts for select to authenticated
  using (author_id = auth.uid() or (audience = 'koclar' and public.auth_is_staff()));
-- Silme: yalnızca kendi paylaşımı
drop policy if exists feed_posts_delete on feed_posts;
create policy feed_posts_delete on feed_posts for delete to authenticated using (author_id = auth.uid());

drop policy if exists feed_post_students_select on feed_post_students;
create policy feed_post_students_select on feed_post_students for select to authenticated
  using (exists (select 1 from feed_posts p where p.id = post_id and p.author_id = auth.uid()));

revoke all on feed_posts, feed_post_students from public, anon, authenticated;
grant select, delete on feed_posts to authenticated;
grant select on feed_post_students to authenticated;
grant all on feed_posts, feed_post_students to service_role;

-- p_author bu öğrencinin koçu / sorumlu koçu / öğretmeni mi? (yönetici istisnası YOK: herkes kendi öğrencilerine)
create or replace function _feed_author_has_student(p_author uuid, p_student uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from students s where s.id = p_student
                 and (s.coach_id = p_author or s.responsible_coach_id = p_author
                      or exists (select 1 from student_teachers t where t.student_id = s.id and t.teacher_id = p_author)));
$$;
revoke all on function _feed_author_has_student(uuid, uuid) from public, anon, authenticated;

-- Koçun paylaşım yapabileceği öğrenciler (seçim listesi)
create or replace function my_feed_students()
returns table (id uuid, full_name text, sinif_sube text, has_account boolean)
language sql stable security definer set search_path = public as $$
  select s.id, s.full_name, s.sinif_sube, s.profile_id is not null
  from students s
  where public.auth_is_staff() and s.status::text <> 'pasif'
    and _feed_author_has_student(auth.uid(), s.id)
  order by s.full_name;
$$;

-- Paylaş: içerik / duyuru; öğrencilere (tümü ya da seçili) veya (yalnızca yönetici) koçlara
create or replace function create_feed_post(
  p_kind text, p_audience text, p_url text, p_title text, p_body text,
  p_student_ids uuid[] default null, p_source uuid default null
) returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_me uuid := auth.uid();
  v_id uuid;
  v_url text := nullif(trim(coalesce(p_url, '')), '');
  v_title text := nullif(left(trim(coalesce(p_title, '')), 150), '');
  v_body text := nullif(trim(coalesce(p_body, '')), '');
  v_all boolean := coalesce(array_length(p_student_ids, 1), 0) = 0;
  v_name text;
  v_ntitle text;
  v_nbody text;
  sid uuid;
  r record;
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
  if p_audience = 'koclar' then v_all := true; end if;

  if not v_all then
    if array_length(p_student_ids, 1) > 500 then raise exception 'En fazla 500 öğrenci seçilebilir'; end if;
    foreach sid in array p_student_ids loop
      if not _feed_author_has_student(v_me, sid) then raise exception 'Seçilen öğrencilerden biri sizin öğrenciniz değil'; end if;
    end loop;
  end if;

  insert into feed_posts (author_id, kind, audience, url, title, body, all_students, source_post_id)
    values (v_me, p_kind, p_audience, case when p_kind = 'icerik' then v_url end, v_title, v_body, v_all,
            (select id from feed_posts where id = p_source and audience = 'koclar'))
    returning id into v_id;
  if not v_all then
    insert into feed_post_students (post_id, student_id) select v_id, x from (select distinct unnest(p_student_ids) as x) s;
  end if;

  -- Bildirimler
  select full_name into v_name from profiles where id = v_me;
  if p_audience = 'koclar' then
    for r in select id from profiles where role in ('koc', 'ogretmen') and coalesce(is_approved, false) and id <> v_me loop
      perform notify_user(r.id, 'oneri', 'Yöneticiden içerik önerisi 💡',
        coalesce(v_title, 'Öğrencilerinize gönderebileceğiniz bir içerik önerildi.'), '/anasayfa', 0);
    end loop;
  else
    v_ntitle := case when p_kind = 'duyuru' then 'Panoda yeni duyuru 📌' else 'Koçundan yeni içerik 🎬' end;
    v_nbody := coalesce(v_title, left(v_body, 120),
      coalesce(v_name, 'Koçun') || ' senin için bir içerik paylaştı.');
    for r in
      select distinct s.profile_id from students s
      where s.profile_id is not null and s.status::text <> 'pasif'
        and _feed_author_has_student(v_me, s.id)
        and (v_all or exists (select 1 from feed_post_students fs where fs.post_id = v_id and fs.student_id = s.id))
    loop
      perform notify_user(r.profile_id, p_kind, v_ntitle, v_nbody, '/ogrenci', 0);
    end loop;
  end if;
  return v_id;
end $$;

-- Öğrencinin ana sayfası: koç(lar)ının ve öğretmenlerinin kendisine yönelik paylaşımları
create or replace function student_feed()
returns table (id uuid, kind text, url text, title text, body text, created_at timestamptz, author_name text)
language sql stable security definer set search_path = public as $$
  select p.id, p.kind, p.url, p.title, p.body, p.created_at, a.full_name
  from feed_posts p
  join profiles a on a.id = p.author_id
  where p.audience = 'ogrenciler'
    and exists (
      select 1 from students s
      where s.profile_id = auth.uid()
        and _feed_author_has_student(p.author_id, s.id)
        and (p.all_students or exists (select 1 from feed_post_students fs where fs.post_id = p.id and fs.student_id = s.id))
    )
  order by p.created_at desc
  limit 40;
$$;

-- Öneriler: diğer koçların son 90 günde öğrencilerine paylaştığı bağlantılar (paylaşan adı verilmez),
-- bu koçun zaten paylaştıkları hariç; en çok paylaşılan önce
create or replace function feed_suggestions()
returns table (url text, title text, share_count int)
language sql stable security definer set search_path = public as $$
  select p.url, (array_agg(p.title order by p.created_at desc) filter (where p.title is not null))[1],
         count(distinct p.author_id)::int
  from feed_posts p
  where public.auth_is_staff()
    and p.kind = 'icerik' and p.audience = 'ogrenciler' and p.author_id <> auth.uid()
    and p.created_at > now() - interval '90 days'
    and not exists (select 1 from feed_posts m where m.author_id = auth.uid() and m.url = p.url)
  group by p.url
  order by count(distinct p.author_id) desc, max(p.created_at) desc
  limit 6;
$$;

do $$
declare f text;
begin
  foreach f in array array[
    'my_feed_students()', 'create_feed_post(text, text, text, text, text, uuid[], uuid)', 'student_feed()', 'feed_suggestions()'
  ] loop
    execute format('revoke all on function %s from public, anon', f);
    execute format('grant execute on function %s to authenticated', f);
  end loop;
end $$;

notify pgrst, 'reload schema';
