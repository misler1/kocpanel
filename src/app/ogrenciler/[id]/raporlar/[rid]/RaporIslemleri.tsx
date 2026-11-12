'use client';
/* eslint-disable @typescript-eslint/no-explicit-any */

import { useRouter } from 'next/navigation';
import { IconPrinter, IconTrash } from '@tabler/icons-react';
import { createClient } from '@/lib/supabase/client';

export function RaporIslemleri({ reportId, studentId, canDelete }: { reportId: string; studentId: string; canDelete: boolean }) {
  const router = useRouter();
  async function remove() {
    if (!confirm('Bu rapor silinsin mi?')) return;
    await (createClient() as any).from('student_reports').delete().eq('id', reportId);
    router.push(`/ogrenciler/${studentId}?sekme=raporlar`);
    router.refresh();
  }
  return (
    <div className="flex flex-wrap items-center gap-2 print:hidden">
      <button type="button" onClick={() => window.print()}
        className="flex items-center gap-1.5 rounded-lg bg-violet-600 px-3.5 py-2 text-[13px] font-semibold text-white hover:bg-violet-700">
        <IconPrinter size={15} /> Yazdır / PDF
      </button>
      {canDelete && (
        <button type="button" onClick={remove}
          className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-2 text-[13px] font-medium text-gray-600 hover:bg-rose-50 hover:text-rose-600">
          <IconTrash size={15} /> Sil
        </button>
      )}
    </div>
  );
}
