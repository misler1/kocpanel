/* eslint-disable @typescript-eslint/no-explicit-any */
import { createClient } from '@/lib/supabase/server';
import { buildStudentContext, runAssistant, type AssistantKind } from '@/lib/ai/studentAssistant';

// Öğrenci detayı > Yapay zeka asistanı: haftalık öneri / program taslağı / görüşme hazırlığı.
// Yalnızca öğrencinin koçu kullanabilir. Sonuç kaydedilmez; program taslağını koç onaylarsa tarayıcı programa yazar.
export const maxDuration = 300;

const KINDS: AssistantKind[] = ['haftalik', 'program', 'gorusme'];

export async function POST(req: Request) {
  try {
    const { studentId, kind } = (await req.json()) as { studentId?: string; kind?: AssistantKind };
    if (!studentId || !kind || !KINDS.includes(kind)) return Response.json({ error: 'Eksik veri' }, { status: 400 });

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return Response.json({ error: 'Oturum bulunamadı.' }, { status: 401 });

    const db = supabase as any;
    const { data: student } = await db.from('students')
      .select('id, track, grade_level, target_university, target_department, target_rank, target_nets')
      .eq('id', studentId).eq('coach_id', user.id).maybeSingle();
    if (!student) return Response.json({ error: 'Öğrenci bulunamadı.' }, { status: 404 });

    const ctx = await buildStudentContext(db, student);
    const { result, provider } = await runAssistant(kind, ctx);
    return Response.json({ ...result, provider, created_at: new Date().toISOString() });
  } catch (err) {
    console.error('Öğrenci asistanı hatası:', err);
    return Response.json({ error: err instanceof Error ? err.message : 'Öneri hazırlanamadı.' }, { status: 500 });
  }
}
