'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { STUDENT_NAV } from './StudentNavItems';
import { dailyQuote } from './studentUi';

export function StudentSidebar() {
  const pathname = usePathname();
  const isActive = (href: string) => (href === '/ogrenci' ? pathname === href : pathname.startsWith(href));

  return (
    <aside className="hidden md:flex md:h-full md:w-64 md:flex-col md:overflow-y-auto md:border-r md:border-[var(--border)] md:bg-white/80 md:px-4 md:py-6 md:backdrop-blur">
      <Link href="/ogrenci" className="mb-6 flex items-center gap-2.5 px-2" aria-label="KoçDefterim ana sayfa">
        <Image src="/brand/kocdefterim-mark-beyaz-k-v2.png" alt="KoçDefterim" width={40} height={40} className="h-10 w-10 flex-shrink-0 rounded-xl object-contain" priority />
        <span className="text-[18px] font-extrabold tracking-tight text-[var(--ink)]">KoçDefterim</span>
      </Link>

      <nav className="flex flex-col gap-1.5">
        {STUDENT_NAV.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-2xl px-2.5 py-2.5 text-[15px] font-bold transition-all ${
                active ? 'bg-[var(--accent-soft)] text-[var(--ink)] shadow-sm' : 'text-[var(--ink-muted)] hover:translate-x-0.5 hover:bg-[var(--paper)] hover:text-[var(--ink)]'
              }`}
            >
              <span className={`flex h-9 w-9 items-center justify-center rounded-xl transition-colors ${
                active ? `${item.chip} text-white` : 'bg-[var(--paper)] text-[var(--ink-muted)]'}`}>
                <Icon size={19} strokeWidth={2.2} />
              </span>
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto rounded-2xl bg-gradient-to-br from-[#FFE7A3] to-[#FFC8DD] p-4">
        <div className="student-float mb-1 text-2xl">💡</div>
        <p suppressHydrationWarning className="text-[13px] font-semibold leading-snug text-[#5A3E2B]">{dailyQuote()}</p>
      </div>
    </aside>
  );
}
