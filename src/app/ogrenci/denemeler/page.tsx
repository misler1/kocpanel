/* eslint-disable @typescript-eslint/no-explicit-any */
import { getStudentContext } from '@/lib/student-context';
import { KarneClient } from './KarneClient';

export default async function OgrenciDenemelerPage() {
  const { supabase, student } = await getStudentContext();
  if (!student) return <p className="text-sm text-gray-500">Öğrenci kaydı bulunamadı.</p>;

  // RLS: öğrenci yalnızca kendi denemelerini görür. student_id filtresi ek güvence.
  const { data: exams } = await (supabase as any)
    .from('exams').select('*').eq('student_id', student.id)
    .order('exam_date', { ascending: false });
  const { data: ranks } = await (supabase as any).rpc('student_exam_ranks');

  return <KarneClient exams={exams ?? []} ranks={ranks ?? []} />;
}
