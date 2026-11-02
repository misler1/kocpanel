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

export function Sidebar({ studentCount }: { studentCount?: number }) {
  const pathname = usePathname();
    const [isAdmin, setIsAdmin] = useState(false);

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
    });
  }, []);
  const { filteredStudentCount } = useExamFilter();
  const isActive = (href: string) => pathname === href;

  const groups = [
    { items: MAIN_NAV },
    { items: TAKIP_NAV },
    { items: BAGLANTI_NAV },
    ...(isAdmin ? [{ items: YONETIM_NAV }] : []),
    { items: HESAP_NAV },
  ];

  return (
    <aside className="hidden md:flex md:w-64 md:flex-col md:bg-gradient-to-b md:from-indigo-950 md:via-violet-950 md:to-fuchsia-950 md:px-3 md:py-5 md:overflow-y-auto md:h-full">
      <Link href="/anasayfa" className="mb-4 flex items-center gap-2.5 border-b border-white/10 px-2 pb-5" aria-label="KoçDefterim anasayfa">
        <Image src="/brand/kocdefterim-mark-beyaz-k-v2.png" alt="KoçDefterim" width={38} height={38} className="h-9 w-9 flex-shrink-0 object-contain" priority />
        <span className="text-[16px] font-semibold tracking-tight text-white">
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
                    <div className="px-2.5 pb-1.5 pt-3 text-[11px] font-semibold uppercase tracking-wider text-violet-200/50">
                      {item.section}
                    </div>
                  )}
                  <Link
                    href={item.href}
                    className={`relative mb-0.5 flex items-center gap-2.5 rounded-lg px-2.5 py-2.5 text-[15px] transition-colors ${
                      active
                        ? 'bg-gradient-to-r from-indigo-500/45 via-violet-500/35 to-fuchsia-500/20 font-medium text-white shadow-sm ring-1 ring-white/10'
                        : 'text-white/65 hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    {active && (
                      <span className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-gradient-to-b from-sky-300 to-fuchsia-300" />
                    )}
                    <Icon
                      size={19}
                      className={active ? 'text-fuchsia-200' : 'text-violet-200/60'}
                    />
                    {item.label}
                    {item.href === '/ogrenciler' && studentCount !== undefined && (
                      <span className="ml-auto rounded-full bg-fuchsia-400/25 px-2 py-0.5 text-[11px] font-semibold text-fuchsia-100">
                        {filteredStudentCount}
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
        className="mt-auto flex items-center gap-1.5 border-t border-white/10 px-2.5 pt-4 text-[12.5px] text-white/40 transition-colors hover:text-white/80"
      >
        <IconExternalLink size={14} />
        Web sitesi
      </Link>
    </aside>
  );
}