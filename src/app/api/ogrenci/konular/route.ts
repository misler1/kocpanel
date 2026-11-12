/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { assignCurriculumForStudent } from '@/lib/curriculum-assign';

// Sadece platform öğrencisi (koçu yok): alanını seçer, Kazanım Havuzu'ndaki o alanın konuları konu ilerleyişine eklenir.
// Koçlu öğrencinin konularını koç ekler. Zaten ekli konular tekrar eklenmez. Body: { track }
const TRACKS = ['YKS_SAY', 'YKS_SOZ', 'YKS_EA', 'YKS_DIL', 'LGS'];

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Oturum bulunamadı' }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const track = String(body?.track ?? '');
  if (!TRACKS.includes(track)) return NextResponse.json({ error: 'Alanını seç' }, { status: 400 });

  const { data: student } = await (supabase as any)
    .from('students').select('id, track, platform_only').eq('profile_id', user.id).maybeSingle();
  if (!student) return NextResponse.json({ error: 'Öğrenci kaydı bulunamadı' }, { status: 404 });
  if (!student.platform_only) return NextResponse.json({ error: 'Konularını koçun ekliyor' }, { status: 403 });

  const admin = createAdminClient();
  if (student.track !== track) {
    const { error } = await (admin as any).from('students').update({ track }).eq('id', student.id);
    if (error) return NextResponse.json({ error: 'Alan kaydedilemedi' }, { status: 500 });
  }
  const res = await assignCurriculumForStudent(admin, student.id, track);
  if (res.error && res.added === 0) return NextResponse.json({ error: 'Konular eklenemedi, tekrar dene.' }, { status: 500 });
  return NextResponse.json({ ok: true, added: res.added });
}
