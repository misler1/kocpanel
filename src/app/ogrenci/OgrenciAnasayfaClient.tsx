'use client';
/* eslint-disable @typescript-eslint/no-explicit-any */

import { useState } from 'react';
import Link from 'next/link';
import {
  IconCheck, IconUser, IconCalendar, IconChartBar, IconBooks, IconClock,
} from '@tabler/icons-react';
import { createClient } from '@/lib/supabase/client';

function getGreeting(name: string) {
  const h = new Date().getHours();
  const prefix = h < 12 ? 'Günaydın' : h < 18 ? 'İyi günler' : 'İyi akşamlar';
  return `${prefix}, ${name.split(' ')[0]} 👋`;
}

function StatCard({ icon, bg, border, chipBg, tone, label, value, sub }: {
  icon: React.ReactNode; bg: string; border: string; chipBg: string; tone: string; label: string; value: string; sub: string;
}) {
  return (
    <div className={`rounded-xl border ${border} ${bg} px-3.5 py-3.5 md:px-4 md:py-4`}>
      <div className="mb-2.5 flex items-center gap-2">
        <span className={`flex h-7 w-7 items-center justify-center rounded-lg ${chipBg} text-white`}>{icon}</span>
        <span className={`text-[12.5px] font-medium ${tone}`}>{label}</span>
      </div>
      <div className="text-[24px] font-semibold tracking-tight text-[var(--ink)]">{value}</div>
      <div className={`mt-1 text-[12.5px] font-medium ${tone}`}>{sub}</div>
    </div>
  );
}

const QUICK_LINKS = [
  { href: '/ogrenci/haftalik-takip', label: 'Haftalık Takip', icon: IconCalendar },
  { href: '/ogrenci/denemeler', label: 'Denemeler', icon: IconChartBar },
  { href: '/ogrenci/konu-ilerleyisi', label: 'Konu İlerleyişi', icon: IconBooks },
  { href: '/ogrenci/bilgilerim', label: 'Bilgilerim', icon: IconUser },
];

export function OgrenciAnasayfaClient({
  fullName, todayLabel, todayLogs, weekTotal, weekDone, topicsDone, topicsTotal, lastExam, lastExamRank, pendingRequests,
}: {
  fullName: string; todayLabel: string; todayLogs: any[]; weekTotal: number; weekDone: number;
  topicsDone: number; topicsTotal: number; lastExam: any; lastExamRank: any; pendingRequests: number;
}) {
  const supabase = createClient();
  const [logs, setLogs] = useState(todayLogs);

  async function toggleDone(l: any) {
    const next = !l.student_done;
    setLogs((prev) => prev.map((x) => (x.id === l.id ? { ...x, student_done: next } : x)));
    await (supabase.from('question_logs') as any)
      .update({ student_done: next, student_done_at: next ? new Date().toISOString() : null }).eq('id', l.id);
  }

  const weekPct = weekTotal > 0 ? Math.round((weekDone / weekTotal) * 100) : 0;
  const topicPct = topicsTotal > 0 ? Math.round((topicsDone / topicsTotal) * 100) : 0;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-[20px] font-semibold tracking-tight text-[var(--ink)]">{getGreeting(fullName)}</h1>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <span className="text-[13px] text-[var(--ink-muted)]">
            {new Date().toLocaleDateString('tr-TR', { weekday: 'long', day: 'numeric', month: 'long' })}
          </span>
          {pendingRequests > 0 && (
            <span className="inline-flex items-center gap-1 rounded-full bg-[var(--accent-soft)] px-2.5 py-1 text-[12px] font-medium text-[var(--accent-dark)]">
              <IconClock size={12} /> {pendingRequests} talebin koç onayı bekliyor
            </span>
          )}
        </div>
      </div>

      <div className="mb-4 grid grid-cols-2 gap-2.5 md:grid-cols-4 md:gap-3">
        <StatCard icon={<IconCheck size={15} />} bg="bg-[var(--success-soft)]" border="border-[var(--success)]/15" chipBg="bg-[var(--success)]" tone="text-[var(--success)]"
          label="Bugünün görevi" value={`${logs.filter((l) => l.student_done).length}/${logs.length}`} sub={logs.length ? 'Tamamlanan' : 'Bugün görev yok'} />
        <StatCard icon={<IconCalendar size={15} />} bg="bg-[var(--accent-soft)]" border="border-[var(--accent)]/15" chipBg="bg-[var(--accent)]" tone="text-[var(--accent-dark)]"
          label="Bu hafta" value={`%${weekPct}`} sub={`${weekDone}/${weekTotal} görev`} />
        <StatCard icon={<IconBooks size={15} />} bg="bg-[var(--track-lgs-soft)]" border="border-[var(--track-lgs)]/15" chipBg="bg-[var(--track-lgs)]" tone="text-[var(--track-lgs)]"
          label="Konu ilerleyişi" value={`%${topicPct}`} sub={`${topicsDone}/${topicsTotal} konu`} />
        <StatCard icon={<IconChartBar size={15} />} bg="bg-[var(--track-yks-soft)]" border="border-[var(--track-yks)]/15" chipBg="bg-[var(--track-yks)]" tone="text-[var(--track-yks)]"
          label="Son deneme" value={lastExam ? `${Number(lastExam.net_score).toLocaleString('tr-TR')} net` : '–'}
          sub={lastExamRank ? `Sıra ${lastExamRank.rank}/${lastExamRank.total}` : 'Henüz deneme yok'} />
      </div>

      <div className="mb-4 rounded-xl border border-[var(--border)] bg-[var(--card)] px-4 py-4">
        <h2 className="mb-3 text-[14px] font-semibold text-[var(--ink)]">Bugün · {todayLabel}</h2>
        {logs.length === 0 ? (
          <p className="text-[13px] text-[var(--ink-muted)]">Bugün için planlanmış bir görevin yok.</p>
        ) : (
          <div className="space-y-2">
            {logs.map((l) => {
              const done = !!l.student_done;
              return (
                <button key={l.id} type="button" onClick={() => toggleDone(l)}
                  className={`flex w-full items-start gap-2 rounded-lg border p-2.5 text-left transition ${
                    done ? 'border-[var(--success)]/30 bg-[var(--success-soft)]' : 'border-[var(--border)] bg-[var(--paper)] hover:bg-[var(--border)]/30'}`}>
                  <span className={`mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full border ${
                    done ? 'border-[var(--success)] bg-[var(--success)] text-white' : 'border-[var(--ink-muted)]/40 text-transparent'}`}>
                    <IconCheck size={13} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className={`block text-[13px] font-medium ${done ? 'text-[var(--success)]' : 'text-[var(--ink)]'}`}>
                      {l.subject}{l.target_count > 0 && ` · ${l.target_count} soru`}
                    </span>
                    {l.topic && <span className="block text-[11px] text-[var(--ink-muted)]">{l.topic}</span>}
                  </span>
                </button>
              );
            })}
          </div>
        )}
        <Link href="/ogrenci/haftalik-takip" className="mt-3 inline-block text-[12px] font-medium text-[var(--accent-dark)] hover:underline">
          Haftalık programı gör →
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-2.5 md:grid-cols-4">
        {QUICK_LINKS.map((q) => {
          const Icon = q.icon;
          return (
            <Link key={q.href} href={q.href}
              className="flex flex-col items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--card)] px-3 py-4 text-center transition-colors hover:bg-[var(--paper)]">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--accent-soft)] text-[var(--accent-dark)]"><Icon size={18} /></span>
              <span className="text-[12.5px] font-medium text-[var(--ink)]">{q.label}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
