# KoçDefterim — Çalışma notları

Son güncelleme: 12 Kasım 2026

Veritabanı değişiklikleri `supabase/` klasöründeki `.sql` dosyalarıyla yapılır; her biri Supabase SQL Editor'da **bir kez** çalıştırılır.

---

## 1. Çalıştırılması gereken SQL dosyaları

| Dosya | Ne için | Durum |
|---|---|---|
| `platform_students.sql` | Kayıtta "koç iletişime geçsin / sadece platform" seçimi | ✅ Çalıştırıldı |
| `student_exam_entry.sql` | Öğrencinin deneme girmesi | ✅ Çalıştırıldı |
| `student_programs.sql` | Öğrencinin kendi programı + koç onayı | ✅ Çalıştırıldı |
| `exam_self_analysis.sql` | Öğrencinin deneme analizi (yanlış/boş sorulara not) | ✅ Çalıştırıldı |
| `student_task_missed.sql` | Görevlere "Yapmadım" işareti | ✅ Çalıştırıldı |
| `feed_views.sql` | Video izlenme takibi | ⏳ Çalıştırılacak |
| `staff_programs.sql` | Belletmenin program hazırlaması + "yapmadı" işaretlemesi | ✅ Çalıştırıldı |
| `topic_progress_changes.sql` | Konu ilerleyişinde son değiştiren + koça bildirim | ✅ Çalıştırıldı |
| `daily_entry_pages.sql` | Günlük girişe sayfa aralığı; koçun girişlerinde "koç girdi" | ✅ Çalıştırıldı |
| `student_reports.sql` | Haftalık otomatik rapor (pazartesi 08:00) + koçun tarih aralığı raporu | ✅ Çalıştırıldı |
| `staff_activity.sql` | Ekip kayıtları: bağlı stajyer/personelin değişiklikleri + bildirim (/ekip-kayitlari) | ⏳ Çalıştırılacak |
| `meeting_photos.sql` | Görüşmeye defter fotoğrafı (kapalı depo) | ⏳ Çalıştırılacak |

`exam_self_analysis.sql`, `student_exam_entry.sql`'den **sonra** çalıştırılmalı.
`daily_entry_pages.sql`, `belletmen_gunluk.sql`'den; `student_reports.sql`, `push_notifications.sql`'den **sonra** çalıştırılmalı.
`staff_activity.sql`, `notifications_grouping.sql`'den **sonra** çalıştırılmalı.
`staff_programs.sql`, `student_programs.sql`, `student_task_missed.sql` ve `belletmen_gunluk.sql`'den **sonra** çalıştırılmalı.

---

## 2. Tamamlananlar (yayında)

### Öğrenci kaydı (`418fb67`)
- Koç seçme listesinin yerine iki seçenek var: **"Koç öğretmen benimle iletişime geçsin"** / **"Koç istemiyorum, sadece platformu kullanacağım"**.
- **Koç isteyen öğrenci:**
  - Yöneticiye zil bildirimi gider, telefon numarası bildirimde yazar. Ayrıca e-posta gider; e-posta için Vercel'de `RESEND_API_KEY` tanımlı olmalı.
  - Ayarlar > Öğrenci Başvuruları'nda "📞 Koç istiyor" etiketiyle görünür.
- **Sadece platform öğrencisi:**
  - Paneli onay beklemeden hemen açılır.
  - Görünmez bir sistem hesabına bağlanır (`profiles.is_system`); hiçbir koçun listesinde görünmez.
  - Yönetici, Ayarlar'dan istediği zaman "Koç ata" ile bir koça geçirebilir.

### Öğrencinin deneme girmesi (`808a581`)
- Öğrenci TYT, AYT ve LGS sonucunu kendisi girebilir.
- Yalnızca kendi girdiği denemeyi düzeltip silebilir.
- Koça bildirim gider; koçun listesinde "öğrenci girdi" etiketi görünür.

### Öğrencinin kendi programı (`aaddedd`)
- 7 günlük program editörü. Kolaylıklar: "son programımı kopyala", "bu günü diğer günlere kopyala".
- **Koçun o tarihlerde programı yoksa:** Program hemen geçerli olur, koça bildirim gider.
- **Koçun o tarihlerde programı varsa:** Program koçun onayına gider.
  - **Onay:** Koçun programı silinir, öğrencininki geçer.
  - **Ret:** Koçun programı kalır.
  - **Cevap yoksa:** Öğrenci ikisini de görür; işaretlemeyi koçun programında yapar.
- Koçun onay listesi Haftalık Takip sayfasının üstünde.
- Platform öğrencisi alanını kendisi seçer.

### Öğrenci denemeleri ve analizi (`a6b9683`)
- Deneme Karnelerim sayfasında **Karne / Liste** görünümü. Listede net değişimi ▲▼ ve net çubuğu var.
- **"Analiz yap"** sayfası:
  - Yalnızca yanlış ve boş sorular listelenir; her birine hata türü ve not girilir.
  - Hata türleri: konu, soru, dikkat, okuma, işlem, süre, diğer.
  - Analiz bitince koçun "analiz yapıldı" işareti otomatik açılır.
  - Koçun karnesinde "Öğrencinin analizi" bölümü görünür.

### Groq/Gemini deneme analizi yeniden (`a47c206`)
- **Çalışılacak konular** kodda hesaplanır, ders ders iki sütun halinde:
  - **Öncelikli:** %0–49
  - **İkinci öncelik:** %50–75
  - Değerlendirmeye girmek için en az 2 soru gerekir; %75 üstü listeye girmez.
  - Eşikler `src/lib/exam-topic-priority.ts` dosyasında.
- **Yapay zekâ konu sırasına karışmaz.** Yalnızca kanıt varsa konu çıkarır: görüşme notu, denemeden sonraki günlükler ya da öğrencinin notu. Çıkarılan konular nedeniyle birlikte gösterilir.
- **Öğrencinin dikkat, okuma, işlem ya da süre hatası dediği kazanımlar** konu listesine girmez. Bunlar için "Hata alışkanlıkları" önerileri verilir.
- Analiz sayfası sadeleşti. Eski kayıtlı analizler de yeni düzende görünür.

### Personel e-postası, konu tamamlama, görüşme taslağı (`277feca`)
- Hesabım sayfasında personel e-posta adresini sonradan ekleyip güncelleyebilir.
- Konu tamamlama: 1., 2. ya da 3. kaynaktan herhangi birinden soru çözmek yeterli. Öğrenci tarafında kaynakların birbirini otomatik işaretlemesi kaldırıldı.
- Görüşme taslağı:
  - Panel açılır açılmaz kaydedilir; sayfadan çıkarken son yazılanlar da kaydedilir.
  - Taslak varsa öğrenci detayında panel küçültülmüş açılır ("Görüşmeye dön").

### Video izlenme takibi
- Öğrenci koçun paylaştığı içeriği açınca kayıt düşer.
- YouTube ve Vimeo'da izlenen süre ve yüzde tutulur; ileri sarılan kısım sayılmaz. Diğer sitelerde yalnızca "açtı" tutulur.
- Koç, ana sayfadaki İçerik paylaş sekmesinde her paylaşımın altında "12 öğrenciden 8'i açtı · ort. %64 izlendi" özetini görür. Tıklayınca öğrenci öğrenci liste açılır: açtı / açmadı / hesabı yok, yüzde, süre, son açma zamanı.

### Belletmenin program hazırlaması
- Günlük takip ekranında ve belletmen ana sayfasındaki öğrenci kartında **"Haftalık program hazırla"** var. Öğrencinin program editörünün aynısı kullanılıyor.
- Program koçun onayına gider. Koçun onay listesi Haftalık Takip'in üstünde; kartta "Hazırlayan: …" ya da "Öğrencinin kendi programı" yazar.
  - **Onay:** Koçun o tarihlerdeki programı silinir, belletmenin programı koçun programı gibi geçerli olur. Belletmene ve öğrenciye bildirim gider.
  - **Ret:** Hiçbir şey değişmez, belletmene bildirim gider.
- Belletmen onay bekleyen programı günlük takip ekranında görür ve geri çekebilir. Öğrenci, onaylanana kadar bu programı görmez.
- Koç ya da yönetici bu ekrandan program hazırlarsa onay beklemeden geçerli olur.

### Belletmenin "yapmadı" işaretlemesi
- Günlük takip ekranında yapılmamış görevde **"✕ Yapmadı"** düğmesi var; neden yazmak isteğe bağlı.
- Kimin işaretlediği görünür: belletmen ekranında "… işaretledi", koçun haftalık takibinde "(… girdi)".

### Platform öğrencisinin konuları
- Konu İlerleyişim sayfası boşsa öğrenci alanını seçer, "Konularımı ekle" der; Kazanım Havuzu'ndaki o alanın konuları eklenir.
- Daha sonra "Konu listeni güncelle" ile alan değiştirebilir ya da eksik konuları ekleyebilir; işaretledikleri silinmez.

### Konu ilerleyişinde kim değiştirdi
- Her konuya son değiştirenin adı ve rolü yazılır.
- Koçun Konu İlerleyişi sayfasında konunun yanında "🧑‍🎓 öğrenci işaretledi" ya da "🧑‍🏫 belletmenin adı" etiketi çıkar; üzerine gelince tarih görünür.
- Öğrenci ya da belletmen işaretleyince koça bildirim gider. Okunmamış bildirim varsa 12 saat içindeki değişiklikler tek bildirimde toplanır.

### Günlük giriş ekranı yenilendi (koç, yurt yöneticisi, belletmen)
- Üstte öğrenci kartı (aramalı öğrenci seçici, önceki/sonraki), 8 günlük gün şeridi, günün özeti (görev, soru, dakika).
- Her görevde büyük **Yaptı / Yapmadı** düğmeleri. "Yaptı" formu hedefle dolu açılır: soru, doğru, yanlış, dakika, **sayfa** (isteğe bağlı, ör. 45-60).
- Yapılan görevde özet görünür ("45 soru (12D 3Y) · 30 dk · s. 45-60 · Ali girdi"), Düzenle / Geri al.
- Koç da kullanabilir: menüde "Günlük giriş", öğrenci sayfasında Program ve günlük → "✓ Programdan günlük gir". Stajyerde görünmez.
- Öğrenci detayındaki günlükte sayfa ve girenin adı görünür.

### Konu atama penceresi
- Havuzdan konu atanınca pencere kapanır ve "N konu eklendi" yazar; pencerede ayrıca "Kapat" düğmesi var.

### Haftalık rapor
- Her pazartesi 08:00'de (Türkiye) koçu olan her aktif öğrencinin geçen hafta (pazartesi–pazar) raporu oluşur ve kaydedilir; koça tek bildirim gider. O hafta hiçbir şey olmayan öğrenci için rapor oluşmaz.
- Koç, öğrenci sayfasındaki **Raporlar** sekmesinden istediği tarih aralığı için rapor alır (geçen hafta / bu hafta / son 7 gün / son 30 gün / özel, en fazla 6 ay). Raporlar aynı sekmede listelenir; yazdırılabilir / PDF, silinebilir.
- **İçerik:**
  - Programa uyum: hafta bazında ve gün bazında (günlük ortalama, kaç gün tam).
  - Hedef soru gerçekleşme yüzdesi.
  - Çözülen soru (önceki döneme göre değişim), doğruluk yüzdesi, çalışma süresi, aktif gün.
  - Gün gün tablo: görev, uyum, hedef / çözülen, soru, D/Y, süre.
  - Ders ders tablo; dönemdeki denemeler (net, bir öncekine göre değişim, ders netleri); ilerleyen ve tamamlanan konular.
- **Bugün rapora ne zaman girer:** Saat 22:00'yi geçmiş ve öğrencinin o günkü son çalışma hatırlatmasının üzerinden 15 dakika geçmişse (ör. hatırlatma 23:20 → 23:35'ten itibaren). Hatırlatması yoksa 22:00. Öncesinde rapor dünle biter; koç "Bugünü de dahil et" işaretlerse bugün de girer. Kural `src/lib/report-cutoff.ts`.
- Hesaplama `src/lib/period-report.ts`, otomatik çalışma `/api/cron/haftalik-rapor` (veritabanı zamanlayıcısı çağırır).

### Küçük düzeltmeler
- Öğrenci görevlerinde:
  - "Yapmadım" çarpısı açık kırmızı.
  - "Yaptım" dairesi bekleyen görevde beyaz ve kesik çizgili; yapılan görevde dolu yeşil, altında "Tamamlandı" yazısı var.
- Telefonda açılan pencereler klavyenin altında kalmıyor.
- Öğrenci detayında haftalık program yalnızca güncel programı gösteriyor. Oklar, liste ve "tarihe git" ile önceki programlara geçiliyor.

---

## 3. Yarım kalanlar / bilinen eksikler

- **Defter fotoğrafından yazı okuma** Gemini ile (GEMINI_API_KEY gerekli; isteğe bağlı GEMINI_VISION_MODEL). Fotoğraf yükleme anahtarsız da çalışır.
- **Sesli dikte** tarayıcının konuşma tanımasıyla (Chrome/Edge/Safari; Firefox'ta düğme görünmez). Ses tarayıcı üreticisinin (Google/Apple) sunucusunda yazıya çevrilir; konuşmacıları ayırmaz.
- **Silinen görüşmenin fotoğrafları** depoda kalır (yalnızca kayıttan önce kaldırılan fotoğraf hemen silinir).

- **`feed_views.sql`, `staff_activity.sql`, `meeting_photos.sql` çalıştırılmadı** (video izlenme, ekip kayıtları, defter fotoğrafı). Çalıştırılana kadar bu özellikler görünmez ya da "henüz etkin değil" der; mevcut ekranlar bozulmaz.
- **Ekranda denenmedi:**
  - Bu ve önceki turdaki değişiklikler tip, lint ve derleme kontrolünden geçti; tarayıcıda denenmedi.
  - Video süresi YouTube/Vimeo oynatıcısının mesajlarıyla ölçülüyor; gerçek bir videoda telefonda ve bilgisayarda denenmeli.
- **Görüşme taslağı yalnızca o tarayıcıda:** Başka cihazdan girilince taslak görünmez.
- **Önceki oturumlardan kalanlar:**
  - Mac'te görülen 404 sorunu
  - Bir öğrencinin denemelerini artık görebildiğinin teyidi
  - Vercel'de `GEMINI_API_KEY` tanımı

---

## 4. Sıradaki adımlar

1. `feed_views.sql`, `staff_activity.sql`, `meeting_photos.sql` dosyalarını çalıştırmak.
2. Telefonda ve bilgisayarda deneme turu:
   - video izleme
   - belletmen programı → koç onayı
   - belletmenin "yapmadı" işaretlemesi
   - platform öğrencisinin konu eklemesi
   - deneme analizi
   - yeni günlük giriş ekranı
   - rapor oluşturma
   - ilk pazartesi otomatik raporunun gelip gelmediği
3. *(İsteğe bağlı)* Video izlenme bilgisini öğrenci detay sayfasında da göstermek (öğrenci bazında "son 30 günde 5 içerikten 3'ünü izledi").
