/* eslint-disable @typescript-eslint/no-explicit-any */
import { notFound } from 'next/navigation';
import { getStudentContext } from '@/lib/student-context';
import { DenemeAnalizClient } from './DenemeAnalizClient';

export default async function OgrenciDenemeAnalizPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, student } = await getStudentContext();
  if (!student) notFound();
  const { data: exam } = await (supabase as any)
    .from('exams').select('*').eq('id', id).eq('student_id', student.id).maybeSingle();
  if (!exam) notFound();
  return <DenemeAnalizClient exam={exam} />;
}
