/* eslint-disable @typescript-eslint/no-explicit-any */
import { getStudentContext } from '@/lib/student-context';
import { KonuKartlariClient } from './KonuKartlariClient';

export default async function OgrenciKonuPage() {
  const { supabase, student } = await getStudentContext();
  if (!student) return <p className="text-sm text-gray-500">Öğrenci kaydı bulunamadı.</p>;

  const { data: topics } = await (supabase as any)
    .from('topic_progress')
    .select('id, subject, topic, konu_tamamlandi, kaynak1_sorular, kaynak2_sorular, kaynak3_sorular, yanlislar_kontrol')
    .eq('student_id', student.id)
    .order('subject');

  return <KonuKartlariClient initial={topics ?? []} resources={student.resources ?? {}} />;
}
