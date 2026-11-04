import type { Metadata } from 'next';
import { fraunces, inter } from '@/lib/fonts';
import { MarketingHeader } from '@/components/marketing/MarketingHeader';
import { MarketingFooter } from '@/components/marketing/MarketingFooter';
import {
  IconEye, IconHeartHandshake, IconTargetArrow, IconSparkles, IconSchool, IconUsers, IconUserStar,
} from '@tabler/icons-react';

export const metadata: Metadata = {
  title: 'Hakkımızda | KoçDefterim',
  description: 'KoçDefterim; YKS ve LGS hazırlığında öğrenci koçluğu, deneme analizi, haftalık takip, konu ilerleyişi ve veli bilgilendirmesini tek sistemde birleştirir.',
  keywords: ['KoçDefterim', 'öğrenci koçluğu', 'YKS koçluğu', 'LGS koçluğu', 'deneme analizi', 'haftalık takip', 'veli bilgilendirme'],
  alternates: { canonical: '/hakkimizda' },
};

const VALUES = [
  {
    icon: IconEye,
    badge: 'from-navy-500 to-navy-700',
    title: 'Görünür takip',
    text: 'Öğrencinin yaptığı çalışma, çözdüğü soru, tamamladığı konu ve deneme sonuçları dağınık notlarda kalmaz. Süreç tek yerde görünür hale gelir.',
  },
  {
    icon: IconHeartHandshake,
    badge: 'from-aqua-400 to-aqua-600',
    title: 'Rehberlik bakışı',
    text: 'Sınav hazırlığı yalnızca ders çalışmak değildir. Kaygı, motivasyon, aile iletişimi ve sürdürülebilir alışkanlıklar da sürecin gerçek parçalarıdır.',
  },
  {
    icon: IconTargetArrow,
    badge: 'from-amber-400 to-orange-500',
    title: 'Somut kararlar',
    text: 'Deneme analizi ve görüşme notları yalnızca kayıt olarak durmaz. Bir sonraki hafta hangi derse, hangi konuya ve hangi kaynağa ağırlık verileceğini belirler.',
  },
];

const STEPS = [
  'Öğrencinin hedefi, sınıf düzeyi, sınav türü, mevcut çalışma düzeni ve zorlandığı başlıklar birlikte değerlendirilir.',
  'Haftalık çalışma hedefleri; okul, kurs, dinlenme zamanı ve öğrencinin gerçek temposu dikkate alınarak hazırlanır.',
  'Deneme sonuçları yalnızca toplam net üzerinden değil, ders ve konu bazlı değişimlerle birlikte okunur.',
  'Görüşme kayıtları, konu ilerleyişi ve haftalık programlar düzenli güncellenir; süreç tahmine değil kayda dayanır.',
];

const WHY_ITEMS = [
  { icon: IconSchool, title: 'Öğrenci için', text: 'Ne çalışacağını bilmek öğrencinin zihnini rahatlatır. Plan netleşince “nereden başlayacağım?” sorusu daha az yorucu hale gelir.' },
  { icon: IconUsers, title: 'Veli için', text: 'Veli çoğu zaman sonucu görür ama aradaki emeği göremez. KoçDefterim, ilerleyen ve aksayan noktaları daha anlaşılır kılar.' },
  { icon: IconUserStar, title: 'Koç için', text: 'Koçun elinde yalnızca genel izlenim değil, düzenli kayıt olur. Bu da görüşmelerin daha verimli ve kararların daha isabetli ilerlemesini sağlar.' },
];

export default function HakkimizdaPage() {
  return (
    <div className={[fraunces.variable, inter.variable, 'min-h-screen bg-white font-[family-name:var(--font-body)]'].join(' ')}>
      <MarketingHeader />
      <main>
        <section className="relative overflow-hidden bg-gradient-to-b from-navy-50 via-white to-white">
          <div className="pointer-events-none absolute -left-32 -top-32 h-96 w-96 rounded-full bg-navy-200/40 blur-3xl" />
          <div className="pointer-events-none absolute -right-24 top-20 h-96 w-96 rounded-full bg-aqua-200/40 blur-3xl" />
        <div className="relative mx-auto max-w-4xl px-5 pb-14 pt-16 sm:pt-20">
          <span className="inline-flex items-center gap-2 rounded-full border border-navy-100 bg-white/80 px-3.5 py-1.5 text-[12.5px] font-medium text-navy-700 shadow-sm">
            <IconSparkles size={15} className="text-aqua-500" /> KoçDefterim hakkında
          </span>
          <h1 className="mt-4 font-[family-name:var(--font-display)] text-4xl leading-tight text-gray-900 md:text-5xl">
            Sınava hazırlık sürecinde öğrencinin{' '}
            <span className="bg-gradient-to-r from-navy-600 to-aqua-500 bg-clip-text text-transparent">emeğini, gelişimini ve ihtiyaçlarını</span>{' '}
            görünür hale getiriyoruz.
          </h1>
          <p className="mt-6 max-w-3xl text-[17px] leading-relaxed text-gray-700">
            Bir öğrencinin sınav yılı çoğu zaman çok fazla parçadan oluşur: okul, kurs, kaynaklar, denemeler, konu eksikleri, aile beklentisi, motivasyon iniş çıkışları... Bunların hepsi ayrı ayrı takip edildiğinde süreç kolayca dağılır. KoçDefterim, bu dağınıklığı toparlamak için geliştirildi.
          </p>
          <p className="mt-4 max-w-3xl text-[16px] leading-relaxed text-gray-600">
            Amacımız yalnızca bir öğrenci takip sistemi sunmak değil. Öğrencinin ne yaptığını, nerede zorlandığını ve bir sonraki adımda neye ihtiyacı olduğunu daha anlaşılır hale getirmek istiyoruz. Çünkü iyi bir plan, sadece dersleri sıraya koymakla oluşmaz; öğrencinin gerçek hayatına, temposuna ve hedeflerine uyduğu zaman işe yarar.
          </p>
          <p className="mt-4 max-w-3xl text-[16px] leading-relaxed text-gray-600">
            YKS ve LGS hazırlığında küçük ayrıntılar bazen büyük fark oluşturur. Bir denemede düşen net, tamamlanmış görünen ama unutulan bir konu, sürekli ertelenen bir kaynak ya da veliyle konuşulması gereken bir mesele... KoçDefterim bu ayrıntıları kaybolmadan takip etmeye yardımcı olur.
          </p>
        </div>
        </section>

        <section className="mx-auto grid max-w-5xl gap-5 px-5 pb-6 md:grid-cols-3">
          {VALUES.map((item) => (
            <article key={item.title} className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-gray-100">
              <span className={`flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br text-white shadow-md ${item.badge}`}>
                <item.icon size={24} />
              </span>
              <h2 className="mt-4 font-[family-name:var(--font-display)] text-[19px] text-gray-900">{item.title}</h2>
              <p className="mt-2 text-[14px] leading-relaxed text-gray-600">{item.text}</p>
            </article>
          ))}
        </section>

        <section className="mx-auto max-w-5xl px-5 py-16">
          <div className="grid gap-10 md:grid-cols-[0.85fr_1.15fr] md:items-start">
            <div>
              <p className="text-[13px] font-semibold uppercase tracking-wide text-aqua-600">Nasıl çalışır?</p>
              <h2 className="mt-2 font-[family-name:var(--font-display)] text-3xl text-gray-900">Önce tabloyu netleştirir, sonra haftayı planlarız.</h2>
              <p className="mt-4 text-[15px] leading-relaxed text-gray-600">
                Koçluk süreci tek bir görüşmeyle biten bir şey değildir. Öğrencinin hedefi, mevcut durumu ve haftalık ritmi düzenli olarak gözden geçirilir. Bazen plan değişir, bazen kaynak değişir, bazen de öğrencinin çalışma biçimini yeniden konuşmak gerekir.
              </p>
            </div>
            <div className="space-y-3">
              {STEPS.map((step, index) => (
                <div key={step} className="flex gap-4 rounded-3xl bg-white p-5 shadow-sm ring-1 ring-gray-100">
                  <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-navy-600 to-aqua-500 font-[family-name:var(--font-display)] text-[16px] text-white">{index + 1}</span>
                  <p className="text-[15px] leading-relaxed text-gray-700">{step}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="relative overflow-hidden bg-gradient-to-br from-navy-700 via-navy-600 to-aqua-600 text-white">
          <div className="pointer-events-none absolute -right-20 -top-24 h-80 w-80 rounded-full bg-aqua-400/30 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-24 -left-16 h-80 w-80 rounded-full bg-navy-400/30 blur-3xl" />
          <div className="relative mx-auto max-w-5xl px-5 py-16">
            <p className="text-[12px] font-semibold uppercase tracking-wide text-amber-200">Neden gerekli?</p>
            <h2 className="mt-2 max-w-3xl font-[family-name:var(--font-display)] text-3xl leading-tight">
              Takip sistemi, öğrenciyi baskılamak için değil; emeğini daha doğru okumak için kullanıldığında anlam kazanır.
            </h2>
            <div className="mt-8 grid gap-4 md:grid-cols-3">
              {WHY_ITEMS.map((item) => (
                <article key={item.title} className="rounded-3xl bg-white p-6 text-gray-900 shadow-[0_20px_40px_-20px_rgba(11,42,91,0.5)]">
                  <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-aqua-50 text-aqua-600">
                    <item.icon size={22} />
                  </span>
                  <h3 className="mt-3 font-semibold text-gray-900">{item.title}</h3>
                  <p className="mt-2 text-[14px] leading-relaxed text-gray-600">{item.text}</p>
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
