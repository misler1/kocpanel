'use client';
/* eslint-disable @typescript-eslint/no-explicit-any */

import { useState } from 'react';
import { IconX } from '@tabler/icons-react';
import { subjectEmoji } from './studentUi';
import type { StudyInput } from './studyApi';
import { useKeyboardInset } from './useKeyboardInset';
import { SuggestInput } from '@/components/SuggestInput';

const field = 'w-full rounded-2xl border-2 border-[var(--border)] bg-[var(--paper)] px-3 py-2.5 text-[15px] font-bold text-[var(--ink)] focus:border-[var(--accent)] focus:outline-none';
const num = (v: string) => Math.max(0, Math.floor(Number(v) || 0));

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
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const kb = useKeyboardInset();

  const c = num(correct);
  const w = num(wrong);
  const total = num(count);
  const blank = total > 0 && c + w <= total ? total - c - w : null;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!task && !subject.trim()) { setError('Hangi dersi çalıştın?'); return; }
    if (total > 0 && c + w > total) { setError('Doğru + yanlış, çözdüğün soru sayısını geçemez.'); return; }
    if (!task && total === 0 && c + w === 0 && num(minutes) === 0) { setError('Soru sayısı ya da süre yaz.'); return; }
    setBusy(true); setError(null);
    const err = await onSave({
      taskId: task?.id ?? null, subject: subject.trim(), topic: topic.trim(),
      count: total || c + w, correct: c, wrong: w, minutes: num(minutes),
    });
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
            <>
              <SuggestInput options={subjects} value={subject} onChange={setSubject} placeholder="Ders (örn. TYT Matematik)" className={field} autoFocus />
              <input value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="Konu (isteğe bağlı)" className={field} />
            </>
          )}

          <label className="block">
            <span className="mb-1 block text-[13px] font-bold text-[var(--ink-muted)]">📝 Kaç soru çözdün?</span>
            <input type="number" inputMode="numeric" min={0} value={count} onChange={(e) => setCount(e.target.value)} placeholder="0" className={field} autoFocus={!!task} />
          </label>

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
        </div>

        {error && <p className="mt-3 rounded-2xl bg-[var(--danger-soft)] px-3 py-2 text-[13px] font-bold text-[var(--danger)]">{error}</p>}

        <div className="mt-5 flex flex-wrap gap-2">
          <button type="submit" disabled={busy} className="flex-1 rounded-full bg-[var(--accent)] px-5 py-3 text-[15px] font-extrabold text-white shadow-sm transition-colors hover:bg-[var(--accent-dark)] disabled:opacity-50">
            {busy ? 'Kaydediliyor…' : 'Kaydet 🚀'}
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
