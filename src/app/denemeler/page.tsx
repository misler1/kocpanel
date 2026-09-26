/* eslint-disable @typescript-eslint/no-explicit-any */
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
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

  const { data: rawIds } = await (supabase as any)
    .from('students').select('id').eq('coach_id', user.id);
  const studentIds: string[] = (rawIds ?? []).map((s: any) => s.id);

  const { data: rawStudents } = await (supabase as any)
    .from('students')
    .select('id, full_name, track, kurum, donem, sinif_sube')
    .eq('coach_id', user.id)
    .order('full_name');

  let exams: any[] = [];
  if (studentIds.length > 0) {
    // Filtreleme artık istemci tarafında (tür/sınıf/deneme/öğrenci), bu yüzden
    // koçun tüm öğrencilerinin tüm denemelerini tek seferde çekiyoruz.
    const { data } = await (supabase as any)
      .from('exams')
      .select('*, students(full_name, track, kurum, donem, sinif_sube), linked:linked_exam_id(exam_name, net_score, exam_type)')
      .in('student_id', studentIds)
      .order('exam_date', { ascending: false });
    exams = data ?? [];
  }

  return (
    <DenemelerClient
      initialExams={exams}
      students={(rawStudents as any[]) ?? []}
      initialFilter={ogrenciFilter}
    />
  );
}