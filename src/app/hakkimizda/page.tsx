import type { Metadata } from 'next';
import { fraunces, inter } from '@/lib/fonts';
import { MarketingHeader } from '@/components/marketing/MarketingHeader';
import { MarketingFooter } from '@/components/marketing/MarketingFooter';

export const metadata: Metadata = {
  title: 'Hakkımızda | KoçDefterim',
  description: 'KoçDefterim; YKS ve LGS hazırlığında öğrenci koçluğu, deneme analizi, haftalık takip ve veli bilgilendirmesini tek sistemde birleştirir.',
  keywords: ['KoçDefterim', 'öğrenci koçluğu', 'YKS koçluğu', 'LGS koçluğu', 'deneme analizi', 'haftalık takip'],
  alternates: { canonical: '/hakkimizda' },
};

const VALUES = [
  { title: 'Ölçülebilir takip', text: 'Deneme sonuçları, konu ilerleyişi, soru hedefleri ve haftalık programlar düzenli kayda dönüşür.' },
  { title: 'Psikolojik danışman bakışı', text: 'Akademik hedeflerin yanında motivasyon, kaygı yönetimi ve sürdürülebilir çalışma alışkanlığı önemsenir.' },
  { title: 'Şeffaf süreç', text: 'Öğrenci, veli ve koç aynı süreci görebilir; görüşmeler ve hedefler dağınık notlarda kaybolmaz.' },
];

const STEPS = [
  'Öğrencinin hedefi, sınıf düzeyi, sınav türü ve mevcut çalışma düzeni anlaşılır.',
  'Haftalık hedefler, kaynak kullanımı ve deneme analizleri öğrencinin temposuna göre planlanır.',
  'Görüşme kayıtları, konu eksikleri ve ilerleme verileriyle süreç düzenli olarak güncellenir.',
];

export default function HakkimizdaPage() {
  return (
    <div className={[fraunces.variable, inter.variable, 'min-h-screen bg-[#FBF9F4] font-[family-name:var(--font-body)]'].join(' ')}>
      <MarketingHeader />
      <main>
        <section className="mx-auto max-w-4xl px-5 pb-12 pt-20">
          <p className="text-[13px] font-semibold uppercase tracking-wide text-[#C1442A]">KoçDefterim hakkında</p>
          <h1 className="mt-3 font-[family-name:var(--font-display)] text-4xl leading-tight text-[#1D2B3A] md:text-5xl">
            YKS ve LGS hazırlığında öğrenci takibini görünür, düzenli ve uygulanabilir hale getiriyoruz.
          </h1>
          <p className="mt-6 max-w-3xl text-[17px] leading-relaxed text-[#4A4438]">
            KoçDefterim, öğrencilerin sınav hazırlık sürecinde yaptığı çalışmaları, deneme sonuçlarını, konu ilerleyişini ve görüşme notlarını tek bir sistemde toplamak için geliştirildi. Amacımız yalnızca veri tutmak değil; öğrencinin hangi adımı ne zaman atacağını netleştiren, veliye süreci şeffaf gösteren ve koça karar aldıran bir takip düzeni kurmak.
          </p>
          <p className="mt-4 max-w-3xl text-[16px] leading-relaxed text-[#4A4438]">
            Her öğrencinin öğrenme hızı, motivasyonu, sınav kaygısı ve aile desteği farklıdır. Bu nedenle KoçDefterim, standart bir çalışma listesi yerine öğrencinin kendi hedeflerine göre düzenlenen haftalık plan, düzenli görüşme, deneme analizi ve konu takibi yaklaşımını merkeze alır.
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
              <h2 className="mt-2 font-[family-name:var(--font-display)] text-3xl text-[#1D2B3A]">Koçluk sürecini somut adımlara böler.</h2>
              <p className="mt-4 text-[15px] leading-relaxed text-[#6B6558]">
                Öğrencinin hedefi belirlendikten sonra süreç düzenli görüşmeler, haftalık takip programları ve deneme sonuç analizleriyle ilerler. Böylece neyin çalıştığı, neyin eksik kaldığı ve bir sonraki hafta ne yapılacağı netleşir.
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
      </main>
      <MarketingFooter />
    </div>
  );
}
