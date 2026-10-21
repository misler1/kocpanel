import { getStudentContext } from '@/lib/student-context';
import { SifreDegistirClient } from './SifreDegistirClient';

export default async function SifreDegistirPage() {
  const { profile } = await getStudentContext({ allowPasswordChange: true });
  return <SifreDegistirClient forced={!!profile.must_change_password} />;
}
