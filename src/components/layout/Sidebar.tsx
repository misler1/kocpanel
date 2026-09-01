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
    <aside className="hidden md:flex md:w-56 md:flex-col md:border-r md:border-gray-200 md:bg-gray-50/60 md:px-3 md:py-4">
      <div className="mb-3 flex items-center gap-2 border-b border-gray-200 px-1 pb-4">
        <IconSchool className="text-blue-600" size={22} />
        <span className="text-[15px] font-medium text-gray-900">KoçPanel</span>
      </div>
        <ExamFilterBar />
      <nav className="flex flex-col gap-0.5">
        {groups.map((group, gi) => (
          <div key={gi}>
            {group.items.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.href);
              return (
                <div key={item.href}>
                  {item.section && (
                    <div className="px-2 pb-1.5 pt-2.5 text-[11px] font-medium uppercase tracking-wide text-gray-400">
                      {item.section}
                    </div>
                  )}
                  <Link
                    href={item.href}
                    className={`mb-0.5 flex items-center gap-2 rounded-lg px-2.5 py-2 text-sm transition ${
                      active
                        ? 'border border-gray-200 bg-white font-medium text-gray-900'
                        : 'text-gray-600 hover:bg-white/60'
                    }`}
                  >
                    <Icon size={17} className={active ? 'text-gray-700' : 'text-gray-500'} />
                    {item.label}
                    {item.href === '/ogrenciler' && studentCount !== undefined && (
                      <span className="ml-auto rounded-full bg-red-100 px-2 py-0.5 text-[11px] font-medium text-red-700">
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
