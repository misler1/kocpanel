'use client';
/* eslint-disable @typescript-eslint/no-explicit-any */

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { IconCheck, IconPrinter, IconSend, IconTrash } from '@tabler/icons-react';
import { createClient } from '@/lib/supabase/client';

export function AnalizIslemleri({ analizId, studentId, sharedAt }: { analizId: string; studentId: string; sharedAt: string | null }) {
  const router = useRouter();
  const [state, setState] = useState<'idle' | 'busy' | 'ok'>(sharedAt ? 'ok' : 'idle');
  const [error, setError] = useState('');

  async function share() {
    setState('busy');
    setError('');
    const { error: e } = await (createClient() as any).rpc('share_exam_analysis', { p_id: analizId });
    if (e) { setState('idle'); setError(e.message); return; }
    setState('ok');
    router.refresh();
  }

  async function remove() {
    if (!confirm('Bu analiz silinsin mi? Öğrenciye gönderildiyse öğrencinin sayfasından da kalkar.')) return;
    await (createClient() as any).from('exam_analyses').delete().eq('id', analizId);
    router.push(`/ogrenciler/${studentId}?sekme=denemeler`);
    router.refresh();
  }

  return (
    <div className="flex flex-wrap items-center gap-2 print:hidden">
      <button type="button" onClick={share} disabled={state !== 'idle'}
        className="flex items-center gap-1.5 rounded-lg bg-violet-600 px-3.5 py-2 text-[13px] font-semibold text-white hover:bg-violet-700 disabled:bg-emerald-600 disabled:opacity-100">
        {state === 'ok' ? <><IconCheck size={15} /> Öğrenciye gönderildi</> : state === 'busy' ? 'Gönderiliyor…' : <><IconSend size={15} /> Öğrenciye gönder</>}
      </button>
      <button type="button" onClick={() => window.print()}
        className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-2 text-[13px] font-medium text-gray-700 hover:bg-gray-50">
        <IconPrinter size={15} /> Yazdır / PDF
      </button>
      <button type="button" onClick={remove}
        className="ml-auto flex items-center gap-1.5 rounded-lg px-3 py-2 text-[13px] font-medium text-gray-500 hover:bg-rose-50 hover:text-rose-600">
        <IconTrash size={15} /> Sil
      </button>
      {error && <p className="w-full text-[12.5px] text-rose-600">{error}</p>}
    </div>
  );
}
