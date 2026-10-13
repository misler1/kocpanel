import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { parsePdfExamText } from '@/lib/importers/parsePdfExam';
import { parsePdfWithTemplates } from '@/lib/importers/pdfTemplates';
import { tytTekKarneTemplate } from '@/lib/importers/pdfTemplates/tytTekKarne';
import { tytSiraliListeTemplate } from '@/lib/importers/pdfTemplates/tytSiraliListe';
import { konuAnalizliSinavSonucuTemplate } from '@/lib/importers/pdfTemplates/konuAnalizliSinavSonucu';
import type { PdfParseResult } from '@/lib/importers/pdfTemplates';
import { matchStudentName } from '@/lib/matching/matchStudent';

// Geçici teşhis için; sorun çözülünce kaldırılabilir
const TEMPLATE_PROBE = [tytSiraliListeTemplate, tytTekKarneTemplate, konuAnalizliSinavSonucuTemplate];

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

  // 1) Şablon sistemi (TYT sıralı liste, TYT tek karne, LGS konu analizli ...)
  // 2) Hiçbiri tutmazsa eski LGS ayrıştırıcısı yedek olarak denenir
  let result: PdfParseResult;
  let templateId: string | null = null;
  let examType: string | null = null;
  try {
    const out = parsePdfWithTemplates(parsed.text);
    result = out.result;
    templateId = out.templateId;
    examType = out.examType;
  } catch (e) {
    if (!(e instanceof Error) || e.message !== 'UNKNOWN_FORMAT') throw e;
    result = parsePdfExamText(parsed.text);
  }

  const { examName, examDate, records } = result;

  if (records.length === 0) {
    // Teşhis: her şablonun bu metinde ne yaptığını hata kutusuna yaz
    const text: string = parsed.text;
    const diag = {
      route: 'v2-templates',
      len: text.length,
      hasNFD: text !== text.normalize('NFC'),
      hasCR: text.includes('\r'),
      templates: TEMPLATE_PROBE.map((t) => {
        try {
          const can = t.canParse(text);
          return `${t.id}: canParse=${can}${can ? ` records=${t.parse(text).records.length}` : ''}`;
        } catch (e) {
          return `${t.id}: HATA ${(e as Error).message}`;
        }
      }),
      around: JSON.stringify(text.slice(text.indexOf('TYT-T') - 5, text.indexOf('TYT-T') + 60)),
    };
    return NextResponse.json({
      error: 'PDF içinden öğrenci verisi çıkarılamadı. Format desteklenmiyor olabilir.',
      debugText: `[TEŞHİS] ${JSON.stringify(diag)}\n${text.slice(0, 1500)}`,
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
    templateId,
    examType,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    students: (students ?? []).map((s: any) => ({ id: s.id, full_name: s.full_name })),
  });
}