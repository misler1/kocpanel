/* eslint-disable @typescript-eslint/no-explicit-any */
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
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

  // Profil
  const { data: rawProfile } = await supabase.from('profiles').select('*').eq('id', user.id).single();
  const profile = rawProfile as any;

  // TÜM öğrenciler (filtreleme client tarafında yapılacak)
  const { data: rawStudents } = await supabase
    .from('students')
    .select('*')
    .eq('coach_id', user.id)
    .order('updated_at', { ascending: false });
  const students = (rawStudents as Student[] | null) ?? [];
  const studentIds = students.map((s) => s.id);

  // Bu haftaki görüşmeler
  const { data: rawMeetings } = await supabase
    .from('meetings')
    .select('*, students(full_name, track, kurum, donem)')
    .eq('coach_id', user.id)
    .gte('scheduled_at', weekStart.toISOString())
    .lte('scheduled_at', weekEnd.toISOString())
    .order('scheduled_at');
  const meetings = (rawMeetings as any[]) ?? [];

  // Son denemeler (daha geniş çekip client'ta filtreleyip ilk 4'ü göstereceğiz)
  let exams: any[] = [];
  if (studentIds.length > 0) {
    const { data: rawExams } = await supabase
      .from('exams')
      .select('*, students(full_name, track, kurum, donem)')
      .in('student_id', studentIds)
      .order('exam_date', { ascending: false })
      .limit(30);
    exams = (rawExams as any[]) ?? [];
  }

  // Görevler
  const { data: rawTasks } = await supabase
    .from('tasks')
    .select('*, students(track, kurum, donem)')
    .eq('coach_id', user.id)
    .order('created_at', { ascending: false })
    .limit(20);
  const tasks = (rawTasks as (Task & { students?: any })[] | null) ?? [];

  // Haftalık soru logları
  let questionLogs: (QuestionLog & { students?: any })[] = [];
  if (studentIds.length > 0) {
    const { data: rawLogs } = await supabase
      .from('question_logs')
      .select('*, students(track, kurum, donem)')
      .in('student_id', studentIds)
      .gte('week_start', weekStart.toISOString().slice(0, 10));
    questionLogs = (rawLogs as (QuestionLog & { students?: any })[] | null) ?? [];
  }

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