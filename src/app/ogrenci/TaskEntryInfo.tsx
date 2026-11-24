'use client';
/* eslint-disable @typescript-eslint/no-explicit-any */

import { useCallback, useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { buildTaskEntries, entryStats, sameTopic, type TaskEntry } from '@/lib/task-entries';
import type { StudyInput } from './studyApi';

/** Öğrencinin görevlerine günlükte girilen çalışmalar (konu, soru, D/Y, süre). İşaretleme sonrası yerelde güncellenir. */
export function useTaskEntries(studentId: string) {
  const [entries, setEntries] = useState<Map<string, TaskEntry>>(new Map());
  useEffect(() => {
    (createClient() as any).from('daily_logs')
      .select('question_solved, topic_studies, archived')
      .eq('student_id', studentId).order('log_date', { ascending: false }).limit(400)
      .then(({ data }: any) => setEntries(buildTaskEntries(data ?? [])));
  }, [studentId]);

  const saved = useCallback((input: StudyInput) => {
    if (!input.taskId) return;
    const id = input.taskId;
    setEntries((m) => new Map(m).set(id, {
      topic: input.topic?.trim() ?? '', count: input.count || input.correct + input.wrong, correct: input.correct, wrong: input.wrong,
      minutes: input.minutes, pages: '', byStudent: true, byName: '',
      noNumbers: !input.count && !input.correct && !input.wrong && !input.minutes,
    }));
  }, []);
  const removed = useCallback((taskId: string) => {
    setEntries((m) => { const n = new Map(m); n.delete(taskId); return n; });
  }, []);
  return { entries, saved, removed };
}

/** Görev kartında: çalışılan konu (görevdekinden farklıysa) ve sayılar; personel girdiyse adıyla */
export function TaskEntryInfo({ entry, taskTopic }: { entry?: TaskEntry; taskTopic?: string | null }) {
  if (!entry) return null;
  const stats = entryStats(entry);
  const topic = entry.topic && !sameTopic(entry.topic, taskTopic) ? entry.topic : null;
  if (!stats && !topic) return null;
  return (
    <>
      {topic && <span className="block truncate text-[12px] font-semibold text-blue-600">📝 {topic}</span>}
      {stats && (
        <span className={`block text-[12px] font-semibold ${entry.noNumbers && !entry.count && !entry.minutes ? 'text-[var(--ink-muted)]' : 'text-blue-600'}`}>
          {stats}{!entry.byStudent && entry.byName ? <span className="font-medium text-[var(--ink-muted)]"> · {entry.byName} girdi</span> : null}
        </span>
      )}
    </>
  );
}
