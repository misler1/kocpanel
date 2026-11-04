import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import {
  IconArrowUpRight, IconCalendarCheck, IconChartLine, IconMessageCircle, IconDeviceMobile, IconUsersGroup, IconSparkles,
} from '@tabler/icons-react';

export const metadata: Metadata = {
  title: 'Koçlarımız | KoçDefterim',
  description: 'KoçDefterim eğitim koçlarını tanıyın. LGS, YKS ve akademik takip alanlarında çalışan koçlarımızın eğitimlerini ve deneyimlerini inceleyin.',
  alternates: { canonical: '/koclarimiz' },
};

const COACHES = [
  {
    href: '/koclarimiz/musa-isler',
    name: 'Musa İşler',
    photo: '/images/musa-isler.png',
    role: 'Psikolojik Danışman · Eğitim Koçu',
    desc: 'LGS, YKS ve akademik takip süreçlerinde öğrenciye özel planlama ve rehberlik.',
    tags: [
      { label: 'YKS', cls: 'bg-navy-50 text-navy-700' },
      { label: 'LGS', cls: 'bg-aqua-50 text-aqua-700' },
      { label: 'Akademik takip', cls: 'bg-emerald-50 text-emerald-700' },
      { label: 'Sınav kaygısı', cls: 'bg-amber-50 text-amber-700' },
    ],
  },
];

// Koçla çalışırken öğrencinin ve velinin eline geçenler
const WITH_COACH = [
  { icon: IconCalendarCheck, title: 'Haftalık program', text: 'Okul ve ev düzenine uygun, saatleriyle hazırlanmış plan.', badge: 'from-navy-500 to-navy-700' },
  { icon: IconChartLine, title: 'Deneme analizi', text: 'Her denemeden sonra ders ders yorum ve yeni haftanın hedefi.', badge: 'from-aqua-400 to-aqua-600' },
  { icon: IconMessageCircle, title: 'Düzenli görüşme', text: 'Kararların kaybolmadığı, kayıt altına alınan birebir görüşmeler.', badge: 'from-navy-600 to-aqua-500' },
  { icon: IconUsersGroup, title: 'Veli bilgilendirme', text: 'Velinin süreci tahmin etmeden, somut verilerle görmesi.', badge: 'from-amber-400 to-orange-500' },
];

export default function KoclarimizPage() {
  return (
    <main>
      {/* Başlık bandı */}
      <section className="relative overflow-hidden bg-gradient-to-br from-navy-700 via-navy-600 to-aqua-600">
        <div className="pointer-events-none absolute -right-20 -top-24 h-80 w-80 rounded-full bg-aqua-400/30 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 -left-16 h-80 w-80 rounded-full bg-aqua-300/30 blur-3xl" />
        <div className="relative mx-auto max-w-6xl px-5 pb-28 pt-14 sm:pt-20">
          <span className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3.5 py-1.5 text-[12.5px] font-medium text-white ring-1 ring-white/25">
            <IconSparkles size={15} /> KoçDefterim
          </span>
          <h1 className="mt-4 font-[family-name:var(--font-display)] text-4xl leading-tight text-white sm:text-5xl">Koçlarımız</h1>
          <p className="mt-3 max-w-xl text-[16px] leading-relaxed text-white/85">
            Sınava hazırlık sürecinde size eşlik edecek eğitim koçlarımızı tanıyın.
          </p>
        </div>
      </section>

      {/* Koç kartları: başlık bandının üstüne taşar */}
      <section className="relative mx-auto -mt-20 max-w-6xl px-5">
        <div className="grid gap-6 lg:grid-cols-2">
          {COACHES.map((c) => (
            <Link
              key={c.href}
              href={c.href}
              className="group flex flex-col gap-5 overflow-hidden rounded-3xl bg-white p-5 shadow-[0_24px_50px_-24px_rgba(11,42,91,0.45)] ring-1 ring-gray-100 transition-transform hover:-translate-y-1 sm:flex-row sm:items-center"
            >
              <div className="relative flex-shrink-0">
                <div className="absolute -inset-1.5 rounded-[22px] bg-gradient-to-br from-navy-600 via-navy-500 to-aqua-500" />
                <Image src={c.photo} alt={c.name} width={300} height={300} unoptimized
                  className="relative h-36 w-36 rounded-2xl bg-gray-900 object-contain" />
              </div>
              <div className="min-w-0">
                <h2 className="font-[family-name:var(--font-display)] text-[26px] text-gray-900">{c.name}</h2>
                <p className="mt-1 text-[13.5px] font-semibold text-navy-600">{c.role}</p>
                <p className="mt-2 text-[14px] leading-relaxed text-gray-600">{c.desc}</p>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {c.tags.map((t) => (
                    <span key={t.label} className={`rounded-full px-2.5 py-1 text-[12px] font-semibold ${t.cls}`}>{t.label}</span>
                  ))}
                </div>
                <span className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-navy-700 to-aqua-600 px-4 py-2 text-[13px] font-semibold text-white shadow-sm transition-transform group-hover:translate-x-0.5">
                  Profili incele <IconArrowUpRight size={16} aria-hidden="true" />
                </span>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Koçla çalışınca */}
      <section className="mx-auto max-w-6xl px-5 py-16">
        <h2 className="font-[family-name:var(--font-display)] text-3xl text-gray-900">Koçunuzla çalışırken</h2>
        <p className="mt-2 max-w-xl text-[15px] text-gray-600">Her öğrenci kendi koçuyla, kendine özel bir takip düzeninde ilerler.</p>
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {WITH_COACH.map((f) => (
            <div key={f.title} className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-gray-100">
              <span className={`flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br text-white shadow-md ${f.badge}`}>
                <f.icon size={24} />
              </span>
              <h3 className="mt-4 font-[family-name:var(--font-display)] text-[18px] text-gray-900">{f.title}</h3>
              <p className="mt-1.5 text-[13.5px] leading-relaxed text-gray-500">{f.text}</p>
            </div>
          ))}
        </div>

        <div className="mt-10 flex flex-col items-start gap-4 rounded-3xl bg-gradient-to-r from-navy-50 via-aqua-50 to-aqua-50 p-6 ring-1 ring-aqua-100 sm:flex-row sm:items-center sm:justify-between sm:p-8">
          <div>
            <h3 className="font-[family-name:var(--font-display)] text-[22px] text-gray-900">Süreci telefonunuzdan takip edin</h3>
            <p className="mt-1 text-[14px] text-gray-600">Program, görevler ve koç mesajları uygulamada; hatırlatmalar bildirim olarak gelir.</p>
          </div>
          <Link href="/uygulama" className="inline-flex flex-shrink-0 items-center gap-2 rounded-full bg-gradient-to-r from-navy-700 to-aqua-600 px-5 py-3 text-[14px] font-semibold text-white shadow-md transition-opacity hover:opacity-90">
            <IconDeviceMobile size={18} /> Uygulamayı indir
          </Link>
        </div>
      </section>
    </main>
  );
}
