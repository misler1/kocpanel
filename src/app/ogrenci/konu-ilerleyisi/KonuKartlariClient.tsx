'use client';
/* eslint-disable @typescript-eslint/no-explicit-any */

import { useState } from 'react';
import { IconCheck, IconChevronDown } from '@tabler/icons-react';
import { createClient } from '@/lib/supabase/client';
import { subjectEmoji } from '../studentUi';

type Key = 'konu_tamamlandi' | 'kaynak1_sorular' | 'kaynak2_sorular' | 'kaynak3_sorular' | 'yanlislar_kontrol';
type Topic = { id: string; subject: string; topic: string } & Record<Key, boolean | null>;

const STEPS: { key: Key; label: string; emoji: string; kaynakIdx?: number }[] = [
  { key: 'konu_tamamlandi', label: 'Konu', emoji: '📖' },
  { key: 'kaynak1_sorular', label: '1. Kaynak', emoji: '1️⃣', kaynakIdx: 0 },
  { key: 'kaynak2_sorular', label: '2. Kaynak', emoji: '2️⃣', kaynakIdx: 1 },
  { key: 'kaynak3_sorular', label: '3. Kaynak', emoji: '3️⃣', kaynakIdx: 2 },
  { key: 'yanlislar_kontrol', label: 'Yanlışlar çözüldü', emoji: '🔁' },
];
const collator = new Intl.Collator('tr', { numeric: true, sensitivity: 'base' });

// Kaynak zinciri: 3 işaretlenirse 1-2, 2 işaretlenirse 1 de işaretlenir.
// İşareti kaldırma: 1 kalkarsa 2-3, 2 kalkarsa 3 de kalkar.
function applyToggle(t: Topic, key: Key): Partial<Record<Key, boolean>> {
  const turnOn = !t[key];
  const patch: Partial<Record<Key, boolean>> = { [key]: turnOn };
  if (turnOn) {
    if (key === 'kaynak3_sorular') { patch.kaynak2_sorular = true; patch.kaynak1_sorular = true; }
    if (key === 'kaynak2_sorular') patch.kaynak1_sorular = true;
  } else {
    if (key === 'kaynak1_sorular') { patch.kaynak2_sorular = false; patch.kaynak3_sorular = false; }
    if (key === 'kaynak2_sorular') patch.kaynak3_sorular = false;
  }
  return patch;
}

function doneCount(t: Topic) {
  return (['konu_tamamlandi', 'kaynak1_sorular', 'yanlislar_kontrol'] as Key[]).filter((k) => t[k]).length;
}

export function KonuKartlariClient({ initial, resources }: { initial: Topic[]; resources: Record<string, string[]> }) {
  const supabase = createClient();
  const [topics, setTopics] = useState<Topic[]>(initial);
  const [openId, setOpenId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function toggle(t: Topic, key: Key) {
    const patch = applyToggle(t, key);
    const before = t;
    setTopics((prev) => prev.map((x) => (x.id === t.id ? { ...x, ...patch } : x)));
    const { error: err } = await (supabase.from('topic_progress') as any)
      .update({ ...patch, updated_at: new Date().toISOString() }).eq('id', t.id);
    if (err) {
      setTopics((prev) => prev.map((x) => (x.id === t.id ? before : x)));
      setError('Kaydedilemedi, tekrar dene.');
    } else setError(null);
  }

  if (topics.length === 0) {
    return (
      <div className="rounded-[28px] border-2 border-[var(--border)] bg-[var(--card)] p-8 text-center">
        <div className="mb-2 text-[48px]">📚</div>
        <p className="text-[15px] font-bold text-[var(--ink)]">Koçun henüz konu eklememiş.</p>
      </div>
    );
  }

  const subjects = Array.from(new Set(topics.map((t) => t.subject))).sort(collator.compare);
  const totalDone = topics.filter((t) => doneCount(t) === 3).length;
  const totalPct = Math.round((totalDone / topics.length) * 100);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-[24px] font-extrabold tracking-tight text-[var(--ink)]">📚 Konu İlerleyişim</h1>
        <p className="text-[13px] font-medium text-[var(--ink-muted)]">Bir konuya dokun, bitirdiğin adımları işaretle.</p>
      </div>

      <div className="flex items-center gap-4 rounded-[24px] bg-gradient-to-br from-[#34D399] to-[#16A36F] p-4 text-white shadow-[0_8px_24px_rgba(22,163,111,0.25)]">
        <div className="text-[40px] leading-none">{totalPct >= 100 ? '🏅' : totalPct >= 50 ? '🌳' : totalPct > 0 ? '🌿' : '🌱'}</div>
        <div className="flex-1">
          <div className="text-[13px] font-bold text-white/85">Tamamlanan konular</div>
          <div className="text-[24px] font-extrabold leading-tight">{totalDone}/{topics.length} <span className="text-[15px] font-bold text-white/85">· %{totalPct}</span></div>
          <div className="mt-1.5 h-2.5 overflow-hidden rounded-full bg-white/30">
            <div className="h-full rounded-full bg-white transition-all duration-500" style={{ width: `${totalPct}%` }} />
          </div>
        </div>
      </div>

      {error && <p className="rounded-2xl bg-[var(--danger-soft)] px-4 py-2.5 text-[13px] font-bold text-[var(--danger)]">😕 {error}</p>}

      {subjects.map((subject) => {
        const list = topics.filter((t) => t.subject === subject).sort((a, b) => collator.compare(a.topic, b.topic));
        const subjectDone = list.filter((t) => doneCount(t) === 3).length;
        return (
          <section key={subject} className="rounded-[24px] border-2 border-[var(--border)] bg-[var(--card)] p-3.5">
            <div className="mb-3 flex items-center gap-2.5">
              <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[var(--accent-soft)] text-[20px]">{subjectEmoji(subject)}</span>
              <div className="flex-1">
                <h2 className="text-[16px] font-extrabold text-[var(--ink)]">{subject}</h2>
                <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-[var(--accent-soft)]">
                  <div className="h-full rounded-full bg-[var(--success)] transition-all duration-500" style={{ width: `${(subjectDone / list.length) * 100}%` }} />
                </div>
              </div>
              <span className="text-[12.5px] font-bold text-[var(--ink-muted)]">{subjectDone}/{list.length}</span>
            </div>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {list.map((t) => {
                const n = doneCount(t);
                const open = openId === t.id;
                const tone = n === 3 ? 'border-[var(--success)]/40 bg-[var(--success-soft)]' : n > 0 ? 'border-[var(--accent)]/30 bg-[var(--accent-soft)]' : 'border-[var(--border)] bg-[var(--paper)]';
                return (
                  <div key={t.id} className={`rounded-2xl border-2 ${tone} ${open ? 'sm:col-span-2' : ''}`}>
                    <button type="button" onClick={() => setOpenId(open ? null : t.id)} className="flex w-full items-center gap-2 px-3 py-2.5 text-left">
                      <span className="flex-1 text-[14px] font-bold text-[var(--ink)]">{t.topic}</span>
                      <span className="flex gap-1">
                        {[0, 1, 2].map((i) => (
                          <span key={i} className={`h-2.5 w-2.5 rounded-full ${i < n ? (n === 3 ? 'bg-[var(--success)]' : 'bg-[var(--accent)]') : 'bg-black/10'}`} />
                        ))}
                      </span>
                      {n === 3 ? <span className="text-[16px]">✅</span> : <IconChevronDown size={16} className={`text-[var(--ink-muted)] transition-transform ${open ? 'rotate-180' : ''}`} />}
                    </button>
                    {open && (
                      <div className="grid grid-cols-2 gap-2 border-t-2 border-black/5 p-3 sm:grid-cols-5">
                        {STEPS.map((s) => {
                          const on = !!t[s.key];
                          const name = s.kaynakIdx !== undefined ? resources[t.subject]?.[s.kaynakIdx]?.trim() : '';
                          return (
                            <button key={s.key} type="button" onClick={() => toggle(t, s.key)}
                              className={`relative flex flex-col items-center gap-1 rounded-2xl border-2 px-2 py-3 text-[12.5px] font-bold transition-all active:scale-95 ${
                                on ? 'border-[var(--success)]/50 bg-white text-[var(--success)]' : 'border-[var(--border)] bg-white text-[var(--ink-muted)] hover:border-[var(--accent)]/40'}`}>
                              {on && (
                                <span className="student-pop absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-[var(--success)] text-white">
                                  <IconCheck size={13} strokeWidth={3} />
                                </span>
                              )}
                              <span className={`text-[22px] ${on ? '' : 'opacity-50 grayscale'}`}>{s.emoji}</span>
                              <span className="text-center">{s.label}</span>
                              {name && <span className="line-clamp-2 text-center text-[10.5px] font-medium opacity-70">{name}</span>}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}
