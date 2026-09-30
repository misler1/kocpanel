import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { parsePdfExamText } from '@/lib/importers/parsePdfExam';
import { matchStudentName } from '@/lib/matching/matchStudent';

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 });

  const formData = await req.formData();
  const file = formData.get('file') as File | null;
  if (!file) return NextResponse.json({ error: 'Dosya eksik' }, { status: 400 });

  // pdf-parse CommonJS modülü — dynamic import ile
  const pdfParse = (await import('pdf-parse')).default;
  const buffer = Buffer.from(await file.arrayBuffer());
  const parsed = await pdfParse(buffer);

  const { examName, examDate, records } = parsePdfExamText(parsed.text);

  if (records.length === 0) {
    return NextResponse.json({
      error: 'PDF içinden öğrenci verisi çıkarılamadı. Format desteklenmiyor olabilir.',
      debugText: parsed.text.slice(0, 3000),
    }, { status: 422 });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: students } = await (supabase as any)
    .from('students').select('id, full_name')
    .eq('coach_id', user.id).neq('status', 'pasif');

  const preview = records.map((r, i) => {
    const match = matchStudentName(r.rawName, students ?? []);
    return { rowIndex: i, rawName: r.rawName, results: r.results, match };
  });

  return NextResponse.json({
    preview,
    examName,
    examDate,
    students: (students ?? []).map((s: any) => ({ id: s.id, full_name: s.full_name })),
  });
}