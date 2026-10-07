import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { OgrencilerClient } from './OgrencilerClient';
import type { Student } from '@/types/database';

type OgrenciListStudent = Student & {
  birth_date?: string | null;
  last_meeting_at?: string | null;
  sinif_sube?: string | null;
};

export default async function OgrencilerPage({
  searchParams,
}: {
  searchParams?: Promise<{ arsiv?: string }>;
}) {
  const params = (await searchParams) ?? {};
  const archiveMode = params.arsiv === '1';

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/giris');

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: access } = await (supabase as any)
    .from('teacher_access_profiles')
    .select('status, mentor_id')
    .eq('teacher_id', user.id)
    .maybeSingle();

  const isRestricted = !!access && access.status !== 'coach' && !!access.mentor_id;
  const ownerIds = isRestricted ? [access.mentor_id, user.id] : [user.id];

  let studentsQuery = supabase
    .from('students')
    .select('*')
    .in('coach_id', ownerIds)
    .order('full_name');

  studentsQuery = archiveMode
    ? studentsQuery.eq('status', 'pasif')
    : studentsQuery.neq('status', 'pasif');

  const { data: students } = await studentsQuery;
  const studentIds = ((students ?? []) as OgrenciListStudent[]).map((s) => s.id);

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

  const studentsWithMeeting = ((students ?? []) as OgrenciListStudent[]).map((s) => ({
    ...s,
    last_meeting_at: lastMeetingMap[s.id] ?? null,
  }));

  return <OgrencilerClient students={studentsWithMeeting} archiveMode={archiveMode} />;
}