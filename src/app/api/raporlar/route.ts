/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { buildPeriodReport } from '@/lib/period-report';

// Koç istediği tarih aralığı için rapor üretir ve öğrencinin sayfasına kaydeder. Body: { studentId, start, end }
// Yetki: öğrencinin koçu, sorumlu koçu ya da yönetici (raporlar tablosunun silme kuralıyla aynı).
const DATE = /^\d{4}-\d{2}-\d{2}$/;

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Oturum bulunamadı' }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const studentId = String(body?.studentId ?? '');
  const start = String(body?.start ?? '');
  const end = String(body?.end ?? '');
  if (!/^[0-9a-f-]{36}$/i.test(studentId) || !DATE.test(start) || !DATE.test(end)) {
    return NextResponse.json({ error: 'Geçersiz istek' }, { status: 400 });
  }
  if (end < start) return NextResponse.json({ error: 'Bitiş tarihi başlangıçtan önce olamaz' }, { status: 400 });
  const days = (Date.parse(end) - Date.parse(start)) / 86_400_000 + 1;
  if (days > 186) return NextResponse.json({ error: 'En fazla 6 aylık rapor alınabilir' }, { status: 400 });

  const [{ data: s }, { data: me }] = await Promise.all([
    (supabase as any).from('students').select('id, coach_id, responsible_coach_id').eq('id', studentId).maybeSingle(),
    (supabase as any).from('profiles').select('is_admin').eq('id', user.id).maybeSingle(),
  ]);
  if (!s) return NextResponse.json({ error: 'Öğrenci bulunamadı' }, { status: 404 });
  if (!(s.coach_id === user.id || s.responsible_coach_id === user.id || me?.is_admin)) {
    return NextResponse.json({ error: 'Bu öğrenci için rapor alma yetkiniz yok' }, { status: 403 });
  }

  const admin = createAdminClient() as any;
  const data = await buildPeriodReport(admin, studentId, start, end);
  if (!data) return NextResponse.json({ error: 'Rapor oluşturulamadı' }, { status: 500 });
  const { data: row, error } = await admin.from('student_reports')
    .insert({ student_id: studentId, period_start: start, period_end: end, kind: 'elle', data, created_by: user.id })
    .select('id').single();
  if (error) {
    const missing = /student_reports/.test(error.message ?? '') && /exist|schema cache/i.test(error.message ?? '');
    return NextResponse.json({ error: missing ? 'Raporlar henüz etkin değil (student_reports.sql çalıştırılmalı).' : 'Rapor kaydedilemedi' }, { status: 500 });
  }
  return NextResponse.json({ ok: true, id: row.id });
}
