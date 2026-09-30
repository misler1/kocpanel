import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { fraunces, inter } from '@/lib/fonts';
import { MarketingHeader } from '@/components/marketing/MarketingHeader';
import { MarketingFooter } from '@/components/marketing/MarketingFooter';
import { ReportCardVisual } from '@/components/marketing/ReportCardVisual';
import {
  IconMessageCircle, IconChartBar, IconTarget, IconArrowRight,
} from '@tabler/icons-react';

export default async function Home() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (user) {
    redirect('/anasayfa');
  }

  return (
    <div className={`${fraunces.variable} ${inter.variable} min-h-screen bg-white font-[family-name:var(--font-body)]`}>
      <MarketingHeader />

      {/* Hero */}
      <section className="mx-auto max-w-6xl px-5 pb-16 pt-16 sm:pt-24">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <div>
            <h1 className="font-[family-name:var(--font-display)] text-4xl leading-tight text-gray-900 sm:text-5xl">
              Öğrencinizin çalışma defteri, artık dijital.
            </h1>
            <p className="mt-5 max-w-md text-[16px] leading-relaxed text-gray-600">
              KoçDefterim; günlük çalışmaları, deneme sonuçlarını ve hedefleri tek yerde toplar.
              Koçlarımız her öğrenciyi yakından takip eder, siz de sürecin her adımını görürsünüz.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/giris" className="rounded-full bg-blue-600 px-6 py-3 text-[14px] font-medium text-white transition hover:bg-blue-700">
                Koç Girişi
              </Link>
              <Link href="/giris/ogrenci" className="rounded-full border border-gray-300 px-6 py-3 text-[14px] font-medium text-gray-700 transition hover:bg-gray-50">
                Öğrenci Girişi
              </Link>
            </div>
          </div>
          <ReportCardVisual />
        </div>
      </section>

      {/* Nasıl Çalışıyoruz — gerçekten sıralı bir süreç olduğu için numaralandırma burada uygun */}
      <section className="border-t border-gray-100 bg-gray-50 px-5 py-16">
        <div className="mx-auto max-w-6xl">
          <h2 className="font-[family-name:var(--font-display)] text-2xl text-gray-900">Nasıl çalışıyoruz</h2>
          <div className="mt-8 grid gap-8 sm:grid-cols-3">
            {[
              { n: '1', title: 'Tanışma ve hedef belirleme', desc: 'Öğrencinin seviyesi ve hedefleri birlikte değerlendirilir.' },
              { n: '2', title: 'Haftalık çalışma ve takip', desc: 'Günlük çalışmalar WhatsApp\'tan kaydedilir, hedefler izlenir.' },
              { n: '3', title: 'Deneme analizi ve yönlendirme', desc: 'Sonuçlar ders ders incelenir, sonraki adım netleşir.' },
            ].map((s) => (
              <div key={s.n}>
                <span className="text-[13px] font-medium text-blue-600">{s.n}</span>
                <div className="mt-2 font-[family-name:var(--font-display)] text-[16px] text-gray-900">{s.title}</div>
                <p className="mt-1.5 text-[13px] leading-relaxed text-gray-500">{s.desc}</p>
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
            <Link href="/hizmetlerimiz" className="flex items-center gap-1 text-[13px] font-medium text-blue-600 hover:underline">
              Tümünü gör <IconArrowRight size={14} />
            </Link>
          </div>
          <div className="mt-8 grid gap-6 sm:grid-cols-3">
            {[
              { icon: IconMessageCircle, title: 'Günlük Çalışma Takibi', desc: 'WhatsApp üzerinden otomatik kayıt ve analiz.' },
              { icon: IconChartBar, title: 'Deneme Sonuç Analizi', desc: 'TYT, AYT, LGS sonuçları ders ders takip edilir.' },
              { icon: IconTarget, title: 'Haftalık Hedef Planlama', desc: 'Net hedefler, görsel ilerleme takibi.' },
            ].map((s) => (
              <div key={s.title} className="rounded-2xl border border-gray-200 bg-white p-6">
                <s.icon size={22} className="text-blue-600" />
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
          <Link href="/hakkimizda" className="mt-5 inline-flex items-center gap-1 text-[13px] font-medium text-blue-600 hover:underline">
            Devamını okuyun <IconArrowRight size={14} />
          </Link>
        </div>
      </section>

      {/* Kapanış CTA */}
      <section className="px-5 py-16">
        <div className="mx-auto max-w-6xl rounded-2xl bg-blue-600 px-8 py-12 text-center sm:px-16">
          <h2 className="font-[family-name:var(--font-display)] text-2xl text-white sm:text-3xl">
            Sürece bugün başlayın.
          </h2>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link href="/giris" className="rounded-full bg-white px-6 py-3 text-[14px] font-medium text-blue-700 transition hover:bg-blue-50">
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