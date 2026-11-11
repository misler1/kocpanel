/* eslint-disable @typescript-eslint/no-explicit-any */
import { notFound } from 'next/navigation';
import { getStudentContext } from '@/lib/student-context';
import { DenemeGirisClient } from '../DenemeGirisClient';

// Öğrencinin kendi girdiği denemeyi düzeltmesi (koçun girdiği denemeler burada açılmaz)
export default async function OgrenciDenemeDuzenlePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, student } = await getStudentContext();
  if (!student) notFound();
  const { data: exam } = await (supabase as any)
    .from('exams').select('*').eq('id', id).eq('student_id', student.id).maybeSingle();
  if (!exam || !exam.entered_by_student) notFound();
  return <DenemeGirisClient studentId={student.id} track={student.track ?? null} exam={exam} />;
}
