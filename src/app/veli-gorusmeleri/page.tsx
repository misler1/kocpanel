/* eslint-disable @typescript-eslint/no-explicit-any */
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { getStudentScope, applyStudentScope, isInternStudent } from '@/lib/effective-coach';
import { fetchChunkedByIds } from '@/lib/chunked-in';
import { VeliGorusmeleriClient } from './VeliGorusmeleriClient';

export default async function VeliGorusmeleriPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/giris');

  const includeInterns = (await cookies()).get('show_interns')?.value === '1';
  const scope = await getStudentScope(supabase, user.id, includeInterns);
  const { data: students } = await applyStudentScope(
    (supabase as any)
      .from('students')
      .select('id, full_name, track, kurum, donem, coach_id, responsible_coach_id, responsible_coach_other_name')
      .neq('status', 'pasif'),
    scope
  );
  const studentIds = (students ?? []).map((s: any) => s.id);
  const studentMap = new Map((students ?? []).map((s: any) => [s.id, {
    ...s,
    is_intern_student: scope.isMentor && isInternStudent(s, user.id),
  }]));

  const meetings = studentIds.length > 0
    ? await fetchChunkedByIds<any>(studentIds, (chunk) =>
        (supabase as any)
          .from('meetings')
          .select('*, students(id, full_name, track, kurum, donem, coach_id, responsible_coach_id, responsible_coach_other_name)')
          .in('student_id', chunk)
          .eq('meeting_type', 'veli')
          .order('scheduled_at', { ascending: false })
      )
    : [];

  const visibleMeetings = meetings.map((m: any) => ({
    ...m,
    students: studentMap.get(m.student_id) ?? m.students,
  }));

  return <VeliGorusmeleriClient meetings={visibleMeetings} />;
}
