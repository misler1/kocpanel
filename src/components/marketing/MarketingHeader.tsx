'use client';

import { useState } from 'react';
import Link from 'next/link';
import { IconChevronDown, IconMenu2, IconX } from '@tabler/icons-react';

const NAV_LINKS = [
  { href: '/', label: 'Anasayfa' },
  { href: '/hakkimizda', label: 'Hakkımızda' },
  { href: '/koclarimiz', label: 'Koçlarımız' },
  { href: '/hizmetlerimiz', label: 'Hizmetlerimiz' },
];

export function MarketingHeader() {
  const [girisOpen, setGirisOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-gray-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4">
        <Link href="/" className="font-[family-name:var(--font-display)] text-xl font-semibold text-gray-900">
          KoçDefterim
        </Link>

        <nav className="hidden items-center gap-8 md:flex">
          {NAV_LINKS.map((l) => (
            <Link key={l.href} href={l.href} className="text-[14px] text-gray-600 transition hover:text-gray-900">
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="hidden md:block">
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

        <button onClick={() => setMobileOpen((v) => !v)} className="md:hidden" aria-label="Menü">
          {mobileOpen ? <IconX size={22} /> : <IconMenu2 size={22} />}
        </button>
      </div>

      {mobileOpen && (
        <div className="border-t border-gray-200 bg-white px-5 py-4 md:hidden">
          <nav className="flex flex-col gap-3">
            {NAV_LINKS.map((l) => (
              <Link key={l.href} href={l.href} onClick={() => setMobileOpen(false)} className="text-[15px] text-gray-900">
                {l.label}
              </Link>
            ))}
            <div className="mt-2 flex gap-2">
              <Link href="/giris" className="flex-1 rounded-full border border-gray-300 py-2 text-center text-[14px] text-gray-700">
                Koç Girişi
              </Link>
              <Link href="/giris/ogrenci" className="flex-1 rounded-full bg-blue-600 py-2 text-center text-[14px] text-white">
                Öğrenci Girişi
              </Link>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}