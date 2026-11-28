import type { Metadata } from 'next';
import Link from 'next/link';
import { LegalPage } from '@/components/legal/LegalPage';
import { COMPANY } from '@/lib/legal';

export const metadata: Metadata = {
  title: 'KVKK Aydınlatma Metni | KoçDefterim',
  description: 'KoçDefterim kişisel verilerin işlenmesine ilişkin aydınlatma metni (6698 sayılı KVKK).',
  alternates: { canonical: '/kvkk' },
};

// Yer tutucular (köşeli parantez) şirket kurulunca src/lib/legal.ts'te doldurulmalı; metin bir hukukçuya kontrol ettirilmelidir.
export default function KvkkPage() {
  return (
    <LegalPage title="Kişisel Verilerin İşlenmesine İlişkin Aydınlatma Metni" href="/kvkk">
      <p>
        Bu metin, 6698 sayılı Kişisel Verilerin Korunması Kanunu (&quot;KVKK&quot;) 10. maddesi uyarınca, {COMPANY.brand} uygulamasını
        ({COMPANY.site}) kullanan koçlar, öğretmenler, kurum personeli, öğrenciler ve velilerin kişisel verilerinin nasıl işlendiğini açıklar.
      </p>

      <h2>1. Veri sorumlusu</h2>
      <p>
        {COMPANY.title} (&quot;{COMPANY.brand}&quot;), adres: {COMPANY.address}, e-posta: {COMPANY.email}, KEP: {COMPANY.kep}.
      </p>
      <p>
        <b>Koç ve kurumların öğrencileri için önemli not:</b> Bir koç ya da kurum, kendi öğrencilerinin bilgilerini {COMPANY.brand}&apos;e
        kendisi giriyorsa, o öğrencilerin verileri bakımından <b>veri sorumlusu ilgili koç/kurumdur</b>; {COMPANY.brand} bu verileri koç/kurum
        adına ve talimatıyla işleyen <b>veri işleyendir</b>. Bu durumda öğrenciyi ve veliyi bilgilendirmek ve gerekli onayları almak koçun/kurumun
        sorumluluğundadır. Kendi kendine kayıt olan öğrenciler ile koç ve kurum hesapları bakımından veri sorumlusu {COMPANY.brand}&apos;dir.
      </p>

      <h2>2. İşlenen kişisel veriler</h2>
      <table>
        <thead><tr><th>Kim</th><th>Veri kategorileri</th></tr></thead>
        <tbody>
          <tr><td>Koç, öğretmen, kurum personeli</td><td>Kimlik (ad soyad), iletişim (e-posta, telefon), hesap ve oturum bilgileri, kurum ve görev bilgisi, abonelik ve ödeme bildirimi kayıtları (banka hesap bilgisi tutulmaz), uygulamada girdiği kayıtlar.</td></tr>
          <tr><td>Öğrenci</td><td>Kimlik (ad soyad, doğum tarihi), iletişim (telefon), eğitim bilgileri (sınıf, okul/kurum, sınav türü, hedefler), çalışma programı ve günlük kayıtları, deneme sonuçları ve analizleri, konu ilerleyişi, koçla görüşme notları ve defter fotoğrafları, mesajlar, izlenen içerik bilgisi, anket cevapları.</td></tr>
          <tr><td>Veli</td><td>Kimlik ve iletişim bilgileri, veli görüşme notları, veli rapor bağlantısının kullanımı.</td></tr>
          <tr><td>Herkes</td><td>İşlem güvenliği bilgileri (giriş kayıtları, IP adresi, cihaz/tarayıcı bilgisi), bildirim tercihleri, &quot;Bize bildir&quot; ile iletilen mesajlar.</td></tr>
        </tbody>
      </table>
      <p>
        Görüşme notlarında öğrencinin sağlık, psikolojik durum gibi <b>özel nitelikli kişisel verilerine</b> yer verilmemesi önerilir. Koç bu
        nitelikte bir bilgi yazmak zorundaysa bunun için ayrıca açık rıza alınması gerekir.
      </p>

      <h2>3. İşleme amaçları</h2>
      <ul>
        <li>Eğitim koçluğu hizmetinin sunulması: programların hazırlanması, çalışmaların ve deneme sonuçlarının takibi, görüşmelerin kaydı.</li>
        <li>Öğrenci, koç ve veli arasında iletişim (mesajlar, bildirimler, veli raporları).</li>
        <li>Deneme sonuçlarının ve çalışma verilerinin analiz edilmesi, öneriler üretilmesi (yapay zekâ destekli özellikler dahil).</li>
        <li>Üyelik, abonelik ve ödeme süreçlerinin yürütülmesi.</li>
        <li>Bilgi güvenliğinin sağlanması, hataların giderilmesi, hizmetin geliştirilmesi.</li>
        <li>Mevzuattan doğan yükümlülüklerin yerine getirilmesi ve yetkili kurumlara bilgi verilmesi.</li>
      </ul>

      <h2>4. Hukuki sebepler</h2>
      <ul>
        <li>Bir sözleşmenin kurulması veya ifasıyla doğrudan ilgili olması (KVKK m. 5/2-c): üyelik ve koçluk hizmeti.</li>
        <li>Veri sorumlusunun meşru menfaati (m. 5/2-f): güvenlik, hata giderme, hizmetin iyileştirilmesi.</li>
        <li>Hukuki yükümlülüğün yerine getirilmesi (m. 5/2-ç).</li>
        <li>Açık rıza (m. 5/1, m. 6, m. 9): yurt dışında bulunan hizmet sağlayıcılara aktarım ve yapay zekâ destekli analizler için;
          ayrıntılar <Link href="/acik-riza" className="underline">Açık Rıza Metni</Link>&apos;ndedir.</li>
      </ul>

      <h2>5. Kişisel verilerin aktarılması</h2>
      <p>Kişisel veriler satılmaz ve reklam amacıyla paylaşılmaz. Hizmetin sunulması için yalnızca gerekli ölçüde şu taraflara aktarılır:</p>
      <ul>
        <li><b>Öğrencinin koçu, öğretmenleri ve (öğrenci bir kurumdaysa) yetkili kurum personeli; velisi</b>: hizmetin doğası gereği.</li>
        <li><b>Barındırma ve veritabanı</b> (Supabase), <b>uygulama sunucusu</b> (Vercel): verilerin saklanması ve uygulamanın çalışması. Bu hizmetlerin sunucuları yurt dışında olabilir.</li>
        <li><b>Yapay zekâ hizmetleri</b> (Google Gemini, Groq): deneme analizi, program önerisi, defter fotoğrafından yazı okuma. Bu hizmetlere <b>öğrencinin adı gönderilmez</b>; yalnızca analiz için gerekli sayısal veriler ve notlar gönderilir.</li>
        <li><b>E-posta gönderimi</b> (Resend) ve <b>anlık bildirim</b> (tarayıcı/telefon bildirim servisleri).</li>
        <li>Kanunen yetkili kamu kurumları ve mahkemeler, talep halinde.</li>
      </ul>
      <p>Yurt dışına aktarım KVKK m. 9 kapsamında yapılır.</p>

      <h2>6. Toplama yöntemi</h2>
      <p>
        Veriler; kayıt formları, uygulama içindeki ekranlar (koç, öğrenci, kurum personeli ve veli tarafından girilenler), yüklenen dosyalar
        (deneme karnesi PDF&apos;leri, fotoğraflar) ve kullanım sırasında otomatik olarak (oturum, cihaz bilgisi) elektronik ortamda toplanır.
      </p>

      <h2>7. Saklama süresi</h2>
      <p>
        Veriler hesap açık olduğu sürece saklanır. Hesap silindiğinde ya da abonelik sona erip hesap kapandıktan sonra [süre, ör. 6 ay] içinde
        silinir veya anonim hale getirilir; mevzuatın daha uzun süre saklamayı gerektirdiği kayıtlar (ör. fatura) bu süre boyunca tutulur.
      </p>

      <h2>8. Haklarınız (KVKK m. 11)</h2>
      <ul>
        <li>Kişisel verinizin işlenip işlenmediğini öğrenme, işlenmişse bilgi talep etme,</li>
        <li>İşlenme amacını ve amacına uygun kullanılıp kullanılmadığını öğrenme,</li>
        <li>Aktarıldığı üçüncü kişileri bilme,</li>
        <li>Eksik veya yanlış işlenmişse düzeltilmesini, şartları oluşmuşsa silinmesini veya yok edilmesini isteme ve bunun aktarılan kişilere bildirilmesini isteme,</li>
        <li>Otomatik sistemlerle analiz sonucu aleyhinize bir sonuç çıkmasına itiraz etme,</li>
        <li>Kanuna aykırı işleme nedeniyle zarara uğramanız halinde zararın giderilmesini talep etme.</li>
      </ul>
      <p>
        Başvurularınızı {COMPANY.email} adresine e-postayla, {COMPANY.kep} KEP adresine ya da {COMPANY.address} adresine yazılı olarak
        iletebilirsiniz. Başvurular en geç 30 gün içinde ücretsiz sonuçlandırılır. 18 yaşından küçük öğrenciler için başvuru velisi tarafından yapılabilir.
      </p>
    </LegalPage>
  );
}
