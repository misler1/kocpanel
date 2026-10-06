import type { Metadata } from 'next';
import { fraunces, inter } from '@/lib/fonts';
import { MarketingHeader } from '@/components/marketing/MarketingHeader';
import { MarketingFooter } from '@/components/marketing/MarketingFooter';
import {
  IconMessageCircle, IconChartBar, IconTarget, IconBook2, IconUsers, IconUserCheck, IconChecklist, IconSchool,
} from '@tabler/icons-react';

export const metadata: Metadata = {
  title: 'Hizmetlerimiz | YKS ve LGS Öğrenci Koçluğu | KoçDefterim',
  description: 'KoçDefterim; YKS ve LGS öğrencileri için birebir öğrenci koçluğu, haftalık çalışma programı, deneme analizi, konu takibi, veli bilgilendirme ve tercih danışmanlığı sunar.',
  keywords: ['YKS öğrenci koçluğu', 'LGS öğrenci koçluğu', 'deneme analizi', 'haftalık çalışma programı', 'konu takibi', 'veli bilgilendirme', 'tercih danışmanlığı'],
  alternates: { canonical: '/hizmetlerimiz' },
};

const SERVICES = [
  {
    icon: IconUserCheck,
    title: 'Birebir öğrenci koçluğu',
    desc: 'Koçluk görüşmelerinde öğrencinin yalnızca haftalık görevleri konuşulmaz. Hedefi, günlük çalışma ritmi, erteleme alışkanlığı, deneme sonrası moral durumu ve sınav kaygısı birlikte ele alınır. Bazen sorun konu eksiğidir, bazen de öğrenci nereden başlayacağını bilemediği için ilerleyemez. Görüşmeler bu ayrımı netleştirmek için yapılır.',
  },
  {
    icon: IconChecklist,
    title: 'Haftalık çalışma programı',
    desc: 'Haftalık program öğrencinin okul, kurs, etüt, ulaşım ve dinlenme düzeninden bağımsız hazırlanmaz. Ders, konu, kaynak, soru hedefi, başlangıç ve bitiş saatleri aynı planda görülür. Böylece öğrenci yalnızca “matematik çalış” gibi genel bir görevle kalmaz; hangi konuyu, hangi kaynakla, hangi zaman aralığında ele alacağını bilir.',
  },
  {
    icon: IconChartBar,
    title: 'TYT, AYT ve LGS deneme analizi',
    desc: 'Deneme sonucu tek başına bir karne değildir. Netlerin artması kadar yanlışların hangi derste toplandığı, boşların neden oluştuğu ve öğrencinin süreyi nasıl kullandığı da önemlidir. Analizden sonra amaç öğrenciyi yargılamak değil; bir sonraki haftanın çalışma başlıklarını daha doğru belirlemektir.',
  },
  {
    icon: IconBook2,
    title: 'Konu ilerleyişi takibi',
    desc: 'Başlanan, sürdürülen ve tamamlanan konular düzenli olarak işaretlenir. Yine de bir konu listede tamamlandı diye tamamen kapanmış sayılmaz. Denemede karşılığı zayıfsa tekrar programa alınabilir. Bu takip, öğrencinin “çok çalışıyorum ama ilerlemiyorum” hissini daha somut verilerle değerlendirmeye yardımcı olur.',
  },
  {
    icon: IconMessageCircle,
    title: 'Görüşme kayıtları',
    desc: 'Öğrenci ve veli görüşmeleri tarih, saat, konu, içerik ve görüşmeyi yapan kişi bilgisiyle kaydedilir. Önceki görüşmede alınan kararlar kaybolmadığı için her buluşmada aynı konulara geri dönmek zorunda kalınmaz. Süreç, küçük küçük ilerleyen ama iz bırakması gereken bir yolculuk gibi takip edilir.',
  },
  {
    icon: IconUsers,
    title: 'Veli bilgilendirme',
    desc: 'Veliler çoğu zaman çocuğunun ne kadar çalıştığını anlamaya çalışır ama evde görünen tablo her zaman yeterli bilgi vermez. KoçDefterim’de plan, deneme, konu ve görüşme notları birlikte tutulduğu için veli görüşmeleri daha somut ilerler. “Daha çok çalışmalı” demek yerine, nerede destek gerektiği konuşulur.',
  },
  {
    icon: IconTarget,
    title: 'Hedef ve tercih danışmanlığı',
    desc: 'Hedef okul, bölüm veya puan türü öğrencinin mevcut durumu ile birlikte değerlendirilir. YKS ve LGS sürecinde hedefin gerçekçi olup olmadığı, hangi dersin daha fazla ağırlık taşıdığı ve tercih döneminde nasıl bir yol izleneceği adım adım konuşulur. Hedef canlı kalır ama hayal ile plan birbirine karıştırılmaz.',
  },
  {
    icon: IconSchool,
    title: 'Kurum ve sınıf bazlı takip',
    desc: 'Okul, kurs, yurt veya rehberlik birimleri için kurum, sınıf/şube ve öğrenci bazlı takip yapılabilir. Rehber koç, stajyer öğretmen ve belletmen gibi farklı roller için yetkiler ayrıştırılabilir. Böylece herkes kendi sorumluluk alanını görür; özel görüşme kayıtları ve öğrenci bilgileri kontrolsüz biçimde dağılmaz.',
  },
];

const PROCESS = [
  { title: 'Önce tabloyu netleştiririz', text: 'Öğrencinin hedefi, mevcut netleri, konu durumu, kaynakları ve haftalık zamanı birlikte görülür. İlk bakışta “çalışmıyor” gibi görünen durumun altında bazen plansızlık, bazen konu eksiği, bazen de sınav kaygısı olabilir.' },
  { title: 'Planı öğrencinin hayatına uydururuz', text: 'Hazırlanan program okul ve ev düzeninden kopuk olmaz. Yoğun günlere daha hafif görev, uygun günlere daha derin çalışma konur. Plan gerçek hayata değmediğinde çok güzel görünse bile uzun süre yaşayamaz.' },
  { title: 'Denemeden sonra karar alırız', text: 'Her deneme, sadece sonuç değil bir sonraki haftanın pusulasıdır. Yanlışlar, boşlar ve süre kullanımı yeni haftanın çalışma başlıklarına bağlanır. Öğrenci neyi tekrar edeceğini daha net görür.' },
  { title: 'Süreci görünür tutarız', text: 'Koç, öğrenci ve veli aynı sürece farklı açılardan bakar. Kayıtlar düzenli tutulduğunda gelişim yalnızca hissedilmez; nerede hızlanıldığı, nerede yavaşlandığı daha rahat fark edilir.' },
];

const AUDIENCES = [
  { title: 'YKS öğrencileri', text: 'TYT ve AYT dengesini kurmak, alan derslerini takip etmek, deneme sonuçlarını yorumlamak ve tercih hedefini canlı tutmak isteyen öğrenciler için.' },
  { title: 'LGS öğrencileri', text: 'Okul, konu tekrarı, yeni nesil soru pratiği ve deneme takibini düzenli yürütmek isteyen ortaokul öğrencileri için.' },
  { title: 'Veliler', text: 'Çocuğunun sürecini yalnızca sonuçlara bakarak değil, çalışma düzeni ve gelişim adımlarıyla görmek isteyen veliler için.' },
  { title: 'Kurumlar', text: 'Rehberlik servisi, kurs, yurt veya eğitim kurumunda öğrencileri sınıf ve öğretmen bazlı izlemek isteyen ekipler için.' },
];

const FAQ = [
  { q: 'KoçDefterim kimler için uygundur?', a: 'YKS ve LGS hazırlığında düzenli takip, haftalık program, deneme analizi, konu ilerleyişi ve veli bilgilendirmesi isteyen öğrenciler, veliler ve eğitim kurumları için uygundur.' },
  { q: 'Öğrenci koçluğu sadece program hazırlamak mı?', a: 'Hayır. Program önemli bir parçadır ama tek başına yeterli değildir. Koçlukta görüşme notları, hedef takibi, deneme yorumları, kaynak kullanımı, motivasyon ve çalışma alışkanlığı birlikte ele alınır.' },
  { q: 'Deneme analizi ne işe yarar?', a: 'Deneme analizi, öğrencinin yalnızca kaç net yaptığına değil, hangi derste neden kayıp yaşadığına bakar. Bu sayede bir sonraki hafta için daha doğru konu, soru ve tekrar hedefi belirlenir.' },
  { q: 'Veliler süreci görebilir mi?', a: 'Evet. Görüşmeler, deneme sonuçları ve takip notları düzenli tutulduğu için veli bilgilendirmesi daha net ve somut hale gelir. Veli neyin iyi gittiğini, nerede destek gerektiğini daha rahat görür.' },
];

export default function HizmetlerimizPage() {
  return (
    <div className={[fraunces.variable, inter.variable, 'min-h-screen bg-[#FBF9F4] font-[family-name:var(--font-body)]'].join(' ')}>
      <MarketingHeader />
      <main>
        <section className="mx-auto max-w-4xl px-5 pb-10 pt-20">
          <p className="text-[13px] font-semibold uppercase tracking-wide text-[#C1442A]">Hizmetlerimiz</p>
          <h1 className="mt-3 font-[family-name:var(--font-display)] text-4xl leading-tight text-[#1D2B3A] md:text-5xl">
            YKS ve LGS hazırlığında öğrencinin ne çalıştığı kadar, neden ve nasıl çalıştığını da takip ederiz.
          </h1>
          <p className="mt-5 max-w-3xl text-[16px] leading-relaxed text-[#6B6558]">
            Sınav yılı bazen tek bir cümleye sıkışır: “Daha çok çalışmalısın.” Oysa her öğrenci için mesele bu kadar basit değildir. Kimi öğrenci çalışır ama yanlış yere ağırlık verir. Kimi plan yapar ama sürdüremez. Kimi de denemeden sonra neyi değiştirmesi gerektiğini bilemediği için aynı hataları tekrarlar.
          </p>
          <p className="mt-4 max-w-3xl text-[16px] leading-relaxed text-[#6B6558]">
            KoçDefterim; öğrenci koçluğu, haftalık çalışma programı, deneme analizi, konu ilerleyişi ve veli bilgilendirmesini aynı çatı altında toplar. Öğrenci ne yapacağını açıkça görsün, koç gelişimi veriye göre değerlendirsin, veli de sürecin neresinde olduğunu tahmin etmek zorunda kalmasın.
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

        <section className="bg-[#1D2B3A] text-white">
          <div className="mx-auto max-w-5xl px-5 py-12">
            <p className="text-[12px] font-semibold uppercase tracking-wide text-[#F0B36A]">Çalışma biçimimiz</p>
            <h2 className="mt-2 max-w-2xl font-[family-name:var(--font-display)] text-3xl leading-tight">
              Takip, öğrenciyi sıkıştırmak için değil; yükünü görünür kılıp yönetilebilir hale getirmek için yapılır.
            </h2>
            <div className="mt-8 grid gap-4 md:grid-cols-2">
              {PROCESS.map((item) => (
                <article key={item.title} className="rounded-2xl border border-white/15 bg-white/8 p-5">
                  <h3 className="font-semibold text-white">{item.title}</h3>
                  <p className="mt-2 text-[14px] leading-relaxed text-white/75">{item.text}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-5xl px-5 py-12">
          <p className="text-[12px] font-semibold uppercase tracking-wide text-[#C1442A]">Kimler için?</p>
          <h2 className="mt-2 font-[family-name:var(--font-display)] text-3xl text-[#1D2B3A]">Farklı ihtiyaçlar için aynı düzenli takip mantığı</h2>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {AUDIENCES.map((item) => (
              <article key={item.title} className="rounded-2xl border border-[#D9D2C2] bg-white p-5">
                <h3 className="font-semibold text-[#1D2B3A]">{item.title}</h3>
                <p className="mt-2 text-[14px] leading-relaxed text-[#6B6558]">{item.text}</p>
              </article>
            ))}
          </div>
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
