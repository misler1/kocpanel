'use client';

import Link from 'next/link';
import { useState } from 'react';
import {
  IconNotes,
  IconChartBar,
  IconCheckbox,
  IconBooks,
  IconPlus,
} from '@tabler/icons-react';
import { createClient } from '@/lib/supabase/client';
import type { Task } from '@/types/database';

const PRIORITY_DOT: Record<string, string> = {
  yuksek: 'bg-[var(--danger)]',
  orta: 'bg-[var(--accent)]',
  dusuk: 'bg-[var(--track-yks)]',
};

export function TodoCard({ tasks, coachId }: { tasks: Task[]; coachId: string }) {
  const [items, setItems] = useState(tasks);
  const [newTitle, setNewTitle] = useState('');
  const [adding, setAdding] = useState(false);
  const supabase = createClient();

  async function toggleTask(id: string, done: boolean) {
    setItems((prev) => prev.map((t) => (t.id === id ? { ...t, completed: !done } : t)));
    await (supabase.from('tasks') as any).update({ completed: !done }).eq('id', id);
  }

  async function addTask() {
    if (!newTitle.trim()) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data } = await (supabase as any)
      .from('tasks')
      .insert({ coach_id: coachId, title: newTitle.trim(), priority: 'orta' })
      .select()
      .single();
    if (data) {
      setItems((prev) => [...prev, data as Task]);
      setNewTitle('');
      setAdding(false);
    }
  }

  const pending = items.filter((t) => !t.completed);
  const done = items.filter((t) => t.completed);

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] px-4 py-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-[14px] font-semibold text-[var(--ink)]">Yapılacaklar</h2>
        <button
          onClick={() => setAdding((v) => !v)}
          className="rounded-md p-1 text-[var(--ink-muted)] transition-colors hover:bg-[var(--accent-soft)] hover:text-[var(--accent-dark)]"
        >
          <IconPlus size={15} />
        </button>
      </div>

      {adding && (
        <div className="mb-3 flex gap-2">
          <input
            autoFocus
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addTask()}
            placeholder="Yeni görev..."
            className="flex-1 rounded-lg border border-[var(--border)] px-2.5 py-1.5 text-[13px] text-[var(--ink)] outline-none focus:border-[var(--accent)]"
          />
          <button
            onClick={addTask}
            className="rounded-lg bg-[var(--accent)] px-3 py-1.5 text-[12.5px] font-semibold text-white transition-colors hover:bg-[var(--accent-dark)]"
          >
            Ekle
          </button>
        </div>
      )}

      {pending.length === 0 && done.length === 0 ? (
        <p className="py-6 text-center text-[13px] text-[var(--ink-muted)]">Yapılacak görev yok 🎉</p>
      ) : (
        <div className="divide-y divide-[var(--border)]">
          {pending.map((t) => (
            <TodoRow key={t.id} task={t} onToggle={toggleTask} />
          ))}
          {done.map((t) => (
            <TodoRow key={t.id} task={t} onToggle={toggleTask} />
          ))}
        </div>
      )}
    </div>
  );
}

function TodoRow({ task, onToggle }: { task: Task; onToggle: (id: string, done: boolean) => void }) {
  const dotClass = PRIORITY_DOT[task.priority] ?? PRIORITY_DOT['orta'];
  const dueLabel = task.due_date
    ? new Date(task.due_date).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })
    : null;

  return (
    <div
      className={`flex cursor-pointer items-center gap-2.5 py-2 ${task.completed ? 'opacity-40' : ''}`}
      onClick={() => onToggle(task.id, task.completed)}
    >
      <div className={`h-2 w-2 flex-shrink-0 rounded-full ${dotClass}`} />
      <span className={`flex-1 text-[13px] ${task.completed ? 'text-[var(--ink-muted)] line-through' : 'text-[var(--ink)]'}`}>
        {task.title}
      </span>
      {dueLabel && <span className="flex-shrink-0 text-[11px] text-[var(--ink-muted)]">{dueLabel}</span>}
    </div>
  );
}

const QUICK_ACTIONS = [
  { href: '/gorusmeler/yeni', label: 'Görüşme ekle', icon: IconNotes, bg: 'bg-[var(--accent-soft)]', chip: 'bg-[var(--accent)]' },
  { href: '/denemeler/yeni', label: 'Deneme gir', icon: IconChartBar, bg: 'bg-[var(--track-lgs-soft)]', chip: 'bg-[var(--track-lgs)]' },
  { href: '/soru-takibi', label: 'Soru takibi', icon: IconCheckbox, bg: 'bg-[var(--success-soft)]', chip: 'bg-[var(--success)]' },
  { href: '/konu-ilerleyisi', label: 'Konu güncelle', icon: IconBooks, bg: 'bg-[var(--track-yks-soft)]', chip: 'bg-[var(--track-yks)]' },
];

export function QuickActionsCard() {
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] px-4 py-4">
      <h2 className="mb-3 text-[14px] font-semibold text-[var(--ink)]">Hızlı eylem</h2>
      <div className="grid grid-cols-2 gap-2">
        {QUICK_ACTIONS.map((a) => {
          const Icon = a.icon;
          return (
            <Link
              key={a.href}
              href={a.href}
              className={`flex items-center gap-2 rounded-lg ${a.bg} px-3 py-2.5 text-[12.5px] font-medium text-[var(--ink)] transition-opacity hover:opacity-80`}
            >
              <span className={`flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-md ${a.chip} text-white`}>
                <Icon size={13} />
              </span>
              {a.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}