/* eslint-disable @typescript-eslint/no-explicit-any */
// Dönem raporu (varsayılan: son bir hafta). Her pazartesi 08:00'de otomatik üretilir; koç istediği tarih aralığı için
// de üretebilir. Üretilen rapor student_reports tablosuna kaydedilir (supabase/student_reports.sql) ve öğrenci
// sayfasında listelenir. Yalnızca sunucuda, erişim kontrolünden SONRA service_role istemcisiyle çağrılmalıdır.

import { tasksForDay, weekdayIndex, type TaskRow } from './day-tasks';
import { isTopicDone, topicStepsDone } from './topic-done';
import { TYT_SUBJECTS, AYT_SUBJECTS, LGS_SUBJECTS, calcNetYKS, calcNetLGS } from '@/app/denemeler/examConstants';

export type ReportDay = {
  date: string; weekday: number;
  planned: number; done: number; missed: number; compliance: number | null; // görev bazında uyum %
  target: number; solvedForTasks: number; // program görevlerinin hedef / çözülen soru sayısı
  questions: number; correct: number; wrong: number; minutes: number; // günlüğe girilen toplam
};

export type ReportSubject = {
  subject: string; questions: number; correct: number; wrong: number; accuracy: number | null; minutes: number;
  planned: number; done: number; target: number; solvedForTasks: number;
};

export type ReportExam = {
  name: string; type: string; date: string; net: number; prevNet: number | null; diff: number | null; puan: number | null;
  subjects: { label: string; net: number }[];
};

export type PeriodReportData = {
  version: 1;
  student: { id: string; full_name: string; sinif: string | null; track: string | null };
  coachName: string | null;
  start: string; end: string; generatedAt: string;
  days: ReportDay[];
  subjects: ReportSubject[];
  totals: {
    planned: number; done: number; missed: number; compliance: number | null; // hafta bazında uyum
    dayAvgCompliance: number | null; programDays: number; fullDays: number; // gün bazında: ortalama, programlı gün, %100 gün
    activeDays: number; target: number; solvedForTasks: number; targetRate: number | null;
    questions: number; correct: number; wrong: number; accuracy: number | null; minutes: number;
    prevQuestions: number; // bir önceki eşit uzunluktaki dönem (kıyas)
  };
  exams: ReportExam[];
  topics: {
    progressed: { subject: string; topic: string; steps: number; done: boolean }[];
    completedInPeriod: number; doneTotal: number; total: number;
  };
};

const day = (d: string, n: number) => {
  const x = new Date(`${d}T12:00:00Z`);
  x.setUTCDate(x.getUTCDate() + n);
  return x.toISOString().slice(0, 10);
};
const pct = (a: number, b: number) => (b > 0 ? Math.round((a / b) * 100) : null);
const n = (v: unknown) => Number(v) || 0;

function examSubjects(results: Record<string, { dogru?: string; yanlis?: string }> | null, type: string) {
  const defs = type === 'TYT' ? TYT_SUBJECTS : type === 'AYT' ? AYT_SUBJECTS : LGS_SUBJECTS;
  const out: { label: string; net: number }[] = [];
  for (const def of defs) {
    const v = results?.[def.key];
    if (!v || (!String(v.dogru ?? '').trim() && !String(v.yanlis ?? '').trim())) continue;
    const d = parseFloat(String(v.dogru ?? '')) || 0;
    const y = parseFloat(String(v.yanlis ?? '')) || 0;
    out.push({ label: def.label, net: Math.round((type === 'LGS' ? calcNetLGS(d, y) : calcNetYKS(d, y)) * 100) / 100 });
  }
  return out;
}

export async function buildPeriodReport(admin: any, studentId: string, start: string, end: string): Promise<PeriodReportData | null> {
  const { data: student } = await admin.from('students')
    .select('id, full_name, sinif_sube, track, coach_id, responsible_coach_id').eq('id', studentId).maybeSingle();
  if (!student) return null;

  const len = Math.round((Date.parse(`${end}T12:00:00Z`) - Date.parse(`${start}T12:00:00Z`)) / 86_400_000) + 1;
  const prevStart = day(start, -len);
  const [{ data: coach }, { data: tasks }, { data: logs }, { data: exams }, { data: topics }] = await Promise.all([
    admin.from('profiles').select('full_name').eq('id', student.responsible_coach_id ?? student.coach_id).maybeSingle(),
    // Dönemi kapsayabilecek programlar (bir program en fazla birkaç hafta sürer)
    admin.from('question_logs').select('*').eq('student_id', studentId)
      .lte('week_start', end).gte('week_start', day(start, -35)).limit(3000),
    admin.from('daily_logs').select('log_date, question_solved, topic_studies, archived')
      .eq('student_id', studentId).gte('log_date', prevStart).lte('log_date', end),
    admin.from('exams').select('exam_name, exam_type, exam_date, net_score, subject_results, tyt_puan, say_puan, ea_puan, soz_puan, lgs_puan')
      .eq('student_id', studentId).lte('exam_date', end).order('exam_date', { ascending: true }).limit(300),
    admin.from('topic_progress').select('*').eq('student_id', studentId),
  ]);

  const taskRows = (tasks ?? []) as TaskRow[];
  const logList = ((logs ?? []) as any[]).filter((l) => !l.archived);

  // Günlük kayıtları güne ve derse göre topla
  type Agg = { questions: number; correct: number; wrong: number; minutes: number };
  const perDay = new Map<string, Agg>();
  const perSubject = new Map<string, ReportSubject>();
  let prevQuestions = 0;
  const subj = (s: string) => {
    const key = (s || 'Diğer').trim();
    let r = perSubject.get(key);
    if (!r) { r = { subject: key, questions: 0, correct: 0, wrong: 0, accuracy: null, minutes: 0, planned: 0, done: 0, target: 0, solvedForTasks: 0 }; perSubject.set(key, r); }
    return r;
  };
  for (const l of logList) {
    const qs = (l.question_solved ?? []) as any[];
    if (l.log_date < start) { prevQuestions += qs.reduce((s, q) => s + n(q?.count), 0); continue; }
    const a = perDay.get(l.log_date) ?? { questions: 0, correct: 0, wrong: 0, minutes: 0 };
    for (const q of qs) {
      a.questions += n(q?.count); a.correct += n(q?.correct); a.wrong += n(q?.wrong);
      const s = subj(q?.subject); s.questions += n(q?.count); s.correct += n(q?.correct); s.wrong += n(q?.wrong);
    }
    for (const t of (l.topic_studies ?? []) as any[]) {
      a.minutes += n(t?.duration_minutes);
      subj(t?.subject).minutes += n(t?.duration_minutes);
    }
    perDay.set(l.log_date, a);
  }

  // Gün gün program uyumu
  const days: ReportDay[] = [];
  for (let d = start; d <= end; d = day(d, 1)) {
    const list = tasksForDay(taskRows, d);
    const done = list.filter((t) => t.student_done).length;
    const missed = list.filter((t) => !t.student_done && t.student_missed).length;
    const a = perDay.get(d) ?? { questions: 0, correct: 0, wrong: 0, minutes: 0 };
    let target = 0, solved = 0;
    for (const t of list) {
      target += n(t.target_count);
      // Görev "yaptı" işaretliyse girilen soru sayısı (girilmediyse hedef kadar çözülmüş sayılır)
      solved += t.student_done ? (n(t.done_count) || n(t.target_count)) : 0;
      const s = subj(t.subject);
      s.planned++; if (t.student_done) s.done++;
      s.target += n(t.target_count); if (t.student_done) s.solvedForTasks += n(t.done_count) || n(t.target_count);
    }
    days.push({
      date: d, weekday: weekdayIndex(d), planned: list.length, done, missed, compliance: pct(done, list.length),
      target, solvedForTasks: solved, ...a,
    });
  }

  const subjects = Array.from(perSubject.values())
    .map((s) => ({ ...s, accuracy: pct(s.correct, s.correct + s.wrong) }))
    .filter((s) => s.questions || s.minutes || s.planned)
    .sort((a, b) => b.questions - a.questions || b.planned - a.planned);

  const sum = (k: keyof ReportDay) => days.reduce((s, d) => s + n(d[k]), 0);
  const programDays = days.filter((d) => d.planned > 0);
  const totals = {
    planned: sum('planned'), done: sum('done'), missed: sum('missed'),
    compliance: pct(sum('done'), sum('planned')),
    dayAvgCompliance: programDays.length ? Math.round(programDays.reduce((s, d) => s + (d.compliance ?? 0), 0) / programDays.length) : null,
    programDays: programDays.length,
    fullDays: programDays.filter((d) => d.compliance === 100).length,
    activeDays: days.filter((d) => d.questions > 0 || d.minutes > 0 || d.done > 0).length,
    target: sum('target'), solvedForTasks: sum('solvedForTasks'), targetRate: pct(sum('solvedForTasks'), sum('target')),
    questions: sum('questions'), correct: sum('correct'), wrong: sum('wrong'),
    accuracy: pct(sum('correct'), sum('correct') + sum('wrong')), minutes: sum('minutes'),
    prevQuestions,
  };

  // Dönemdeki denemeler (aynı türdeki bir önceki denemeyle kıyas)
  const examList = (exams ?? []) as any[];
  const reportExams: ReportExam[] = [];
  examList.forEach((e, i) => {
    if (e.exam_date < start) return;
    const type = e.exam_type ?? 'TYT';
    const prev = [...examList.slice(0, i)].reverse().find((p) => (p.exam_type ?? 'TYT') === type);
    const net = Math.round(n(e.net_score) * 100) / 100;
    const prevNet = prev ? Math.round(n(prev.net_score) * 100) / 100 : null;
    const puan = n(type === 'LGS' ? e.lgs_puan : type === 'TYT' ? e.tyt_puan : e.say_puan || e.ea_puan || e.soz_puan) || null;
    reportExams.push({
      name: e.exam_name ?? 'Deneme', type, date: e.exam_date, net, prevNet,
      diff: prevNet === null ? null : Math.round((net - prevNet) * 100) / 100, puan,
      subjects: examSubjects(e.subject_results, type),
    });
  });

  // Dönemde ilerleyen konular (adımı değişenler)
  const topicList = (topics ?? []) as any[];
  const inPeriod = (iso: string | null | undefined) => !!iso && iso.slice(0, 10) >= start && iso.slice(0, 10) <= end;
  const progressed = topicList
    .filter((t) => inPeriod(t.steps_updated_at ?? t.updated_at) && topicStepsDone(t) > 0)
    .map((t) => ({ subject: t.subject, topic: t.topic, steps: topicStepsDone(t), done: isTopicDone(t) }))
    .sort((a, b) => a.subject.localeCompare(b.subject, 'tr') || b.steps - a.steps);

  return {
    version: 1,
    student: { id: student.id, full_name: student.full_name, sinif: student.sinif_sube, track: student.track },
    coachName: coach?.full_name ?? null,
    start, end, generatedAt: new Date().toISOString(),
    days, subjects, totals, exams: reportExams,
    topics: {
      progressed: progressed.slice(0, 80),
      completedInPeriod: progressed.filter((t) => t.done).length,
      doneTotal: topicList.filter((t) => isTopicDone(t)).length,
      total: topicList.length,
    },
  };
}

/** Pazartesi 08:00 raporunun dönemi: bir önceki pazartesi – pazar */
export function lastWeekRange(today: string) {
  const wd = weekdayIndex(today); // pazartesi = 0
  const thisMonday = day(today, -wd);
  return { start: day(thisMonday, -7), end: day(thisMonday, -1) };
}
