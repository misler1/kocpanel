import type { Metadata } from 'next';
import { fraunces, inter } from '@/lib/fonts';
import { MarketingHeader } from '@/components/marketing/MarketingHeader';
import { MarketingFooter } from '@/components/marketing/MarketingFooter';
import { InstallGuide } from './InstallGuide';

export const metadata: Metadata = {
  title: 'Uygulamayı Yükle | KoçDefterim',
  description: 'KoçDefterim’i iPhone, iPad, Android telefon ve bilgisayara uygulama olarak yükle; program, görüşme ve mesaj bildirimlerini telefonundan al.',
  alternates: { canonical: '/uygulama' },
};

const NOTIFY_STEPS = [
  'Ana ekrandaki KoçDefterim ikonundan uygulamayı aç ve giriş yap.',
  'Sağ üstteki zil simgesine dokun.',
  'En alttaki “Bildirimler telefonuma da gelsin” düğmesine dokun ve çıkan pencerede “İzin ver”i seç.',
];

const FAQ = [
  { q: 'App Store ya da Google Play’den mi indiriliyor?', a: 'Hayır. KoçDefterim doğrudan internet sitesinden yüklenir. Mağaza hesabı, ödeme ya da şifre gerekmez; yükleme birkaç saniye sürer.' },
  { q: 'Telefonumda yer kaplar mı?', a: 'Neredeyse hiç. Uygulama içerikleri internetten gelir, telefonuna yalnızca ikon ve küçük bir başlangıç dosyası kaydedilir.' },
  { q: 'Güncelleme yapmam gerekir mi?', a: 'Gerekmez. Yaptığımız her yenilik uygulamayı bir sonraki açışında kendiliğinden gelir.' },
  { q: 'Bildirim gelmiyor, ne yapmalıyım?', a: 'iPhone’da uygulamayı Safari’den değil ana ekrandaki ikondan açtığından emin ol (iOS 16.4 ve sonrası gerekir). Daha önce “İzin verme” dediysen telefonun Ayarlar > Bildirimler bölümünden KoçDefterim’e izin ver.' },
  { q: 'Çıkış yaparsam ne olur?', a: 'Çıkış yaptığın cihaza artık senin bildirimlerin gelmez. Tekrar giriş yaptığında bildirimler kendiliğinden yeniden açılır.' },
];

export default function UygulamaPage() {
  return (
    <div className={[fraunces.variable, inter.variable, 'min-h-screen bg-[#FBF9F4] font-[family-name:var(--font-body)]'].join(' ')}>
      <MarketingHeader />
      <main className="mx-auto max-w-3xl px-5 pb-16 pt-14 md:pt-20">
        <p className="text-[13px] font-semibold uppercase tracking-wide text-[#C1442A]">Telefon ve tablet uygulaması</p>
        <h1 className="mt-3 font-[family-name:var(--font-display)] text-4xl leading-tight text-[#1D2B3A] md:text-5xl">
          KoçDefterim cebinde dursun.
        </h1>
        <p className="mt-5 text-[17px] leading-relaxed text-[#4A4438]">
          Haftalık programın, görüşme saatin ve koçunun mesajı. Hepsi tek dokunuşla açılır. Mağazaya girmene gerek yok; bir dakikada yükle, yeni bir görev ya da mesaj geldiğinde telefonun haber versin.
        </p>

        <div className="mt-9">
          <InstallGuide />
        </div>

        <section className="mt-12">
          <h2 className="font-[family-name:var(--font-display)] text-3xl text-[#1D2B3A]">Bildirimleri aç</h2>
          <p className="mt-3 text-[15.5px] leading-relaxed text-[#4A4438]">
            Koçun programına görev eklediğinde, görüşme planladığında ya da mesaj yazdığında telefonun çalsın. Bir kez açman yeter.
          </p>
          <ol className="mt-5 space-y-3">
            {NOTIFY_STEPS.map((s, i) => (
              <li key={s} className="flex gap-4 rounded-2xl border border-[#D9D2C2] bg-white p-4">
                <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-[#FCEBE5] text-[14px] font-semibold text-[#C1442A]">{i + 1}</span>
                <span className="text-[15px] leading-relaxed text-[#4A4438]">{s}</span>
              </li>
            ))}
          </ol>
        </section>

        <section className="mt-12">
          <h2 className="font-[family-name:var(--font-display)] text-3xl text-[#1D2B3A]">Sık sorulanlar</h2>
          <div className="mt-5 space-y-3">
            {FAQ.map((f) => (
              <details key={f.q} className="group rounded-2xl border border-[#D9D2C2] bg-white p-4">
                <summary className="cursor-pointer list-none text-[15.5px] font-semibold text-[#1D2B3A]">
                  {f.q}
                </summary>
                <p className="mt-2 text-[14.5px] leading-relaxed text-[#4A4438]">{f.a}</p>
              </details>
            ))}
          </div>
        </section>
      </main>
      <MarketingFooter />
    </div>
  );
}
