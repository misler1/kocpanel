/* eslint-disable @typescript-eslint/no-explicit-any */
// Programdaki bir göreve günlükte girilen çalışma (öğrenci ya da personel): konu, soru, D/Y, süre, sayfa.
// Günlük kayıtları (daily_logs.question_solved / topic_studies) görev numarasını (task_id) taşır.

export type TaskEntry = { topic: string; count: number; correct: number; wrong: number; minutes: number; pages: string; byStudent: boolean; byName: string; noNumbers?: boolean };

export function buildTaskEntries(dailyLogs: any[]): Map<string, TaskEntry> {
  const map = new Map<string, TaskEntry>();
  for (const d of dailyLogs) {
    if (d.archived) continue;
    const all = [
      ...((d.question_solved ?? []) as any[]).map((e) => ({ ...e, _q: true })),
      ...((d.topic_studies ?? []) as any[]).map((e) => ({ ...e, _q: false })),
    ];
    for (const e of all) {
      if (!e?.task_id) continue;
      const r = map.get(e.task_id) ?? { topic: '', count: 0, correct: 0, wrong: 0, minutes: 0, pages: '', byStudent: false, byName: '' };
      if (!r.topic && e.topic) r.topic = String(e.topic).trim();
      if (e._q) { r.count += Number(e.count) || 0; r.correct += Number(e.correct) || 0; r.wrong += Number(e.wrong) || 0; }
      else r.minutes += Number(e.duration_minutes) || 0;
      if (!r.pages && e.pages) r.pages = String(e.pages);
      if (e.no_numbers) r.noNumbers = true;
      if (e.by === 'ogrenci') r.byStudent = true;
      if (!r.byName && e.by_name) r.byName = String(e.by_name);
      map.set(e.task_id, r);
    }
  }
  return map;
}

const norm = (t: string | null | undefined) => (t ?? '').trim().toLocaleLowerCase('tr');

/** Girilen konu, görevde zaten yazan konuyla aynı mı (aynıysa ayrıca gösterilmez) */
export const sameTopic = (a: string | null | undefined, b: string | null | undefined) => norm(a) === norm(b);

/** "45 soru · 30D 10Y · 40 dk · s. 45-60" */
export function entryStats(e: TaskEntry) {
  if (e.noNumbers && !e.count && !e.minutes) return 'sayı girilmedi';
  return [
    e.count ? `${e.count} soru` : null,
    e.correct || e.wrong ? `${e.correct}D ${e.wrong}Y` : null,
    e.minutes ? `${e.minutes} dk` : null,
    e.pages ? `s. ${e.pages}` : null,
  ].filter(Boolean).join(' · ');
}
