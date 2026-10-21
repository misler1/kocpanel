'use client';
/* eslint-disable @typescript-eslint/no-explicit-any */

import { useState } from 'react';
import { IconCheck, IconX } from '@tabler/icons-react';
import { createClient } from '@/lib/supabase/client';

type Key = 'konu_tamamlandi' | 'kaynak1_sorular' | 'kaynak2_sorular' | 'kaynak3_sorular' | 'yanlislar_kontrol';
type Topic = { id: string; subject: string; topic: string } & Record<Key, boolean | null>;

const STEPS: { key: Key; label: string; kaynakIdx?: number }[] = [
  { key: 'konu_tamamlandi', label: 'Konu' },
  { key: 'kaynak1_sorular', label: '1. Kaynak', kaynakIdx: 0 },
  { key: 'kaynak2_sorular', label: '2. Kaynak', kaynakIdx: 1 },
  { key: 'kaynak3_sorular', label: '3. Kaynak', kaynakIdx: 2 },
  { key: 'yanlislar_kontrol', label: 'Yanlışlar çözüldü' },
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
    return <p className="rounded-xl border border-gray-200 bg-white p-6 text-center text-sm text-gray-500">Koçun henüz konu eklememiş.</p>;
  }

  const subjects = Array.from(new Set(topics.map((t) => t.subject))).sort(collator.compare);

  return (
    <div className="space-y-5">
      <h1 className="text-[17px] font-medium text-gray-900">Konu İlerleyişim</h1>
      {error && <p className="text-sm text-red-600">{error}</p>}

      {subjects.map((subject) => {
        const list = topics.filter((t) => t.subject === subject).sort((a, b) => collator.compare(a.topic, b.topic));
        return (
          <section key={subject}>
            <h2 className="mb-2 text-[13px] font-semibold text-gray-700">{subject}</h2>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {list.map((t) => {
                const n = doneCount(t);
                const open = openId === t.id;
                const tone = n === 3 ? 'border-emerald-300 bg-emerald-50' : n > 0 ? 'border-amber-200 bg-amber-50' : 'border-gray-200 bg-white';
                return (
                  <div key={t.id} className={`rounded-xl border ${tone} ${open ? 'sm:col-span-2' : ''}`}>
                    <button type="button" onClick={() => setOpenId(open ? null : t.id)} className="flex w-full items-center gap-2 px-3.5 py-3 text-left">
                      <span className="flex-1 text-[13px] font-medium text-gray-900">{t.topic}</span>
                      {n === 3 && <IconCheck size={16} className="text-emerald-600" />}
                      <span className="text-[11px] text-gray-400">{n}/3</span>
                    </button>
                    {open && (
                      <div className="grid grid-cols-2 gap-2 border-t border-black/5 p-3 sm:grid-cols-5">
                        {STEPS.map((s) => {
                          const on = !!t[s.key];
                          const name = s.kaynakIdx !== undefined ? resources[t.subject]?.[s.kaynakIdx]?.trim() : '';
                          return (
                            <button key={s.key} type="button" onClick={() => toggle(t, s.key)}
                              className={`flex flex-col items-center gap-1 rounded-lg border px-2 py-2.5 text-[12px] transition ${
                                on ? 'border-emerald-400 bg-emerald-100 text-emerald-800' : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'}`}>
                              {on ? <IconCheck size={16} /> : <IconX size={16} className="text-gray-300" />}
                              <span className="text-center font-medium">{s.label}</span>
                              {name && <span className="line-clamp-2 text-center text-[10px] opacity-70">{name}</span>}
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
