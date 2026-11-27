/* eslint-disable @typescript-eslint/no-explicit-any */
import { fetchChunkedByIds } from '@/lib/chunked-in';
import { tasksForDay, todayTr, shiftDate, type TaskRow } from '@/lib/day-tasks';

/** Öğrenci satırı özeti: son deneme (aynı türdeki bir öncekiyle fark) ve son 7 günün (dünden geriye) program uyumu */
export type StudentSummary = {
  examType: string | null; lastNet: number | null; netDiff: number | null; examDate: string | null;
  weekDone: number; weekPlanned: number;
};

/** Sunucuda: öğrenci id'leri için özetleri hesaplar (Görüşme kayıtları listesi) */
export async function computeStudentSummaries(supabase: any, studentIds: string[]): Promise<Record<string, StudentSummary>> {
  const today = todayTr();
  // Son 7 tam gün (bugün hariç: bugünün görevleri henüz bitmemiş olabilir)
  const from = shiftDate(today, -7);
  const to = shiftDate(today, -1);
  const summaryMap: Record<string, StudentSummary> = {};
  if (studentIds.length === 0) return summaryMap;
    const [exams, logs] = await Promise.all([
      fetchChunkedByIds<any>(studentIds, (chunk) => (supabase as any).from('exams')
        .select('student_id, exam_type, exam_date, net_score').in('student_id', chunk)
        .gte('exam_date', shiftDate(today, -365)).order('exam_date', { ascending: false }).limit(5000), 25).catch(() => [] as any[]),
      fetchChunkedByIds<any>(studentIds, (chunk) => (supabase as any).from('question_logs')
        .select('id, student_id, week_start, week_end, plan_day, student_done, appointment_id, postponed_from_id, postponed_to_id').in('student_id', chunk)
        .lte('week_start', today).gte('week_start', shiftDate(from, -35)).limit(5000), 25)
        .catch(() => fetchChunkedByIds<any>(studentIds, (chunk) => (supabase as any).from('question_logs')
          .select('id, student_id, week_start, week_end, plan_day, student_done, appointment_id').in('student_id', chunk)
          .lte('week_start', today).gte('week_start', shiftDate(from, -35)).limit(5000), 25))
        .catch(() => [] as any[]),
    ]);
    const examsBy = new Map<string, any[]>();
    for (const e of exams) { if (!examsBy.has(e.student_id)) examsBy.set(e.student_id, []); examsBy.get(e.student_id)!.push(e); }
    const logsBy = new Map<string, TaskRow[]>();
    for (const l of logs) { if (!logsBy.has(l.student_id)) logsBy.set(l.student_id, []); logsBy.get(l.student_id)!.push(l); }
    for (const id of studentIds) {
      const list = examsBy.get(id) ?? []; // yeniden eskiye
      const last = list[0];
      const prev = last ? list.slice(1).find((e) => (e.exam_type ?? '') === (last.exam_type ?? '')) : undefined;
      const lastNet = last ? Math.round((Number(last.net_score) || 0) * 100) / 100 : null;
      let weekDone = 0, weekPlanned = 0;
      const rows = logsBy.get(id) ?? [];
      for (let d = from; d <= to; d = shiftDate(d, 1)) {
        const day = tasksForDay(rows, d).filter((t) => !t.postponed_from_id);
        weekPlanned += day.length;
        weekDone += day.filter((t) => t.student_done).length;
      }
      summaryMap[id] = {
        examType: last?.exam_type ?? null, lastNet, examDate: last?.exam_date ?? null,
        netDiff: last && prev ? Math.round(((Number(last.net_score) || 0) - (Number(prev.net_score) || 0)) * 100) / 100 : null,
        weekDone, weekPlanned,
      };
    }
  return summaryMap;
}
