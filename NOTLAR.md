# KoçDefterim — Çalışma notları

Son güncelleme: 28 Kasım 2026

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
| `feed_views.sql` | Video izlenme takibi | ✅ Çalıştırıldı |
| `staff_programs.sql` | Belletmenin program hazırlaması + "yapmadı" işaretlemesi | ✅ Çalıştırıldı |
| `topic_progress_changes.sql` | Konu ilerleyişinde son değiştiren + koça bildirim | ✅ Çalıştırıldı |
| `daily_entry_pages.sql` | Günlük girişe sayfa aralığı; koçun girişlerinde "koç girdi" | ✅ Çalıştırıldı |
| `student_reports.sql` | Haftalık otomatik rapor (pazartesi 08:00) + koçun tarih aralığı raporu | ✅ Çalıştırıldı |
| `staff_activity.sql` | Ekip kayıtları: bağlı stajyer/personelin değişiklikleri + bildirim (/ekip-kayitlari) | ✅ Çalıştırıldı |
| `meeting_photos.sql` | Görüşmeye defter fotoğrafı (kapalı depo) | ✅ Çalıştırıldı |
| `fix_tyt_geometri_cift.sql` | Tek seferlik: TYT karnelerinde iki kez sayılan geometriyi düzeltir | ✅ Çalıştırıldı |
| `mentor_intern_exams_write.sql` | Rehber koç stajyerlerinin öğrencilerine deneme yazabilir (toplu yükleme / kazanım ekleme) | ✅ Çalıştırıldı |
| `deneme_analizleri.sql` | Yapay zekâ deneme analizi kaydedilir; koç "Öğrenciye gönder" ile öğrenciye iletir (notifications.sql'den sonra) | ✅ Çalıştırıldı |
| `gunluk_bildirimleri.sql` | Öğrenci günlük girince koça bildirim; her sabah 10:00'da dün günlük girmeyenlerin listesi | ✅ Çalıştırıldı |
| `ogrenci_ilk_giris.sql` | Öğrenci hesabıyla ilk kez giriş yapınca koça bildirim (+ hiç giriş yapmamışların listesi) | ✅ Çalıştırıldı |
| `stajyer_bildirim_kopyasi.sql` | Stajyerin öğrencisinden gelen bildirimler (günlük, deneme, program, konu, ilk giriş) rehber koça da düşer (notifications_grouping.sql'den sonra) | ✅ Çalıştırıldı |
| `bildirim_cakisma_duzeltme.sql` | Rehber koça aynı olayın iki kez düşmesi ve sabah özetlerinin karışması düzeltildi (stajyer_bildirim_kopyasi.sql'den sonra) | ✅ Çalıştırıldı |
| `online_gorusme.sql` | Ajanda'da online görüşme: koçun varsayılan Meet/Zoom bağlantısı | ✅ Çalıştırıldı |
| `program_duzenleyerek_onay.sql` | Onay bekleyen programı koç düzenleyip onaylayabilir (staff_programs.sql'den sonra) | ✅ Çalıştırıldı |
| `toplu_mesaj.sql` | Grup kurmadan seçilen öğrencilere ayrı ayrı, isme özel ({ad}) toplu mesaj (messaging.sql'den sonra) | ✅ Çalıştırıldı |
| `ogrenci_program_onayi.sql` | Koçu olan öğrencinin kendi yaptığı program, koçun programı olmasa da her zaman koçun onayına gider (staff_programs.sql ve program_duzenleyerek_onay.sql'den sonra) | ✅ Çalıştırıldı |
| `program_bildirimi.sql` | Koç programa görev ekleyince / toplu işlemle program kopyalayınca öğrenciye her hafta için ayrı "Yeni haftalık programın hazır" bildirimi (notifications.sql'den sonra) | ✅ Çalıştırıldı |
| `sayisiz_calisma.sql` | Öğrencinin çalışma kaydında soru sayısı/süre isteğe bağlı ("Sayıları hatırlamıyorum"); koç "sayı girilmedi" görür (student_daily_log.sql'den sonra) | ✅ Çalıştırıldı (24 Kasım 2026) |
| `gunluk_eksikler.sql` | Sabah 10:00 "günlük girmeyenler" bildirimi /gunluk-eksikler sayfasını açar (girmeyen + eksik girenler, mesaj/program/bildirimi kapat); ilk girişini yapmamış öğrenciler sayılmaz; öğrenci bazında süreli/süresiz sessize alma (bildirim_cakisma_duzeltme.sql'den sonra) | ✅ Çalıştırıldı (24 Kasım 2026) |
| `mesaj_okundu_duzenleme.sql` | Mesajlarda okundu bilgisi (⋮ menüsünden açılıp kapatılır, karşılıklı); mesajı 24 saat içinde düzenleme / herkesten geri alma, benden silme; grup yöneticisi mesaj kaldırabilir (messaging.sql'den sonra) | ✅ Çalıştırıldı (24 Kasım 2026) |
| `mesaj_kisi_ayarlari.sql` | Mesajlarda sohbete (kişiye) özel okundu bilgisi ve sohbeti süreli/süresiz sessize alma (⋮ menüsü); sessizdeki sohbetten bildirim gelmez (mesaj_okundu_duzenleme.sql'den sonra) | ✅ Çalıştırıldı (24 Kasım 2026) |
| `gorusme_taslaklari.sql` | Kaydedilmemiş görüşme taslağı sunucuda da saklanır: bilgisayarda başlanan not telefonda da açılır (taslağı yalnızca yazan görür) | ✅ Çalıştırıldı (28 Kasım 2026) |
| `abonelik.sql` | Abonelik ve havale/EFT ödemesi: paketler, deneme süresi, salt okunur dönem, kurumsal abonelik, yönetici onayı; mevcut bütün koçlar ücretsiz/süresiz işaretlenir (notifications.sql'den sonra) | ✅ Çalıştırıldı (28 Kasım 2026) |
| `geri_bildirim.sql` | "Bize bildir": ana sayfadan sorun/öneri/mesaj; yöneticiye zil bildirimi, Ayarlar > Geri bildirimler listesi, "Çözüldü" deyince bildirene bildirim (notifications.sql'den sonra) | ✅ Çalıştırıldı (28 Kasım 2026) |

`exam_self_analysis.sql`, `student_exam_entry.sql`'den **sonra** çalıştırılmalı.
`daily_entry_pages.sql`, `belletmen_gunluk.sql`'den; `student_reports.sql`, `push_notifications.sql`'den **sonra** çalıştırılmalı.
`staff_activity.sql`, `notifications_grouping.sql`'den **sonra** çalıştırılmalı.
`staff_programs.sql`, `student_programs.sql`, `student_task_missed.sql` ve `belletmen_gunluk.sql`'den **sonra** çalıştırılmalı.

---

## 2. Tamamlananlar (yayında)

### KVKK ve yasal metinler (28 Kasım)
- Sayfalar (giriş gerektirmez, alt bilgide "Yasal"): /kvkk (aydınlatma metni), /acik-riza, /gizlilik (gizlilik ve çerez), /kullanim-kosullari (abonelik, deneme, salt okunur dönem, iade yer tutucusu).
- Koç ve öğrenci kayıt formlarında zorunlu onay kutuları; öğrenci 18 yaşından küçükse ayrıca veli onayı. Kabul edilen sürüm ve tarih hesabın user_metadata'sına yazılır (legal_version, legal_accepted_at, explicit_consent, parent_consent). Koçun eklediği öğrencilerde veri sorumlusu koç/kurumdur (metinde yazıyor).
- **Yapılacak:** şirket kurulunca `src/lib/legal.ts` içindeki köşeli parantezli bilgiler (ünvan, adres, e-posta, KEP, MERSİS) ile metinlerdeki [saklama süresi], [iade koşulları], [sorumluluk sınırı], [il] doldurulmalı; metinler hukukçuya kontrol ettirilmeli; metin değişince `LEGAL_VERSION` artırılmalı.

### Bize bildir (28 Kasım) — `geri_bildirim.sql`
- Koç ana sayfasında karşılama kartında sarı **Bize bildir** düğmesi, öğrenci ana sayfasında karşılama kartında **Bize bildir: sorun ya da öneri**. Tür (Sorun / Öneri / Diğer) + metin; sayfa ve cihaz bilgisi kendiliğinden eklenir. Yöneticiye zil bildirimi; Ayarlar > Geri bildirimler'de liste (Yeni / İnceleniyor / Çözüldü, not, sil). Çözüldü denince bildirene notla bildirim gider. Kod: `src/components/FeedbackButton.tsx`, `src/app/ayarlar/geri-bildirimler`.

### Abonelik ve ödeme (28 Kasım) — `abonelik.sql`
- **Kimler öder:** onaylı koç/öğretmen. Yönetici, sistem hesabı, yurt yöneticisi, belletmen, stajyer her zaman muaf. SQL çalıştırıldığında var olan bütün koçlar **ücretsiz, süresiz**; yönetici Ayarlar > Abonelikler'den değiştirir (ücretsiz süresiz / ücretsiz bitiş tarihli / deneme / ücretli, bitiş, paket, kurum, not).
- **Yeni koç:** ilk girişte deneme (varsayılan 14 gün). **Süre bitince:** görüntüleme süresi (varsayılan 14 gün) salt okunur: görür ve Excel indirir, yeni kayıt/değişiklik/silme veritabanı tetikleyicisiyle engellenir (`_billing_guard`); öğrenciler etkilenmez. Sonra hesap kilitlenir: panelde yalnızca Abonelik ve Hesabım açılır. Ödeme onaylanınca hemen açılır.
- **Fiyat:** bireysel paketler 10/30/60/sınırsız öğrenci: 49/99/159/199 TL/ay; yıllık %20 indirim. Kurumsal: koç başına ortalama öğrenciye göre paket × koç sayısı, koç sayısına göre indirim (2+ %10, 5+ %15, 10+ %20, 20+ %25); öğrenci sınırı paket sınırı × koç. Hepsi Ayarlar > Abonelikler > Fiyatlar ve banka'dan değişir. Tutar veritabanında hesaplanır (`billing_price`), ekran önizlemesi `src/lib/billing.ts`.
- **Havale akışı:** koç /abonelik'te paket seçer, IBAN'a öder, açıklamaya kendi ödeme kodunu (KD…) yazar, "ödedim, onaya gönder" der → yöneticiye bildirim. Yönetici bankada kodu/tutarı görünce onaylar → süre 1 ay / 1 yıl uzar (bitmemişse bitiş tarihine eklenir), koça bildirim. Kurumsal onayda kurum kendiliğinden kurulur; diğer koçlar Koçlar sekmesinden kuruma eklenir.
- **Öğrenci sınırı:** ücretli pakette koç sınırı aşacak yeni öğrenci ekleyemez. **Hatırlatma:** bitişe 7 ve 1 gün kala, salt okunur başlayınca ve kapanmadan 1 gün önce bildirim (her gün 09:00, `abonelik-hatirlatma`).
- Kod: `src/app/abonelik`, `src/app/ayarlar/abonelikler`, `src/components/layout/DashboardShell.tsx` (uyarı şeridi + kilit), `src/app/api/abonelik/disa-aktar` (Excel).

### Görüşme fotoğrafları depoda kalmaz (28 Kasım)
- Görüşme silinince (görüşme kayıtları, öğrenci detayı, öğrenci görüşmeleri) defter fotoğrafları depodan da silinir. Düzenlemede çıkarılan fotoğraf kaydedilince, düzenlemeden vazgeçilince o sırada yüklenenler, "Taslağı sil" ile taslağa yüklenenler silinir. Öğrenci tamamen silinirse fotoğrafları yine depoda kalır. Kod: `deleteMeetingWithPhotos` / `removePhotoFiles` (`src/components/meeting/MeetingPhotos.tsx`).

### Görüşme taslağı her cihazda, bildirimden içeriğe gitme (28 Kasım)
- Görüşme taslağı tarayıcıya hemen, sunucuya (`meeting_drafts`) en geç 2 sn'de yazılır; form açılırken tarayıcıdaki ve sunucudaki taslaktan yeni olanı gelir. Başka cihazda kaydedilen/silinen taslağın eski kopyası geri gelmez. Başka cihazda taslak varsa öğrenci detayında panel küçültülmüş açılır. Kod: `src/lib/meetingDraft.ts`.
- İçerik/duyuru bildirimine tıklayınca öğrenci ana sayfasında `#icerik` (Koçundan sana) / `#pano` bölümüne gidilir; zaten ana sayfadaysa kaydırılır. Kod: `src/lib/notification-link.ts`.

### Öğrenci detayında içerik izlenmesi (28 Kasım)
- Öğrenci detayı → Genel bakış → **Paylaşılan içerikler (izlenme)**: son 7 / 30 / 90 günde öğrenciye gönderilen içerikler (koçu, sorumlu koçu, öğretmenleri), üstte "5 içerikten 3'ünü açtı · videolarda ort. %64 izledi" özeti. Her içerikte YouTube/Vimeo için izlenen yüzde ve süre, diğerlerinde "açtı (2 kez)" ya da "açmadı"; yerine yenisi gelen içerik "yayından kalktı" diye işaretlenir.
- SQL gerekmez: src/app/api/ogrenci-icerik-izleme/route.ts önce kullanıcının öğrenciyi görebildiğini kontrol eder, sonra kayıtları sunucuda okur. Kart: IcerikIzleme.tsx.

### Karanlık mod (27–28 Kasım)
- Koçun ve öğrencinin üst çubuğunda ay/güneş düğmesi (`src/components/ThemeToggle.tsx`); tercih tarayıcıda (`kd:theme`) saklanır, sayfa çizilmeden uygulanır. Yalnızca panel sayfalarında (`.app-shell`); tanıtım sayfaları ve yazdırma açık kalır.
- Sabit açık renk sınıfları `globals.css` → "Karanlık mod" bölümünde koyu karşılıklarına çevrilir. Yeni bir açık hex zemin eklenirse oraya da eklenmeli.
- 28 Kasım: öğrenci panelinde çalışmıyordu (`.student-theme` kendi açık renk değişkenleriyle koyu değerleri eziyordu); düzeltildi.

### Yapay zekâ asistanı (27 Kasım)
- Öğrenci detayı → Genel bakış: haftalık öneri, program taslağı (düzenlenip sonraki program haftasına eklenebilir), görüşme hazırlığı. Görüşme panelinde de "Görüşme hazırlığı".
- Son denemeler, son 14 gün program/günlük, konu ilerleyişi ve görüşme notları kodda özetlenip gönderilir; öğrenci adı gönderilmez. Son sonuç tarayıcıda saklanır. SQL gerekmez. Kod: `src/lib/ai/studentAssistant.ts`, `src/app/api/ogrenci-asistan/route.ts`.

### PDF karne ve kazanım ekleme (27 Kasım)
- Okul net listesi + tek sayfalık öğrenci karnesi ("Öğrenci Sıra No / Cevap Anahtarı / Cevaplarınız" düzeni) okunur: şube/ilçe/il sıraları, katılımcı sayıları, soru soru cevaplar, kazanım özeti.
- Deneme düzenle → **Kazanım yükle (PDF)**: eksikler artık ders ders tamamlanır. Önce yalnız Türkçe/Sosyal kazanımlı karne yüklenip sonra Matematik/Fen kazanımlı karne gelirse eksik dersler eklenir; kayıtlı dersler değiştirilmez.

### Program uyumu her yerde aynı hesap (27 Kasım)
- Öğrenci detayındaki özet kartı "Bu hafta program" (bugünü kapsayan programın bütün görevleri, bugünkü ve ileri günler dahil) ile Görüşme kayıtları listesindeki "Son 7 gün program" (dünden geriye 7 gün) farklı şeyler ölçtüğü için farklı yüzde çıkıyordu (ör. %62 / %54).
- Artık detay kartı da **"Son 7 gün program"** gösterir ve aynı fonksiyonla hesaplanır (`computeStudentSummaries`): yüzde ve "19/35 görev" listedekiyle aynıdır. Kartın alt satırında ayrıca "bu hafta 23/37" (o anki programın ilerlemesi) yazar.

### Görüşme listesi tablette (27 Kasım)
- Görüşme kayıtları → öğrenci listesi tablet genişliğinde (yan menüyle birlikte) sütunlar dar kalıp iç içe geçiyordu (son görüşme, son deneme ve program uyumu üst üste biniyordu). Tablo düzeni artık yalnızca geniş ekranda (xl, ≥1280 px) ve sabit genişlikli sütunlarla; daha dar ekranlarda (tablet, telefon) her öğrenci iki satırlık kart: ad, sınıf · kurum, son görüşme; altında son deneme ve program uyumu. Kesilen ad ve kurumun tamamı üzerine gelince görünür. Kod: `StudentMeetingList` (`src/components/StudentCard.tsx`).

### Görüşme listesinde program uyumu düzeltmesi (27 Kasım)
- Görüşme kayıtları → öğrenci listesindeki "son 7 gün program uyumu" yanlış çıkıyordu (ör. %90 yerine %33). Neden: görevler 25 öğrencilik gruplar halinde tek istekte çekiliyordu; Supabase bir istekte en fazla 1000 satır döndürdüğü için fazlası kesiliyor, bazı günlerin görevleri eksik ya da yanlış programdan sayılıyordu.
- Artık sayfa sayfa hepsi alınır (denemeler de). Ayrıca ertelenen görev, ertelendiği gün yapıldıysa yapılmış sayılır (dönem raporuyla aynı kural).
- Ölçü değişmedi: dünden geriye son 7 gün, o günlerin programındaki görevlerden "yaptı" işaretli olanların oranı (görüşme görevleri hariç). Kod: `src/lib/student-summary.ts`.

### Programı dolu haftaya aktarma (27 Kasım)
- Haftalık Takip → **Sonraki haftalara aktar**: programı olan haftalar artık seçilebilir (eskiden "Bu tarihlerde program var" diye kapalıydı). Seçilince uyarı çıkar: aktarılan program oradaki programın yerine geçer ve sorulur:
  - **Verileri koru** (varsayılan): mevcut programda yapılmış ya da veri girilmiş görevler (soru/süre > 0, yaptı/yapmadı işaretli, öğrencinin eklediği) programda kalır; hiç çalışılmamış görevler silinir. Aynı gün aynı ders+konu+kaynaktaki görev tekrar eklenmez.
  - **Hepsini sil**: mevcut programın bütün görevleri silinir (öğrencinin günlük kayıtları silinmez).
  - Ajanda'dan gelen görüşme görevleri her durumda kalır. Kalan görevler aktarılan programın tarihlerine alınır. Son onay penceresi de sorar.
- Örnek kullanım: iki hafta önceki programı açıp "Sonraki haftalara aktar" → "2 hafta sonra" (bu hafta). SQL gerekmez.

### Görüşmelerde içerik araması (27 Kasım)
- **Görüşme kayıtları** sayfasında üstte **"Görüşmelerde ara"** düğmesi: bütün öğrencilerin görüşmelerinin konusu, notları ve görüşmeyi yapan kişi aranır. Sonuçta tarih, öğrenci, konu ve notun aranan kelimenin geçtiği kısmı (vurgulu) görünür; tıklayınca görüşme açılır (düzenle/sil oradan). Üstteki sınav/kurum filtresine uyar.
- **Bir öğrencinin görüşme kayıtları** sayfasında (ve öğrenci detayındaki görüşme panelinde) liste üstünde arama kutusu: yalnızca o öğrencinin görüşmelerinde arar; eşleşen görüşmeler kelimeler vurgulu, tam haliyle (düzenlenebilir) listelenir.
- Arama Türkçe harf ve büyük/küçük harf duyarsız ("ogrenci" → "Öğrenci"); birden çok kelime yazılırsa hepsinin geçtiği görüşmeler gelir. SQL gerekmez. Kod: `src/components/MeetingSearch.tsx`.

### Sesli dikte düzeltmesi (25 Kasım)
- Görüşme notundaki **Sesli dikte** sessizce çalışmıyormuş gibi kalıyordu: tarayıcının konuşma tanıma hataları (servise ulaşılamadı, tarayıcı izin vermiyor, Türkçe desteklenmiyor) yok sayılıp dikte boşuna yeniden başlatılıyordu.
- Artık her hata açık bir mesajla gösterilir ve dikte durur; hiç yazı gelmeden art arda kapanırsa sonsuz yeniden başlatma yapılmaz. 10 sn içinde yazı gelmezse ne yapılacağını söyleyen uyarı çıkar.
- Kesinleşmemiş son parça (özellikle Safari/iPhone'da) dikte kapanınca ya da yeniden başlarken kaybolmaz, nota eklenir.
- Not: Konuşma tanıma Chrome, Edge ve Safari'de çalışır; Brave, Opera, Firefox ve bazı "ana ekrana eklenmiş uygulama" görünümlerinde çalışmaz. Bu durumda klavyenin 🎤 tuşu kullanılabilir. Kod: `src/components/NotesEditor.tsx`.

### Ekstra çalışmalar programda (25 Kasım)
- Günlüğe programdaki bir göreve bağlı olmadan girilen çalışmalar ("Plan dışı çalışma" / ekstra: koç, belletmen ya da öğrenci girmiş olsun) öğrenci detayı → Program ve günlük → Haftalık program'da, girildiği tarihin gün sütununda yeşil kesikli **"➕ Ekstra çalışma"** kartı olarak görünür: ders, konu, soru (D/Y), süre, sayfa ve kimin girdiği. Aynı gün aynı ders+konu+giren tek kartta toplanır.
- Kart yalnızca o tarihi kapsayan bir program varsa görünür (programı olmayan haftanın ekstra çalışması yalnızca günlük listesinde ve "Çalışılan konular"da).
- Veri değişikliği yok; kod: `buildExtraEntries` (`src/lib/task-entries.ts`), `OgrenciProgramlari.tsx`.

### Günlükte konu adı, program onayı, onay ekranı (`098513a`)
- **Günlükte konu adı:** Öğrenci görevi "yaptım" diye işaretlerken ya da plan dışı çalışma eklerken "Hangi konuyu çalıştın?" alanı var. Görevde konu yazılıysa dolu gelir, değiştirilebilir. Öneriler öğrencinin Konu İlerleyişi listesinden, seçili derse göre gelir.
- **Koç tarafında takip:** Öğrenci detayı → Program ve günlük → **Çalışılan konular (günlükten)**. Ders ders konu listesi: soru (D/Y), doğruluk, süre, kaç gün, son çalışma; son 7 / 30 / 90 gün ya da tümü; konu arama. Son 7 günde ilk kez çalışılan konuda "yeni" etiketi. Konu adı yazılmamış çalışmalar ayrıca toplanır.
- **Öğrencinin programı her zaman onaya gider** (`ogrenci_program_onayi.sql`): Programı yoksa da öğrenci "Kendi programını yap" ile program yapıp koçun onayına gönderir; onaylanınca programı olur. Öğrenci bekleyen programını "Düzenle" ile değiştirip yeniden gönderebilir ya da geri çekebilir. Ana sayfada programı yoksa "Bu hafta programın yok, kendin yap" düğmesi çıkar. Sadece platform öğrencisinin programı eskisi gibi hemen geçerli.
- **Onay ekranı yenilendi:** Haftalık Takip'in üstündeki onay listesinde "Programı aç ve onayla" programı Haftalık Takip panosunun aynısıyla tam ekran açar (renkli kartlar, gün sütunları, telefonda gün seçici). Görev ekle (birden çok güne), düzenle, sil, kopyala-yapıştır, saat değiştir.
  - Öğrencinin/belletmenin programında koçun yaptığı değişiklikler işaretlenir; "Şu anki programınız" sekmesinde koçun o tarihlerdeki (onaylanırsa silinecek) programı görünür.
  - Öğrencinin **değişiklik talebi** de aynı ekranda açılır: mevcut program üzerinde istenenler işaretli (Yeni / Değişiyor / Kaldırılacak, "Gün: Sal → Pzt" gibi). Koç ayrıca düzenleyebilir; onaylayınca panodaki son hal uygulanır.
  - Ortak pano bileşeni `src/components/program/ProgramBoard.tsx`, onay ekranı `ProgramReview.tsx`; ders renkleri `src/lib/subject-colors.ts`.

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

- **Ekranda denenmedi:**
  - Bu ve önceki turdaki değişiklikler tip, lint ve derleme kontrolünden geçti; tarayıcıda denenmedi.
  - Video süresi YouTube/Vimeo oynatıcısının mesajlarıyla ölçülüyor; gerçek bir videoda telefonda ve bilgisayarda denenmeli.
- **Görüşme taslağı:** `gorusme_taslaklari.sql` çalıştırılınca her cihazda görünür (çalıştırılmadan yalnızca o tarayıcıda). İki cihazda aynı anda yazılırsa son yazılan geçerli olur.
- **Önceki oturumlardan kalanlar:**
  - Mac'te görülen 404 sorunu
  - Bir öğrencinin denemelerini artık görebildiğinin teyidi
  - Vercel'de `GEMINI_API_KEY` tanımı

---

## 4. Sıradaki adımlar

1. Telefonda ve bilgisayarda deneme turu:
   - video izleme
   - belletmen programı → koç onayı
   - belletmenin "yapmadı" işaretlemesi
   - platform öğrencisinin konu eklemesi
   - deneme analizi
   - yeni günlük giriş ekranı
   - rapor oluşturma
   - ilk pazartesi otomatik raporunun gelip gelmediği
   - ekip kayıtları (belletmen günlük girince sayfa + bildirim)
   - defter fotoğrafı yükleme ve "Yazıyı oku"
   - sesli dikte (telefon ve bilgisayar)
2. ~~Video izlenme bilgisini öğrenci detay sayfasında göstermek~~ (28 Kasım'da yapıldı).
