import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// Toplu yüklemede "bu deneme bu öğrenci için zaten kayıtlı mı?" kontrolü için
// seçilen türdeki mevcut denemelerin (öğrenci, ad, tarih) özetini döner.
export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 });

  const examType = req.nextUrl.searchParams.get('examType');
  if (!examType) return NextResponse.json({ error: 'examType eksik' }, { status: 400 });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('exams')
    .select('student_id, exam_name, exam_date')
    .eq('exam_type', examType)
    .limit(20000);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ existing: data ?? [] });
}