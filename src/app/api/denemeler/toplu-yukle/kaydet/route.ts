
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { calcNetYKS, calcNetLGS, TYT_SUBJECTS, AYT_SUBJECTS, LGS_SUBJECTS } from '@/app/denemeler/examConstants';
interface ConfirmedRow {
  studentId: string;
  results: Record<string, { dogru: string; yanlis: string }>;
  puan?: number;
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 });

  const { examType, examName, examDate, rows }: {
    examType: 'TYT' | 'AYT' | 'LGS'; examName: string; examDate: string; rows: ConfirmedRow[];
  } = await req.json();

  if (!examName || !examDate || !rows?.length) {
    return NextResponse.json({ error: 'Eksik veri' }, { status: 400 });
  }

  const subjects = examType === 'TYT' ? TYT_SUBJECTS : examType === 'AYT' ? AYT_SUBJECTS : LGS_SUBJECTS;
  const maxScore = examType === 'TYT' ? 120 : examType === 'AYT' ? 160 : 90;

  const inserts = rows.map((r) => {
    let total = 0;
    const seen = new Set<string>();
    for (const s of subjects) {
      if (seen.has(s.key)) continue;
      seen.add(s.key);
      const res = r.results[s.key];
      if (!res) continue;
      const d = Number(res.dogru) || 0;
      const y = Number(res.yanlis) || 0;
      total += examType === 'LGS' ? calcNetLGS(d, y) : calcNetYKS(d, y);
    }
    const netScore = Math.round(total * 100) / 100;

    return {
      student_id: r.studentId,
      exam_name: examName.trim(),
      exam_date: examDate,
      exam_type: examType,
      net_score: netScore,
      max_score: maxScore,
      subject_results: r.results,
      tyt_puan: examType === 'TYT' ? r.puan ?? null : null,
      lgs_puan: examType === 'LGS' ? r.puan ?? null : null,
      analysis_done: false,
    };
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error, data } = await (supabase as any).from('exams').insert(inserts).select('id');
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ inserted: data?.length ?? 0 });
}