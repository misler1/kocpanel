'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { STUDENT_NAV } from './StudentNavItems';

export function StudentSidebar() {
  const pathname = usePathname();
  const isActive = (href: string) => (href === '/ogrenci' ? pathname === href : pathname.startsWith(href));

  return (
    <aside className="hidden md:flex md:w-64 md:flex-col md:bg-[var(--navy-900)] md:px-3 md:py-5 md:overflow-y-auto md:h-full">
      <Link href="/ogrenci" className="mb-4 flex items-center gap-2.5 border-b border-white/10 px-2 pb-5" aria-label="KoçDefterim ana sayfa">
        <Image src="/brand/kocdefterim-mark-beyaz-k-v2.png" alt="KoçDefterim" width={38} height={38} className="h-9 w-9 flex-shrink-0 object-contain" priority />
        <span className="text-[16px] font-semibold tracking-tight text-white">KoçDefterim</span>
      </Link>

      <nav className="mt-2 flex flex-col">
        {STUDENT_NAV.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`mb-0.5 flex items-center gap-2.5 rounded-lg px-2.5 py-2.5 text-[15px] transition-colors ${
                active ? 'bg-white/10 font-medium text-white' : 'text-white/60 hover:bg-white/5 hover:text-white/90'
              }`}
            >
              <Icon size={18} strokeWidth={1.8} />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
