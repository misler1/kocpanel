-- ============================================================
-- Deneme netlerini yeniden hesaplar (eksi net düzeltmesi)
-- ============================================================
-- Eskiden ders netleri 0'da kırpılıyordu (Math.max(0, ...)). Doğru kural:
--   YKS (TYT/AYT): net = doğru - yanlış / 4
--   LGS          : net = doğru - yanlış / 3
-- Yanlışlar fazlaysa ders neti eksiye düşer ve toplam neti de düşürür.
-- Bu betik, en az bir dersi eksi nete düşen denemelerin net_score'unu düzeltir.
-- Supabase SQL Editor'de bir kez çalıştırmak yeterlidir; tekrar çalıştırmak zararsızdır.

with subject_keys(exam_type, key) as (
  values
    ('TYT','turkce'),('TYT','tarih'),('TYT','cografya'),('TYT','felsefe'),('TYT','din'),
    ('TYT','matematik'),('TYT','geometri'),('TYT','fizik'),('TYT','kimya'),('TYT','biyoloji'),
    ('AYT','edebiyat'),('AYT','tarih1'),('AYT','cografya1'),('AYT','tarih2'),('AYT','cografya2'),
    ('AYT','felsefe_grubu'),('AYT','din'),('AYT','matematik'),('AYT','geometri'),
    ('AYT','fizik'),('AYT','kimya'),('AYT','biyoloji'),
    ('LGS','turkce'),('LGS','inkilap'),('LGS','din'),('LGS','ingilizce'),('LGS','matematik'),('LGS','fen')
),
subject_nets as (
  select
    e.id,
    case when (e.subject_results::jsonb -> k.key ->> 'dogru') ~ '^[0-9]+(\.[0-9]+)?$'
         then (e.subject_results::jsonb -> k.key ->> 'dogru')::numeric else 0 end
    - case when (e.subject_results::jsonb -> k.key ->> 'yanlis') ~ '^[0-9]+(\.[0-9]+)?$'
           then (e.subject_results::jsonb -> k.key ->> 'yanlis')::numeric else 0 end
      * case when e.exam_type = 'LGS' then 1.0 / 3 else 0.25 end
      as net
  from exams e
  join subject_keys k on k.exam_type = coalesce(e.exam_type, 'TYT')
  where e.subject_results is not null
    and e.subject_results::jsonb ? k.key
),
totals as (
  select id, round(sum(net), 2) as total, bool_or(net < 0) as has_negative
  from subject_nets
  group by id
)
update exams e
set net_score = t.total
from totals t
where e.id = t.id
  and t.has_negative
  and e.net_score is distinct from t.total;
