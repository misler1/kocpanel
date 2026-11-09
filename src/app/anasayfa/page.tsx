/* eslint-disable @typescript-eslint/no-explicit-any */
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { getRequestUser, getRequestScope } from '@/lib/supabase/request-cache';
import { applyStudentScope } from '@/lib/effective-coach';
import { fetchChunkedByIds } from '@/lib/chunked-in';
import { activeDays, shiftDay, trDate } from '@/lib/student-motivation';
import { AnasayfaClient, type DashStudent, type DashMeeting, type DashExam } from './AnasayfaClient';
import { BelletmenAnasayfa, type BelletmenStudent } from './BelletmenAnasayfa';
import { getStaffAccess } from '@/lib/staff-access';
import { tasksForDay, type TaskRow } from '@/lib/day-tasks';

// Koç ana sayfası: "Bugün kimle ilgilenmeliyim?" sorusunun cevabı. Her aktif öğrenci için bu haftanın
// programı, son çalışma günü, son deneme ve son öğrenci görüşmesi tek satırda özetlenir.

/** Türkiye saatine göre bu haftanın pazartesisi (YYYY-MM-DD) */
function mondayOf(today: string) {
  const dow = new Date(`${today}T12:00:00Z`).getUTCDay(); // 0 = pazar
  return shiftDay(today, dow === 0 ? -6 : 1 - dow);
}

const isPast = (iso: string) => new Date(iso).getTime() <= Date.now();

const daysBetween = (from: string, to: string) =>
  Math.round((new Date(`${to}T12:00:00Z`).getTime() - new Date(`${from}T12:00:00Z`).getTime()) / 86_400_000);

export default async function AnasayfaPage() {
  const supabase = await createClient();
  const user = await getRequestUser();
  if (!user) redirect('/giris');

  const today = trDate();
  const monday = mondayOf(today);
  const sunday = shiftDay(monday, 6);

  const { data: profile } = await (supabase as any).from('profiles').select('full_name, is_admin').eq('id', user.id).single();

  const includeInterns = (await cookies()).get('show_interns')?.value === '1';
  const scope = await getRequestScope(user.id, includeInterns);
  // Belletmen: sade ana sayfa (hızlı giriş kartları + öğrenci kartları)
  const access = await getStaffAccess(supabase, user.id);
  if (access.kind === 'belletmen') {
    const { data: bs } = await applyStudentScope(
      (supabase as any).from('students').select('id, full_name, sinif_sube').neq('status', 'pasif').order('full_name'),
      scope
    );
    const list = (bs as any[]) ?? [];
    const tasks = list.length
      ? await fetchChunkedByIds<TaskRow>(list.map((s) => s.id), (chunk) =>
          (supabase as any).from('question_logs')
            .select('id, student_id, subject, topic, resource_name, week_start, week_end, plan_day, target_count, topic_target_minutes, done_count, topic_done_minutes, student_done, start_time, end_time, appointment_id')
            .in('student_id', chunk).lte('week_start', today).gte('week_start', shiftDay(today, -21)))
      : [];
    const byStudent = new Map<string, TaskRow[]>();
    for (const t of tasks) byStudent.set(t.student_id, [...(byStudent.get(t.student_id) ?? []), t]);
    const students: BelletmenStudent[] = list.map((s) => {
      const day = tasksForDay(byStudent.get(s.id) ?? [], today);
      return { id: s.id, full_name: s.full_name, sinif_sube: s.sinif_sube ?? null, today_total: day.length, today_done: day.filter((t) => t.student_done).length };
    });
    return <BelletmenAnasayfa name={profile?.full_name ?? ''} students={students} />;
  }

  const { data: rawStudents } = await applyStudentScope(
    (supabase as any)
      .from('students')
      .select('id, full_name, track, kurum, donem, sinif_sube, status, coach_id, responsible_coach_id, responsible_coach_other_name')
      .neq('status', 'pasif')
      .order('full_name'),
    scope
  );
  const students: any[] = rawStudents ?? [];
  const ids = students.map((s) => s.id);

  const byIds = <T,>(build: (chunk: string[]) => any) =>
    ids.length ? fetchChunkedByIds<T>(ids, build) : Promise.resolve([] as T[]);

  const [programRows, dailyRows, examRows, meetingRows, planReqs, regs] = await Promise.all([
    // Bu haftayı kapsayan programlar (son iki haftada başlamış olanlar yeterli)
    byIds<any>((c) => (supabase as any).from('question_logs')
      .select('student_id, week_start, week_end, student_done, student_done_at, target_count, done_count, appointment_id')
      .in('student_id', c).gte('week_start', shiftDay(today, -13)).lte('week_start', today)),
    byIds<any>((c) => (supabase as any).from('daily_logs')
      .select('student_id, log_date, question_solved, topic_studies, archived')
      .in('student_id', c).gte('log_date', shiftDay(today, -30))),
    byIds<any>((c) => (supabase as any).from('exams')
      .select('id, student_id, exam_name, exam_type, exam_date, net_score, analysis_done')
      .in('student_id', c).gte('exam_date', shiftDay(today, -180)).order('exam_date', { ascending: false })),
    byIds<any>((c) => (supabase as any).from('meetings')
      .select('id, student_id, scheduled_at, meeting_type, topic, completed, duration_minutes')
      .in('student_id', c).gte('scheduled_at', `${shiftDay(today, -60)}T00:00:00`).order('scheduled_at', { ascending: false })),
    (supabase as any).from('weekly_plan_requests').select('id', { count: 'exact', head: true })
      .eq('coach_id', user.id).eq('status', 'bekliyor'),
    (supabase as any).from('student_registrations').select('id', { count: 'exact', head: true })
      .eq('assigned_coach_id', user.id).eq('status', 'koc_bekliyor'),
  ]);

  const group = <T extends { student_id: string }>(rows: T[]) => {
    const m = new Map<string, T[]>();
    for (const r of rows) (m.get(r.student_id) ?? m.set(r.student_id, []).get(r.student_id)!).push(r);
    return m;
  };
  const programsBy = group(programRows);
  const dailyBy = group(dailyRows.filter((l: any) => !l.archived));
  const examsBy = group(examRows);
  const meetingsBy = group(meetingRows);
  const weekAgo = shiftDay(today, -6);

  const dash: DashStudent[] = students.map((s) => {
    // Bu haftanın programı: bugünü kapsayan program haftası
    // Ajanda'dan gelen görüşme görevleri "program yazıldı" sayılmaz
    const progs = (programsBy.get(s.id) ?? []).filter((t: any) => !t.appointment_id && t.week_start <= today && (!t.week_end || today <= t.week_end));
    const curStart = progs.reduce((max: string, t: any) => (t.week_start > max ? t.week_start : max), '');
    const week = progs.filter((t: any) => t.week_start === curStart);
    const total = week.length;
    const done = week.filter((t: any) => t.student_done).length;

    const logs = dailyBy.get(s.id) ?? [];
    const days = activeDays(logs, programsBy.get(s.id) ?? []);
    const lastActive = Array.from(days).filter((d) => d <= today).sort().pop() ?? null;
    const questions7 = logs
      .filter((l: any) => l.log_date >= weekAgo && l.log_date <= today)
      .reduce((sum: number, l: any) => sum + (l.question_solved ?? []).reduce((a: number, q: any) => a + (Number(q?.count) || 0), 0), 0);

    const exams = examsBy.get(s.id) ?? [];
    const last = exams[0] ?? null;
    const prevSame = last ? exams.find((e: any) => e.id !== last.id && (e.exam_type ?? 'TYT') === (last.exam_type ?? 'TYT')) : null;

    // Son öğrenci görüşmesi (veli görüşmeleri sayılmaz, ileri tarihli planlananlar da)
    const lastMeeting = (meetingsBy.get(s.id) ?? []).find((m: any) => m.meeting_type !== 'veli' && isPast(m.scheduled_at)) ?? null;
    const lastMeetingDay = lastMeeting ? trDate(lastMeeting.scheduled_at) : null;

    return {
      id: s.id,
      full_name: s.full_name,
      track: s.track, kurum: s.kurum, donem: s.donem, sinif_sube: s.sinif_sube,
      program: total ? { total, done } : null,
      questions7,
      inactiveDays: lastActive ? daysBetween(lastActive, today) : null,
      lastExam: last ? {
        name: last.exam_name ?? 'Deneme', type: last.exam_type ?? 'TYT', date: last.exam_date,
        net: Number(last.net_score) || 0,
        delta: prevSame ? (Number(last.net_score) || 0) - (Number(prevSame.net_score) || 0) : null,
      } : null,
      lastMeetingDays: lastMeetingDay ? daysBetween(lastMeetingDay, today) : null,
      metThisWeek: !!lastMeetingDay && lastMeetingDay >= monday,
    };
  });

  const nameOf = new Map(students.map((s) => [s.id, s]));
  const weekMeetings: DashMeeting[] = meetingRows
    .filter((m: any) => { const d = trDate(m.scheduled_at); return d >= monday && d <= sunday; })
    .sort((a: any, b: any) => a.scheduled_at.localeCompare(b.scheduled_at))
    .map((m: any) => {
      const st = nameOf.get(m.student_id);
      return {
        id: m.id, studentId: m.student_id, studentName: st?.full_name ?? '', student: st,
        at: m.scheduled_at, type: m.meeting_type === 'veli' ? 'veli' : 'ogrenci', topic: m.topic ?? null,
      };
    });

  const pendingExams: DashExam[] = examRows
    .filter((e: any) => !e.analysis_done && e.exam_date >= shiftDay(today, -30))
    .map((e: any) => {
      const st = nameOf.get(e.student_id);
      return { id: e.id, studentId: e.student_id, studentName: st?.full_name ?? '', student: st, name: e.exam_name ?? 'Deneme', date: e.exam_date, net: Number(e.net_score) || 0 };
    });

  return (
    <AnasayfaClient
      firstName={(profile?.full_name ?? 'Koç').split(' ')[0]}
      today={today}
      students={dash}
      weekMeetings={weekMeetings}
      pendingExams={pendingExams}
      planRequests={planReqs.count ?? 0}
      registrations={regs.count ?? 0}
      isAdmin={!!profile?.is_admin}
    />
  );
}
