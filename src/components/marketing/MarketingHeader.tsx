'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { IconChevronDown, IconMenu2, IconX } from '@tabler/icons-react';
import { ARTICLE_CATEGORIES } from '@/lib/marketing-content';

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

  return (
    <header className="sticky top-0 z-50 border-b border-gray-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4">
        <Link href="/" className="flex items-center">
          <Image src="/brand/kocdefterim-logo.png" alt="KoçDefterim" width={230} height={67} className="h-11 w-auto object-contain" priority />
        </Link>

        <nav className="hidden items-center gap-5 lg:flex">
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
          {NAV_LINKS.map((l) => (
            <Link key={l.href} href={l.href} className="text-[14px] text-gray-600 transition hover:text-gray-900">
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="hidden lg:block">
          <div className="relative">
            <button
              onClick={() => setGirisOpen((v) => !v)}
              onBlur={() => setTimeout(() => setGirisOpen(false), 150)}
              className="flex items-center gap-1.5 rounded-full bg-blue-600 px-5 py-2 text-[14px] font-medium text-white transition hover:bg-blue-700"
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
        </div>

        <button onClick={() => setMobileOpen((v) => !v)} className="lg:hidden" aria-label="Menü">
          {mobileOpen ? <IconX size={22} /> : <IconMenu2 size={22} />}
        </button>
      </div>

      {mobileOpen && (
        <div className="max-h-[calc(100vh-76px)] overflow-y-auto border-t border-gray-200 bg-white px-5 py-4 lg:hidden">
          <nav className="flex flex-col gap-5">
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
              <div className="mt-4 flex gap-2">
                <Link href="/giris" className="flex-1 rounded-full border border-gray-300 py-2 text-center text-[14px] text-gray-700">
                  Koç Girişi
                </Link>
                <Link href="/giris/ogrenci" className="flex-1 rounded-full bg-blue-600 py-2 text-center text-[14px] text-white">
                  Öğrenci Girişi
                </Link>
              </div>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
