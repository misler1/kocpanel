'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { STUDENT_NAV } from './StudentNavItems';
import { useUnreadConversations } from '@/lib/use-unread-conversations';

export function StudentMobileNav() {
  const pathname = usePathname();
  const unread = useUnreadConversations();
  const isActive = (href: string) => (href === '/ogrenci' ? pathname === href : pathname.startsWith(href));

  return (
    <nav className="fixed inset-x-3 bottom-3 z-20 flex rounded-3xl border border-[var(--border)] bg-white/95 px-1 py-1.5 shadow-[0_8px_30px_rgba(109,63,224,0.18)] backdrop-blur mb-[env(safe-area-inset-bottom)] md:hidden">
      {STUDENT_NAV.map((item) => {
        const Icon = item.icon;
        const active = isActive(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex min-w-0 flex-1 flex-col items-center gap-0.5 py-1 text-[10.5px] font-bold transition-colors ${
              active ? 'text-[var(--ink)]' : 'text-[var(--ink-muted)]'
            }`}
          >
            <span className={`relative flex h-9 w-10 items-center justify-center rounded-2xl transition-all max-[360px]:w-9 ${active ? `${item.chip} -translate-y-0.5 text-white shadow-md` : ''}`}>
              <Icon size={21} strokeWidth={2.2} />
              {item.href === '/ogrenci/mesajlar' && unread > 0 && (
                <span className="absolute -right-1.5 -top-1.5 min-w-[18px] rounded-full bg-rose-500 px-1 py-0.5 text-center text-[10px] font-bold leading-none text-white ring-2 ring-white/95" aria-label={`${unread} okunmamış sohbet`}>
                  {unread > 99 ? '99+' : unread}
                </span>
              )}
            </span>
            <span className="w-full truncate text-center">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
