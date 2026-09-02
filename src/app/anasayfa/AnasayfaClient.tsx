'use client';

/* eslint-disable @typescript-eslint/no-explicit-any */
import Link from 'next/link';
import { IconPlus } from '@tabler/icons-react';
import { useExamFilter } from '@/lib/exam-filter-context';
import { StatCards } from '@/components/dashboard/StatCards';
import { StudentStatusCard } from '@/components/dashboard/StudentStatusCard';
import { TodoCard, QuickActionsCard } from '@/components/dashboard/TodoCard';
import { RecentExamsCard, WeeklyMeetingsCard } from '@/components/dashboard/ExamMeetingCards';
import type { Student, Task, QuestionLog } from '@/types/database';

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

interface Props {
  firstName: string;
  allStudents: Student[];
  meetings: any[];
  exams: any[];
  tasks: (Task & { students?: any })[];
  questionLogs: (QuestionLog & { students?: any })[];
  coachId: string;
}

export function AnasayfaClient({
  firstName, allStudents, meetings, exams, tasks, questionLogs, coachId,
}: Props) {
  const { matchesFilter } = useExamFilter();

  const filteredStudents = allStudents.filter(matchesFilter);
  const activeStudents = filteredStudents.filter((s) => s.status !== 'pasif');
  const topStudents = activeStudents.slice(0, 5);

  const yksCount = activeStudents.filter((s) => s.track.startsWith('YKS')).length;
  const lgsCount = activeStudents.filter((s) => s.track === 'LGS').length;

  const filteredMeetings = meetings.filter((m) => matchesFilter(m.students));
  const pendingMeetings = filteredMeetings.filter((m) => !m.completed).length;

  const filteredExams = exams.filter((e) => matchesFilter(e.students));
  const missingAnalysis = filteredExams.filter((e) => !e.analysis_done).length;
  const recentExams = filteredExams.slice(0, 4);

  const filteredTasks = tasks.filter((t) => !t.student_id || matchesFilter(t.students));

  const filteredQuestionLogs = questionLogs.filter((l) => !l.student_id || matchesFilter(l.students));
  const avgCompletion =
    filteredQuestionLogs.length > 0
      ? Math.round(
          (filteredQuestionLogs.reduce(
            (sum, l) => sum + (l.target_count > 0 ? l.done_count / l.target_count : 0),
            0
          ) / filteredQuestionLogs.length) * 100
        )
      : 0;

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-4 flex items-start justify-between">
        <div>
          <h1 className="text-[18px] font-medium text-gray-900">{getGreeting(firstName)}</h1>
          <p className="mt-0.5 text-[13px] text-gray-500">
            {getTodayLabel()} · {filteredStudents.length} öğrenci aktif
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
        studentCount={filteredStudents.length}
        yksCount={yksCount}
        lgsCount={lgsCount}
        weeklyMeetings={filteredMeetings.length}
        pendingMeetings={pendingMeetings}
        missingExamAnalysis={missingAnalysis}
        weeklyQuestionCompletion={avgCompletion}
      />

      <div className="mb-3 grid gap-3 md:grid-cols-[1fr_320px]">
        <StudentStatusCard students={topStudents} />
        <div className="flex flex-col gap-3">
          <TodoCard tasks={filteredTasks} coachId={coachId} />
          <QuickActionsCard />
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <RecentExamsCard exams={recentExams} />
        <WeeklyMeetingsCard meetings={filteredMeetings} />
      </div>
    </div>
  );
}