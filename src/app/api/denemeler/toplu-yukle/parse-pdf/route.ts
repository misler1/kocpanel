import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { parsePdfWithTemplates } from '@/lib/importers/pdfTemplates';
import { matchStudentName } from '@/lib/matching/matchStudent';

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 });

  const formData = await req.formData();
  const file = formData.get('file') as File | null;
  if (!file) return NextResponse.json({ error: 'Dosya eksik' }, { status: 400 });

  const pdfParse = (await import('pdf-parse')).default;
  const buffer = Buffer.from(await file.arrayBuffer());
  const parsed = await pdfParse(buffer);

  let parsedPdf;
  try {
    parsedPdf = parsePdfWithTemplates(parsed.text);
  } catch (e) {
    if (e instanceof Error && e.message === 'UNKNOWN_FORMAT') {
      return NextResponse.json(
        {
          error: 'Bu PDF formatı tanınmadı. Dosyayı bize iletin, yeni şablon ekleyelim.',
          debugText: parsed.text.slice(0, 3000),
        },
        { status: 422 },
      );
    }
    throw e;
  }

  const { result, templateId, examType } = parsedPdf;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: students } = await (supabase as any)
    .from('students').select('id, full_name')
    .eq('coach_id', user.id).neq('status', 'pasif');

  const preview = result.records.map((r, i) => ({
    rowIndex: i,
    rawName: r.rawName,
    results: r.results,
    puan: r.puan,
    examName: r.examName ?? result.examName,
    examDate: r.examDate ?? result.examDate,
    match: matchStudentName(r.rawName, students ?? []),
  }));

  return NextResponse.json({
    preview,
    templateId,
    examType,
    examName: result.examName,
    examDate: result.examDate,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    students: (students ?? []).map((s: any) => ({ id: s.id, full_name: s.full_name })),
  });
}