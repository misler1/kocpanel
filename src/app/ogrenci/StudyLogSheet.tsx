'use client';
/* eslint-disable @typescript-eslint/no-explicit-any */

import { useEffect, useMemo, useState } from 'react';
import { IconX } from '@tabler/icons-react';
import { subjectEmoji } from './studentUi';
import type { StudyInput } from './studyApi';
import { useKeyboardInset } from './useKeyboardInset';
import { SuggestInput } from '@/components/SuggestInput';
import { createClient } from '@/lib/supabase/client';

const field = 'w-full rounded-2xl border-2 border-[var(--border)] bg-[var(--paper)] px-3 py-2.5 text-[15px] font-bold text-[var(--ink)] focus:border-[var(--accent)] focus:outline-none';
const num = (v: string) => Math.max(0, Math.floor(Number(v) || 0));
// Hızlı seçim: yaklaşık değeri tek dokunuşla girmek için
const QUICK_COUNTS = [10, 20, 40];
const QUICK_MINUTES = [15, 30, 45, 60];
const chip = (on: boolean) => `rounded-full border-2 px-3 py-1 text-[12.5px] font-bold transition-colors ${on
  ? 'border-[var(--accent)] bg-[var(--accent)] text-white' : 'border-[var(--border)] bg-[var(--paper)] text-[var(--ink-muted)] hover:border-[var(--accent)]/50'}`;
const norm = (s: string) => s.toLocaleLowerCase('tr').replace(/^(tyt|ayt|ydt)\s+/, '').replace(/\s+/g, ' ').trim();

/**
 * "Ne çalıştın?" penceresi. task verilirse programdaki görev tiklenir ve sayılar o göreve yazılır;
 * verilmezse plan dışı çalışma olarak günlüğe eklenir.
 */
export function StudyLogSheet({ task, subjects, onSave, onSkip, onClose }: {
  task: any | null;
  subjects: string[];
  onSave: (input: StudyInput) => Promise<string | null>;
  onSkip?: () => void;
  onClose: () => void;
}) {
  const [subject, setSubject] = useState<string>(task?.subject ?? '');
  const [topic, setTopic] = useState<string>(task?.topic ?? '');
  const [count, setCount] = useState(task?.target_count > 0 ? String(task.target_count) : '');
  const [correct, setCorrect] = useState('');
  const [wrong, setWrong] = useState('');
  const [minutes, setMinutes] = useState('');
  // Öğrenci sayıları hatırlamıyorsa uydurmasın: bilerek boş bırakır
  const [forgot, setForgot] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const kb = useKeyboardInset();
  // Öğrencinin Konu İlerleyişi listesi (konu önerisi için). RLS: öğrenci yalnızca kendi konularını görür.
  const [allTopics, setAllTopics] = useState<{ subject: string; topic: string }[]>([]);
  useEffect(() => {
    (createClient() as any).from('topic_progress').select('subject, topic').limit(2000)
      .then(({ data }: any) => setAllTopics((data ?? []).filter((t: any) => t.topic)));
  }, []);

  // Seçili derse ait konular önce; ders eşleşmezse bütün konular önerilir
  const topicOptions = useMemo(() => {
    const sub = norm(subject || task?.subject || '');
    const same = sub ? allTopics.filter((t) => { const ts = norm(t.subject); return ts === sub || ts.includes(sub) || sub.includes(ts); }) : [];
    return (same.length ? same : allTopics).map((t) => t.topic);
  }, [allTopics, subject, task?.subject]);

  const c = num(correct);
  const w = num(wrong);
  const total = num(count);
  const blank = total > 0 && c + w <= total ? total - c - w : null;
  const noNumbers = total === 0 && c + w === 0 && num(minutes) === 0;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!task && !subject.trim()) { setError('Hangi dersi çalıştın?'); return; }
    if (total > 0 && c + w > total) { setError('Doğru + yanlış, çözdüğün soru sayısını geçemez.'); return; }
    setBusy(true); setError(null);
    const err = await onSave(forgot
      ? { taskId: task?.id ?? null, subject: subject.trim(), topic: topic.trim(), count: 0, correct: 0, wrong: 0, minutes: 0 }
      : { taskId: task?.id ?? null, subject: subject.trim(), topic: topic.trim(), count: total || c + w, correct: c, wrong: w, minutes: num(minutes) });
    setBusy(false);
    if (err) setError(err);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 backdrop-blur-sm sm:items-center sm:p-4" onClick={onClose}
      style={{ paddingBottom: kb.inset || undefined }}>
      <form onSubmit={submit} onClick={(e) => e.stopPropagation()}
        style={kb.height ? { maxHeight: Math.round(kb.height * 0.92) } : undefined}
        className="student-pop max-h-[92dvh] w-full overscroll-contain max-w-md overflow-y-auto rounded-t-[28px] bg-[var(--card)] p-5 shadow-2xl sm:rounded-[28px]">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--accent-soft)] text-[26px]">
              {task ? subjectEmoji(task.subject) : '✍️'}
            </span>
            <div>
              <h2 className="text-[18px] font-extrabold text-[var(--ink)]">{task ? 'Süper, bitirdin! 🎉' : 'Plan dışı çalışma'}</h2>
              <p className="text-[13px] font-semibold text-[var(--ink-muted)]">
                {task ? `${task.subject}${task.topic ? ' · ' + task.topic : ''} — ne kadar çözdün?` : 'Programında olmayan bir çalışma ekle'}
              </p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="rounded-full p-1.5 text-[var(--ink-muted)] hover:bg-[var(--paper)]"><IconX size={20} /></button>
        </div>

        <div className="space-y-3">
          {!task && (
            <SuggestInput options={subjects} value={subject} onChange={setSubject} placeholder="Ders (örn. TYT Matematik)" className={field} autoFocus />
          )}
          <label className="block">
            <span className="mb-1 block text-[13px] font-bold text-[var(--ink-muted)]">📚 Hangi konuyu çalıştın?</span>
            <SuggestInput options={topicOptions} value={topic} onChange={setTopic} placeholder="Konu adı (örn. Üslü Sayılar)" className={field} maxLength={200} />
          </label>

          <fieldset disabled={forgot} className={`space-y-3 ${forgot ? 'opacity-40' : ''}`}>
          <label className="block">
            <span className="mb-1 block text-[13px] font-bold text-[var(--ink-muted)]">📝 Kaç soru çözdün?</span>
            <input type="number" inputMode="numeric" min={0} value={count} onChange={(e) => setCount(e.target.value)} placeholder="0" className={field} autoFocus={!!task} />
          </label>
          <div className="-mt-1.5 flex flex-wrap gap-1.5">
            {QUICK_COUNTS.map((n) => (
              <button key={n} type="button" onClick={() => setCount(String(n))} className={chip(total === n)}>{n} soru</button>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <label className="block">
              <span className="mb-1 block text-[13px] font-bold text-[var(--success)]">✅ Doğru</span>
              <input type="number" inputMode="numeric" min={0} value={correct} onChange={(e) => setCorrect(e.target.value)} placeholder="0" className={field} />
            </label>
            <label className="block">
              <span className="mb-1 block text-[13px] font-bold text-[var(--danger)]">❌ Yanlış</span>
              <input type="number" inputMode="numeric" min={0} value={wrong} onChange={(e) => setWrong(e.target.value)} placeholder="0" className={field} />
            </label>
          </div>
          {blank !== null && (c > 0 || w > 0) && (
            <p className="text-[12.5px] font-semibold text-[var(--ink-muted)]">⚪ Boş: {blank}</p>
          )}

          <label className="block">
            <span className="mb-1 block text-[13px] font-bold text-[var(--ink-muted)]">⏱️ Kaç dakika çalıştın? <span className="font-medium">(isteğe bağlı)</span></span>
            <input type="number" inputMode="numeric" min={0} value={minutes} onChange={(e) => setMinutes(e.target.value)} placeholder="0" className={field} />
          </label>
          <div className="-mt-1.5 flex flex-wrap gap-1.5">
            {QUICK_MINUTES.map((n) => (
              <button key={n} type="button" onClick={() => setMinutes(String(n))} className={chip(num(minutes) === n)}>{n} dk</button>
            ))}
          </div>
          </fieldset>

          <label className="flex cursor-pointer items-center gap-2.5 rounded-2xl border-2 border-dashed border-[var(--border)] px-3 py-2.5">
            <input type="checkbox" checked={forgot} onChange={(e) => setForgot(e.target.checked)} className="h-5 w-5 accent-[var(--accent)]" />
            <span className="text-[13.5px] font-bold text-[var(--ink)]">🤷 Sayıları hatırlamıyorum</span>
          </label>
        </div>

        {noNumbers && !forgot && (
          <p className="mt-3 rounded-2xl bg-[var(--sun-soft)] px-3 py-2 text-[12.5px] font-semibold text-[#B76E00]">
            Soru sayısı ya da süre girmedin. Yaklaşık hatırlıyorsan yazman koçunun seni daha iyi takip etmesini sağlar.
          </p>
        )}

        {error && <p className="mt-3 rounded-2xl bg-[var(--danger-soft)] px-3 py-2 text-[13px] font-bold text-[var(--danger)]">{error}</p>}

        <div className="mt-5 flex flex-wrap gap-2">
          <button type="submit" disabled={busy} className="flex-1 rounded-full bg-[var(--accent)] px-5 py-3 text-[15px] font-extrabold text-white shadow-sm transition-colors hover:bg-[var(--accent-dark)] disabled:opacity-50">
            {busy ? 'Kaydediliyor…' : noNumbers || forgot ? 'Sayısız kaydet' : 'Kaydet 🚀'}
          </button>
          {onSkip && (
            <button type="button" disabled={busy} onClick={onSkip} className="rounded-full border-2 border-[var(--border)] px-5 py-3 text-[14px] font-bold text-[var(--ink-muted)] hover:bg-[var(--paper)]">
              Sadece işaretle
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
