import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { OgrencilerClient } from './OgrencilerClient';
import type { Student } from '@/types/database';

export default async function OgrencilerPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/giris');

  const { data: students } = await supabase
    .from('students')
    .select('*')
    .eq('coach_id', user.id)
    .order('full_name');

  const studentIds = (students ?? []).map((s: any) => s.id);

  const lastMeetingMap: Record<string, string> = {};
  if (studentIds.length > 0) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: meetings } = await (supabase as any)
      .from('meetings')
      .select('student_id, scheduled_at')
      .in('student_id', studentIds)
      .order('scheduled_at', { ascending: false });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (meetings ?? []).forEach((m: any) => {
      if (!lastMeetingMap[m.student_id]) {
        lastMeetingMap[m.student_id] = m.scheduled_at;
      }
    });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const studentsWithMeeting = (students ?? []).map((s: any) => ({
    ...s,
    last_meeting_at: lastMeetingMap[s.id] ?? null,
  }));

  return <OgrencilerClient students={studentsWithMeeting as Student[]} />;
}