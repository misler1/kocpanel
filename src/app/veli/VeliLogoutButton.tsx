'use client';

import { useRouter } from 'next/navigation';
import { IconLogout } from '@tabler/icons-react';
import { createClient } from '@/lib/supabase/client';

export function VeliLogoutButton() {
  const router = useRouter();
  async function logout() {
    await createClient().auth.signOut();
    router.push('/');
    router.refresh();
  }
  return (
    <button type="button" onClick={logout} className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 hover:bg-red-50 hover:text-red-600">
      <IconLogout size={15} /> Çıkış
    </button>
  );
}
