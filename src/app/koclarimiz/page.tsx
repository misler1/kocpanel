import type { Metadata } from 'next';
import Image from 'next/image';
import { fraunces, inter } from '@/lib/fonts';
import { MarketingHeader } from '@/components/marketing/MarketingHeader';
import { MarketingFooter } from '@/components/marketing/MarketingFooter';

export const metadata: Metadata = {
  title: 'Musa İşler | Koçlarımız | KoçDefterim',
  description: 'Psikolojik Danışman Musa İşler ile LGS, YKS, akademik takip, sınav kaygısı, zaman yönetimi ve öğrenci-veli danışmanlığı süreci.',
  keywords: ['Musa İşler', 'psikolojik danışman', 'eğitim koçu', 'YKS koçu', 'LGS koçu', 'öğrenci koçluğu', 'sınav kaygısı'],
  alternates: { canonical: '/koclarimiz' },
};

const heroServices = [
  'LGS Eğitim Koçluğu',
  'YKS Eğitim Koçluğu',
  'Akademik Koçluk',
  'Sınav Kaygısı Desteği',
  'Öğrenci-Veli Danışmanlığı',
];

const certificates = [
  'Sınav Koçluğu Eğitimi',
  'Akademik Koçluk Eğitimi',
  'Bilişsel Davranışçı Terapiler Eğitimi',
  'Aile Terapisi Eğitimi',
  'Cinsel Terapi Eğitimi',
  'Çözüm Odaklı Terapi Eğitimi',
  'Oyun Terapisi Eğitimi',
];

const experiences = [
  'Özel eğitim kurumlarında okul psikolojik danışmanlığı',
  'Farklı yaş gruplarındaki öğrencilerin akademik ve sosyal gelişimlerinin takibi',
  'Öğrenci, veli ve öğretmenlerle rehberlik görüşmeleri',
  'Çocuk, ergen ve yetişkinlere yönelik psikolojik danışmanlık',
];

const workAreas = [
  { title: 'LGS Eğitim Koçluğu', className: 'bg-[#E3EEFA] text-[#21476A]' },
  { title: 'YKS Eğitim Koçluğu (TYT-AYT)', className: 'bg-[#FBE4D9] text-[#934D25]' },
  { title: 'Akademik Planlama ve Bireysel Takip', className: 'bg-[#E4EEE4] text-[#30543B]' },
  { title: 'Sınav Kaygısı ve Stres Yönetimi', className: 'bg-[#F6E4E7] text-[#843646]' },
  { title: 'Zaman Yönetimi ve Verimli Çalışma', className: 'bg-[#EFE8F3] text-[#54396A]' },
  { title: 'Öğrenci-Veli Danışmanlığı', className: 'bg-[#FFF0D8] text-[#8A5B16]' },
];

export default function KoclarimizPage() {
  return (
    <div className={[fraunces.variable, inter.variable, 'min-h-screen bg-[#FBF9F4] font-[family-name:var(--font-body)] text-[#25202A]'].join(' ')}>
      <MarketingHeader />
      <main className="overflow-hidden bg-[radial-gradient(ellipse_at_94%_10%,#E9D9C5_0%,transparent_31%),radial-gradient(ellipse_at_4%_85%,#E7D4BC_0%,transparent_36%),linear-gradient(125deg,#F8F2EA_0%,#FDFBF9_48%,#F4EBDF_100%)]">
        <section className="mx-auto grid max-w-7xl gap-8 px-5 pb-10 pt-20 lg:grid-cols-[minmax(280px,0.42fr)_minmax(0,1fr)] lg:items-stretch lg:px-8">
          <div className="relative min-h-[400px] overflow-hidden rounded-[22px] bg-white shadow-[0_24px_55px_rgba(102,70,44,0.18)] md:min-h-[520px]">
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="relative aspect-[4/5] w-full max-w-[320px]">
                <Image
                  src="/images/musa-isler-portre.webp"
                  alt="Musa İşler, psikolojik danışman ve eğitim koçu"
                  fill
                  priority
                  sizes="(max-width: 359px) calc(100vw - 40px), 320px"
                  unoptimized
                  className="object-contain"
                />
              </div>
            </div>
          </div>

          <div className="min-w-0 pt-1 lg:pt-3">
            <div className="flex min-h-12 items-start justify-between gap-3">
              <span className="inline-flex rounded-xl bg-[#F0E1D0] px-4 py-3 text-[12px] font-bold uppercase tracking-[0.18em] text-[#805532]">
                Eğitim Koçu
              </span>
              <span className="hidden rotate-[-6deg] text-right font-[family-name:var(--font-display)] text-[18px] italic leading-snug text-[#AC8268] sm:block md:text-[22px]">
                Daha güçlü yarınlar için,<br />planlı adımlar...
              </span>
            </div>

            <h1 className="mt-2 font-[family-name:var(--font-display)] text-[52px] font-bold leading-none tracking-[-0.04em] text-[#25202A] md:text-[82px]">
              Musa İşler
            </h1>
            <p className="mt-2 text-[21px] text-[#342A28] md:text-[30px]">
              Psikolojik Danışman <span className="text-[#A88B78]">|</span> Eğitim Koçu
            </p>
            <p className="mt-4 max-w-3xl text-[16px] leading-relaxed text-[#625A5A] md:text-[19px]">
              LGS, YKS ve akademik takip süreçlerinde öğrencinin hedeflerine uygun, planlı ve sürdürülebilir bir yol haritası oluşturmasına destek olur.
            </p>
            <p className="mt-4 inline-flex rounded-full border border-[#E0D5C8] bg-[#EEE5DC] px-5 py-2 text-[14px] text-[#4A4438]">
              Ümraniye Yüz yüze, Tüm Türkiye online
            </p>

            <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-5">
              {heroServices.map((service, index) => (
                <span
                  key={service}
                  className={[
                    'flex min-h-[64px] items-center justify-center rounded-xl px-3 text-center text-[12px] font-semibold leading-snug',
                    index === 0 && 'bg-[#E6ECF2] text-[#1E4262]',
                    index === 1 && 'bg-[#F8E9DF] text-[#8C4B2B]',
                    index === 2 && 'bg-[#E8EEE6] text-[#38573B]',
                    index === 3 && 'bg-[#F6E8E8] text-[#803A44]',
                    index === 4 && 'bg-[#F0EAFA] text-[#644988]',
                  ].filter(Boolean).join(' ')}
                >
                  {service}
                </span>
              ))}
            </div>

            <blockquote className="mt-5 rounded-2xl border-l-4 border-[#AB7A52] bg-gradient-to-r from-[#ECDDCB] to-[#F6EAE0] px-6 py-5 text-[16px] italic leading-relaxed text-[#5F4B43] md:text-[18px]">
              Amacım, öğrencinin yalnızca bir sınavda başarılı olması değil; etkili çalışma alışkanlıkları kazanmasıdır.
            </blockquote>
          </div>
        </section>

        <section className="mx-auto grid max-w-7xl gap-4 px-5 pb-12 lg:grid-cols-[1.1fr_0.9fr_0.95fr_1fr] lg:px-8">
          <article className="rounded-2xl bg-white/85 p-6 shadow-[0_9px_28px_rgba(82,59,38,0.06)]">
            <h2 className="font-[family-name:var(--font-display)] text-[22px] text-[#25202A]">Hakkımda</h2>
            <Image
              src="/images/musa-isler.png"
              alt="Psikolojik Danışman Musa İşler'in portresi"
              width={300}
              height={300}
              sizes="160px"
              unoptimized
              className="mx-auto mt-4 h-40 w-40 rounded-lg object-contain"
            />
            <p className="mt-4 text-[15px] leading-relaxed text-[#464049]">
              2014 yılında Marmara Üniversitesi Psikolojik Danışmanlık ve Rehberlik Bölümünden mezun oldum. St. Clements University’de Klinik Psikoloji yüksek lisans programına devam ediyorum.
            </p>
            <p className="mt-3 text-[15px] leading-relaxed text-[#464049]">
              Özel eğitim kurumlarındaki deneyimim boyunca öğrencilerin akademik ve duygusal gelişimlerini desteklemeye odaklandım. Sınava hazırlık çalışmalarında akademik planlama, motivasyon, zaman yönetimi ve sınav kaygısını birlikte değerlendiriyorum.
            </p>
          </article>

          <article className="rounded-2xl bg-white/85 p-6 shadow-[0_9px_28px_rgba(82,59,38,0.06)]">
            <h2 className="font-[family-name:var(--font-display)] text-[22px] text-[#25202A]">Eğitim</h2>
            <h3 className="mt-4 text-[13px] font-semibold uppercase tracking-wide text-[#9B6C46]">Lisans</h3>
            <p className="mt-1 font-semibold text-[#25202A]">Marmara Üniversitesi</p>
            <p className="mt-1 text-[14px] leading-relaxed text-[#464049]">Psikolojik Danışmanlık ve Rehberlik<br />2014</p>
            <div className="my-5 border-t border-[#E4D8CB]" />
            <h3 className="text-[13px] font-semibold uppercase tracking-wide text-[#9B6C46]">Yüksek Lisans</h3>
            <p className="mt-1 font-semibold text-[#25202A]">St. Clements University</p>
            <p className="mt-1 text-[14px] leading-relaxed text-[#464049]">Klinik Psikoloji<br />Devam ediyor</p>
          </article>

          <article className="rounded-2xl bg-white/85 p-6 shadow-[0_9px_28px_rgba(82,59,38,0.06)]">
            <h2 className="font-[family-name:var(--font-display)] text-[22px] text-[#25202A]">Sertifikalar</h2>
            <ul className="mt-4 space-y-2.5">
              {certificates.map((item) => (
                <li key={item} className="flex gap-3 text-[14px] leading-relaxed text-[#464049]">
                  <span className="mt-1.5 flex h-[18px] w-[18px] flex-shrink-0 items-center justify-center rounded-full bg-[#AC8A70] text-[11px] font-bold text-white">✓</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </article>

          <article className="rounded-2xl bg-white/85 p-6 shadow-[0_9px_28px_rgba(82,59,38,0.06)]">
            <h2 className="font-[family-name:var(--font-display)] text-[22px] text-[#25202A]">Mesleki Deneyim</h2>
            <ul className="mt-4 space-y-3">
              {experiences.map((item) => (
                <li key={item} className="relative pl-6 text-[14px] leading-relaxed text-[#464049] before:absolute before:left-0 before:top-2 before:h-2.5 before:w-2.5 before:rounded-full before:bg-[#AC8A70]">
                  {item}
                </li>
              ))}
            </ul>
          </article>
        </section>

        <section className="mx-auto max-w-7xl px-5 pb-16 lg:px-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <h2 className="font-[family-name:var(--font-display)] text-3xl text-[#25202A]">Çalışma Alanları</h2>
            <span className="text-[10px] font-semibold uppercase tracking-[0.28em] text-[#AA8667]">Her öğrencinin potansiyeli değerlidir</span>
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            {workAreas.map((area) => (
              <div key={area.title} className={`flex min-h-[110px] items-center rounded-2xl px-4 text-[14px] font-semibold leading-snug ${area.className}`}>
                {area.title}
              </div>
            ))}
          </div>
        </section>
      </main>
      <MarketingFooter />
    </div>
  );
}
