# KoçDefterim — Çalışma notları

Son güncelleme: 11 Kasım 2026

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

`exam_self_analysis.sql`, `student_exam_entry.sql`'den **sonra** çalıştırılmalı.

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

### Küçük düzeltmeler
- Öğrenci görevlerinde:
  - "Yapmadım" çarpısı açık kırmızı.
  - "Yaptım" dairesi bekleyen görevde beyaz ve kesik çizgili; yapılan görevde dolu yeşil, altında "Tamamlandı" yazısı var.
- Telefonda açılan pencereler klavyenin altında kalmıyor.
- Öğrenci detayında haftalık program yalnızca güncel programı gösteriyor. Oklar, liste ve "tarihe git" ile önceki programlara geçiliyor.

---

## 3. Yarım kalanlar / bilinen eksikler

- **Platform öğrencisinin konu ilerleyişi boş.** Konuları normalde koç havuzdan ekliyor. Öğrencinin alanına göre konuları kendisinin ekleyebilmesi lazım.
- **Belletmen "yapmadı" işaretleyemiyor.** Belletmen ekranında yalnızca öğrencinin işaretlediği görünüyor. Telefonu olmayan öğrenci için bu işi belletmenin yapabilmesi gerekiyor.
- **Konu ilerleyişinde kim değiştirdi bilinmiyor.** Değişikliğin koçtan mı, öğrenciden mi, belletmenden mi geldiği kaydedilmiyor. Koça "öğrenci konu işaretledi" bildirimi de gitmiyor.
- **Ekranda denenmedi:** Bu turdaki değişiklikler tip ve lint kontrolünden geçti, ama tarayıcıda ve gerçek bir yapay zekâ analiziyle denenmedi.
- **Önceki oturumlardan kalanlar:**
  - Mac'te görülen 404 sorunu
  - Bir öğrencinin denemelerini artık görebildiğinin teyidi
  - Vercel'de `GEMINI_API_KEY` tanımı

---

## 4. Sıradaki adımlar

1. **Belletmenin program yapması:**
   - Belletmen öğrenciye haftalık program hazırlar ve koçun onayına gönderir.
   - Koç onaylayınca program öğrenciye geçer.
   - Öğrencinin kendi programı için kurulan onay sistemi (`student_programs`) kullanılacak; koç tek bir onay listesinde "kim hazırladı" bilgisiyle görecek.
2. **Belletmenin öğrenci adına "yapmadı" işaretlemesi** (günlük giriş ekranında).
3. **Video izlenme takibi:**
   - Koçun ana sayfadan paylaştığı videoları kimin açtığı ve ne kadar izlediği kaydedilecek.
   - YouTube'da izlenen süre ve yüzde tutulabilir; Instagram, TikTok ve X'te yalnızca "açtı / açmadı" tutulabilir.
   - Koç her paylaşımın altında "12 öğrenciden 8'i izledi" özetini ve izlemeyenleri görecek.
4. **Platform öğrencisinin konu ilerleyişi:** Öğrenci, alanına göre konuları havuzdan kendisi ekleyebilecek.
5. *(İsteğe bağlı)* Konu ilerleyişinde değişikliği kimin yaptığının kaydı ve koça bildirim.
