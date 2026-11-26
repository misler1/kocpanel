'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { IconExternalLink } from '@tabler/icons-react';
import { MAIN_NAV, TAKIP_NAV, BAGLANTI_NAV, YONETIM_NAV, HESAP_NAV } from '@/lib/navigation';
import { ExamFilterBar } from './ExamFilterBar';
import { useExamFilter } from '@/lib/exam-filter-context';
import { useUnreadConversations } from '@/lib/use-unread-conversations';
import { navAllowed } from '@/lib/staff-access';
import { useStaffKind } from '@/lib/use-staff-kind';

// Sol menünün zemini (sade beyaz, ince kenarlık); telefondaki açılır menü de aynı zemini kullanır
export const SIDEBAR_BG = 'bg-[var(--card)] md:border-r md:border-[var(--border)]';

/** Menünün içeriği: logo, filtreler, bütün sayfalar ve web sitesi bağlantısı.
 *  Masaüstünde sol menüde, telefonda alttaki "Menü" düğmesiyle açılan pencerede kullanılır. */
export function SidebarContent({ studentCount, onNavigate }: { studentCount?: number; onNavigate?: () => void }) {
  const pathname = usePathname();
  const [isAdmin, setIsAdmin] = useState(false);
  const [hasTeam, setHasTeam] = useState(false);
  const staffKind = useStaffKind();

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return;
      const { data: profile } = await supabase
        .from('profiles')
        .select('is_admin')
        .eq('id', user.id)
        .single();
      setIsAdmin(!!profile?.is_admin);
      // Kendisine bağlı stajyer koç / yurt personeli var mı? (Ekip kayıtları menüsü için)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { count } = await (supabase as any).from('teacher_access_profiles')
        .select('teacher_id', { count: 'exact', head: true }).eq('mentor_id', user.id).neq('status', 'coach');
      setHasTeam((count ?? 0) > 0);
    });
  }, []);
  const { filteredStudentCount } = useExamFilter();
  const unread = useUnreadConversations();
  const isActive = (href: string) => pathname === href;

  const groups = [
    { items: MAIN_NAV },
    { items: TAKIP_NAV },
    { items: BAGLANTI_NAV },
    ...(isAdmin ? [{ items: YONETIM_NAV }] : []),
    { items: HESAP_NAV },
  ].map((g) => {
    const items = g.items.filter((i) => navAllowed(staffKind, i.href) && (i.href !== '/ekip-kayitlari' || isAdmin || hasTeam));
    // Bölüm başlığı ilk öğede durur; ilk öğe gizlendiyse başlık bir sonrakine geçer
    if (items.length && !items[0].section && g.items[0]?.section) items[0] = { ...items[0], section: g.items[0].section };
    return { items };
  }).filter((g) => g.items.length > 0);

  return (
    <>
      <Link href="/anasayfa" onClick={onNavigate} className="mb-4 flex items-center gap-2.5 border-b border-[var(--border)] px-2 pb-5" aria-label="KoçDefterim anasayfa">
        <Image src="/brand/kocdefterim-mark.png" alt="KoçDefterim" width={38} height={38} className="h-9 w-9 flex-shrink-0 object-contain" priority />
        <span className="text-[16px] font-bold tracking-tight text-[var(--ink)]">
          KoçDefterim
        </span>
      </Link>

      <ExamFilterBar />

      <nav className="mt-3 flex flex-col">
        {groups.map((group, gi) => (
          <div key={gi} className={gi > 0 ? 'mt-3' : ''}>
            {group.items.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.href);
              return (
                <div key={item.href}>
                  {item.section && (
                    <div className="px-2.5 pb-1.5 pt-3 text-[11px] font-semibold uppercase tracking-wider text-[var(--ink-muted)]/70">
                      {item.section}
                    </div>
                  )}
                  <Link
                    href={item.href}
                    onClick={onNavigate}
                    className={`relative mb-0.5 flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[14.5px] transition-colors ${
                      active
                        ? 'bg-[var(--accent-soft)] font-semibold text-[var(--accent-dark)]'
                        : 'font-medium text-[#374151] hover:bg-[var(--paper)] hover:text-[var(--ink)]'
                    }`}
                  >
                    <Icon
                      size={19}
                      stroke={1.8}
                      className={active ? 'text-[var(--accent)]' : 'text-[var(--ink-muted)]'}
                    />
                    {item.label}
                    {item.href === '/ogrenciler' && studentCount !== undefined && (
                      <span className="ml-auto rounded-full bg-[var(--paper)] px-2 py-0.5 text-[11px] font-semibold text-[var(--ink-muted)]">
                        {filteredStudentCount}
                      </span>
                    )}
                    {item.href === '/mesajlar' && unread > 0 && (
                      <span className="ml-auto min-w-[20px] rounded-full bg-rose-500 px-1.5 py-0.5 text-center text-[11px] font-bold leading-none text-white" aria-label={`${unread} okunmamış sohbet`}>
                        {unread > 99 ? '99+' : unread}
                      </span>
                    )}
                  </Link>
                </div>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Tanıtım sitesine dönüş: yeni sekmede açılır, panel açık kalır */}
      <Link
        href="/"
        target="_blank"
        rel="noopener"
        className="mt-auto flex items-center gap-1.5 border-t border-[var(--border)] px-2.5 pt-4 text-[12.5px] text-[var(--ink-muted)] transition-colors hover:text-[var(--ink)]"
      >
        <IconExternalLink size={14} />
        Web sitesi
      </Link>
    </>
  );
}

export function Sidebar({ studentCount }: { studentCount?: number }) {
  return (
    <aside className={`hidden md:flex md:h-full md:w-64 md:flex-col md:overflow-y-auto md:px-3 md:py-5 ${SIDEBAR_BG}`}>
      <SidebarContent studentCount={studentCount} />
    </aside>
  );
}
