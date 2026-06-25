'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { MOBILE_NAV } from '@/lib/navigation';

export function MobileBottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-20 flex border-t border-gray-200 bg-white pb-[env(safe-area-inset-bottom)] md:hidden">
      {MOBILE_NAV.map((item) => {
        const Icon = item.icon;
        const active = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex flex-1 flex-col items-center gap-0.5 py-2 text-[10px] ${
              active ? 'text-blue-600' : 'text-gray-400'
            }`}
          >
            <Icon size={22} />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
