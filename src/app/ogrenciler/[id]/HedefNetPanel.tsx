'use client';
/* eslint-disable @typescript-eslint/no-explicit-any */

import { useState } from 'react';
import { IconTarget } from '@tabler/icons-react';
import { createClient } from '@/lib/supabase/client';
import { TARGET_MAX, type TargetRow } from '@/lib/student-motivation';
import { Accordion } from './OgrenciDetayClient';

const fmt = (n: number) => n.toLocaleString('tr-TR', { maximumFractionDigits: 2 });

/** Öğrenci detayında: öğrencinin hedef netleri. Öğrenci kendi panelinden, koç buradan değiştirebilir;
 *  aynı değer öğrenci panelinde ve veli raporunda görünür. */
export function HedefNetPanel({ studentId, rows: initialRows, targetNets }: {
  studentId: string; rows: TargetRow[]; targetNets: Record<string, number> | null;
}) {
  const supabase = createClient();
  const [rows, setRows] = useState(initialRows);
  const [values, setValues] = useState<Record<string, string>>(
    Object.fromEntries(initialRows.map((r) => [r.type, r.target ? String(r.target) : ''])),
  );
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function save() {
    const next: Record<string, number> = { ...(targetNets ?? {}) };
    for (const r of rows) {
      const raw = (values[r.type] ?? '').trim().replace(',', '.');
      if (raw === '') { delete next[r.type]; continue; }
      const n = Number(raw);
      if (!Number.isFinite(n) || n <= 0 || n > TARGET_MAX[r.type]) {
        setMsg({ ok: false, text: `${r.type} hedefi 0 ile ${TARGET_MAX[r.type]} arasında olmalı.` });
        return;
      }
      next[r.type] = Math.round(n * 100) / 100;
    }
    setBusy(true); setMsg(null);
    const { error } = await (supabase.from('students') as any).update({ target_nets: next }).eq('id', studentId);
    setBusy(false);
    if (error) { setMsg({ ok: false, text: 'Kaydedilemedi: ' + error.message }); return; }
    setRows((p) => p.map((r) => ({ ...r, target: next[r.type] ?? null })));
    setMsg({ ok: true, text: 'Hedefler kaydedildi.' });
  }

  return (
    <Accordion icon={<IconTarget size={16} />} title="Hedef netler">
      <p className="mb-3 text-[12.5px] text-gray-500">
        Öğrenci hedefini kendi panelinden koyabilir; buradan siz de değiştirebilirsiniz. Hedefler öğrenci panelinde
        ve veli raporunda görünür.
      </p>
      <div className="space-y-3">
        {rows.map((r) => {
          const pct = r.target && r.current !== null ? Math.max(0, Math.min(100, Math.round((r.current / r.target) * 100))) : 0;
          const reached = !!r.target && r.current !== null && r.current >= r.target;
          return (
            <div key={r.type}>
              <div className="mb-1 flex items-center gap-2 text-[13px]">
                <span className="w-10 font-medium text-gray-900">{r.type}</span>
                <input type="number" step="0.25" min={0} max={TARGET_MAX[r.type]} placeholder="Hedef yok"
                  value={values[r.type] ?? ''} onChange={(e) => setValues((p) => ({ ...p, [r.type]: e.target.value }))}
                  className="w-28 rounded-lg border border-gray-200 px-2.5 py-1.5 text-[13px] outline-none focus:border-blue-500" />
                <span className="text-[12px] text-gray-400">/ {TARGET_MAX[r.type]}</span>
                <span className="ml-auto text-[12.5px] text-gray-500">
                  {r.current === null ? 'Henüz deneme yok'
                    : `Son: ${fmt(r.current)} net${r.best !== null && r.best > r.current ? ` · en iyi ${fmt(r.best)}` : ''}`}
                </span>
              </div>
              {r.target ? (
                <div className="ml-12 h-2 overflow-hidden rounded-full bg-gray-100">
                  <div className={`h-full rounded-full ${reached ? 'bg-green-500' : 'bg-blue-500'}`} style={{ width: `${pct}%` }} />
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
      <div className="mt-4 flex items-center gap-3">
        <button type="button" onClick={save} disabled={busy}
          className="rounded-lg bg-blue-600 px-3 py-1.5 text-[13px] font-medium text-white hover:bg-blue-700 disabled:opacity-50">
          {busy ? 'Kaydediliyor…' : 'Kaydet'}
        </button>
        {msg && <span className={`text-[12.5px] ${msg.ok ? 'text-green-700' : 'text-red-600'}`}>{msg.text}</span>}
      </div>
    </Accordion>
  );
}
