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
    title: 'En Çok Kazanan Bölümler (2026)',
    description: 'Gelir potansiyeli bölüm seçiminde önemlidir; ancak tek ölçüt olduğunda öğrenciyi yanlış tercihe götürebilir.',
    intro: [
      'Bölüm seçerken “mezun olunca ne kadar kazanırım?” sorusu doğaldır. Öğrenci ve veli geleceği görmek ister. Yine de bu soruyu tek başına merkeze almak, mesleğin günlük gerçeklerini gözden kaçırmaya neden olabilir.',
      '2026 için meslek ve gelir beklentilerini değerlendirirken sektör ihtiyacı, öğrencinin yeteneği, çalışma biçimi ve bölümün sunduğu imkanlar birlikte düşünülmelidir.',
    ],
    sections: [
      { title: 'Gelir potansiyeli değişkendir', body: 'Aynı bölümden mezun olan iki kişinin kazancı; şehir, deneyim, yabancı dil, teknoloji kullanımı ve kişisel becerilere göre değişebilir. Bu yüzden bölüm seçimi yalnızca ortalama gelir beklentisine göre yapılmamalıdır.' },
      { title: 'Yetenek ve ilgi uyumu', body: 'Öğrencinin sevmediği veya karakterine uygun olmayan bir alanda uzun vadede başarılı olması zorlaşabilir. Gelir beklentisi güçlü olsa bile öğrencinin o alanda emek vermeye istekli olup olmadığı konuşulmalıdır.' },
      { title: 'Tercihte denge', body: 'Doğru tercih, geleceğin iş imkanlarını dikkate alır ama öğrencinin güçlü yönlerini de ihmal etmez. En sağlıklı karar bu ikisinin kesiştiği yerde ortaya çıkar.' },
    ],
  },
  {
    category: 'yks',
    slug: 'gelecegin-meslekleri',
    title: 'Geleceğin Meslekleri',
    description: 'Geleceğin mesleklerini anlamak için yalnızca popüler başlıklara değil, beceri dönüşümüne bakmak gerekir.',
    intro: [
      'Geleceğin meslekleri denince akla çoğu zaman teknoloji gelir. Yapay zeka, veri, yazılım ve dijital alanlar gerçekten önem kazanıyor. Fakat gelecek yalnızca teknik becerilerden ibaret değil.',
      'İletişim, problem çözme, yabancı dil, etik düşünme ve öğrenmeyi sürdürme becerisi de öğrencinin mesleki yolculuğunda belirleyici olabilir.',
    ],
    sections: [
      { title: 'Meslekler değişirken beceriler öne çıkar', body: 'Bugün var olan bazı işler dönüşecek, bazıları tamamen farklı hale gelecek. Bu yüzden öğrencinin yalnızca bir meslek adına değil, o meslekte ihtiyaç duyulan becerilere odaklanması gerekir.' },
      { title: 'Alan seçimi nasıl etkilenir?', body: 'Sayısal, eşit ağırlık, sözel veya dil alanı seçimi yapılırken öğrencinin yalnızca mevcut netleri değil, merakı ve uzun vadeli öğrenme isteği de dikkate alınmalıdır.' },
      { title: 'Esnek düşünmek gerekir', body: 'Gelecekte başarılı olmak, tek bir unvana kilitlenmekten çok yeni şartlara uyum sağlayabilmekle ilgilidir. Öğrenci kendi güçlü yönlerini tanıdıkça seçeneklerini daha sağlıklı değerlendirir.' },
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
    title: 'En İyi Liseler',
    description: 'En iyi lise seçimi; puan, yüzdelik dilim, okul kültürü, ulaşım ve öğrencinin ihtiyaçları birlikte düşünülerek yapılmalıdır.',
    intro: ['LGS sonrası lise seçimi aileler için heyecanlı ama zor bir dönemdir. “En iyi lise” denince çoğu zaman akla en yüksek puanlı okullar gelir.', 'Puan önemli bir göstergedir; fakat tek başına yeterli değildir. Öğrencinin okula uyumu, ulaşım, sosyal ortam ve akademik beklenti de kararın parçası olmalıdır.'],
    sections: [
      { title: 'Puan kadar uyum da önemlidir', body: 'Çok yüksek puanlı bir okul her öğrenci için en doğru seçenek olmayabilir. Öğrencinin temposu, sosyal ihtiyaçları ve okulun beklenti düzeyi birlikte değerlendirilmelidir.' },
      { title: 'Okul türünü tanımak gerekir', body: 'Fen lisesi, Anadolu lisesi, sosyal bilimler lisesi veya mesleki programların sunduğu imkanlar farklıdır. Tercih yapmadan önce okul türleri iyi anlaşılmalıdır.' },
      { title: 'Liste dengeli hazırlanmalı', body: 'Tercih listesinde öğrencinin yüzdelik dilimine uygun okullar, daha yüksek hedefler ve güvenli seçenekler birlikte yer almalıdır.' },
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
    slug: 'lgs-ogrencisi-gunluk-kac-saat-calismali',
    title: 'LGS Öğrencisi Günlük Kaç Saat Çalışmalı?',
    description: 'LGS’de çalışma süresi kadar çalışmanın düzeni, içeriği ve öğrencinin sürdürebileceği tempo da önemlidir.',
    intro: ['Velilerin en çok merak ettiği konulardan biri günlük çalışma süresidir. Fakat her öğrenci için geçerli tek bir saat söylemek doğru olmaz.', 'Bazı öğrencinin konu eksiği fazladır, bazısının deneme pratiği eksiktir, bazısı ise kısa ama düzenli çalıştığında daha iyi ilerler.'],
    sections: [
      { title: 'Süre değil verim belirleyicidir', body: 'Üç saat masada oturup dağınık çalışmak yerine, daha kısa ama net hedefli bir çalışma daha etkili olabilir. Öğrenci hangi derse neden çalıştığını bilmelidir.' },
      { title: 'Düzenli tekrar gerekir', body: 'LGS hazırlığında günlük tekrar, soru çözümü ve deneme analizi birlikte ilerlemelidir. Sadece konu dinlemek ya da sadece test çözmek süreci eksik bırakır.' },
      { title: 'Dinlenme de planın parçasıdır', body: 'Ortaokul öğrencisi için dinlenme, uyku ve sosyal zaman ihmal edilmemelidir. Çok ağır programlar kısa sürede motivasyonu düşürebilir.' },
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
    description: 'YDT’de günlük soru sayısı öğrencinin seviyesine, konu eksiğine ve deneme dönemine göre değişmelidir.',
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
    description: 'YKS hazırlığında deneme analizi, net artışı, tercih hedefi, TYT-AYT dengesi ve sınav stratejisi üzerine rehber yazılar.',
    articles: yksArticles.map(({ slug, title, description }) => ({ slug, title, description })),
  },
  {
    slug: 'lgs',
    label: 'LGS',
    shortLabel: 'LGS',
    description: 'LGS öğrencileri ve velileri için çalışma düzeni, ders stratejisi, sınav kaygısı, yüzdelik dilim ve lise tercihi içerikleri.',
    articles: lgsArticles.map(({ slug, title, description }) => ({ slug, title, description })),
  },
  {
    slug: 'dil-sinav-koclugu',
    label: 'Dil Sınav Koçluğu',
    shortLabel: 'Dil Sınav Koçluğu',
    description: 'YDT ve dil puanı hazırlığında kelime, reading, soru çözümü, net artışı ve bölüm tercihi üzerine rehber içerikler.',
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
