'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { IconChevronDown, IconDeviceMobileDown, IconMenu2, IconX } from '@tabler/icons-react';
import { ARTICLE_CATEGORIES } from '@/lib/marketing-content';
import { LANDING_PAGES } from '@/lib/landing-content';
import { createClient } from '@/lib/supabase/client';

const NAV_LINKS = [
  { href: '/', label: 'Anasayfa' },
  { href: '/hakkimizda', label: 'Hakkımızda' },
  { href: '/koclarimiz', label: 'Koçlarımız' },
  { href: '/hizmetlerimiz', label: 'Hizmetlerimiz' },
];

export function MarketingHeader() {
  const [girisOpen, setGirisOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  // Oturum açıksa "Giriş" yerine "Panelim" gösterilir. /giris, giriş yapmış kullanıcıyı rolüne göre
  // kendi paneline (koç, öğrenci, veli) yönlendirdiği için tek bağlantı herkes için doğru yere gider.
  const [loggedIn, setLoggedIn] = useState(false);
  useEffect(() => {
    createClient().auth.getSession().then(({ data }) => setLoggedIn(!!data.session));
  }, []);

  return (
    <header className="sticky top-0 z-50 border-b border-gray-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-[1440px] items-center gap-6 px-5 py-4">
        <Link href="/" className="flex flex-shrink-0 items-center">
          <Image src="/brand/kocdefterim-logo.png" alt="KoçDefterim" width={230} height={67} className="h-11 w-auto object-contain" priority />
        </Link>

        <nav className="ml-auto hidden items-center gap-4 whitespace-nowrap min-[1360px]:flex min-[1500px]:gap-5">
          <div
            className="relative"
            onMouseEnter={() => setActiveMenu('koc-defterim')}
            onMouseLeave={() => setActiveMenu((current) => (current === 'koc-defterim' ? null : current))}
          >
            <Link href="/koc-defterim" className="flex items-center gap-1 text-[14px] font-medium text-gray-700 transition hover:text-gray-950">
              Koç Defterim
              <IconChevronDown size={14} className={`transition-transform ${activeMenu === 'koc-defterim' ? 'rotate-180' : ''}`} />
            </Link>
            {activeMenu === 'koc-defterim' && (
              <div className="absolute left-0 top-full w-64 pt-3">
                <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white py-2 shadow-xl">
                  {LANDING_PAGES.map((page) => (
                    <Link
                      key={page.slug}
                      href={`/${page.slug}`}
                      className="block px-4 py-2.5 text-[13px] leading-snug text-gray-700 hover:bg-[#FBF9F4] hover:text-[#C1442A]"
                    >
                      {page.navLabel}
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
          {ARTICLE_CATEGORIES.map((category) => (
            <div
              key={category.slug}
              className="relative"
              onMouseEnter={() => setActiveMenu(category.slug)}
              onMouseLeave={() => setActiveMenu((current) => (current === category.slug ? null : current))}
            >
              <Link
                href={`/${category.slug}`}
                className="flex items-center gap-1 text-[14px] font-medium text-gray-700 transition hover:text-gray-950"
              >
                {category.shortLabel}
                <IconChevronDown size={14} className={`transition-transform ${activeMenu === category.slug ? 'rotate-180' : ''}`} />
              </Link>
              {activeMenu === category.slug && (
                <div className="absolute left-0 top-full w-80 pt-3">
                  <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-xl">
                    <div className="border-b border-gray-100 px-4 py-3">
                      <Link href={`/${category.slug}`} className="font-[family-name:var(--font-display)] text-[17px] text-[#1D2B3A] hover:text-[#C1442A]">
                        {category.label}
                      </Link>
                      <p className="mt-1 text-[12px] leading-relaxed text-gray-500">{category.description}</p>
                    </div>
                    <div className="max-h-[70vh] overflow-y-auto py-2">
                      {category.articles.map((article) => (
                        <Link
                          key={article.slug}
                          href={`/${category.slug}/${article.slug}`}
                          className="block px-4 py-2.5 text-[13px] leading-snug text-gray-700 hover:bg-[#FBF9F4] hover:text-[#C1442A]"
                        >
                          {article.title}
                        </Link>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
          <Link href="/diger-sinavlar" className="text-[14px] font-medium text-gray-700 transition hover:text-gray-950">
            Diğer Sınavlar
          </Link>
          <span className="h-5 w-px bg-gray-200" />
          {NAV_LINKS.filter((l) => l.href !== '/').map((l) => (
            <Link key={l.href} href={l.href} className="text-[14px] text-gray-600 transition hover:text-gray-900">
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="hidden flex-shrink-0 items-center gap-2 min-[1360px]:flex">
          {/* Giriş düğmesiyle aynı boy: kenarlık dahil yükseklik eşit olsun diye dikey boşluk 1px az */}
          <Link href="/uygulama" className="flex items-center gap-1.5 whitespace-nowrap rounded-full border border-gray-300 px-5 py-[7px] text-[14px] font-medium text-gray-700 transition hover:border-gray-400 hover:text-gray-950">
            <IconDeviceMobileDown size={16} /> Uygulamayı İndir
          </Link>
          {loggedIn ? (
            <Link href="/giris" className="rounded-full bg-navy-600 px-5 py-2 text-[14px] font-medium text-white transition hover:bg-navy-700">
              Panelim
            </Link>
          ) : (
          <div className="relative">
            <button
              onClick={() => setGirisOpen((v) => !v)}
              onBlur={() => setTimeout(() => setGirisOpen(false), 150)}
              className="flex items-center gap-1.5 rounded-full bg-navy-600 px-5 py-2 text-[14px] font-medium text-white transition hover:bg-navy-700"
            >
              Giriş
              <IconChevronDown size={15} className={`transition-transform ${girisOpen ? 'rotate-180' : ''}`} />
            </button>
            {girisOpen && (
              <div className="absolute right-0 mt-2 w-52 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-lg">
                <Link href="/giris" className="block px-4 py-3 text-[14px] text-gray-700 hover:bg-gray-50">
                  Koç Girişi
                </Link>
                <Link href="/giris/ogrenci" className="block border-t border-gray-100 px-4 py-3 text-[14px] text-gray-700 hover:bg-gray-50">
                  Öğrenci Girişi
                </Link>
              </div>
            )}
          </div>
          )}
        </div>

        <div className="ml-auto flex items-center gap-3 min-[1360px]:hidden">
          <Link href="/uygulama" className="flex items-center gap-1 rounded-full bg-navy-600 px-3 py-1.5 text-[13px] font-medium text-white">
            <IconDeviceMobileDown size={15} /> İndir
          </Link>
        <button onClick={() => setMobileOpen((v) => !v)} aria-label="Menü">
          {mobileOpen ? <IconX size={22} /> : <IconMenu2 size={22} />}
        </button>
        </div>
      </div>

      {mobileOpen && (
        <div className="max-h-[calc(100vh-76px)] overflow-y-auto border-t border-gray-200 bg-white px-5 py-4 min-[1360px]:hidden">
          <nav className="flex flex-col gap-5">
            <div>
              <Link href="/koc-defterim" onClick={() => setMobileOpen(false)} className="text-[15px] font-semibold text-gray-950">
                Koç Defterim
              </Link>
              <div className="mt-2 flex flex-col gap-2 border-l border-gray-200 pl-3">
                {LANDING_PAGES.map((page) => (
                  <Link key={page.slug} href={`/${page.slug}`} onClick={() => setMobileOpen(false)} className="text-[13px] leading-snug text-gray-600">
                    {page.navLabel}
                  </Link>
                ))}
              </div>
            </div>
            {ARTICLE_CATEGORIES.map((category) => (
              <div key={category.slug}>
                <Link href={`/${category.slug}`} onClick={() => setMobileOpen(false)} className="text-[15px] font-semibold text-gray-950">
                  {category.label}
                </Link>
                <div className="mt-2 flex flex-col gap-2 border-l border-gray-200 pl-3">
                  {category.articles.map((article) => (
                    <Link
                      key={article.slug}
                      href={`/${category.slug}/${article.slug}`}
                      onClick={() => setMobileOpen(false)}
                      className="text-[13px] leading-snug text-gray-600"
                    >
                      {article.title}
                    </Link>
                  ))}
                </div>
              </div>
            ))}
            <Link href="/diger-sinavlar" onClick={() => setMobileOpen(false)} className="text-[15px] font-semibold text-gray-950">
              Diğer Sınavlar
            </Link>
            <div className="border-t border-gray-100 pt-4">
              <div className="flex flex-col gap-3">
                {NAV_LINKS.map((l) => (
                  <Link key={l.href} href={l.href} onClick={() => setMobileOpen(false)} className="text-[15px] text-gray-900">
                    {l.label}
                  </Link>
                ))}
              </div>
              {loggedIn ? (
                <Link href="/giris" className="mt-4 block rounded-full bg-navy-600 py-2 text-center text-[14px] text-white">
                  Panelim
                </Link>
              ) : (
              <div className="mt-4 flex gap-2">
                <Link href="/giris" className="flex-1 rounded-full border border-gray-300 py-2 text-center text-[14px] text-gray-700">
                  Koç Girişi
                </Link>
                <Link href="/giris/ogrenci" className="flex-1 rounded-full bg-navy-600 py-2 text-center text-[14px] text-white">
                  Öğrenci Girişi
                </Link>
              </div>
              )}
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
