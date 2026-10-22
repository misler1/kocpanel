'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { IconUser, IconChartBar, IconBooks, IconCalendar, IconLogout } from '@tabler/icons-react';
import { createClient } from '@/lib/supabase/client';

const ITEMS = [
  { href: '/ogrenci', label: 'Bilgilerim', icon: IconUser },
  { href: '/ogrenci/haftalik-takip', label: 'Haftalık', icon: IconCalendar },
  { href: '/ogrenci/denemeler', label: 'Denemeler', icon: IconChartBar },
  { href: '/ogrenci/konu-ilerleyisi', label: 'Konular', icon: IconBooks },
];

export function StudentNav() {
  const pathname = usePathname();
  const router = useRouter();

  async function logout() {
    await createClient().auth.signOut();
    router.push('/giris/ogrenci');
    router.refresh();
  }

  return (
    <>
      <header className="sticky top-0 z-20 flex items-center gap-2 border-b border-gray-200 bg-white px-4 py-2.5">
        <span className="text-[15px] font-semibold text-gray-900">KoçDefterim</span>
        <nav className="ml-4 hidden gap-1 md:flex">
          {ITEMS.map((it) => (
            <Link key={it.href} href={it.href}
              className={`rounded-lg px-3 py-1.5 text-[13px] ${pathname === it.href ? 'bg-blue-50 font-medium text-blue-700' : 'text-gray-600 hover:bg-gray-50'}`}>
              {it.label}
            </Link>
          ))}
        </nav>
        <button onClick={logout} className="ml-auto flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[13px] text-gray-500 hover:bg-gray-50">
          <IconLogout size={15} /> Çıkış
        </button>
      </header>

      <nav className="fixed inset-x-0 bottom-0 z-20 flex border-t border-gray-200 bg-white pb-[env(safe-area-inset-bottom)] md:hidden">
        {ITEMS.map((it) => {
          const Icon = it.icon;
          const active = pathname === it.href;
          return (
            <Link key={it.href} href={it.href}
              className={`flex flex-1 flex-col items-center gap-1 py-2 text-[10px] font-medium ${active ? 'text-blue-700' : 'text-gray-500'}`}>
              <Icon size={20} />
              {it.label}
            </Link>
          );
        })}
      </nav>
    </>
  );
}
