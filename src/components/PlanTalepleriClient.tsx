'use client';
/* eslint-disable @typescript-eslint/no-explicit-any */

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ProgramReview } from './program/ProgramReview';

// Öğrencinin program talepleri: mevcut programda değişiklik ("Programı aç" → haftalık takip görünümünde,
// istenen değişiklikler işaretli, koç düzenleyip onaylar) ya da koçtan yeni program istemesi.
export function PlanTalepleriClient({ requests }: { requests: any[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState<any | null>(null);

  async function decide(id: string, action: 'onayla' | 'reddet') {
    if (action === 'reddet' && !window.confirm('Bu talebi reddetmek istiyor musunuz?')) return;
    setBusy(id);
    setError(null);
    const res = await fetch('/api/ogrenci/plan-talebi', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, action }),
    });
    const json = await res.json().catch(() => ({}));
    setBusy(null);
    if (!res.ok) { setError(json.error ?? 'İşlem yapılamadı.'); return; }
    router.refresh();
  }

  return (
    <div className="mb-4 overflow-hidden rounded-xl border border-amber-200 bg-amber-50/60">
      <p className="border-b border-amber-100 px-4 py-2.5 text-[13.5px] font-semibold text-amber-900">
        Öğrencilerden {requests.length} program talebi var
      </p>
      {error && <p className="px-4 pt-2 text-[12px] text-red-600">{error}</p>}
      <div className="divide-y divide-amber-100">
        {requests.map((r) => {
          const edit = r.kind === 'duzenleme';
          const n = Array.isArray(r.payload?.ops) ? r.payload.ops.length : 0;
          return (
            <div key={r.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[13.5px]">
                  {r.students?.id
                    ? <Link href={`/ogrenciler/${r.students.id}`} className="font-semibold text-gray-900 hover:underline">{r.students.full_name}</Link>
                    : <span className="font-semibold text-gray-900">{r.students?.full_name}</span>}
                  <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${edit ? 'bg-amber-100 text-amber-800' : 'bg-sky-50 text-sky-700'}`}>
                    {edit ? `✏️ Programında ${n} değişiklik istiyor` : '✨ Yeni program istiyor'}
                  </span>
                  {edit && r.week_start && (
                    <span className="text-gray-500">{new Date(r.week_start).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' })} programı</span>
                  )}
                </div>
                {r.note && <p className="mt-1 text-[12px] italic text-gray-600">“{r.note}”</p>}
              </div>
              {edit ? (
                <button type="button" onClick={() => setOpen(r)}
                  className="rounded-lg bg-amber-500 px-3.5 py-2 text-[12.5px] font-semibold text-white shadow-sm hover:bg-amber-600">
                  Programı aç ve onayla
                </button>
              ) : (
                <>
                  <Link href={r.students?.id ? `/haftalik-takip?ogrenci=${r.students.id}` : '/haftalik-takip'}
                    className="rounded-lg border border-amber-300 bg-white px-3 py-1.5 text-[12px] font-medium text-amber-800 hover:bg-amber-50">
                    Program hazırla
                  </Link>
                  <button disabled={busy === r.id} onClick={() => decide(r.id, 'onayla')}
                    className="rounded-lg bg-blue-600 px-3 py-1.5 text-[12px] font-medium text-white disabled:opacity-50">
                    Hazırlandı
                  </button>
                  <button disabled={busy === r.id} onClick={() => decide(r.id, 'reddet')}
                    className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-[12px] text-gray-600 disabled:opacity-50">
                    Reddet
                  </button>
                </>
              )}
            </div>
          );
        })}
      </div>
      {open && <ProgramReview item={{ kind: 'talep', row: open }} onClose={() => setOpen(null)} />}
    </div>
  );
}
