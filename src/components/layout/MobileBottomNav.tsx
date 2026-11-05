'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { IconMenu2, IconX } from '@tabler/icons-react';
import { MOBILE_NAV } from '@/lib/navigation';
import { SidebarContent, SIDEBAR_BG } from './Sidebar';
import { useUnreadConversations } from '@/lib/use-unread-conversations';

/** Telefonda alt menü: sık kullanılan sayfalar + bütün menüyü (sayfalar, filtreler) açan "Menü" düğmesi. */
export function MobileBottomNav({ studentCount }: { studentCount?: number }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const unread = useUnreadConversations();

  // Menü açıkken arkadaki sayfa kaymasın
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [open]);

  const itemCls = (active: boolean) =>
    `flex min-w-0 flex-1 flex-col items-center gap-1 py-2 text-[10.5px] font-medium transition-colors ${
      active ? 'text-[var(--accent-dark)]' : 'text-[var(--ink-muted)]'
    }`;
  const chipCls = (active: boolean) =>
    `flex h-7 w-10 items-center justify-center rounded-full transition-colors ${active ? 'bg-[var(--accent-soft)]' : ''}`;
  const inMainNav = MOBILE_NAV.some((i) => i.href === pathname);

  return (
    <>
      <nav className="fixed inset-x-0 bottom-0 z-30 flex border-t border-[var(--border)] bg-[var(--card)] pb-[env(safe-area-inset-bottom)] md:hidden">
        {MOBILE_NAV.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href;
          return (
            <Link key={item.href} href={item.href} className={itemCls(active)}>
              <span className={chipCls(active)}><Icon size={20} /></span>
              <span className="w-full truncate text-center">{item.label}</span>
            </Link>
          );
        })}
        <button type="button" onClick={() => setOpen(true)} className={itemCls(open || !inMainNav)} aria-label="Bütün menü">
          <span className={`relative ${chipCls(open || !inMainNav)}`}>
            <IconMenu2 size={20} />
            {/* Mesajlar alt menüde yok: okunmamış sohbet sayısı Menü düğmesinde görünür */}
            {unread > 0 && (
              <span className="absolute -right-0.5 -top-1 min-w-[18px] rounded-full bg-rose-500 px-1 py-0.5 text-center text-[10px] font-bold leading-none text-white ring-2 ring-[var(--card)]">
                {unread > 99 ? '99+' : unread}
              </span>
            )}
          </span>
          <span className="w-full truncate text-center">Menü</span>
        </button>
      </nav>

      {open && (
        <div className="fixed inset-0 z-50 md:hidden" role="dialog" aria-modal="true">
          <button type="button" aria-label="Menüyü kapat" onClick={() => setOpen(false)} className="absolute inset-0 bg-black/50" />
          <div className={`absolute inset-y-0 left-0 flex w-[82%] max-w-[300px] flex-col overflow-y-auto px-3 pb-[calc(env(safe-area-inset-bottom)+1.25rem)] pt-5 shadow-2xl ${SIDEBAR_BG}`}>
            <button type="button" onClick={() => setOpen(false)} aria-label="Kapat"
              className="absolute right-3 top-5 rounded-lg p-1.5 text-white/70 hover:bg-white/10 hover:text-white">
              <IconX size={20} />
            </button>
            <SidebarContent studentCount={studentCount} onNavigate={() => setOpen(false)} />
          </div>
        </div>
      )}
    </>
  );
}
