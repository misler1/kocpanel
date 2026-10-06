import type { Metadata } from 'next';
import { fraunces, inter } from '@/lib/fonts';
import { MarketingHeader } from '@/components/marketing/MarketingHeader';
import { MarketingFooter } from '@/components/marketing/MarketingFooter';

export const metadata: Metadata = {
  title: 'Koçlarımız | KoçDefterim',
  description: 'Psikolojik Danışman Musa İşler ile YKS, LGS, sınav kaygısı, tercih danışmanlığı, akademik takip ve öğrenci koçluğu süreci.',
  keywords: ['Musa İşler', 'psikolojik danışman', 'YKS koçu', 'LGS koçu', 'öğrenci koçluğu', 'tercih danışmanlığı'],
  alternates: { canonical: '/koclarimiz' },
};

const COACHES = [
  {
    name: 'Psikolojik Danışman Musa İşler',
    focus: 'YKS ve LGS öğrenci koçluğu, akademik takip, sınav kaygısı',
    summary: 'Marmara Üniversitesi Psikolojik Danışmanlık ve Rehberlik mezunu olan Musa İşler, öğrencilerin akademik süreçlerine yalnızca ders programı ve net takibi olarak bakmaz. Bir öğrencinin sınav yılı; çalışma alışkanlığı, kaygı düzeyi, motivasyonu, aileyle kurduğu iletişim ve hedefini ne kadar sahiplendiğiyle birlikte şekillenir. Bu nedenle koçluk görüşmelerinde öğrencinin ne çalıştığı kadar, çalışmayı nasıl sürdürdüğü de dikkatle ele alınır.',
    note: 'KoçDefterim’de amaç, öğrenciye dışarıdan hazır bir liste vermek değil; öğrencinin kendi hedefini daha net görmesine, haftalık adımlarını takip etmesine ve deneme sonuçlarından anlamlı kararlar çıkarmasına yardımcı olmaktır.',
    highlights: [
      '2014 yılından bu yana öğrencilerin akademik süreçlerine destek verme deneyimi',
      'Sınav koçluğu, akademik koçluk ve çözüm odaklı yaklaşım birikimi',
      'Ergen danışmanlığı, sınav kaygısı ve veli iletişimi odağında süreç takibi',
    ],
  },
];

const PRINCIPLES = [
  'Öğrencinin yalnızca sonucuna değil, çalışma düzenine ve sürdürülebilir alışkanlıklarına bakarız.',
  'Deneme sonuçlarını ders, konu, kaynak ve haftalık hedeflerle birlikte yorumlarız.',
  'Veli görüşmelerini sürecin tamamlayıcı parçası olarak görür; iletişimi düzenli tutarız.',
];

const APPROACH = [
  { title: 'Öğrenciyi tanımadan program yazmayız', text: 'Aynı sınıfta okuyan iki öğrencinin ihtiyacı birbirinden çok farklı olabilir. Bu yüzden hedef, günlük tempo, kaynak kullanımı ve zorlanılan dersler birlikte değerlendirilir.' },
  { title: 'Denemeyi sadece sonuç olarak görmeyiz', text: 'Bir deneme, öğrencinin o hafta neyi anlayıp neyi kaçırdığını gösterir. Net artışı kadar yanlışların türü, boş bırakılan sorular ve süre kullanımı da önemlidir.' },
  { title: 'Veliyle aynı dili kurmaya çalışırız', text: 'Veli desteği değerli ama doğru yerde durduğunda daha etkilidir. Süreç kayıt altına alındığında veliyle yapılan görüşmeler daha sakin, daha somut ve daha yapıcı ilerler.' },
];

export default function KoclarimizPage() {
  return (
    <div className={[fraunces.variable, inter.variable, 'min-h-screen bg-[#FBF9F4] font-[family-name:var(--font-body)]'].join(' ')}>
      <MarketingHeader />
      <main>
        <section className="mx-auto max-w-4xl px-5 pb-10 pt-20">
          <p className="text-[13px] font-semibold uppercase tracking-wide text-[#C1442A]">Koçlarımız</p>
          <h1 className="mt-3 font-[family-name:var(--font-display)] text-4xl leading-tight text-[#1D2B3A] md:text-5xl">
            Öğrenci koçluğunu rehberlik bakışı, düzenli takip ve gerçekçi hedeflerle ele alan bir yaklaşım.
          </h1>
          <p className="mt-5 max-w-3xl text-[16px] leading-relaxed text-[#6B6558]">
            Sınava hazırlık sürecinde öğrencinin yalnızca ne kadar çalıştığına bakmak çoğu zaman yeterli olmaz. Nasıl çalıştığı, nerede zorlandığı, deneme sonrası ne yaptığı ve hedefini ne kadar gerçekçi kurduğu da aynı derecede önemlidir. KoçDefterim’de koçluk bu bütünlük üzerinden yürütülür.
          </p>
        </section>

        <section className="mx-auto grid max-w-3xl gap-6 px-5 pb-14">
          {COACHES.map((coach) => (
            <article key={coach.name} className="rounded-2xl border border-[#D9D2C2] bg-white p-7">
              <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-[#E8F7F5] text-[20px] font-semibold text-[#008F8B]">
                {coach.name.split(' ').slice(-2).map((part) => part[0]).join('')}
              </div>
              <h2 className="font-[family-name:var(--font-display)] text-[22px] leading-snug text-[#1D2B3A]">{coach.name}</h2>
              <p className="mt-1.5 text-[13px] font-semibold text-[#C1442A]">{coach.focus}</p>
              <p className="mt-4 text-[15px] leading-relaxed text-[#4A4438]">{coach.summary}</p>
              <p className="mt-3 text-[15px] leading-relaxed text-[#4A4438]">{coach.note}</p>
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

        <section className="mx-auto max-w-5xl px-5 py-12">
          <p className="text-[12px] font-semibold uppercase tracking-wide text-[#C1442A]">Çalışma tarzı</p>
          <h2 className="mt-2 font-[family-name:var(--font-display)] text-3xl text-[#1D2B3A]">Koçluk görüşmesi, öğrencinin haftasını birlikte okumaktır.</h2>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {APPROACH.map((item) => (
              <article key={item.title} className="rounded-2xl border border-[#D9D2C2] bg-white p-5">
                <h3 className="font-semibold text-[#1D2B3A]">{item.title}</h3>
                <p className="mt-2 text-[14px] leading-relaxed text-[#6B6558]">{item.text}</p>
              </article>
            ))}
          </div>
        </section>
      </main>
      <MarketingFooter />
    </div>
  );
}
