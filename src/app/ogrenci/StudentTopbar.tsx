'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { IconLogout } from '@tabler/icons-react';
import { createClient } from '@/lib/supabase/client';

export function StudentTopbar({ fullName }: { fullName: string }) {
  const router = useRouter();

  async function handleLogout() {
    await createClient().auth.signOut();
    router.push('/');
    router.refresh();
  }

  const initials = fullName.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2) || 'ÖĞ';

  return (
    <header className="border-b border-[var(--border)] bg-white/80 backdrop-blur">
      <div className="flex h-16 items-center justify-between px-4 md:px-8">
        <Link href="/ogrenci" className="flex items-center gap-2 md:hidden" aria-label="KoçDefterim ana sayfa">
          <Image src="/brand/kocdefterim-mark-beyaz-k-v2.png" alt="KoçDefterim" width={34} height={34} className="h-9 w-9 rounded-xl object-contain" priority />
          <span className="text-[16px] font-extrabold text-[var(--ink)]">KoçDefterim</span>
        </Link>

        <div className="ml-auto flex items-center gap-2.5">
          <span className="hidden text-[15px] font-bold text-[var(--ink)] md:block">{fullName}</span>
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-[#A78BFA] to-[#F472B6] text-[13px] font-extrabold text-white ring-4 ring-[var(--accent-soft)]">
            {initials}
          </div>
          <button
            onClick={handleLogout}
            className="ml-1 flex items-center gap-1.5 rounded-full bg-[var(--paper)] px-3 py-2 text-[13px] font-bold text-[var(--ink-muted)] transition-colors hover:bg-[var(--danger-soft)] hover:text-[var(--danger)]"
            title="Çıkış yap"
          >
            <IconLogout size={16} />
            <span className="hidden sm:inline">Çıkış</span>
          </button>
        </div>
      </div>
    </header>
  );
}
