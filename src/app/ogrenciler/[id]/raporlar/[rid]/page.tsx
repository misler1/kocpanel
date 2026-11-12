/* eslint-disable @typescript-eslint/no-explicit-any */
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getRequestUser } from '@/lib/supabase/request-cache';
import { PeriodReportView } from '@/components/report/PeriodReportView';
import { RaporIslemleri } from './RaporIslemleri';

// Kayıtlı dönem raporu (veritabanı izni: öğrencinin koçu, sorumlu koçu, yönetici, haftalık takip izni olan personel)
export default async function RaporDetayPage({ params }: { params: Promise<{ id: string; rid: string }> }) {
  const { id, rid } = await params;
  const user = await getRequestUser();
  if (!user) redirect('/giris');
  const supabase = await createClient();
  const [{ data: r }, { data: s }, { data: me }] = await Promise.all([
    (supabase as any).from('student_reports').select('id, student_id, kind, data').eq('id', rid).eq('student_id', id).maybeSingle(),
    (supabase as any).from('students').select('coach_id, responsible_coach_id').eq('id', id).maybeSingle(),
    (supabase as any).from('profiles').select('is_admin').eq('id', user.id).maybeSingle(),
  ]);
  if (!r?.data) notFound();
  const canDelete = !!me?.is_admin || s?.coach_id === user.id || s?.responsible_coach_id === user.id;

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2 print:hidden">
        <Link href={`/ogrenciler/${id}?sekme=raporlar`} className="text-[13px] font-medium text-violet-700 hover:underline">← Raporlara dön</Link>
        <RaporIslemleri reportId={r.id} studentId={id} canDelete={canDelete} />
      </div>
      <PeriodReportView r={r.data} />
    </div>
  );
}
