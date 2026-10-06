import type { Metadata } from 'next';
import { fraunces, inter } from '@/lib/fonts';
import { MarketingHeader } from '@/components/marketing/MarketingHeader';
import { MarketingFooter } from '@/components/marketing/MarketingFooter';

export const metadata: Metadata = {
  title: 'Hakkımızda | KoçDefterim',
  description: 'KoçDefterim; YKS ve LGS hazırlığında öğrenci koçluğu, deneme analizi, haftalık takip, konu ilerleyişi ve veli bilgilendirmesini tek sistemde birleştirir.',
  keywords: ['KoçDefterim', 'öğrenci koçluğu', 'YKS koçluğu', 'LGS koçluğu', 'deneme analizi', 'haftalık takip', 'veli bilgilendirme'],
  alternates: { canonical: '/hakkimizda' },
};

const VALUES = [
  {
    title: 'Görünür takip',
    text: 'Öğrencinin yaptığı çalışma, çözdüğü soru, tamamladığı konu ve deneme sonuçları dağınık notlarda kalmaz. Süreç tek yerde görünür hale gelir.',
  },
  {
    title: 'Rehberlik bakışı',
    text: 'Sınav hazırlığı yalnızca ders çalışmak değildir. Kaygı, motivasyon, aile iletişimi ve sürdürülebilir alışkanlıklar da sürecin gerçek parçalarıdır.',
  },
  {
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
  { title: 'Öğrenci için', text: 'Ne çalışacağını bilmek öğrencinin zihnini rahatlatır. Plan netleşince “nereden başlayacağım?” sorusu daha az yorucu hale gelir.' },
  { title: 'Veli için', text: 'Veli çoğu zaman sonucu görür ama aradaki emeği göremez. KoçDefterim, ilerleyen ve aksayan noktaları daha anlaşılır kılar.' },
  { title: 'Koç için', text: 'Koçun elinde yalnızca genel izlenim değil, düzenli kayıt olur. Bu da görüşmelerin daha verimli ve kararların daha isabetli ilerlemesini sağlar.' },
];

export default function HakkimizdaPage() {
  return (
    <div className={[fraunces.variable, inter.variable, 'min-h-screen bg-[#FBF9F4] font-[family-name:var(--font-body)]'].join(' ')}>
      <MarketingHeader />
      <main>
        <section className="mx-auto max-w-4xl px-5 pb-12 pt-20">
          <p className="text-[13px] font-semibold uppercase tracking-wide text-[#C1442A]">KoçDefterim hakkında</p>
          <h1 className="mt-3 font-[family-name:var(--font-display)] text-4xl leading-tight text-[#1D2B3A] md:text-5xl">
            Sınava hazırlık sürecinde öğrencinin emeğini, gelişimini ve ihtiyaçlarını görünür hale getiriyoruz.
          </h1>
          <p className="mt-6 max-w-3xl text-[17px] leading-relaxed text-[#4A4438]">
            Bir öğrencinin sınav yılı çoğu zaman çok fazla parçadan oluşur: okul, kurs, kaynaklar, denemeler, konu eksikleri, aile beklentisi, motivasyon iniş çıkışları... Bunların hepsi ayrı ayrı takip edildiğinde süreç kolayca dağılır. KoçDefterim, bu dağınıklığı toparlamak için geliştirildi.
          </p>
          <p className="mt-4 max-w-3xl text-[16px] leading-relaxed text-[#4A4438]">
            Amacımız yalnızca bir öğrenci takip sistemi sunmak değil. Öğrencinin ne yaptığını, nerede zorlandığını ve bir sonraki adımda neye ihtiyacı olduğunu daha anlaşılır hale getirmek istiyoruz. Çünkü iyi bir plan, sadece dersleri sıraya koymakla oluşmaz; öğrencinin gerçek hayatına, temposuna ve hedeflerine uyduğu zaman işe yarar.
          </p>
          <p className="mt-4 max-w-3xl text-[16px] leading-relaxed text-[#4A4438]">
            YKS ve LGS hazırlığında küçük ayrıntılar bazen büyük fark oluşturur. Bir denemede düşen net, tamamlanmış görünen ama unutulan bir konu, sürekli ertelenen bir kaynak ya da veliyle konuşulması gereken bir mesele... KoçDefterim bu ayrıntıları kaybolmadan takip etmeye yardımcı olur.
          </p>
        </section>

        <section className="border-y border-[#D9D2C2] bg-white/70">
          <div className="mx-auto grid max-w-5xl gap-5 px-5 py-12 md:grid-cols-3">
            {VALUES.map((item) => (
              <article key={item.title} className="rounded-2xl border border-[#D9D2C2] bg-white p-6">
                <h2 className="font-[family-name:var(--font-display)] text-[18px] text-[#1D2B3A]">{item.title}</h2>
                <p className="mt-2 text-[14px] leading-relaxed text-[#6B6558]">{item.text}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-5xl px-5 py-14">
          <div className="grid gap-10 md:grid-cols-[0.85fr_1.15fr] md:items-start">
            <div>
              <p className="text-[13px] font-semibold uppercase tracking-wide text-[#C1442A]">Nasıl çalışır?</p>
              <h2 className="mt-2 font-[family-name:var(--font-display)] text-3xl text-[#1D2B3A]">Önce tabloyu netleştirir, sonra haftayı planlarız.</h2>
              <p className="mt-4 text-[15px] leading-relaxed text-[#6B6558]">
                Koçluk süreci tek bir görüşmeyle biten bir şey değildir. Öğrencinin hedefi, mevcut durumu ve haftalık ritmi düzenli olarak gözden geçirilir. Bazen plan değişir, bazen kaynak değişir, bazen de öğrencinin çalışma biçimini yeniden konuşmak gerekir.
              </p>
            </div>
            <div className="space-y-3">
              {STEPS.map((step, index) => (
                <div key={step} className="flex gap-4 rounded-2xl border border-[#D9D2C2] bg-white p-5">
                  <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-[#E8F7F5] text-[13px] font-semibold text-[#008F8B]">{index + 1}</span>
                  <p className="text-[15px] leading-relaxed text-[#4A4438]">{step}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-[#1D2B3A] text-white">
          <div className="mx-auto max-w-5xl px-5 py-12">
            <p className="text-[12px] font-semibold uppercase tracking-wide text-[#F0B36A]">Neden gerekli?</p>
            <h2 className="mt-2 max-w-3xl font-[family-name:var(--font-display)] text-3xl leading-tight">
              Takip sistemi, öğrenciyi baskılamak için değil; emeğini daha doğru okumak için kullanıldığında anlam kazanır.
            </h2>
            <div className="mt-8 grid gap-4 md:grid-cols-3">
              {WHY_ITEMS.map((item) => (
                <article key={item.title} className="rounded-2xl border border-white/15 bg-white/8 p-5">
                  <h3 className="font-semibold text-white">{item.title}</h3>
                  <p className="mt-2 text-[14px] leading-relaxed text-white/75">{item.text}</p>
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
