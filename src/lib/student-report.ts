/* eslint-disable @typescript-eslint/no-explicit-any */
// Veli raporu verisi: hem paylaşım linki sayfası hem veli paneli kullanır.
// Yalnızca sunucuda, erişim kontrolü yapıldıktan SONRA service_role istemcisiyle çağrılmalıdır.

import { activeDays, questionTotals, streakInfo, targetRows, trDate, type TargetRow } from './student-motivation';

export type StudentReport = {
  student: { id: string; full_name: string; kurum: string | null; sinif: string | null; track: string | null };
  coachName: string | null;
  generatedAt: string;
  week: { start: string | null; end: string | null; total: number; done: number; subjects: { subject: string; tasks: number; done: number; target: number; solved: number }[] };
  last14: { date: string; questions: number }[];
  last7: { questions: number; correct: number; wrong: number; minutes: number; activeDays: number };
  streak: { current: number; best: number };
  totalQuestions: number;
  topics: { done: number; total: number };
  exams: { name: string; type: string; date: string; net: number }[];
  targets: TargetRow[];
};

function shiftDay(date: string, days: number) {
  const d = new Date(`${date}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export async function loadStudentReport(admin: any, studentId: string): Promise<StudentReport | null> {
  const { data: student } = await admin.from('students')
    .select('id, full_name, kurum, sinif_sube, track, coach_id, target_nets').eq('id', studentId).maybeSingle();
  if (!student) return null;

  const today = trDate();
  const since = shiftDay(today, -400);
  const [{ data: coach }, { data: tasks }, { data: logs }, { data: exams }, { data: topics }] = await Promise.all([
    admin.from('profiles').select('full_name').eq('id', student.coach_id).maybeSingle(),
    admin.from('question_logs')
      .select('subject, week_start, week_end, target_count, done_count, student_done, student_done_at')
      .eq('student_id', studentId).order('week_start', { ascending: false }).limit(3000),
    admin.from('daily_logs').select('log_date, question_solved, topic_studies, archived')
      .eq('student_id', studentId).gte('log_date', since).order('log_date', { ascending: false }),
    admin.from('exams').select('exam_name, exam_type, exam_date, net_score')
      .eq('student_id', studentId).order('exam_date', { ascending: false }).limit(40),
    admin.from('topic_progress').select('konu_tamamlandi, kaynak1_sorular, yanlislar_kontrol').eq('student_id', studentId),
  ]);

  const taskList = tasks ?? [];
  const logList = (logs ?? []).filter((l: any) => !l.archived);

  // Bugünü içeren (yoksa en son) program haftası
  const cur = taskList.find((t: any) => t.week_start <= today && (!t.week_end || today <= t.week_end)) ?? taskList[0] ?? null;
  const weekTasks = cur ? taskList.filter((t: any) => t.week_start === cur.week_start) : [];
  const bySubject = new Map<string, { subject: string; tasks: number; done: number; target: number; solved: number }>();
  for (const t of weekTasks) {
    const s = bySubject.get(t.subject) ?? { subject: t.subject, tasks: 0, done: 0, target: 0, solved: 0 };
    s.tasks++;
    if (t.student_done) s.done++;
    s.target += Number(t.target_count) || 0;
    s.solved += Number(t.done_count) || 0;
    bySubject.set(t.subject, s);
  }

  const perDay = new Map<string, number>();
  let correct = 0, wrong = 0, minutes = 0;
  const weekAgo = shiftDay(today, -6);
  for (const l of logList) {
    const qs = (l.question_solved ?? []) as any[];
    const n = qs.reduce((s, q) => s + (Number(q?.count) || 0), 0);
    perDay.set(l.log_date, (perDay.get(l.log_date) ?? 0) + n);
    if (l.log_date >= weekAgo && l.log_date <= today) {
      for (const q of qs) { correct += Number(q?.correct) || 0; wrong += Number(q?.wrong) || 0; }
      for (const t of (l.topic_studies ?? []) as any[]) minutes += Number(t?.duration_minutes) || 0;
    }
  }
  const last14 = Array.from({ length: 14 }, (_, i) => {
    const date = shiftDay(today, i - 13);
    return { date, questions: perDay.get(date) ?? 0 };
  });

  const days = activeDays(logList, taskList);
  const streak = streakInfo(days, today);
  const qt = questionTotals(logList, today);
  const topicList = topics ?? [];
  const examList = exams ?? [];

  return {
    student: { id: student.id, full_name: student.full_name, kurum: student.kurum, sinif: student.sinif_sube, track: student.track },
    coachName: coach?.full_name ?? null,
    generatedAt: new Date().toISOString(),
    week: {
      start: cur?.week_start ?? null, end: cur?.week_end ?? null,
      total: weekTasks.length, done: weekTasks.filter((t: any) => t.student_done).length,
      subjects: Array.from(bySubject.values()).sort((a, b) => a.subject.localeCompare(b.subject, 'tr')),
    },
    last14,
    last7: {
      questions: last14.slice(-7).reduce((s, d) => s + d.questions, 0), correct, wrong, minutes,
      activeDays: Array.from(days).filter((d) => d >= weekAgo && d <= today).length,
    },
    streak: { current: streak.current, best: streak.best },
    totalQuestions: qt.total,
    topics: {
      done: topicList.filter((t: any) => t.konu_tamamlandi && t.kaynak1_sorular && t.yanlislar_kontrol).length,
      total: topicList.length,
    },
    exams: examList.slice(0, 10).map((e: any) => ({
      name: e.exam_name ?? 'Deneme', type: e.exam_type ?? 'TYT', date: e.exam_date, net: Number(e.net_score) || 0,
    })),
    targets: targetRows(student.track, student.target_nets ?? {}, examList),
  };
}
