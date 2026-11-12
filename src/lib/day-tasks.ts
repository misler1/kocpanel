// Bir öğrencinin belirli bir gündeki program görevleri (öğrenci ana sayfasıyla aynı kural):
// tarihi kapsayan en güncel program haftası, o haftada plan_day = gün sırası (Pazartesi = 0). Görüşme görevleri hariç.

export type TaskRow = {
  id: string; student_id: string; subject: string; topic: string | null; resource_name: string | null;
  week_start: string; week_end: string | null; plan_day: number | null; target_count: number | null;
  topic_target_minutes: number | null; done_count: number | null; topic_done_minutes: number | null;
  student_done: boolean | null; student_missed?: boolean | null; student_missed_note?: string | null; student_missed_by?: string | null; student_added?: boolean | null; start_time: string | null; end_time: string | null; appointment_id: string | null;
};

export const weekdayIndex = (date: string) => (new Date(`${date}T12:00:00Z`).getUTCDay() + 6) % 7;

export function tasksForDay(rows: TaskRow[], date: string): TaskRow[] {
  const program = rows.filter((r) => !r.appointment_id && r.week_start <= date && (!r.week_end || date <= r.week_end));
  if (!program.length) return [];
  const week = program.reduce((max, r) => (r.week_start > max ? r.week_start : max), '');
  const day = weekdayIndex(date);
  return program
    .filter((r) => r.week_start === week && r.plan_day === day)
    .sort((a, b) => (a.start_time ?? '99').localeCompare(b.start_time ?? '99'));
}

/** Türkiye saatine göre bugün (YYYY-MM-DD) */
export const todayTr = () => new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Istanbul' });

export function shiftDate(date: string, days: number) {
  const d = new Date(`${date}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}
