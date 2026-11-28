'use client';
/* eslint-disable @typescript-eslint/no-explicit-any */

import { useMemo, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { feedbackPhotoUrl } from '@/components/FeedbackButton';

// Yönetici: geri bildirim listesi. Durum: Yeni → İnceleniyor → Çözüldü (çözülünce bildirene, notla birlikte bildirim gider).

const KIND: Record<string, { label: string; cls: string }> = {
  sorun: { label: '⚠️ Sorun', cls: 'bg-red-50 text-red-700' },
  oneri: { label: '💡 Öneri', cls: 'bg-amber-50 text-amber-800' },
  diger: { label: '✉️ Diğer', cls: 'bg-sky-50 text-sky-800' },
};
const STATUS: Record<string, { label: string; cls: string }> = {
  yeni: { label: 'Yeni', cls: 'bg-violet-100 text-violet-800' },
  inceleniyor: { label: 'İnceleniyor', cls: 'bg-amber-100 text-amber-800' },
  cozuldu: { label: 'Çözüldü', cls: 'bg-emerald-100 text-emerald-800' },
};
const ROLE: Record<string, string> = { koc: 'Koç', ogretmen: 'Öğretmen', ogrenci: 'Öğrenci', veli: 'Veli' };

/** Tarayıcı bilgisinden kısa cihaz adı */
function device(ua: string | null) {
  if (!ua) return '';
  const os = /iPhone|iPad/.test(ua) ? 'iPhone/iPad' : /Android/.test(ua) ? 'Android' : /Windows/.test(ua) ? 'Windows' : /Mac OS/.test(ua) ? 'Mac' : '';
  const br = /Edg\//.test(ua) ? 'Edge' : /CriOS|Chrome\//.test(ua) ? 'Chrome' : /FxiOS|Firefox\//.test(ua) ? 'Firefox' : /Safari\//.test(ua) ? 'Safari' : '';
  return [os, br].filter(Boolean).join(' · ');
}

export function GeriBildirimlerClient({ initial }: { initial: any[] }) {
  const supabase = useMemo(() => createClient() as any, []);
  const [rows, setRows] = useState(initial);
  const [filter, setFilter] = useState<'acik' | 'hepsi' | 'cozuldu'>('acik');
  const [notes, setNotes] = useState<Record<string, string>>(() => Object.fromEntries(initial.map((r) => [r.id, r.admin_note ?? ''])));
  const [err, setErr] = useState<string | null>(null);

  async function update(r: any, status: string) {
    setErr(null);
    const { error } = await supabase.rpc('feedback_admin_update', { p_id: r.id, p_status: status, p_note: notes[r.id] ?? null });
    if (error) { setErr(error.message); return; }
    setRows((p) => p.map((x) => (x.id === r.id ? { ...x, status, admin_note: notes[r.id] || null } : x)));
  }
  async function remove(r: any) {
    if (!confirm('Bu bildirim silinsin mi?')) return;
    const { error } = await supabase.rpc('feedback_admin_delete', { p_id: r.id });
    if (error) { setErr(error.message); return; }
    for (const p of r.photos ?? []) fetch(feedbackPhotoUrl(p), { method: 'DELETE' }).catch(() => {}); // fotoğraflar da silinir
    setRows((p) => p.filter((x) => x.id !== r.id));
  }

  const shown = rows.filter((r) => (filter === 'hepsi' ? true : filter === 'cozuldu' ? r.status === 'cozuldu' : r.status !== 'cozuldu'));
  const openCount = rows.filter((r) => r.status !== 'cozuldu').length;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-1 rounded-xl bg-gray-100 p-1 text-[13px]">
        {([['acik', `Açık (${openCount})`], ['cozuldu', 'Çözülenler'], ['hepsi', `Hepsi (${rows.length})`]] as const).map(([k, l]) => (
          <button key={k} type="button" onClick={() => setFilter(k)}
            className={`rounded-lg px-3 py-1.5 font-medium ${filter === k ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`}>{l}</button>
        ))}
      </div>
      {err && <p className="rounded-lg bg-red-50 px-3 py-2 text-[13px] text-red-700">{err}</p>}
      {shown.length === 0 && <p className="rounded-xl border border-gray-200 bg-white p-4 text-[13px] text-gray-500">Burada bildirim yok.</p>}
      {shown.map((r) => (
        <div key={r.id} className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="flex flex-wrap items-center gap-2 text-[12.5px]">
            <span className={`rounded-full px-2 py-0.5 font-semibold ${KIND[r.kind]?.cls}`}>{KIND[r.kind]?.label ?? r.kind}</span>
            <span className={`rounded-full px-2 py-0.5 font-semibold ${STATUS[r.status]?.cls}`}>{STATUS[r.status]?.label}</span>
            <span className="font-medium text-gray-900">{r.full_name ?? 'Silinmiş kullanıcı'}</span>
            <span className="text-gray-500">{ROLE[r.role] ?? r.role}{r.email ? ` · ${r.email}` : ''}</span>
            <span className="ml-auto text-gray-400">{new Date(r.created_at).toLocaleString('tr-TR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
          </div>
          <p className="mt-2 whitespace-pre-wrap text-[14px] text-gray-800">{r.message}</p>
          {r.photos?.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-2">
              {r.photos.map((p: string) => (
                <a key={p} href={feedbackPhotoUrl(p)} target="_blank" rel="noopener" title="Fotoğrafı aç"
                  className="block h-24 w-24 overflow-hidden rounded-lg border border-gray-200 bg-gray-50 hover:ring-2 hover:ring-[var(--accent)]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={feedbackPhotoUrl(p)} alt="Bildirim fotoğrafı" loading="lazy" className="h-full w-full object-cover" />
                </a>
              ))}
            </div>
          )}
          <p className="mt-1 text-[11.5px] text-gray-400">{[r.page, device(r.user_agent)].filter(Boolean).join(' · ')}</p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <input value={notes[r.id] ?? ''} onChange={(e) => setNotes({ ...notes, [r.id]: e.target.value })} maxLength={2000}
              placeholder="Not (Çözüldü deyince bildirene gider), ör. Düzelttik, sayfayı yenileyin"
              className="min-w-[240px] flex-1 rounded-lg border border-gray-200 px-2.5 py-1.5 text-[13px]" />
            {r.status !== 'inceleniyor' && r.status !== 'cozuldu' && (
              <button type="button" onClick={() => update(r, 'inceleniyor')} className="rounded-lg border border-gray-200 px-3 py-1.5 text-[12.5px] font-semibold text-gray-700 hover:bg-gray-50">İnceleniyor</button>
            )}
            {r.status !== 'cozuldu' ? (
              <button type="button" onClick={() => update(r, 'cozuldu')} className="rounded-lg bg-emerald-600 px-3 py-1.5 text-[12.5px] font-semibold text-white hover:bg-emerald-700">Çözüldü</button>
            ) : (
              <button type="button" onClick={() => update(r, 'yeni')} className="rounded-lg border border-gray-200 px-3 py-1.5 text-[12.5px] font-semibold text-gray-700 hover:bg-gray-50">Yeniden aç</button>
            )}
            <button type="button" onClick={() => remove(r)} className="px-2 py-1.5 text-[12.5px] text-red-600">Sil</button>
          </div>
        </div>
      ))}
    </div>
  );
}
