export type ArticleCategorySlug = 'yks' | 'lgs' | 'dil-sinav-koclugu';

export type ArticleSummary = {
  slug: string;
  title: string;
  description: string;
};

export type Article = ArticleSummary & {
  category: ArticleCategorySlug;
  intro: string[];
  sections: { title: string; body: string | string[] }[];
  references?: { title: string; detail: string }[];
};

type Category = {
  slug: ArticleCategorySlug;
  label: string;
  shortLabel: string;
  description: string;
  articles: ArticleSummary[];
};

const yksArticles: Article[] = [
  {
    category: 'yks',
    slug: 'son-yilin-istatistikleri',
    title: 'YKS Son Yılın İstatistikleri',
    description: '2026 YKS verileri; aday sayıları, TYT ve AYT ortalamaları, YDT sonuçları, tercih davranışı ve üniversite doluluk oranları üzerinden sınav tablosunu anlamaya yardımcı olur.',
    intro: [
      'YKS hakkında konuşulurken ilk duyduğumuz şey genellikle aday sayısı oluyor. İki milyondan fazla kişi sınava girdi, şu kadar kişi tercih yaptı, bu kadar kişi üniversiteye yerleşti... Rakamlar büyük. Fakat 2026 YKS verilerinde esas mesele sayıların büyüklüğünden çok, bu sayıların birbirleriyle kurduğu ilişki.',
      'TYT Türkçede ortalama olarak soruların yarısından biraz fazlası doğru cevaplanırken Matematikte bu oran yüzde 17’ye düşüyor. Devlet üniversitelerindeki kontenjanlar neredeyse tamamen dolarken vakıf üniversitelerinde her beş kontenjandan yaklaşık biri boş kalıyor. Yerleştirme puanı hesaplanan adayların ise yaklaşık yüzde 42’si tercih aşamasına hiç geçmiyor.',
      'Böyle bakıldığında 2026 YKS, birkaç büyük sayıdan çok daha fazlasını anlatıyor.',
    ],
    sections: [
      { title: '2026 YKS’ye kaç kişi başvurdu?', body: ['2026 yılında TYT’ye 2 milyon 425 bin 627 aday başvurdu. Sınava katılanların sayısı 2 milyon 255 bin 76 oldu. AYT’ye 1 milyon 627 bin 970 kişi başvurdu; 1 milyon 473 bin 113 aday sınava girdi. YDT’de ise 203 bin 640 başvuruya karşılık 143 bin 270 katılım gerçekleşti.', 'Katılım oranları TYT’de yaklaşık yüzde 93, AYT’de yüzde 90,5, YDT’de ise yüzde 70,4 seviyesinde. TYT ve AYT’de başvuruyla gerçek katılım arasında çok büyük bir kopuş görünmüyor. YDT başka bir yerde duruyor; başvuru yapanların yaklaşık yüzde 30’u sınava katılmamış.', 'Bu veriler YDT aday grubunun diğer iki oturumdan farklı davrandığını gösteriyor. Bunun nedenini yalnızca bu sayılardan çıkarmak doğru olmaz. Bildiğimiz şey şu: YDT’de başvuru sayısıyla sınav salonuna gelen aday sayısı arasındaki mesafe TYT ve AYT’den çok daha geniş.', 'Aday sayıları konuşulurken bir başka ayrım da gözden kaçabiliyor. TYT’ye giren 2 milyon 255 bin kişinin tamamı aynı puan türünde sıralanmıyor. AYT’ye katılanların da hedefi aynı değil. Bu nedenle 2,4 milyonluk başvuru sayısı YKS’nin ölçeğini gösterir; rekabetin nasıl dağıldığını tek başına anlatmaz.'] },
      { title: 'TYT’de iki farklı performans alanı var', body: ['2026 TYT ortalamalarında Türkçe 40 soruda 20,5 doğru, Sosyal Bilimler 20 soruda 10,2 doğru olarak açıklandı. Matematikte ortalama 6,8, Fen Bilimlerinde ise 4,3 doğru.', 'Doğru sayıları toplam soru sayısına bölündüğünde Türkçe yüzde 51,25, Sosyal Bilimler yüzde 51, Temel Matematik yüzde 17, Fen Bilimleri ise yüzde 21,5 seviyesine denk geliyor. Türkçe ve Sosyal Bilimler neredeyse aynı noktada. Matematik ve Fen ise çok daha aşağıda.', 'Burada aslında iki ayrı grup oluşmuş. Türkçede ortalama bir öğrenci soruların yarısından biraz fazlasını doğru cevaplarken Matematikte altı sorudan yaklaşık biri doğru cevaplanmış durumda. Türkçe ile Matematik arasındaki fark 34,25 yüzde puanı. Bir başka ifadeyle Türkçedeki doğru cevap oranı Matematiğin yaklaşık üç katı.', 'Matematik ortalamasının 6,8 olması yalnızca “düşük bir net” meselesi değil. Aynı sınavın iki 40 soruluk testi arasında çok büyük bir performans ayrışması var: Türkçede 20,5 doğru, Matematikte 6,8 doğru.', 'Sosyal Bilimler ile Fen karşılaştırmasında da benzer bir tablo var. TYT’nin genel ortalamasını tek bir “sınav zordu” cümlesiyle açıklamak bu yüzden yetersiz kalıyor.'] },
      { title: 'AYT sayısalda dersler birbirine daha yakın', body: ['AYT Matematikte 40 soruda ortalama 7 doğru yapıldı. Fizikte 14 soruda 2,7, Kimyada 13 soruda 2,2, Biyolojide 13 soruda 3,0 doğru ortalaması oluştu.', 'Soru sayıları dikkate alındığında Matematik yüzde 17,5, Fizik yüzde 19,3, Kimya yüzde 16,9, Biyoloji ise yüzde 23,1 seviyesinde. Burada TYT’den farklı bir yapı var. TYT’de Türkçe ile Matematik arasında 34 puandan fazla fark oluşurken, AYT sayısalda dört dersin tamamı kabaca aynı bölgede toplanmış görünüyor.', 'Bu nedenle AYT sayısaldaki düşük ortalamayı yalnızca Matematik üzerinden açıklamak pek mümkün değil. Fen dersleri de benzer düzeyde. Hatta TYT Matematik ile AYT Matematik oranlarının birbirine yakın olması ayrıca dikkat çekici: yüzde 17 ve yüzde 17,5.', 'Ortalama seviyenin yüzde 20 civarında olduğu bir dağılımda birkaç soruluk fark bile sıralamada öğrenciyi hızlıca ayrıştırabilir. Örneğin AYT Matematikte 7 doğru ortalamasına karşılık 14 doğru yapmak, sayı olarak yalnızca 7 soruluk fark gibi görünür; fakat ortalama performansın iki katına çıkmak anlamına gelir.'] },
      { title: 'Sözel AYT’de ortalama yaklaşık dört sorudan biri', body: ['AYT Türk Dili ve Edebiyatında 24 soruda 6,1 doğru ortalaması oluştu. Tarih-1’de 10 soruda 2,6; Coğrafya-1’de 6 soruda 1,7 doğru yapıldı. Oran olarak Türk Dili ve Edebiyatı yüzde 25,4, Tarih-1 yüzde 26, Coğrafya-1 yüzde 28,3 seviyesinde.', 'Üç test birbirine oldukça yakın. Burada tek bir dersin diğerlerinden dramatik biçimde ayrıldığı bir yapı yok. Ortalama başarı yaklaşık yüzde 25-28 bandında dolaşıyor.', 'TYT’nin sözel testleriyle karşılaştırınca fark daha açık görünür. TYT Türkçe yüzde 51,25 iken AYT Edebiyat yüzde 25,4. TYT Sosyal Bilimler yüzde 51 iken AYT Tarih-1 yüzde 26. Bu doğrudan “AYT iki kat daha zor” anlamına gelmez; sınavların içerikleri, soru yapıları ve aday grupları aynı değildir. Fakat performans düzeyleri arasında belirgin bir oran farkı olduğu açıktır.', 'Sosyal Bilimler-2’de de benzer değerler var. Tarih-2’de ortalama yüzde 17, Coğrafya-2’de yaklaşık yüzde 19, Felsefe Grubunda yüzde 16 ve Din Kültürü/Ek Felsefe Grubunda yaklaşık yüzde 19 civarında. Yani AYT’nin sözel tarafında da yüzde 20-30 bandı oldukça yaygın.'] },
      { title: 'YDT’de diller arasındaki fark daha geniş', body: ['YDT’de 80 soru bulunuyor. 2026 sonuçlarına göre Almanca ortalaması 43,0, Arapça 44,3, Fransızca 46,1, İngilizce 37,1 ve Rusça 56,9 doğru olarak açıklandı.', 'Yüzdeye çevrildiğinde Almanca yüzde 53,8, Arapça yüzde 55,4, Fransızca yüzde 57,6, İngilizce yüzde 46,4 ve Rusça yüzde 71,1 seviyesine denk geliyor. Rusça ile İngilizce arasındaki fark yaklaşık 24,7 yüzde puanı. Bu oldukça geniş bir fark.', 'Fakat burada sınav güçlüğü hakkında hızlı bir sonuca gitmek doğru olmaz. Her dili seçen aday kitlesinin büyüklüğü ve yapısı aynı değil. Yalnızca ortalamaya bakarak Rusçanın İngilizceden kolay olduğu söylenemez.', 'Verinin söylediği daha sınırlı ama önemli bir şey var: 2026 yılında bu beş YDT grubunun ortalama performansları birbirine yakın oluşmadı. İngilizcede adaylar soruların ortalama yüzde 46’sını doğru cevaplarken Rusçada oran yüzde 71’i geçti.'] },
      { title: 'Sınava girmekle tercih yapmak arasında büyük bir kayıp var', body: ['2026 yılında 2 milyon 187 bin 747 adayın yerleştirme puanı hesaplandı. Bunlardan 1 milyon 279 bin 439’u tercih yaptı. Toplam 730 bin 854 aday ise bir yükseköğretim programına yerleşti.', 'Bu üç rakam art arda konulduğunda tablo oldukça netleşiyor: 2 milyon 187 bin 747 yerleştirme puanı hesaplanan aday, 1 milyon 279 bin 439 tercih yapan aday ve 730 bin 854 yerleşen aday.', 'Yerleştirme puanı hesaplananların yalnızca yüzde 58,5’i tercih yaptı. Başka bir ifadeyle yaklaşık yüzde 41,5’lik bir kesim tercih aşamasına hiç geçmedi. Bu yaklaşık 908 bin kişilik büyük bir grup demek.', 'Tercih yapanların yüzde 57,1’i bir programa yerleşti. Bütün yerleştirme puanı hesaplanan adaylar başlangıç noktası kabul edildiğinde üniversiteye yerleşenlerin oranı yaklaşık yüzde 33,4 oluyor. Kabaca her üç adaydan biri.', 'Yerleşen 730 bin 854 adayın 641 bin 458’i örgün, 89 bin 396’sı açıköğretim programlarına girdi. Bu da yerleşenlerin yaklaşık yüzde 88’inin örgün yükseköğretim programlarına yerleştiği anlamına geliyor.'] },
      { title: 'Devlet ve vakıf üniversitelerinde yaklaşık 20 puanlık doluluk farkı var', body: ['Devlet üniversitelerinde lisans ve ön lisans birlikte 481 bin 684 kontenjan vardı. 479 bin 392 öğrenci yerleşti. Doluluk oranı yüzde 99,5.', 'Vakıf üniversitelerinde 176 bin 80 kontenjanın 140 bin 374’ü doldu. Oran yüzde 79,7. Aradaki fark yaklaşık 19,8 yüzde puanı. Bu küçük bir oynama değil.', 'Devlet üniversitelerinde her 1.000 kontenjandan yaklaşık 995’i dolarken vakıf üniversitelerinde aynı sayı yaklaşık 797. Boş kontenjan sayıları da farkın büyüklüğünü gösteriyor: devlet üniversitelerinde 2.292, vakıf üniversitelerinde 35.706 boş kontenjan.', 'Yalnızca bu iki üniversite türü birlikte değerlendirildiğinde toplam 37.998 boş kontenjanın yaklaşık yüzde 94’ü vakıf üniversitelerinde bulunuyor. Bu oran, toplam kontenjan sayılarındaki farkla açıklanamayacak kadar yüksek.', 'Hangi bölümlerin, şehirlerin veya ücret düzeylerinin bu farkta daha fazla etkili olduğunu bu genel tablo tek başına söylemez. Bunun için bölüm ve üniversite bazındaki verilere inmek gerekir.'] },
      { title: 'Mezun adaylar son sınıf öğrencilerinden daha kalabalık', body: ['2026 yılında yerleştirme puanı hesaplanan adayların 766 bin 971’i lise son sınıf öğrencisiydi. Daha önce mezun olmuş fakat herhangi bir yükseköğretim programına yerleşmemiş adayların sayısı ise 954 bin 596.', 'Aradaki fark 187 bin 625 kişi. Oransal olarak mezun ve daha önce yerleşmemiş aday grubu, son sınıf öğrencilerinden yaklaşık yüzde 24,5 daha büyük. Bu iki grup kendi içinde ele alındığında mezun adayların payı yaklaşık yüzde 55’e çıkıyor.', 'Üstelik burada daha önce bir yükseköğretim programına yerleşmiş adaylar, üniversite mezunları ve kaydı silinenler hesaba katılmış değil. Dolayısıyla YKS’nin aday profili “o yıl liseden mezun olacak öğrenciler” ağırlıklı basit bir yapı göstermiyor.', 'Sınava ilk kez girenlerle yeniden girenlerin oluşturduğu büyük bir karışım var. Her yıl sisteme yalnızca yeni bir lise son sınıf grubu eklenmiyor; geçmiş yıllardan gelen oldukça büyük bir aday kitlesi de sınavın içinde kalmaya devam ediyor.'] },
      { title: '2026 YKS’nin sayılarla ortaya çıkardığı yapı', body: ['2026 verileri yan yana konulduğunda birkaç farklı katman oluşuyor. TYT’nin sözel testlerinde ortalama başarı yaklaşık yüzde 51 seviyesinde. Matematik ve Fen tarafında ise yüzde 17-22 bandına iniliyor.', 'AYT sayısalda Matematik, Fizik, Kimya ve Biyoloji birbirinden çok kopmuyor; ortalamalar yaklaşık yüzde 17 ile yüzde 23 arasında. Sözel AYT’nin ilk bölümünde de çoğunlukla yüzde 25 civarında bir performans var. YDT ise kendi içinde daha geniş bir dağılıma sahip: İngilizcede yüzde 46 civarındaki ortalama Rusçada yüzde 71’in üzerine çıkıyor.', 'Bir başka tarafta sınavdan tercihe doğru büyük bir daralma yaşanıyor. Yerleştirme puanı hesaplanan adayların yalnızca yüzde 58,5’i tercih yapıyor; bunların da yüzde 57,1’i yerleşiyor.', 'Üniversite türleri arasında yaklaşık 20 puanlık bir doluluk farkı var. Devlet üniversiteleri yüzde 99,5’e ulaşırken vakıf üniversiteleri yüzde 79,7’de kalıyor. Sınava giren kitlenin önemli bir bölümü de o yıl liseden mezun olacak öğrencilerden oluşmuyor; daha önce mezun olmuş ve herhangi bir programa yerleşmemiş adayların sayısı son sınıf öğrencilerinden yaklaşık 188 bin fazla.', 'Bana göre 2026 YKS verilerinin en güçlü tarafı burada ortaya çıkıyor: rakamlar yalnızca sınavın ne kadar kalabalık olduğunu göstermiyor. Sınavın hangi bölümlerinde ortalama performansın düştüğünü, aday kitlesinin tercih aşamasında nasıl küçüldüğünü ve üniversite talebinin nerede yoğunlaştığını da görünür hale getiriyor.', 'Bu yüzden 2026 YKS’yi tek bir “2,4 milyon aday” rakamıyla anlatmak eksik kalıyor. Asıl tablo; yüzde 17’lik Matematik ortalaması, yüzde 51’lik Türkçe performansı, tercih yapmayan yaklaşık 908 bin aday, devlet üniversitelerindeki yüzde 99,5 doluluk ve son sınıf öğrencilerinden daha kalabalık bir mezun aday grubunun aynı yıl içinde yan yana gelmesiyle oluşuyor.'] },
    ],
    references: [
      {
        title: 'Ölçme, Seçme ve Yerleştirme Merkezi (ÖSYM). 2026-YKS Sınav Sonuçları Açıklandı. 2026.',
        detail: 'Sınava başvuran ve katılan aday sayıları ile TYT, AYT ve YDT test ortalamaları bu kaynaktan alınmıştır.',
      },
      {
        title: 'Ölçme, Seçme ve Yerleştirme Merkezi (ÖSYM). 2026-YKS Yerleştirme Sonuçlarına İlişkin Sayısal Bilgiler. 2026.',
        detail: 'Tercih yapan ve yerleşen aday sayıları, devlet ve vakıf üniversitelerinin kontenjan/doluluk verileri ile adayların öğrenim durumlarına ilişkin istatistikler bu kaynaktan alınmıştır.',
      },
    ],
  },
  {
    category: 'yks',
    slug: 'en-iyi-universiteler',
    title: 'Türkiye’nin En İyi Üniversiteleri: 2026 Verileriyle Güncel Bir Bakış',
    description: 'Türkiye’nin en iyi üniversitelerini QS, THE ve URAP verileriyle değerlendirirken tek bir sıralamanın neden yeterli olmadığını anlatan güncel rehber.',
    intro: [
      'Türkiye’nin en iyi üniversiteleri için bir sıralama hazırlamak ilk bakışta kolay görünüyor. Güncel listeleri açar, ilk sıralardaki üniversiteleri yazarız.',
      'Fakat 2026’da yayımlanan sonuçlarda daha ilk birkaç üniversitede bu yöntem bozuluyor. QS World University Rankings 2027’ye göre Türkiye’deki en yüksek sırayı İstanbul Teknik Üniversitesi alıyor. İTÜ dünyada 279’uncu. ODTÜ 305’inci, Koç Üniversitesi 329’uncu, Boğaziçi 345’inci, Sabancı 357’nci, Bilkent 454’üncü sırada.',
      'Times Higher Education’ın 2027 listesinde ise İTÜ ilk sırada değil. Koç Üniversitesi ve ODTÜ 326-350 dünya bandını paylaşarak Türkiye’de ilk sırada bulunuyor. Sabancı 376-400, Boğaziçi 401-450 arasında. Bilkent ve İTÜ ise 651-700 bandında. URAP’ı eklediğimizde sıra bir kez daha değişiyor.',
      'Bu yüzden “hangi liste doğru?” tartışmasına sıkışmak yerine, her listenin neyi ölçtüğünü anlamak daha faydalı.',
    ],
    sections: [
      {
        title: 'Aynı üniversiteler, oldukça farklı sonuçlar',
        body: [
          'QS 2027’de İstanbul Teknik Üniversitesi 279, ODTÜ 305, Koç Üniversitesi 329, Boğaziçi Üniversitesi 345, Sabancı Üniversitesi 357 ve Bilkent Üniversitesi 454’üncü sırada yer alıyor. THE 2027’de ise Koç ve ODTÜ 326-350 bandında; Sabancı 376-400, Boğaziçi 401-450, Bilkent ve İTÜ 651-700 bandında görünüyor.',
          'URAP’ın 2025-2026 genel Türkiye sıralamasında Koç birinci, Hacettepe ikinci, ODTÜ üçüncü, İstanbul Üniversitesi dördüncü ve İTÜ beşinci. Sabancı dokuzuncu, Bilkent 16’ncı, Boğaziçi ise 18’inci sırada. Bunlar tıp fakültesi olan veya olmayan üniversiteler için hazırlanmış ayrı tablolar değil; URAP’ın genel Türkiye sıralaması.',
          'Bu tablo, üniversite sıralamalarının tek bir doğruya işaret etmediğini gösteriyor. Aynı üniversite bir listede çok yukarıda, başka bir listede daha geride görünebilir. Sebep çoğu zaman üniversitenin birden değişmesi değil, listenin farklı ölçütlere bakmasıdır.',
        ],
      },
      {
        title: 'QS başka, THE başka bir ağırlık kullanıyor',
        body: [
          'QS’in hesaplamasında akademik itibar, atıflar, işverenlerin üniversite hakkındaki değerlendirmeleri, mezunların istihdam sonuçları, öğretim üyesi-öğrenci oranı ve uluslararası göstergeler birlikte kullanılıyor. İşveren itibarı tek başına toplam puanın yüzde 15’i. Mezun sonuçlarının payı yüzde 5, akademisyen başına atıfların payı yüzde 20.',
          'Boğaziçi’nin QS tablosunda işveren itibarı puanı 89,2, mezun sonuçları 92,4. Akademisyen başına atıf puanı ise 28,1. Bu üç rakamı aynı satırda görmek, Boğaziçi hakkında sadece “345’inci üniversite” demekten daha fazla şey söylüyor. Özellikle mezun ve işveren tarafındaki puanlar oldukça yüksek.',
          'THE’de araştırmanın ağırlığı daha fazla hissediliyor. Araştırma ortamı toplam puanın yüzde 29’unu, araştırma kalitesi yüzde 30’unu oluşturuyor. Öğretimin payı yüzde 29,5. Sanayi göstergesi ise yalnızca yüzde 4.',
          'Koç ile ODTÜ’nün aynı 326-350 bandında bulunmasına rağmen alt puanları epey farklı. ODTÜ’nün öğretim puanı 47,8, Koç’un 36,3. Araştırma kalitesinde ise Koç 71,6 puanla ODTÜ’nün 55,4 puanının önünde. Sanayi ve uluslararası görünümde aralarındaki fark çok sınırlı. Son tabloda ikisi aynı sıralama aralığına düşüyor.',
          'Bilkent’in rakamlarında ayrıca dikkat çeken bir ayrıntı var: sanayi puanı 99,2. Türkiye’deki üst gruptaki üniversiteler arasında son derece yüksek bir değer. Buna rağmen Bilkent’in genel THE sırası 651-700. Çünkü sanayi göstergesi toplam puanın yalnızca yüzde 4’ünü oluşturuyor.',
        ],
      },
      {
        title: 'İTÜ örneği sıralama farkını çok net gösteriyor',
        body: [
          'İTÜ’deki fark oldukça çarpıcı. QS’te dünya 279’uncusu olan İTÜ, THE’de 651-700 bandında yer alıyor. İki sıralamayı tek tabloda görmeden önce bu kadar büyük bir fark beklemeyebiliriz.',
          'Fakat sıralamaların içinde kullanılan ağırlıklara bakıldığında sayıların neden aynı yere çıkmadığı anlaşılır hale geliyor. QS’in daha güçlü gördüğü göstergelerle THE’nin ağırlık verdiği araştırma ve öğretim göstergeleri aynı etkiyi üretmeyebiliyor.',
          'Bu yüzden bir üniversitenin tek bir listedeki yerini alıp kesin hüküm vermek yanıltıcı olabilir. Sıralamayı okumak için önce listenin mantığını okumak gerekir.',
        ],
      },
      {
        title: 'URAP biraz başka bir tarafa bakıyor',
        body: [
          'URAP’ın 2025-2026 Türkiye sıralamasında 15 gösterge bulunuyor ve her gösterge 100 puan değerinde. Toplam puan 1500 üzerinden hesaplanıyor. Makale ve atıf sayıları, öğretim üyesi başına üretim, bilimsel dokümanlar, doktora mezunları ve öğrencileri, ulusal ve uluslararası ortak yayınlar ile TÜBİTAK projeleri hesaplamaya dahil ediliyor.',
          'Genel sıralamanın ilk beşi şöyle: Koç Üniversitesi 1152,95 puanla birinci, Hacettepe Üniversitesi 1096,52 puanla ikinci, ODTÜ 1082,81 puanla üçüncü, İstanbul Üniversitesi 1079,74 puanla dördüncü, İstanbul Teknik Üniversitesi 1067,02 puanla beşinci.',
          'Hacettepe’nin ikinci sıradaki yerini yalnızca “köklü ve güçlü bir üniversite olmasıyla” açıklamak biraz havada kalır. Makale göstergesi 175,60, atıf 166,17, bilimsel doküman 174,55 ve doktora göstergesi 189,16 seviyesinde. Koç’ta ise makale puanı 189,43, atıf 195,73, bilimsel doküman 188,58 ve TÜBİTAK proje puanı 182,30.',
          'URAP’ta Boğaziçi’nin 18’inci sırada olması da burada yerine oturuyor. QS’in puanlamasında çok güçlü olduğu işveren itibarı ve mezun sonuçları URAP’ın kullandığı göstergeler arasında yok. URAP doğrudan akademik üretim ve araştırma verilerini sayıyor.',
        ],
      },
      {
        title: 'Genel sıralama bazen bölümü örtebilir',
        body: [
          'Bir süre sıralamalara baktıktan sonra insan üniversite adlarından çok sütunlara bakmaya başlıyor. Çünkü üniversitenin sırası, hangi sütunların hesaba katıldığına oldukça duyarlı.',
          'Yine de listelerde tekrar eden bir grup var. İTÜ, ODTÜ, Koç, Boğaziçi, Sabancı ve Bilkent QS ile THE’nin Türkiye’deki ilk altısını oluşturuyor. URAP’ta liste daha fazla dağılıyor; Hacettepe ve İstanbul Üniversitesi yukarı çıkıyor, Boğaziçi ve Bilkent aşağıya iniyor.',
          'Bir de bölüm meselesi var. Genel sıralama bu kısmı kolayca örtebilir. İTÜ’nün THE genel sırası 651-700. Aynı üniversite 2026 alan sıralamasında Bilgisayar Bilimlerinde 251-300, Mühendislikte 301-400, Fizik Bilimlerinde 601-800 arasında.',
          'ODTÜ’de Eğitim Bilimleri dünya 93’üncüsü. Sosyal Bilimler 151-175, Mühendislik 201-250, Bilgisayar Bilimleri 251-300 arasında. Bu noktada genel sıralamayı bırakıp bölüme bakmak bazen gerçekten tabloyu değiştirir.',
          'İTÜ için 651-700 rakamını görüp mühendislik tarafındaki 301-400 bandını hiç görmemek, üniversite hakkında eksik bir izlenim bırakabilir.',
        ],
      },
      {
        title: 'Peki Türkiye’nin en iyi üniversiteleri hangileri?',
        body: [
          'Kısa bir cevap aranıyorsa, 2026’daki uluslararası genel sıralamalarda en sık yukarıda gördüğümüz grup İTÜ, ODTÜ, Koç, Boğaziçi, Sabancı ve Bilkent. Akademik üretimi daha yoğun biçimde ölçen URAP’ta Hacettepe ve İstanbul Üniversitesi de listenin en üst kısmında.',
          'Ben bunu tek bir 1-2-3 sıralamasına çevirmeyi tercih etmem. Çünkü İTÜ’ye “Türkiye’nin birincisi” dediğim anda QS’i seçmiş olurum. Koç veya ODTÜ dediğimde THE’yi; Koç, Hacettepe, ODTÜ şeklinde ilerlediğimde URAP’ı.',
          'Listenin başına hangi üniversitenin yazılacağı, daha listeyi hazırlamadan önce verdiğimiz bu karara bağlı. Öğrenci için en sağlıklı yaklaşım, genel sıralamayı görmek ama asıl kararını hedeflediği bölüm, şehir, burs, kampüs, akademik imkan ve mezuniyet sonrası beklentilerle birlikte vermektir.',
        ],
      },
    ],
    references: [
      { title: 'QS Quacquarelli Symonds — QS World University Rankings 2027.', detail: 'Türkiye’deki üniversitelerin dünya sıralamaları ve üniversite bazındaki gösterge puanları için kullanılmıştır.' },
      { title: 'QS — World University Rankings Methodology.', detail: 'Akademik itibar, atıf, işveren itibarı, mezun sonuçları, öğrenci-öğretim üyesi oranı ve uluslararası göstergelerin ağırlıkları için kullanılmıştır.' },
      { title: 'Times Higher Education — Best Universities in Turkey 2027.', detail: 'Koç, ODTÜ, Sabancı, Boğaziçi, Bilkent ve İTÜ’nün dünya sıralama bantları ile alt gösterge puanları için kullanılmıştır.' },
      { title: 'Times Higher Education — World University Rankings 2027 Methodology.', detail: 'Öğretim, araştırma ortamı, araştırma kalitesi, uluslararası görünüm ve sanayi göstergelerinin ağırlıkları için kullanılmıştır.' },
      { title: 'URAP Araştırma Laboratuvarı — 2025-2026 URAP Türkiye Sıralaması, 19 Ekim 2025.', detail: 'Genel Türkiye sıralaması, puanlar ve kullanılan 15 akademik performans göstergesi için esas alınmıştır.' },
      { title: 'Times Higher Education — Subject Rankings 2026.', detail: 'İTÜ ve ODTÜ’nün alan bazlı dünya sıralamaları için kullanılmıştır.' },
    ],
  },
  {
    category: 'yks',
    slug: 'en-cok-kazanan-bolumler-2026',
    title: '2026’da En Çok Kazandıran Meslekler',
    description: 'TÜİK’in 2026’da yayımlanan yükseköğretim istihdam verilerine göre en yüksek kazanç sağlayan bölümler, istihdam oranları ve eğitim-meslek uyumu üzerine güncel değerlendirme.',
    intro: [
      '2026’da yayımlanan son TÜİK verisine bakarsak listenin başında pilotaj var. Ardından Matematik Mühendisliği, Uzay Mühendisliği, Uçak Mühendisliği ve Kontrol ve Otomasyon Mühendisliği geliyor.',
      'Listenin ilk beşine bakınca bazı alışıldık isimler ortada yok. Hukuk yok mesela. Tıp ilk beşte değil. Bilgisayar mühendisliği de değil; TÜİK’in daha geniş bölüm sıralamasında 15’inci, yazılım mühendisliği ise 21’inci sırada yer alıyor.',
      'İlk beşte dört mühendislik bölümünün bulunması daha ilginç. Bunların ikisi doğrudan havacılıkla ilgili, uzay mühendisliğini de eklediğimizde listenin büyük bölümü oldukça teknik ve dar uzmanlık alanlarından oluşuyor.',
    ],
    sections: [
      {
        title: 'Aylık ortalama kazancı en yüksek lisans bölümleri',
        body: [
          'TÜİK’in yayımladığı sıralamaya göre aylık ortalama kazancı en yüksek lisans bölümlerinin ilk beşi şöyle: Pilotaj, Matematik Mühendisliği, Uzay Mühendisliği, Uçak Mühendisliği ve Kontrol ve Otomasyon Mühendisliği.',
          'Ön lisans tarafında ilk sıranın Uçak Teknolojisi olması da aynı tabloya küçük bir parça daha ekliyor. Onu perakende satış ve mağaza yönetimi, polis meslek eğitimi, elektrik enerjisi üretim-iletim-dağıtımı ve marka iletişimi izliyor.',
          'TÜİK burada bölüm mezunlarının aylık ortalama kazançlarını sıralıyor. Bültenin kamuya açık özetinde bu bölümlerin kazanç tutarları TL olarak verilmediği için “2026 pilot maaşı şu kadar, matematik mühendisi maaşı bu kadar” şeklinde rakamlar eklemek doğru olmaz. İnternette karşılaşılan maaş tablolarının önemli bir kısmı birbirinden farklı ölçüm yöntemleri kullanıyor.',
        ],
      },
      {
        title: 'Matematik Mühendisliği neden dikkat çekiyor?',
        body: [
          'Pilotajın birinciliği çok şaşırtıcı olmayabilir. Benim daha fazla ilgimi çeken bölüm Matematik Mühendisliği. Kazanç sıralamasında ikinci. Aynı yıl mezunlarının kayıtlı istihdam oranı yüzde 89,8.',
          'Türkiye’deki tüm lisans mezunlarında kayıtlı istihdam oranı yüzde 73,9. Matematik Mühendisliği bu haliyle hem kazanç listesinin hem de kayıtlı istihdamı en yüksek ilk beş bölümün içinde yer alıyor.',
          'İstihdam listesinin tamamı zaten kazanç listesinden oldukça farklı. Tıp yüzde 95,5 ile ilk sırada. Özel Eğitim Öğretmenliği yüzde 90,8, Havacılık Elektrik ve Elektroniği yüzde 89,9, Matematik Mühendisliği yüzde 89,8, Hemşirelik yüzde 89,8 kayıtlı istihdam oranına sahip.',
          'Tıp burada oldukça ayrı bir yerde. Yaklaşık her 20 tıp mezunundan 19’u kayıtlı istihdamda. Kazançta ilk beşe girmediğini biliyoruz; daha geniş bölüm listelerinde tıp altıncı sırada görünüyor.',
        ],
      },
      {
        title: 'İşe geçiş süresi başka bir tablo anlatıyor',
        body: [
          'Lisans mezunlarının ilk kayıtlı işlerini bulma süresi 2025’te ortalama 14,2 ay. Tıp mezunlarında bu süre 3,9 ay. Daha hızlısı da var: Dil ve Konuşma Terapisi mezunları ortalama 2,4 ayda ilk kayıtlı işlerine geçiyor.',
          'Özel Eğitim Öğretmenliği 4,4 ay, Eczacılık 4,6 ay, Ergoterapi 7,6 ay seviyesinde. Bu rakamların yan yana gelişi biraz garip ama gerçek hayattaki iş piyasası da zaten kusursuz bir sıralama tablosu gibi çalışmıyor.',
          'Pilotaj kazançta birinci. Tıp istihdamda birinci. Dil ve Konuşma Terapisi mezunları ilk işlerine en hızlı geçen grup. Matematik Mühendisliği ise iki ayrı listenin üst tarafında birden görünüyor. Bunların hepsini tek ölçüye çevirip hangisinin “daha iyi meslek” olduğunu hesaplamaya çalışınca veri bize yardımcı olmaktan uzaklaşmaya başlıyor.',
        ],
      },
      {
        title: 'Havacılık neden listede bu kadar çok görünüyor?',
        body: [
          'Pilotaj, Uzay Mühendisliği ve Uçak Mühendisliği kazançta ilk dört bölümün üçü. Havacılık Elektrik ve Elektroniği de yüzde 89,9 kayıtlı istihdamla kendi listesinin üst sıralarında. Ön lisansta kazanç lideri Uçak Teknolojisi.',
          'Bunun nedenine ilişkin TÜİK araştırmasında ayrı bir açıklama yok. Yine de ortak özellikleri görmek zor değil. Havacılık; eğitim maliyetinin, teknik standartların ve uzmanlık gereksiniminin yüksek olduğu bir sektör. Aynı zamanda çalışan sayısının genel işletme ya da sosyal bilim alanlarındaki kadar geniş olmadığı bir pazar.',
          'Buradan “havacılık bölümü seçen çok kazanır” gibi kesin bir sonuç çıkmaz. Böyle bir sonuç için elimizde yeterli veri yok. Listede aynı alanın birkaç farklı eğitim düzeyinde tekrar tekrar görülmesi ise gerçek.',
          'Mühendisliğin tamamı için tablo daha sıradan. “Mühendislik, imalat ve inşaat” alanında kayıtlı istihdam oranı yüzde 82,1. Sağlık ve refahta yüzde 84,5; bilişim ve iletişim teknolojilerinde yüzde 76,7; eğitimde yüzde 75,4; iş, yönetim ve hukukta yüzde 74,1.',
          'Bu yüzden yüksek kazanç tablosunda dört mühendislik bölümünün yan yana bulunmasını bütün mühendisliklere yaymak fazla geniş bir genelleme olur. Listenin tepesindeki bölümler mühendisliğin oldukça belirli kolları.',
        ],
      },
      {
        title: 'Mezun olduğumuz bölümde mi çalışıyoruz?',
        body: [
          'Bence üniversite tercihi konuşulurken en az maaş kadar ilginç olan verilerden biri bu. Ücretli çalışan lisans mezunlarının yüzde 56,7’si eğitim aldığı alanla uyumlu bir meslek grubunda çalışıyor. Neredeyse yarı yarıya.',
          'Alanlara indiğimizde fark büyüyor. Sağlık ve refah mezunlarında kendi alanında çalışma oranı yüzde 80,4. İş, yönetim ve hukukta yüzde 79,6. Eğitimde yüzde 64,8, mühendislik-imalat-inşaatta yüzde 63,6, bilişim ve iletişim teknolojilerinde yüzde 56,1.',
          'Sosyal bilimler, gazetecilik ve enformasyon alanında bu oran yüzde 20,6. Yüzde 80,4 ile yüzde 20,6 arasındaki fark 59,8 puan.',
          'Bu sayıyı görünce üniversite bölümünü yalnızca diploma adı üzerinden düşünmek zorlaşıyor. Sağlık okuyan bir mezunla sosyal bilimler okuyan bir mezunun eğitim aldığı alanla daha sonra yaptığı iş arasındaki bağ aynı güçte değil.',
          'Üstelik burada “iş bulamama”dan söz etmiyoruz. Çalışan mezunların yaptığı işin eğitim alanıyla ne kadar uyuştuğundan söz ediyoruz. Bu ayrım önemli.',
        ],
      },
      {
        title: 'Peki neden 2026 maaşlarını TL olarak vermiyoruz?',
        body: [
          'Çünkü güvenilir ve tüm meslekleri aynı yöntemle karşılaştıran 2026 tarihli bir TÜİK maaş tablosu henüz yok. Meslek gruplarını doğrudan TL üzerinden karşılaştırabildiğimiz son kapsamlı TÜİK çalışması Kazanç Yapısı İstatistikleri 2023.',
          '2023’te yıllık ortalama brüt kazanç yöneticilerde 538 bin 530 TL, profesyonel meslek mensuplarında 409 bin 767 TL idi. Sektör bazında finans ve sigorta 640 bin 739 TL ile ilk sırada, bilgi ve iletişim 605 bin 317 TL ile ikinci sıradaydı.',
          'Bu rakamları 2026 maaşı diye kullanırsak üç yıl önceki ücretleri bugüne taşımış oluruz. TÜİK’in kendi yayımlama takviminde Kazanç Yapısı İstatistikleri’nin bir sonraki haber bülteni Aralık 2027 olarak görünüyor.',
          'O zamana kadar “2026’da doktor ortalama şu kadar, pilot bu kadar, yazılımcı şu kadar kazanıyor” diyen tablolar mutlaka çıkacaktır. Bazıları iş ilanlarından veri alacak, bazıları çalışan beyanlarından, bazıları birkaç kariyer sitesindeki rakamları birleştirecek. Bunlar başka tür veriler. Yararlı olabilirler ama hepsini kesin bir Türkiye sıralaması gibi sunmak konusunda temkinli olmak gerekir.',
        ],
      },
      {
        title: '2026 verisi bize ne söylüyor?',
        body: [
          '2026’da yayımlanan resmî veriye dönersek cevap daha kısa: kazançta ilk beş bölüm Pilotaj, Matematik Mühendisliği, Uzay Mühendisliği, Uçak Mühendisliği ve Kontrol ve Otomasyon Mühendisliği.',
          'Tıp altıncı sırada. Bilgisayar Mühendisliği 15’inci, Yazılım Mühendisliği 21’inci. Matematik Mühendisliği hem kazançta ikinci hem yüzde 89,8 kayıtlı istihdama sahip. Tıp mezunlarında kayıtlı istihdam yüzde 95,5. Üniversite mezunlarının tamamında ise eğitim aldığı alanla uyumlu çalışanların oranı yüzde 56,7.',
          'Bir kariyer tablosu için bunlar birbirinden oldukça farklı rakamlar. Ben olsam en çok sonuncusunu aklımda tutardım: üniversite mezunlarının önemli bir bölümü, yıllar sonra diplomasında yazan alanın dışında çalışıyor.',
          'Bir bölümün adı bazen meslek hayatının başlangıcı oluyor. Bazen de yalnızca başlangıçta alınmış bir yön.',
        ],
      },
    ],
    references: [
      { title: 'Türkiye İstatistik Kurumu (TÜİK), Yükseköğretim İstihdam Göstergeleri 2025. 23 Temmuz 2026.', detail: 'Lisans mezunlarında kayıtlı istihdam oranı, bölüm bazında istihdam, ilk işe geçiş süresi, aylık ortalama kazanç sıralaması ve eğitim-meslek uyumu verileri için kullanılmıştır.' },
      { title: 'Türkiye İstatistik Kurumu verilerinin 23 Temmuz 2026 tarihli ayrıntılı aktarımı.', detail: 'Bölüm bazında istihdam, ilk işe geçiş süresi, aylık ortalama kazanç sıralaması ve eğitim-meslek uyumu verileri için kullanıldı.' },
      { title: 'Türkiye İstatistik Kurumu (TÜİK), Kazanç Yapısı İstatistikleri 2023. 25 Aralık 2024.', detail: 'Meslek grupları ve sektörler için yıllık ortalama brüt kazançların son kapsamlı resmî kaynağıdır. Bir sonraki bülten tarihi TÜİK tarafından Aralık 2027 olarak belirtilmektedir.' },
    ],
  },
  {
    category: 'yks',
    slug: 'gelecegin-meslekleri',
    title: 'Geleceğin Meslekleri: 2030’a Doğru İş Dünyasında Neler Değişebilir?',
    description: '2030’a doğru iş dünyasında öne çıkması beklenen meslekler, yapay zeka, veri, siber güvenlik, sağlık, enerji ve Türkiye’de değişen beceri ihtiyaçları üzerine güncel rehber.',
    intro: [
      'Geleceğin meslekleri denildiğinde birkaç isim artık hemen akla geliyor: yapay zeka uzmanı, veri bilimci, siber güvenlik uzmanı, yazılım geliştirici...',
      'Dünya Ekonomik Forumu’nun 2025 yılında yayımladığı Future of Jobs Report bu beklentiyi büyük ölçüde doğruluyor. Büyük Veri Uzmanları yüzde olarak en hızlı büyümesi beklenen mesleklerin başında. FinTech mühendisleri, yapay zeka ve makine öğrenmesi uzmanları ile yazılım ve uygulama geliştiricileri de üst sıralarda bulunuyor.',
      'Fakat raporun iş sayısındaki artışı gösteren bölümüne geçtiğimizde ilk sıraya tarım çalışanları geliyor. Bugün dünya genelinde 200 milyondan fazla tarım çalışanı bulunuyor ve WEF, 2030’a kadar yaklaşık 34 milyon ilave tarım işi oluşabileceğini tahmin ediyor.',
    ],
    sections: [
      {
        title: 'Yüzde olarak büyüme ile iş sayısı artışı aynı şey değil',
        body: [
          'Büyük veri uzmanlığı mevcut çalışan sayısına göre çok hızlı genişleyen bir alan. Tarım ise zaten yüz milyonlarca insanın çalıştığı dev bir sektör. Daha küçük bir yüzde artışı bile milyonlarca yeni işe karşılık gelebiliyor.',
          'Bu yüzden geleceğin mesleklerini okurken iki ayrı tabloyu birbirine karıştırmamak gerekir. Bir meslek oransal olarak çok hızlı büyüyebilir ama toplam iş sayısı sınırlı kalabilir. Başka bir alanda büyüme oranı daha düşük görünürken yaratılan iş sayısı çok daha büyük olabilir.',
          'WEF’in genel hesabı da epey büyük rakamlara ulaşıyor. Araştırmadaki projeksiyona göre 2025-2030 döneminde makro eğilimler yaklaşık 170 milyon yeni iş yaratabilir, 92 milyon mevcut iş ise yer değiştirebilir. Net artış 78 milyon iş olarak tahmin ediliyor.',
          'Raporda bu hareket, incelenen 1,2 milyar formal işin yüzde 22’sine karşılık gelen yapısal işgücü hareketi olarak tanımlanıyor. Yeni işlerin payı yüzde 14, yer değiştirmesi beklenen işlerin payı yüzde 8; net istihdam artışı ise yüzde 7.',
        ],
      },
      {
        title: 'Bu veriler nasıl okunmalı?',
        body: [
          'Bu çalışma bir nüfus sayımı değil. 55 ekonomide, 22 sektör grubunda faaliyet gösteren 1.000’in üzerinde büyük işverenin görüşlerini kapsıyor ve bu şirketler 14 milyondan fazla çalışanı temsil ediyor. 2030’a ilişkin rakamlar da bu beklentilerin küresel istihdam verileriyle birleştirilmesinden oluşuyor.',
          'Yani rapor bize “2030’da kesin olarak şu kadar kişi bu meslekte çalışacak” demiyor. Daha çok işverenlerin hangi alanlarda büyüme, dönüşüm ve beceri ihtiyacı beklediğini gösteriyor.',
          'Öğrenci açısından bu ayrım önemli. Çünkü geleceğin mesleği diye görünen bir alanı seçmek tek başına yeterli değil. O alana giden bölüm, beceri, yabancı dil, teknoloji kullanımı ve çalışma biçimi birlikte düşünülmeli.',
        ],
      },
      {
        title: 'Teknoloji tarafında veri, yapay zeka ve güvenlik öne çıkıyor',
        body: [
          'Teknoloji tarafındaki hareketin en görünür kısmı şimdilik veri ve yapay zeka çevresinde. Şirketler daha fazla veri topluyor, finans dijitalleşiyor, üretim sistemleri ağa bağlanıyor. Siber güvenliğin önem kazanması da bunun doğal bir parçası. Bağlanan sistem sayısı arttıkça korunması gereken alan büyüyor.',
          'Yazılım geliştirme biraz daha karmaşık bir örnek. WEF, yazılım ve uygulama geliştiricilerini hızlı büyüyen meslekler arasında gösteriyor. Üretken yapay zeka ise aynı anda kod yazabiliyor, test hazırlayabiliyor, hata arayabiliyor ve dokümantasyon üretebiliyor.',
          'Bir yazılımcı eskiden saatlerce yazdığı kodun ilk taslağını artık yapay zekaya hazırlatabiliyor. Sonrasında kodun gerçekten doğru çalışıp çalışmadığını, mevcut sisteme uyup uymadığını veya güvenlik sorunu oluşturup oluşturmadığını kontrol ediyor. Çalışma gününün içeriği şimdiden değişmeye başladı.',
        ],
      },
      {
        title: 'Üretken yapay zeka işleri yok etmekten çok görevleri değiştiriyor',
        body: [
          'ILO’nun Mayıs 2025’te yayımladığı çalışma bu değişimi görev düzeyinde inceliyor. Araştırma, yaklaşık 30 bin mesleki görevin üretken yapay zeka tarafından ne ölçüde yapılabileceğini değerlendirmiş.',
          'Dünya genelindeki çalışanların yaklaşık dörtte biri, belirli ölçüde GenAI maruziyeti bulunan mesleklerde çalışıyor. Küresel istihdamın yüzde 3,3’ü ise en yüksek maruziyet kategorisinde. Büro ve idari meslekler en yüksek oranların görüldüğü gruplar arasında.',
          'Buradaki oranları “çalışanların dörtte biri işini kaybedecek” şeklinde okumak mümkün değil. ILO zaten en olası etkinin işlerin bütünüyle ortadan kalkmasından çok mesleklerin içindeki görevlerin değişmesi olduğunu söylüyor.',
          'Muhasebe kayıtlarının hazırlanması, standart müşteri yazışmaları, çeviri, belge inceleme veya temel yazılım işleri bu değişimin ilk görüldüğü alanlar. Bir meslekte otomatikleşebilen görevlerin sayısı arttıkça o işi yapan kişiden beklenen şeyler de yavaş yavaş değişiyor.',
        ],
      },
      {
        title: 'Türkiye’de tablo nasıl görünüyor?',
        body: [
          'WEF’in Türkiye için hazırladığı ülke değerlendirmesinde robotik mühendisleri, yenilenebilir enerji mühendisleri ile otonom ve elektrikli araç uzmanları hızlı büyümesi beklenen meslekler arasında. Türkiye’deki işverenler, 2030’a kadar iş başında kullanılan becerilerin yüzde 44’ünün değişime uğramasını bekliyor. Küresel ortalama yüzde 39.',
          'Yapay zeka ve büyük veri, teknolojik okuryazarlık, ağlar ve siber güvenlik Türkiye’de en hızlı önem kazanması beklenen beceriler arasında.',
          'İŞKUR’un “Geleceğin Meslekleri” listesi daha gündelik bir görüntü veriyor. Listenin ilk sırasında Yazılım Mühendisi, ardından E-Ticaret Uzmanı ve Bilişim Personeli bulunuyor. Elektrikli Otomobil Ustası dördüncü, Elektrikli Araç Tamir Bakım Ustası beşinci sırada.',
          'Büyük Veri Analisti dokuzuncu, Bilgi Güvenliği Uzmanı onuncu, Siber Güvenlik Personeli on ikinci sırada. Güneş Enerjisi Paneli Montaj Elemanı 17’nci, Drone Operatörü 24’üncü, Yapay Zeka Uzmanı 29’uncu. Kaynakçı 27’nci, Kurye ise 30’uncu sırada.',
        ],
      },
      {
        title: 'Geleceği yalnızca üniversite bölümleri üzerinden düşünmek eksik kalabilir',
        body: [
          'İŞKUR listesinin önemli tarafı burada. Geleceği yalnızca üniversite bölümleri üzerinden düşünmenin neden eksik kalabildiğini gösteriyor. Elektrikli araçların yaygınlaşması otomotiv mühendislerinin çalışma alanını değiştiriyor; aynı araçların bakımını yapabilecek ustalara da ihtiyaç duyuluyor.',
          'Güneş enerjisi yatırımlarında mühendislik tarafının yanında kurulum ve teknik bakım işi bulunuyor. E-ticaret büyüdüğünde yazılım kadar lojistik, operasyon, müşteri deneyimi ve satış tarafı da değişiyor.',
          'Türkiye’nin 2025-2028 Ulusal İstihdam Stratejisi’nde de yeşil ve dijital dönüşüm ile beceri uyumu temel politika alanlarından biri olarak belirlenmiş durumda. Mesleki eğitim programlarının yeni ihtiyaçlara göre güncellenmesi ve işgücünün dönüşüme hazırlanması bu çerçevenin parçaları arasında.',
        ],
      },
      {
        title: 'Sağlık ve bakım alanı başka bir dinamikle büyüyor',
        body: [
          'Sağlık tarafında başka bir dinamik çalışıyor. WEF hemşirelik, sosyal hizmetler, danışmanlık ve bakım işlerinde büyüme bekliyor. Bunun önemli nedenlerinden biri yaşlanan nüfus. İnsanlar daha uzun yaşadıkça uzun süreli sağlık hizmeti, rehabilitasyon ve bakım ihtiyacı da artıyor.',
          'Teknoloji bu mesleklerin içine giriyor; yapay zeka destekli görüntü analizi, dijital hasta kayıtları ve uzaktan sağlık sistemleri şimdiden kullanılıyor. Fakat bir hastanın fiziksel bakımını yapmak veya uzun süreli bir tedavide insanla iletişim kurmak farklı türde işler.',
          'Gelecekte büyümesi beklenen mesleklerin hepsinin ortak bir nedeni yok. Bazılarını teknoloji büyütüyor. Bazılarında nüfus yapısı etkili. Enerji yatırımları başka işler çıkarıyor, artan çevrim içi ticaret başka.',
        ],
      },
      {
        title: 'Becerilerdeki değişim daha geniş bir grubu ilgilendiriyor',
        body: [
          'WEF’in becerilerle ilgili tahmini yalnızca yeni mezunları kapsamıyor. İşverenler, çalışanların bugün kullandığı beceri setlerinin ortalama yüzde 39’unun 2025-2030 arasında dönüşmesini veya güncelliğini yitirmesini bekliyor.',
          'En hızlı önem kazanması beklenen becerilerin başında yapay zeka ve büyük veri geliyor. Ağlar ve siber güvenlik ile teknolojik okuryazarlık da üst sıralarda. Analitik düşünme, yaratıcı düşünme, dayanıklılık, esneklik, liderlik ve iş birliği gibi beceriler de şirketlerin önem vermeye devam ettiği alanlar.',
          'Rapor, dünya işgücünü 100 kişi üzerinden anlattığında 59 kişinin 2030’a kadar yeniden beceri kazanma veya mevcut becerilerini geliştirme ihtiyacı yaşayacağını öngörüyor. Bu 59 kişinin 11’inin gerekli eğitime ulaşamayabileceği tahmin ediliyor.',
          '2030’da çalışacak insanların çoğu iş hayatına 2030’da başlamayacak. Bugün ofiste, fabrikada, hastanede, okulda veya sahada çalışan insanlar da o yılın işgücünün büyük bölümünü oluşturacak.',
        ],
      },
      {
        title: 'Öğrenci için çıkarılacak en pratik sonuç',
        body: [
          'Geleceğin meslekleri tartışmasının belki en pratik tarafı burada. Beş yıl sonrasının kesin meslek listesini bugünden çıkarmak zor. Şimdiden kullanılan araçların ve istenen becerilerin değişimini görmek ise daha kolay.',
          'Bugünkü verilerde yapay zeka ve veri, yazılım, siber güvenlik, elektrikli araç teknolojileri, yenilenebilir enerji, sağlık ve bakım alanları sık sık karşımıza çıkıyor. Tarım, inşaat, taşımacılık ve satış gibi büyük istihdam alanlarında da milyonlarca yeni iş bekleniyor.',
          'Şimdilik elimizdeki tablo bu. 2030 yaklaştıkça listenin bazı isimleri değişecektir; bazıları muhtemelen yerinde kalacaktır. Öğrenci için en sağlam hazırlık, tek bir meslek adına kilitlenmekten çok öğrenmeyi sürdürme, teknoloji okuryazarlığı, analitik düşünme ve kendini güncelleme becerisini güçlendirmektir.',
        ],
      },
    ],
    references: [
      { title: 'World Economic Forum, The Future of Jobs Report 2025. 7 Ocak 2025.', detail: 'Araştırma; 55 ekonomi, 22 sektör grubu ve 14 milyondan fazla çalışanı temsil eden 1.000’in üzerinde işverenin görüşlerine dayanıyor. İstihdam ve beceri projeksiyonlarının temel kaynağıdır.' },
      { title: 'International Labour Organization, Generative AI and Jobs: A Refined Global Index of Occupational Exposure. 20 Mayıs 2025.', detail: 'Yaklaşık 30 bin görevi inceleyen çalışma, üretken yapay zekaya mesleki maruziyet ve görev dönüşümü için kullanılmıştır.' },
      { title: 'Türkiye İş Kurumu, Geleceğin Meslekleri.', detail: 'Yazılım, otomotiv, enerji, siber güvenlik, veri ve çeşitli teknik mesleklerin Türkiye listesindeki yerleri için kullanılmıştır.' },
      { title: 'World Economic Forum, Türkiye ülke değerlendirmesi.', detail: 'Türkiye’de hızlı büyümesi beklenen meslekler ve 2030 beceri değişimi tahminleri için kullanılmıştır.' },
    ],
  },
  {
    category: 'yks',
    slug: 'netlerim-neden-artmiyor',
    title: 'Netlerim Neden Artmıyor?',
    description: 'Çok çalıştığı halde netleri artmayan öğrencinin önce çalışma biçimini ve deneme sonrası davranışını incelemek gerekir.',
    intro: [
      'Netlerin artmaması öğrenciyi çok yorar. “Bu kadar çalışıyorum, neden olmuyor?” sorusu bir süre sonra motivasyonu da düşürür. Fakat net artışı bazen emekten hemen sonra gelmez; çalışma biçimi yanlışsa hiç gelmeyebilir.',
      'Bu noktada öğrencinin ne kadar çalıştığından önce nasıl çalıştığına bakmak gerekir.',
    ],
    sections: [
      { title: 'Yanlış analizi yapılmıyor olabilir', body: 'Denemeden sonra yalnızca nete bakmak yeterli değildir. Yanlış soruların hangi konudan geldiği, neden yanlış yapıldığı ve aynı hatanın tekrar edip etmediği incelenmelidir.' },
      { title: 'Konu bitirmek öğrenmek değildir', body: 'Bir konuyu dinlemek veya kitaptan bitirmek, o konunun sınavda kullanılabildiği anlamına gelmez. Öğrencinin farklı soru tipleriyle karşılaşması ve bilgiyi denemede kullanabilmesi gerekir.' },
      { title: 'Sabır ve doğru takip', body: 'Net artışı bazen birkaç haftalık düzenli çalışmadan sonra görünür. Önemli olan gelişimi sadece bir deneme üzerinden değil, birkaç denemenin toplam eğilimiyle değerlendirmektir.' },
    ],
  },
  {
    category: 'yks',
    slug: 'tyt-mi-ayt-mi-oncelikli',
    title: 'TYT mi AYT mi Öncelikli?',
    description: 'TYT ve AYT önceliği öğrencinin sınıf düzeyine, netlerine, hedef bölümüne ve eksiklerine göre değişir.',
    intro: [
      'YKS öğrencilerinin en sık sorduğu sorulardan biri şudur: “TYT mi çalışayım, AYT mi?” Bu soruya herkes için geçerli tek bir cevap vermek doğru olmaz.',
      'TYT temel becerileri ve süre yönetimini, AYT ise alan bilgisini daha belirgin ölçer. Hedefe göre bu iki sınavın ağırlığı değişebilir.',
    ],
    sections: [
      { title: 'TYT temel oluşturur', body: 'TYT’de Türkçe, matematik, sosyal ve fen alanındaki temel beceriler öğrencinin sınav dayanıklılığını etkiler. Süre yönetimi zayıf olan öğrenci TYT’yi tamamen geri plana atmamalıdır.' },
      { title: 'AYT hedefi belirler', body: 'Özellikle yüksek sıralama isteyen öğrenciler için AYT güçlü bir belirleyicidir. Alan derslerindeki konu eksikleri ertelendikçe son aylarda baskı artar.' },
      { title: 'Denge kişiye göre kurulur', body: 'Doğru plan öğrencinin mevcut netlerine, hedef bölümüne ve zamanına göre yapılır. Bazı haftalar TYT ağırlıklı, bazı haftalar AYT ağırlıklı ilerlemek daha mantıklı olabilir.' },
    ],
  },
  {
    category: 'yks',
    slug: 'yksde-zaman-yetmiyor-ne-yapmaliyim',
    title: 'YKS’de Zaman Yetmiyor: Ne Yapmalıyım?',
    description: 'Zaman sorunu yalnızca hızlı soru çözerek değil, doğru sıra, soru seçimi ve düzenli deneme analiziyle çözülür.',
    intro: [
      'YKS’de zamanın yetmemesi çok yaygın bir sorun. Öğrenci konuyu biliyor olabilir ama soruyu okuma, yorumlama veya işlem sürecinde fazla vakit kaybedebilir.',
      'Bu durumda çözüm her zaman “daha hızlı ol” demek değildir. Önce zamanın nerede kaybolduğunu görmek gerekir.',
    ],
    sections: [
      { title: 'Süre kaybının kaynağı bulunmalı', body: 'Bazı öğrenciler uzun paragraf sorularında, bazıları işlem gerektiren matematik sorularında, bazıları da kararsız kaldığı sorularda zaman kaybeder. Çözüm, sorunun kaynağına göre değişir.' },
      { title: 'Soru seçimi öğrenilebilir', body: 'Her soruya aynı inatla yaklaşmak sınav stratejisi değildir. Öğrenci takıldığı soruyu bırakıp geri dönmeyi öğrenmelidir. Bu alışkanlık denemelerde kazanılır.' },
      { title: 'Deneme sonrası süre analizi', body: 'Denemeden sonra yalnızca doğru ve yanlışlara bakmak yetmez. Hangi bölümde kaç dakika harcandığı da takip edilmelidir. Zaman yönetimi, ölçüldükçe gelişir.' },
    ],
  },
];

const lgsArticles: Article[] = [
{
    category: 'lgs',
    slug: 'en-iyi-liseler',
    title: "Türkiye'nin En İyi Liseleri 2026: LGS'de En Yüksek Puanla Öğrenci Alan Liseler",
    description: "2026 LGS ilk yerleştirme taban puanlarına göre en yüksek puanla öğrenci alan liseleri, özel yabancı liseleri ve tercih döneminde dikkat edilmesi gereken farkları anlatan güncel rehber.",
    intro: [
      "2026 LGS'ye 994 bin 358 öğrenci katıldı. Sınavdaki 90 sorunun tamamını doğru cevaplayan 452 öğrenci 500 tam puan aldı.",
      "5 Ağustos'ta ilk yerleştirme sonuçları açıklandığında iki program 500 puandaydı: İstanbul Erkek Lisesi ve Kabataş Erkek Lisesinin Almanca programı.",
      "Türkiye'de bütün liseleri eğitim kalitesine göre sıralayan resmi bir 'en iyi liseler' araştırması bulunmuyor. Bu yazıda daha sınırlı ve ölçülebilir bir veri kullanıyorum: 2026 LGS ilk yerleştirme taban puanı.",
      "Birden fazla programı bulunan okullarda en yüksek taban puanlı program esas alınmıştır.",
    ],
    sections: [
      {
        title: "2026 LGS'de en yüksek puanla öğrenci alan 10 lise",
        body: [
          "1. İstanbul Erkek Lisesi, İstanbul, Almanca hazırlık: 500,0000.",
          "2. Kabataş Erkek Lisesi, İstanbul, Almanca hazırlık: 500,0000.",
          "3. Galatasaray Lisesi, İstanbul, Fransızca hazırlık: 497,4323.",
          "4. İstanbul Atatürk Fen Lisesi, İstanbul, Almanca hazırlık: 494,8872.",
          "5. Ankara Fen Lisesi, Ankara, İngilizce: 494,4243.",
          "6. Cağaloğlu Anadolu Lisesi, İstanbul, Almanca hazırlık: 493,3585.",
          "7. İzmir Fen Lisesi, İzmir, İngilizce: 492,1823.",
          "8. Hüseyin Avni Sözen Anadolu Lisesi, İstanbul, Almanca hazırlık: 491,8566.",
          "9. İzmir Atatürk Lisesi, İzmir, Almanca hazırlık: 491,4327.",
          "10. Prof. Dr. Aziz Sancar Fen Lisesi, Ankara, İngilizce: 489,4430.",
        ],
      },
      {
        title: "İlk 10 listesini nasıl okumalı?",
        body: [
          "Bunlar 5 Ağustos 2026'daki ilk yerleştirme puanları. Aynı okulun farklı yabancı dil programları ayrı ayrı sıralandığında Kabataş'ın İngilizce programı 497,7581 ile Galatasaray'ın önüne giriyor. İstanbul Atatürk Fen'in İngilizce programı da 493,3585 puanla Cağaloğlu'yla aynı seviyede.",
          "İlk 10'daki altı okul İstanbul'da. Ankara ve İzmir'den ikişer okul var. Altısı Anadolu lisesi, dördü fen lisesi. Listenin ilk üç sırasında İstanbul Erkek, Kabataş ve Galatasaray yer alıyor.",
          "Hazırlık sınıfı bu grubun belirgin özelliklerinden biri. İstanbul Erkek, Kabataş, Galatasaray, İstanbul Atatürk Fen, Cağaloğlu, Hüseyin Avni Sözen ve İzmir Atatürk beş yıllık hazırlıklı programlarla öğrenci alıyor.",
        ],
      },
      {
        title: "Puan farkları bazen çok küçük",
        body: [
          "İstanbul Erkek son yıllarda ayrıca dikkat çekiyor. Okul 2023, 2024, 2025 ve 2026'da 500 taban puanda kaldı. Kabataş'ta 2026'da iki program arasında fark oluştu: Almanca programı 500, İngilizce programı 497,7581.",
          "Galatasaray'ın taban puanı 497,4323. Yani Kabataş'ın İngilizce programıyla arasındaki fark yaklaşık üçte bir puan.",
          "Fen liselerinde ilk sıra İstanbul Atatürk Fen'in Almanca programında: 494,8872 puan. Ankara Fen 494,4243, İzmir Fen 492,1823 puanla kapandı. İstanbul Atatürk Fen ile Ankara Fen arasındaki fark yalnızca 0,4629 puan.",
          "LGS'nin üst sıralarında birkaç basamaklık sıra farkı bazen puanda yarım puana bile ulaşmıyor.",
        ],
      },
      {
        title: "İlk 10'un ötesinde ne oluyor?",
        body: [
          "MEB'in 2026 ilk yerleştirme raporunda, merkezi sınav puanına göre ortaöğretim kurumlarına yerleşen üst yüzde 5'lik dilimde 43 bin 850 öğrenci bulunduğu belirtiliyor.",
          "Bu öğrencilerin yüzde 52,16'sı fen liselerine, yüzde 40,55'i Anadolu liselerine yerleşti. Geri kalan bölüm Anadolu imam hatip, mesleki ve teknik Anadolu ve sosyal bilimler liselerine dağıldı.",
          "MEB'in aynı dönem verisine göre sınavla öğrenci alan okullarda 198 bin 905 kontenjan vardı. İlk yerleştirmede 190 bin 473 öğrenci bu okullara yerleşti ve doluluk oranı yüzde 95,76 olarak gerçekleşti.",
          "Türkiye'nin yüksek puanlı lise grubunu yalnızca İstanbul'daki birkaç okuldan okumamak gerekiyor. Ankara Fen, İzmir Fen, Prof. Dr. Aziz Sancar Fen gibi okullar ilk 10'da; liste genişledikçe farklı şehirlerden fen liseleri daha fazla görünmeye başlıyor.",
        ],
      },
      {
        title: "Robert Kolej ve özel yabancı liseler",
        body: [
          "'Türkiye'nin en iyi liseleri' denildiğinde Robert Kolej, Alman Lisesi, Üsküdar Amerikan ve Saint-Joseph gibi özel yabancı liseleri dışarıda bırakmak doğru olmaz. Buna karşılık bu okulların puanları devlet liseleriyle aynı yerleştirme sürecinde oluşmuyor.",
          "Robert Kolej, 2026-2027 kayıtlarını erkek öğrencilerde 488,2457, kız öğrencilerde 481,1675 kapanış puanıyla tamamladı. Bu rakamlar okulun kendi resmi kayıt sayfasında yayımlanıyor.",
          "Saint-Joseph'ta 2026 için 208 kişilik kontenjan vardı. Okul kayıt dönemine 455 taban puanla başladı; son taban puan 452 oldu. Kesin kayıt yaptıran öğrencilerde en yüksek LGS puanı 495,0188, en düşük puan 452,4081, ortalama puan ise 464,5152 olarak açıklandı.",
          "Özel okullarda kayıt dönemleri ilerledikçe puan değişebiliyor. Robert'ta kız ve erkek öğrenciler için ayrı kapanış puanlarının bulunması da başka bir fark. Bu yüzden özel okul puanlarını devlet liselerinin ilk yerleştirme tablosuyla bire bir aynı sıralama gibi okumamak gerekir.",
        ],
      },
      {
        title: "Puan dışında kalan birkaç fark",
        body: [
          "İstanbul Erkek Almanca hazırlıklı ve beş yıllık. Galatasaray'da eğitim Fransızca hazırlıkla başlıyor. İstanbul Atatürk Fen, fen lisesi programını hazırlık sınıfıyla birleştiriyor. Ankara Fen'de ise hazırlık sınıfı yok.",
          "Hüseyin Avni Sözen'in Almanca programı beş yıl ve pansiyonu bulunmuyor. İzmir Atatürk'ün Almanca programı da hazırlıklı; okulda kız ve erkek öğrenciler için pansiyon imkanı var.",
          "Aynı puan aralığındaki iki okul bu açıdan birbirinden epey farklı olabilir. Bu nedenle tercih döneminde yalnızca puan değil; okulun program dili, hazırlık durumu, pansiyon imkanı, ulaşım ve öğrencinin günlük yaşamı birlikte düşünülmelidir.",
        ],
      },
      {
        title: "2026 tablosunun söylediği şey",
        body: [
          "2026 ilk yerleştirmesine göre listenin başında İstanbul Erkek ile Kabataş'ın Almanca programı var. Galatasaray 497,4323 puanla onları takip ediyor. İstanbul Atatürk Fen ve Ankara Fen 494 puan bandında; Cağaloğlu 493,3585, İzmir Fen 492,1823 puanda.",
          "Bunlar 2026 sınavı ve 2026 tercihlerinin oluşturduğu taban puanlar. Bir sonraki LGS'de sınavın güçlüğü, kontenjanlar ve öğrencilerin tercihleri değiştiğinde puanlar da yeniden oluşacak.",
        ],
      },
    ],
    references: [
      { title: "Milli Eğitim Bakanlığı - 2026 LGS Kapsamında Merkezi Sınav Sonuçları ve Merkezi Sınav Raporu.", detail: "Sınava katılan 994.358 öğrenci ve 500 tam puan alan 452 öğrenci için kullanılmıştır." },
      { title: "Milli Eğitim Bakanlığı - 2026 LGS İlk Yerleştirme Sonuç Raporu.", detail: "Üst yüzde 5'lik dilimdeki 43.850 öğrenci, okul türlerine yerleşme oranları, kontenjan, yerleşen öğrenci ve doluluk oranları için kullanılmıştır." },
      { title: "2026 MEB/e-Okul ilk yerleştirme verilerinin okul bazlı derlemeleri.", detail: "İlk yerleştirme taban puanlarının çapraz kontrolünde kullanılmıştır." },
      { title: "Robert Kolej - 2026-2027 Kayıt Dönemi.", detail: "Erkek ve kız öğrenciler için kapanış puanları okulun resmi sitesinden alınmıştır." },
      { title: "İstanbul Özel Saint-Joseph Fransız Lisesi - 2026 Kayıt İstatistikleri.", detail: "Kontenjan, ilk ve son taban puan, en yüksek, en düşük ve ortalama LGS puanları okulun resmi sitesinden alınmıştır." },
    ],
  },
  {
    category: 'lgs',
    slug: 'lgs-ogrencisi-gunluk-kac-saat-calismali',
    title: "LGS Öğrencisi Günde Kaç Saat Çalışmalı?",
    description: "LGS'ye hazırlanan öğrenciler için günlük çalışma süresini, net çalışma kavramını, deneme analizini, uyku düzenini ve haftalık program dengesini birlikte ele alan rehber.",
    intro: [
      "LGS'ye hazırlanan bir öğrencinin günde kaç saat çalışması gerektiğini tek rakamla söylemek zor. Yine de bir yerden başlamak gerekiyor.",
      "Okul günlerinde 2-3 saat, hafta sonlarında 3-4 saat net bireysel çalışma çoğu 8. sınıf öğrencisi için kullanılabilecek makul bir aralık.",
      "Buradaki \"net\" kelimesi işi biraz değiştiriyor. Akşam 19.00'da masaya oturup 22.00'de kalkmış olmak üç saat ders çalışıldığı anlamına gelmeyebilir. Araya telefon, yemek, uzun bir mola ve biraz oyalanma girdiyse gerçek süre iki saate kadar düşebilir.",
      "Tersi de oluyor. İki saatlik bir çalışmada matematikten o gün işlenen konu tekrar edilmiş, sorular çözülmüş, fen ödevi tamamlanmış ve yanlış çıkan birkaç soruya yeniden dönülmüşse o akşamı \"az çalıştım\" diye değerlendirmek pek anlamlı değil.",
      "Saat hesabının sınırı biraz burada.",
      "Yine de 2-3 saat rakamını rastgele söylemiyorum. Sekizinci sınıf öğrencisi günün önemli bölümünü zaten okulda geçiriyor. Eve geldikten sonra dört-beş saat daha düzenli ders çalışmayı yıl boyunca sürdürebilmek pek çok öğrenci için zor. Üstelik süre uzadıkça her yeni yarım saatin aynı miktarda öğrenme getireceğinin bir garantisi yok.",
      "OECD'nin PISA 2022 verilerinde ilginç bir ilişki görülüyor. OECD ülkeleri ortalamasında, günde yarım saatten bir saate kadar ödev yapan öğrencilerin matematik puanı, yarım saatten az ödev yapanlardan sosyoekonomik koşullar hesaba katıldıktan sonra ortalama 16 puan yüksek. Bir saatten iki saate geçildiğinde fark yalnızca 2 puan. İki saatin üzerinde ise ödev süresiyle matematik performansı arasındaki ilişki negatife dönüyor.",
      "Bu araştırma \"iki saatten fazla çalışmayın\" demiyor. OECD de özellikle buna dikkat çekiyor. Düşük performanslı öğrenciler aynı konuyu öğrenmek veya aynı ödevi bitirmek için daha fazla zamana ihtiyaç duyuyor olabilir. Yani uzun çalışma süresi düşük başarının nedeni olmak zorunda değil; bazen düşük başarı daha uzun çalışma süresinin nedeni olabilir.",
      "LGS hazırlığıyla PISA ödevi de birebir aynı şey değil. Ancak verideki bir ayrıntı tanıdık geliyor: ilk saatlerle sonraki saatlerin verimi her zaman aynı olmayabiliyor.",
    ],
    sections: [
      {
        title: "2-3 saatlik bir akşamda ne yapılabilir?",
        body: [
          "Bu süre ilk bakışta kısa gelebilir. İçini doldurduğumuzda o kadar da kısa değil.",
          "Örneğin matematikte okulda işlenen konuya dönülüp 20-25 soru çözülmesi 50-60 dakika sürebilir. Fen bilimlerinden 20 soru ve yanlışların kontrolü 35-40 dakika alabilir. Paragraf rutini için 20-25 dakika ayrıldığında iki saatin önemli kısmı zaten dolmuş olur.",
          "Her akşam üç farklı dersten onlarca test çözmek gerekmiyor.",
          "Pazartesi matematik biraz daha uzun sürebilir. Salı günü fen ağırlık kazanır. Türkçe ve paragraf daha kısa ama daha düzenli yer alabilir. Deneme yapılan günün programı zaten baştan değişir.",
          "LGS yılı ilerledikçe bu dağılım da değişiyor.",
          "Sonbaharda yeni konular daha fazla zaman alır. Matematikte konu oturmadıysa soru sayısının düşük kalması sorun değildir. Ocak-şubat döneminde hem yeni konular hem eski konular birlikte yürümeye başlar. Baharla beraber deneme sayısı artar; denemenin kendisi kadar sonrasında yapılan kontrol de zaman ister.",
          "2026 LGS'nin birinci oturumunda 50 sözel soru için 75 dakika, ikinci oturumunda matematik ve fen bilimlerinden oluşan 40 soru için 80 dakika verildi. Sınav iki oturumda toplam 90 sorudan oluşuyor.",
          "Bu yapı, yılın sonlarına doğru çalışma programına uzun süre kesintisiz odaklanmayı da ekliyor. Öğrenci evde sürekli 25 dakikalık çalışmalar yapıyorsa bir noktadan sonra 80 dakikalık sayısal oturumu da denemesi gerekir.",
          "Deneme günleri bu nedenle normal çalışma günlerinden biraz farklı.",
          "90 soruluk deneme çözülüp yalnızca nete bakılıyorsa önemli bir bilgi kaçıyor. Mesela matematikte beş yanlış geldi. İkisi konu eksikliği, biri işlem hatası, biri soruyu yanlış okuma, biri de süre yetişmediği için yapılmış olabilir. Beşinin de karşılığı \"beş yanlış\", ama gelecek hafta yapılması gereken çalışma aynı değil.",
          "Bazen deneme sonrasında yarım saat boyunca bu beş soruyla uğraşmak, hemen yeni bir teste geçmekten daha işe yarayabilir.",
          "Soru sayısını da bu nedenle tek başına çalışma ölçüsü olarak kullanmak zor. 40 kolay soruyla geçirilen bir saat ile 12 zor matematik sorusuyla geçirilen bir saat kâğıt üzerinde aynı süre.",
          "Öğrencinin o gün ne yaptığına biraz bakmak gerekiyor.",
        ],
      },
      {
        title: "Her LGS öğrencisine 2-3 saat yeter mi?",
        body: [
          "Hayır.",
          "Temel matematik konuları birikmiş, fen konuları geriden geliyor ve okul programına yetişmekte zorlanan bir öğrencinin 2 saatle bütün eksiklerini kapatması gerçekçi olmayabilir. Bir dönem 3-3,5 saate çıkması gerekebilir.",
          "Konuları düzenli götüren ve denemelerde istediği sonuçlara yaklaşmış bir öğrenci içinse okul gününde 1,5-2 saat gayet yeterli olabilir.",
          "Kabaca şöyle düşünülebilir:",
          "Konular düzenli, belirgin eksik yok: 1,5-2,5 saat.",
          "Bazı konu ve soru eksikleri var: 2-3 saat.",
          "Birkaç derste ciddi birikme oluşmuş: 2,5-3,5 saat.",
          "Deneme ağırlıklı son dönem: 2,5-4 saat.",
          "Bu süreler bir standardın karşılığı değil. Çalışma programı hazırlarken kullanılabilecek aralıklar.",
          "Hafta sonu okul olmadığı için süre biraz daha rahat genişletilebilir. Üç-dört saatlik çalışmayı sabah ve öğleden sonra iki ayrı parçaya bölmek de mümkün. Sabah matematik ve fen, öğleden sonra Türkçe ve deneme analizi gibi.",
          "Her günü eşitlemeye çalışmak gereksiz bir yük oluşturabiliyor.",
          "Beş okul gününde sırasıyla 2, 2,5, 2, 3 ve 2 saat çalışan biri haftayı başarısız geçirmiş sayılmaz. Toplam 11,5 saat eder. Hafta sonuna üçer saat eklendiğinde haftalık bireysel çalışma 17,5 saate çıkar.",
          "Okuldaki ders süresi bunun dışında.",
          "Bu hesaba bakınca günlük iki saat artık o kadar küçük görünmüyor.",
          "Çalışma süresini artırmak için de net bir neden olmalı. Denemelerde zaman sorunu varsa hız çalışması eklenebilir. Matematikte belirli bir konu sürekli yanlış geliyorsa oraya yarım saat daha ayrılabilir. Program yetişiyor, yanlışlar azalıyor ve sonuçlar ilerliyorsa sırf bir arkadaş dört saat çalışıyor diye mevcut programı büyütmenin fazla anlamı yok.",
          "Bir öğrencinin programı ekimde başka, martta başka görünebilir. Zaten görünmesi de normal; çünkü yapılan iş değişiyor.",
        ],
      },
      {
        title: "Uyku hesabı bazen çalışma saatinden daha önemli",
        body: [
          "Sekizinci sınıf öğrencilerinin önemli bir bölümü 13-14 yaşında. American Academy of Sleep Medicine, 13-18 yaş arasındaki gençlerin düzenli olarak 8-10 saat uyumasını öneriyor. Daha kısa uykunun dikkat, davranış ve öğrenme sorunlarıyla ilişkili olduğunu belirtiyor.",
          "Sabah 07.00'de kalkacak bir öğrencinin gece 01.00'e kadar ders çalışması bu açıdan pek iyi bir hesap çıkarmıyor.",
          "Akşam programa fazladan iki saat eklenmiş oluyor ama uyku altı saate düşüyor. Ertesi gün öğrencinin okulda geçireceği saatler de var.",
          "Sınava yaklaştıkça bu daha fazla önem kazanıyor. 2026 LGS'nin ilk oturumu saat 09.30'da, ikinci oturumu 11.30'da başladı. Gece çalışan ve sabah zor uyanan bir düzeni son hafta değiştirmeye çalışmak yerine, uyku saatini daha erken dönemde oturtmak daha rahat olabilir.",
          "Molalarda da dakika hesabını fazla büyütmeye gerek yok. Kimi öğrenci 40 dakika sonra ara vermek ister, kimi bir saat rahat çalışır. Deneme çözülüyorsa zaten daha uzun oturmak gerekir.",
          "On dakikalık aranın sürekli kırk dakikaya çıktığı bir düzende ise sorun mola tekniğinin adında değildir.",
        ],
      },
      {
        title: "LGS öğrencisi için benim kullanacağım başlangıç noktası",
        body: [
          "Okul gününde 2-3 saat, hafta sonunda 3-4 saat.",
          "Sonra öğrencinin haftasına bakarım.",
          "Matematik konuları okulun gerisinde mi? Türkçede okuma hızı sorun oluyor mu? Fen yanlışları belirli konularda mı toplanıyor? Deneme sonuçları birkaç haftadır aynı yerde mi? Ödevler yetişiyor mu?",
          "Bu soruların cevapları çalışma süresini yarım saat aşağı da çekebilir, bir saat yukarı da.",
          "Bazı haftalar 18 saat iyi gider. Bir hafta sınavlar vardır, 13 saatte kalır. Başka bir hafta denemeler ve eksik konular nedeniyle 20 saati geçer.",
          "LGS hazırlığının tamamını tek bir günlük rakama sığdırmaya çalışınca bu farklılıklar görünmüyor.",
          "O nedenle 2-3 saati \"her gün mutlaka doldurulacak kota\" yerine başlangıç için kullanılacak bir çalışma süresi olarak görmek daha doğru.",
        ],
      },
    ],
    references: [
      { title: "Millî Eğitim Bakanlığı - 2026 Merkezî Sınav Başvuru ve Uygulama Kılavuzu.", detail: "2026 LGS'nin 13 Haziran'da uygulanması, sözel oturumun 50 soru/75 dakika, sayısal oturumun 40 soru/80 dakika olması ve oturum saatleri için kullanılmıştır." },
      { title: "OECD - PISA 2022 Results, Volume II.", detail: "Ödev süresi ile matematik performansı arasındaki ilişki için kullanılmıştır. OECD ortalamasında ilişki iki saate kadar pozitif, iki saatin üzerinde negatif görünmektedir; rapor bu ilişkinin nedensellik olarak yorumlanamayacağını özellikle belirtmektedir." },
      { title: "American Academy of Sleep Medicine - Teen Sleep Duration Health Advisory.", detail: "13-18 yaş arasındaki gençler için düzenli olarak 8-10 saat uyku önerisi ve yetersiz uykunun dikkat ve öğrenmeyle ilişkisi için kullanılmıştır." },
    ],
  },
{
    category: 'lgs',
    slug: 'son-senenin-taban-puanlari',
    title: 'Son Senenin Taban Puanları',
    description: 'LGS taban puanları tercih döneminde yol gösterir; ancak karar verirken yüzdelik dilim daha sağlıklı bir ölçüdür.',
    intro: ['Taban puanlar velilerin en çok baktığı verilerden biridir. Yine de puanlar her yıl sınavın zorluğuna ve öğrenci dağılımına göre değişebilir.', 'Bu nedenle lise tercihi yapılırken yalnızca puana değil, yüzdelik dilime ve okulun önceki yıllardaki eğilimine bakmak daha sağlıklı olur.'],
    sections: [
      { title: 'Puan neden değişir?', body: 'Sınavın zorluk derecesi, öğrenci başarısı ve tercih yoğunluğu taban puanları etkiler. Geçen yılın puanı fikir verir ama tek başına kesin sonuç göstermez.' },
      { title: 'Yüzdelik dilim daha anlamlıdır', body: 'Yüzdelik dilim öğrencinin genel sıralamadaki yerini gösterdiği için tercih döneminde daha güvenilir bir kıyaslama sağlar.' },
      { title: 'Güncel kılavuz izlenmeli', body: 'Tercih yaparken MEB tarafından yayımlanan güncel kılavuz ve okul kontenjanları esas alınmalıdır. Eski veriler yalnızca ön değerlendirme için kullanılmalıdır.' },
    ],
  },
{
    category: 'lgs',
    slug: 'lgs-matematik-fen-turkce-nasil-calisilir',
    title: 'LGS Matematik, Fen ve Türkçe Nasıl Çalışılır?',
    description: 'LGS’de ders çalışmak, konu öğrenme ile yeni nesil soru pratiğini dengeli götürmeyi gerektirir.',
    intro: ['LGS’de Matematik, Fen ve Türkçe öğrencinin yorumlama, dikkat ve işlem becerisini birlikte ölçer. Bu yüzden çalışma yalnızca konu tekrarıyla sınırlı kalmamalıdır.', 'Her dersin çalışma biçimi biraz farklıdır. Öğrenci bunu fark ettiğinde zamanı daha doğru kullanır.'],
    sections: [
      { title: 'Matematikte işlem ve yorum birlikte gider', body: 'Öğrenci önce temel kazanımları öğrenmeli, ardından farklı soru tipleriyle karşılaşmalıdır. Yeni nesil sorularda metni anlamak da işlem yapmak kadar önemlidir.' },
      { title: 'Fen bilgisinde neden-sonuç ilişkisi', body: 'Fen çalışırken kavramları ezberlemek yerine deney, grafik ve günlük hayat bağlantıları üzerinden düşünmek gerekir. Yanlış yapılan soruların konusu mutlaka not edilmelidir.' },
      { title: 'Türkçede düzenli okuma etkili olur', body: 'Paragraf, anlam ve dil bilgisi sorularında düzenli pratik önemlidir. Öğrenci yalnızca çok soru çözmekle kalmamalı, neden yanlış yaptığını da anlamalıdır.' },
    ],
  },
{
    category: 'lgs',
    slug: 'lgsde-stres-oluyorum-sinav-korkusu',
    title: 'LGS’de Stres Oluyorum, Sınav Korkusu',
    description: 'LGS stresi yönetilebilir; önemli olan öğrencinin duygusunu ciddiye almak ve süreci daha kontrol edilebilir hale getirmektir.',
    intro: ['LGS öğrencisi için sınav yalnızca akademik bir süreç değildir. Aile beklentisi, okul ortamı ve arkadaşlarla kıyaslanma hissi öğrenciyi yorabilir.', 'Stres tamamen yok edilmesi gereken bir şey değildir. Belli düzeyde kaygı öğrenciyi harekete geçirebilir; sorun, kaygının çalışmayı ve denemeyi engellemesidir.'],
    sections: [
      { title: 'Kaygı konuşulabilir olmalı', body: 'Öğrenci korktuğunu söylediğinde bunu küçümsemek yerine neyin zor geldiği anlaşılmalıdır. Belirsizlik azaldıkça kaygı da daha yönetilebilir hale gelir.' },
      { title: 'Deneme alışkanlığı rahatlatır', body: 'Sınav ortamını sık sık deneyimleyen öğrenci, gerçek sınavda neyle karşılaşacağını daha iyi bilir. Bu da kontrol duygusunu artırır.' },
      { title: 'Aile dili önemlidir', body: 'Sürekli sonuç konuşmak öğrencinin baskısını artırabilir. Emek, düzen ve gelişim üzerinden konuşmak daha sağlıklı bir destek sağlar.' },
    ],
  },
{
    category: 'lgs',
    slug: 'ders-calismak-istemiyorum-motivasyonum-dustu',
    title: 'Ders Çalışmak İstemiyorum, Motivasyonum Düştü',
    description: 'Motivasyon düştüğünde öğrenciyi suçlamak yerine programı, hedefi ve çalışma yükünü yeniden düzenlemek gerekir.',
    intro: ['Her LGS öğrencisi yıl boyunca aynı enerjiyle çalışamaz. Bazı dönemlerde isteksizlik, erteleme ve yorulma görülebilir.', 'Bu durum öğrencinin umursamadığı anlamına gelmez. Bazen hedef uzak görünür, bazen program ağır gelir, bazen de öğrenci çabasının karşılığını göremediği için geri çekilir.'],
    sections: [
      { title: 'Küçük hedefler işe yarar', body: 'Motivasyon düştüğünde çok büyük programlar öğrenciyi daha da zorlayabilir. Daha kısa, net ve tamamlanabilir görevlerle yeniden başlamak daha doğru olabilir.' },
      { title: 'Başarı hissi güçlendirilmeli', body: 'Öğrenci yaptığı küçük ilerlemeleri fark ettiğinde çalışma isteği artabilir. Bu yüzden yalnızca eksikleri değil, tamamlanan adımları da görmek gerekir.' },
      { title: 'Dinlenme ihmal edilmemeli', body: 'Sürekli çalışma baskısı öğrenciyi tüketebilir. Sağlıklı bir planın içinde uyku, mola ve nefes alacak zaman da bulunmalıdır.' },
    ],
  },
{
    category: 'lgs',
    slug: 'yuzdelik-dilim-nedir-lise-tercihi-nasil-yapilir',
    title: 'Yüzdelik Dilim Nedir, Lise Tercihi Nasıl Yapılır?',
    description: 'Yüzdelik dilim, LGS tercih sürecinde öğrencinin konumunu anlamak için en önemli göstergelerden biridir.',
    intro: ['LGS tercih döneminde puan kadar yüzdelik dilim de konuşulur. Hatta çoğu zaman yüzdelik dilim daha sağlıklı bir rehberdir.', 'Yüzdelik dilim, öğrencinin sınava girenler arasındaki yerini gösterir. Bu bilgi tercih listesi hazırlanırken daha gerçekçi seçimler yapmayı sağlar.'],
    sections: [
      { title: 'Yüzdelik dilim neyi gösterir?', body: 'Öğrencinin kaç puan aldığı kadar, bu puanın genel sıralamada nereye denk geldiği önemlidir. Yüzdelik dilim bu konumu gösterir.' },
      { title: 'Tercih listesi nasıl kurulmalı?', body: 'Liste hazırlanırken öğrencinin yüzdelik dilimine yakın okullar, biraz daha yüksek hedefler ve daha güvenli seçenekler birlikte düşünülmelidir.' },
      { title: 'Okul araştırması yapılmalı', body: 'Tercih yalnızca tablo üzerinden yapılmamalıdır. Okulun ulaşımı, imkanları, akademik ortamı ve öğrencinin beklentileri de değerlendirilmelidir.' },
    ],
  },
];

const dilArticles: Article[] = [
  {
    category: 'dil-sinav-koclugu',
    slug: 'ydt-nedir-soru-dagilimi',
    title: 'YDT Nedir, Soru Dağılımı',
    description: 'YDT, dil puanıyla tercih yapmak isteyen öğrenciler için kelime, okuma, dil bilgisi ve yorum becerisini ölçen önemli bir sınavdır.',
    intro: ['YDT, dil alanından üniversite tercihi yapmak isteyen öğrencilerin girdiği sınavdır. Sınavda yalnızca kelime bilmek değil, okuduğunu anlama ve dili sınav mantığıyla kullanma becerisi de önemlidir.', 'Soru dağılımını bilmek öğrencinin çalışma planını daha doğru kurmasını sağlar. Hangi başlığa ne kadar zaman ayrılacağı bu tabloya göre netleşir.'],
    sections: [
      { title: 'YDT neyi ölçer?', body: 'Sınav; kelime bilgisi, dil bilgisi, çeviri, paragraf, anlam bütünlüğü ve okuduğunu yorumlama gibi farklı becerileri birlikte yoklar.' },
      { title: 'Çalışma planına etkisi', body: 'Soru dağılımını bilen öğrenci yalnızca sevdiği konulara çalışmaz. Zayıf olduğu ama sınavda ağırlığı olan başlıklara da düzenli zaman ayırır.' },
      { title: 'Güncel kılavuz önemli', body: 'YDT soru dağılımı ve sınav ayrıntıları için güncel ÖSYM bilgileri esas alınmalıdır. Hazırlık planı bu bilgilere göre güncellenmelidir.' },
    ],
  },
  {
    category: 'dil-sinav-koclugu',
    slug: 'gunde-kac-kelime-ogrenilmeli-kelime-nasil-kalici-ogrenilir',
    title: 'Günde Kaç Kelime Öğrenilmeli, Kelime Nasıl Kalıcı Öğrenilir?',
    description: 'YDT hazırlığında kelime öğrenmek sayıdan çok tekrar, bağlam ve kullanım alışkanlığıyla kalıcı hale gelir.',
    intro: ['Dil öğrencilerinin en sık sorduğu sorulardan biri günlük kelime sayısıdır. Fakat kelime öğrenmede mesele yalnızca sayıyı artırmak değildir.', 'Bir kelimeyi listede görmek başka, okuma parçasında tanımak ve doğru anlamıyla kullanmak başka bir şeydir.'],
    sections: [
      { title: 'Az ama düzenli öğrenmek', body: 'Her gün çok fazla kelime ezberlemeye çalışmak kısa sürede yorucu olabilir. Daha makul bir sayı belirleyip düzenli tekrar yapmak çoğu öğrenci için daha kalıcıdır.' },
      { title: 'Bağlam içinde öğrenmek', body: 'Kelimeyi tek başına ezberlemek yerine cümle içinde görmek, anlamını ve kullanımını güçlendirir. Reading çalışmaları bu yüzden kelime gelişimini destekler.' },
      { title: 'Tekrar sistemi kurulmalı', body: 'Öğrenilen kelimeler belirli aralıklarla tekrar edilmezse unutulur. Haftalık tekrar listesi ve küçük kelime testleri süreci canlı tutar.' },
    ],
  },
  {
    category: 'dil-sinav-koclugu',
    slug: 'ydtde-60-netten-70-nete-nasil-cikilir',
    title: 'YDT’de 60 Netten 70 Nete Nasıl Çıkılır?',
    description: 'YDT’de net artırmak için genel tekrar yerine yanlış türlerini ve zaman kaybını hedef alan bir plan gerekir.',
    intro: ['YDT’de 60 net seviyesine gelen öğrenci belli bir temel oluşturmuştur. Bundan sonra artış daha ince çalışmayı gerektirir.', 'Bu seviyede her yanlışın sebebi önemlidir. Kelime mi eksik, paragraf mı yavaş, dil bilgisi mi karışıyor, yoksa dikkatsizlik mi baskın?'],
    sections: [
      { title: 'Yanlış türleri ayrılmalı', body: 'Tüm yanlışları aynı torbaya koymak gelişimi yavaşlatır. Öğrenci hangi soru tipinde puan kaybettiğini görmelidir.' },
      { title: 'Reading hızı artırılmalı', body: 'YDT’de okuma hızı net artışında belirleyici olabilir. Düzenli reading çalışması, hem kelimeyi hem de anlam takibini güçlendirir.' },
      { title: 'Deneme sonrası hedef', body: 'Her denemeden sonra bir sonraki haftanın özel hedefi belirlenmelidir. Örneğin yalnızca paragraf, yalnızca çeviri ya da kelime tekrarına ağırlık verilebilir.' },
    ],
  },
  {
    category: 'dil-sinav-koclugu',
    slug: 'reading-hizini-artirma-yontemleri',
    title: 'Reading Hızını Artırma Yöntemleri',
    description: 'Reading hızını artırmak için düzenli okuma, kelime takibi ve soru çözüm stratejisi birlikte geliştirilmelidir.',
    intro: ['YDT hazırlığında reading çoğu öğrencinin zamanını alır. Metni anlamaya çalışırken süre hızla geçer ve öğrenci bazı soruları aceleye getirebilir.', 'Reading hızı bir anda artmaz. Düzenli pratik ve doğru yöntemle gelişir.'],
    sections: [
      { title: 'Her kelimeye takılmamak', body: 'Metindeki her kelimeyi bilmek gerekmez. Öğrenci ana fikri, bağlamı ve cümlenin yönünü takip etmeyi öğrenmelidir.' },
      { title: 'Düzenli metin okumak', body: 'Sadece soru çözmek değil, farklı konularda kısa ve orta uzunlukta metinler okumak da hızı artırır. Okuma alışkanlığı zamanla göz aşinalığı kazandırır.' },
      { title: 'Soru kökünü doğru okumak', body: 'Reading sorularında soru kökü ne istediğini net söyler. Öğrenci metne dönmeden önce sorunun ne aradığını anlamalıdır.' },
    ],
  },
  {
    category: 'dil-sinav-koclugu',
    slug: 'ydtde-gunluk-kac-soru-cozulmeli',
    title: 'YDT’de Günlük Kaç Soru Çözülmeli?',
    description: '',
    intro: ['Günlük soru sayısı, dil öğrencileri için iyi bir takip göstergesi olabilir. Yine de tek başına yeterli değildir.', 'Çok soru çözmek, yanlışlar analiz edilmediğinde beklenen gelişimi getirmeyebilir.'],
    sections: [
      { title: 'Seviyeye göre plan', body: 'Başlangıç seviyesindeki öğrenci daha çok konu ve kelime temeli kurarken, ileri seviyedeki öğrenci deneme ve soru tipi analizine ağırlık verebilir.' },
      { title: 'Soru çeşitliliği', body: 'Yalnızca sevilen soru tiplerini çözmek yanıltıcı olur. Kelime, grammar, cloze test, çeviri ve reading dengeli ilerlemelidir.' },
      { title: 'Yanlış analizi şart', body: 'Çözülen soruların değeri, sonrasında yapılan analizle artar. Öğrenci yanlışlarını not edip tekrar gördüğünde gelişim daha kalıcı olur.' },
    ],
  },
  {
    category: 'dil-sinav-koclugu',
    slug: 'dil-puaniyla-hangi-bolumler-tercih-edilebilir',
    title: 'Dil Puanıyla Hangi Bölümler Tercih Edilebilir?',
    description: 'Dil puanı; öğretmenlik, çeviri, dil ve edebiyat, turizm, iletişim ve farklı uluslararası alanlara kapı açabilir.',
    intro: ['Dil puanıyla tercih yapacak öğrenciler bazen seçeneklerinin sınırlı olduğunu düşünür. Oysa dil alanı farklı ilgi ve becerilere göre çeşitli yollar sunar.', 'Önemli olan yalnızca bölüm adını bilmek değil, o bölümün mezuniyet sonrası hangi alanlara açıldığını da incelemektir.'],
    sections: [
      { title: 'Bölüm içerikleri incelenmeli', body: 'İngilizce öğretmenliği, mütercim-tercümanlık, dil ve edebiyat bölümleri birbirine benzese de ders yapısı ve mesleki yönü farklıdır.' },
      { title: 'Yabancı dil tek başına yetmez', body: 'Dil alanında güçlü olmak önemlidir; fakat iletişim, yazma, kültür bilgisi, teknoloji kullanımı ve ikinci dil gibi beceriler öğrenciyi öne çıkarabilir.' },
      { title: 'Tercih hedefle birlikte yapılmalı', body: 'Öğrenci akademik kariyer, öğretmenlik, çeviri, özel sektör veya uluslararası alanlardan hangisine daha yakın olduğunu düşünmelidir.' },
    ],
  },
];

export const ARTICLE_CATEGORIES: Category[] = [
  {
    slug: 'yks',
    label: 'YKS',
    shortLabel: 'YKS',
    description: '',
    articles: yksArticles.map(({ slug, title, description }) => ({ slug, title, description })),
  },
  {
    slug: 'lgs',
    label: 'LGS',
    shortLabel: 'LGS',
    description: '',
    articles: lgsArticles.map(({ slug, title, description }) => ({ slug, title, description })),
  },
  {
    slug: 'dil-sinav-koclugu',
    label: 'Dil Sınav Koçluğu',
    shortLabel: 'Dil Sınav Koçluğu',
    description: '',
    articles: dilArticles.map(({ slug, title, description }) => ({ slug, title, description })),
  },
];

export const ALL_ARTICLES = [...yksArticles, ...lgsArticles, ...dilArticles];

export function getCategory(slug: string) {
  return ARTICLE_CATEGORIES.find((category) => category.slug === slug);
}

export function getArticle(category: string, slug: string) {
  return ALL_ARTICLES.find((article) => article.category === category && article.slug === slug);
}
