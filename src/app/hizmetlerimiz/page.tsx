import type { Metadata } from 'next';
import { fraunces, inter } from '@/lib/fonts';
import { MarketingHeader } from '@/components/marketing/MarketingHeader';
import { MarketingFooter } from '@/components/marketing/MarketingFooter';
import {
  IconMessageCircle, IconChartBar, IconTarget, IconBook2, IconUsers, IconUserCheck, IconChecklist, IconSchool,
} from '@tabler/icons-react';

export const metadata: Metadata = {
  title: 'Hizmetlerimiz | YKS ve LGS Öğrenci Koçluğu | KoçDefterim',
  description: 'KoçDefterim; YKS koçluğu, LGS koçluğu, deneme analizi, haftalık çalışma programı, konu takibi, veli görüşmeleri ve tercih danışmanlığı hizmetleri sunar.',
  keywords: ['YKS öğrenci koçluğu', 'LGS öğrenci koçluğu', 'deneme analizi', 'haftalık çalışma programı', 'konu takibi', 'veli görüşmesi'],
  alternates: { canonical: '/hizmetlerimiz' },
};

const SERVICES = [
  { icon: IconUserCheck, title: 'Birebir Öğrenci Koçluğu', desc: 'Öğrencinin hedefi, güçlü yönleri, erteleme alışkanlığı ve sınav kaygısı dikkate alınarak düzenli koçluk görüşmeleri yapılır.' },
  { icon: IconChecklist, title: 'Haftalık Çalışma Programı', desc: 'Ders, konu, kaynak, soru hedefi, başlangıç ve bitiş saatleriyle uygulanabilir haftalık plan hazırlanır.' },
  { icon: IconChartBar, title: 'TYT, AYT ve LGS Deneme Analizi', desc: 'Deneme sonuçları net, ders, konu ve gelişim eğrisi üzerinden karşılaştırılır; bir sonraki çalışma hedefi netleşir.' },
  { icon: IconBook2, title: 'Konu İlerleyişi Takibi', desc: 'Hangi konunun başladığı, sürdüğü veya tamamlandığı görülür; eksik kalan başlıklar haftalık plana bağlanır.' },
  { icon: IconMessageCircle, title: 'Görüşme Kayıtları', desc: 'Öğrenci ve veli görüşmeleri tarih, konu, içerik ve görüşmeyi yapan kişiyle birlikte kaydedilir.' },
  { icon: IconUsers, title: 'Veli Bilgilendirme', desc: 'Veliler öğrencinin çalışma düzeni, deneme gelişimi ve koç görüşmelerindeki ana gündemler hakkında daha şeffaf bilgi alır.' },
  { icon: IconTarget, title: 'Hedef ve Tercih Danışmanlığı', desc: 'YKS ve LGS sürecinde hedef okul/bölüm, sıralama gerçekliği ve tercih stratejisi birlikte değerlendirilir.' },
  { icon: IconSchool, title: 'Kurum ve Sınıf Bazlı Takip', desc: 'Kurum, sınıf/şube ve öğrenci bazında yetkilendirme yapılabilir; stajyer ve rehber koç süreçleri ayrıştırılır.' },
];

const FAQ = [
  { q: 'KoçDefterim kimler için uygundur?', a: 'YKS ve LGS hazırlığında düzenli takip, deneme analizi, haftalık plan ve veli bilgilendirmesi isteyen öğrenciler, veliler ve eğitim kurumları için uygundur.' },
  { q: 'Öğrenci koçluğu sadece program hazırlamak mı?', a: 'Hayır. Program hazırlama sürecin yalnızca bir parçasıdır. Koçluk; görüşme, hedef takibi, deneme analizi, motivasyon ve çalışma alışkanlığı takibini birlikte yürütür.' },
  { q: 'Veliler süreci görebilir mi?', a: 'Evet. Görüşmeler, deneme sonuçları ve takip notları düzenli tutulduğu için veli bilgilendirmesi daha net ve somut hale gelir.' },
];

export default function HizmetlerimizPage() {
  return (
    <div className={[fraunces.variable, inter.variable, 'min-h-screen bg-[#FBF9F4] font-[family-name:var(--font-body)]'].join(' ')}>
      <MarketingHeader />
      <main>
        <section className="mx-auto max-w-4xl px-5 pb-10 pt-20">
          <p className="text-[13px] font-semibold uppercase tracking-wide text-[#C1442A]">Hizmetlerimiz</p>
          <h1 className="mt-3 font-[family-name:var(--font-display)] text-4xl leading-tight text-[#1D2B3A] md:text-5xl">
            YKS ve LGS hazırlığında çalışma planı, deneme analizi ve koçluk takibi tek yerde.
          </h1>
          <p className="mt-5 max-w-3xl text-[16px] leading-relaxed text-[#6B6558]">
            KoçDefterim, öğrencinin sınav hazırlık sürecini görünür kılan dijital takip sistemi ve birebir koçluk yaklaşımı sunar. Amaç, öğrencinin ne çalışacağını bilmesi, koçun gelişimi veriye göre yorumlaması ve velinin süreci somut biçimde takip edebilmesidir.
          </p>
        </section>

        <section className="mx-auto grid max-w-5xl gap-5 px-5 pb-14 sm:grid-cols-2">
          {SERVICES.map((service) => (
            <article key={service.title} className="rounded-2xl border border-[#D9D2C2] bg-white p-6">
              <service.icon size={23} className="text-[#C1442A]" />
              <h2 className="mt-3 font-[family-name:var(--font-display)] text-[18px] text-[#1D2B3A]">{service.title}</h2>
              <p className="mt-2 text-[14px] leading-relaxed text-[#6B6558]">{service.desc}</p>
            </article>
          ))}
        </section>

        <section className="border-y border-[#D9D2C2] bg-white/70">
          <div className="mx-auto max-w-5xl px-5 py-12">
            <h2 className="font-[family-name:var(--font-display)] text-3xl text-[#1D2B3A]">Sık sorulan sorular</h2>
            <div className="mt-6 space-y-4">
              {FAQ.map((item) => (
                <article key={item.q} className="rounded-2xl border border-[#D9D2C2] bg-white p-5">
                  <h3 className="font-semibold text-[#1D2B3A]">{item.q}</h3>
                  <p className="mt-2 text-[14px] leading-relaxed text-[#6B6558]">{item.a}</p>
                </article>
              ))}
            </div>
          </div>
        </section>
      </main>
      <MarketingFooter />
    </div>
  );
}
