/* eslint-disable @typescript-eslint/no-explicit-any */
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { getStudentScope, applyStudentScope } from '@/lib/effective-coach';
import { fetchChunkedByIds } from '@/lib/chunked-in';
import { AnasayfaClient } from './AnasayfaClient';
import type { Student, Task, QuestionLog } from '@/types/database';

function getWeekBounds() {
  const now = new Date();
  const day = now.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const start = new Date(now);
  start.setDate(now.getDate() + diff);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  end.setHours(23, 59, 59, 999);
  return { start, end };
}

export default async function AnasayfaPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/giris');

  const { start: weekStart, end: weekEnd } = getWeekBounds();

  const { data: rawProfile } = await supabase.from('profiles').select('*').eq('id', user.id).single();
  const profile = rawProfile as any;

  const includeInterns = (await cookies()).get('show_interns')?.value === '1';
  const scope = await getStudentScope(supabase, user.id, includeInterns);
  const { data: rawStudents } = await applyStudentScope(
    (supabase as any)
      .from('students')
      .select('*')
      .order('updated_at', { ascending: false }),
    scope
  );
  const students = (rawStudents as Student[] | null) ?? [];
  const studentIds = students.map((s) => s.id);

  const meetings = studentIds.length > 0
    ? await fetchChunkedByIds<any>(studentIds, (chunk) =>
        (supabase as any)
          .from('meetings')
          .select('*, students(full_name, track, kurum, donem, coach_id, responsible_coach_id, responsible_coach_other_name)')
          .in('student_id', chunk)
          .gte('scheduled_at', weekStart.toISOString())
          .lte('scheduled_at', weekEnd.toISOString())
          .order('scheduled_at')
      )
    : [];

  const exams = studentIds.length > 0
    ? await fetchChunkedByIds<any>(studentIds, (chunk) =>
        (supabase as any)
          .from('exams')
          .select('*, students(full_name, track, kurum, donem, coach_id, responsible_coach_id, responsible_coach_other_name)')
          .in('student_id', chunk)
          .order('exam_date', { ascending: false })
          .limit(30)
      )
    : [];

  const tasks = studentIds.length > 0
    ? await fetchChunkedByIds<Task & { students?: any }>(studentIds, (chunk) =>
        (supabase as any)
          .from('tasks')
          .select('*, students(track, kurum, donem, coach_id, responsible_coach_id, responsible_coach_other_name)')
          .in('student_id', chunk)
          .order('created_at', { ascending: false })
          .limit(20)
      )
    : [];

  const questionLogs = studentIds.length > 0
    ? await fetchChunkedByIds<QuestionLog & { students?: any }>(studentIds, (chunk) =>
        (supabase as any)
          .from('question_logs')
          .select('*, students(track, kurum, donem, coach_id, responsible_coach_id, responsible_coach_other_name)')
          .in('student_id', chunk)
          .gte('week_start', weekStart.toISOString().slice(0, 10))
      )
    : [];

  const firstName = profile?.full_name?.split(' ')[0] ?? 'Koç';

  return (
    <AnasayfaClient
      firstName={firstName}
      allStudents={students}
      meetings={meetings}
      exams={exams}
      tasks={tasks}
      questionLogs={questionLogs}
      coachId={user.id}
    />
  );
}
