-- ============================================================
-- Online görüşme: koçun varsayılan görüşme bağlantısı
-- ============================================================
-- Koç/öğretmen Ajanda'da randevu eklerken "Online" seçer; bağlantı (Google Meet, Zoom, Teams, Jitsi…) randevunun
-- "Yer / bağlantı" alanına yazılır ve öğrencinin programındaki görüşme görevine taşınır; öğrenci "Görüşmeye katıl" der.
-- Burada yalnızca her kullanıcının kendi varsayılan bağlantısı saklanır (her randevuda yeniden yapıştırmasın).
-- Kullanıcı kendi profil satırını zaten güncelleyebildiği için ek fonksiyon gerekmez.
-- Supabase SQL Editor'da BİR KEZ çalıştırın; tekrar çalıştırmak zararsızdır.

alter table profiles add column if not exists meeting_url text;
do $$ begin
  alter table profiles add constraint profiles_meeting_url_https
    check (meeting_url is null or (meeting_url ~ '^https://[^[:space:]]+$' and length(meeting_url) <= 300));
exception when duplicate_object then null;
end $$;

notify pgrst, 'reload schema';
