'use client';
/* eslint-disable @typescript-eslint/no-explicit-any */

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { IconCheck, IconClock, IconArrowRight, IconPlus, IconX } from '@tabler/icons-react';
import { createClient } from '@/lib/supabase/client';
import type { Badge, TargetRow } from '@/lib/student-motivation';
import { subjectEmoji, dailyQuote, cheer } from './studentUi';
import { StudyLogSheet } from './StudyLogSheet';
import { PushToggle } from '@/components/PushToggle';
import { logExtraStudy, logStudy, setTaskDone, setTaskMissed, type ProgramDay, type StudyInput } from './studyApi';
import { MissedSheet } from './MissedSheet';
import { BadgesSection, StreakCard, TargetNetCard } from './Motivation';
import { StudentBoard, StudentContentCard, type FeedItem } from '@/components/feed/StudentFeed';

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
  studentId, programDay, fullName, todayLabel, todayLogs, weekTotal, weekDone, topicsDone, topicsTotal, lastExam, lastExamRank, pendingRequests,
  streak, todayQuestions, targets, badges, subjects, feed,
}: {
  studentId: string; programDay: ProgramDay | null; fullName: string; todayLabel: string; todayLogs: any[]; weekTotal: number; weekDone: number;
  topicsDone: number; topicsTotal: number; lastExam: any; lastExamRank: any; pendingRequests: number;
  streak: { current: number; best: number; studiedToday: boolean }; todayQuestions: number;
  targets: TargetRow[]; badges: Badge[]; subjects: string[]; feed: FeedItem[];
}) {
  const supabase = createClient();
  const router = useRouter();
  const params = useSearchParams();
  const tasksRef = useRef<HTMLDivElement>(null);
  const [focusTasks, setFocusTasks] = useState(false);
  const [logs, setLogs] = useState(todayLogs);
  const [celebrate, setCelebrate] = useState(0);
  // undefined: kapalı, null: plan dışı çalışma, nesne: tiklenen görev
  const [sheet, setSheet] = useState<any | null | undefined>(undefined);
  const [missedTask, setMissedTask] = useState<any | null>(null);

  // Çalışma hatırlatması bildirimi /ogrenci?gunluk=1 açar: bugünün görevlerine kaydır ve vurgula;
  // bugün görev yoksa doğrudan "plan dışı çalışma" penceresini aç.
  const gunluk = params.get('gunluk') === '1';
  useEffect(() => {
    if (!gunluk) return;
    const t = setTimeout(() => {
      tasksRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      setFocusTasks(true);
      if (todayLogs.length === 0) setSheet(null);
      router.replace('/ogrenci', { scroll: false });
    }, 150);
    const off = setTimeout(() => setFocusTasks(false), 2600);
    return () => { clearTimeout(t); clearTimeout(off); };
  }, [gunluk, todayLogs.length, router]);
  const [msg, setMsg] = useState<string | null>(null);

  function markDone(id: string, done: boolean) {
    const updated = logs.map((x) => (x.id === id ? { ...x, student_done: done, ...(done ? { student_missed: false, student_missed_note: null } : {}) } : x));
    setLogs(updated);
    if (done && updated.every((x) => x.student_done)) setCelebrate((c) => c + 1);
  }

  async function toggleDone(l: any) {
    if (!l.student_done && l.appointment_id) {
      // Ajanda'dan gelen görüşme: "ne çalıştın?" sorulmaz, doğrudan işaretlenir
      markDone(l.id, true);
      const err = await setTaskDone(supabase, l.id, true);
      if (err) { markDone(l.id, false); setMsg(err); } else setMsg(null);
      return;
    }
    if (!l.student_done) { setSheet(l); return; } // tik = "ne çalıştın?" penceresi
    markDone(l.id, false);
    const err = await setTaskDone(supabase, l.id, false);
    if (err) { markDone(l.id, true); setMsg(err); } else { setMsg(null); router.refresh(); }
  }

  const markMissed = (id: string, missed: boolean, note: string | null = null) =>
    setLogs((prev) => prev.map((x) => (x.id === id ? { ...x, student_missed: missed, student_missed_note: missed ? note : null } : x)));

  async function saveMissed(note: string) {
    const task = missedTask;
    if (!task) return null;
    const err = await setTaskMissed(supabase, task.id, true, note);
    if (err) return err;
    markMissed(task.id, true, note.trim() || null);
    setMissedTask(null); setMsg(null);
    return null;
  }

  async function clearMissed(l: any) {
    markMissed(l.id, false);
    const err = await setTaskMissed(supabase, l.id, false);
    if (err) { markMissed(l.id, true, l.student_missed_note ?? null); setMsg(err); } else setMsg(null);
  }

  async function saveStudy(input: StudyInput) {
    if (!input.taskId) {
      // Plan dışı çalışma: programa ⭐ Ekstra (yapıldı) görev olarak eklenir, böylece listede ve koçun programında görünür
      const { error, task } = await logExtraStudy(supabase, studentId, programDay, input);
      if (error) return error;
      if (task) setLogs((prev) => [...prev, task]);
      setSheet(undefined);
      setMsg(task ? 'Plan dışı çalışman bugünün görevlerine eklendi! 🌟' : 'Çalışman günlüğüne eklendi! 🌟');
      router.refresh();
      return null;
    }
    const err = await logStudy(supabase, input);
    if (err) return err;
    markDone(input.taskId, true);
    setSheet(undefined);
    setMsg(null);
    router.refresh(); // seri, rozet ve bugünkü soru sayısı yenilensin
    return null;
  }

  async function skipStudy() {
    const task = sheet;
    setSheet(undefined);
    if (!task) return;
    markDone(task.id, true);
    const err = await setTaskDone(supabase, task.id, true);
    if (err) { markDone(task.id, false); setMsg(err); } else router.refresh();
  }

  const todayDone = logs.filter((l) => l.student_done).length;
  const todayPct = logs.length > 0 ? Math.round((todayDone / logs.length) * 100) : 0;
  // Bugünkü işaretlemeleri haftalık sayıya da yansıt
  const weekDoneLive = weekDone - todayLogs.filter((l) => l.student_done).length + todayDone;
  const weekTotalLive = weekTotal - todayLogs.length + logs.length;
  const weekPct = weekTotalLive > 0 ? Math.round((weekDoneLive / weekTotalLive) * 100) : 0;
  const topicPct = topicsTotal > 0 ? Math.round((topicsDone / topicsTotal) * 100) : 0;

  return (
    <div className="space-y-5">
      {/* Karşılama kartı */}
      <PushToggle variant="banner" />

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

      {/* Seri → pano → koçun paylaştığı içerik → hedef net */}
      <StreakCard current={streak.current} best={streak.best} studiedToday={streak.studiedToday} todayQuestions={todayQuestions} />
      <StudentBoard items={feed} />
      <StudentContentCard items={feed} />
      <TargetNetCard rows={targets} />

      {msg && <p className="rounded-2xl border-2 border-[var(--accent)]/20 bg-[var(--accent-soft)] px-4 py-2.5 text-[13px] font-bold text-[var(--accent-dark)]">💬 {msg}</p>}

      {/* Bugünün görevleri */}
      <div ref={tasksRef} className={`relative scroll-mt-4 overflow-hidden rounded-[28px] border-2 bg-[var(--card)] p-4 transition-shadow duration-500 md:p-5 ${focusTasks
        ? 'border-[var(--accent)] shadow-[0_0_0_4px_rgba(139,92,246,0.25)]' : 'border-[var(--border)]'}`}>
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
            <p className="text-[13px] text-[var(--ink-muted)]">Yine de çalıştıysan aşağıdan plan dışı çalışma olarak ekleyebilirsin.</p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {logs.map((l) => {
              const done = !!l.student_done;
              const missed = !done && !!l.student_missed;
              return (
                <div key={l.id} className={`flex w-full items-center gap-2 rounded-2xl border-2 p-3 transition-all ${
                  done ? 'border-[var(--success)]/30 bg-[var(--success-soft)]' : missed ? 'border-[var(--danger)]/30 bg-[var(--danger-soft)]' : 'border-[var(--border)] bg-[var(--paper)] hover:border-[var(--accent)]/40 hover:bg-[var(--accent-soft)]'}`}>
                <button type="button" onClick={() => toggleDone(l)}
                  className="flex min-w-0 flex-1 items-center gap-3 text-left active:scale-[0.98]">
                  <span className={`flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl text-[22px] ${done ? 'bg-white' : 'bg-white shadow-sm'}`}>
                    {subjectEmoji(l.subject)}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[15px] font-bold">
                      <span className={done ? 'text-[var(--success)] line-through decoration-2' : missed ? 'text-[var(--danger)]' : 'text-[var(--ink)]'}>{l.subject}</span>
                      {l.student_added && <span className="ml-1.5 inline-block rounded-full bg-[var(--pink-soft)] px-2 py-0.5 align-middle text-[10px] font-extrabold text-[var(--pink)]">⭐ Ekstra</span>}
                    </span>
                    <span className="block text-[12.5px] font-medium text-[var(--ink-muted)]">
                      {[l.topic, l.target_count > 0 ? `${l.target_count} soru` : null].filter(Boolean).join(' · ') || 'Görev'}
                    </span>
                    {missed && <span className="block text-[12px] font-bold text-[var(--danger)]">✕ Yapmadım{l.student_missed_note ? ` · ${l.student_missed_note}` : ''}</span>}
                  </span>
                  <span className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
                    done ? 'student-pop border-[var(--success)] bg-[var(--success)] text-white' : 'border-[var(--ink-muted)]/30 bg-white text-transparent'}`}>
                    <IconCheck size={18} strokeWidth={3} />
                  </span>
                </button>
                {!l.appointment_id && !done && (
                  <button type="button" onClick={() => (missed ? clearMissed(l) : setMissedTask(l))}
                    title={missed ? '"Yapmadım" işaretini kaldır' : 'Yapmadım'} aria-label={missed ? '"Yapmadım" işaretini kaldır' : 'Yapmadım'}
                    className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full border-2 transition-colors ${missed ? 'border-[var(--danger)] bg-[var(--danger)] text-white' : 'border-[var(--ink-muted)]/30 bg-white text-[var(--ink-muted)]/60 hover:border-[var(--danger)]/50 hover:text-[var(--danger)]'}`}>
                    <IconX size={16} strokeWidth={3} />
                  </button>
                )}
                </div>
              );
            })}
          </div>
        )}

        <div className="mt-4 flex flex-wrap gap-2">
          <button type="button" onClick={() => setSheet(null)} className="inline-flex items-center gap-1 rounded-full bg-[var(--accent)] px-4 py-2 text-[13px] font-bold text-white shadow-sm transition-colors hover:bg-[var(--accent-dark)]">
            <IconPlus size={15} /> Plan dışı çalışma ekle
          </button>
          <Link href="/ogrenci/haftalik-takip" className="inline-flex items-center gap-1 rounded-full bg-[var(--accent-soft)] px-4 py-2 text-[13px] font-bold text-[var(--accent-dark)] transition-colors hover:bg-[var(--accent)] hover:text-white">
            Haftalık programım <IconArrowRight size={15} />
          </Link>
        </div>
      </div>

      {/* Özet kartları */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
        <StatCard emoji="🗓️" href="/ogrenci/haftalik-takip" bg="bg-[var(--sky-soft)]" tone="text-[#1F78BD]" bar="bg-[var(--sky)]"
          label="Bu hafta" value={`%${weekPct}`} sub={`${weekDoneLive}/${weekTotalLive} görev bitti`} pct={weekPct} />
        <StatCard emoji="📚" href="/ogrenci/konu-ilerleyisi" bg="bg-[var(--success-soft)]" tone="text-[#11815A]" bar="bg-[var(--success)]"
          label="Konular" value={`%${topicPct}`} sub={`${topicsDone}/${topicsTotal} konu tamam`} pct={topicPct} />
        <div className="col-span-2 md:col-span-1">
          <StatCard emoji="🏆" href="/ogrenci/denemeler" bg="bg-[var(--sun-soft)]" tone="text-[#B76E00]" bar="bg-[var(--sun)]"
            label="Son deneme" value={lastExam ? `${Number(lastExam.net_score).toLocaleString('tr-TR')} net` : '–'}
            sub={lastExamRank ? `Sıralaman: ${lastExamRank.rank}/${lastExamRank.total}` : lastExam ? lastExam.exam_name : 'Henüz deneme yok'} />
        </div>
      </div>

      <BadgesSection badges={badges} />

      {missedTask && (
        <MissedSheet task={missedTask} onSave={saveMissed} onClose={() => setMissedTask(null)} />
      )}

      {sheet !== undefined && (
        <StudyLogSheet task={sheet} subjects={subjects} onSave={saveStudy}
          onSkip={sheet ? skipStudy : undefined} onClose={() => setSheet(undefined)} />
      )}
    </div>
  );
}
