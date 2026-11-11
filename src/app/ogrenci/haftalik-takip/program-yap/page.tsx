/* eslint-disable @typescript-eslint/no-explicit-any */
import { getStudentContext } from '@/lib/student-context';
import { addDays } from '@/lib/program-days';
import { todayTr } from '@/lib/day-tasks';
import { ProgramYapClient } from './ProgramYapClient';

export default async function ProgramYapPage() {
  const { supabase, student } = await getStudentContext();
  if (!student) return <p className="text-sm text-[var(--ink-muted)]">Öğrenci kaydı bulunamadı.</p>;

  const today = todayTr();
  const { data: logs } = await (supabase as any)
    .from('question_logs')
    .select('week_start, week_end, plan_day, subject, topic, resource_name, target_count, start_time, end_time, appointment_id, student_added, student_plan')
    .eq('student_id', student.id).is('appointment_id', null)
    .order('week_start', { ascending: false }).limit(400);
  const rows: any[] = logs ?? [];

  // Program aralıkları (başlangıca göre tekil)
  const ranges = new Map<string, { ws: string; we: string | null; coach: boolean }>();
  for (const l of rows) {
    const r = ranges.get(l.week_start) ?? { ws: l.week_start, we: l.week_end ?? null, coach: false };
    if (!l.student_plan && !l.student_added) r.coach = true;
    ranges.set(l.week_start, r);
  }
  const list = Array.from(ranges.values());
  const end = (r: { ws: string; we: string | null }) => r.we ?? addDays(r.ws, 6);
  // Bugünü kapsayan program varsa bittiği günün ertesi, yoksa bugün
  const current = list.filter((r) => r.ws <= today && end(r) >= today).sort((a, b) => (end(a) < end(b) ? 1 : -1))[0];
  const defaultStart = current ? addDays(end(current), 1) : today;

  const lastWs = rows.find((l) => !l.student_added || l.student_plan)?.week_start;
  const lastProgram = lastWs ? rows.filter((l) => l.week_start === lastWs && (!l.student_added || l.student_plan)) : [];

  return (
    <ProgramYapClient
      platformOnly={!!student.platform_only}
      track={student.track ?? 'DIGER'}
      resources={student.resources ?? {}}
      defaultStart={defaultStart}
      today={today}
      coachRanges={list.filter((r) => r.coach).map(({ ws, we }) => ({ ws, we }))}
      lastProgram={lastProgram}
    />
  );
}
