
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { parseExcelBuffer, type ExcelColumnMapping } from '@/lib/importers/parseExamExcel';
import { matchStudentName } from '@/lib/matching/matchStudent';
import { getUploadCandidates } from '@/lib/matching/uploadCandidates';

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 });

  const formData = await req.formData();
  const file = formData.get('file') as File | null;
  const examType = formData.get('examType') as 'TYT' | 'AYT' | 'LGS';
  const manualMappingRaw = formData.get('manualMapping') as string | null;

  if (!file || !examType) {
    return NextResponse.json({ error: 'Dosya veya deneme türü eksik' }, { status: 400 });
  }

  const buffer = await file.arrayBuffer();
  const manualMapping: ExcelColumnMapping | undefined = manualMappingRaw ? JSON.parse(manualMappingRaw) : undefined;
  const { headers, rows, mapping } = parseExcelBuffer(buffer, examType, manualMapping);

  // Kendi öğrencileri + stajyerlerinin öğrencileri (stajyer öğrencileri de eşleşebilsin)
  const students = await getUploadCandidates(supabase, user.id);

   const preview = rows.map((r) => {
    const match = matchStudentName(r.rawName, students ?? []);
    return { ...r, match };
  });

  return NextResponse.json({
    headers,
    mapping,
    preview,
    students: students,
  });
  
}

