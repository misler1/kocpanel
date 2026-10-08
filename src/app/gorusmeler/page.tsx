/* eslint-disable @typescript-eslint/no-explicit-any */
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { getStudentScope, applyStudentScope, isInternStudent } from '@/lib/effective-coach';
import { fetchChunkedByIds } from '@/lib/chunked-in';
import { GorusmelerOgrenciListClient } from './GorusmelerOgrenciListClient';

export default async function GorusmelerPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/giris');

  const includeInterns = (await cookies()).get('show_interns')?.value === '1';
  const scope = await getStudentScope(supabase, user.id, includeInterns);

  const { data: students } = await applyStudentScope(
    (supabase as any)
      .from('students')
      .select('id, full_name, track, kurum, donem, sinif_sube, avatar_color, status, birth_date, coach_id, responsible_coach_id, responsible_coach_other_name')
      .order('full_name'),
    scope
  );

  const studentIds = (students ?? []).map((s: any) => s.id);

  const lastMeetingMap: Record<string, string> = {};
  if (studentIds.length > 0) {
    const meetings = await fetchChunkedByIds<any>(studentIds, (chunk) =>
      (supabase as any)
        .from('meetings')
        .select('student_id, scheduled_at')
        .in('student_id', chunk)
        .order('scheduled_at', { ascending: false })
    );

    meetings.forEach((m: any) => {
      if (!lastMeetingMap[m.student_id]) {
        lastMeetingMap[m.student_id] = m.scheduled_at;
      }
    });
  }

  const studentsWithMeeting = (students ?? []).map((s: any) => ({
    ...s,
    is_intern_student: scope.isMentor && isInternStudent(s, user.id),
    last_meeting_at: lastMeetingMap[s.id] ?? null,
  }));

  return <GorusmelerOgrenciListClient students={studentsWithMeeting} />;
}
