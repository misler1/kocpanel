/* eslint-disable @typescript-eslint/no-explicit-any */
import type { Metadata } from 'next';
import { createAdminClient } from '@/lib/supabase/admin';
import { loadStudentReport } from '@/lib/student-report';
import { StudentReportView } from '@/components/report/StudentReportView';

// Veliye gönderilen, giriş gerektirmeyen rapor. Erişim yalnızca linkteki rastgele anahtarla; süresi dolmuş
// ya da koçun iptal ettiği linkler hiçbir öğrenci bilgisi göstermez. Arama motorlarına kapalı.
export const metadata: Metadata = {
  title: 'Öğrenci Gelişim Raporu | Koç Defterim',
  robots: { index: false, follow: false },
};
export const dynamic = 'force-dynamic';

const isExpired = (iso: string) => new Date(iso).getTime() < Date.now();

function Closed({ text }: { text: string }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="max-w-sm rounded-xl border border-gray-200 bg-white p-6 text-center">
        <div className="mb-2 text-[36px]">🔒</div>
        <p className="text-[14px] text-gray-700">{text}</p>
        <p className="mt-2 text-[12.5px] text-gray-500">Güncel rapor için öğrencinin koçuyla iletişime geçebilirsiniz.</p>
      </div>
    </div>
  );
}

export default async function RaporPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!/^[A-Za-z0-9_-]{24,64}$/.test(token)) return <Closed text="Bu rapor linki geçersiz." />;

  const admin = createAdminClient() as any;
  const { data: link } = await admin.from('parent_report_links')
    .select('id, student_id, note, expires_at, revoked_at, view_count').eq('token', token).maybeSingle();
  if (!link) return <Closed text="Bu rapor linki geçersiz." />;
  if (link.revoked_at) return <Closed text="Bu rapor linki koç tarafından kapatılmış." />;
  if (isExpired(link.expires_at)) return <Closed text="Bu rapor linkinin süresi dolmuş." />;

  const report = await loadStudentReport(admin, link.student_id);
  if (!report) return <Closed text="Rapor bulunamadı." />;

  await admin.from('parent_report_links')
    .update({ view_count: (link.view_count ?? 0) + 1, last_viewed_at: new Date().toISOString() }).eq('id', link.id);

  return (
    <div className="min-h-screen bg-gray-50 print:bg-white">
      <StudentReportView report={report} note={link.note} />
    </div>
  );
}
