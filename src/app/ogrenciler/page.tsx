import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { OgrencilerClient } from './OgrencilerClient';
import type { Student } from '@/types/database';
import { cookies } from 'next/headers';
import { BasvuruListesi, type Basvuru } from '@/components/BasvuruListesi';
import { getStudentScope, applyStudentScope, isInternStudent } from '@/lib/effective-coach';

type OgrenciListStudent = Student & {
  birth_date?: string | null;
  last_meeting_at?: string | null;
  sinif_sube?: string | null;
  is_intern_student?: boolean;
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

  const includeInterns = (await cookies()).get('show_interns')?.value === '1';
  const scope = await getStudentScope(supabase, user.id, includeInterns);

  let studentsQuery = applyStudentScope(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase as any).from('students').select('*').order('full_name'),
    scope
  );

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
        is_intern_student: scope.isMentor && isInternStudent(s as never, user.id),
  }));

  // Bu koçun onayını bekleyen öğrenci başvuruları (RLS: yalnızca atanan koç görür)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: regs } = await (supabase as any)
    .from('student_registrations')
    .select('id, full_name, phone, birth_date, status, requested_coach_id, assigned_coach_id, created_at')
    .eq('assigned_coach_id', user.id)
    .eq('status', 'koc_bekliyor');
  const basvurular = (regs ?? []) as Basvuru[];

  return (
    <>
      {!archiveMode && basvurular.length > 0 && (
        <div className="mx-auto mb-4 max-w-3xl rounded-xl border border-amber-200 bg-amber-50">
          <p className="px-4 pt-3 text-[13px] font-medium text-amber-900">
            Onayınızı bekleyen {basvurular.length} öğrenci başvurusu var
          </p>
          <BasvuruListesi basvurular={basvurular} mode="koc" />
        </div>
      )}
      <OgrencilerClient students={studentsWithMeeting} archiveMode={archiveMode} />
    </>
  );
}