/* eslint-disable @typescript-eslint/no-explicit-any */
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { getStudentScope, applyStudentScope } from '@/lib/effective-coach';
import { fetchChunkedByIds } from '@/lib/chunked-in';
import { DenemelerClient } from './DenemelerClient';

export default async function DenemelerPage({
  searchParams,
}: {
  searchParams: Promise<{ ogrenci?: string }>;
}) {
  const { ogrenci: ogrenciFilter } = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/giris');

  const includeInterns = (await cookies()).get('show_interns')?.value === '1';
  const scope = await getStudentScope(supabase, user.id, includeInterns);
  const { data: rawStudents } = await applyStudentScope(
    (supabase as any)
      .from('students')
      .select('id, full_name, track, kurum, donem, sinif_sube, coach_id, responsible_coach_id, responsible_coach_other_name')
      .neq('status', 'pasif')
      .order('full_name'),
    scope
  );
  const students = (rawStudents as any[]) ?? [];
  const studentIds: string[] = students.map((s: any) => s.id);

  const exams = studentIds.length > 0
    ? await fetchChunkedByIds<any>(studentIds, (chunk) =>
        (supabase as any)
          .from('exams')
          .select('*, students(full_name, track, kurum, donem, sinif_sube, coach_id, responsible_coach_id, responsible_coach_other_name), linked:linked_exam_id(exam_name, net_score, exam_type)')
          .in('student_id', chunk)
          .order('exam_date', { ascending: false })
      )
    : [];

  return (
    <DenemelerClient
      initialExams={exams}
      students={students}
      initialFilter={ogrenciFilter}
    />
  );
}
