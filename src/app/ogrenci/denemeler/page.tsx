/* eslint-disable @typescript-eslint/no-explicit-any */
import { getStudentContext } from '@/lib/student-context';
import Link from 'next/link';
import { KarneClient } from './KarneClient';

export default async function OgrenciDenemelerPage() {
  const { supabase, student } = await getStudentContext();
  if (!student) return <p className="text-sm text-[var(--ink-muted)]">Öğrenci kaydı bulunamadı.</p>;

  // RLS: öğrenci yalnızca kendi denemelerini görür. student_id filtresi ek güvence.
  const { data: exams } = await (supabase as any)
    .from('exams').select('*').eq('student_id', student.id)
    .order('exam_date', { ascending: false });
  const { data: ranks } = await (supabase as any).rpc('student_exam_ranks');
  // Koçun gönderdiği deneme analizleri (tablo yoksa liste boş kalır)
  const { data: analyses } = await (supabase as any)
    .from('exam_analyses').select('id, exam_names, shared_at')
    .eq('student_id', student.id).not('shared_at', 'is', null)
    .order('shared_at', { ascending: false }).limit(5);

  return (
    <>
      {!!analyses?.length && (
        <div className="mb-4 rounded-[24px] border-2 border-violet-200 bg-violet-50 p-4">
          <h2 className="mb-2 text-[16px] font-extrabold text-violet-900">📊 Koçundan deneme analizleri</h2>
          <div className="space-y-1.5">
            {analyses.map((a: any) => (
              <Link key={a.id} href={`/ogrenci/analiz/${a.id}`}
                className="flex items-center justify-between gap-2 rounded-2xl bg-white px-3 py-2.5 text-[14px] font-bold text-[var(--ink)] hover:ring-2 hover:ring-violet-300">
                <span className="min-w-0 truncate">{(a.exam_names ?? []).length} deneme analizi · {(a.exam_names ?? []).slice(-2).join(', ')}</span>
                <span suppressHydrationWarning className="flex-shrink-0 text-[12px] font-semibold text-[var(--ink-muted)]">
                  {new Date(a.shared_at).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })}
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}
      <KarneClient exams={exams ?? []} ranks={ranks ?? []} />
    </>
  );
}
