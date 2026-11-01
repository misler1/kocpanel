/* eslint-disable @typescript-eslint/no-explicit-any */
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { loadStudentReport } from '@/lib/student-report';
import { StudentReportView } from '@/components/report/StudentReportView';

export const dynamic = 'force-dynamic';

export default async function VeliPage({ searchParams }: { searchParams: Promise<{ ogrenci?: string }> }) {
  const { ogrenci } = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/giris/veli');

  const { data: profile } = await (supabase as any).from('profiles').select('must_change_password').eq('id', user.id).single();
  if (profile?.must_change_password) redirect('/veli/sifre-degistir');

  // Bağlı çocuklar: velinin kendi oturumuyla okunur (RLS: yalnızca kendi bağları)
  const { data: links } = await (supabase as any).from('student_parents').select('student_id').eq('parent_id', user.id);
  const ids: string[] = (links ?? []).map((l: any) => l.student_id);
  if (ids.length === 0) {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center text-[14px] text-gray-600">
        Hesabınıza henüz bir öğrenci bağlanmamış. Lütfen öğrencinizin koçuyla iletişime geçin.
      </div>
    );
  }

  // Erişim yukarıda doğrulandı; rapor verisi sunucuda okunur
  const admin = createAdminClient() as any;
  const { data: kids } = await admin.from('students').select('id, full_name').in('id', ids).order('full_name');
  const selected = ids.includes(ogrenci ?? '') ? ogrenci! : (kids?.[0]?.id ?? ids[0]);
  const report = await loadStudentReport(admin, selected);

  const tabs = (kids ?? []).length > 1 ? (
    <div className="flex flex-1 flex-wrap gap-1.5">
      {(kids ?? []).map((k: any) => (
        <Link key={k.id} href={`/veli?ogrenci=${k.id}`}
          className={`rounded-full px-3 py-1.5 text-[13px] ${k.id === selected ? 'bg-gray-900 text-white' : 'border border-gray-200 bg-white text-gray-700 hover:bg-gray-50'}`}>
          {k.full_name}
        </Link>
      ))}
    </div>
  ) : null;

  if (!report) return <p className="px-4 py-16 text-center text-[14px] text-gray-600">Rapor yüklenemedi.</p>;
  return <StudentReportView report={report} actions={tabs} />;
}
