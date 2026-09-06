'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { IconSchool } from '@tabler/icons-react';
import { MAIN_NAV, TAKIP_NAV, BAGLANTI_NAV, HESAP_NAV } from '@/lib/navigation';
import { ExamFilterBar } from './ExamFilterBar';
import { useExamFilter } from '@/lib/exam-filter-context';

export function Sidebar({ studentCount }: { studentCount?: number }) {
  const pathname = usePathname();
  const { filteredStudentCount } = useExamFilter();
  const isActive = (href: string) => pathname === href;

  const groups = [
    { items: MAIN_NAV },
    { items: TAKIP_NAV },
    { items: BAGLANTI_NAV },
    { items: HESAP_NAV },
  ];

  return (
    <aside className="hidden md:flex md:w-64 md:flex-col md:bg-[var(--navy-900)] md:px-3 md:py-5">
      <div className="mb-4 flex items-center gap-2.5 border-b border-white/10 px-2 pb-5">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--accent)]">
          <IconSchool size={18} className="text-white" />
        </span>
        <span className="text-[16px] font-semibold tracking-tight text-white">
          KoçPanel
        </span>
      </div>

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
                    <div className="px-2.5 pb-1.5 pt-3 text-[12px] font-medium text-white/35">
                      {item.section}
                    </div>
                  )}
                  <Link
                    href={item.href}
                    className={`relative mb-0.5 flex items-center gap-2.5 rounded-lg px-2.5 py-2.5 text-[15px] transition-colors ${
                      active
                        ? 'bg-white/10 font-medium text-white'
                        : 'text-white/60 hover:bg-white/5 hover:text-white/90'
                    }`}
                  >
                    {active && (
                      <span className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-[var(--accent)]" />
                    )}
                    <Icon
                      size={19}
                      className={active ? 'text-[var(--accent)]' : 'text-white/45'}
                    />
                    {item.label}
                    {item.href === '/ogrenciler' && studentCount !== undefined && (
                      <span className="ml-auto rounded-full bg-white/10 px-2 py-0.5 text-[11px] font-medium text-white/80">
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
    </aside>
  );
}