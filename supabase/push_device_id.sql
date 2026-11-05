-- ============================================================
-- Telefon bildirimi: cihaz kimliği
-- ============================================================
-- Sorun: aynı telefon zamanla yeni bildirim adresi (endpoint) alabilir (uygulama ana ekrandan silinip yeniden
-- eklenince, Safari ile ana ekran uygulaması ayrı kullanılınca, izin kapatılıp açılınca). Eski adres önceki
-- hesaba bağlı kalır; çıkış yapılsa bile o hesabın bildirimleri telefona gelmeye devam eder.
-- Çözüm: tarayıcı kalıcı bir cihaz kimliği üretip abonelikle birlikte gönderir. Aynı cihazdan yeni adres gelince
-- eski adresler silinir; çıkışta cihazın bütün kayıtları silinir (src/app/api/push/subscription/route.ts).
-- Supabase SQL Editor'da BİR KEZ çalıştırın. Tekrar çalıştırmak zararsızdır. Mevcut abonelikler korunur.

alter table push_subscriptions add column if not exists device_id text;
create index if not exists idx_push_subscriptions_device on push_subscriptions(device_id) where device_id is not null;

notify pgrst, 'reload schema';
