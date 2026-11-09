'use client';
/* eslint-disable @typescript-eslint/no-explicit-any */

import { useState } from 'react';
import { IconX } from '@tabler/icons-react';
import { subjectEmoji } from './studentUi';

const REASONS = ['Vaktim yetmedi', 'Hastaydım', 'Okulda yoğundu', 'Konuyu anlamadım', 'Unuttum'];

/** "Yapmadım" penceresi: neden isteğe bağlı, koçuna iletilir. */
export function MissedSheet({ task, onSave, onClose }: {
  task: any;
  onSave: (note: string) => Promise<string | null>;
  onClose: () => void;
}) {
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setBusy(true); setError(null);
    const err = await onSave(note);
    setBusy(false);
    if (err) setError(err);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 backdrop-blur-sm sm:items-center sm:p-4" onClick={() => !busy && onClose()}>
      <div onClick={(e) => e.stopPropagation()} className="student-pop w-full max-w-md space-y-3 rounded-t-[28px] bg-[var(--card)] p-5 shadow-2xl sm:rounded-[28px]">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--danger-soft)] text-[26px]">{subjectEmoji(task.subject)}</span>
            <div>
              <h2 className="text-[18px] font-extrabold text-[var(--ink)]">Bu görevi yapamadın mı?</h2>
              <p className="text-[13px] font-semibold text-[var(--ink-muted)]">{task.subject}{task.topic ? ` · ${task.topic}` : ''} — sorun değil, koçun bilsin 💙</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="rounded-full p-1.5 text-[var(--ink-muted)] hover:bg-[var(--paper)]"><IconX size={20} /></button>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {REASONS.map((r) => (
            <button key={r} type="button" onClick={() => setNote(r)}
              className={`rounded-full border-2 px-3 py-1.5 text-[12.5px] font-bold transition-colors ${note === r ? 'border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent-dark)]' : 'border-[var(--border)] text-[var(--ink-muted)] hover:bg-[var(--paper)]'}`}>
              {r}
            </button>
          ))}
        </div>
        <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} maxLength={300}
          placeholder="Nedenini yazabilirsin (isteğe bağlı)"
          className="w-full rounded-2xl border-2 border-[var(--border)] bg-[var(--paper)] px-3 py-2 text-[14px] focus:border-[var(--accent)] focus:outline-none" />

        {error && <p className="rounded-2xl bg-[var(--danger-soft)] px-3 py-2 text-[13px] font-bold text-[var(--danger)]">{error}</p>}

        <div className="flex gap-2">
          <button type="button" disabled={busy} onClick={submit}
            className="flex-1 rounded-full bg-[var(--danger)] px-5 py-3 text-[15px] font-extrabold text-white shadow-sm disabled:opacity-50">
            {busy ? 'Kaydediliyor…' : 'Yapmadım olarak işaretle'}
          </button>
          <button type="button" disabled={busy} onClick={onClose} className="rounded-full border-2 border-[var(--border)] px-5 py-3 text-[14px] font-bold text-[var(--ink-muted)]">Vazgeç</button>
        </div>
      </div>
    </div>
  );
}
