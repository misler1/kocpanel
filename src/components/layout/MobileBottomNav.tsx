'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { MOBILE_NAV } from '@/lib/navigation';

export function MobileBottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-20 flex border-t border-[var(--border)] bg-[var(--card)] pb-[env(safe-area-inset-bottom)] md:hidden">
      {MOBILE_NAV.map((item) => {
        const Icon = item.icon;
        const active = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex flex-1 flex-col items-center gap-1 py-2 text-[10px] font-medium transition-colors ${
              active ? 'text-[var(--accent-dark)]' : 'text-[var(--ink-muted)]'
            }`}
          >
            <span
              className={`flex h-7 w-9 items-center justify-center rounded-full transition-colors ${
                active ? 'bg-[var(--accent-soft)]' : ''
              }`}
            >
              <Icon size={20} />
            </span>
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}