'use client';
import { useRouter } from 'next/navigation';
import { IconBell, IconSearch, IconLogout } from '@tabler/icons-react';
import { createClient } from '@/lib/supabase/client';
import { useExamFilter } from '@/lib/exam-filter-context';
import type { Profile } from '@/types/database';

const YKS_TRACKS = [
  { value: 'YKS_SAY', label: 'Sayısal' },
  { value: 'YKS_SOZ', label: 'Sözel' },
  { value: 'YKS_EA', label: 'EA' },
  { value: 'YKS_DIL', label: 'Dil' },
];

export function Topbar({ profile }: { profile: Profile | null }) {
  const router = useRouter();
  const supabase = createClient();
  const { examGroup, yksTrack, setExamGroup, setYksTrack, availableGroups } = useExamFilter();

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push('/giris');
    router.refresh();
  }

  const initials = profile?.full_name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) ?? 'KP';

  const showFilter = availableGroups.length >= 2;

  return (
    <header className="border-b border-[var(--border)] bg-[var(--card)]">
      <div className="flex h-14 items-center justify-between px-4 md:px-6">
        {/* Mobilde logo */}
        <div className="flex items-center gap-2 md:hidden">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-[var(--accent)] text-xs font-bold text-white">
            K
          </div>
          <span className="text-[15px] font-medium text-[var(--ink)]">KoçPanel</span>
        </div>

        {/* Sağ: arama, bildirim, çıkış */}
        <div className="ml-auto flex items-center gap-1">
          <button className="rounded-lg p-2 text-[var(--ink-muted)] transition-colors hover:bg-[var(--paper)] hover:text-[var(--ink)]">
            <IconSearch size={18} />
          </button>
          <button className="relative rounded-lg p-2 text-[var(--ink-muted)] transition-colors hover:bg-[var(--paper)] hover:text-[var(--ink)]">
            <IconBell size={18} />
          </button>
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