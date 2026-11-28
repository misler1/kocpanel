import type { Metadata } from 'next';
import Link from 'next/link';
import { LegalPage } from '@/components/legal/LegalPage';
import { COMPANY } from '@/lib/legal';

export const metadata: Metadata = {
  title: 'Gizlilik ve Çerez Politikası | KoçDefterim',
  description: 'KoçDefterim gizlilik ve çerez politikası: hangi verileri neden tuttuğumuz, çerezler ve tarayıcı depolaması.',
  alternates: { canonical: '/gizlilik' },
};

export default function GizlilikPage() {
  return (
    <LegalPage title="Gizlilik ve Çerez Politikası" href="/gizlilik">
      <p>
        {COMPANY.brand}, öğrencilerin ve koçların verilerini yalnızca eğitim koçluğu hizmetini sunmak için kullanır. Verileriniz satılmaz,
        reklam amacıyla kullanılmaz ve reklam ağlarıyla paylaşılmaz. Kişisel verilerin işlenmesine ilişkin ayrıntılar
        <Link href="/kvkk" className="underline"> KVKK Aydınlatma Metni</Link>&apos;ndedir.
      </p>

      <h2>Kim neyi görür?</h2>
      <ul>
        <li><b>Öğrenci</b>: kendi programını, günlüklerini, denemelerini, mesajlarını ve koçunun paylaştıklarını görür.</li>
        <li><b>Koç ve öğretmenler</b>: yalnızca kendilerine bağlı öğrencilerin bilgilerini görür. Bir koç başka bir koçun öğrencisini göremez.</li>
        <li><b>Kurum personeli</b> (ör. yurt yöneticisi, belletmen): yalnızca kendi kurumundaki öğrencilerin, görevinin gerektirdiği bilgilerini görür.</li>
        <li><b>Veli</b>: yalnızca koçun paylaştığı rapor bağlantısındaki bilgileri görür.</li>
        <li>Görüşme defter fotoğrafları kapalı depoda tutulur; yalnızca öğrenciyi görme yetkisi olanlar kısa süreli bağlantıyla açabilir.</li>
      </ul>

      <h2>Güvenlik</h2>
      <ul>
        <li>Bağlantılar şifrelidir (HTTPS). Şifreler yalnızca şifrelenmiş (hash) olarak saklanır.</li>
        <li>Erişim kuralları veritabanı düzeyinde uygulanır: yetkisi olmayan bir hesap başka öğrencinin kaydını okuyamaz.</li>
        <li>Yapay zekâ özelliklerinde öğrencinin adı gönderilmez.</li>
      </ul>

      <h2>Çerezler ve tarayıcı depolaması</h2>
      <p>{COMPANY.brand} reklam ya da üçüncü taraf takip çerezi kullanmaz. Yalnızca uygulamanın çalışması için zorunlu olanlar kullanılır:</p>
      <table>
        <thead><tr><th>Ne</th><th>Neden</th><th>Süre</th></tr></thead>
        <tbody>
          <tr><td>Oturum çerezleri (Supabase)</td><td>Giriş yapmış olduğunuzun hatırlanması</td><td>Oturum boyunca / çıkış yapana kadar</td></tr>
          <tr><td>Tercih çerezleri (ör. stajyer öğrencilerini göster)</td><td>Ekran tercihleriniz</td><td>En fazla 1 yıl</td></tr>
          <tr><td>Tarayıcı depolaması (localStorage)</td><td>Karanlık mod tercihi, kaydedilmemiş görüşme taslağı, son yapay zekâ önerisi gibi kolaylıklar</td><td>Siz silene kadar</td></tr>
          <tr><td>Service worker</td><td>Telefon bildirimleri ve çevrimdışı sayfa</td><td>Uygulama yüklü olduğu sürece</td></tr>
        </tbody>
      </table>
      <p>
        Koçun paylaştığı YouTube, Vimeo, Instagram gibi içerikler açıldığında, o sitenin kendi çerezleri ve gizlilik politikası geçerli olur.
        YouTube videoları mümkün olduğunda &quot;gelişmiş gizlilik&quot; (youtube-nocookie) adresiyle gösterilir.
      </p>
      <p>Tarayıcınızın ayarlarından çerezleri silebilirsiniz; zorunlu çerezler silinirse yeniden giriş yapmanız gerekir.</p>

      <h2>İletişim</h2>
      <p>Gizlilikle ilgili sorularınız için: {COMPANY.email}</p>
    </LegalPage>
  );
}
