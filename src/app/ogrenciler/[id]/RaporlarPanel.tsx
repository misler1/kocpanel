'use client';
/* eslint-disable @typescript-eslint/no-explicit-any */

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { IconChartBar, IconChevronRight } from '@tabler/icons-react';
import { createClient } from '@/lib/supabase/client';
import { shiftDate, todayTr, weekdayIndex } from '@/lib/day-tasks';

// Öğrenci sayfası → Raporlar: her pazartesi 08:00'de otomatik oluşan haftalık raporlar + koçun istediği tarih aralığı
// için oluşturduğu raporlar (supabase/student_reports.sql, /api/raporlar)

type Row = { id: string; period_start: string; period_end: string; kind: 'otomatik' | 'elle'; created_at: string; totals: any; exam_count: number };

const fmt = (d: string) => new Date(`${d}T12:00:00Z`).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', timeZone: 'UTC' });

function presets(today: string) {
  const monday = shiftDate(today, -weekdayIndex(today));
  return [
    { key: 'gecen', label: 'Geçen hafta', start: shiftDate(monday, -7), end: shiftDate(monday, -1) },
    { key: 'bu', label: 'Bu hafta', start: monday, end: today },
    { key: 's7', label: 'Son 7 gün', start: shiftDate(today, -6), end: today },
    { key: 's30', label: 'Son 30 gün', start: shiftDate(today, -29), end: today },
  ];
}

export function RaporlarPanel({ studentId, canCreate }: { studentId: string; canCreate: boolean }) {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const today = todayTr();
  const opts = presets(today);
  const [rows, setRows] = useState<Row[] | null>(null);
  const [missing, setMissing] = useState(false);
  const [start, setStart] = useState(opts[0].start);
  const [end, setEnd] = useState(opts[0].end);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const { data, error: e } = await (supabase as any).from('student_reports')
      .select('id, period_start, period_end, kind, created_at, totals:data->totals, exams:data->exams')
      .eq('student_id', studentId).order('period_end', { ascending: false }).order('created_at', { ascending: false }).limit(60);
    if (e) { setMissing(true); setRows([]); return; }
    setRows(((data ?? []) as any[]).map((r) => ({ ...r, exam_count: Array.isArray(r.exams) ? r.exams.length : 0 })));
  }, [supabase, studentId]);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { load(); }, [load]);

  async function create() {
    setBusy(true); setError(null);
    const res = await fetch('/api/raporlar', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ studentId, start, end }) });
    const j = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) { setError(j.error ?? 'Rapor oluşturulamadı'); return; }
    router.push(`/ogrenciler/${studentId}/raporlar/${j.id}`);
  }

  const activePreset = opts.find((o) => o.start === start && o.end === end)?.key;

  return (
    <div className="space-y-3">
      {canCreate && (
        <div className="rounded-2xl border border-violet-100 bg-white p-4 shadow-sm">
          <h3 className="mb-1 flex items-center gap-1.5 text-[15px] font-bold text-gray-900"><IconChartBar size={18} className="text-violet-600" /> Rapor oluştur</h3>
          <p className="mb-3 text-[12.5px] text-gray-500">
            Her pazartesi 08:00&apos;de geçen haftanın raporu kendiliğinden oluşur. İstediğiniz tarih aralığı için buradan da alabilirsiniz; rapor bu sayfaya kaydedilir.
          </p>
          <div className="mb-3 flex flex-wrap gap-1.5">
            {opts.map((o) => (
              <button key={o.key} type="button" onClick={() => { setStart(o.start); setEnd(o.end); }}
                className={`rounded-full px-3 py-1.5 text-[12.5px] font-semibold transition-colors ${activePreset === o.key ? 'bg-violet-600 text-white' : 'border border-gray-200 text-gray-600 hover:bg-violet-50'}`}>
                {o.label}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap items-end gap-2">
            <label className="text-[12px] font-medium text-gray-500">Başlangıç
              <input type="date" value={start} max={end} onChange={(e) => e.target.value && setStart(e.target.value)}
                className="mt-0.5 block rounded-lg border border-gray-200 px-2.5 py-2 text-[14px] text-gray-900 focus:border-violet-400 focus:outline-none" />
            </label>
            <label className="text-[12px] font-medium text-gray-500">Bitiş
              <input type="date" value={end} min={start} max={today} onChange={(e) => e.target.value && setEnd(e.target.value)}
                className="mt-0.5 block rounded-lg border border-gray-200 px-2.5 py-2 text-[14px] text-gray-900 focus:border-violet-400 focus:outline-none" />
            </label>
            <button type="button" disabled={busy} onClick={create}
              className="rounded-lg bg-violet-600 px-4 py-2.5 text-[13.5px] font-semibold text-white hover:bg-violet-700 disabled:opacity-60">
              {busy ? 'Hazırlanıyor…' : 'Raporu oluştur'}
            </button>
          </div>
          {error && <p className="mt-2 text-[12.5px] text-rose-600">{error}</p>}
        </div>
      )}

      <div className="rounded-2xl border border-gray-100 bg-white shadow-sm">
        <h3 className="border-b border-gray-100 px-4 py-3 text-[14px] font-bold text-gray-900">Kayıtlı raporlar</h3>
        {rows === null ? <p className="px-4 py-6 text-[13px] text-gray-400">Yükleniyor…</p>
          : missing ? <p className="px-4 py-6 text-[13px] text-gray-400">Raporlar henüz etkin değil (student_reports.sql çalıştırılmalı).</p>
          : rows.length === 0 ? <p className="px-4 py-6 text-[13px] text-gray-400">Henüz rapor yok. İlk otomatik rapor pazartesi 08:00&apos;de oluşur.</p>
          : (
            <ul className="divide-y divide-gray-100">
              {rows.map((r) => {
                const c = r.totals?.compliance as number | null | undefined;
                return (
                  <li key={r.id}>
                    <Link href={`/ogrenciler/${studentId}/raporlar/${r.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-violet-50/50">
                      <span className="min-w-0 flex-1">
                        <span className="block text-[13.5px] font-semibold text-gray-900">{fmt(r.period_start)} – {fmt(r.period_end)}</span>
                        <span className="block text-[12px] text-gray-500">
                          {r.kind === 'otomatik' ? '🗓️ Haftalık (otomatik)' : '✍️ Elle oluşturuldu'}
                          {r.totals ? ` · ${r.totals.questions ?? 0} soru` : ''}{r.exam_count ? ` · ${r.exam_count} deneme` : ''}
                        </span>
                      </span>
                      {c !== null && c !== undefined && (
                        <span className={`rounded-full px-2.5 py-1 text-[12px] font-bold ${c >= 80 ? 'bg-emerald-50 text-emerald-700' : c >= 50 ? 'bg-amber-50 text-amber-700' : 'bg-rose-50 text-rose-700'}`}>uyum %{c}</span>
                      )}
                      <IconChevronRight size={16} className="text-gray-300" />
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
      </div>
    </div>
  );
}
