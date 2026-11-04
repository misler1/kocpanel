import type { Metadata } from 'next';
import Link from 'next/link';
import { SITE_URL } from '@/lib/site';
import { fraunces, inter } from '@/lib/fonts';
import { MarketingHeader } from '@/components/marketing/MarketingHeader';
import { MarketingFooter } from '@/components/marketing/MarketingFooter';
import { HeroVisual } from '@/components/marketing/HeroVisual';
import {
  IconMessageCircle, IconChartBar, IconTarget, IconArrowRight, IconSchool, IconBook2, IconLanguage, IconUsersGroup,
  IconHeartHandshake, IconCalendarCheck, IconChartLine,
} from '@tabler/icons-react';

const LIGHT_SLIDES = [
  { title: 'YKS koçluğu', text: 'TYT ve AYT sürecinde deneme analizi, haftalık plan ve net takibi birlikte ilerler.',
    icon: IconSchool, card: 'border-navy-100 from-navy-50', badge: 'from-navy-500 to-navy-700' },
  { title: 'LGS takip sistemi', text: 'Sınıf düzeyi, ders eksikleri ve deneme sonuçları sade bir akışla izlenir.',
    icon: IconBook2, card: 'border-aqua-100 from-aqua-50', badge: 'from-aqua-400 to-aqua-600' },
  { title: 'Dil sınav koçluğu', text: 'YDT hazırlığında kelime, reading ve soru çözüm ritmi düzenli takip edilir.',
    icon: IconLanguage, card: 'border-emerald-100 from-emerald-50', badge: 'from-emerald-500 to-teal-500' },
  { title: 'Veli bilgilendirme', text: 'Öğrencinin çalışma temposu ve gelişimi veliler için daha anlaşılır hale gelir.',
    icon: IconUsersGroup, card: 'border-amber-100 from-amber-50', badge: 'from-amber-500 to-orange-500' },
];

// Nasıl çalışıyoruz: gerçekten sıralı bir süreç
const STEPS = [
  { n: '1', icon: IconHeartHandshake, title: 'Tanışma ve hedef belirleme', desc: 'Öğrencinin seviyesi ve hedefleri birlikte değerlendirilir.', badge: 'from-navy-500 to-navy-700' },
  { n: '2', icon: IconCalendarCheck, title: 'Haftalık çalışma ve takip', desc: 'Günlük çalışmalar kaydedilir, hedefler izlenir.', badge: 'from-aqua-400 to-aqua-600' },
  { n: '3', icon: IconChartLine, title: 'Deneme analizi ve yönlendirme', desc: 'Sonuçlar ders ders incelenir, sonraki adım netleşir.', badge: 'from-navy-600 to-aqua-500' },
];

export const metadata: Metadata = {
  title: 'Koç Defterim | YKS ve LGS Öğrenci Koçluğu, Deneme Analizi ve Takip',
  description: 'Koç Defterim (KoçDefterim); YKS ve LGS öğrencileri için birebir eğitim koçluğu, haftalık çalışma programı, deneme analizi, konu takibi ve veli bilgilendirmesi sunar.',
  alternates: { canonical: '/' },
  openGraph: {
    url: '/',
    title: 'Koç Defterim | YKS ve LGS Öğrenci Koçluğu',
    description: 'Öğrencinizin çalışma defteri, artık dijital. Haftalık takip, deneme analizi ve veli bilgilendirmesi tek yerde.',
  },
};

// Google'a marka adını (bitişik ve ayrı yazımıyla) ve sitenin kime ait olduğunu bildirir
const JSON_LD = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'Organization',
      '@id': `${SITE_URL}/#organization`,
      name: 'Koç Defterim',
      alternateName: ['KoçDefterim', 'Koc Defterim', 'kocdefterim'],
      url: SITE_URL,
      logo: `${SITE_URL}/brand/kocdefterim-logo.png`,
    },
    {
      '@type': 'WebSite',
      '@id': `${SITE_URL}/#website`,
      name: 'Koç Defterim',
      alternateName: ['KoçDefterim', 'Koc Defterim'],
      url: SITE_URL,
      inLanguage: 'tr-TR',
      publisher: { '@id': `${SITE_URL}/#organization` },
    },
  ],
};

// Giriş yapmış kullanıcı da tanıtım sitesini görebilir; panele üst menüdeki "Panelim" ile döner.
export default function Home() {

  return (
    <div className={`${fraunces.variable} ${inter.variable} min-h-screen bg-white font-[family-name:var(--font-body)]`}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD) }} />
      <MarketingHeader />

      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-b from-navy-50/80 via-white to-white">
        <div className="pointer-events-none absolute -left-32 -top-32 h-96 w-96 rounded-full bg-navy-200/40 blur-3xl" />
        <div className="pointer-events-none absolute -right-24 top-20 h-96 w-96 rounded-full bg-aqua-200/40 blur-3xl" />
      <div className="relative mx-auto max-w-6xl px-5 pb-16 pt-12 sm:pt-20">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <div>
            <span className="mb-5 inline-flex items-center gap-2 rounded-full border border-navy-100 bg-white/80 px-3.5 py-1.5 text-[12.5px] font-medium text-navy-700 shadow-sm">
              <span className="h-2 w-2 rounded-full bg-emerald-500" /> YKS · LGS · YDT öğrenci koçluğu
            </span>
            <h1 className="font-[family-name:var(--font-display)] text-4xl leading-tight text-gray-900 sm:text-5xl">
              Öğrencinizin çalışma defteri,{' '}
              <span className="bg-gradient-to-r from-navy-600 to-aqua-500 bg-clip-text text-transparent">artık dijital.</span>
            </h1>
            <p className="mt-5 max-w-md text-[16px] leading-relaxed text-gray-600">
              KoçDefterim; günlük çalışmaları, deneme sonuçlarını ve hedefleri tek yerde toplar.
              Koçlarımız her öğrenciyi yakından takip eder, siz de sürecin her adımını görürsünüz.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/giris" className="rounded-full bg-navy-600 px-6 py-3 text-[14px] font-medium text-white transition hover:bg-navy-700">
                Koç Girişi
              </Link>
              <Link href="/giris/ogrenci" className="rounded-full border border-gray-300 px-6 py-3 text-[14px] font-medium text-gray-700 transition hover:bg-gray-50">
                Öğrenci Girişi
              </Link>
            </div>
            <Link href="/uygulama" className="mt-4 inline-flex items-center gap-1.5 text-[14px] font-medium text-navy-600 hover:underline">
              📲 Uygulamayı telefonuna ücretsiz indir →
            </Link>
          </div>
          <HeroVisual />
        </div>
      </div>
      </section>

      {/* Hafif SEO slider */}
      <section className="overflow-hidden border-y border-gray-100 bg-white py-8" aria-label="KocDefterim hizmet basliklari">
        <div className="mx-auto max-w-6xl px-5">
          <div className="relative overflow-hidden">
            <div className="kd-slider-track flex w-max gap-4">
              {[...LIGHT_SLIDES, ...LIGHT_SLIDES].map((slide, index) => (
                <article key={`${slide.title}-${index}`} aria-hidden={index >= LIGHT_SLIDES.length} className={`flex w-[290px] flex-shrink-0 gap-4 rounded-2xl border bg-gradient-to-br to-white px-5 py-4 shadow-sm sm:w-[360px] ${slide.card}`}>
                  <span className={`flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br text-white shadow-md ${slide.badge}`}>
                    <slide.icon size={22} />
                  </span>
                  <span className="min-w-0">
                    <h2 className="font-[family-name:var(--font-display)] text-[17px] text-gray-900">{slide.title}</h2>
                    <p className="mt-1 text-[13px] leading-relaxed text-gray-600">{slide.text}</p>
                  </span>
                </article>
              ))}
            </div>
          </div>
        </div>
        <style>{`
          .kd-slider-track { animation: kd-slide 34s linear infinite; }
          .kd-slider-track:hover { animation-play-state: paused; }
          @keyframes kd-slide { from { transform: translateX(0); } to { transform: translateX(calc(-50% - 0.5rem)); } }
          @media (prefers-reduced-motion: reduce) { .kd-slider-track { animation: none; } }
        `}</style>
      </section>

      {/* Nasıl Çalışıyoruz — gerçekten sıralı bir süreç olduğu için numaralandırma burada uygun */}
      <section className="relative overflow-hidden bg-gradient-to-br from-navy-700 via-navy-600 to-aqua-600 px-5 py-16 sm:py-20">
        <div className="pointer-events-none absolute -right-20 -top-24 h-80 w-80 rounded-full bg-aqua-400/30 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -left-16 h-80 w-80 rounded-full bg-aqua-300/30 blur-3xl" />
        <div className="relative mx-auto max-w-6xl">
          <h2 className="font-[family-name:var(--font-display)] text-3xl text-white">Nasıl çalışıyoruz</h2>
          <p className="mt-2 max-w-xl text-[15px] text-white/80">Üç adımda, her hafta ölçülebilir bir ilerleme.</p>
          <div className="mt-10 grid gap-5 sm:grid-cols-3">
            {STEPS.map((s) => (
              <div key={s.n} className="relative rounded-3xl bg-white p-6 shadow-[0_20px_40px_-20px_rgba(11,42,91,0.5)]">
                <div className="flex items-center justify-between">
                  <span className={`flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br text-white shadow-md ${s.badge}`}>
                    <s.icon size={24} />
                  </span>
                  <span className="font-[family-name:var(--font-display)] text-[44px] leading-none text-navy-100">{s.n}</span>
                </div>
                <div className="mt-4 font-[family-name:var(--font-display)] text-[18px] text-gray-900">{s.title}</div>
                <p className="mt-1.5 text-[13.5px] leading-relaxed text-gray-500">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Hizmetlerimiz önizleme */}
      <section className="px-5 py-16">
        <div className="mx-auto max-w-6xl">
          <div className="flex items-end justify-between">
            <h2 className="font-[family-name:var(--font-display)] text-2xl text-gray-900">Hizmetlerimiz</h2>
            <Link href="/hizmetlerimiz" className="flex items-center gap-1 text-[13px] font-medium text-navy-600 hover:underline">
              Tümünü gör <IconArrowRight size={14} />
            </Link>
          </div>
          <div className="mt-8 grid gap-6 sm:grid-cols-3">
            {[
              { icon: IconMessageCircle, title: 'Günlük Çalışma Takibi', desc: 'Günlük çalışmaların kaydı ve analizi.' },
              { icon: IconChartBar, title: 'Deneme Sonuç Analizi', desc: 'TYT, AYT, LGS sonuçları ders ders takip edilir.' },
              { icon: IconTarget, title: 'Haftalık Hedef Planlama', desc: 'Net hedefler, görsel ilerleme takibi.' },
            ].map((s) => (
              <div key={s.title} className="rounded-2xl border border-gray-200 bg-white p-6">
                <s.icon size={22} className="text-navy-600" />
                <div className="mt-3 font-[family-name:var(--font-display)] text-[16px] text-gray-900">{s.title}</div>
                <p className="mt-1.5 text-[13px] leading-relaxed text-gray-500">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Hakkımızda önizleme */}
      <section className="border-t border-gray-100 bg-gray-50 px-5 py-16">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="font-[family-name:var(--font-display)] text-2xl text-gray-900">Hakkımızda</h2>
          <p className="mt-4 text-[15px] leading-relaxed text-gray-600">
            KoçDefterim, öğrencilerin YKS ve LGS hazırlık sürecini düzenli, ölçülebilir ve
            şeffaf hale getirmek için kuruldu. Her öğrencinin kendine ait bir koçu, kendine
            özel bir takip sistemi var.
          </p>
          <Link href="/hakkimizda" className="mt-5 inline-flex items-center gap-1 text-[13px] font-medium text-navy-600 hover:underline">
            Devamını okuyun <IconArrowRight size={14} />
          </Link>
        </div>
      </section>

      {/* Kapanış CTA */}
      <section className="px-5 py-16">
        <div className="mx-auto max-w-6xl rounded-2xl bg-navy-600 px-8 py-12 text-center sm:px-16">
          <h2 className="font-[family-name:var(--font-display)] text-2xl text-white sm:text-3xl">
            Sürece bugün başlayın.
          </h2>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link href="/giris" className="rounded-full bg-white px-6 py-3 text-[14px] font-medium text-navy-700 transition hover:bg-navy-50">
              Koç Girişi
            </Link>
            <Link href="/giris/ogrenci" className="rounded-full border border-white/40 px-6 py-3 text-[14px] font-medium text-white transition hover:bg-white/10">
              Öğrenci Girişi
            </Link>
          </div>
        </div>
      </section>

      <MarketingFooter />
    </div>
  );
}
