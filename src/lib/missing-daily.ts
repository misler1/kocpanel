// Koçun "Dün günlük girmeyenler" sayfası (/gunluk-eksikler) için sınıflandırma.
// Kural sabah 10:00 bildirimiyle aynıdır (supabase/gunluk_eksikler.sql):
//  - sayılmaz: hesabı olmayan / hiç giriş yapmamış, pasif, yalnızca platform, hatırlatma günlerinden o gün çıkarılmış
//  - sessize alınmış (daily_alert_muted_until >= gün) öğrenciler ayrı listede
//  - "girmedi": o gün günlük kaydı yok ve hiçbir görev işaretlenmemiş
//  - "eksik": bir şey girmiş ama o günün görevlerinden işaretlenmemiş olan var
import { tasksForDay, weekdayIndex, type TaskRow } from '@/lib/day-tasks';

export type MdStudent = {
  id: string; full_name: string; sinif_sube: string | null; profile_id: string | null;
  reminder_days: number[] | null; muted_until: string | null; mute_reason: string | null;
};

export type MdRow = { student: MdStudent; tasks: TaskRow[]; unmarked: TaskRow[]; marked: number; hasLog: boolean };

export type MdResult = {
  missing: MdRow[]; partial: MdRow[]; muted: MdStudent[]; complete: number; offDay: number; notSignedIn: number;
};

export const MUTE_FOREVER = '9999-12-31';

export function classifyMissingDaily(
  students: MdStudent[], tasks: TaskRow[], logStudentIds: Set<string>, signedIn: Set<string> | null, day: string,
): MdResult {
  const dow = weekdayIndex(day);
  const byStudent = new Map<string, TaskRow[]>();
  for (const t of tasks) {
    const list = byStudent.get(t.student_id) ?? [];
    list.push(t);
    byStudent.set(t.student_id, list);
  }
  const res: MdResult = { missing: [], partial: [], muted: [], complete: 0, offDay: 0, notSignedIn: 0 };
  for (const s of students) {
    if (!s.profile_id || (signedIn && !signedIn.has(s.id))) { res.notSignedIn++; continue; }
    if (s.reminder_days && !s.reminder_days.includes(dow)) { res.offDay++; continue; }
    if (s.muted_until && s.muted_until >= day) { res.muted.push(s); continue; }
    const dayTasks = tasksForDay(byStudent.get(s.id) ?? [], day).filter((t) => !t.student_added);
    const isMarked = (t: TaskRow) => !!t.student_done || !!t.student_missed;
    const marked = dayTasks.filter(isMarked).length;
    const unmarked = dayTasks.filter((t) => !isMarked(t));
    const hasLog = logStudentIds.has(s.id);
    const row = { student: s, tasks: dayTasks, unmarked, marked, hasLog };
    if (!hasLog && marked === 0) res.missing.push(row);
    else if (unmarked.length > 0) res.partial.push(row);
    else res.complete++;
  }
  const byName = (a: MdRow, b: MdRow) => a.student.full_name.localeCompare(b.student.full_name, 'tr');
  res.missing.sort(byName);
  res.partial.sort(byName);
  res.muted.sort((a, b) => a.full_name.localeCompare(b.full_name, 'tr'));
  return res;
}
