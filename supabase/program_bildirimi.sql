-- ============================================================
-- Öğrenciye "Yeni haftalık programın hazır" bildirimi
-- ============================================================
-- Önceden: koç programa görev ekleyince (tek tek ya da Haftalık Takip > Toplu işlemler ile) öğrenciye
-- "Programına yeni görev eklendi" bildirimi gidiyordu; ama 60 dakika içindeki okunmamış aynı bildirimle
-- BİRLEŞTİRİLDİĞİ için telefona yeni bildirim düşmüyordu (telefon bildirimi yalnızca yeni satırda gider).
-- Toplu işlemle başka bir haftaya program kopyalanınca da öğrenci önceki bildirimin güncellendiğini fark etmiyordu.
-- Şimdi:
--   * Her program haftası için ayrı bildirim (bağlantı haftaya özel) → yeni hafta = yeni telefon bildirimi.
--   * O haftada daha önce görev yoksa (yeni program / toplu kopyalama): "Yeni haftalık programın hazır 🗓️ (tarih aralığı)".
--     Varsa: "Programın güncellendi 📋". Aynı işlemde eklenen onlarca görev tek bildirimde toplanır.
-- notifications.sql'den SONRA çalıştırın. Tekrar çalıştırmak zararsızdır.

create or replace function trg_notify_new_task()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_profile uuid;
  v_end date := coalesce(new.week_end, new.week_start + 6);
  v_new boolean;
begin
  if coalesce(new.student_added, false) then return new; end if; -- öğrencinin kendi eklediği görev
  if new.appointment_id is not null then return new; end if;     -- Ajanda randevusu (ayrı bildirimi var)
  select profile_id into v_profile from students where id = new.student_id;
  if v_profile is null or v_profile = auth.uid() then return new; end if;

  -- Bu haftada bu işlemden önce eklenmiş görev var mı? (aynı işlemde eklenenlerin created_at'i now())
  v_new := not exists (
    select 1 from question_logs q
     where q.student_id = new.student_id and q.week_start = new.week_start
       and q.created_at < now() and not coalesce(q.student_added, false));

  perform notify_user(v_profile, 'gorev',
    case when v_new then 'Yeni haftalık programın hazır 🗓️' else 'Programın güncellendi 📋' end,
    case when v_new
      then to_char(new.week_start, 'DD.MM') || ' – ' || to_char(v_end, 'DD.MM') || ' programın hazırlandı. Göz at!'
      else to_char(new.week_start, 'DD.MM') || ' – ' || to_char(v_end, 'DD.MM') || ' programına koçun yeni görev ekledi.' end,
    '/ogrenci/haftalik-takip?hafta=' || new.week_start, 60);
  return new;
end $$;

drop trigger if exists trg_notify_new_task on question_logs;
create trigger trg_notify_new_task after insert on question_logs
  for each row execute function trg_notify_new_task();

notify pgrst, 'reload schema';

-- ------------------------------------------------------------
-- (İsteğe bağlı) Kontrol: son 2 günde öğrencilere giden program bildirimleri.
-- Öğrenci adını değiştirip ayrıca çalıştırabilirsiniz:
-- select s.full_name, n.title, n.body, n.created_at, n.read_at
--   from notifications n join students s on s.profile_id = n.recipient_id
--  where n.kind = 'gorev' and n.created_at > now() - interval '2 days'
--  order by n.created_at desc;
