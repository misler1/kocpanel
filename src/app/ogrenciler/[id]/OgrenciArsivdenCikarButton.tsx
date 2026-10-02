'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { IconArchiveOff } from '@tabler/icons-react';

export function OgrenciArsivdenCikarButton({ studentId }: { studentId: string }) {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    setLoading(true);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase.from('students') as any)
      .update({
        status: 'aktif',
        updated_at: new Date().toISOString(),
      })
      .eq('id', studentId);

    if (error) {
      setLoading(false);
      window.alert('Öğrenci arşivden çıkarılırken hata oluştu: ' + error.message);
      return;
    }

    router.push('/ogrenciler');
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={loading}
      className="flex items-center gap-1.5 rounded-lg border border-amber-200 px-3 py-1.5 text-[13px] text-amber-700 hover:bg-amber-50 disabled:opacity-60"
    >
      <IconArchiveOff size={14} />
      {loading ? 'Çıkarılıyor...' : 'Arşivden çıkar'}
    </button>
  );
}