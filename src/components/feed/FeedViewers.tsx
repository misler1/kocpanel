'use client';
/* eslint-disable @typescript-eslint/no-explicit-any */

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';

// Koçun paylaşım listesinde: "12 öğrenciden 8'i açtı" özeti ve tıklayınca öğrenci öğrenci izlenme listesi (feed_views.sql)

export type ViewSummary = { post_id: string; target: number; opened: number; avg_percent: number | null };
type Viewer = {
  student_id: string; full_name: string; has_account: boolean; opened_at: string | null; last_at: string | null;
  open_count: number | null; watched_seconds: number | null; duration_seconds: number | null; max_percent: number | null;
};

const dur = (s: number) => (s >= 60 ? `${Math.floor(s / 60)} dk${s % 60 ? ` ${s % 60} sn` : ''}` : `${s} sn`);
const when = (iso: string) => new Date(iso).toLocaleString('tr-TR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

export function FeedViewers({ postId, summary, timed }: { postId: string; summary?: ViewSummary; timed: boolean }) {
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<Viewer[] | null>(null);
  if (!summary) return null;

  async function toggle() {
    const next = !open;
    setOpen(next);
    if (next && !rows) {
      const { data } = await (createClient() as any).rpc('feed_post_viewers', { p_post: postId });
      setRows(data ?? []);
    }
  }

  const pct = summary.target ? Math.round((summary.opened / summary.target) * 100) : 0;
  return (
    <div className="mt-1">
      <button type="button" onClick={toggle}
        className="inline-flex items-center gap-1.5 rounded-full bg-violet-50 px-2 py-0.5 text-[11.5px] font-semibold text-violet-700 hover:bg-violet-100">
        👀 {summary.target} öğrenciden {summary.opened}&apos;i açtı
        {timed && summary.avg_percent !== null && <span className="font-medium text-violet-500">· ort. %{summary.avg_percent} izlendi</span>}
        <span className="text-violet-400">{open ? '▲' : '▼'}</span>
      </button>
      {summary.target > 0 && (
        <div className="mt-1 h-1 w-40 overflow-hidden rounded-full bg-violet-100"><div className="h-full bg-violet-500" style={{ width: `${pct}%` }} /></div>
      )}
      {open && (
        <div className="mt-1.5 rounded-lg border border-[var(--border)] bg-[var(--paper)] p-2">
          {!rows ? <p className="text-[12px] text-[var(--ink-muted)]">Yükleniyor…</p>
            : rows.length === 0 ? <p className="text-[12px] text-[var(--ink-muted)]">Öğrenci yok.</p>
            : (
              <ul className="max-h-64 space-y-1 overflow-y-auto">
                {rows.map((r) => (
                  <li key={r.student_id} className="flex items-center justify-between gap-2 text-[12px]">
                    <span className={`min-w-0 truncate ${r.opened_at ? 'font-medium text-[var(--ink)]' : 'text-[var(--ink-muted)]'}`}>
                      {r.opened_at ? '✅' : '⚪'} {r.full_name}
                    </span>
                    <span className="flex-shrink-0 text-right text-[11px] text-[var(--ink-muted)]">
                      {!r.opened_at ? (r.has_account ? 'açmadı' : 'hesabı yok')
                        : timed && r.duration_seconds
                          ? <><b className="text-[var(--ink)]">%{r.max_percent ?? 0}</b> · {dur(r.watched_seconds ?? 0)} / {dur(r.duration_seconds)} · {when(r.last_at ?? r.opened_at)}</>
                          : <>açtı{r.open_count && r.open_count > 1 ? ` (${r.open_count} kez)` : ''} · {when(r.last_at ?? r.opened_at)}</>}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          {timed && <p className="mt-1.5 text-[10.5px] text-[var(--ink-muted)]">Süre, öğrencinin gerçekten oynattığı kısımdır; ileri sarılan kısım sayılmaz.</p>}
          {!timed && <p className="mt-1.5 text-[10.5px] text-[var(--ink-muted)]">Bu site izlenen süreyi paylaşmıyor; yalnızca açılıp açılmadığı görünür.</p>}
        </div>
      )}
    </div>
  );
}
