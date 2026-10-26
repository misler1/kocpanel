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
    router.push('/giris/ogrenci');
    router.refresh();
  }

  const initials = fullName.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2) || 'ÖĞ';

  return (
    <header className="border-b border-[var(--border)] bg-[var(--card)]">
      <div className="flex h-14 items-center justify-between px-4 md:px-6">
        <Link href="/ogrenci" className="flex items-center gap-2 md:hidden" aria-label="KoçDefterim ana sayfa">
          <Image src="/brand/kocdefterim-mark-beyaz-k-v2.png" alt="KoçDefterim" width={32} height={32} className="h-8 w-8 object-contain" priority />
          <span className="text-[15px] font-medium text-[var(--ink)]">KoçDefterim</span>
        </Link>

        <div className="ml-auto flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--accent-soft)] text-[12px] font-semibold text-[var(--accent-dark)]">
            {initials}
          </div>
          <span className="hidden text-[14px] font-medium text-[var(--ink)] md:block">{fullName}</span>
          <button
            onClick={handleLogout}
            className="ml-1 rounded-lg p-2 text-[var(--ink-muted)] transition-colors hover:bg-[var(--danger-soft)] hover:text-[var(--danger)]"
            title="Çıkış yap"
          >
            <IconLogout size={16} />
          </button>
        </div>
      </div>
    </header>
  );
}
