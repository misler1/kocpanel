import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { IconArrowRight } from '@tabler/icons-react';
import { fraunces, inter } from '@/lib/fonts';
import { SITE_URL } from '@/lib/site';
import { LANDING_PAGES, getLandingPage } from '@/lib/landing-content';
import { MarketingHeader } from './MarketingHeader';
import { MarketingFooter } from './MarketingFooter';

// Sayfaya göre önerilen rehber yazılar (iç bağlantı: arama motoru için konu bütünlüğü, okuyucu için devam yolu)
const RELATED_ARTICLES: Record<string, { href: string; label: string }[]> = {
  'koc-defterim': [
    { href: '/yks/netlerim-neden-artmiyor', label: 'Netlerim Neden Artmıyor?' },
    { href: '/lgs/lgsde-stres-oluyorum-sinav-korkusu', label: 'LGS’de Stres Oluyorum: Sınav Korkusu' },
  ],
  'yks-kocu': [
    { href: '/yks/tyt-mi-ayt-mi-oncelikli', label: 'TYT mi AYT mi Öncelikli?' },
    { href: '/yks/netlerim-neden-artmiyor', label: 'Netlerim Neden Artmıyor?' },
    { href: '/yks/yksde-zaman-yetmiyor-ne-yapmaliyim', label: 'YKS’de Zaman Yetmiyor: Ne Yapmalıyım?' },
  ],
  'lgs-kocu': [
    { href: '/lgs/lgs-matematik-fen-turkce-nasil-calisilir', label: 'LGS Türkçe, Matematik ve Fen Nasıl Çalışılır?' },
    { href: '/lgs/lgsde-stres-oluyorum-sinav-korkusu', label: 'LGS’de Stres Oluyorum: Sınav Korkusu' },
    { href: '/lgs/yuzdelik-dilim-nedir-lise-tercihi-nasil-yapilir', label: 'Yüzdelik Dilim Nedir, Lise Tercihi Nasıl Yapılır?' },
  ],
  'egitim-kocu': [
    { href: '/lgs/ders-calismak-istemiyorum-motivasyonum-dustu', label: 'Ders Çalışmak İstemiyorum, Motivasyonum Düştü' },
    { href: '/yks/netlerim-neden-artmiyor', label: 'Netlerim Neden Artmıyor?' },
  ],
  'ders-takibi': [
    { href: '/lgs/lgs-ogrencisi-gunluk-kac-saat-calismali', label: 'LGS Öğrencisi Günde Kaç Saat Çalışmalı?' },
    { href: '/dil-sinav-koclugu/ydtde-gunluk-kac-soru-cozulmeli', label: 'YDT’de Günlük Kaç Soru Çözülmeli?' },
  ],
};

export function landingMetadata(slug: string): Metadata {
  const page = getLandingPage(slug);
  if (!page) return {};
  return {
    title: page.metaTitle,
    description: page.description,
    keywords: page.keywords,
    alternates: { canonical: `/${page.slug}` },
    openGraph: { title: page.metaTitle, description: page.description, url: `/${page.slug}`, type: 'website', locale: 'tr_TR' },
  };
}

export function SeoLandingPage({ slug }: { slug: string }) {
  const page = getLandingPage(slug);
  if (!page) notFound();

  const url = `${SITE_URL}/${page.slug}`;
  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebPage',
        '@id': `${url}#webpage`,
        url,
        name: page.metaTitle,
        description: page.description,
        inLanguage: 'tr-TR',
        isPartOf: { '@id': `${SITE_URL}/#website` },
        about: { '@id': `${SITE_URL}/#organization` },
      },
      {
        '@type': 'Service',
        name: page.eyebrow,
        serviceType: page.eyebrow,
        description: page.description,
        provider: { '@id': `${SITE_URL}/#organization` },
        areaServed: [{ '@type': 'City', name: 'İstanbul' }, { '@type': 'Country', name: 'Türkiye' }],
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Anasayfa', item: SITE_URL },
          { '@type': 'ListItem', position: 2, name: page.navLabel, item: url },
        ],
      },
      {
        '@type': 'FAQPage',
        mainEntity: page.faq.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
      },
    ],
  };

  const others = LANDING_PAGES.filter((p) => p.slug !== page.slug);
  const related = RELATED_ARTICLES[page.slug] ?? [];

  return (
    <div className={[fraunces.variable, inter.variable, 'min-h-screen bg-[#FBF9F4] font-[family-name:var(--font-body)]'].join(' ')}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <MarketingHeader />
      <main>
        <section className="mx-auto max-w-4xl px-5 pb-10 pt-20">
          <p className="text-[13px] font-semibold uppercase tracking-wide text-[#C1442A]">{page.eyebrow}</p>
          <h1 className="mt-3 font-[family-name:var(--font-display)] text-4xl leading-tight text-[#1D2B3A] md:text-5xl">{page.h1}</h1>
          <div className="mt-6 space-y-4 text-[16px] leading-relaxed text-[#6B6558]">
            {page.intro.map((p) => <p key={p}>{p}</p>)}
          </div>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/kayit/ogrenci" className="rounded-full bg-[#C1442A] px-6 py-3 text-[14px] font-medium text-white transition hover:bg-[#A63A23]">
              Ön kayıt formu
            </Link>
            <Link href="/koclarimiz/musa-isler" className="rounded-full border border-[#D9D2C2] bg-white px-6 py-3 text-[14px] font-medium text-[#1D2B3A] transition hover:bg-[#F3EFE6]">
              Koçla tanış
            </Link>
          </div>
        </section>

        <div className="mx-auto max-w-4xl space-y-5 px-5 pb-14">
          {page.sections.map((section) => (
            <section key={section.title} className="rounded-2xl border border-[#D9D2C2] bg-white p-6">
              <h2 className="font-[family-name:var(--font-display)] text-2xl text-[#1D2B3A]">{section.title}</h2>
              <div className="mt-3 space-y-3 text-[15px] leading-relaxed text-[#4A4538]">
                {section.body.map((p) => <p key={p}>{p}</p>)}
              </div>
            </section>
          ))}
        </div>

        <section className="border-y border-[#D9D2C2] bg-white/70">
          <div className="mx-auto max-w-4xl px-5 py-12">
            <h2 className="font-[family-name:var(--font-display)] text-3xl text-[#1D2B3A]">Sık sorulan sorular</h2>
            <div className="mt-6 space-y-4">
              {page.faq.map((item) => (
                <article key={item.q} className="rounded-2xl border border-[#D9D2C2] bg-white p-5">
                  <h3 className="font-semibold text-[#1D2B3A]">{item.q}</h3>
                  <p className="mt-2 text-[14px] leading-relaxed text-[#6B6558]">{item.a}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto grid max-w-4xl gap-8 px-5 py-12 md:grid-cols-2">
          {related.length > 0 && (
            <div>
              <h2 className="font-[family-name:var(--font-display)] text-xl text-[#1D2B3A]">İlgili rehber yazılar</h2>
              <ul className="mt-3 space-y-2">
                {related.map((r) => (
                  <li key={r.href}>
                    <Link href={r.href} className="inline-flex items-center gap-1 text-[14px] text-[#C1442A] hover:underline">
                      {r.label} <IconArrowRight size={14} />
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
          <div>
            <h2 className="font-[family-name:var(--font-display)] text-xl text-[#1D2B3A]">Koç Defterim’de diğer sayfalar</h2>
            <ul className="mt-3 space-y-2">
              {others.map((p) => (
                <li key={p.slug}>
                  <Link href={`/${p.slug}`} className="inline-flex items-center gap-1 text-[14px] text-[#C1442A] hover:underline">
                    {p.navLabel} <IconArrowRight size={14} />
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="bg-[#1D2B3A] text-white">
          <div className="mx-auto max-w-4xl px-5 py-12 text-center">
            <h2 className="font-[family-name:var(--font-display)] text-3xl">Bir tanışma görüşmesiyle başlayalım.</h2>
            <p className="mx-auto mt-3 max-w-xl text-[15px] leading-relaxed text-white/75">
              Ön kayıt formunu doldurduğunda seninle iletişime geçiyoruz. Ümraniye’de yüz yüze ya da Türkiye’nin her yerinden online.
            </p>
            <Link href="/kayit/ogrenci" className="mt-6 inline-block rounded-full bg-white px-6 py-3 text-[14px] font-medium text-[#1D2B3A] transition hover:bg-[#F3EFE6]">
              Ön kayıt formu
            </Link>
          </div>
        </section>
      </main>
      <MarketingFooter />
    </div>
  );
}
