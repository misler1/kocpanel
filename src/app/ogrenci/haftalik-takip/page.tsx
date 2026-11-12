/* eslint-disable @typescript-eslint/no-explicit-any */
import { getStudentContext } from '@/lib/student-context';
import { HaftalikClient } from './HaftalikClient';
import { addDays } from '@/lib/program-days';
import { todayTr } from '@/lib/day-tasks';

export default async function OgrenciHaftalikPage({ searchParams }: { searchParams: Promise<{ program?: string }> }) {
  const { program } = await searchParams;
  const { supabase, student } = await getStudentContext();
  if (!student) return <p className="text-sm text-[var(--ink-muted)]">Öğrenci kaydı bulunamadı.</p>;

  // RLS: öğrenci yalnızca kendi programını görür. student_id filtresi ek güvence.
  const { data: logs } = await (supabase as any)
    .from('question_logs').select('*').eq('student_id', student.id).order('week_start', { ascending: false });
  const { data: requests } = await (supabase as any)
    .from('weekly_plan_requests').select('id, kind, week_start, status, note, created_at, decided_at')
    .eq('student_id', student.id).order('created_at', { ascending: false }).limit(10);
  // Öğrencinin kendi yaptığı, onay bekleyen ya da son 7 günde reddedilen programlar (tablo yoksa boş)
  const weekAgo = addDays(todayTr(), -7);
  const { data: sp } = await (supabase as any)
    .from('student_programs').select('*')
    .eq('student_id', student.id)
    .or(`status.eq.bekliyor,and(status.eq.reddedildi,decided_at.gte.${weekAgo})`)
    .order('created_at', { ascending: false });

  return (
    <HaftalikClient
      studentId={student.id}
      coachId={student.coach_id}
      resources={student.resources ?? {}}
      initialLogs={logs ?? []}
      initialRequests={requests ?? []}
      platformOnly={!!student.platform_only}
      studentPrograms={((sp as any[]) ?? []).filter((p) => !p.prepared_by)} // belletmenin hazırladığı (koç onayı bekleyen) programlar öğrenciye gösterilmez
      programMsg={program === 'aktif' || program === 'bekliyor' ? program : null}
    />
  );
}
