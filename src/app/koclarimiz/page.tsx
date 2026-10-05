import type { Metadata } from 'next';
import { fraunces, inter } from '@/lib/fonts';
import { MarketingHeader } from '@/components/marketing/MarketingHeader';
import { MarketingFooter } from '@/components/marketing/MarketingFooter';

export const metadata: Metadata = {
  title: 'Koçlarımız | KoçDefterim',
  description: 'KoçDefterim ekibindeki psikolojik danışmanlar Musa İşler ve Eyyüp Ok ile YKS, LGS, sınav kaygısı, tercih danışmanlığı ve akademik koçluk süreci.',
  keywords: ['Musa İşler', 'Eyyüp Ok', 'psikolojik danışman', 'YKS koçu', 'LGS koçu', 'tercih danışmanlığı'],
  alternates: { canonical: '/koclarimiz' },
};

const COACHES = [
  {
    name: 'Psikolojik Danışman Musa İşler',
    focus: 'YKS ve LGS öğrenci koçluğu, akademik takip, sınav kaygısı',
    summary: 'Marmara Üniversitesi Psikolojik Danışmanlık ve Rehberlik mezunu olan Musa İşler, öğrencilerin akademik süreçlerini psikolojik danışmanlık bakışıyla ele alır. Sınav koçluğu ve akademik koçluk eğitimleriyle birlikte deneme analizi, çalışma alışkanlığı, motivasyon ve aile iletişimi konularını bütüncül biçimde takip eder.',
    highlights: [
      '2014 yılından bu yana öğrencilerin akademik süreçlerine destek verme deneyimi',
      'Sınav koçluğu, akademik koçluk ve çözüm odaklı yaklaşım birikimi',
      'Ergen danışmanlığı, sınav kaygısı ve veli iletişimi odağında süreç takibi',
    ],
  },
  {
    name: 'Psikolojik Danışman Eyyüp Ok',
    focus: 'YKS tercih danışmanlığı, lise öğrencileriyle gelişim odaklı çalışma',
    summary: 'Psikolojik danışman Eyyüp Ok, lise öğrencilerinin hedef belirleme, anlam arayışı, iyi oluş ve tercih süreci gibi kritik başlıklarında deneyim sahibidir. YKS tercih danışmanlığı sürecine yönelik mesleki çalışmalarda yer alması, öğrencilerin yalnızca puan ve sıralama değil; bölüm, kariyer ve kişisel uygunluk açısından da değerlendirilmesine katkı sağlar.',
    highlights: [
      'YKS tercih danışmanlığı süreci üzerine mesleki seminer deneyimi',
      'Lise öğrencilerinin öznel iyi oluşu ve anlam arayışı üzerine akademik çalışma',
      'Hedef, tercih, motivasyon ve kariyer yönelimi konularında rehberlik yaklaşımı',
    ],
  },
];

const PRINCIPLES = [
  'Öğrencinin yalnızca sonucuna değil, çalışma düzenine ve sürdürülebilir alışkanlıklarına bakarız.',
  'Deneme sonuçlarını ders, konu, kaynak ve haftalık hedeflerle birlikte yorumlarız.',
  'Veli görüşmelerini sürecin tamamlayıcı parçası olarak görür; iletişimi düzenli tutarız.',
];

export default function KoclarimizPage() {
  return (
    <div className={[fraunces.variable, inter.variable, 'min-h-screen bg-[#FBF9F4] font-[family-name:var(--font-body)]'].join(' ')}>
      <MarketingHeader />
      <main>
        <section className="mx-auto max-w-4xl px-5 pb-10 pt-20">
          <p className="text-[13px] font-semibold uppercase tracking-wide text-[#C1442A]">Koçlarımız</p>
          <h1 className="mt-3 font-[family-name:var(--font-display)] text-4xl leading-tight text-[#1D2B3A] md:text-5xl">
            Öğrenci koçluğunu psikolojik danışmanlık ve ölçülebilir takip sistemiyle birleştiren ekip.
          </h1>
          <p className="mt-5 max-w-3xl text-[16px] leading-relaxed text-[#6B6558]">
            KoçDefterim’de koçluk; haftalık program yazmaktan ibaret değildir. Öğrencinin hedefi, deneme sonuçları, konu eksikleri, çalışma alışkanlıkları, motivasyonu ve tercih süreci birlikte değerlendirilir. Bu yüzden ekibimizde psikolojik danışmanlık formasyonu ve sınav süreci deneyimi özellikle önemlidir.
          </p>
        </section>

        <section className="mx-auto grid max-w-5xl gap-6 px-5 pb-14 md:grid-cols-2">
          {COACHES.map((coach) => (
            <article key={coach.name} className="rounded-2xl border border-[#D9D2C2] bg-white p-7">
              <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-[#E8F7F5] text-[20px] font-semibold text-[#008F8B]">
                {coach.name.split(' ').slice(-2).map((part) => part[0]).join('')}
              </div>
              <h2 className="font-[family-name:var(--font-display)] text-[22px] leading-snug text-[#1D2B3A]">{coach.name}</h2>
              <p className="mt-1.5 text-[13px] font-semibold text-[#C1442A]">{coach.focus}</p>
              <p className="mt-4 text-[15px] leading-relaxed text-[#4A4438]">{coach.summary}</p>
              <ul className="mt-5 space-y-2">
                {coach.highlights.map((item) => (
                  <li key={item} className="flex gap-2 text-[14px] leading-relaxed text-[#6B6558]">
                    <span className="mt-2 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-[#008F8B]" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </section>

        <section className="border-y border-[#D9D2C2] bg-white/70">
          <div className="mx-auto max-w-5xl px-5 py-12">
            <h2 className="font-[family-name:var(--font-display)] text-3xl text-[#1D2B3A]">Koçluk yaklaşımımız</h2>
            <div className="mt-6 grid gap-4 md:grid-cols-3">
              {PRINCIPLES.map((item) => (
                <div key={item} className="rounded-2xl border border-[#D9D2C2] bg-white p-5 text-[14px] leading-relaxed text-[#6B6558]">
                  {item}
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
