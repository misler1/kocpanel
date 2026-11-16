import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { parsePdfWithTemplates } from '@/lib/importers/pdfTemplates';
import { diag as birlesikDiag } from '@/lib/importers/pdfTemplates/tytAytBirlesikKarne';
import { qDiag } from '@/lib/importers/pdfTemplates/questionsFromItems';
import { dsDiag } from '@/lib/importers/pdfTemplates/denemeSonucBelgesi';
import { readPdfTexts } from '@/lib/importers/readPdfTexts';
import { matchStudentName } from '@/lib/matching/matchStudent';
import { getUploadCandidates } from '@/lib/matching/uploadCandidates';

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 });

  const formData = await req.formData();
  const file = formData.get('file') as File | null;
  if (!file) return NextResponse.json({ error: 'Dosya eksik' }, { status: 400 });

  const buffer = Buffer.from(await file.arrayBuffer());
  const parsed = await readPdfTexts(buffer);

  let parsedPdf;
  try {
    parsedPdf = parsePdfWithTemplates(parsed.text, parsed.spaced, parsed.items, parsed.rects);
  } catch (e) {
    if (e instanceof Error && e.message === 'UNKNOWN_FORMAT') {
      return NextResponse.json(
        {
          error: 'Bu PDF formatı tanınmadı. Dosyayı bize iletin, yeni şablon ekleyelim.',
          debugText:
            `[teşhis] items=${parsed.items.length} itemsError=${parsed.itemsError ?? '-'} sablon=${[birlesikDiag.reason, dsDiag.reason].filter(Boolean).join(' | ') || '-'} renk=${parsed.rects.length}\n` +
            `[ilk parçalar] ${JSON.stringify(parsed.items.slice(0, 40).map((i) => [i.str, Math.round(i.x), Math.round(i.y), Math.round(i.w)]))}\n\n` +
            parsed.text.slice(0, 1500),
        },
        { status: 422 },
      );
    }
    throw e;
  }

  const { result, templateId, examType } = parsedPdf;
  if (qDiag.info) console.log('[parse-pdf] kazanım teşhis:', qDiag.info);

  // Kendi öğrencileri + stajyerlerinin öğrencileri (stajyer öğrencileri de eşleşebilsin)
  const students = await getUploadCandidates(supabase, user.id);

  const preview = result.records.map((r, i) => ({
    rowIndex: i,
    rawName: r.rawName,
    results: r.results,
    puan: r.puan,
    puanlar: r.puanlar,
    examType: r.examType ?? examType,
    questions: r.questions,
    averages: r.averages,
    rankings: r.rankings,
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
     
    students: students,
  });
}