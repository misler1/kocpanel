/* eslint-disable @typescript-eslint/no-explicit-any */
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getStudentContext } from '@/lib/student-context';
import { AnalysisView } from '@/components/exam/AnalysisView';

// Koçun gönderdiği deneme analizi (yalnızca öğrenciye gönderilmiş olanlar görünür: veritabanı izni)
export default async function OgrenciAnalizPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, student } = await getStudentContext();
  if (!student) notFound();
  const { data: a } = await (supabase as any)
    .from('exam_analyses').select('id, exam_names, exam_dates, analysis, shared_at')
    .eq('id', id).eq('student_id', student.id).not('shared_at', 'is', null).maybeSingle();
  if (!a) notFound();

  const dates = ((a.exam_dates as string[]) ?? []).filter(Boolean).sort();
  const fmt = (d: string) => new Date(d).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' });

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div>
        <Link href="/ogrenci/denemeler" className="text-[13px] font-semibold text-[var(--accent-dark)] hover:underline">← Denemelerim</Link>
        <h1 className="mt-1 text-[22px] font-extrabold text-[var(--ink)]">📊 Deneme analizim</h1>
        <p className="text-[13px] font-semibold text-[var(--ink-muted)]">
          {(a.exam_names as string[])?.length ?? 0} deneme
          {dates.length ? ` · ${fmt(dates[0])}${dates.length > 1 ? ` – ${fmt(dates[dates.length - 1])}` : ''}` : ''}
        </p>
      </div>
      <AnalysisView a={a.analysis} audience="student" showName={false} />
      <p className="text-[12px] text-[var(--ink-muted)]">Denemeler: {((a.exam_names as string[]) ?? []).join(', ')}</p>
    </div>
  );
}
