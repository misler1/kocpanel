import type { Article } from '../marketing-content';

// Dil sınavı (YDT) rehber yazıları: dil puanıyla tercih yapacak öğrenciye doğrudan hitap eden yazılar.
export const dilGuideArticles: Article[] = [
  {
    category: 'dil-sinav-koclugu',
    slug: 'ydt-nedir-soru-dagilimi',
    title: 'YDT Nedir, Soru Dağılımı Nasıl? YDT İngilizce Rehberi',
    description: 'YDT nedir, kaç soru ve kaç dakika? YDT İngilizce soru dağılımı, soru tipleri, puan hesabı ve DİL puanında TYT ile YDT ağırlıkları tek yazıda.',
    intro: [
      'Dil sınıfındasın ya da dil puanıyla tercih yapmayı düşünüyorsun. Etrafındakiler “YDT” diyor, “dil puanı” diyor, “TYT de var mı?” diye soruyor. Sen de bir yerden başlamak istiyorsun ama nereden?',
      'İyi bir haber: YDT, yapısı en tutarlı sınavlardan biri. Her yıl benzer soru tipleri, benzer bir sırayla karşına çıkıyor. Bu da ona hazırlanmayı daha planlı hâle getiriyor.',
      'Bu yazıda YDT’nin ne olduğunu, kaç soru ve kaç dakika sürdüğünü, puanının nasıl hesaplandığını ve hangi soru tiplerinden oluştuğunu anlatacağım. Sonunda da bu bilgiyle çalışma planını nasıl kurabileceğine bakacağız.',
    ],
    sections: [
      {
        title: 'YDT nedir?',
        body: [
          'YDT, Yükseköğretim Kurumları Sınavının (YKS) üçüncü oturumu olan Yabancı Dil Testi. Dil puanıyla öğrenci alan bölümlere, örneğin İngilizce Öğretmenliği, Mütercim-Tercümanlık ya da dil ve edebiyat bölümlerine girmek istiyorsan bu sınava girmen gerekiyor.',
          'YDT beş dilde yapılıyor: Almanca, Arapça, Fransızca, İngilizce ve Rusça. Adayların büyük çoğunluğu İngilizceyi seçiyor. Bu yazıda verdiğim soru tipleri de İngilizce üzerinden; diğer dillerde yapı büyük ölçüde benzer.',
          'YKS’nin sonuçları açıklanırken 2026’da YDT’ye 203 bin 640 aday başvurdu, 143 bin 270 aday sınava girdi. Başvuranların yaklaşık yüzde 30’u sınava gelmedi.',
        ],
      },
      {
        title: 'YDT kaç soru, kaç dakika?',
        body: [
          'YDT’de 80 soru ve 120 dakika var. Soru başına ortalama 1,5 dakika düşüyor.',
          'Kâğıt üzerinde rahat görünüyor. Ama okuma parçaları ve paragraf soruları bu sürenin büyük kısmını yer. Kelime ve dil bilgisi sorularını hızlı geçemeyen öğrenci, sınavın sonundaki okuma parçalarına zaman bulamaz.',
          'YKS’nin diğer oturumlarında olduğu gibi YDT’de de dört yanlış bir doğruyu götürür. Yani tahmin yaparken dikkatli ol; ama iki şıkkı eleyebildiğin sorularda işaretlemek çoğu zaman sana kazandırır.',
        ],
      },
      {
        title: 'DİL puanı nasıl hesaplanır?',
        body: [
          'Dil puanına TYT yüzde 40, YDT yüzde 60 oranında katkı yapar. Buna okul başarı puanın da eklenir.',
          'Bu oran, dil öğrencilerinin en sık gözden kaçırdığı noktalardan biri. Dil öğrencisi TYT’ye hiç çalışmadan sadece YDT’ye odaklanırsa, puanının neredeyse yarısını şansa bırakmış olur. TYT’de özellikle Türkçe ve Sosyal Bilimler, dil öğrencileri için görece hızlı net kazanılabilecek alanlar.',
          'Somut bir örnek: YDT’de çok iyi olan ama TYT’de zayıf kalan bir öğrenci, YDT’si biraz daha düşük ama TYT’si dengeli bir öğrencinin gerisinde kalabilir. Dil puanında denge, tek bir sınavdaki parlaklıktan daha çok iş görür.',
        ],
      },
      {
        title: 'YDT İngilizce soru tipleri ve yaklaşık dağılımı',
        body: [
          'Soru sayıları yıldan yıla bir iki soru oynayabiliyor. Aşağıdaki dağılım son yılların sınavlarına göre yaklaşık bir tablo; kesin sayıları o yılın ÖSYM kitapçığından kontrol edebilirsin.',
          'Kelime bilgisi: Yaklaşık 5-6 soru. Cümledeki boşluğa uygun kelimeyi ya da kalıbı bulursun.',
          'Dil bilgisi: Yaklaşık 10 soru. Zamanlar, bağlaçlar, edatlar, sıfat ve isim cümlecikleri, kip yapıları gibi konular.',
          'Cloze test: Yaklaşık 10 soru. Bir paragraftaki boşluklara uygun kelime, dil bilgisi yapısı ya da bağlaç seçersin. Hem kelime hem dil bilgisi hem anlam takibi ister.',
          'Cümle tamamlama: Yaklaşık 8-10 soru. Yarım verilen cümleyi anlam ve yapı olarak doğru tamamlayan seçeneği bulursun.',
          'Çeviri: Yaklaşık 6 soru. İngilizceden Türkçeye ve Türkçeden İngilizceye en doğru çeviriyi seçersin.',
          'Okuma parçaları: Yaklaşık 15 soru. Birkaç paragraflık metinler ve her birine bağlı sorular. Sınavın en çok zaman alan kısmı genellikle bu.',
          'Diyalog tamamlama, anlamca en yakın cümle, paragraf tamamlama ve anlam bütünlüğünü bozan cümle: Bu dört tip toplamda yaklaşık 20 soru civarında. YDT’yi YDS’den ayıran soru tipleri genellikle bunlar.',
          'Bu tabloya bakınca bir şey dikkatini çekecek: Sınavın yarısına yakını doğrudan bir paragraf ya da metin üzerinden geliyor. Yani YDT, kelime ezberinden çok okuma becerisini ölçen bir sınav.',
        ],
      },
      {
        title: 'Bu dağılımla çalışma planı nasıl kurulur?',
        body: [
          'İlk ilke: Kelime her şeyin altında. Kelime bilmeden cloze test, okuma, çeviri, hiçbiri çözülmez. Her gün kelime çalışmasını planının sabit bir parçası yap.',
          'İkinci ilke: Dil bilgisini soru tipleriyle bağlayarak öğren. Bağlaçları sadece listeden ezberleme. Cloze test ve cümle tamamlama sorularında nasıl kullanıldıklarını gör. “Although” ile “because” arasındaki farkı bir kurala değil, bir cümlenin anlamına bağlı olarak hatırladığında kalıcı olur.',
          'Üçüncü ilke: Her gün okumak. Okuma parçaları ve paragraf soruları sınavın en büyük bölümünü oluşturuyor. Günde en az bir iki metin okumak, haftalar içinde hem hızını hem anlama derinliğini değiştirir.',
          'Dördüncü ilke: TYT’yi bırakma. Haftalık planına TYT Türkçe ve Sosyal Bilimler için de düzenli bir zaman ayır.',
        ],
      },
      {
        title: 'YDT’de ortalama ne kadar?',
        body: [
          '2026 YKS sonuçlarına göre YDT İngilizcede adaylar 80 sorudan ortalama 37,1 doğru yaptı. Bu, soruların yaklaşık yüzde 46’sı demek.',
          'Bu rakamı hedef olarak değil, bir referans noktası olarak düşün. Dil puanıyla öğrenci alan bölümlerin çoğunda bu ortalamanın oldukça üstünde netler gerekiyor. Hedef bölümünün geçen yılki başarı sırasına bakarak sana gereken neti hesaplayabilir, planını buna göre kurabilirsin.',
          'Ve bu yolun bir maratona benzediğini aklında tut. Dil, bir gecede öğrenilmez. Ama her gün biraz okuyan, her gün biraz kelime çalışan bir öğrenci, birkaç ay sonra geriye baktığında ne kadar yol aldığını görünce şaşırır.',
        ],
      },
    ],
    references: [
      { title: 'Ölçme, Seçme ve Yerleştirme Merkezi (ÖSYM) - 2026-YKS Sınav Sonuçları.', detail: 'YDT başvuru ve katılım sayıları ile YDT İngilizce ortalaması için kullanılmıştır.' },
      { title: 'Ölçme, Seçme ve Yerleştirme Merkezi (ÖSYM) - 2026-YKS Kılavuzu.', detail: 'YDT soru sayısı, süresi ve DİL puan türünde TYT ile YDT ağırlıkları için kullanılmıştır.' },
    ],
  },
  {
    category: 'dil-sinav-koclugu',
    slug: 'gunde-kac-kelime-ogrenilmeli-kelime-nasil-kalici-ogrenilir',
    title: 'Günde Kaç Kelime Öğrenilmeli? Kelime Nasıl Kalıcı Öğrenilir?',
    description: 'YDT ve YDS için günde kaç kelime öğrenilmeli? Kelimeyi kalıcı öğrenmek için aralıklı tekrar, bağlam, kelime ailesi ve kendini test etme yöntemlerini örneklerle anlatıyoruz.',
    intro: [
      'Bir pazar akşamı, büyük bir kararlılıkla oturuyorsun: “Bu hafta günde 50 kelime öğreneceğim.” Pazartesi 50 kelimeyi bitiriyorsun. Salı 50 kelime daha. Çarşamba sabahı pazartesi öğrendiğin kelimelere bakıyorsun ve yarısını hatırlamıyorsun.',
      'Bu deneyimi yaşamayan dil öğrencisi yok gibi. Ve çoğu öğrenci buradan yanlış bir sonuç çıkarıyor: “Benim hafızam kötü.”',
      'Hayır. Senin hafızan, insan hafızasının nasıl çalıştığını gösteriyor sadece. Kelime öğrenmek, sayıdan çok tekrarın ve bağlamın işi. Bu yazıda günde kaç kelimenin makul olduğunu ve bu kelimeleri nasıl kalıcı hâle getirebileceğini konuşacağız.',
    ],
    sections: [
      {
        title: 'Günde kaç kelime makul?',
        body: [
          'Çoğu öğrenci için günde 15-20 yeni kelime iyi bir başlangıç noktası. Sana az gelebilir. Ama hesabı yapalım: Günde 15 kelime, haftada 6 gün, yılda yaklaşık 45 hafta. Bu yaklaşık 4 bin kelime ediyor. YDT için çok güçlü bir kelime hazinesi.',
          'Burada kilit nokta yeni kelime sayısı değil, tekrar. Günde 50 kelime öğrenip hiç tekrar etmeyen öğrenci, ay sonunda günde 15 kelime öğrenip düzenli tekrar eden öğrencinin gerisinde kalır.',
          'Bu yüzden yeni kelimeye ayırdığın süre kadar, belki daha fazlasını tekrara ayırmayı planla. Örneğin günde 40 dakika kelime çalışıyorsan, 15 dakikası yeni kelimeye, 25 dakikası tekrara gidebilir.',
        ],
      },
      {
        title: 'Unutma eğrisi: Neden unutuyoruz?',
        body: [
          '19. yüzyılda Hermann Ebbinghaus, hafıza üzerine yaptığı deneylerde ilginç bir şey fark etti: Yeni öğrenilen bilgi, ilk günlerde çok hızlı unutuluyor. Sonra unutma yavaşlıyor.',
          'Ama bir şey bu eğriyi değiştiriyor: tekrar. Bir bilgiyi tam unutmak üzereyken tekrar ettiğinde, bir sonraki unutma daha yavaş gerçekleşiyor. Her tekrar, bilgiyi biraz daha derine yerleştiriyor.',
          'Bu yüzden kelime öğrenmede en çok işe yarayan yöntemlerden biri aralıklı tekrar. Öğrendiğin kelimeyi 1 gün sonra, 3 gün sonra, 1 hafta sonra, 2 hafta sonra ve 1 ay sonra tekrar et. Her seferinde araya giren süre uzuyor, kelime de her seferinde biraz daha kalıcı oluyor.',
          'Bunu elle yapmak istersen bir kelime defterinde tarihleri not edebilirsin. Daha kolay bir yol ise aralıklı tekrar mantığıyla çalışan kart uygulamaları kullanmak. Hangisini seçersen seç, sistemin kendisi uygulamadan daha belirleyici.',
        ],
      },
      {
        title: 'Kelimeyi tek başına değil, cümleyle öğren',
        body: [
          '“Decline: azalmak, düşmek.” Bu şekilde öğrenilen bir kelime, sınavda bir cloze test paragrafında karşına çıktığında genellikle yardımcı olmuyor.',
          'Bunun yerine kelimeyi bir cümleyle birlikte öğren: “The number of students declined sharply last year.” Bu cümle sana sadece anlamı değil, kelimenin hangi yapıyla, hangi kelimelerle birlikte kullanıldığını da gösteriyor. “Decline” ile “sharply” birlikte gelir, mesela.',
          'Bir adım daha ileri git: Kelimeyle kendi cümleni kur. Senin hayatından, senin dünyandan bir cümle. “My motivation declined after the last exam.” Kendi kurduğun cümle, okuduğun bir cümleden çok daha kalıcı oluyor.',
        ],
      },
      {
        title: 'Kelime ailesini birlikte öğren',
        body: [
          'Bir kelimeyi öğrendiğinde, ailesini de öğren. “Decide” öğrendiysen, “decision”, “decisive”, “decisively” kelimelerine de bak.',
          'Bu yöntem sana iki şey kazandırır. Birincisi, tek kelime çalışma süresine dört kelime öğrenirsin. İkincisi, YDT’nin dil bilgisi ve cloze test sorularında sık karşına çıkan “Boşluğa isim mi, sıfat mı, zarf mı gelmeli?” sorusunu çok daha kolay çözersin.',
          'Fiil ve edat kalıplarını da aynı şekilde öğren. “Depend on”, “result in”, “consist of”… Bu kalıplar YDT’de sık karşına çıkıyor ve tek tek ezberlemek yerine bir cümle içinde görmek, onları çok daha kalıcı yapıyor.',
        ],
      },
      {
        title: 'Okumak, kelimeyi canlandırır',
        body: [
          'Kelime listesi kelimeyi tanıtır. Okuma ise onunla tanışmanı sağlar.',
          'Liste üzerinden öğrendiğin bir kelimeyi bir metinde gördüğünde, zihninde bir bağ kuruluyor: “Ah, bunu biliyorum.” Bu an, kelimenin kalıcılığını belirgin şekilde artırıyor. Aynı kelimeyi farklı metinlerde ne kadar çok görürsen, o kadar derine yerleşiyor.',
          'Bu yüzden kelime çalışmasını okumadan ayırma. Her gün bir iki metin oku ve metinde gördüğün yeni kelimelerden birkaçını kelime listene ekle. Böylece listen, ezberlemeye çalıştığın rastgele bir liste değil, gerçekten karşına çıkan kelimelerden oluşan yaşayan bir liste olur.',
        ],
      },
      {
        title: 'Kendini test et, sadece okuma',
        body: [
          'Kelime listesine bakıp “bunu biliyorum, bunu biliyorum” diye geçmek rahatlatıcıdır. Ama yanıltıcıdır. Kelimeyi görünce tanımak ile kelimeyi hatırlamak farklı şeyler.',
          'Tekrar yaparken anlamları kapat. Sadece İngilizce kelimeye bak ve anlamını söylemeye çalış. Sonra tersini yap: Türkçe anlama bak ve İngilizce kelimeyi hatırlamaya çalış. Hatırlayamadığın kelimeleri ayrı bir yere al ve onları daha sık tekrar et.',
          'Bu yöntem yorucu gelebilir, çünkü beynin çalışıyor. Ama tam da bu yüzden işe yarıyor. Zorlanarak hatırladığın bilgi, rahatça okuduğun bilgiden çok daha kalıcı oluyor.',
        ],
      },
      {
        title: 'Haftalık bir kelime düzeni',
        body: [
          'Haftanın 6 günü 15-20 yeni kelime öğren. Her yeni kelimeyi bir cümleyle ve ailesiyle birlikte kaydet. Her gün önceki günlerin kelimelerini aralıklı tekrar mantığıyla tekrar et.',
          'Haftanın 7. günü yeni kelime öğrenme. Sadece o haftanın kelimelerini tekrar et ve kendini test et. Hatırlayamadıklarını bir sonraki haftanın tekrar listesine ekle.',
          'Ve o çarşamba sabahına dönersek: Pazartesi öğrendiğin kelimelerin yarısını hatırlamıyorsan, bu bir başarısızlık değil. Bu, tam o kelimeleri tekrar etme zamanının geldiğini gösteren bir işaret.',
        ],
      },
    ],
  },
  {
    category: 'dil-sinav-koclugu',
    slug: 'ydtde-60-netten-70-nete-nasil-cikilir',
    title: 'YDT’de 60 Netten 70 Nete Nasıl Çıkılır? Son 10 Netin Planı',
    description: 'YDT’de 60 netten 70 nete çıkmak için hangi soru tiplerinden net kazanılır? Yanlış türü analizi, okuma hızı, cloze test ve zaman yönetimiyle son 10 netin planı.',
    intro: [
      '60 net. Bir süredir orada duruyorsun. 58, 61, 60, 62… Bir denemede 64 görüyorsun, sevinç bir hafta sürüyor, sonraki denemede yine 59.',
      'Önce şunu söyleyeyim: 60 net yapan bir öğrenci, YDT’nin büyük kısmını çözebiliyor demektir. Temelin var, kelimen var, sınavın mantığını biliyorsun. Bu noktaya gelmek kolay değil.',
      'Ama 60’tan 70’e çıkmak, 40’tan 50’ye çıkmaktan farklı bir iş. Artık genel çalışma yetmiyor. Kalan 10 netin her biri, belirli bir eksiğin arkasına saklanmış. Onları tek tek bulman gerekiyor.',
    ],
    sections: [
      {
        title: 'Önce hesabı yap: 10 net nereden gelir?',
        body: [
          'YDT’de dört yanlış bir doğruyu götürür. Bu kural, 60’tan 70’e giden yolda çok işine yarayacak bir şey söylüyor.',
          'Bir yanlışını doğruya çevirdiğinde 1,25 net kazanırsın: Yanlışın götürdüğü 0,25’i geri alırsın, üstüne 1 doğru eklersin. Bir boşunu doğruya çevirdiğinde 1 net kazanırsın. Bir yanlışını boşa çevirdiğinde ise 0,25 net kazanırsın.',
          'Somut düşünelim. Diyelim ki 66 doğru, 16 yanlış yapıyorsun. Bu 62 net. Yanlış sayısını yarıya indirip, onların yarısını doğruya çevirdiğinde 70 nete ulaşıyorsun. Yani 70 nete çıkmak için 14 yeni soru öğrenmen gerekmiyor; yanlışlarını anlaman yeterli olabilir.',
        ],
      },
      {
        title: 'Yanlışlarını soru tipine göre ayır',
        body: [
          'Son üç dört denemeni önüne al. Her yanlışını ve boşunu bir tabloya yaz: Hangi soru tipiydi? Kelime mi, dil bilgisi mi, cloze test mi, cümle tamamlama mı, çeviri mi, okuma mı, paragraf tamamlama mı, anlam bütünlüğü mü?',
          'Bu tabloyu doldurduğunda büyük ihtimalle şaşıracaksın. Yanlışlar her yere eşit dağılmıyor. Çoğu öğrencide iki üç soru tipi, yanlışların yarısından fazlasını oluşturuyor.',
          'İşte 60’tan 70’e giden yolun haritası bu tablo. Genel tekrarı bırak, o iki üç soru tipine odaklan. Bir hafta sadece cloze test, bir hafta sadece anlam bütünlüğünü bozan cümle gibi odaklanmış haftalar, genel çalışmadan çok daha hızlı sonuç verir.',
        ],
      },
      {
        title: 'Bağlaçlar: Görünmeyen net kaybı',
        body: [
          '60 net seviyesindeki öğrencilerin çoğunda ortak bir eksik var: bağlaçlar ve geçiş ifadeleri. “Although”, “whereas”, “hence”, “nevertheless”, “provided that”…',
          'Bu kelimeler küçük görünür ama cloze test, cümle tamamlama, paragraf tamamlama ve okuma sorularının çoğunda kilit rol oynar. Bir cümlenin yönünü belirleyen onlar: Zıtlık mı, sebep mi, sonuç mu, şart mı?',
          'Bağlaçları anlam gruplarına ayırarak çalış. Zıtlık bildirenler bir grupta, sebep-sonuç bildirenler bir grupta, şart bildirenler bir grupta. Sonra her gruptan cümle tamamlama ve cloze test soruları çöz. Bu çalışma birçok öğrencide birkaç haftada 3-4 net fark yaratabiliyor.',
        ],
      },
      {
        title: 'Paragraf soruları: Mantığı öğren',
        body: [
          'Anlam bütünlüğünü bozan cümle ve paragraf tamamlama soruları, 60 net seviyesinde en çok net kaybedilen yerlerden. Çünkü bu sorularda kelime bilgisi yetmiyor; paragrafın mantığını takip etmek gerekiyor.',
          'Anlam bütünlüğünü bozan cümle sorularında önce paragrafın ilk cümlesini oku ve konuyu belirle. Sonra her cümleye “Bu cümle konuya hizmet ediyor mu?” diye sor. Bozan cümle genellikle konuyla ilgili gibi görünür ama paragrafın ana yönünden hafifçe sapar.',
          'Paragraf tamamlama sorularında boşluğun öncesindeki ve sonrasındaki cümleye çok dikkat et. Doğru seçenek, iki cümleyi birbirine köprü gibi bağlamalı. Çoğu zaman boşluktan sonraki cümledeki bir zamir ya da bağlaç, doğru seçeneği gösterir.',
        ],
      },
      {
        title: 'Okuma hızı: Zamanın dışında kalan netler',
        body: [
          '60 net yapan öğrencilerin bir kısmı aslında bilgi eksiği değil, zaman eksiği yaşıyor. Okuma parçalarına geldiğinde 15 dakikası kalıyor ve son paragrafları aceleyle geçiyor.',
          'Bunu ölçmenin basit bir yolu var: Bir sonraki denemende her bölümün başlangıç saatini kitapçığa not et. Okuma parçalarına kaçta başladığına bak. Eğer okuma parçalarına yeterli zamanın kalmıyorsa, önceki bölümlerde nerede zaman kaybettiğini bul.',
          'Okuma hızını artırmak için her gün düzenli okumak gerekiyor. Bilim, tarih, psikoloji gibi YDT’de sık çıkan konulardan metinler seç. Bu konuda “Reading Hızını Artırma Yöntemleri” yazımızda daha ayrıntılı bilgi bulabilirsin.',
        ],
      },
      {
        title: 'Altı haftalık bir plan iskeleti',
        body: [
          'Birinci hafta: Son denemelerinin yanlış tablosunu çıkar. En çok net kaybettiğin iki üç soru tipini belirle.',
          'İkinci ve üçüncü hafta: En zayıf soru tipine yoğunlaş. Her gün o tipten 20-30 soru çöz, her yanlışın nedenini yaz. Bağlaç gruplarını çalış.',
          'Dördüncü ve beşinci hafta: İkinci zayıf soru tipine geç. Bir yandan ilk soru tipini haftada birkaç kez tekrar etmeye devam et.',
          'Altıncı hafta: İki tam deneme çöz ve yanlış tablosunu yeniden çıkar. Tablonun nasıl değiştiğine bak.',
          'Bu süreç boyunca her gün kelime tekrarını ve en az bir metin okumayı bırakma. Bunlar planın sabit zemini.',
          'Ve netlerin bir gün 64’te, ertesi hafta 62’de dursa da moralini bozma. Odaklanmış çalışmanın etkisi bazen birkaç hafta sonra birden görünür. Yanlış tablonun değiştiğini görüyorsan, doğru yoldasın.',
        ],
      },
    ],
  },
  {
    category: 'dil-sinav-koclugu',
    slug: 'reading-hizini-artirma-yontemleri',
    title: 'Reading Hızını Artırma Yöntemleri: YDT ve YDS İçin Uygulanabilir Teknikler',
    description: 'YDT ve YDS’de reading hızını artırmak için soru kökü stratejisi, bağlaç takibi, günlük okuma rutini ve zamanlı okuma pratiği üzerine uygulanabilir yöntemler.',
    intro: [
      'Paragrafın üçüncü cümlesindesin. Bir kelimeye takıldın. Anlamını çıkarmaya çalışırken cümlenin başını unuttun. Başa dönüyorsun. Tekrar okuyorsun. Saate bakıyorsun: Bu tek paragraf 4 dakikanı almış.',
      'Reading, dil öğrencilerinin en çok zaman kaybettiği yer. Ve çoğu öğrenci bunu çözmek için “hızlı okuma” tekniklerine yöneliyor. Ama burada bir uyarı yapmam gerekiyor.',
      'Hızlı okuma üzerine yapılan araştırmaları inceleyen kapsamlı bir derlemede, dakikada binlerce kelime vaat eden tekniklerin genellikle anlamayı ciddi şekilde düşürdüğü görülüyor. Sınavda ise anlamadan okumak, hiç okumamak kadar işe yaramaz. Bu yazıda sana mucize değil, gerçekten işe yarayan yöntemleri anlatacağım.',
    ],
    sections: [
      {
        title: 'Okuma hızının asıl kaynağı: Kelime',
        body: [
          'Hızlı okuyan öğrencilere dikkat edersen, çoğunun gözlerini özel bir şekilde hareket ettirmediğini görürsün. Onlar sadece daha az kelimeye takılıyorlar.',
          'Bir metinde bilmediğin kelimeler arttıkça, okuma hızın kaçınılmaz olarak düşer. Her bilinmeyen kelime küçük bir duraklama demek. Bu duraklamalar biriktiğinde, paragraf bir maratona dönüşüyor.',
          'Bu yüzden reading hızını artırmak isteyen birinin ilk yapması gereken şey, kelime çalışmasını düzenli hâle getirmek. Kelime hazinen genişledikçe okuma hızın da kendiliğinden artar.',
        ],
      },
      {
        title: 'Soru kökünü önce oku',
        body: [
          'YDT’deki okuma parçalarında metni baştan sona okuyup sonra sorulara geçmek yerine, önce soru köklerine göz at.',
          'Soru kökleri sana metinde ne arayacağını söyler. Bir soru “Yazara göre…” diye başlıyorsa yazarın görüşünü aradığını bilirsin. Bir soru belirli bir tarih ya da isim veriyorsa, metinde o bilgiyi tarayabilirsin.',
          'Bu yöntem, metni amaçsızca okumak yerine bir hedefle okumanı sağlar. Ama dikkat: Şıkları önceden okuma. Şıklar seni yanıltmak için tasarlanmış ifadeler içerir; önce metni okumadan şıkları okumak, zihninde yanlış bir çerçeve oluşturabilir.',
        ],
      },
      {
        title: 'Bağlaçlar: Metnin yol işaretleri',
        body: [
          'Bir paragrafı bir yol gibi düşün. Bağlaçlar da o yoldaki trafik işaretleri.',
          '“However” gördüğünde yolun döndüğünü bilirsin: Az önce söylenenin tersi geliyor. “Therefore” gördüğünde bir sonuca vardığını bilirsin. “For instance” gördüğünde bir örnek geldiğini bilirsin; örnekleri genellikle hızlı geçebilirsin.',
          'Bu işaretlere dikkat ederek okuduğunda, her cümleyi aynı yoğunlukta okumak zorunda kalmazsın. Ana fikri taşıyan cümlelerde yavaşlar, örnek ve ayrıntı cümlelerinde hızlanırsın.',
        ],
      },
      {
        title: 'Her kelimeye takılma',
        body: [
          'Bir metinde bilmediğin bir kelimeyle karşılaştığında, durup onun anlamını bulmaya çalışma. Önce cümlenin geri kalanını oku.',
          'Çoğu zaman cümlenin geri kalanı, o kelimenin anlamı hakkında yeterli ipucu verir. Bazen de o kelime soruyu çözmen için hiç gerekmez. Tek bir kelimeye takılıp bütün paragrafı kaçırmak, en sık yapılan zaman kayıplarından biri.',
          'Bir alışkanlık edin: Bilmediğin kelimenin altını çiz ve devam et. Okuma bittiğinde altı çizili kelimelere dön. Sınav sırasında bunlara geri dönmeye gerek kalmayabilir; deneme sonrası çalışmada ise bu kelimeleri listene ekleyebilirsin.',
        ],
      },
      {
        title: 'Geri dönmeyi azalt',
        body: [
          'Okurken gözlerimiz farkında olmadan sık sık geri döner. Bir cümleyi bitirmeden başa dönüp tekrar okuruz. Bu geri dönüşlerin bir kısmı gerekli, çünkü anlamadığımız bir yeri netleştiriyoruz. Ama büyük kısmı sadece bir alışkanlık.',
          'Bu alışkanlığı azaltmanın basit bir yolu var: Okurken kalemini satırın altında, okuduğun yerde tut ve sabit bir hızla ilerlet. Kalem bir rehber gibi gözlerini ileri taşır. İlk başlarda biraz garip gelebilir, ama birkaç hafta içinde geri dönüşlerinin azaldığını fark edersin.',
        ],
      },
      {
        title: 'Her gün oku, okuduğunu ölç',
        body: [
          'Reading hızı bir haftada artmaz. Kas gibi, düzenli çalıştıkça güçlenir.',
          'Her gün en az iki metin oku. Bilim, tarih, psikoloji, çevre, teknoloji gibi YDT’de sık karşına çıkan konulardan metinler seç. Haftada bir de daha uzun bir metin oku.',
          'Okumanı ölç. Bir metni okumaya başlamadan önce saatini kur, okumayı bitirdiğinde süreyi not al. Ardından metinle ilgili soruları çöz ve doğru sayını not al. Haftalar içinde bu iki sayının nasıl değiştiğini görmek, hem motivasyonunu artırır hem de hangi yöntemin işe yaradığını gösterir.',
          'O 4 dakikalık paragrafa geri dönersek: Bir gün aynı uzunluktaki bir paragrafı 2 dakikada, üstelik daha iyi anlayarak okuduğunu fark edeceksin. Ve bu bir teknikten değil, her gün biraz okumaktan gelecek.',
        ],
      },
    ],
    references: [
      { title: 'Rayner, K., Schotter, E. R., Masson, M. E. J., Potter, M. C. ve Treiman, R. - So Much to Read, So Little Time: How Do We Read, and Can Speed Reading Help? Psychological Science in the Public Interest, 2016.', detail: 'Hızlı okuma tekniklerinin anlama üzerindeki etkisine ilişkin bulgular için kullanılmıştır.' },
    ],
  },
  {
    category: 'dil-sinav-koclugu',
    slug: 'ydtde-gunluk-kac-soru-cozulmeli',
    title: 'YDT’de Günlük Kaç Soru Çözülmeli? Seviyeye Göre Plan',
    description: 'YDT’de günlük kaç soru çözülmeli? Başlangıç, orta ve ileri seviye için günlük soru sayısı, soru tipi dağılımı, deneme sıklığı ve analiz süresini içeren örnek plan.',
    intro: [
      'Bir arkadaşın günde 200 soru çözdüğünü söylüyor. Sen 60 soru çözüyorsun. İçine bir kuşku düşüyor: “Az mı çalışıyorum?”',
      'Bu soruyu bana çok öğrenci soruyor. Ve cevabım her seferinde aynı: Kaç soru çözdüğün kadar, o soruları nasıl çözdüğün ve sonra ne yaptığın da belirleyici.',
      'Yine de bir sayı arıyorsan, haklısın. Bir başlangıç noktası olması gerekiyor. Bu yazıda seviyene göre günlük soru sayısını ve bu soruları nasıl dağıtabileceğini anlatacağım.',
    ],
    sections: [
      {
        title: 'Soru sayısı tek başına bir şey söylemez',
        body: [
          'Günde 200 soru çözen ama yanlışlarına bakmayan bir öğrenci, aynı yanlışları tekrar tekrar yapar. Günde 60 soru çözüp her yanlışının nedenini anlayan bir öğrenci ise her gün biraz ilerler.',
          'Bu yüzden günlük soru sayını belirlerken analiz süresini de hesaba kat. Kabaca bir kural: Soru çözmeye ayırdığın sürenin en az üçte biri kadar analiz yap. 60 dakika soru çözdüysen, 20 dakika yanlışlarına ve emin olmadan doğru yaptığın sorulara bak.',
          'Emin olmadan doğru yaptığın sorular, gizli yanlışlardır. Sınavda aynı şans her zaman yanında olmayabilir.',
        ],
      },
      {
        title: 'Başlangıç seviyesi: 40-60 soru',
        body: [
          'Deneme netlerin 30’un altındaysa, şu an önceliğin soru sayısı değil, temel. Kelime hazinen ve dil bilgisi temelin oturmadan çok soru çözmek, çoğu zaman tahmin yapmaktan öteye geçmez.',
          'Bu seviyede günde 40-60 soru yeterli. Bu soruların büyük kısmı o gün çalıştığın dil bilgisi konusundan ve kelime sorularından olsun. Günde bir iki kısa okuma metni de ekle.',
          'Zamanının büyük kısmını kelime çalışmasına ve dil bilgisi konularını öğrenmeye ayır. Deneme çözmeye henüz çok gerek yok; ayda bir iki deneme, nerede durduğunu görmek için yeterli.',
        ],
      },
      {
        title: 'Orta seviye: 80-100 soru',
        body: [
          'Deneme netlerin 30-55 arasındaysa, temelin oluşmaya başlamış. Artık soru tiplerini tanıma ve hız kazanma zamanı.',
          'Bu seviyede günde 80-100 soru hedefleyebilirsin. Bu soruları soru tiplerine dağıt: Bir gün cloze test ve cümle tamamlama ağırlıklı, ertesi gün okuma ve paragraf ağırlıklı, bir başka gün çeviri ve dil bilgisi ağırlıklı.',
          'Haftada bir deneme çöz. Denemeden çıkan zayıf soru tiplerini bir sonraki haftanın soru dağılımında öne al.',
        ],
      },
      {
        title: 'İleri seviye: 100-120 soru ve düzenli deneme',
        body: [
          'Deneme netlerin 55’in üzerindeyse, artık en büyük kazancın denemelerden ve odaklanmış soru tipi çalışmasından gelecek.',
          'Bu seviyede günde 100-120 soru ve haftada bir iki deneme iyi bir düzen. Ama dikkat: Bu seviyede soru sayısından çok, soruların kalitesi belirleyici. Zor soruları, özellikle de en çok yanlış yaptığın soru tiplerini seç.',
          'Bu seviyedeki öğrenciler için yanlış analizi her şeyden daha değerli. Her denemeden sonra yanlışlarını soru tipine göre ayır ve bir sonraki haftayı bu tabloya göre planla. Bu konuda “YDT’de 60 Netten 70 Nete Nasıl Çıkılır?” yazımızda ayrıntılı bir plan bulabilirsin.',
        ],
      },
      {
        title: 'Örnek bir gün',
        body: [
          'Orta seviyedeki bir öğrenci için örnek bir gün şöyle olabilir. 30 dakika kelime: 15 yeni kelime ve önceki günlerin tekrarı. 45 dakika soru çözümü: 20 cloze test, 20 cümle tamamlama, 10 dil bilgisi. 30 dakika okuma: 2 metin ve bağlı sorular. 25 dakika analiz: Yanlışlar ve emin olmadan doğru yapılan sorular.',
          'Bu yaklaşık 2 saat 10 dakika ediyor ve 80 civarında soru içeriyor. TYT çalışmasını da hesaba kattığında, okul günlerinde çoğu öğrenci için gerçekçi bir yük.',
          'Hafta sonu bir deneme ve analizini ekle. Böylece haftanın sonunda nerede olduğunu görür, gelecek haftayı ona göre planlarsın.',
        ],
      },
      {
        title: 'Kendi sayını bul',
        body: [
          'Yukarıdaki sayılar bir başlangıç noktası. Kesin kurallar değil. Kimi öğrenci 80 soruyu bir buçuk saatte bitirir, kimi iki buçuk saatte. Kimi öğrencinin TYT’ye daha çok zaman ayırması gerekir.',
          'Bir iki hafta bu sayılarla dene ve ne hissettiğine bak. Planı her gün bitirebiliyor musun? Analiz için zamanın kalıyor mu? Denemelerde ilerleme görüyor musun? Bu soruların cevabına göre sayıyı yukarı ya da aşağı çek.',
          'Ve günde 200 soru çözen o arkadaşın hakkında endişelenme. Onun yolu senin yolun değil. Senin işin, kendi yolunda her gün biraz ilerlemek.',
        ],
      },
    ],
  },
  {
    category: 'dil-sinav-koclugu',
    slug: 'dil-puaniyla-hangi-bolumler-tercih-edilebilir',
    title: 'Dil Puanıyla Hangi Bölümler Tercih Edilebilir? DİL Puanı Bölümleri ve Meslek Yolları',
    description: 'Dil puanıyla hangi bölümler tercih edilebilir? DİL puan türüyle öğrenci alan öğretmenlik, mütercim-tercümanlık, dil ve edebiyat, dilbilim gibi bölümleri ve meslek yollarını anlatıyoruz.',
    intro: [
      'Dil sınıfına geçtiğinde biri sana sormuştur: “Dilden ne olunur ki? Öğretmen mi olacaksın?” Belki sen de içinden aynı soruyu sordun.',
      'Bu soru, dil alanının en yaygın yanlış anlaşılmalarından birini yansıtıyor. Dil puanıyla tercih edebileceğin bölümler, sanıldığından çok daha çeşitli. Ve bu bölümlerin açıldığı meslek yolları da öyle.',
      'Bu yazıda dil puanıyla öğrenci alan başlıca bölümleri, bu bölümlerin farklarını ve mezuniyetten sonra seni nelerin beklediğini anlatacağım. Ama önce bir şey: Bölüm seçmek, sadece bir isim seçmek değil. Önümüzdeki yıllarını nasıl geçireceğini seçmek.',
    ],
    sections: [
      {
        title: 'Öğretmenlik bölümleri',
        body: [
          'İngilizce Öğretmenliği, dil puanıyla tercih edilen en bilinen bölümlerden biri. Almanca, Fransızca ve Arapça öğretmenliği programları da dil puanıyla öğrenci alıyor.',
          'Bu bölümlerde dil becerilerinin yanında öğretim yöntemleri, eğitim psikolojisi, sınıf yönetimi ve öğretmenlik uygulaması gibi dersler var. Mezunlar devlet okullarında, özel okullarda, dil kurslarında ve kurumsal eğitim alanında çalışabiliyor.',
          'Devlet okullarında öğretmen olarak atanmak için KPSS’ye girmen gerekiyor. Ayrıca öğretmenlik programlarına yerleşmek için belirli bir başarı sırası şartı var; güncel sınırı o yılın YKS kılavuzundan kontrol et.',
        ],
      },
      {
        title: 'Mütercim-Tercümanlık',
        body: [
          'Mütercim-Tercümanlık bölümleri, yazılı ve sözlü çeviri üzerine yoğunlaşıyor. İngilizce, Almanca, Fransızca, Arapça, Rusça ve daha birçok dilde programlar var.',
          'Bu bölümlerde çeviri kuramları, yazılı çeviri, ardıl ve simultane çeviri, alan çevirileri gibi dersler görüyorsun. Hukuk, tıp, teknik ve edebi çeviri gibi farklı alanlarda uzmanlaşma imkânı var.',
          'Mezunlar çeviri bürolarında, yayınevlerinde, uluslararası kuruluşlarda, altyazı ve yerelleştirme şirketlerinde, kurumların dış ilişkiler birimlerinde çalışabiliyor. Bir kısmı serbest çevirmen olarak kendi işini kuruyor.',
          'Burada dürüst bir not düşmek gerekiyor: Makine çevirisi ve yapay zekâ araçları, çeviri sektörünü hızla değiştiriyor. Bazı rutin çeviri işleri azalırken, makine çevirisini düzeltme, yerelleştirme, kültürlerarası iletişim ve uzmanlık gerektiren çeviriler gibi alanlar öne çıkıyor. Bu bölümü düşünüyorsan, teknolojiyi bir tehdit değil, bir araç olarak kullanmayı öğrenmeye açık olman sana çok şey kazandırır.',
        ],
      },
      {
        title: 'Dil ve edebiyat bölümleri',
        body: [
          'İngiliz Dili ve Edebiyatı, Amerikan Kültürü ve Edebiyatı, Alman Dili ve Edebiyatı, Fransız Dili ve Edebiyatı, Rus Dili ve Edebiyatı, Arap Dili ve Edebiyatı… Bu bölümler bir dilin edebiyatını, kültürünü ve tarihini derinlemesine inceliyor.',
          'Japon, Çin, Kore, İspanyol, İtalyan gibi dillerin dil ve edebiyat bölümleri de dil puanıyla öğrenci alıyor. Bu bölümlerin bazılarında dil sıfırdan öğretiliyor; yani lisede o dili bilmen gerekmiyor.',
          'Mezunlar akademide, yayıncılıkta, kültür kurumlarında, turizmde, uluslararası şirketlerde ve medyada çalışabiliyor. Pedagojik formasyon alarak öğretmenlik yapma imkânı da gündeme gelebiliyor; bu konudaki kurallar zaman içinde değişebildiği için güncel düzenlemeyi takip et.',
        ],
      },
      {
        title: 'Dilbilim ve diğer seçenekler',
        body: [
          'Dilbilim bölümü, dilin yapısını, nasıl öğrenildiğini, nasıl değiştiğini bilimsel olarak inceliyor. Dil teknolojileri, konuşma tanıma ve doğal dil işleme gibi alanlarla da bağlantılı bir bölüm. Bilgisayar ve teknolojiye ilgin varsa, dikkatini çekebilir.',
          'Bazı üniversitelerde Turizm Rehberliği gibi programlar da dil puanıyla öğrenci alabiliyor. Hangi programın hangi puan türüyle öğrenci aldığı üniversiteden üniversiteye değişebildiği için tercih öncesinde YÖK Atlas üzerinden programın puan türünü kontrol et.',
        ],
      },
      {
        title: 'Bölüm seçerken kendine sor',
        body: [
          'Bölüm isimleri birbirine benzese de, içerikleri ve açıldıkları yollar çok farklı. Tercih yapmadan önce kendine birkaç soru sor.',
          'İnsanlarla mı çalışmak istersin, metinlerle mi? Öğretmenlik ve turizm insanla yoğun etkileşim isterken, yazılı çeviri ve akademik çalışma daha çok metinle baş başa kalmayı gerektirir.',
          'Dilin yapısı mı ilgini çekiyor, edebiyatı mı, yoksa onu bir araç olarak kullanmak mı? Bu sorunun cevabı dilbilim, edebiyat ve tercümanlık arasında seçim yapmana yardım eder.',
          'Yeni bir dil öğrenmeye hazır mısın? İkinci bir yabancı dil, mezuniyet sonrasında seni birçok kişiden ayırır. Sıfırdan dil öğreten bölümler, bu fırsatı sana doğrudan sunar.',
        ],
      },
      {
        title: 'Anlamı olan bir seçim',
        body: [
          'Viktor Frankl, insanın en derin ihtiyacının anlam olduğunu söyler. İşimizde de bu böyle. Sadece puanının yettiği için seçtiğin bir bölüm, dört yıl boyunca sana yük gibi gelebilir. Seni gerçekten ilgilendiren bir bölüm ise, zorlandığın günlerde bile seni ayakta tutar.',
          'Doğan Cüceloğlu “Var mısın?” derken, insanın kendi hayatının sorumluluğunu almasından bahsediyordu. Bölüm seçimi de bunun küçük ama gerçek bir örneği. Başkalarının beklentisini değil, kendi merakını dinlemeye çalış.',
          'Tercih öncesinde YÖK Atlas’ta bölümlerin ders içeriklerine, mezunların hangi alanlarda çalıştığına bak. Mümkünse o bölümde okuyan öğrencilerle konuş. Bir bölümü sınav puanından değil, içeriğinden tanımak, dört yıl sonra seni çok daha iyi bir yere taşır.',
          'Ve “Dilden ne olunur ki?” diye soran o kişiye artık bir cevabın var: Dilden pek çok şey olunur. Asıl mesele, hangisinin sen olduğunu bulmak.',
        ],
      },
    ],
  },
];
