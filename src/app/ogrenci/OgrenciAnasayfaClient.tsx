'use client';
/* eslint-disable @typescript-eslint/no-explicit-any */

import { useState } from 'react';
import Link from 'next/link';
import { IconCheck, IconClock, IconArrowRight } from '@tabler/icons-react';
import { createClient } from '@/lib/supabase/client';
import { subjectEmoji, dailyQuote, cheer } from './studentUi';

function getGreeting(name: string) {
  const h = new Date().getHours();
  const prefix = h < 12 ? 'Günaydın' : h < 18 ? 'İyi günler' : 'İyi akşamlar';
  return `${prefix}, ${name.split(' ')[0]}!`;
}

function StatCard({ emoji, bg, tone, bar, label, value, sub, pct, href }: {
  emoji: string; bg: string; tone: string; bar: string; label: string; value: string; sub: string; pct?: number; href: string;
}) {
  return (
    <Link href={href} className={`group block h-full rounded-3xl ${bg} p-4 transition-transform hover:-translate-y-1`}>
      <div className="mb-2 flex items-center justify-between">
        <span className="text-[26px] leading-none transition-transform group-hover:scale-110">{emoji}</span>
        <IconArrowRight size={16} className={`${tone} opacity-0 transition-opacity group-hover:opacity-100`} />
      </div>
      <div className={`text-[12.5px] font-bold ${tone}`}>{label}</div>
      <div className="text-[26px] font-extrabold leading-tight tracking-tight text-[var(--ink)]">{value}</div>
      {pct !== undefined && (
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/70">
          <div className={`h-full rounded-full ${bar} transition-all duration-500`} style={{ width: `${pct}%` }} />
        </div>
      )}
      <div className={`mt-1.5 text-[12px] font-semibold ${tone}`}>{sub}</div>
    </Link>
  );
}

const CONFETTI = ['🎉', '⭐', '🎊', '✨', '🌟', '💜'];

export function OgrenciAnasayfaClient({
  fullName, todayLabel, todayLogs, weekTotal, weekDone, topicsDone, topicsTotal, lastExam, lastExamRank, pendingRequests,
}: {
  fullName: string; todayLabel: string; todayLogs: any[]; weekTotal: number; weekDone: number;
  topicsDone: number; topicsTotal: number; lastExam: any; lastExamRank: any; pendingRequests: number;
}) {
  const supabase = createClient();
  const [logs, setLogs] = useState(todayLogs);
  const [celebrate, setCelebrate] = useState(0);

  async function toggleDone(l: any) {
    const next = !l.student_done;
    const updated = logs.map((x) => (x.id === l.id ? { ...x, student_done: next } : x));
    setLogs(updated);
    if (next && updated.every((x) => x.student_done)) setCelebrate((c) => c + 1);
    await (supabase.from('question_logs') as any)
      .update({ student_done: next, student_done_at: next ? new Date().toISOString() : null }).eq('id', l.id);
  }

  const todayDone = logs.filter((l) => l.student_done).length;
  const todayPct = logs.length > 0 ? Math.round((todayDone / logs.length) * 100) : 0;
  // Bugünkü işaretlemeleri haftalık sayıya da yansıt
  const weekDoneLive = weekDone - todayLogs.filter((l) => l.student_done).length + todayDone;
  const weekPct = weekTotal > 0 ? Math.round((weekDoneLive / weekTotal) * 100) : 0;
  const topicPct = topicsTotal > 0 ? Math.round((topicsDone / topicsTotal) * 100) : 0;

  return (
    <div className="space-y-5">
      {/* Karşılama kartı */}
      <div className="relative overflow-hidden rounded-[28px] bg-gradient-to-br from-[#8B5CF6] via-[#A855F7] to-[#EC4899] p-5 text-white shadow-[0_10px_30px_rgba(139,92,246,0.3)] md:p-6">
        <div className="pointer-events-none absolute -right-6 -top-6 h-32 w-32 rounded-full bg-white/15" />
        <div className="pointer-events-none absolute -bottom-10 right-16 h-24 w-24 rounded-full bg-white/10" />
        <div className="student-float pointer-events-none absolute right-5 top-4 text-[44px] md:right-8 md:text-[56px]">🚀</div>

        <p suppressHydrationWarning className="text-[13px] font-semibold text-white/80">
          {new Date().toLocaleDateString('tr-TR', { weekday: 'long', day: 'numeric', month: 'long' })}
        </p>
        <h1 suppressHydrationWarning className="mt-0.5 pr-16 text-[24px] font-extrabold leading-tight md:text-[28px]">
          {getGreeting(fullName)} 👋
        </h1>
        <p suppressHydrationWarning className="mt-1.5 max-w-md pr-14 text-[14px] font-medium text-white/90">{dailyQuote()}</p>

        {pendingRequests > 0 && (
          <span className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-white/20 px-3 py-1 text-[12px] font-bold backdrop-blur">
            <IconClock size={13} /> {pendingRequests} talebin koç onayı bekliyor
          </span>
        )}
      </div>

      {/* Bugünün görevleri */}
      <div className="relative overflow-hidden rounded-[28px] border-2 border-[var(--border)] bg-[var(--card)] p-4 md:p-5">
        {celebrate > 0 && (
          <div key={celebrate} className="pointer-events-none absolute inset-x-0 top-0 flex justify-around">
            {CONFETTI.map((c, i) => (
              <span key={i} className="student-confetti text-2xl" style={{ animationDelay: `${i * 0.08}s` }}>{c}</span>
            ))}
          </div>
        )}

        <div className="mb-1 flex items-center justify-between gap-2">
          <h2 className="text-[18px] font-extrabold text-[var(--ink)]">📋 Bugünün görevleri</h2>
          <span className="rounded-full bg-[var(--accent-soft)] px-3 py-1 text-[12px] font-bold text-[var(--accent-dark)]">{todayLabel}</span>
        </div>

        {logs.length > 0 && (
          <div className="mb-4">
            <div className="mb-1.5 flex items-center justify-between text-[13px] font-bold">
              <span className="text-[var(--ink-muted)]">{cheer(todayPct, logs.length)}</span>
              <span className="text-[var(--accent-dark)]">{todayDone}/{logs.length}</span>
            </div>
            <div className="h-3 overflow-hidden rounded-full bg-[var(--accent-soft)]">
              <div className="h-full rounded-full bg-gradient-to-r from-[#8B5CF6] to-[#EC4899] transition-all duration-500" style={{ width: `${todayPct}%` }} />
            </div>
          </div>
        )}

        {logs.length === 0 ? (
          <div className="py-6 text-center">
            <div className="mb-2 text-[44px]">🏖️</div>
            <p className="text-[15px] font-bold text-[var(--ink)]">Bugün planlanmış görevin yok</p>
            <p className="text-[13px] text-[var(--ink-muted)]">İstersen haftalık sayfasından kendine ekstra görev ekleyebilirsin.</p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {logs.map((l) => {
              const done = !!l.student_done;
              return (
                <button key={l.id} type="button" onClick={() => toggleDone(l)}
                  className={`flex w-full items-center gap-3 rounded-2xl border-2 p-3 text-left transition-all active:scale-[0.98] ${
                    done ? 'border-[var(--success)]/30 bg-[var(--success-soft)]' : 'border-[var(--border)] bg-[var(--paper)] hover:border-[var(--accent)]/40 hover:bg-[var(--accent-soft)]'}`}>
                  <span className={`flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl text-[22px] ${done ? 'bg-white' : 'bg-white shadow-sm'}`}>
                    {subjectEmoji(l.subject)}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className={`block text-[15px] font-bold ${done ? 'text-[var(--success)] line-through decoration-2' : 'text-[var(--ink)]'}`}>
                      {l.subject}
                    </span>
                    <span className="block text-[12.5px] font-medium text-[var(--ink-muted)]">
                      {[l.topic, l.target_count > 0 ? `${l.target_count} soru` : null].filter(Boolean).join(' · ') || 'Görev'}
                    </span>
                  </span>
                  <span className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
                    done ? 'student-pop border-[var(--success)] bg-[var(--success)] text-white' : 'border-[var(--ink-muted)]/30 bg-white text-transparent'}`}>
                    <IconCheck size={18} strokeWidth={3} />
                  </span>
                </button>
              );
            })}
          </div>
        )}

        <Link href="/ogrenci/haftalik-takip" className="mt-4 inline-flex items-center gap-1 rounded-full bg-[var(--accent-soft)] px-4 py-2 text-[13px] font-bold text-[var(--accent-dark)] transition-colors hover:bg-[var(--accent)] hover:text-white">
          Haftalık programım <IconArrowRight size={15} />
        </Link>
      </div>

      {/* Özet kartları */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
        <StatCard emoji="🗓️" href="/ogrenci/haftalik-takip" bg="bg-[var(--sky-soft)]" tone="text-[#1F78BD]" bar="bg-[var(--sky)]"
          label="Bu hafta" value={`%${weekPct}`} sub={`${weekDoneLive}/${weekTotal} görev bitti`} pct={weekPct} />
        <StatCard emoji="📚" href="/ogrenci/konu-ilerleyisi" bg="bg-[var(--success-soft)]" tone="text-[#11815A]" bar="bg-[var(--success)]"
          label="Konular" value={`%${topicPct}`} sub={`${topicsDone}/${topicsTotal} konu tamam`} pct={topicPct} />
        <div className="col-span-2 md:col-span-1">
          <StatCard emoji="🏆" href="/ogrenci/denemeler" bg="bg-[var(--sun-soft)]" tone="text-[#B76E00]" bar="bg-[var(--sun)]"
            label="Son deneme" value={lastExam ? `${Number(lastExam.net_score).toLocaleString('tr-TR')} net` : '–'}
            sub={lastExamRank ? `Sıralaman: ${lastExamRank.rank}/${lastExamRank.total}` : lastExam ? lastExam.exam_name : 'Henüz deneme yok'} />
        </div>
      </div>
    </div>
  );
}
