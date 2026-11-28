-- ============================================================
-- Abonelik ve ödeme (havale/EFT, yönetici onaylı)
-- ============================================================
-- • Ücretli olan: onaylı koç/öğretmen hesapları (role koc|ogretmen). Yönetici, sistem hesabı, yurt yöneticisi,
--   belletmen ve stajyer her zaman muaftır.
-- • Bu dosya çalıştırıldığı anda VAR OLAN bütün koç/öğretmen hesapları "ücretsiz, süresiz" işaretlenir.
--   Yönetici bunu Ayarlar > Abonelikler'den istediği zaman değiştirebilir (bitiş tarihi verir ya da kapatır).
-- • Yeni koç: ilk girişinde deneme süresi (varsayılan 14 gün) başlar.
-- • Süre biter → görüntüleme süresi (varsayılan 14 gün): koç verilerini görür ve indirebilir, yeni kayıt giremez
--   (aşağıdaki tetikleyiciler). Öğrenciler kullanmaya devam eder. Görüntüleme süresi de biterse hesap kilitlenir
--   (yalnızca Abonelik sayfası açılır). Ödeme onaylanınca hemen yeniden açılır.
-- • Havale: koç Abonelik sayfasında paketini seçer, kendi ödeme kodunu açıklamaya yazar, "Ödeme yaptım" der.
--   Yöneticiye bildirim gider; yönetici hesabına bakıp onaylar → süre uzar.
-- • Kurumsal: koç sayısı + toplam öğrenci sayısından otomatik fiyat (hacim indirimi). Onaylanınca kurum kurulur,
--   yönetici diğer koçları kuruma ekler; kurumun koçları kurumun aboneliğini kullanır.
-- Fiyatlar, indirimler, süreler ve banka bilgileri billing_settings'te (Ayarlar > Abonelikler'den değiştirilir).
-- ÖNCE notifications.sql (notify_user) çalıştırılmış olmalı. Supabase SQL Editor'da BİR KEZ çalıştırın;
-- tekrar çalıştırmak zararsızdır (mevcut abonelikler değişmez).
--
-- Geri alma:
--   select cron.unschedule('abonelik-hatirlatma');
--   drop table if exists billing_payments, billing_accounts, billing_orgs, billing_settings cascade;
--   drop function if exists _billing_guard() cascade; drop function if exists _billing_student_limit() cascade;
-- ============================================================

-- ─── Ayarlar (tek satır) ───────────────────────────────────────
create table if not exists billing_settings (
  id int primary key default 1 check (id = 1),
  -- Aylık bireysel paketler: max öğrenci (null = sınırsız) ve fiyat (TL)
  tiers jsonb not null default '[{"max":10,"price":49},{"max":30,"price":99},{"max":60,"price":159},{"max":null,"price":199}]',
  yearly_discount int not null default 20 check (yearly_discount between 0 and 90),
  -- Kurumsal hacim indirimi: koç sayısı en az "min" ise "pct" indirim (en büyük eşleşen)
  org_discounts jsonb not null default '[{"min":2,"pct":10},{"min":5,"pct":15},{"min":10,"pct":20},{"min":20,"pct":25}]',
  trial_days int not null default 14 check (trial_days between 0 and 365),
  grace_days int not null default 14 check (grace_days between 0 and 365),
  bank_name text,
  account_name text,
  iban text,
  updated_at timestamptz not null default now()
);
insert into billing_settings (id) values (1) on conflict (id) do nothing;

-- ─── Kurumlar (kurumsal abonelik) ──────────────────────────────
create table if not exists billing_orgs (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(name) between 1 and 150),
  owner_id uuid references profiles(id) on delete set null, -- ödemeyi yapan; Abonelik sayfasında kurumu yönetir
  plan text not null default 'paid' check (plan in ('free', 'trial', 'paid')),
  ends_at timestamptz,
  period text check (period in ('aylik', 'yillik')),
  coach_limit int check (coach_limit is null or coach_limit > 0),
  student_limit int check (student_limit is null or student_limit > 0), -- null = sınırsız
  ref_code text unique,
  note text,
  created_at timestamptz not null default now()
);

-- ─── Koç hesapları ─────────────────────────────────────────────
create table if not exists billing_accounts (
  profile_id uuid primary key references profiles(id) on delete cascade,
  org_id uuid references billing_orgs(id) on delete set null, -- kurumsal üyeyse kurumun aboneliği geçerli
  plan text not null check (plan in ('free', 'trial', 'paid')),
  ends_at timestamptz, -- free + null = süresiz ücretsiz
  tier_max int check (tier_max is null or tier_max > 0), -- paket öğrenci sınırı; null = sınırsız
  period text check (period in ('aylik', 'yillik')),
  ref_code text unique,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_billing_accounts_org on billing_accounts(org_id);

-- ─── Ödeme bildirimleri ────────────────────────────────────────
create table if not exists billing_payments (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles(id) on delete cascade,
  org_id uuid references billing_orgs(id) on delete set null,
  kind text not null check (kind in ('bireysel', 'kurumsal')),
  org_name text,
  tier_max int,
  coach_count int,
  student_count int,
  period text not null check (period in ('aylik', 'yillik')),
  amount numeric(10, 2) not null,
  ref_code text,
  payer_note text check (payer_note is null or length(payer_note) <= 500),
  status text not null default 'bekliyor' check (status in ('bekliyor', 'onaylandi', 'reddedildi')),
  admin_note text,
  decided_at timestamptz,
  decided_by uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists idx_billing_payments_status on billing_payments(status, created_at desc);

alter table billing_settings enable row level security;
alter table billing_orgs enable row level security;
alter table billing_accounts enable row level security;
alter table billing_payments enable row level security;
revoke all on billing_settings, billing_orgs, billing_accounts, billing_payments from public, anon, authenticated;
grant select on billing_settings to authenticated; -- fiyatlar ve banka bilgisi abonelik sayfasında gösterilir
drop policy if exists billing_settings_read on billing_settings;
create policy billing_settings_read on billing_settings for select to authenticated using (true);
grant select on billing_payments to authenticated;
drop policy if exists billing_payments_read on billing_payments;
create policy billing_payments_read on billing_payments for select to authenticated
  using (profile_id = auth.uid() or public.is_admin_user());
-- Diğer bütün okuma/yazma aşağıdaki fonksiyonlarla

-- ─── Yardımcılar ───────────────────────────────────────────────
create or replace function _billing_ref() returns text language sql volatile as $$
  select 'KD' || upper(substr(md5(random()::text || clock_timestamp()::text), 1, 6));
$$;

-- Ücretli hesap mı (koç/öğretmen; yönetici, sistem hesabı ve kurum personeli/stajyer değil)
create or replace function _billable(p uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from profiles pr
    where pr.id = p and pr.role in ('koc', 'ogretmen')
      and not coalesce(pr.is_admin, false) and not coalesce(pr.is_system, false)
      and not exists (select 1 from teacher_access_profiles t
                      where t.teacher_id = pr.id and t.status in ('dorm_manager', 'dorm_supervisor', 'intern'))
  );
$$;

-- Fiyat (TL). Bireysel: paketin aylık fiyatı. Kurumsal: ortalama öğrenci/koç paketinin fiyatı × koç sayısı − hacim indirimi.
-- Yıllık: 12 ay − yıllık indirim. Sonuç tam TL'ye yuvarlanır.
create or replace function billing_price(p_kind text, p_tier_max int, p_coach_count int, p_student_count int, p_period text)
returns table (amount numeric, tier_max int, student_limit int, monthly numeric)
language plpgsql stable security definer set search_path = public as $$
declare
  s billing_settings%rowtype;
  t jsonb;
  v_tier jsonb;
  v_need int;
  v_k int := greatest(coalesce(p_coach_count, 1), 1);
  v_pct int := 0;
  v_monthly numeric;
begin
  select * into s from billing_settings where id = 1;
  v_need := case when p_kind = 'kurumsal' then ceil(greatest(coalesce(p_student_count, 0), 1)::numeric / v_k)::int
                 else coalesce(p_tier_max, 2147483647) end;
  -- Paketler küçükten büyüğe (sınırsız en sonda); gereken öğrenci sayısını karşılayan ilk paket
  for t in select e.value from jsonb_array_elements(s.tiers) e order by coalesce((e.value->>'max')::int, 2147483647) loop
    if (t->>'max') is null or (t->>'max')::int >= v_need then v_tier := t; exit; end if;
  end loop;
  if v_tier is null then -- en büyük paket
    select e.value into v_tier from jsonb_array_elements(s.tiers) e order by coalesce((e.value->>'max')::int, 2147483647) desc limit 1;
  end if;
  if p_kind = 'kurumsal' then
    select coalesce(max((d.value->>'pct')::int), 0) into v_pct from jsonb_array_elements(s.org_discounts) d where (d.value->>'min')::int <= v_k;
    v_monthly := (v_tier->>'price')::numeric * v_k * (100 - v_pct) / 100;
  else
    v_monthly := (v_tier->>'price')::numeric;
  end if;
  amount := round(case when p_period = 'yillik' then v_monthly * 12 * (100 - s.yearly_discount) / 100 else v_monthly end);
  monthly := round(v_monthly);
  tier_max := (v_tier->>'max')::int;
  student_limit := case when tier_max is null then null when p_kind = 'kurumsal' then tier_max * v_k else tier_max end;
  return next;
end $$;

-- Bir hesabın abonelik durumu: free (ücretsiz/muaf) | trial | paid | grace (salt okunur) | locked
create or replace function _billing_state(p uuid)
returns table (state text, plan text, ends_at timestamptz, lock_at timestamptz, tier_max int, org_id uuid, exempt boolean)
language plpgsql stable security definer set search_path = public as $$
declare
  a billing_accounts%rowtype;
  o billing_orgs%rowtype;
  v_grace int;
begin
  if not _billable(p) then
    state := 'free'; plan := 'free'; exempt := true; return next; return;
  end if;
  exempt := false;
  select * into a from billing_accounts where profile_id = p;
  if not found then -- henüz giriş yapmamış yeni koç: ilk girişte deneme başlar
    state := 'trial'; plan := 'trial'; return next; return;
  end if;
  select grace_days into v_grace from billing_settings where id = 1;
  if a.org_id is not null then
    select * into o from billing_orgs where id = a.org_id;
  end if;
  if o.id is not null then
    plan := o.plan; ends_at := o.ends_at; tier_max := o.student_limit; org_id := o.id;
  else
    plan := a.plan; ends_at := a.ends_at; tier_max := case when a.plan = 'paid' then a.tier_max end;
  end if;
  if ends_at is null then
    state := case when plan = 'free' then 'free' else plan end; -- süresiz
  elsif now() < ends_at then
    state := plan;
  else
    lock_at := ends_at + make_interval(days => coalesce(v_grace, 14));
    state := case when now() < lock_at then 'grace' else 'locked' end;
  end if;
  if lock_at is null and ends_at is not null then lock_at := ends_at + make_interval(days => coalesce(v_grace, 14)); end if;
  return next;
end $$;

-- Koç: kendi abonelik bilgisi (gerekirse deneme süresini başlatır)
create or replace function my_billing() returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_me uuid := auth.uid();
  v_trial int;
  st record;
  a billing_accounts%rowtype;
  o billing_orgs%rowtype;
  v_students int;
  v_coaches int;
  v_pending jsonb;
begin
  if v_me is null then return null; end if;
  if _billable(v_me) and not exists (select 1 from billing_accounts where profile_id = v_me)
     and exists (select 1 from profiles where id = v_me and coalesce(is_approved, false)) then
    select trial_days into v_trial from billing_settings where id = 1;
    insert into billing_accounts (profile_id, plan, ends_at, ref_code)
    values (v_me, 'trial', now() + make_interval(days => coalesce(v_trial, 14)), _billing_ref())
    on conflict (profile_id) do nothing;
  end if;
  select * into st from _billing_state(v_me);
  select * into a from billing_accounts where profile_id = v_me;
  if a.ref_code is null and a.profile_id is not null then
    update billing_accounts set ref_code = _billing_ref() where profile_id = v_me returning * into a;
  end if;
  if st.org_id is not null then
    select * into o from billing_orgs where id = st.org_id;
    select count(*) into v_coaches from billing_accounts where org_id = o.id;
    select count(*) into v_students from students s
      where s.status::text <> 'pasif' and s.coach_id in (select profile_id from billing_accounts where org_id = o.id);
  else
    select count(*) into v_students from students s where s.status::text <> 'pasif' and s.coach_id = v_me;
  end if;
  select to_jsonb(p) into v_pending from (
    select id, kind, period, amount, tier_max, coach_count, student_count, org_name, created_at
    from billing_payments where profile_id = v_me and status = 'bekliyor' order by created_at desc limit 1
  ) p;
  return jsonb_build_object(
    'state', st.state, 'plan', st.plan, 'exempt', st.exempt, 'ends_at', st.ends_at, 'lock_at', st.lock_at,
    'tier_max', st.tier_max, 'period', coalesce(o.period, a.period), 'students', v_students,
    'ref_code', coalesce(o.ref_code, a.ref_code),
    'org', case when o.id is null then null else jsonb_build_object(
      'id', o.id, 'name', o.name, 'is_owner', o.owner_id = v_me, 'coach_limit', o.coach_limit, 'coaches', v_coaches) end,
    'pending', v_pending
  );
end $$;

-- Koç: "Ödeme yaptım" (tutar sunucuda hesaplanır). Yöneticilere bildirim gider.
create or replace function billing_report_payment(
  p_kind text, p_tier_max int, p_period text, p_coach_count int default null, p_student_count int default null,
  p_org_name text default null, p_note text default null
) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_me uuid := auth.uid();
  pr record;
  a billing_accounts%rowtype;
  v_id uuid;
  v_name text;
  r record;
begin
  if v_me is null or not _billable(v_me) then raise exception 'Bu hesap için ödeme gerekmiyor'; end if;
  if p_kind not in ('bireysel', 'kurumsal') or p_period not in ('aylik', 'yillik') then raise exception 'Geçersiz paket'; end if;
  if p_kind = 'kurumsal' and (coalesce(p_coach_count, 0) < 2 or coalesce(p_student_count, 0) < 1) then
    raise exception 'Kurumsal paket için en az 2 koç ve öğrenci sayısı girin';
  end if;
  if p_kind = 'kurumsal' and nullif(trim(coalesce(p_org_name, '')), '') is null
     and not exists (select 1 from billing_accounts ba join billing_orgs bo on bo.id = ba.org_id where ba.profile_id = v_me) then
    raise exception 'Kurum adını yazın';
  end if;
  if exists (select 1 from billing_payments where profile_id = v_me and status = 'bekliyor') then
    raise exception 'Onay bekleyen bir ödeme bildiriminiz var';
  end if;
  perform my_billing(); -- hesap satırı ve ödeme kodu
  select * into a from billing_accounts where profile_id = v_me;
  select * into pr from billing_price(p_kind, p_tier_max, p_coach_count, p_student_count, p_period);
  insert into billing_payments (profile_id, org_id, kind, org_name, tier_max, coach_count, student_count, period, amount, ref_code, payer_note)
  values (v_me, a.org_id, p_kind, nullif(trim(coalesce(p_org_name, '')), ''),
          case when p_kind = 'kurumsal' then pr.student_limit else pr.tier_max end,
          case when p_kind = 'kurumsal' then p_coach_count end,
          case when p_kind = 'kurumsal' then p_student_count end,
          p_period, pr.amount,
          coalesce((select ref_code from billing_orgs where id = a.org_id), a.ref_code), nullif(trim(coalesce(p_note, '')), ''))
  returning id into v_id;
  select full_name into v_name from profiles where id = v_me;
  for r in select id from profiles where coalesce(is_admin, false) loop
    perform notify_user(r.id, 'odeme', 'Ödeme bildirimi 💳',
      coalesce(v_name, 'Bir koç') || ': ' || pr.amount || ' TL (' || case when p_kind = 'kurumsal' then 'kurumsal, ' else '' end
      || case when p_period = 'yillik' then 'yıllık' else 'aylık' end || ')', '/ayarlar/abonelikler', 0);
  end loop;
  return v_id;
end $$;

-- Koç: onay bekleyen bildirimini geri çeker
create or replace function billing_cancel_payment(p_id uuid) returns void
language sql security definer set search_path = public as $$
  delete from billing_payments where id = p_id and profile_id = auth.uid() and status = 'bekliyor';
$$;

-- ─── Yönetici ──────────────────────────────────────────────────
create or replace function _billing_admin_check() returns void language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_admin_user() then raise exception 'Yalnızca yönetici'; end if;
end $$;

-- Bütün ücretli hesaplar (koç/öğretmen) ve durumları
create or replace function billing_admin_list()
returns table (profile_id uuid, full_name text, email text, is_approved boolean, created_at timestamptz,
               state text, plan text, ends_at timestamptz, lock_at timestamptz, tier_max int, period text, note text,
               ref_code text, org_id uuid, org_name text, students int, has_account boolean)
language plpgsql stable security definer set search_path = public as $$
begin
  perform _billing_admin_check();
  return query
  select pr.id, pr.full_name, pr.email, coalesce(pr.is_approved, false), pr.created_at,
         st.state, st.plan, st.ends_at, st.lock_at, st.tier_max, coalesce(o.period, a.period), a.note,
         coalesce(o.ref_code, a.ref_code), o.id, o.name,
         (select count(*)::int from students s where s.coach_id = pr.id and s.status::text <> 'pasif'),
         a.profile_id is not null
  from profiles pr
  left join billing_accounts a on a.profile_id = pr.id
  left join billing_orgs o on o.id = a.org_id
  cross join lateral _billing_state(pr.id) st
  where _billable(pr.id)
  order by pr.full_name;
end $$;

create or replace function billing_admin_orgs()
returns table (id uuid, name text, owner_id uuid, owner_name text, plan text, ends_at timestamptz, period text,
               coach_limit int, student_limit int, ref_code text, note text, coaches int, students int)
language plpgsql stable security definer set search_path = public as $$
begin
  perform _billing_admin_check();
  return query
  select o.id, o.name, o.owner_id, p.full_name, o.plan, o.ends_at, o.period, o.coach_limit, o.student_limit, o.ref_code, o.note,
         (select count(*)::int from billing_accounts a where a.org_id = o.id),
         (select count(*)::int from students s where s.status::text <> 'pasif'
            and s.coach_id in (select a.profile_id from billing_accounts a where a.org_id = o.id))
  from billing_orgs o left join profiles p on p.id = o.owner_id
  order by o.name;
end $$;

-- Hesabın aboneliğini elle ayarla: ücretsiz (süresiz ya da bitiş tarihli), deneme, ücretli; bitiş tarihi; paket
create or replace function billing_admin_set(p_profile uuid, p_plan text, p_ends_at timestamptz, p_tier_max int default null,
                                             p_period text default null, p_note text default null)
returns void language plpgsql security definer set search_path = public as $$
begin
  perform _billing_admin_check();
  if p_plan not in ('free', 'trial', 'paid') then raise exception 'Geçersiz plan'; end if;
  if p_plan <> 'free' and p_ends_at is null then raise exception 'Deneme ve ücretli plan için bitiş tarihi gerekli'; end if;
  insert into billing_accounts (profile_id, plan, ends_at, tier_max, period, note, ref_code)
  values (p_profile, p_plan, p_ends_at, p_tier_max, p_period, nullif(trim(coalesce(p_note, '')), ''), _billing_ref())
  on conflict (profile_id) do update set plan = excluded.plan, ends_at = excluded.ends_at, tier_max = excluded.tier_max,
    period = excluded.period, note = excluded.note, updated_at = now();
end $$;

-- Hesabı kuruma ekle / kurumdan çıkar (p_org null)
create or replace function billing_admin_set_org(p_profile uuid, p_org uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  perform _billing_admin_check();
  insert into billing_accounts (profile_id, plan, ends_at, org_id, ref_code, note)
  values (p_profile, 'free', null, p_org, _billing_ref(), null)
  on conflict (profile_id) do update set org_id = excluded.org_id, updated_at = now();
end $$;

-- Kurum ekle/güncelle
create or replace function billing_admin_upsert_org(p_id uuid, p_name text, p_owner uuid, p_plan text, p_ends_at timestamptz,
                                                    p_period text, p_coach_limit int, p_student_limit int, p_note text)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_id uuid;
begin
  perform _billing_admin_check();
  if p_plan not in ('free', 'trial', 'paid') then raise exception 'Geçersiz plan'; end if;
  if p_id is null then
    insert into billing_orgs (name, owner_id, plan, ends_at, period, coach_limit, student_limit, note, ref_code)
    values (trim(p_name), p_owner, p_plan, p_ends_at, p_period, p_coach_limit, p_student_limit, p_note, _billing_ref())
    returning id into v_id;
  else
    update billing_orgs set name = trim(p_name), owner_id = p_owner, plan = p_plan, ends_at = p_ends_at, period = p_period,
      coach_limit = p_coach_limit, student_limit = p_student_limit, note = p_note
    where id = p_id returning id into v_id;
  end if;
  if p_owner is not null then perform billing_admin_set_org(p_owner, v_id); end if;
  return v_id;
end $$;

create or replace function billing_admin_delete_org(p_id uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  perform _billing_admin_check();
  delete from billing_orgs where id = p_id; -- üyelerin org_id'si boşalır, kendi hesap durumlarına dönerler
end $$;

-- Ödeme bildirimini onayla / reddet. Onay: süre şimdiden ya da (hâlâ geçerliyse) mevcut bitişten 1 ay / 1 yıl uzar.
create or replace function billing_admin_decide(p_id uuid, p_approve boolean, p_note text default null) returns void
language plpgsql security definer set search_path = public as $$
declare
  p billing_payments%rowtype;
  a billing_accounts%rowtype;
  o billing_orgs%rowtype;
  v_len interval;
  v_org uuid;
begin
  perform _billing_admin_check();
  select * into p from billing_payments where id = p_id for update;
  if not found or p.status <> 'bekliyor' then raise exception 'Bildirim bulunamadı ya da zaten sonuçlandı'; end if;
  update billing_payments set status = case when p_approve then 'onaylandi' else 'reddedildi' end,
    admin_note = nullif(trim(coalesce(p_note, '')), ''), decided_at = now(), decided_by = auth.uid()
  where id = p_id;
  if not p_approve then
    perform notify_user(p.profile_id, 'odeme', 'Ödeme bildiriminiz onaylanmadı',
      coalesce(nullif(trim(coalesce(p_note, '')), ''), 'Ayrıntı için yöneticiyle iletişime geçin.'), '/abonelik', 0);
    return;
  end if;
  v_len := case when p.period = 'yillik' then interval '1 year' else interval '1 month' end;
  perform my_billing_for(p.profile_id);
  select * into a from billing_accounts where profile_id = p.profile_id;
  if p.kind = 'kurumsal' then
    v_org := a.org_id;
    if v_org is null then
      insert into billing_orgs (name, owner_id, plan, ends_at, period, coach_limit, student_limit, ref_code)
      values (coalesce(p.org_name, 'Kurum'), p.profile_id, 'paid', now() + v_len, p.period, p.coach_count, p.tier_max, a.ref_code)
      returning id into v_org;
      update billing_accounts set org_id = v_org, updated_at = now() where profile_id = p.profile_id;
    else
      select * into o from billing_orgs where id = v_org;
      update billing_orgs set plan = 'paid', period = p.period,
        ends_at = case when o.plan = 'paid' and o.ends_at > now() then o.ends_at else now() end + v_len,
        coach_limit = coalesce(p.coach_count, coach_limit), student_limit = p.tier_max
      where id = v_org;
    end if;
    update billing_payments set org_id = v_org where id = p_id;
  else
    update billing_accounts set plan = 'paid', period = p.period, tier_max = p.tier_max, org_id = null,
      ends_at = case when a.plan = 'paid' and a.ends_at > now() then a.ends_at else now() end + v_len,
      updated_at = now()
    where profile_id = p.profile_id;
  end if;
  perform notify_user(p.profile_id, 'odeme', 'Ödemeniz onaylandı ✅',
    'Aboneliğiniz ' || case when p.period = 'yillik' then '1 yıl' else '1 ay' end || ' uzatıldı. Teşekkürler!', '/abonelik', 0);
end $$;

-- Onay sırasında ödeme yapanın hesap satırı yoksa oluşturur (deneme olarak)
create or replace function my_billing_for(p uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  insert into billing_accounts (profile_id, plan, ends_at, ref_code)
  values (p, 'trial', now(), _billing_ref()) on conflict (profile_id) do nothing;
end $$;
revoke all on function my_billing_for(uuid) from public, anon, authenticated;

create or replace function billing_admin_settings(p jsonb) returns void
language plpgsql security definer set search_path = public as $$
begin
  perform _billing_admin_check();
  update billing_settings set
    tiers = coalesce(p->'tiers', tiers),
    yearly_discount = coalesce((p->>'yearly_discount')::int, yearly_discount),
    org_discounts = coalesce(p->'org_discounts', org_discounts),
    trial_days = coalesce((p->>'trial_days')::int, trial_days),
    grace_days = coalesce((p->>'grace_days')::int, grace_days),
    bank_name = case when p ? 'bank_name' then nullif(trim(p->>'bank_name'), '') else bank_name end,
    account_name = case when p ? 'account_name' then nullif(trim(p->>'account_name'), '') else account_name end,
    iban = case when p ? 'iban' then nullif(upper(replace(p->>'iban', ' ', '')), '') else iban end,
    updated_at = now()
  where id = 1;
end $$;

create or replace function billing_admin_payments(p_status text default null)
returns table (id uuid, profile_id uuid, full_name text, kind text, org_name text, tier_max int, coach_count int, student_count int,
               period text, amount numeric, ref_code text, payer_note text, status text, admin_note text, created_at timestamptz, decided_at timestamptz)
language plpgsql stable security definer set search_path = public as $$
begin
  perform _billing_admin_check();
  return query
  select b.id, b.profile_id, pr.full_name, b.kind, coalesce(o.name, b.org_name), b.tier_max, b.coach_count, b.student_count,
         b.period, b.amount, b.ref_code, b.payer_note, b.status, b.admin_note, b.created_at, b.decided_at
  from billing_payments b join profiles pr on pr.id = b.profile_id left join billing_orgs o on o.id = b.org_id
  where p_status is null or b.status = p_status
  order by (b.status = 'bekliyor') desc, b.created_at desc
  limit 200;
end $$;

-- ─── Salt okunur kilit: süresi dolan koç yeni kayıt giremez, değiştiremez, silemez ───────────
-- (Öğrenciler, veliler, kurum personeli etkilenmez: kontrol işlemi yapan kişinin hesabına bakar.)
create or replace function _billing_guard() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_state text;
begin
  if auth.uid() is null then return coalesce(new, old); end if; -- zamanlanmış işler, sistem
  select state into v_state from _billing_state(auth.uid());
  if v_state in ('grace', 'locked') then
    raise exception 'Abonelik süreniz doldu: hesabınız salt okunur. Abonelik sayfasından ödeme yapınca yeniden açılır.'
      using errcode = 'P0001';
  end if;
  return coalesce(new, old);
end $$;

-- Paketin öğrenci sınırı: koç yeni öğrenci eklerken
create or replace function _billing_student_limit() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  st record;
  v_count int;
begin
  if auth.uid() is null or new.coach_id is distinct from auth.uid() or new.status::text = 'pasif' then return new; end if;
  select * into st from _billing_state(auth.uid());
  if st.tier_max is null or st.state not in ('paid') then return new; end if;
  if st.org_id is not null then
    select count(*) into v_count from students s where s.status::text <> 'pasif'
      and s.coach_id in (select profile_id from billing_accounts where org_id = st.org_id);
  else
    select count(*) into v_count from students s where s.status::text <> 'pasif' and s.coach_id = auth.uid();
  end if;
  if v_count >= st.tier_max then
    raise exception 'Paketinizin öğrenci sınırı (%) doldu. Abonelik sayfasından paketinizi büyütebilirsiniz.', st.tier_max
      using errcode = 'P0001';
  end if;
  return new;
end $$;

do $$
declare t text;
begin
  foreach t in array array[
    'students', 'meetings', 'exams', 'exam_analyses', 'question_logs', 'daily_logs', 'topic_progress',
    'weekly_plan_requests', 'student_programs', 'student_reports', 'appointments', 'feed_posts', 'feed_post_students',
    'surveys', 'survey_questions', 'survey_options', 'student_teachers', 'parent_report_links'
  ] loop
    if to_regclass('public.' || t) is not null then
      execute format('drop trigger if exists trg_billing_guard on public.%I', t);
      execute format('create trigger trg_billing_guard before insert or update or delete on public.%I for each row execute function _billing_guard()', t);
    end if;
  end loop;
end $$;
drop trigger if exists trg_billing_student_limit on students;
create trigger trg_billing_student_limit before insert on students for each row execute function _billing_student_limit();

-- ─── Hatırlatmalar (her gün 09:00 İstanbul = 06:00 UTC) ─────────
create or replace function billing_reminders() returns int
language plpgsql security definer set search_path = public as $$
declare
  r record;
  n int := 0;
  v_today date := (now() at time zone 'Europe/Istanbul')::date;
begin
  for r in
    select a.profile_id, st.state, st.ends_at, st.lock_at
    from billing_accounts a cross join lateral _billing_state(a.profile_id) st
    where st.ends_at is not null and not st.exempt
  loop
    if (r.ends_at at time zone 'Europe/Istanbul')::date - v_today in (7, 1) and r.state in ('trial', 'paid', 'free') then
      perform notify_user(r.profile_id, 'odeme',
        case when r.state = 'trial' then 'Deneme süreniz bitiyor' else 'Aboneliğiniz bitiyor' end,
        ((r.ends_at at time zone 'Europe/Istanbul')::date - v_today) || ' gün kaldı. Kesintisiz devam etmek için Abonelik sayfasından ödeme yapabilirsiniz.',
        '/abonelik', 0);
      n := n + 1;
    elsif r.state = 'grace' and ((r.ends_at at time zone 'Europe/Istanbul')::date = v_today - 1
                                 or (r.lock_at at time zone 'Europe/Istanbul')::date - v_today = 1) then
      perform notify_user(r.profile_id, 'odeme', 'Hesabınız salt okunur',
        'Süreniz doldu. ' || to_char(r.lock_at at time zone 'Europe/Istanbul', 'DD.MM.YYYY')
        || ' tarihine kadar verilerinizi görebilir ve indirebilirsiniz; sonra hesap kapanır. Ödeme yapınca hemen açılır.',
        '/abonelik', 0);
      n := n + 1;
    end if;
  end loop;
  return n;
end $$;
revoke all on function billing_reminders() from public, anon, authenticated;

do $$ begin
  perform cron.unschedule(jobid) from cron.job where jobname = 'abonelik-hatirlatma';
end $$;
select cron.schedule('abonelik-hatirlatma', '0 6 * * *', $cron$select public.billing_reminders()$cron$);

-- ─── Mevcut kullanıcılar: ücretsiz, süresiz ─────────────────────
insert into billing_accounts (profile_id, plan, ends_at, note, ref_code)
select pr.id, 'free', null, 'Mevcut kullanıcı (ücretsiz, süresiz)', _billing_ref()
from profiles pr where pr.role in ('koc', 'ogretmen')
on conflict (profile_id) do nothing;

-- ─── Yetkiler ──────────────────────────────────────────────────
revoke all on function _billable(uuid) from public, anon, authenticated;
revoke all on function _billing_state(uuid) from public, anon, authenticated;
revoke all on function _billing_ref() from public, anon, authenticated;
revoke all on function _billing_admin_check() from public, anon, authenticated;
do $$
declare f text;
begin
  foreach f in array array[
    'my_billing()', 'billing_price(text, int, int, int, text)',
    'billing_report_payment(text, int, text, int, int, text, text)', 'billing_cancel_payment(uuid)',
    'billing_admin_list()', 'billing_admin_orgs()', 'billing_admin_set(uuid, text, timestamptz, int, text, text)',
    'billing_admin_set_org(uuid, uuid)', 'billing_admin_upsert_org(uuid, text, uuid, text, timestamptz, text, int, int, text)',
    'billing_admin_delete_org(uuid)', 'billing_admin_decide(uuid, boolean, text)', 'billing_admin_settings(jsonb)',
    'billing_admin_payments(text)'
  ] loop
    execute format('revoke all on function %s from public, anon', f);
    execute format('grant execute on function %s to authenticated', f);
  end loop;
end $$;

notify pgrst, 'reload schema';
