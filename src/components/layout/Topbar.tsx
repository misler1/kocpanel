'use client';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { IconLogout } from '@tabler/icons-react';
import { createClient } from '@/lib/supabase/client';
import { NotificationBell } from '@/components/NotificationBell';
import type { Profile } from '@/types/database';


export function Topbar({ profile }: { profile: Profile | null }) {
  const router = useRouter();
  const supabase = createClient();

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push('/');
    router.refresh();
  }

  const initials = profile?.full_name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) ?? 'KP';


  return (
    <header className="relative z-40 border-b border-[var(--border)] bg-[var(--card)]">
      <div className="flex h-14 items-center justify-between px-4 md:px-6">
        {/* Mobilde logo */}
        <Link href="/anasayfa" className="flex items-center gap-2 md:hidden" aria-label="KoçDefterim anasayfa">
          <Image src="/brand/kocdefterim-mark-beyaz-k-v2.png" alt="KoçDefterim" width={32} height={32} className="h-8 w-8 object-contain" priority />
          <span className="text-[15px] font-medium text-[var(--ink)]">KoçDefterim</span>
        </Link>

        {/* Sağ: arama, bildirim, çıkış */}
        <div className="ml-auto flex items-center gap-1">
          <NotificationBell />
          <div className="flex items-center gap-2.5 pl-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--accent-soft)] text-[12px] font-semibold text-[var(--accent-dark)]">
              {initials}
            </div>
            <span className="hidden text-[14px] font-medium text-[var(--ink)] md:block">
              {profile?.full_name ?? ''}
            </span>
            <button
              onClick={handleLogout}
              className="ml-1 rounded-lg p-2 text-[var(--ink-muted)] transition-colors hover:bg-[var(--danger-soft)] hover:text-[var(--danger)]"
              title="Çıkış yap"
            >
              <IconLogout size={16} />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}