'use client';
/* eslint-disable @typescript-eslint/no-explicit-any */

import { useState } from 'react';
import { IconPencil } from '@tabler/icons-react';
import { createClient } from '@/lib/supabase/client';
import type { Badge, TargetRow } from '@/lib/student-motivation';
import { TARGET_MAX } from '@/lib/student-motivation';

const fmt = (n: number) => n.toLocaleString('tr-TR', { maximumFractionDigits: 2 });

export function StreakCard({ current, best, studiedToday, todayQuestions }: {
  current: number; best: number; studiedToday: boolean; todayQuestions: number;
}) {
  const msg = current === 0
    ? 'Bugün bir çalışma kaydet, serin başlasın!'
    : studiedToday
      ? 'Bugünü de kaptın, böyle devam! 💪'
      : 'Serin devam ediyor, bugünü de ekle! ⏳';
  return (
    <div className="flex h-full flex-col rounded-[28px] bg-gradient-to-br from-[#FF8A3D] to-[#F5486B] p-4 text-white shadow-[0_10px_24px_rgba(245,72,107,0.25)]">
      <div className="flex items-center gap-3">
        <span className={`text-[40px] leading-none ${current > 0 ? 'student-float' : 'opacity-60 grayscale'}`}>🔥</span>
        <div>
          <div className="text-[28px] font-extrabold leading-none">{current} gün</div>
          <div className="text-[12.5px] font-bold text-white/85">çalışma serisi</div>
        </div>
      </div>
      <p className="mt-3 text-[13px] font-semibold text-white/95">{msg}</p>
      <div className="mt-auto flex gap-2 pt-3 text-[12px] font-bold">
        <span className="rounded-full bg-white/20 px-2.5 py-1">🏆 En uzun: {best} gün</span>
        <span className="rounded-full bg-white/20 px-2.5 py-1">📝 Bugün: {todayQuestions} soru</span>
      </div>
    </div>
  );
}

export function TargetNetCard({ rows: initialRows }: { rows: TargetRow[] }) {
  const supabase = createClient();
  const [rows, setRows] = useState(initialRows);
  const [editing, setEditing] = useState<string | null>(null);
  const [value, setValue] = useState('');
  const [error, setError] = useState<string | null>(null);

  async function save(type: string) {
    const n = value.trim() === '' ? null : Number(value.replace(',', '.'));
    if (n !== null && (!Number.isFinite(n) || n <= 0 || n > TARGET_MAX[type])) {
      setError(`Hedef 0 ile ${TARGET_MAX[type]} arasında olmalı.`); return;
    }
    const { error: err } = await (supabase as any).rpc('student_set_target_net', { p_exam_type: type, p_net: n });
    if (err) { setError(err.code === 'PGRST202' ? 'Hedef kaydı henüz etkin değil.' : err.message); return; }
    setRows((p) => p.map((r) => (r.type === type ? { ...r, target: n } : r)));
    setEditing(null); setError(null);
  }

  return (
    <div className="h-full rounded-[28px] border-2 border-[var(--border)] bg-[var(--card)] p-4">
      <h2 className="mb-3 text-[16px] font-extrabold text-[var(--ink)]">🎯 Hedef netim</h2>
      <div className="space-y-3.5">
        {rows.map((r) => {
          const pct = r.target && r.current !== null ? Math.max(0, Math.min(100, Math.round((r.current / r.target) * 100))) : 0;
          const reached = !!r.target && r.current !== null && r.current >= r.target;
          return (
            <div key={r.type}>
              <div className="mb-1 flex items-center justify-between gap-2 text-[13px] font-bold">
                <span className="text-[var(--ink)]">{r.type}</span>
                {editing === r.type ? (
                  <span className="flex items-center gap-1.5">
                    <input type="number" step="0.25" min={0} max={TARGET_MAX[r.type]} value={value} autoFocus
                      onChange={(e) => setValue(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && save(r.type)}
                      className="w-20 rounded-xl border-2 border-[var(--border)] bg-[var(--paper)] px-2 py-1 text-[13px] font-bold focus:border-[var(--accent)] focus:outline-none" />
                    <button onClick={() => save(r.type)} className="rounded-full bg-[var(--accent)] px-3 py-1 text-[12px] font-bold text-white">Kaydet</button>
                    <button onClick={() => { setEditing(null); setError(null); }} className="text-[12px] font-bold text-[var(--ink-muted)]">Vazgeç</button>
                  </span>
                ) : (
                  <button onClick={() => { setEditing(r.type); setValue(r.target ? String(r.target) : ''); }}
                    className="flex items-center gap-1 text-[var(--accent-dark)] hover:underline">
                    {r.target ? <>Hedef {fmt(r.target)} <IconPencil size={13} /></> : '+ Hedef koy'}
                  </button>
                )}
              </div>
              <div className="h-3 overflow-hidden rounded-full bg-[var(--accent-soft)]">
                <div className={`h-full rounded-full transition-all duration-500 ${reached ? 'bg-[var(--success)]' : 'bg-gradient-to-r from-[#8B5CF6] to-[#EC4899]'}`} style={{ width: `${pct}%` }} />
              </div>
              <p className="mt-1 text-[12px] font-semibold text-[var(--ink-muted)]">
                {r.current === null
                  ? 'Henüz bu türde denemen yok.'
                  : !r.target
                    ? `Son denemen: ${fmt(r.current)} net · Bir hedef koy!`
                    : reached
                      ? `Son denemen ${fmt(r.current)} net, hedefine ulaştın! 🎉 Yeni hedef koy.`
                      : `Şu an ${fmt(r.current)} net · hedefe ${fmt(r.target - r.current)} net kaldı`}
                {r.best !== null && r.current !== null && r.best > r.current && ` · rekorun ${fmt(r.best)}`}
              </p>
            </div>
          );
        })}
      </div>
      {error && <p className="mt-2 text-[12.5px] font-bold text-[var(--danger)]">{error}</p>}
    </div>
  );
}

export function BadgesSection({ badges }: { badges: Badge[] }) {
  const earned = badges.filter((b) => b.earned).length;
  return (
    <div className="rounded-[28px] border-2 border-[var(--border)] bg-[var(--card)] p-4 md:p-5">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-[18px] font-extrabold text-[var(--ink)]">🏅 Rozetlerim</h2>
        <span className="rounded-full bg-[var(--sun-soft)] px-3 py-1 text-[12px] font-bold text-[#B76E00]">{earned}/{badges.length}</span>
      </div>
      <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-4 lg:grid-cols-6">
        {badges.map((b) => (
          <div key={b.id} title={b.desc}
            className={`flex flex-col items-center rounded-2xl border-2 p-2.5 text-center ${b.earned ? 'border-[var(--sun)]/40 bg-[var(--sun-soft)]' : 'border-dashed border-[var(--border)] bg-[var(--paper)]'}`}>
            <span className={`text-[30px] leading-none ${b.earned ? '' : 'opacity-35 grayscale'}`}>{b.emoji}</span>
            <span className={`mt-1.5 text-[12px] font-extrabold leading-tight ${b.earned ? 'text-[var(--ink)]' : 'text-[var(--ink-muted)]'}`}>{b.title}</span>
            <span className="mt-0.5 text-[10.5px] font-medium leading-tight text-[var(--ink-muted)]">{b.desc}</span>
            {!b.earned && b.progress !== undefined && b.progress > 0 && (
              <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-[var(--border)]">
                <div className="h-full rounded-full bg-[var(--sun)]" style={{ width: `${b.progress}%` }} />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
