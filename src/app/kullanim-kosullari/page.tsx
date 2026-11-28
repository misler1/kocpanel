import type { Metadata } from 'next';
import Link from 'next/link';
import { LegalPage } from '@/components/legal/LegalPage';
import { COMPANY } from '@/lib/legal';

export const metadata: Metadata = {
  title: 'Kullanım Koşulları | KoçDefterim',
  description: 'KoçDefterim üyelik ve kullanım koşulları, abonelik, deneme süresi ve iptal.',
  alternates: { canonical: '/kullanim-kosullari' },
};

export default function KullanimKosullariPage() {
  return (
    <LegalPage title="Kullanım Koşulları" href="/kullanim-kosullari">
      <p>
        Bu koşullar, {COMPANY.title} (&quot;{COMPANY.brand}&quot;) tarafından sunulan {COMPANY.brand} uygulamasının ({COMPANY.site})
        kullanımını düzenler. Hesap oluşturan herkes bu koşulları kabul etmiş sayılır.
      </p>

      <h2>1. Hizmet</h2>
      <p>
        {COMPANY.brand}; eğitim koçlarının ve kurumların öğrencilerini takip etmesi (haftalık program, günlük çalışma kaydı, deneme analizi,
        konu ilerleyişi, görüşme kayıtları, mesajlaşma, veli raporları) ve öğrencilerin kendi çalışmalarını izlemesi için bir yazılım hizmetidir.
        {COMPANY.brand}, koçun öğrenciye verdiği rehberliğin içeriğinden ve sınav sonuçlarından sorumlu değildir. Yapay zekâ önerileri yardımcı
        niteliktedir; koçun mesleki değerlendirmesinin yerine geçmez.
      </p>

      <h2>2. Hesaplar</h2>
      <ul>
        <li>Kayıt sırasında verilen bilgilerin doğru olması ve şifrenin gizli tutulması kullanıcının sorumluluğundadır.</li>
        <li>Koç ve öğretmen hesapları yönetici onayıyla açılır.</li>
        <li>18 yaşından küçük öğrenciler, velisinin bilgisi ve onayıyla kayıt olur.</li>
        <li>Hesap başkasına devredilemez; bir hesabı birden çok kişinin ortak kullanması yasaktır (kurumsal abonelikte her koçun kendi hesabı olur).</li>
      </ul>

      <h2>3. Koç ve kurumların sorumlulukları</h2>
      <ul>
        <li>Koç/kurum, sisteme girdiği öğrenci ve veli verileri bakımından KVKK kapsamında <b>veri sorumlusudur</b>; öğrenciyi ve veliyi bilgilendirmek
          ve gerekli onayları (18 yaş altı için veli onayı dahil) almak koçun/kurumun sorumluluğundadır.</li>
        <li>Görüşme notlarına öğrencinin sağlık veya psikolojik durumu gibi özel nitelikli verilerini, gerekli açık rıza olmadan yazmamalıdır.</li>
        <li>Öğrencilerle iletişimde hukuka, genel ahlaka ve mesleki etiğe uygun davranmalıdır.</li>
      </ul>

      <h2>4. Abonelik, deneme süresi ve ödeme</h2>
      <ul>
        <li>Yeni koç hesaplarına ilk girişte ücretsiz deneme süresi tanımlanır. Deneme süresinde bütün özellikler açıktır.</li>
        <li>Ücretler, öğrenci sayısına göre belirlenen paketler üzerinden aylık ya da yıllık olarak <Link href="/abonelik" className="underline">Abonelik</Link> sayfasında
          gösterilir. Kurumsal abonelikte ücret koç ve öğrenci sayısına göre hesaplanır.</li>
        <li>Ödeme havale/EFT ile yapılır; ödeme {COMPANY.brand} tarafından onaylandığında abonelik başlar veya uzar. Süresi bitmeden yapılan ödemede
          yeni süre mevcut bitiş tarihine eklenir.</li>
        <li>Abonelik sona erdiğinde hesap belirli bir süre <b>salt okunur</b> kalır: kullanıcı verilerini görebilir ve dışa aktarabilir, yeni kayıt giremez.
          Bu süre de dolduğunda hesap kapanır; veriler silinmez ve ödeme onaylanınca hesap olduğu gibi açılır. Öğrenciler bu süreçte kendi hesaplarını kullanmaya devam eder.</li>
        <li>Paketin öğrenci sınırı aşılamaz; daha fazla öğrenci için paket büyütülür.</li>
        <li>İptal ve iade: [iade koşulları, ör. &quot;Aylık aboneliklerde iade yapılmaz; yıllık aboneliklerde kalan tam aylar için iade yapılır.&quot;]. Fiyat
          değişiklikleri en az 30 gün önceden duyurulur ve devam eden abonelik süresini etkilemez.</li>
      </ul>

      <h2>5. Kullanıcı içeriği</h2>
      <p>
        Kullanıcıların girdiği veriler (notlar, programlar, deneme sonuçları, fotoğraflar) kullanıcıya/koça/kuruma aittir. {COMPANY.brand} bu verileri
        yalnızca hizmeti sunmak için işler. Kullanıcı verilerini Abonelik sayfasından dışa aktarabilir.
      </p>

      <h2>6. Yasaklı kullanım</h2>
      <ul>
        <li>Başkasının hesabına izinsiz erişmeye çalışmak, sistemin güvenliğini test etmek veya bozmaya çalışmak,</li>
        <li>Hukuka aykırı, hakaret içeren, çocukların güvenliğini tehlikeye atan içerik paylaşmak,</li>
        <li>Uygulamayı otomatik araçlarla aşırı yüklemek, kopyalamak veya tersine mühendislik yapmak.</li>
      </ul>
      <p>Bu koşullara aykırı kullanımda {COMPANY.brand} hesabı askıya alabilir veya kapatabilir.</p>

      <h2>7. Sorumluluğun sınırı</h2>
      <p>
        {COMPANY.brand} hizmetin kesintisiz ve hatasız olması için makul çabayı gösterir; ancak bakım, altyapı sağlayıcılarından kaynaklanan kesintiler
        ve mücbir sebepler nedeniyle oluşan zararlardan, kanunun izin verdiği ölçüde sorumlu değildir. [Sorumluluk üst sınırı, ör. &quot;son 12 ayda ödenen ücret&quot;.]
      </p>

      <h2>8. Değişiklikler ve uygulanacak hukuk</h2>
      <p>
        Bu koşullar güncellenebilir; önemli değişiklikler uygulama içinde duyurulur. Uyuşmazlıklarda Türkiye Cumhuriyeti hukuku uygulanır;
        [il] mahkemeleri ve icra daireleri yetkilidir. Tüketici sıfatıyla işlem yapanların Tüketici Hakem Heyetlerine başvuru hakkı saklıdır.
      </p>

      <h2>9. İletişim</h2>
      <p>{COMPANY.title} · {COMPANY.address} · {COMPANY.email} · MERSİS: {COMPANY.mersis}</p>
    </LegalPage>
  );
}
