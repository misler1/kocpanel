// Arama odaklı tanıtım sayfaları: her sayfa tek bir arama niyetine ("yks koçu", "lgs koçu" vb.) odaklanır.
// Üst menüdeki "Koç Defterim" açılır menüsü, site haritası ve sayfalar arası bağlantılar bu listeden beslenir.

export type LandingPage = {
  slug: string;
  navLabel: string;
  metaTitle: string;
  description: string;
  keywords: string[];
  eyebrow: string;
  h1: string;
  intro: string[];
  sections: { title: string; body: string[] }[];
  faq: { q: string; a: string }[];
};

export const LANDING_PAGES: LandingPage[] = [
  {
    slug: 'koc-defterim',
    navLabel: 'Koç Defterim nedir?',
    metaTitle: 'Koç Defterim Nedir? YKS ve LGS Eğitim Koçluğu ve Ders Takip Sistemi',
    description: 'Koç Defterim; YKS ve LGS öğrencileri için birebir eğitim koçluğu ile haftalık program, deneme analizi ve veli raporunu bir araya getiren dijital koçluk defteridir.',
    keywords: ['Koç Defterim', 'KoçDefterim', 'koç defteri', 'eğitim koçluğu', 'öğrenci takip sistemi', 'YKS koçluğu', 'LGS koçluğu'],
    eyebrow: 'Koç Defterim',
    h1: 'Koç Defterim: Öğrencinin çalışma defteri, artık koçuyla ortak.',
    intro: [
      'Her koçun bir defteri vardır. İçinde öğrencinin hedefi, geçen haftanın netleri, son görüşmede konuşulanlar, “bu hafta paragrafa ağırlık ver” gibi küçük notlar. Yıllarca bu defterler kâğıttı. Ve kâğıt defterin bir sorunu vardı: Öğrenci o deftere bakamıyordu.',
      'Koç Defterim bu defteri ortak bir yere taşıyor. Koç planı yazıyor, öğrenci her gün ne çalıştığını işaretliyor, veli de çocuğunun gelişimini tahmin etmek yerine görebiliyor.',
      'Ama Koç Defterim yalnızca bir uygulama değil. Arkasında birebir eğitim koçluğu var. Defter, o koçluğun izini tutuyor.',
    ],
    sections: [
      {
        title: 'Koç Defterim ne yapar?',
        body: [
          'Kısaca söylemek gerekirse: YKS ve LGS’ye hazırlanan öğrencinin sınav yılını görünür kılar.',
          'Koç her hafta öğrenciye ders ders, konu konu bir çalışma programı hazırlar. Öğrenci gün içinde bir görevi bitirdiğinde onu işaretler ve kaç soru çözdüğünü, kaçını doğru yaptığını yazar. Deneme sonuçları ders ders kaydedilir, netlerin seyri grafikte görünür. Konu ilerleyişi, görüşme notları ve hedef netler aynı yerde durur.',
          'Bütün bunların amacı öğrenciyi sıkıştırmak değil. Tersine, yükü görünür kılarak yönetilebilir hâle getirmek. Bir öğrenci “çok çalışıyorum ama ilerlemiyorum” dediğinde, defter o cümlenin arkasındaki gerçeği gösterir: Gerçekten çok mu çalışıyor, yoksa sevdiği derse mi kaçıyor? Netler mi durgun, yoksa deneme yayınları mı zorlaştı?',
        ],
      },
      {
        title: 'Kimler için?',
        body: [
          'YKS öğrencileri için: TYT ve AYT dengesini kurmak, deneme sonuçlarını yorumlamak ve tercih hedefini canlı tutmak isteyen 11., 12. sınıf ve mezun öğrenciler.',
          'LGS öğrencileri için: Okul derslerini, yeni nesil soru pratiğini ve deneme takibini düzenli yürütmek isteyen 7. ve 8. sınıf öğrencileri.',
          'Veliler için: Çocuğunun sürecini “ders çalıştın mı?” sorusuna sıkışmadan, gerçek verilerle görmek isteyen aileler. Koç Defterim’de veliye özel bir panel ve PDF olarak indirilebilen gelişim raporu var.',
          'Kurumlar için: Rehberlik servisi, kurs ya da yurt gibi öğrencilerini sınıf ve öğretmen bazında izlemek isteyen eğitim kurumları.',
        ],
      },
      {
        title: 'Koçluk mu, uygulama mı?',
        body: [
          'İkisi birden. Ama sırası belli: önce koçluk.',
          'Bir uygulama sana hatırlatma gönderebilir, grafik çizebilir. Ama deneme sonrası moralin bozulduğunda seninle konuşamaz. Neden üç haftadır geometriye hiç dokunmadığını sana nazikçe soramaz. Bunu bir insan yapar.',
          'Koç Defterim’deki koçluk görüşmelerini Psikolojik Danışman Musa İşler yürütüyor. Görüşmelerde yalnızca haftalık görevler değil; çalışma alışkanlıkları, motivasyon, sınav kaygısı ve hedefin kendisi de konuşuluyor. Uygulama ise bu görüşmelerin arasında kalan altı günü taşıyor.',
        ],
      },
      {
        title: 'Yüz yüze ve online',
        body: [
          'Görüşmeler İstanbul Ümraniye’de yüz yüze, Türkiye’nin her yerinden ise online yapılabiliyor. Online görüşmede de öğrenci ve koç aynı defteri kullandığı için mesafe takibi zorlaştırmıyor.',
          'Öğrenci programını telefonundan görüyor, koçuna uygulama içinden mesaj yazabiliyor. Koç da her gün öğrencinin ne çalıştığını, hangi görevin geride kaldığını görüyor.',
        ],
      },
      {
        title: 'Neden “defter”?',
        body: [
          'Çünkü bir defter kişiseldir. Herkesin defteri farklıdır. Hazır bir program şablonu herkese aynı şeyi verir. Bir defter ise sahibinin hayatını, ritmini, zorlandığı yerleri taşır.',
          'Koç Defterim’de de her öğrencinin programı, okul saatlerine, kurs günlerine, deneme takvimine ve o haftaki moraline göre şekilleniyor. Bir hafta yoğun geçtiyse ertesi hafta hafifliyor. Bir konu denemede zayıf çıktıysa, bir sonraki haftanın programına geri dönüyor.',
          'Kısacası defter, öğrenciyle birlikte değişiyor.',
        ],
      },
    ],
    faq: [
      { q: 'Koç Defterim nedir?', a: 'Koç Defterim, YKS ve LGS öğrencileri için birebir eğitim koçluğunu; haftalık çalışma programı, günlük çalışma kaydı, deneme analizi, konu takibi ve veli raporuyla bir araya getiren dijital koçluk defteridir.' },
      { q: 'KoçDefterim ve Koç Defterim aynı şey mi?', a: 'Evet. Marka adımız bitişik (KoçDefterim) ya da ayrı (Koç Defterim) yazılabiliyor; ikisi de aynı koçluk hizmetini ve aynı uygulamayı ifade ediyor.' },
      { q: 'Koç Defterim’i kimler kullanabilir?', a: 'Koçluk alan öğrenciler, onların velileri ve koçlar. Ayrıca öğrencilerini sınıf ve öğretmen bazında izlemek isteyen eğitim kurumları da kullanabiliyor.' },
      { q: 'Koçluk görüşmeleri nerede yapılıyor?', a: 'İstanbul Ümraniye’de yüz yüze, Türkiye’nin her yerinden ise online olarak.' },
      { q: 'Veliler süreci nasıl takip ediyor?', a: 'Veliler kendilerine açılan veli paneline telefon numaralarıyla giriş yapıp çocuklarının haftalık programını, çözdüğü soruları, deneme sonuçlarını ve hedef netlerini görebiliyor. Koç ayrıca veliye giriş gerektirmeyen bir rapor linki gönderebiliyor; rapor PDF olarak da indirilebiliyor.' },
    ],
  },
  {
    slug: 'yks-kocu',
    navLabel: 'YKS Koçu',
    metaTitle: 'YKS Koçu: Birebir TYT-AYT Koçluğu ve Deneme Takibi | Koç Defterim',
    description: 'YKS koçu ne yapar, en iyi YKS koçu nasıl seçilir? TYT ve AYT için birebir eğitim koçluğu, haftalık program, deneme analizi ve veli raporu. Ümraniye’de yüz yüze, Türkiye geneli online.',
    keywords: ['YKS koçu', 'YKS koçluğu', 'en iyi YKS koçu', 'TYT AYT koçluk', 'online YKS koçu', 'Ümraniye YKS koçu', 'üniversite sınavı koçu'],
    eyebrow: 'YKS Koçluğu',
    h1: 'YKS koçu: Sana ne çalışacağını değil, nasıl ilerleyeceğini gösteren biri.',
    intro: [
      'Bir YKS öğrencisinin önünde aylarca süren bir yol var. TYT, AYT, onlarca konu, yüzlerce deneme. Ve çoğu öğrenci bu yolu yalnız yürümeye çalışıyor: İnternetten bulduğu bir program, arkadaşının önerdiği kaynaklar, her deneme sonrası değişen bir moral.',
      'Bir YKS koçu bu yolda sana eşlik eder. Senin yerine çalışmaz; ama nereye baktığını, neyi atladığını, nerede takılıp kaldığını görmeni sağlar.',
      'Koç Defterim’de YKS koçluğu birebir görüşmelerle ve her gün kullanılan bir çalışma defteriyle yürüyor.',
    ],
    sections: [
      {
        title: 'YKS koçu ne yapar?',
        body: [
          'Önce tabloyu çıkarır. Hedef bölümün ne, son denemelerin nerede, hangi derste nasıl bir eksik var, haftada gerçekten kaç saatin var? Okul, dershane, ulaşım, uyku… Hepsi masaya konur.',
          'Sonra bu tabloya göre haftalık bir program kurar. “Matematik çalış” gibi genel görevler değil; hangi konu, hangi kaynak, kaç soru. Program senin hayatına göre şekillenir. Okulun yoğun olduğu gün hafif, boş günün derin çalışma ile dolar.',
          'Her denemeden sonra yanlışlarına birlikte bakılır. Netin neden artmadığı, zamanın nerede kaybolduğu, hangi konunun tekrar programa girmesi gerektiği konuşulur. Bir sonraki haftanın planı bu analize göre değişir.',
          'Ve bazen konu ders olmaz. Denemeden sonra yaşadığın hayal kırıklığı, ailenden gelen baskı, motivasyonun düştüğü haftalar… Bir koç bunları da duyar. Çünkü bu konuşulmadığında, en iyi program bile kâğıt üzerinde kalır.',
        ],
      },
      {
        title: 'TYT ve AYT dengesi',
        body: [
          'YKS’de yerleştirme puanına TYT yüzde 40, AYT yüzde 60 katkı yapıyor. Bu oran, öğrencilerin çoğunu iki uç arasında savuruyor: Ya TYT’yi bırakıp AYT’ye geçiyorlar ya da TYT’de takılıp AYT’ye hiç başlayamıyorlar.',
          'Bir YKS koçunun asıl işlerinden biri bu dengeyi senin netlerine, sınıfına ve hedefine göre kurmak. TYT’si 60 netin altında olan bir öğrenciyle, TYT’si 100’ü geçmiş bir öğrencinin haftası aynı olamaz.',
          'Bu konuyu ayrıntılı olarak “TYT mi AYT mi Öncelikli?” yazımızda anlattık.',
        ],
      },
      {
        title: 'En iyi YKS koçu nasıl seçilir?',
        body: [
          '“En iyi YKS koçu” diye arama yapan birine dürüst bir cevap vermek istiyorum: Herkes için en iyi tek bir koç yok. Senin için en iyi koç, senin ihtiyacına uyan koç.',
          'Yine de seçerken bakabileceğin birkaç ölçüt var. Birincisi: Koç, senin hakkında karar vermeden önce seni dinliyor mu? İlk görüşmede sana hazır bir program uzatan biri, senin hayatını tanımadan plan yapıyor demektir.',
          'İkincisi: Takip nasıl yapılıyor? Haftada bir görüşüp aradaki altı günü sana bırakan bir koçlukla, her gün ne çalıştığını görebilen bir koçluk aynı şey değil.',
          'Üçüncüsü: Koç sadece dersle mi ilgileniyor? Sınav yılı yalnızca akademik bir süreç değil. Kaygı, motivasyon ve aile ilişkileri de netlerin içinde. Bu alanlarda eğitimi ve deneyimi olan bir koç, sana daha geniş bir destek sunar.',
          'Dördüncüsü: Veli süreçten nasıl haberdar oluyor? Velinin sürekli “ders çalıştın mı?” diye sorduğu bir ev, öğrenciyi yorar. Velinin gelişimi düzenli olarak görebildiği bir sistem, evdeki gerginliği azaltır.',
          'Beşincisi: Kendini rahat hissediyor musun? Bir koçla aylarca çalışacaksın. Ona zorlandığını, kaçtığını, korktuğunu söyleyebiliyor olman gerekiyor.',
        ],
      },
      {
        title: 'Koç Defterim’de YKS koçluğu nasıl işliyor?',
        body: [
          'İlk görüşmede hedefin, mevcut durumun ve haftalık zamanın konuşulur. Ardından ilk haftalık program hazırlanır ve Koç Defterim uygulamasına yüklenir.',
          'Gün içinde bir görevi bitirdiğinde onu uygulamada işaretlersin ve kaç soru çözdüğünü yazarsın. Plan dışı çalıştıysan onu da eklersin. Çalışma serini, rozetlerini ve hedef netine ne kadar yaklaştığını görürsün.',
          'Koçun her gün ne çalıştığını görür. Bir görev üç gündür bekliyorsa ya da bir dersten hiç soru çözülmüyorsa bunu fark eder ve seninle konuşur. Deneme sonuçların ders ders kaydedilir; görüşmelerde bu veriler üzerinden konuşulur.',
          'Velin de kendi panelinden programını ve gelişimini görebilir. Koçun ona düzenli olarak bir gelişim raporu da gönderebilir.',
        ],
      },
      {
        title: 'Koç kim?',
        body: [
          'Koç Defterim’deki YKS koçluğunu Psikolojik Danışman Musa İşler yürütüyor. 2014 yılında Marmara Üniversitesi Psikolojik Danışmanlık ve Rehberlik bölümünden mezun oldu; uzun yıllar okullarda öğrenci, veli ve öğretmenlerle rehberlik çalışmaları yürüttü.',
          'Koçluk görüşmelerinde akademik planlamanın yanında sınav kaygısı, motivasyon ve çalışma alışkanlıkları da ele alınıyor. Görüşmeler İstanbul Ümraniye’de yüz yüze, Türkiye’nin her yerinden ise online yapılabiliyor.',
        ],
      },
    ],
    faq: [
      { q: 'YKS koçu ne iş yapar?', a: 'YKS koçu öğrencinin hedefini, netlerini ve haftalık zamanını değerlendirip ona özel bir çalışma programı hazırlar, denemeleri birlikte analiz eder, programı her hafta bu analize göre günceller ve motivasyon, kaygı gibi sınav sürecindeki zorluklarda öğrenciye eşlik eder.' },
      { q: 'YKS koçluğu kaçıncı sınıfta başlamalı?', a: 'Kesin bir kural yok. 11. sınıfta başlamak okul derslerini sağlam tutmak ve TYT temelini kurmak için zaman kazandırır. 12. sınıf ve mezun öğrenciler için ise koçluk, kalan zamanı en verimli şekilde kullanmayı sağlar.' },
      { q: 'Online YKS koçluğu yüz yüze kadar işe yarar mı?', a: 'Takip düzenli yapıldığında evet. Koç Defterim’de öğrenci ve koç aynı uygulamayı kullandığı için koç, öğrencinin her gün ne çalıştığını online görüşmede de görebiliyor.' },
      { q: 'En iyi YKS koçu nasıl anlaşılır?', a: 'Öğrenciyi dinleyerek program hazırlayan, takibi yalnızca haftalık görüşmeye bırakmayan, ders kadar motivasyon ve kaygıyla da ilgilenen, veliyi sürece dahil eden ve öğrencinin kendini rahat ifade edebildiği koç, o öğrenci için iyi bir koçtur.' },
      { q: 'YKS koçluğuna nasıl başvurabilirim?', a: 'Sitedeki öğrenci kayıt formunu doldurarak başvurabilirsin. Başvurunun ardından tanışma görüşmesi için seninle iletişime geçilir.' },
    ],
  },
  {
    slug: 'lgs-kocu',
    navLabel: 'LGS Koçu',
    metaTitle: 'LGS Koçu: 8. Sınıf İçin Birebir LGS Koçluğu ve Takip | Koç Defterim',
    description: 'LGS koçu ne yapar, en iyi LGS koçu nasıl seçilir? 7. ve 8. sınıf öğrencileri için birebir LGS koçluğu, haftalık program, deneme analizi, sınav kaygısı desteği ve veli paneli.',
    keywords: ['LGS koçu', 'LGS koçluğu', 'en iyi LGS koçu', '8. sınıf koçluk', 'online LGS koçu', 'Ümraniye LGS koçu', 'liseye geçiş koçluğu'],
    eyebrow: 'LGS Koçluğu',
    h1: 'LGS koçu: 14 yaşında bir öğrencinin ilk büyük sınavında yanında olan biri.',
    intro: [
      'LGS çoğu öğrencinin hayatındaki ilk büyük sınav. 13-14 yaşında bir çocuk, bir yandan okul derslerini yetiştirmeye, bir yandan yeni nesil sorulara alışmaya, bir yandan da bütün ailenin beklentisini taşımaya çalışıyor.',
      'Bu yükü taşımak için yalnızca daha fazla test kitabına değil, bir düzene ve bir rehbere ihtiyaç var. LGS koçu tam olarak bunu sağlar.',
      'Koç Defterim’de LGS koçluğu; öğrencinin yaşına uygun bir dille, birebir görüşmelerle ve aileyi de sürece dahil eden bir takip sistemiyle yürüyor.',
    ],
    sections: [
      {
        title: 'LGS koçu ne yapar?',
        body: [
          'LGS koçu önce öğrenciyi tanır. Okulda hangi derslerde zorlanıyor? Ders çalışma alışkanlığı var mı? Deneme sonuçları nerede? Okul ve kurs dışında ne kadar zamanı var?',
          'Sonra bu tabloya göre haftalık bir program hazırlar. LGS’de bir öğrencinin okul derslerinden kopmadan sınava hazırlanması gerekiyor; bu yüzden program okulda o hafta işlenen konularla uyumlu ilerler.',
          'Denemeler ders ders analiz edilir. Türkçe, Matematik ve Fen Bilimlerinin katsayısı 4, diğer derslerin katsayısı 1 olduğu için bu üç derse özel bir dikkat gösterilir. Ama diğer derslerdeki kolay netler de ihmal edilmez.',
          'Ve en az bunlar kadar değerli bir iş: Öğrencinin kaygısını, isteksiz olduğu dönemlerini ve aileyle yaşadığı gerginlikleri duymak.',
        ],
      },
      {
        title: 'LGS koçluğunda veli nerede durur?',
        body: [
          'YKS’de öğrenci genellikle kendi sürecini kendisi yönetir. LGS’de ise aile çok daha yakındadır. Bu yakınlık bazen destek, bazen de baskıya dönüşebiliyor.',
          'Koç Defterim’de veliler kendilerine özel bir panelden çocuklarının haftalık programını, çözdüğü soruları, deneme sonuçlarını ve hedef netlerini görebiliyor. Böylece evde sürekli “ders çalıştın mı, kaç net yaptın?” sorusuna gerek kalmıyor; veri zaten görünür.',
          'Veli görüşmelerinde ise rakamların ötesine geçiliyor. Çocuğun bu süreçte nasıl desteklenebileceği, evde nasıl bir dilin işe yaradığı, kaygının nasıl azaltılabileceği konuşuluyor.',
        ],
      },
      {
        title: 'En iyi LGS koçu nasıl seçilir?',
        body: [
          '“En iyi LGS koçu” araması yapan bir veliye dürüst bir şey söylemek istiyorum: En iyi koç, çocuğunuzun ihtiyacına en iyi cevap veren koçtur. Bu da her çocuk için farklı.',
          'Yine de seçerken bakabileceğiniz birkaç ölçüt var. Birincisi: Koç çocuğunuzla onun yaşına uygun bir dille konuşabiliyor mu? 8. sınıftaki bir öğrenciyle bir YKS öğrencisiyle aynı şekilde konuşulmaz.',
          'İkincisi: Koç sadece dersle mi ilgileniyor? LGS sürecinde sınav kaygısı, motivasyon düşüklüğü ve ergenliğin getirdiği değişimler sıkça karşımıza çıkıyor. Psikolojik danışmanlık ve rehberlik alanında eğitimi olan bir koç, bu konularda çocuğunuza daha sağlıklı bir destek sunar.',
          'Üçüncüsü: Siz süreçten nasıl haberdar oluyorsunuz? Düzenli rapor, veli paneli ya da veli görüşmesi gibi bir sistem var mı?',
          'Dördüncüsü: Program okul düzeniyle uyumlu mu? Okulun yükünü görmezden gelen bir program, çocuğu kısa sürede yorar.',
          'Beşincisi: Çocuğunuz koçuyla rahat konuşabiliyor mu? İlk görüşmeden sonra ona sorun. Cevabı, size çok şey anlatacak.',
        ],
      },
      {
        title: 'Koç Defterim’de LGS koçluğu',
        body: [
          'İlk görüşmede öğrenci ve veliyle birlikte hedef, mevcut durum ve haftalık düzen konuşulur. Ardından ilk haftalık program hazırlanır.',
          'Öğrenci programını Koç Defterim uygulamasında görür, çalıştığı her görevi işaretler ve kaç soru çözdüğünü yazar. Çalışma serisi ve rozetler, özellikle bu yaş grubunda düzenli çalışma alışkanlığını desteklemek için tasarlandı.',
          'Koç her gün öğrencinin ne çalıştığını görür. Deneme sonuçları ders ders kaydedilir ve görüşmelerde bu veriler üzerinden konuşulur. Veli de kendi panelinden süreci izler.',
          'Koçluk görüşmelerini Psikolojik Danışman Musa İşler yürütüyor. Görüşmeler İstanbul Ümraniye’de yüz yüze, Türkiye’nin her yerinden ise online yapılabiliyor.',
        ],
      },
    ],
    faq: [
      { q: 'LGS koçu ne iş yapar?', a: 'LGS koçu öğrencinin okul düzenine uygun haftalık bir program hazırlar, denemeleri ders ders analiz eder, programı bu analize göre günceller, sınav kaygısı ve motivasyon gibi konularda öğrenciye eşlik eder ve veliyi sürece dahil eder.' },
      { q: 'LGS koçluğuna ne zaman başlanmalı?', a: '7. sınıfın ikinci döneminde ya da 8. sınıfın başında başlamak, öğrencinin okul derslerini ve sınav hazırlığını birlikte yürütmesi için yeterli zaman sağlar. Ancak 8. sınıfın ortasında başlayan öğrenciler için de düzenli bir takip fark yaratabilir.' },
      { q: 'Online LGS koçluğu 8. sınıf öğrencisi için uygun mu?', a: 'Evet. Koç Defterim’de öğrenci programını uygulamadan takip ediyor, koç da her gün ne çalışıldığını görüyor. Veli de kendi panelinden süreci izleyebildiği için online koçlukta takip kopmuyor.' },
      { q: 'En iyi LGS koçu nasıl anlaşılır?', a: 'Çocuğunuzla yaşına uygun bir dille konuşan, ders kadar kaygı ve motivasyonla da ilgilenen, okul düzenine uygun program yapan, sizi süreçten düzenli olarak haberdar eden ve çocuğunuzun rahat iletişim kurabildiği koç, onun için iyi bir koçtur.' },
      { q: 'Veliler LGS sürecini nasıl takip edebilir?', a: 'Koç Defterim’de veliler kendilerine açılan veli paneline giriş yaparak çocuklarının haftalık programını, çözdüğü soruları, deneme sonuçlarını ve hedef netlerini görebiliyor. Koç ayrıca PDF olarak indirilebilen bir gelişim raporu da gönderebiliyor.' },
    ],
  },
  {
    slug: 'egitim-kocu',
    navLabel: 'Eğitim Koçu',
    metaTitle: 'Eğitim Koçu Nedir, Ne Yapar? Öğrenci Koçluğu | Koç Defterim',
    description: 'Eğitim koçu nedir, ne yapar, rehber öğretmenden ve özel dersten farkı ne? YKS ve LGS öğrencileri için birebir eğitim koçluğu, çalışma planı, motivasyon ve sınav kaygısı desteği.',
    keywords: ['eğitim koçu', 'eğitim koçluğu', 'öğrenci koçu', 'öğrenci koçluğu', 'akademik koçluk', 'sınav koçu', 'online eğitim koçu'],
    eyebrow: 'Eğitim Koçluğu',
    h1: 'Eğitim koçu: Öğrencinin kendi çalışma düzenini kurmasına eşlik eden kişi.',
    intro: [
      'Özel ders öğretmeni sana bir konuyu anlatır. Rehber öğretmen okuldaki yüzlerce öğrenciye yol göstermeye çalışır. Peki her hafta senin planına bakan, denemeden sonra seninle oturan, bir haftadır neden masaya oturamadığını soran kim?',
      'İşte eğitim koçu tam bu boşluğu doldurur.',
      'Eğitim koçluğu, öğrencinin ne çalışacağını bilmesinden çok, nasıl çalışacağını, neden çalıştığını ve zorlandığında ne yapacağını bulmasına yardım eder.',
    ],
    sections: [
      {
        title: 'Eğitim koçu ne yapar?',
        body: [
          'Eğitim koçu öğrenciyle birlikte bir hedef belirler ve o hedefe giden yolu haftalara böler. Her hafta bir çalışma programı hazırlar, haftanın sonunda programın ne kadarının yapıldığına, neyin aksadığına ve nedenine birlikte bakar.',
          'Denemeleri analiz eder. Netin artmadığı dönemlerde sorunun nerede olduğunu bulmaya çalışır: Konu eksiği mi, zaman yönetimi mi, dikkat mi, yoksa kaygı mı?',
          'Ve öğrencinin çalışma alışkanlıklarıyla ilgilenir. Erteleme, telefon, düzensiz uyku, sevdiği derse kaçma… Bunlar konu anlatımıyla çözülmeyen ama netleri doğrudan etkileyen meselelerdir.',
        ],
      },
      {
        title: 'Eğitim koçu, rehber öğretmen ve özel ders arasındaki fark',
        body: [
          'Özel ders öğretmeni belirli bir dersin içeriğini öğretir. Matematikte türevi anlamıyorsan, bunu sana o anlatır. Eğitim koçu ise ders anlatmaz; hangi konuyu ne zaman, hangi kaynakla, ne kadar çalışacağını planlar ve takip eder.',
          'Okuldaki rehber öğretmen çok değerli bir iş yapar ama genellikle yüzlerce öğrenciden sorumludur. Her öğrencinin haftalık programını tek tek izlemesi çoğu zaman mümkün değildir. Eğitim koçu ise birebir çalışır ve öğrencinin sürecini haftalık olarak takip eder.',
          'Yani bu üçü birbirinin alternatifi değil, tamamlayıcısı. Bir öğrenci aynı anda özel ders alabilir, okulun rehberlik servisinden destek görebilir ve bir eğitim koçuyla çalışabilir.',
        ],
      },
      {
        title: 'Eğitim koçluğu kimlere iyi gelir?',
        body: [
          'Çok çalıştığı halde netleri artmayan öğrencilere. Çoğu zaman sorun emek değil, emeğin yönüdür.',
          'Plan yapan ama sürdüremeyen öğrencilere. Bir program yazmak kolaydır; zor olan, onu üç hafta sonra hâlâ uyguluyor olmaktır.',
          'Sınav kaygısı yaşayan öğrencilere. Kaygı konuşulduğunda ve yönetmenin yolları öğrenildiğinde, bildiklerini sınavda gösterebilmek kolaylaşır.',
          'Ve çocuğunun sürecini anlamak isteyen ama sürekli soru sorarak evde gerginlik yaratmak istemeyen velilere.',
        ],
      },
      {
        title: 'Eğitim koçu seçerken neye bakmalı?',
        body: [
          'Eğitim koçluğu alanında henüz tek tip bir yetkinlik belgesi yok. Bu yüzden seçerken koçun eğitimine ve deneyimine bakmakta fayda var. Psikolojik danışmanlık ve rehberlik, eğitim bilimleri ya da öğretmenlik gibi alanlarda eğitim almış ve öğrencilerle uzun süre çalışmış biri, hem akademik hem de duygusal konularda daha sağlam bir destek sunar.',
          'Takibin nasıl yapıldığını sor. Haftada bir görüşme mi, yoksa günlük takip de var mı? Veli sürece nasıl dahil oluyor?',
          'Ve ilk görüşmeye dikkat et. Seni dinlemeden sana hazır bir program uzatan bir koç, senin hayatını tanımadan plan yapıyor demektir.',
        ],
      },
      {
        title: 'Koç Defterim’de eğitim koçluğu',
        body: [
          'Koç Defterim’de eğitim koçluğunu Psikolojik Danışman Musa İşler yürütüyor. Marmara Üniversitesi Psikolojik Danışmanlık ve Rehberlik bölümünden 2014 yılında mezun oldu; okullarda uzun yıllar öğrenci, veli ve öğretmenlerle rehberlik çalışmaları yürüttü.',
          'Koçluk görüşmeleri, Koç Defterim uygulamasıyla destekleniyor. Öğrenci programını uygulamadan takip edip çalıştıklarını işaretliyor; koç her gün süreci görüyor; veli de kendi panelinden gelişimi izliyor.',
          'Görüşmeler İstanbul Ümraniye’de yüz yüze, Türkiye’nin her yerinden ise online yapılabiliyor.',
        ],
      },
    ],
    faq: [
      { q: 'Eğitim koçu nedir?', a: 'Eğitim koçu, öğrencinin akademik hedefini belirlemesine, bu hedefe uygun bir çalışma düzeni kurmasına ve bu düzeni sürdürmesine birebir eşlik eden kişidir. Ders anlatmaz; planlar, takip eder, analiz eder ve öğrencinin zorlandığı noktalarda yol gösterir.' },
      { q: 'Eğitim koçu ile özel ders öğretmeni arasındaki fark nedir?', a: 'Özel ders öğretmeni belirli bir dersin konularını öğretir. Eğitim koçu ise ders anlatmaz; öğrencinin bütün derslerdeki çalışma planını, deneme sonuçlarını, çalışma alışkanlıklarını ve motivasyonunu takip eder.' },
      { q: 'Eğitim koçluğu ne kadar sürer?', a: 'Genellikle bir sınav dönemi boyunca, yani birkaç ay ile bir yıl arasında sürer. Bazı öğrenciler kısa bir süre çalışma düzenini kurmak için, bazıları ise sınava kadar düzenli takip için koçluk alır.' },
      { q: 'Online eğitim koçluğu mümkün mü?', a: 'Evet. Koç Defterim’de görüşmeler online da yapılabiliyor ve öğrenci ile koç aynı uygulamayı kullandığı için takip mesafeden etkilenmiyor.' },
    ],
  },
  {
    slug: 'ders-takibi',
    navLabel: 'Ders Takibi',
    metaTitle: 'Ders Takibi: Öğrenci Ders ve Çalışma Takip Sistemi | Koç Defterim',
    description: 'Öğrencinin ders takibi nasıl yapılır? Haftalık program, günlük çalışma kaydı, soru takibi, deneme analizi, konu ilerleyişi ve veli raporunu bir araya getiren ders takip sistemi.',
    keywords: ['ders takibi', 'ders takip sistemi', 'öğrenci takip sistemi', 'çalışma takibi', 'soru takibi', 'deneme takibi', 'veli takip'],
    eyebrow: 'Ders Takibi',
    h1: 'Ders takibi: “Ders çalıştın mı?” sorusunun yerine geçen düzen.',
    intro: [
      'Akşam yemeği. Masada bir sessizlik. Sonra o soru geliyor: “Bugün ders çalıştın mı?” Cevap genellikle kısa: “Çalıştım.” Konu kapanıyor. Ama kimse tam olarak ne çalışıldığını bilmiyor. Öğrenci bile bazen.',
      'Ders takibi, bu belirsizliğin yerine bir düzen koymak demek. Ne planlandı, ne yapıldı, kaç soru çözüldü, hangi konu geride kaldı, denemeler nereye gidiyor… Hepsi bir yerde, herkesin görebileceği şekilde.',
      'Koç Defterim tam olarak bunun için tasarlandı.',
    ],
    sections: [
      {
        title: 'İyi bir ders takibi neleri kapsar?',
        body: [
          'Haftalık plan: Hangi ders, hangi konu, hangi kaynak, kaç soru. Genel bir “matematik çalış” görevi değil, net bir iş tanımı.',
          'Günlük kayıt: O gün gerçekten ne yapıldı? Plandaki görev bitti mi, kaç soru çözüldü, kaçı doğru, kaçı yanlış? Plan dışında yapılan çalışmalar da bu kayda girer.',
          'Deneme takibi: Her denemenin sonucu ders ders kaydedilir. Tek bir denemeye değil, netlerin birkaç haftalık seyrine bakılır.',
          'Konu ilerleyişi: Hangi konular bitti, hangileri devam ediyor, hangileri hiç başlanmadı? Denemede zayıf çıkan bir konu, “bitti” işaretli olsa bile tekrar programa döner.',
          'Hedef: Öğrencinin ulaşmak istediği net ve bu nete ne kadar yaklaştığı.',
        ],
      },
      {
        title: 'Koç Defterim’de ders takibi nasıl yapılıyor?',
        body: [
          'Koç her hafta öğrenciye uygulama üzerinden bir program gönderiyor. Öğrenci gün içinde bir görevi bitirdiğinde onu işaretliyor ve uygulama ona kısa bir soru soruyor: Kaç soru çözdün, kaçı doğru, kaçı yanlış, kaç dakika çalıştın? Böylece görevi işaretlemek ile günlük kaydı tutmak tek bir adımda oluyor.',
          'Öğrenci plan dışında bir şey çalıştıysa onu da ekleyebiliyor. Çalışma serisi, rozetler ve hedef net kartı, düzenli çalışmayı görünür ve biraz da eğlenceli kılıyor.',
          'Koç her öğrencinin günlük kayıtlarını, deneme sonuçlarını ve konu ilerleyişini tek ekranda görüyor. Bir görev günlerdir bekliyorsa ya da bir dersten hiç soru çözülmüyorsa bunu hemen fark ediyor.',
        ],
      },
      {
        title: 'Veliler için ders takibi',
        body: [
          'Veliler için ders takibinin en büyük kazancı, evdeki o akşam yemeği sorusunun gereksizleşmesi.',
          'Koç Defterim’de velilere özel bir panel var. Veli telefon numarasıyla giriş yapıp çocuğunun bu haftaki programını, son 14 günde çözdüğü soruları, deneme sonuçlarını ve hedef netlerini görebiliyor. Koç ayrıca veliye giriş gerektirmeyen bir rapor linki gönderebiliyor; bu rapor PDF olarak da indirilebiliyor.',
          'Bu şeffaflık bir denetim aracı değil. Amaç, veliyle öğrenci arasındaki konuşmayı “çalıştın mı?” sorusundan kurtarıp “bu hafta nasıl gitti, nerede zorlandın?” sorusuna taşımak.',
        ],
      },
      {
        title: 'Takip mi, baskı mı?',
        body: [
          'Ders takibi yanlış kullanıldığında bir baskı aracına dönüşebiliyor. Her kaçan görev için bir uyarı, her düşük deneme için bir sorgu… Bu durumda öğrenci kaydı tutmayı bırakır ya da gerçeği yazmamaya başlar.',
          'Koç Defterim’de takibin amacı yargılamak değil, görmek. Bir görev yapılmadıysa bunun bir nedeni vardır; belki program çok ağırdı, belki o hafta okul çok yoğundu, belki de öğrenci bir konuda tıkanmıştı. Veri, bu nedenleri konuşmak için bir başlangıç noktası.',
          'İyi bir takip, öğrenciye “Seni izliyorum” değil, “Seni görüyorum” der.',
        ],
      },
      {
        title: 'Kurumlar için ders takibi',
        body: [
          'Koç Defterim yalnızca bireysel koçluk için değil, okul rehberlik servisleri, kurslar ve yurtlar gibi kurumlar için de kullanılabiliyor.',
          'Kurumlar öğrencilerini kurum ve sınıf/şube bazında gruplayabiliyor. Rehber öğretmen, koç, stajyer öğretmen gibi farklı roller için farklı yetkiler tanımlanabiliyor. Böylece herkes kendi sorumluluğundaki öğrencileri görüyor, öğrenci bilgileri kontrolsüz biçimde dağılmıyor.',
        ],
      },
    ],
    faq: [
      { q: 'Ders takibi nasıl yapılır?', a: 'Etkili bir ders takibi; haftalık bir çalışma planı, o planın günlük olarak ne kadarının yapıldığını gösteren bir kayıt, çözülen soru sayıları, deneme sonuçları ve konu ilerleyişinden oluşur. Koç Defterim bu kayıtların hepsini tek bir uygulamada topluyor.' },
      { q: 'Öğrenci ders takip sistemi ne işe yarar?', a: 'Öğrencinin ne planladığını ve gerçekte ne yaptığını görünür kılar. Böylece koç programı veriye göre güncelleyebilir, öğrenci kendi ilerleyişini görebilir, veli de çocuğunun sürecini tahmin etmek yerine bilerek takip edebilir.' },
      { q: 'Veliler ders takibini nasıl görebilir?', a: 'Koç Defterim’de veliler kendilerine açılan veli paneline telefon numaralarıyla giriş yaparak çocuklarının programını, çözdüğü soruları ve deneme sonuçlarını görebiliyor. Koç ayrıca PDF olarak indirilebilen bir rapor linki de gönderebiliyor.' },
      { q: 'Koç Defterim’i kurumlar kullanabilir mi?', a: 'Evet. Okul rehberlik servisleri, kurslar ve yurtlar öğrencilerini kurum ve sınıf bazında izleyebiliyor; farklı roller için farklı yetkiler tanımlanabiliyor.' },
    ],
  },
];

export function getLandingPage(slug: string) {
  return LANDING_PAGES.find((page) => page.slug === slug);
}
