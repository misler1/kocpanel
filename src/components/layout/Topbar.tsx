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
    <header className="border-b border-gray-200 bg-white">
      <div className="flex h-14 items-center justify-between px-4 md:px-6">
        {/* Mobilde logo */}
        <div className="flex items-center gap-2 md:hidden">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-blue-600 text-white text-xs font-bold">K</div>
          <span className="text-sm font-medium text-gray-900">KoçPanel</span>
        </div>

        {/* Sağ: arama, bildirim, çıkış */}
        <div className="flex items-center gap-2">
          <button className="rounded-lg p-2 text-gray-500 hover:bg-gray-100">
            <IconSearch size={18} />
          </button>
          <button className="relative rounded-lg p-2 text-gray-500 hover:bg-gray-100">
            <IconBell size={18} />
          </button>
          <div className="flex items-center gap-2 pl-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-xs font-semibold text-blue-700">
              {initials}
            </div>
            <span className="hidden text-sm text-gray-700 md:block">{profile?.full_name ?? ''}</span>
            <button
              onClick={handleLogout}
              className="ml-1 rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-red-500"
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