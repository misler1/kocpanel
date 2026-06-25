/* eslint-disable @typescript-eslint/no-explicit-any */
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { StatCards } from '@/components/dashboard/StatCards';
import { StudentStatusCard } from '@/components/dashboard/StudentStatusCard';
import { TodoCard, QuickActionsCard } from '@/components/dashboard/TodoCard';
import { RecentExamsCard, WeeklyMeetingsCard } from '@/components/dashboard/ExamMeetingCards';
import { IconPlus } from '@tabler/icons-react';
import type { Student, Meeting, Exam, Task, QuestionLog } from '@/types/database';

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

function getGreeting(name: string) {
  const h = new Date().getHours();
  const prefix = h < 12 ? 'Günaydın' : h < 18 ? 'İyi günler' : 'İyi akşamlar';
  return `${prefix}, ${name} 👋`;
}

function getTodayLabel() {
  return new Date().toLocaleDateString('tr-TR', {
    weekday: 'long', day: 'numeric', month: 'long',
  });
}

export default async function AnasayfaPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/giris');

  const { start: weekStart, end: weekEnd } = getWeekBounds();

  // Öğrenci ID'lerini önce çek
  const { data: rawIds } = await supabase.from('students').select('id').eq('coach_id', user.id);
  const studentIds: string[] = ((rawIds as any[]) ?? []).map((s) => s.id as string);

  // Profil
  const { data: rawProfile } = await supabase.from('profiles').select('*').eq('id', user.id).single();
  const profile = rawProfile as any;

  // Öğrenci listesi (ana sayfada gösterilecek 5)
  const { data: rawStudents, count: totalStudents } = await supabase
    .from('students')
    .select('*', { count: 'exact' })
    .eq('coach_id', user.id)
    .neq('status', 'pasif')
    .order('updated_at', { ascending: false })
    .limit(5);
  const students = (rawStudents as Student[] | null) ?? [];

  // Bu haftaki görüşmeler
  const { data: rawMeetings } = await supabase
    .from('meetings')
    .select('*, students(full_name, track)')
    .eq('coach_id', user.id)
    .gte('scheduled_at', weekStart.toISOString())
    .lte('scheduled_at', weekEnd.toISOString())
    .order('scheduled_at');
  const meetings = ((rawMeetings as any[]) ?? []) as (Meeting & { students: Pick<Student, 'full_name' | 'track'> | null })[];

  // Son denemeler
  let exams: (Exam & { students: Pick<Student, 'full_name'> | null })[] = [];
  if (studentIds.length > 0) {
    const { data: rawExams } = await supabase
      .from('exams')
      .select('*, students(full_name)')
      .in('student_id', studentIds)
      .order('exam_date', { ascending: false })
      .limit(4);
    exams = ((rawExams as any[]) ?? []) as typeof exams;
  }

  // Görevler
  const { data: rawTasks } = await supabase
    .from('tasks')
    .select('*')
    .eq('coach_id', user.id)
    .order('created_at', { ascending: false })
    .limit(20);
  const tasks = (rawTasks as Task[] | null) ?? [];

  // Haftalık soru logları
  let questionLogs: QuestionLog[] = [];
  if (studentIds.length > 0) {
    const { data: rawLogs } = await supabase
      .from('question_logs')
      .select('*')
      .in('student_id', studentIds)
      .gte('week_start', weekStart.toISOString().slice(0, 10));
    questionLogs = (rawLogs as QuestionLog[] | null) ?? [];
  }

  // Hesaplamalar
  const yksCount = students.filter((s) => s.track.startsWith('YKS')).length;
  const lgsCount = students.filter((s) => s.track === 'LGS').length;
  const pendingMeetings = meetings.filter((m) => !m.completed).length;
  const missingAnalysis = exams.filter((e) => !e.analysis_done).length;
  const avgCompletion =
    questionLogs.length > 0
      ? Math.round(
          (questionLogs.reduce(
            (sum, l) => sum + (l.target_count > 0 ? l.done_count / l.target_count : 0),
            0
          ) / questionLogs.length) * 100
        )
      : 0;

  const firstName = profile?.full_name?.split(' ')[0] ?? 'Koç';

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-4 flex items-start justify-between">
        <div>
          <h1 className="text-[18px] font-medium text-gray-900">{getGreeting(firstName)}</h1>
          <p className="mt-0.5 text-[13px] text-gray-500">
            {getTodayLabel()} · {totalStudents ?? 0} öğrenci aktif
          </p>
        </div>
        <Link
          href="/ogrenciler/yeni"
          className="flex items-center gap-1.5 rounded-lg bg-blue-50 px-3.5 py-2 text-[13px] font-medium text-blue-700 hover:bg-blue-100"
        >
          <IconPlus size={15} />
          Yeni öğrenci
        </Link>
      </div>

      <StatCards
        studentCount={totalStudents ?? 0}
        yksCount={yksCount}
        lgsCount={lgsCount}
        weeklyMeetings={meetings.length}
        pendingMeetings={pendingMeetings}
        missingExamAnalysis={missingAnalysis}
        weeklyQuestionCompletion={avgCompletion}
      />

      <div className="mb-3 grid gap-3 md:grid-cols-[1fr_320px]">
        <StudentStatusCard students={students} />
        <div className="flex flex-col gap-3">
          <TodoCard tasks={tasks} coachId={user.id} />
          <QuickActionsCard />
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <RecentExamsCard exams={exams} />
        <WeeklyMeetingsCard meetings={meetings} />
      </div>
    </div>
  );
}
