/* eslint-disable @typescript-eslint/no-explicit-any */
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { GorusmelerOgrenciListClient } from './GorusmelerOgrenciListClient';

export default async function GorusmelerPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/giris');

  const { data: students } = await (supabase as any)
    .from('students')
    .select('id, full_name, track, kurum, donem, sinif_sube, avatar_color, status, birth_date')
    .eq('coach_id', user.id)
    .order('full_name');

  const studentIds = (students ?? []).map((s: any) => s.id);

  const lastMeetingMap: Record<string, string> = {};
  if (studentIds.length > 0) {
    const { data: meetings } = await (supabase as any)
      .from('meetings')
      .select('student_id, scheduled_at')
      .in('student_id', studentIds)
      .order('scheduled_at', { ascending: false });

    (meetings ?? []).forEach((m: any) => {
      if (!lastMeetingMap[m.student_id]) {
        lastMeetingMap[m.student_id] = m.scheduled_at;
      }
    });
  }

  const studentsWithMeeting = (students ?? []).map((s: any) => ({
    ...s,
    last_meeting_at: lastMeetingMap[s.id] ?? null,
  }));

  return <GorusmelerOgrenciListClient students={studentsWithMeeting} />;
}