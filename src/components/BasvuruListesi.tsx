'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export type Basvuru = {
  id: string;
  full_name: string;
  phone: string;
  birth_date: string;
  status: 'admin_bekliyor' | 'koc_bekliyor' | 'onaylandi' | 'reddedildi';
  requested_coach_id: string | null;
  assigned_coach_id: string | null;
  created_at: string;
};
export type KocSecenek = { id: string; full_name: string };

const STATUS_LABEL: Record<string, string> = {
  admin_bekliyor: 'Yönetici onayı bekliyor',
  koc_bekliyor: 'Koç onayı bekliyor',
  onaylandi: 'Onaylandı',
  reddedildi: 'Reddedildi',
};

// Öğrenci başvuruları: admin (mode='admin') ya da atanan koç (mode='koc') tarafından kullanılır.
export function BasvuruListesi({ basvurular, koclar = [], mode }: { basvurular: Basvuru[]; koclar?: KocSecenek[]; mode: 'admin' | 'koc' }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pick, setPick] = useState<Record<string, string>>({});
  const coachName = (id: string | null) => koclar.find((k) => k.id === id)?.full_name;

  async function act(id: string, action: 'onayla' | 'reddet' | 'koc_ata') {
    if (action === 'reddet' && !window.confirm('Bu başvuruyu reddetmek istiyor musunuz?')) return;
    setBusy(id);
    setError(null);
    const res = await fetch('/api/ogrenci/basvuru', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, action, coachId: pick[id] || null }),
    });
    const json = await res.json().catch(() => ({}));
    setBusy(null);
    if (!res.ok) { setError(json.error ?? 'İşlem yapılamadı.'); return; }
    router.refresh();
  }

  if (basvurular.length === 0) {
    return <p className="px-4 py-4 text-[13px] text-gray-400">Bekleyen öğrenci başvurusu yok.</p>;
  }

  return (
    <div className="divide-y divide-gray-100">
      {error && <p className="px-4 py-2 text-[13px] text-red-600">{error}</p>}
      {basvurular.map((b) => {
        const noCoachYet = b.status === 'onaylandi' && !b.assigned_coach_id;
        const needsPick = mode === 'admin' && ((b.status === 'admin_bekliyor' && !b.requested_coach_id) || noCoachYet);
        return (
          <div key={b.id} className="px-4 py-3">
            <div className="flex flex-wrap items-center gap-2">
              <div className="min-w-0 flex-1">
                <div className="text-[13px] font-medium text-gray-900">{b.full_name}</div>
                <div className="text-[12px] text-gray-500">
                  {b.phone} · {new Date(b.birth_date).toLocaleDateString('tr-TR')}
                  {b.requested_coach_id && ` · İstenen koç: ${coachName(b.requested_coach_id) ?? '—'}`}
                </div>
                <div className="mt-0.5 text-[11px] text-amber-700">
                  {noCoachYet ? 'Onaylandı · koç atanmadı' : STATUS_LABEL[b.status]}
                </div>
              </div>

              {needsPick && (
                <select value={pick[b.id] ?? ''} onChange={(e) => setPick((p) => ({ ...p, [b.id]: e.target.value }))}
                  className="rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-[12px]">
                  <option value="">{noCoachYet ? 'Koç seç' : 'Koç atama (sonra)'}</option>
                  {koclar.map((k) => <option key={k.id} value={k.id}>{k.full_name}</option>)}
                </select>
              )}

              {noCoachYet ? (
                <button disabled={busy === b.id || !pick[b.id]} onClick={() => act(b.id, 'koc_ata')}
                  className="rounded-lg bg-blue-600 px-3 py-1.5 text-[12px] font-medium text-white disabled:opacity-50">Koç ata</button>
              ) : (
                <>
                  {(mode === 'admin' ? b.status === 'admin_bekliyor' : b.status === 'koc_bekliyor') && (
                    <button disabled={busy === b.id} onClick={() => act(b.id, 'onayla')}
                      className="rounded-lg bg-blue-600 px-3 py-1.5 text-[12px] font-medium text-white disabled:opacity-50">Onayla</button>
                  )}
                  {(mode === 'admin' ? b.status !== 'reddedildi' && b.status !== 'onaylandi' : b.status === 'koc_bekliyor') && (
                    <button disabled={busy === b.id} onClick={() => act(b.id, 'reddet')}
                      className="rounded-lg border border-gray-200 px-3 py-1.5 text-[12px] text-gray-600 disabled:opacity-50">Reddet</button>
                  )}
                </>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
