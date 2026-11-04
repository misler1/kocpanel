// src/app/api/denemeler/toplu-yukle/kaydet/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { calcExamNet } from '@/app/denemeler/examConstants';

interface ConfirmedRow {
  studentId: string;
  results: Record<string, { dogru: string; yanlis: string }>;
  puan?: number;
  puanlar?: { say?: number; ea?: number; soz?: number }; // AYT puanları
  questions?: unknown[]; // konu/kazanım analizi (varsa exams.question_results'a yazılır)
  averages?: Record<string, number>; // ders ortalamaları → exams.subject_averages
  rankings?: Record<string, unknown>; // sıralamalar → exams.rankings
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 });

  const { examType, examName, examDate, rows }: {
    examType: 'TYT' | 'AYT' | 'LGS'; examName: string; examDate: string; rows: ConfirmedRow[];
  } = await req.json();

  const missing = [
    !examType && 'deneme türü',
    !examName && 'deneme adı',
    !examDate && 'tarih',
    !rows?.length && 'öğrenci satırı',
  ].filter(Boolean);
  if (missing.length) {
    return NextResponse.json({ error: `Eksik veri: ${missing.join(', ')}` }, { status: 400 });
  }

  const maxScore = examType === 'TYT' ? 120 : examType === 'AYT' ? 160 : 90;

  // Aynı deneme (tür + ad + tarih) aynı öğrenciye ikinci kez eklenmez: hem bu istekteki tekrarlar
  // hem de daha önce kaydedilmiş olanlar atlanır (çift tıklama / yeniden gönderme koruması).
  const norm = (s: string) => (s ?? '').toLocaleLowerCase('tr').replace(/\s+/g, ' ').trim();
  const studentIds = [...new Set(rows.map((r) => r.studentId).filter(Boolean))];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: prev, error: prevErr } = await (supabase as any)
    .from('exams').select('student_id, exam_name')
    .in('student_id', studentIds).eq('exam_type', examType).eq('exam_date', examDate);
  if (prevErr) return NextResponse.json({ error: prevErr.message }, { status: 500 });
  const taken = new Set<string>(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (prev ?? []).filter((e: any) => norm(e.exam_name) === norm(examName)).map((e: any) => e.student_id as string),
  );
  const toInsert = rows.filter((r) => {
    if (!r.studentId || taken.has(r.studentId)) return false;
    taken.add(r.studentId);
    return true;
  });
  const skipped = rows.length - toInsert.length;
  if (toInsert.length === 0) return NextResponse.json({ inserted: 0, skipped });

  const inserts = toInsert.map((r) => {
    const netScore = calcExamNet(examType, r.results);

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
      ...(examType === 'AYT' && r.puanlar
        ? { say_puan: r.puanlar.say ?? null, ea_puan: r.puanlar.ea ?? null, soz_puan: r.puanlar.soz ?? null }
        : {}),
      analysis_done: false,
      // Sütun yalnızca konu analizi olan satırlarda gönderilir (eski akışlar etkilenmez)
      ...(r.questions && r.questions.length ? { question_results: r.questions } : {}),
      ...(r.averages && Object.keys(r.averages).length ? { subject_averages: r.averages } : {}),
      ...(r.rankings && Object.keys(r.rankings).length ? { rankings: r.rankings } : {}),
    };
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error, data } = await (supabase as any).from('exams').insert(inserts).select('id');
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ inserted: data?.length ?? 0, skipped });
}