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
  yuksek: 'bg-[#E24B4A]',
  orta: 'bg-[#EF9F27]',
  dusuk: 'bg-[#378ADD]',
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
    <div className="rounded-xl border border-gray-200 bg-white px-4 py-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-medium text-gray-900">Yapılacaklar</h2>
        <button
          onClick={() => setAdding((v) => !v)}
          className="rounded p-0.5 text-gray-400 hover:text-blue-600"
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
            className="flex-1 rounded-lg border border-gray-300 px-2.5 py-1.5 text-sm focus:border-blue-500 focus:outline-none"
          />
          <button
            onClick={addTask}
            className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700"
          >
            Ekle
          </button>
        </div>
      )}

      {pending.length === 0 && done.length === 0 ? (
        <p className="py-6 text-center text-sm text-gray-400">Yapılacak görev yok 🎉</p>
      ) : (
        <div className="divide-y divide-gray-100">
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
      className={`flex items-center gap-2.5 py-2 ${task.completed ? 'opacity-40' : ''}`}
      onClick={() => onToggle(task.id, task.completed)}
    >
      <div className={`h-2 w-2 flex-shrink-0 cursor-pointer rounded-full ${dotClass}`} />
      <span className={`flex-1 cursor-pointer text-[13px] ${task.completed ? 'line-through' : 'text-gray-900'}`}>
        {task.title}
      </span>
      {dueLabel && <span className="flex-shrink-0 text-[11px] text-gray-400">{dueLabel}</span>}
    </div>
  );
}

const QUICK_ACTIONS = [
  { href: '/gorusmeler/yeni', label: 'Görüşme ekle', icon: IconNotes },
  { href: '/denemeler/yeni', label: 'Deneme gir', icon: IconChartBar },
  { href: '/soru-takibi', label: 'Soru takibi', icon: IconCheckbox },
  { href: '/konu-ilerleyisi', label: 'Konu güncelle', icon: IconBooks },
];

export function QuickActionsCard() {
  return (
    <div className="rounded-xl border border-gray-200 bg-white px-4 py-4">
      <h2 className="mb-3 text-sm font-medium text-gray-900">Hızlı eylem</h2>
      <div className="grid grid-cols-2 gap-2">
        {QUICK_ACTIONS.map((a) => {
          const Icon = a.icon;
          return (
            <Link
              key={a.href}
              href={a.href}
              className="flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2.5 text-[13px] text-gray-700 hover:bg-gray-50"
            >
              <Icon size={16} className="text-gray-500" />
              {a.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
