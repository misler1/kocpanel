/* eslint-disable @typescript-eslint/no-explicit-any */
import { getStudentContext } from '@/lib/student-context';
import { OgrenciBilgilerClient } from './OgrenciBilgilerClient';

export default async function OgrenciAnaSayfa() {
  const { student, profile } = await getStudentContext();

  if (!student) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-6 text-center text-sm text-gray-600">
        Merhaba {profile.full_name}. Hesabın henüz bir öğrenci kaydına bağlanmamış; koçunla iletişime geç.
      </div>
    );
  }
  return <OgrenciBilgilerClient student={student} />;
}
