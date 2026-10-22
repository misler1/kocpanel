'use client';
/* eslint-disable @typescript-eslint/no-explicit-any */

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function PlanTalepleriClient({ requests }: { requests: any[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

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
    <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50">
      <p className="px-4 pt-3 text-[13px] font-medium text-amber-900">
        Öğrencilerden {requests.length} haftalık program talebi var
      </p>
      {error && <p className="px-4 pt-1 text-[12px] text-red-600">{error}</p>}
      <div className="divide-y divide-amber-100">
        {requests.map((r) => (
          <div key={r.id} className="px-4 py-3">
            <div className="flex flex-wrap items-start gap-2">
              <div className="min-w-0 flex-1">
                <div className="text-[13px] font-medium text-gray-900">
                  {r.students?.full_name} · {r.kind === 'yeni_program' ? 'Yeni program istiyor' : 'Program değişikliği istiyor'}
                </div>
                {r.kind === 'duzenleme' && r.week_start && (
                  <div className="text-[11px] text-gray-500">
                    {new Date(r.week_start).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' })} haftası
                  </div>
                )}
                {Array.isArray(r.payload?.summary) && r.payload.summary.length > 0 && (
                  <ul className="mt-1 list-disc pl-4 text-[12px] text-gray-700">
                    {r.payload.summary.map((l: string, i: number) => <li key={i}>{l}</li>)}
                  </ul>
                )}
                {r.note && <p className="mt-1 text-[12px] italic text-gray-600">“{r.note}”</p>}
              </div>
              <button disabled={busy === r.id} onClick={() => decide(r.id, 'onayla')}
                className="rounded-lg bg-blue-600 px-3 py-1.5 text-[12px] font-medium text-white disabled:opacity-50">
                {r.kind === 'yeni_program' ? 'Hazırlandı' : 'Onayla ve uygula'}
              </button>
              <button disabled={busy === r.id} onClick={() => decide(r.id, 'reddet')}
                className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-[12px] text-gray-600 disabled:opacity-50">
                Reddet
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
