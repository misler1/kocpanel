/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';

const DAYS_TR = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'];

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
      <div className="mt-1 flex justify-between text-[11px] text-gray-500">
        <span>{timeLabel}</span>
        {l.target_count > 0 && <span>{l.done_count}/{l.target_count} · %{pct}</span>}
      </div>
    </div>
  );
}

export function OgrenciProgramlari({ studentId }: { studentId: string }) {
  const supabase = createClient();
  const [weeks, setWeeks] = useState<{ weekStart: string; weekEnd: string; logs: any[] }[]>([]);
  const [loading, setLoading] = useState(true);

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
      setWeeks(Array.from(map.values()));
      setLoading(false);
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [studentId]);

  if (loading) return <p className="text-[13px] text-gray-400">Yükleniyor...</p>;
  if (weeks.length === 0) return <p className="text-[13px] text-gray-400">Henüz haftalık program yok.</p>;

  return (
    <div className="space-y-4">
      {weeks.map((w) => {
        const sorted = [...w.logs].sort((a, b) =>
          (a.start_time ?? '99').localeCompare(b.start_time ?? '99')
        );
        const unscheduled = sorted.filter((l) => typeof l.plan_day !== 'number');
        return (
          <div key={w.weekStart} className="rounded-xl border border-gray-200 p-3">
            <div className="mb-3 flex items-center justify-between gap-2">
              <h3 className="text-[13px] font-semibold text-gray-900">
                {fmt(w.weekStart)} - {fmt(w.weekEnd)}
              </h3>
              <Link
                href={`/haftalik-takip?ogrenci=${studentId}&program=${w.weekStart}`}
                className="rounded-md border border-gray-200 px-2.5 py-1 text-[11px] font-semibold text-gray-600 hover:bg-gray-50"
              >
                Düzenle
              </Link>
            </div>
            <div className="overflow-x-auto">
              <div className="grid min-w-[760px] grid-cols-7 gap-2">
                {DAYS_TR.map((day, i) => {
                  const dayLogs = sorted.filter((l) => l.plan_day === i);
                  return (
                    <div key={day} className="rounded-lg bg-gray-50 p-2">
                      <div className="mb-2 text-[11px] font-semibold text-gray-500">{day}</div>
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
    </div>
  );
}