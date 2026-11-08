/* eslint-disable @typescript-eslint/no-explicit-any */
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getRequestUser } from '@/lib/supabase/request-cache';
import { AnalysisView } from '@/components/exam/AnalysisView';
import { fmtTarihSaat } from '../../AnalizListesi';
import { AnalizIslemleri } from './AnalizIslemleri';

// Kaydedilmiş bir deneme analizi (yalnızca analizi yapan görür: veritabanı izni)
export default async function AnalizDetayPage({ params }: { params: Promise<{ id: string; aid: string }> }) {
  const { id, aid } = await params;
  const user = await getRequestUser();
  if (!user) redirect('/giris');
  const supabase = await createClient();
  const { data: a } = await (supabase as any)
    .from('exam_analyses').select('id, student_id, exam_names, created_at, shared_at, analysis')
    .eq('id', aid).eq('student_id', id).maybeSingle();
  if (!a) notFound();

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <div>
        <Link href={`/ogrenciler/${id}?sekme=denemeler`} className="text-[13px] font-medium text-violet-700 hover:underline print:hidden">← Öğrenciye dön</Link>
        <h1 className="mt-1 text-[20px] font-semibold text-gray-900">Deneme analizi · {fmtTarihSaat(a.created_at)}</h1>
        <p className="text-[13px] text-gray-500">{(a.exam_names ?? []).length} deneme: {(a.exam_names ?? []).join(', ')}</p>
      </div>
      <AnalizIslemleri analizId={a.id} studentId={id} sharedAt={a.shared_at} />
      <div className="rounded-xl border border-gray-100 bg-gradient-to-br from-blue-50/60 to-purple-50/60 p-4">
        <AnalysisView a={a.analysis} audience="coach" />
        {a.analysis?.kaynak && <p className="mt-2 text-right text-[11px] text-gray-400">Analiz: {a.analysis.kaynak}</p>}
      </div>
    </div>
  );
}
