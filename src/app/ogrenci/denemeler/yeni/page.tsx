import { getStudentContext } from '@/lib/student-context';
import { DenemeGirisClient } from '../DenemeGirisClient';

export default async function OgrenciDenemeEklePage() {
  const { student } = await getStudentContext();
  if (!student) return <p className="text-sm text-[var(--ink-muted)]">Öğrenci kaydı bulunamadı.</p>;
  return <DenemeGirisClient studentId={student.id} track={student.track ?? null} />;
}
