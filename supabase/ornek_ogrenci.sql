-- ============================================================
-- Örnek öğrenci
-- ============================================================
-- Koç, sistemi tanımak için tek tıkla örnek bir öğrenci ekler: görüşmeler, TYT denemeleri, bu hafta ve
-- geçen hafta için program, günlükler ve konu ilerleyişi dolu gelir. Listede "Örnek" etiketiyle görünür,
-- tek tıkla silinir (bağlı tüm kayıtları da silinir). Örnek öğrencinin giriş hesabı yoktur; bu yüzden
-- günlük hatırlatma / eksik günlük bildirimleri ona gitmez.
-- Fonksiyonlar çağıranın yetkisiyle çalışır (koç kendi öğrencisini ekler). Tekrar çalıştırmak zararsızdır.

alter table students add column if not exists is_sample boolean not null default false;

create or replace function create_sample_student()
returns uuid language plpgsql security invoker set search_path = public as $$
declare
  v_me uuid := auth.uid();
  v_id uuid;
  v_today date := (now() at time zone 'Europe/Istanbul')::date;
  v_mon date;
  v_ws date;
  v_day date;
  i int;
  d int;
  sr jsonb;
  v_net numeric;
  v_exams jsonb[] := array[
    '{"turkce":{"dogru":"24","yanlis":"9"},"tarih":{"dogru":"3","yanlis":"1"},"cografya":{"dogru":"2","yanlis":"2"},"felsefe":{"dogru":"3","yanlis":"1"},"din":{"dogru":"4","yanlis":"1"},"matematik":{"dogru":"14","yanlis":"7"},"geometri":{"dogru":"3","yanlis":"3"},"fizik":{"dogru":"2","yanlis":"2"},"kimya":{"dogru":"3","yanlis":"2"},"biyoloji":{"dogru":"2","yanlis":"1"}}',
    '{"turkce":{"dogru":"26","yanlis":"8"},"tarih":{"dogru":"3","yanlis":"1"},"cografya":{"dogru":"3","yanlis":"1"},"felsefe":{"dogru":"4","yanlis":"1"},"din":{"dogru":"4","yanlis":"0"},"matematik":{"dogru":"16","yanlis":"6"},"geometri":{"dogru":"4","yanlis":"2"},"fizik":{"dogru":"3","yanlis":"2"},"kimya":{"dogru":"3","yanlis":"1"},"biyoloji":{"dogru":"3","yanlis":"1"}}',
    '{"turkce":{"dogru":"27","yanlis":"7"},"tarih":{"dogru":"4","yanlis":"1"},"cografya":{"dogru":"3","yanlis":"1"},"felsefe":{"dogru":"4","yanlis":"0"},"din":{"dogru":"4","yanlis":"1"},"matematik":{"dogru":"19","yanlis":"5"},"geometri":{"dogru":"4","yanlis":"2"},"fizik":{"dogru":"3","yanlis":"1"},"kimya":{"dogru":"4","yanlis":"1"},"biyoloji":{"dogru":"3","yanlis":"1"}}',
    '{"turkce":{"dogru":"29","yanlis":"6"},"tarih":{"dogru":"4","yanlis":"0"},"cografya":{"dogru":"4","yanlis":"1"},"felsefe":{"dogru":"4","yanlis":"1"},"din":{"dogru":"5","yanlis":"0"},"matematik":{"dogru":"21","yanlis":"4"},"geometri":{"dogru":"5","yanlis":"2"},"fizik":{"dogru":"4","yanlis":"1"},"kimya":{"dogru":"4","yanlis":"1"},"biyoloji":{"dogru":"4","yanlis":"1"}}'
  ];
  -- Haftalık program: gün başına iki görev (ders, konu, kaynak, soru)
  v_tasks text[][] := array[
    array['TYT Matematik', 'Problemler', 'TYT Matematik soru bankası', '40'],
    array['TYT Türkçe', 'Paragraf', 'TYT Türkçe paragraf kitabı', '30'],
    array['TYT Geometri', 'Üçgenler', 'TYT Geometri soru bankası', '25'],
    array['TYT Fizik', 'Hareket ve Kuvvet', 'TYT Fizik soru bankası', '20'],
    array['TYT Matematik', 'Fonksiyonlar', 'TYT Matematik soru bankası', '40'],
    array['TYT Kimya', 'Mol Kavramı', 'TYT Kimya soru bankası', '20'],
    array['TYT Biyoloji', 'Hücre', 'TYT Biyoloji soru bankası', '20']
  ];
begin
  if v_me is null then raise exception 'Giriş gerekli'; end if;
  select id into v_id from students where coach_id = v_me and is_sample limit 1;
  if v_id is not null then return v_id; end if;

  insert into students (coach_id, full_name, track, status, grade_level, sinif_sube, is_sample, notes,
    target_university, target_department, week_start_day, resources, target_nets)
  values (v_me, 'Örnek Öğrenci', 'YKS_SAY', 'aktif', '12. sınıf', '12-A', true,
    'Bu öğrenci sistemi tanımanız için eklendi; işiniz bitince Öğrenciler sayfasından silebilirsiniz.',
    'Örnek Üniversitesi', 'Bilgisayar Mühendisliği', 0,
    jsonb_build_object(
      'TYT Matematik', jsonb_build_array('TYT Matematik konu anlatımı', 'TYT Matematik soru bankası', 'TYT Matematik deneme seti'),
      'TYT Türkçe', jsonb_build_array('TYT Türkçe paragraf kitabı', 'TYT Türkçe soru bankası', ''),
      'TYT Geometri', jsonb_build_array('TYT Geometri soru bankası', '', ''),
      'TYT Fizik', jsonb_build_array('TYT Fizik soru bankası', '', ''),
      'TYT Kimya', jsonb_build_array('TYT Kimya soru bankası', '', ''),
      'TYT Biyoloji', jsonb_build_array('TYT Biyoloji soru bankası', '', '')),
    '{}'::jsonb)
  returning id into v_id;

  -- Görüşmeler: son üç haftada üç görüşme, gelecek hafta bir planlanmış görüşme
  insert into meetings (student_id, coach_id, meeting_type, scheduled_at, duration_minutes, topic, notes, completed, created_by) values
    (v_id, v_me, 'ogrenci', (v_today - 20 + time '17:00') at time zone 'Europe/Istanbul', 40, 'Tanışma ve hedef belirleme',
     'Hedef bölüm konuşuldu. Günlük çalışma düzeni ve haftalık program anlatıldı. Matematikte problemler eksik.', true, v_me),
    (v_id, v_me, 'ogrenci', (v_today - 13 + time '17:00') at time zone 'Europe/Istanbul', 30, 'Haftalık takip',
     'Programın büyük kısmı yapılmış. Paragraf sorularında süre sorunu var; günlük 30 paragraf eklendi.', true, v_me),
    (v_id, v_me, 'ogrenci', (v_today - 6 + time '17:00') at time zone 'Europe/Istanbul', 30, 'Deneme değerlendirmesi',
     'Son denemede net arttı. Geometri ve fen derslerine ağırlık verilecek.', true, v_me),
    (v_id, v_me, 'ogrenci', (v_today + 1 + time '17:00') at time zone 'Europe/Istanbul', 30, 'Haftalık takip', null, false, v_me);

  -- Denemeler: son altı haftada artan netlerle dört TYT denemesi
  for i in 1..4 loop
    sr := v_exams[i];
    select coalesce(sum((v->>'dogru')::numeric - (v->>'yanlis')::numeric / 4), 0) into v_net from jsonb_each(sr) as e(k, v);
    insert into exams (student_id, exam_name, exam_date, net_score, max_score, exam_type, subject_results)
    values (v_id, format('TYT Genel Deneme %s', i), v_today - (42 - i * 10), v_net, 120, 'TYT', sr);
  end loop;

  -- Program: geçen hafta ve bu hafta (Pazartesi başlangıçlı), gün başına iki görev
  v_mon := v_today - (extract(isodow from v_today)::int - 1);
  foreach v_ws in array array[v_mon - 7, v_mon] loop
    for d in 0..6 loop
      v_day := v_ws + d;
      for i in 0..1 loop
        insert into question_logs (student_id, coach_id, subject, topic, resource_name, week_start, week_end, plan_day,
          target_count, done_count, start_time, end_time, student_done, student_done_at)
        values (v_id, v_me, v_tasks[((d + i * 3) % 7) + 1][1], v_tasks[((d + i * 3) % 7) + 1][2], v_tasks[((d + i * 3) % 7) + 1][3],
          v_ws, v_ws + 6, d, v_tasks[((d + i * 3) % 7) + 1][4]::int,
          case when v_day < v_today and not (d = 3 and i = 1) then v_tasks[((d + i * 3) % 7) + 1][4]::int else 0 end,
          case when i = 0 then time '16:00' else time '19:00' end, case when i = 0 then time '17:30' else time '20:30' end,
          v_day < v_today and not (d = 3 and i = 1),
          case when v_day < v_today and not (d = 3 and i = 1) then (v_day + time '21:00') at time zone 'Europe/Istanbul' end);
      end loop;
    end loop;
  end loop;

  -- Günlükler: son altı gün
  for d in 1..6 loop
    insert into daily_logs (student_id, coach_id, log_date, topic_studies, question_solved)
    values (v_id, v_me, v_today - d,
      jsonb_build_array(jsonb_build_object('subject', 'TYT Matematik', 'topic', 'Problemler', 'resource', 'TYT Matematik konu anlatımı', 'duration_minutes', 45 + d * 5)),
      jsonb_build_array(
        jsonb_build_object('subject', 'TYT Matematik', 'topic', 'Problemler', 'resource', 'TYT Matematik soru bankası', 'count', 40, 'correct', 30 + d, 'wrong', 10 - d),
        jsonb_build_object('subject', 'TYT Türkçe', 'topic', 'Paragraf', 'resource', 'TYT Türkçe paragraf kitabı', 'count', 30, 'correct', 24, 'wrong', 6)));
  end loop;

  -- Konu ilerleyişi
  insert into topic_progress (student_id, subject, topic, status, konu_tamamlandi, kaynak1_sorular, kaynak2_sorular, kaynak3_sorular, yanlislar_kontrol)
  select v_id, x.subject, x.topic, case when x.k and x.y then 'tamamlandi' when x.k then 'devam' else 'baslanmadi' end, x.k, x.s1, x.s2, false, x.y
    from (values
      ('TYT Matematik', 'Temel Kavramlar', true, true, true, true),
      ('TYT Matematik', 'Sayı Basamakları', true, true, true, true),
      ('TYT Matematik', 'Bölme ve Bölünebilme', true, true, false, true),
      ('TYT Matematik', 'Rasyonel Sayılar', true, true, false, false),
      ('TYT Matematik', 'Problemler', true, false, false, false),
      ('TYT Matematik', 'Fonksiyonlar', false, false, false, false),
      ('TYT Türkçe', 'Sözcükte Anlam', true, true, true, true),
      ('TYT Türkçe', 'Cümlede Anlam', true, true, false, true),
      ('TYT Türkçe', 'Paragraf', true, false, false, false),
      ('TYT Geometri', 'Üçgenler', true, true, false, false),
      ('TYT Geometri', 'Çokgenler', false, false, false, false),
      ('TYT Fizik', 'Hareket ve Kuvvet', true, false, false, false)
    ) as x(subject, topic, k, s1, s2, y);

  return v_id;
end $$;

create or replace function delete_sample_student()
returns void language plpgsql security invoker set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'Giriş gerekli'; end if;
  delete from students where coach_id = auth.uid() and is_sample;
end $$;

revoke all on function create_sample_student() from public, anon;
grant execute on function create_sample_student() to authenticated;
revoke all on function delete_sample_student() from public, anon;
grant execute on function delete_sample_student() to authenticated;

notify pgrst, 'reload schema';
