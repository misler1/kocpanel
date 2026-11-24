/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { addDays } from '@/lib/program-days';
import { todayTr } from '@/lib/day-tasks';

// Öğrencinin günlüklerinde yazılan konu adlarından "hangi konuyu ne kadar çalıştı" özeti.
// Kaynak: daily_logs.question_solved (soru) ve daily_logs.topic_studies (süre). Öğrenci, koç ve belletmen girişleri birlikte sayılır.

type Row = {
  subject: string; topic: string; questions: number; correct: number; wrong: number; minutes: number;
  days: Set<string>; first: string; last: string; byStudent: boolean;
};

const PERIODS: [number, string][] = [[7, 'Son 7 gün'], [30, 'Son 30 gün'], [90, 'Son 90 gün'], [0, 'Tümü']];
const key = (s: string) => s.toLocaleLowerCase('tr').replace(/\s+/g, ' ').trim();
const fmt = (d: string) => new Date(`${d}T12:00:00Z`).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', timeZone: 'UTC' });
const dur = (m: number) => (m >= 60 ? `${Math.floor(m / 60)} sa${m % 60 ? ` ${m % 60} dk` : ''}` : `${m} dk`);

export function CalisilanKonular({ studentId }: { studentId: string }) {
  const [logs, setLogs] = useState<any[] | null>(null);
  const [period, setPeriod] = useState(30);
  const [q, setQ] = useState('');
  const [showUntitled, setShowUntitled] = useState(false);

  useEffect(() => {
    (createClient() as any).from('daily_logs')
      .select('log_date, question_solved, topic_studies, archived')
      .eq('student_id', studentId).order('log_date', { ascending: false }).limit(1500)
      .then(({ data }: any) => setLogs((data ?? []).filter((l: any) => !l.archived)));
  }, [studentId]);

  const today = todayTr();
  const since = period ? addDays(today, -(period - 1)) : '';

  const { groups, untitled } = (() => {
    const map = new Map<string, Row>();
    const untitled = new Map<string, { questions: number; minutes: number }>();
    for (const l of logs ?? []) {
      if (since && l.log_date < since) continue;
      const entries = [
        ...((l.question_solved ?? []) as any[]).map((e) => ({ ...e, _q: true })),
        ...((l.topic_studies ?? []) as any[]).map((e) => ({ ...e, _q: false })),
      ];
      for (const e of entries) {
        const subject = String(e.subject ?? '').trim() || 'Ders yazılmamış';
        const topic = String(e.topic ?? '').trim();
        const count = e._q ? Number(e.count) || 0 : 0;
        const minutes = e._q ? 0 : Number(e.duration_minutes) || 0;
        if (!count && !minutes) continue;
        if (!topic) {
          const u = untitled.get(subject) ?? { questions: 0, minutes: 0 };
          u.questions += count; u.minutes += minutes;
          untitled.set(subject, u);
          continue;
        }
        const k = `${key(subject)}|${key(topic)}`;
        const r = map.get(k) ?? { subject, topic, questions: 0, correct: 0, wrong: 0, minutes: 0, days: new Set<string>(), first: l.log_date, last: l.log_date, byStudent: false };
        r.questions += count;
        r.correct += e._q ? Number(e.correct) || 0 : 0;
        r.wrong += e._q ? Number(e.wrong) || 0 : 0;
        r.minutes += minutes;
        r.days.add(l.log_date);
        if (l.log_date < r.first) r.first = l.log_date;
        if (l.log_date > r.last) { r.last = l.log_date; r.topic = topic; }
        if (e.by === 'ogrenci') r.byStudent = true;
        map.set(k, r);
      }
    }
    const needle = key(q);
    const rows = Array.from(map.values()).filter((r) => !needle || key(r.topic).includes(needle) || key(r.subject).includes(needle));
    const bySubject = new Map<string, Row[]>();
    for (const r of rows) bySubject.set(r.subject, [...(bySubject.get(r.subject) ?? []), r]);
    const groups = Array.from(bySubject.entries())
      .map(([subject, list]) => ({
        subject,
        list: list.sort((a, b) => (a.last < b.last ? 1 : a.last > b.last ? -1 : b.questions - a.questions)),
        questions: list.reduce((s, r) => s + r.questions, 0),
        minutes: list.reduce((s, r) => s + r.minutes, 0),
      }))
      .sort((a, b) => b.questions + b.minutes - (a.questions + a.minutes));
    return { groups, untitled: Array.from(untitled.entries()) };
  })();

  const topicCount = groups.reduce((s, g) => s + g.list.length, 0);
  const newSince = addDays(today, -6);

  if (logs === null) return <p className="text-[13px] text-gray-400">Yükleniyor...</p>;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex gap-1 rounded-lg bg-gray-100 p-0.5">
          {PERIODS.map(([d, label]) => (
            <button key={d} type="button" onClick={() => setPeriod(d)}
              className={`rounded-md px-2.5 py-1 text-[12px] font-medium ${period === d ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-800'}`}>
              {label}
            </button>
          ))}
        </div>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Konu ara…"
          className="min-w-0 flex-1 rounded-lg border border-gray-200 px-2.5 py-1.5 text-[12.5px] focus:border-teal-400 focus:outline-none sm:max-w-[220px]" />
        <span className="ml-auto text-[12px] text-gray-500">{topicCount} konu</span>
      </div>

      {groups.length === 0 ? (
        <p className="rounded-lg bg-gray-50 px-3 py-4 text-center text-[13px] text-gray-400">
          {q ? 'Aramaya uyan konu yok.' : 'Bu dönemde konu adı yazılmış günlük kaydı yok.'}
        </p>
      ) : (
        <div className="space-y-3">
          {groups.map((g) => (
            <div key={g.subject} className="overflow-hidden rounded-lg border border-gray-200">
              <div className="flex items-center justify-between gap-2 bg-gray-50 px-3 py-2">
                <span className="text-[13px] font-semibold text-gray-900">{g.subject}</span>
                <span className="text-[11.5px] text-gray-500">
                  {g.list.length} konu{g.questions ? ` · ${g.questions} soru` : ''}{g.minutes ? ` · ${dur(g.minutes)}` : ''}
                </span>
              </div>
              <table className="w-full text-[12.5px]">
                <thead>
                  <tr className="text-left text-[10.5px] uppercase tracking-wide text-gray-400">
                    <th className="px-3 py-1.5 font-medium">Konu</th>
                    <th className="px-2 py-1.5 text-right font-medium">Soru</th>
                    <th className="hidden px-2 py-1.5 text-right font-medium sm:table-cell">Doğruluk</th>
                    <th className="px-2 py-1.5 text-right font-medium">Süre</th>
                    <th className="hidden px-2 py-1.5 text-right font-medium sm:table-cell">Gün</th>
                    <th className="px-3 py-1.5 text-right font-medium">Son</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {g.list.map((r) => {
                    const answered = r.correct + r.wrong;
                    const acc = answered > 0 ? Math.round((r.correct / answered) * 100) : null;
                    const isNew = r.first >= newSince;
                    return (
                      <tr key={r.topic} className="text-gray-700">
                        <td className="px-3 py-1.5">
                          <span className="font-medium text-gray-900">{r.topic}</span>
                          {isNew && <span className="ml-1.5 rounded-full bg-teal-50 px-1.5 py-0.5 text-[10px] font-semibold text-teal-700">yeni</span>}
                        </td>
                        <td className="px-2 py-1.5 text-right tabular-nums">
                          {r.questions || '—'}
                          {answered > 0 && <span className="block text-[10.5px] text-gray-400">{r.correct}D {r.wrong}Y</span>}
                        </td>
                        <td className="hidden px-2 py-1.5 text-right tabular-nums sm:table-cell">
                          {acc === null ? '—' : <span className={acc >= 75 ? 'text-emerald-600' : acc >= 50 ? 'text-amber-600' : 'text-rose-600'}>%{acc}</span>}
                        </td>
                        <td className="px-2 py-1.5 text-right tabular-nums">{r.minutes ? dur(r.minutes) : '—'}</td>
                        <td className="hidden px-2 py-1.5 text-right tabular-nums sm:table-cell">{r.days.size}</td>
                        <td className="px-3 py-1.5 text-right text-gray-500">{fmt(r.last)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      )}

      {untitled.length > 0 && !q && (
        <div className="text-[12px] text-gray-500">
          <button type="button" onClick={() => setShowUntitled((v) => !v)} className="hover:underline">
            {showUntitled ? '▾' : '▸'} Konu adı yazılmamış çalışmalar
          </button>
          {showUntitled && (
            <ul className="mt-1 space-y-0.5 pl-4">
              {untitled.map(([subject, u]) => (
                <li key={subject}>{subject}: {[u.questions ? `${u.questions} soru` : null, u.minutes ? dur(u.minutes) : null].filter(Boolean).join(' · ')}</li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
