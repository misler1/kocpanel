-- TYT karnesi okuma hatası düzeltmesi (tek seferlik): "MATEMATİK 30 / GEOMETRİ 10 / TYT-MATEMATİK 40" satırlı karnelerde
-- matematik yerine TYT-MATEMATİK toplamı alınmış, geometri de ayrıca eklenmişti (geometri iki kez sayıldı).
-- Okuyucu düzeltildi (src/lib/importers/pdfTemplates/tytTekKarne.ts); bu dosya daha önce yüklenmiş kayıtları düzeltir.
--
-- Hangi kayıtlar düzeltilir (yalnızca kesin olanlar):
--  • Konu analizi (soru soru sonuçlar) varsa: kayıttaki matematik doğru/yanlış = konu analizindeki matematik+geometri
--    sorularının toplamı ise (doğru kayıtta yalnızca matematik sorularına eşittir).
--  • Konu analizi yoksa: matematik doğru+yanlış 30'u aşıyorsa (30 soruluk matematikte imkânsız).
-- Düzeltme: matematik = matematik − geometri; toplam net geometri neti kadar düşer; matematik ortalaması da düzeltilir.
-- Sonuçta düzeltilen kayıtlar listelenir (öğrenci, deneme, eski/yeni matematik, yeni net). Tekrar çalıştırmak zararsızdır
-- (düzeltilmiş kayıt koşulu artık sağlamaz). Boş doğru/yanlış alanları 0 sayılır.

with cand as (
  select e.id,
    coalesce(nullif(trim(e.subject_results->'matematik'->>'dogru'), '')::numeric, 0)::int as md,
    coalesce(nullif(trim(e.subject_results->'matematik'->>'yanlis'), '')::numeric, 0)::int as my,
    coalesce(nullif(trim(e.subject_results->'geometri'->>'dogru'), '')::numeric, 0)::int as gd,
    coalesce(nullif(trim(e.subject_results->'geometri'->>'yanlis'), '')::numeric, 0)::int as gy,
    q.qn, q.qd, q.qy
  from exams e
  cross join lateral (
    select count(*) as qn,
           count(*) filter (where x->>'r' = 'D') as qd,
           count(*) filter (where x->>'r' = 'Y') as qy
    from jsonb_array_elements(case when jsonb_typeof(e.question_results) = 'array' then e.question_results else '[]'::jsonb end) x
    where x->>'s' in ('matematik', 'geometri')
      and coalesce(x->>'ks', '') <> 'true'   -- kazanım özeti satırları soru sayılmaz
  ) q
  where e.exam_type = 'TYT' and e.subject_results ? 'matematik' and e.subject_results ? 'geometri'
),
wrong as (
  select * from cand
  where (gd + gy) > 0 and md >= gd and my >= gy
    and (
      (qn > 0 and md = qd and my = qy)          -- matematik, matematik+geometri toplamına eşit: hatalı
      or (qn = 0 and md + my > 30)              -- konu analizi yok: 30 soruyu aşan matematik
    )
)
update exams e set
  subject_results = jsonb_set(e.subject_results, '{matematik}',
    jsonb_build_object('dogru', (w.md - w.gd)::text, 'yanlis', (w.my - w.gy)::text)),
  net_score = round((e.net_score - (w.gd - w.gy / 4.0))::numeric, 2),
  subject_averages = case
    when nullif(trim(e.subject_averages->>'matematik'), '') is not null and nullif(trim(e.subject_averages->>'geometri'), '') is not null
      then jsonb_set(e.subject_averages, '{matematik}',
        to_jsonb(round((e.subject_averages->>'matematik')::numeric - (e.subject_averages->>'geometri')::numeric, 2)))
    else e.subject_averages end
from wrong w
where e.id = w.id
returning
  (select s.full_name from students s where s.id = e.student_id) as ogrenci,
  e.exam_name as deneme,
  e.exam_date as tarih,
  w.md || ' D / ' || w.my || ' Y' as eski_matematik,
  (w.md - w.gd) || ' D / ' || (w.my - w.gy) || ' Y' as yeni_matematik,
  e.net_score as yeni_toplam_net;
