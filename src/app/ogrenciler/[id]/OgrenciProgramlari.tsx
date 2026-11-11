/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { IconChevronLeft, IconChevronRight } from '@tabler/icons-react';
import { programDays, shortDate, addDays, DAY_SHORT } from '@/lib/program-days';
import { todayTr } from '@/lib/day-tasks';

type Week = { weekStart: string; weekEnd: string; logs: any[] };
const endOf = (w: Week) => w.weekEnd || addDays(w.weekStart, 6);

/** Bugünü kapsayan program; yoksa bugünden önceki en son program; o da yoksa ilk program */
function defaultIndex(weeks: Week[], today: string) {
  const cur = weeks.findIndex((w) => w.weekStart <= today && today <= endOf(w));
  if (cur >= 0) return cur;
  let last = -1;
  weeks.forEach((w, i) => { if (w.weekStart <= today) last = i; });
  return last >= 0 ? last : 0;
}

function fmt(d: string) {
  return new Date(d).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' });
}

function LogMini({ l }: { l: any }) {
  const pct = l.target_count > 0 ? Math.round((l.done_count / l.target_count) * 100) : 0;
  const timeLabel = [l.start_time?.slice(0, 5), l.end_time?.slice(0, 5)].filter(Boolean).join(' - ');
  return (
    <div className="rounded-md border border-gray-200 bg-white p-1.5">
      <div className="truncate text-[12px] font-medium text-gray-900">{l.subject}</div>
      {l.topic && <div className="truncate text-[10px] text-gray-500">{l.topic}</div>}
      {l.resource_name && <div className="truncate text-[10px] text-gray-400">{l.resource_name}</div>}
      {l.student_done && <div className="text-[10px] font-medium text-emerald-600">✓ Öğrenci yaptı</div>}
      {!l.student_done && l.student_missed && (
        <div className="text-[10px] font-medium text-red-600">✕ Öğrenci yapmadı{l.student_missed_note ? ` · ${l.student_missed_note}` : ''}</div>
      )}
      {l.student_added && !l.student_plan && <div className="text-[10px] font-medium text-blue-600">Öğrenci ekledi</div>}
      <div className="mt-1 flex justify-between text-[11px] text-gray-500">
        <span>{timeLabel}</span>
        {l.target_count > 0 && <span>{l.done_count}/{l.target_count} · %{pct}</span>}
      </div>
    </div>
  );
}

export function OgrenciProgramlari({ studentId }: { studentId: string }) {
  const supabase = createClient();
  const [weeks, setWeeks] = useState<Week[]>([]);
  const [idx, setIdx] = useState(0);
  const [loading, setLoading] = useState(true);
  const [jumpMsg, setJumpMsg] = useState('');

  useEffect(() => {
    async function load() {
      const { data } = await (supabase as any)
        .from('question_logs')
        .select('*')
        .eq('student_id', studentId)
        .order('week_start', { ascending: true }); // eskiden yeniye: ikinci program altta
      const map = new Map<string, any>();
      for (const l of data ?? []) {
        if (!map.has(l.week_start)) {
          map.set(l.week_start, { weekStart: l.week_start, weekEnd: l.week_end, logs: [] });
        }
        map.get(l.week_start).logs.push(l);
      }
      const list = Array.from(map.values()) as Week[];
      setWeeks(list);
      setIdx(defaultIndex(list, todayTr()));
      setLoading(false);
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [studentId]);

  if (loading) return <p className="text-[13px] text-gray-400">Yükleniyor...</p>;
  if (weeks.length === 0) return <p className="text-[13px] text-gray-400">Henüz haftalık program yok.</p>;

  const w = weeks[Math.min(idx, weeks.length - 1)];
  const go = (i: number) => { setJumpMsg(''); setIdx(Math.max(0, Math.min(weeks.length - 1, i))); };
  // Seçilen tarihi kapsayan program; yoksa o tarihten önceki en yakın program
  function jumpToDate(d: string) {
    if (!d) return;
    const hit = weeks.findIndex((x) => x.weekStart <= d && d <= endOf(x));
    if (hit >= 0) { go(hit); return; }
    let before = -1;
    weeks.forEach((x, i) => { if (x.weekStart <= d) before = i; });
    go(before >= 0 ? before : 0);
    setJumpMsg('Bu tarihte program yok; en yakın program gösteriliyor.');
  }
  const navBtn = 'flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-30';

  return (
    <div className="space-y-2">
      {[w].map((w) => {
        const sorted = [...w.logs].sort((a, b) =>
          (a.start_time ?? '99').localeCompare(b.start_time ?? '99')
        );
        const unscheduled = sorted.filter((l) => typeof l.plan_day !== 'number');
        // Programın başlangıç gününden itibaren, yalnızca programdaki günler
        const days = programDays(w.weekStart, w.weekEnd, w.logs);
        return (
          <div key={w.weekStart} className="rounded-xl border border-gray-200 p-3">
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <button type="button" onClick={() => go(idx - 1)} disabled={idx <= 0} className={navBtn}
                aria-label="Önceki program" title="Önceki program">
                <IconChevronLeft size={16} />
              </button>
              <select value={idx} onChange={(e) => go(Number(e.target.value))}
                className="rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-[13px] font-semibold text-gray-900 outline-none focus:border-violet-400">
                {weeks.map((x, i) => (
                  <option key={x.weekStart} value={i}>{fmt(x.weekStart)} – {fmt(endOf(x))}</option>
                ))}
              </select>
              <button type="button" onClick={() => go(idx + 1)} disabled={idx >= weeks.length - 1} className={navBtn}
                aria-label="Sonraki program" title="Sonraki program">
                <IconChevronRight size={16} />
              </button>
              <span className="text-[11px] text-gray-400">{idx + 1}/{weeks.length}</span>
              {w.logs.some((l: any) => l.student_plan) && (
                <span className="rounded-full bg-violet-100 px-2 py-0.5 text-[11px] font-semibold text-violet-700">🧑‍🎓 Öğrencinin kendi programı</span>
              )}
              <label className="ml-auto flex items-center gap-1.5 text-[11px] text-gray-500">
                Tarihe git
                <input type="date" onChange={(e) => jumpToDate(e.target.value)}
                  className="rounded-lg border border-gray-200 px-2 py-1 text-[12px] text-gray-700 outline-none focus:border-violet-400" />
              </label>
              <Link
                href={`/haftalik-takip?ogrenci=${studentId}&program=${w.weekStart}`}
                className="rounded-md border border-gray-200 px-2.5 py-1 text-[11px] font-semibold text-gray-600 hover:bg-gray-50"
              >
                Düzenle
              </Link>
            </div>
            <div className="overflow-x-auto">
              <div
                style={{ '--cols': days.length } as React.CSSProperties}
                className="grid grid-cols-1 gap-2 md:min-w-[calc(var(--cols)*110px)] md:grid-cols-[repeat(var(--cols),minmax(0,1fr))]"
              >
                {days.map(({ weekday: i, date }) => {
                  const dayLogs = sorted.filter((l) => l.plan_day === i);
                  return (
                    <div key={i} className={`rounded-lg bg-gray-50 p-2 ${dayLogs.length === 0 ? 'max-md:hidden' : ''}`}>
                      <div className="mb-2 text-[11px] font-semibold text-gray-500">
                        {DAY_SHORT[i]}{date && <span className="ml-1 font-normal text-gray-400">{shortDate(date)}</span>}
                      </div>
                      <div className="flex flex-col gap-1.5">
                        {dayLogs.length === 0 ? (
                          <p className="py-3 text-center text-[11px] text-gray-300">Boş</p>
                        ) : (
                          dayLogs.map((l) => <LogMini key={l.id} l={l} />)
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            {unscheduled.length > 0 && (
              <div className="mt-2 rounded-lg bg-gray-50 p-2">
                <p className="mb-1.5 text-[11px] font-semibold text-gray-500">Günü seçilmemiş</p>
                <div className="grid gap-1.5 sm:grid-cols-3">
                  {unscheduled.map((l) => <LogMini key={l.id} l={l} />)}
                </div>
              </div>
            )}
          </div>
        );
      })}
      {jumpMsg && <p className="text-[11px] text-amber-700">{jumpMsg}</p>}
    </div>
  );
}