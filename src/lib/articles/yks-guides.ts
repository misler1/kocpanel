import type { Article } from '../marketing-content';

// YKS rehber yazıları: öğrenciye doğrudan hitap eden, deneyime ve gerçek sınav verisine dayanan yazılar.
export const yksGuideArticles: Article[] = [
  {
    category: 'yks',
    slug: 'netlerim-neden-artmiyor',
    title: 'Netlerim Neden Artmıyor? Çok Çalışıp Yerinde Sayan Öğrenciye Rehber',
    description: 'Çok çalışıyorsun ama deneme netlerin aynı yerde mi? Netlerin neden artmadığını, yanlış analizini, konu-soru dengesini ve plato dönemini örneklerle anlatıyoruz.',
    intro: [
      'Gece yatağa uzanıyorsun. Işığı kapatmışsın ama zihnin hâlâ açık. Tavana bakıp son üç denemenin netlerini sayıyorsun: 68, 71, 69. Üç haftadır her gün masadasın. Bu rakam neden kıpırdamıyor?',
      'Bu soruyu bana çok öğrenci sordu. Çoğu zaman sesi biraz kırgın çıkar. Çünkü sorunun altında başka, daha ağır bir soru durur: “Ben mi yetersizim?”',
      'Hayır. Yıllardır öğrencilerle çalışırken gördüğüm şey şu: Netleri yerinde sayan öğrencilerin çok azında mesele yetenektir. Çoğunda mesele, emeğin nereye aktığıdır. Borudan su sızıyorsa musluğu daha çok açmak bir şey değiştirmez. Önce deliği bulman gerekir.',
      'Hadi o delikleri birlikte arayalım. Bazıları sana tanıdık gelecek. Belki biraz da canını sıkacak. Sorun değil; değişim çoğu zaman tam orada başlar.',
    ],
    sections: [
      {
        title: 'Denemeyi çözüyorsun ama okumuyorsun',
        body: [
          'Pazar sabahı 165 dakikalık bir TYT çözüyorsun. Cevap anahtarını açıyorsun, neti hesaplıyorsun, belki bir fotoğrafını çekip arkadaşına atıyorsun. Sonra kitapçık çantanın dibine gidiyor.',
          'Üç saat emek verdin ama o emeğin en değerli kısmını masada bıraktın. Deneme bir sınav değil, bir aynadır. Aynaya bakıp sadece “68” yazısını görürsen, yüzündeki lekeyi hiç fark etmezsin.',
          'Yanlışlarını dört gruba ayırmayı dene. Birincisi: “Bu konuyu bilmiyordum.” İkincisi: “Biliyordum ama o an aklıma gelmedi.” Üçüncüsü: “Biliyordum, işlemde ya da okurken hata yaptım.” Dördüncüsü: “Süre yetmedi, bakamadım bile.”',
          'Her grubun ilacı başka. Bilmediğin konu için konu çalışırsın. Hatırlayamadığın bilgi için tekrar ve soru çözümü gerekir. Dikkat hatası için yavaşlama ve kontrol alışkanlığı kurarsın. Süre sorunu için de ayrı bir antrenman yaparsın. Bunları ayırmadan “daha çok soru çözeyim” dediğinde, dört farklı hastalığa aynı ilacı veriyorsun.',
          'Benim öğrencilerime verdiğim basit bir kural var: Deneme kaç dakika sürdüyse, analizine en az yarısı kadar zaman ayır. 165 dakikalık TYT için en az bir buçuk saat. Fazla mı geldi? Bir haftalığına dene. Netin değil belki ama yanlışlarının yüzü değişecek.',
        ],
      },
      {
        title: 'Konuyu bitirdin sanıyorsun, soru bitmedi',
        body: [
          'Türev videosunu izledin. Hoca anlattı, her adımı anladın, başını sallayarak defterine not aldın. İçinde güzel bir “tamam, bu iş bitti” duygusu var.',
          'Ertesi gün kitabı kapatıp boş bir kâğıda tek bir türev sorusu çözmeye çalış. Çoğu öğrenci burada şaşırır. Çünkü anlamak ile yapabilmek aynı şey değil.',
          'Video izlerken beynin tanıma işi yapar: “Evet, bunu biliyorum.” Sınavda ise hatırlama yapman gerekir: boş bir kâğıtta, kimse sana ipucu vermeden. Bellek araştırmalarının en sağlam bulgularından biri de şu: Bilgiyi tekrar tekrar okumak yerine kendini test ettiğinde çok daha kalıcı öğreniyorsun.',
          'Pratikte bunun anlamı basit. Bir konuyu bitirdiğinde kitabı kapat ve konuyu boş bir kâğıda kendi cümlelerinle anlat. Takıldığın yer, eksiğin olduğu yerdir. Sonra o konudan kolaydan zora sıralanmış en az iki üç farklı kaynakta soru çöz. Tek kitabın soruları bir süre sonra sana tanıdık gelir; sınavdaki soru ise hiç tanıdık gelmeyecek.',
        ],
      },
      {
        title: 'Sevdiğin derse kaçıyor olabilirsin',
        body: [
          'Paragraf çözmek iyi hissettirir. Akıp gidersin, doğrular gelir, masadan kalkarken içinde bir başarı duygusu olur. Geometri defteri ise iki haftadır çantanın aynı gözünde duruyor.',
          'Bunu yapan tek öğrenci sen değilsin. İnsan, kendini iyi hissettiren işe doğru çekilir. Ama net, en çok zorlandığın yerde artar. 2026 YKS’de TYT’de ortalama öğrenci Türkçede 40 soruda 20,5 doğru yaparken Temel Matematikte aynı 40 sorudan yalnızca 6,8 doğru yapabildi. Yani birçok öğrencinin büyük net potansiyeli, kaçtığı derste bekliyor.',
          'Küçük bir değişiklik öner sana: Günün ilk çalışma bloğunu en sevmediğin derse ver. Zihnin en taze, iraden en güçlü olduğu zaman orası. Sevdiğin dersi de günün sonuna bir ödül gibi koy. Böylece kaçmak yerine, sırayla yürümüş olursun.',
        ],
      },
      {
        title: 'Plato dönemi: Netler basamak basamak artar',
        body: [
          'Bir de şu var: Bazen gerçekten her şeyi doğru yapıyorsun ve netler yine de yerinde sayıyor.',
          'Öğrenme düz bir çizgi değil. Daha çok merdivene benzer. Bir süre aynı basamakta durursun, sanki hiçbir şey olmuyormuş gibi gelir. O sırada zihnin yeni öğrendiklerini yerleştiriyor, eski bilgilerle bağlıyor. Sonra bir denemede birden 8-10 net sıçrarsın ve “Bu nereden çıktı?” dersin. Oysa o net üç haftadır birikiyordu.',
          'Bu yüzden tek bir denemeye bakarak karar verme. Deneme yayınlarının zorluğu birbirini tutmaz; bir kurumun denemesinde 75 yapan öğrenci, ötekinde 66 yapabilir. Son 3-4 denemenin ortalamasına bak. Ortalama birkaç hafta boyunca yavaş da olsa yukarı gidiyorsa doğru yoldasın.',
          'Ortalama altı haftadır hiç değişmiyorsa, işte o zaman çalışma biçimini masaya yatırma zamanı gelmiştir. Plato ile tıkanma arasındaki fark, zamanın uzunluğundadır.',
        ],
      },
      {
        title: 'Yorgunluk da bir eksik konu',
        body: [
          'Gece 01.30’da telefonu bırakıp sabah 07.00’de kalkan bir öğrenci, gün içinde çalıştığının büyük kısmını kaybeder. Bunu ahlaki bir uyarı olarak söylemiyorum. Beyin, gün içinde öğrendiklerini büyük ölçüde uykuda yerleştiriyor. Uykuyu kestiğinde, gün içinde koyduğun emeğin bir kısmını kendi elinle silmiş oluyorsun.',
          'Telefon da benzer bir hırsız. Masada ekranı ters çevrilmiş bir telefon bile dikkatini böler. Her bildirim, zihnini kaldığı yerden koparır ve geri dönmek dakikalar sürer. Çalışırken telefonu başka bir odaya bırakmayı bir hafta dene. Çalıştığın saat aynı kalsa bile, çalıştığın şeyin miktarı değişecek.',
        ],
      },
      {
        title: 'Netin, senin değerin değil',
        body: [
          'Bu yazının en uzun kısmını buraya ayırmak isterdim ama kısa tutacağım, çünkü söyleyeceğim şey basit.',
          'Netler bir ölçümdür. Hüküm değildir. 68 net, senin bugün belirli bir sınavda belirli bir performans gösterdiğini söyler; ne kadar değerli bir insan olduğunu, ileride kim olacağını söylemez.',
          'Viktor Frankl, insanın elinden her şey alınabileceğini ama bir şeyin alınamayacağını yazar: Koşullar karşısında hangi tutumu seçeceği. Netlerinin bu hafta ne olacağını tam olarak sen belirleyemezsin. Ama bir denemeden sonra kendine nasıl davranacağını, yarın masaya oturup oturmayacağını sen seçersin.',
          'Kendine kızarak çalışan öğrenci bir süre gider, sonra tükenir. Kendine bir koçun öğrencisine baktığı gibi bakan öğrenci, yani hem gerçekçi hem şefkatli, çok daha uzun yol alır. Sana şu soruyu sormanı isterim: “Ben en sevdiğim arkadaşım bu netleri alsaydı ona ne derdim?” Muhtemelen kendine söylediğinden çok daha adil bir şey.',
        ],
      },
      {
        title: 'Bu hafta neyi değiştirebilirsin?',
        body: [
          'Her şeyi bir anda değiştirmeye kalkma. Bu hafta sadece şu dört şeyi dene:',
          'Bir: Son denemeni çantadan çıkar ve her yanlışını dört gruptan birine yaz. İki: En çok yanlış çıkan tek bir konu seç ve bu hafta o konuyu kitap kapalıyken kendine anlat, sonra iki farklı kaynaktan soru çöz. Üç: Günün ilk çalışma bloğunu en sevmediğin derse ver. Dört: Telefonu çalışırken başka odaya bırak.',
          'Bir hafta sonra yeni bir deneme çöz. Net belki hemen artmaz. Ama yanlışların değişmeye başlarsa, doğru deliği bulmuşsun demektir. Gerisi zaman meselesi.',
          'Ve o gece yine yatağa uzandığında tavana bakarak netleri sayıyorsan, şunu da hatırla: Bugün masaya oturdun. Bu da bir şey. Hem de az bir şey değil.',
        ],
      },
    ],
  },
  {
    category: 'yks',
    slug: 'tyt-mi-ayt-mi-oncelikli',
    title: 'TYT mi AYT mi Öncelikli? Sınıfına ve Netlerine Göre Doğru Denge',
    description: 'TYT mi AYT mi önce çalışılır? Sınıfına, netlerine ve hedef bölümüne göre TYT-AYT dengesini, puan hesabını ve dönem dönem örnek çalışma oranlarını anlatıyoruz.',
    intro: [
      '“Hocam, TYT’ye mi ağırlık vereyim, AYT’ye mi?” Bu soruyu yılda belki yüz kez duyuyorum. Ve her seferinde aynı karşı soruyu soruyorum: “Sen kimsin, nerede duruyorsun, nereye gitmek istiyorsun?”',
      'Kaçamak bir cevap gibi gelebilir. Ama gerçekten herkes için doğru tek bir oran yok. Tıp hedefleyen ve TYT’si 100 neti geçmiş bir mezunla, matematiği 8 netlerde dolaşan bir 11. sınıf öğrencisine aynı planı vermek, iki farklı hastaya aynı reçeteyi yazmaya benzer.',
      'Bu yazıda sana hazır bir reçete değil, kendi reçeteni yazabileceğin bir yol haritası vereceğim. Önce sayılara bakalım, sonra sana.',
    ],
    sections: [
      {
        title: 'Önce puanın nasıl hesaplandığına bak',
        body: [
          'Sayısal, eşit ağırlık ve sözel puan türlerinde yerleştirme puanına TYT yüzde 40, AYT yüzde 60 oranında katkı yapıyor. Bunun üzerine bir de okul başarı puanın ekleniyor. Yani lisans hedefliyorsan AYT’nin payı daha büyük. Bu doğru.',
          'Ama burada çok öğrencinin atladığı bir ayrıntı var: TYT yüzde 40 demek, “TYT önemsiz” demek değil. Yüzde 40, puanının neredeyse yarısı. Üstelik TYT’de 2026’da ortalama öğrenci Temel Matematikte 40 sorunun yalnızca 6,8’ini doğru yapabildi. Ortalamanın üstüne çıkmak için hâlâ çok geniş bir alan var.',
          'Bir de şunu düşün: TYT 120 soru ve 165 dakika. AYT ise 160 soru ve 180 dakika. İki sınav da senden farklı bir dayanıklılık ister. TYT’de hız ve temel beceri, AYT’de derinlik ve alan bilgisi öne çıkar.',
        ],
      },
      {
        title: 'TYT, AYT’nin zemini',
        body: [
          'Bir ev düşün. TYT temel, AYT üst kat. Temeli sağlam atmadan çıktığın kat sallanır.',
          'Bu benzetme özellikle matematikte birebir doğru. Fonksiyonları, çarpanlara ayırmayı, üslü ve köklü ifadeleri oturtmadan türev ya da integrale geçen öğrenci, AYT sorusunda aslında AYT’den değil TYT konusundan takılır. Problemi türevde sanır, oysa düşüş iki satır önce, sadeleştirmede başlamıştır.',
          'Fizikte, kimyada, biyolojide de benzer bir zincir var. TYT’deki temel kavramlar, AYT’de daha ağır yükler taşıyor. Bu yüzden TYT’yi “önce bitirip kenara koyacağın” bir sınav gibi değil, AYT’yi taşıyan bir altyapı gibi düşünmek sana zaman kazandırır.',
        ],
      },
      {
        title: 'Netlerine göre bir başlangıç noktası',
        body: [
          'Aşağıdaki oranlar bir başlangıç noktası. Kesin kural değil. Kendi deneme sonuçlarına bakarak her ay biraz oynatabilirsin.',
          'TYT netin 60’ın altındaysa: Haftalık çalışma zamanının kabaca yüzde 65-70’ini TYT’ye ver. Temel eksikler AYT çalışmanı da baltalar. Burada amaç TYT’yi kısa sürede güçlendirip AYT’ye sağlam zemin bırakmak.',
          'TYT netin 60-90 arasındaysa: Yaklaşık yarı yarıya ilerle. TYT’de hangi derste en çok net kaybettiğine bak ve oraya odaklan. AYT’de de konu eksiklerini kapatmaya başla.',
          'TYT netin 90’ın üzerindeyse: Ağırlığı AYT’ye kaydır. Zamanının yüzde 60-65’ini AYT’ye verebilirsin. TYT’yi ise haftada bir deneme ve düzenli paragraf-problem pratiğiyle canlı tut. TYT’yi tamamen bırakan öğrenci, birkaç ay sonra sürat kaybettiğini fark eder.',
        ],
      },
      {
        title: 'Sınıfına ve zamanına göre değişen tablo',
        body: [
          '11. sınıftaysan acelen yok ama zamanın var. Bu yılı okul derslerini sağlam öğrenmeye, TYT temelini kurmaya ver. 11. sınıf konuları AYT’nin büyük kısmını oluşturuyor; okulda öğrendiğini o yıl sağlam tutarsan, 12. sınıfta ikinci kez öğrenmek zorunda kalmazsın.',
          '12. sınıfın başındaysan ilk dönem genellikle konu eksiklerini kapatma dönemidir. Eylülden ocağa kadar TYT ve AYT konularını paralel yürütmek, ocaktan sonra deneme sayısını artırmak çoğu öğrenci için işleyen bir düzen.',
          'Mezunsan en büyük avantajın zaman, en büyük riskin de o zamanın dağılması. Mezun öğrenciler genellikle TYT’de daha iyi bir başlangıç noktasındadır. Bu yüzden ilk aylardan itibaren AYT’ye daha büyük pay ayırabilirsin. Ama bir şartla: Geçen yıl hangi dersin seni nerede bıraktığına dürüstçe bakarak.',
          'Mart-nisandan sonra ise artık “hangisi öncelikli” sorusu biraz değişir. Bu dönemde iki sınavın da denemelerini düzenli çözer, yanlışlarından çıkan konulara dönersin. Öncelik, denemede ortaya çıkan eksiğe göre belirlenir.',
        ],
      },
      {
        title: 'İki öğrenci, iki farklı plan',
        body: [
          'Elif’i düşün. 12. sınıf, sayısal, hedefi tıp. TYT’de 95 net yapıyor ama AYT Matematikte 15 netlerde. Elif için TYT’ye daha fazla zaman vermek, zaten iyi olduğu yeri cilalamak olur. Onun büyük kazancı AYT matematik ve fende. Elif’in haftası yüzde 65 AYT, yüzde 35 TYT gibi kurulabilir.',
          'Burak’ı düşün. 12. sınıf, eşit ağırlık, hedefi hukuk. TYT Türkçesi 22, matematiği 8 net. AYT konularında da eksikleri var ama asıl açık TYT’de. Burak’ın hızlı kazanabileceği alan TYT matematik ve paragraf. Onun haftası ilk iki ay yüzde 65 TYT ile başlayıp, TYT’si toparlandıkça AYT’ye kayabilir.',
          'İkisi de doğru plan. Sadece farklı insanlar için yazılmış.',
        ],
      },
      {
        title: 'Hedefin netleşince öncelik de netleşir',
        body: [
          'Bu sorunun en derin cevabı aslında matematikte değil. Hangi bölümü, neden istediğini bildiğinde öncelikler kendiliğinden belirginleşiyor.',
          'Viktor Frankl, Nietzsche’den bir cümleyi sık sık hatırlatır: Yaşamak için bir “neden”i olan, hemen her “nasıl”a katlanabilir. Ders çalışmak da böyle. Hedefin sadece “iyi bir yer” olduğunda TYT ile AYT arasında savrulursun. Hedefin “şu şehirde, şu bölümde, şu sebeple okumak istiyorum” kadar net olduğunda, o bölümün geçen yılki başarı sırasına bakar, gereken neti hesaplar ve eksik olan tarafa yönelirsin.',
          'Ve bazen bu hesap seni şaşırtır. Tahmin ettiğinden daha fazla TYT, ya da tahmin ettiğinden daha fazla AYT gerektiğini görürsün. İşte o zaman artık başkasının oranını değil, kendi oranını uyguluyorsun demektir.',
        ],
      },
    ],
  },
  {
    category: 'yks',
    slug: 'yksde-zaman-yetmiyor-ne-yapmaliyim',
    title: 'YKS’de Zaman Yetmiyor: Ne Yapmalıyım? Süreyi Geri Kazanmanın Yolları',
    description: 'YKS’de süre yetmiyorsa çözüm sadece hızlanmak değil. Zamanın nerede kaybolduğunu bulmayı, turlama tekniğini, soru seçimini ve deneme sonrası süre analizini anlatıyoruz.',
    intro: [
      'Saatine bakıyorsun. Kalan 12 dakika. Önünde hâlâ 18 matematik sorusu var. Elin terlemeye başlıyor, okuduğun soruyu ikinci kez okuyorsun ama anlamıyorsun. Son dakikalarda rastgele birkaç tanesini işaretliyorsun.',
      'Bu sahneyi yaşamış olabilirsin. YKS’ye hazırlanan öğrencilerin en sık anlattığı sahnelerden biri bu.',
      'Ve çoğu öğrenci bundan tek bir sonuç çıkarır: “Daha hızlı olmalıyım.” Oysa zaman sorunu yaşayanların çoğu yavaş değildir. Zamanlarını yanlış yerde harcıyorlardır. Hız, çoğu zaman sonuçtur; asıl mesele zamanın nerede kaybolduğu.',
    ],
    sections: [
      {
        title: 'Soru başına düşen süreyi bil',
        body: [
          'TYT’de 120 soru için 165 dakikan var. Bu, soru başına ortalama 1 dakika 22 saniye demek. AYT’de 160 soru için 180 dakikan var; soru başına ortalama 1 dakika 7 saniye.',
          'Ama bu ortalamalar biraz yanıltıcı. Bir dil bilgisi sorusu 30 saniyede biter. Uzun bir paragraf sorusu ya da çok adımlı bir problem 3 dakika isteyebilir. Ortalama, “her soruya eşit zaman ver” demek değil. Hızlı sorulardan biriktirdiğin süreyi zor sorulara aktarabilmek demek.',
          'Zaman sorunu yaşayan öğrencinin çoğu bu aktarımı yapamıyor. Çünkü kolay soruda da zor soruda da aynı temkinle, aynı yavaşlıkla ilerliyor. Ya da tam tersi, zor bir soruya takılıp kolay sorulara ayıracağı zamanı orada tüketiyor.',
        ],
      },
      {
        title: 'Zamanın nerede kaybolduğunu ölç',
        body: [
          'Bir sonraki denemende küçük bir deney yap. Her testin başında ve sonunda saati kitapçığın kenarına yaz. Türkçe kaçta başladı, kaçta bitti? Sosyal? Matematik? Fen?',
          'Deneme bittiğinde bu rakamlara bak. Çoğu öğrenci burada ilk kez gerçek tabloyu görür. “Ben matematikte yavaşım” diye düşünen öğrenci, aslında Türkçe paragraflarda 15 dakika fazla harcadığını fark eder. Sorun matematikte değil, matematiğe geç başlamaktadır.',
          'Bir adım ileri gitmek istersen, 3 dakikadan fazla süren her sorunun yanına küçük bir işaret koy. Deneme sonunda işaretli sorulara bak. Hepsi aynı konudan mı geliyor? Hepsi uzun metinli sorular mı? Hepsini sonunda doğru mu yaptın, yanlış mı? Bu küçük işaretler, süre sorununun haritasını çıkarır.',
        ],
      },
      {
        title: 'Turlama: Sınavı iki kez dolaş',
        body: [
          'Birçok öğrencinin işini kolaylaştıran yöntemlerden biri turlama. Mantığı basit: Sınavı baştan sona bir kere değil, iki kere dolaşıyorsun.',
          'İlk turda, okuduğunda nasıl çözeceğini hemen gördüğün soruları çöz. Bir soruyu okudun ve ilk 30-40 saniyede yol aklına gelmediyse, yanına küçük bir işaret koy ve geç. İkinci turda yalnızca işaretli sorulara dön.',
          'Bu yöntem iki şey kazandırır. Birincisi, kolay soruların hiçbirini zaman yetmediği için kaçırmazsın. İkincisi, zor bir soruya dönerken zihnin biraz dinlenmiş olur. Çoğu öğrenci ikinci turda, ilk okumada göremediği çözümü görür.',
          'Turlamayı ilk denemede tam oturtamayabilirsin. İlk birkaç denemede eskisinden biraz kötü bile gidebilir; çünkü yeni bir alışkanlık kuruyorsun. Üç dört deneme boyunca ısrar et. Sonra eski yönteminle karşılaştır.',
        ],
      },
      {
        title: 'İnatlaşma: Bir soru için tüm sınavı feda etmek',
        body: [
          'Herkesin bir “inat sorusu” olmuştur. Neredeyse çözdüğünü hissediyorsun, bırakırsan emeğin boşa gidecek gibi geliyor. İki dakika, üç dakika, beş dakika… Sonunda ya çözüyorsun ya da çözemiyorsun. Ama her iki durumda da kaybettiğin süre, sonradan çözebileceğin 3-4 kolay sorunun süresi.',
          'Kendine bir sınır koy. Örneğin bir soruya 2,5 dakika geçtiysen ve hâlâ sonuca yakın değilsen, onu bırak. Bunu bir yenilgi gibi görme. Sınav, bütün soruları çözme yarışı değil; en çok soruyu doğru çözme yarışı. Bırakmak da bir beceri ve denemelerde öğrenilir.',
        ],
      },
      {
        title: 'Hız, konu bilgisinden gelir',
        body: [
          'Hızlı çözen öğrencilere dikkat edersen, çoğunun aslında “acele etmediğini” görürsün. Soruyu okuyor, tanıyor ve çözüyorlar. Hızları, düşünme süresini kısaltmalarından değil, o soruyu daha önce yüz kez görmüş olmalarından geliyor.',
          'Bu yüzden zaman sorunu bazen bir konu eksiğinin kılık değiştirmiş hâlidir. Bir konuyu zayıf bilen öğrenci, o konudaki soruyu çözerken her adımda durup düşünmek zorunda kalır. Konuyu oturttuğunda süre de kendiliğinden kısalır.',
          'Türkçe paragraf için de durum benzer. Paragraf hızı bir gecede artmaz. Her gün düzenli olarak 15-20 paragraf sorusu çözen, haftalar sonra metinleri daha hızlı taradığını fark eder. Bunu bir sprint değil, yürüyüş gibi düşün.',
        ],
      },
      {
        title: 'Panik anı: Şimdi ve burada kal',
        body: [
          'Süre azaldığında beden alarm verir. Kalp hızlanır, nefes kısalır, gözlerin aynı satırı üç kez okur. Bu, zihninin seni tehlikeden korumaya çalışmasıdır. Ama sınav salonunda kaçacak bir tehlike yok; sadece önünde bir soru var.',
          'Böyle bir anda 15 saniye ayır. Kalemini bırak. Burnundan dört saniyede nefes al, ağzından altı saniyede ver. İki kez. Sonra sadece önündeki soruya bak. Kalan sorular, kaçırdığın sorular, sonuç, tercih listesi… Hepsi şu an orada değil.',
          'Irvin Yalom terapide “şimdi ve burada”nın gücünden bahseder: İnsan geçmişin pişmanlığı ve geleceğin kaygısı arasında sıkıştığında, bulunduğu ana dönmek ona nefes aldırır. Sınavda da öyle. Her soru, kendi küçük şimdisidir.',
        ],
      },
      {
        title: 'Gerçek saatte deneme çöz',
        body: [
          'YKS’de TYT sabah saat 10.15’te başlıyor. Senin denemelerin akşam 21.00’de, yatağın kenarında, arada bir mesaja bakarak çözülüyorsa, sınav günü bambaşka bir koşulla karşılaşırsın.',
          'Haftada en az bir denemeyi sınav saatinde, sınav süresiyle, telefonsuz ve aralıksız çöz. Sabah kahvaltısını da sınav sabahı yapacağın gibi yap. Bunu birkaç hafta tekrarlayınca bedenin o saatte uyanık ve odaklı olmaya alışıyor.',
          'Zaman sorunu bir haftada çözülmez. Ama ölçtükçe, turladıkça ve yanlışından değil süresinden de ders çıkardıkça, birkaç ay içinde o son 12 dakikalık sahne değişir. Saate baktığında, önünde 18 değil, 4-5 soru kaldığını görürsün.',
        ],
      },
    ],
  },
];
