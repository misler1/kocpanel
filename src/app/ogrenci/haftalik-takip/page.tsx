/* eslint-disable @typescript-eslint/no-explicit-any */
import { getStudentContext } from '@/lib/student-context';
import { HaftalikClient } from './HaftalikClient';

export default async function OgrenciHaftalikPage() {
  const { supabase, student } = await getStudentContext();
  if (!student) return <p className="text-sm text-[var(--ink-muted)]">Öğrenci kaydı bulunamadı.</p>;

  // RLS: öğrenci yalnızca kendi programını görür. student_id filtresi ek güvence.
  const { data: logs } = await (supabase as any)
    .from('question_logs').select('*').eq('student_id', student.id).order('week_start', { ascending: false });
  const { data: requests } = await (supabase as any)
    .from('weekly_plan_requests').select('id, kind, week_start, status, note, created_at, decided_at')
    .eq('student_id', student.id).order('created_at', { ascending: false }).limit(10);

  return (
    <HaftalikClient
      studentId={student.id}
      coachId={student.coach_id}
      resources={student.resources ?? {}}
      initialLogs={logs ?? []}
      initialRequests={requests ?? []}
    />
  );
}
