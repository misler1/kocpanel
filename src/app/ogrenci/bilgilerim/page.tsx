/* eslint-disable @typescript-eslint/no-explicit-any */
import { getStudentContext } from '@/lib/student-context';
import { OgrenciBilgilerClient } from './OgrenciBilgilerClient';

export default async function OgrenciBilgilerimPage() {
  const { student, profile } = await getStudentContext();

  if (!student) {
    return (
      <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-6 text-center text-sm text-[var(--ink-muted)]">
        Merhaba {profile.full_name}. Hesabın henüz bir öğrenci kaydına bağlanmamış; koçunla iletişime geç.
      </div>
    );
  }
  return <OgrenciBilgilerClient student={student} />;
}
