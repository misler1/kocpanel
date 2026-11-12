/* eslint-disable @typescript-eslint/no-explicit-any */
import { timingSafeEqual } from 'node:crypto';
import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getPushSecret } from '@/lib/push-server';
import { todayTr } from '@/lib/day-tasks';
import { buildPeriodReport, lastWeekRange, type PeriodReportData } from '@/lib/period-report';

// Her pazartesi 08:00 (Türkiye): veritabanı zamanlayıcısı (supabase/student_reports.sql → trigger_weekly_reports) burayı
// çağırır. Aktif ve koçu olan her öğrenci için geçen haftanın (pazartesi–pazar) raporu üretilip kaydedilir; koça
// "haftalık raporlar hazır" bildirimi gider. İstek app_settings.push_secret ile doğrulanır. Aynı hafta iki kez
// çağrılırsa zaten kaydedilen raporlar tekrar üretilmez.
export const maxDuration = 300;

function sameSecret(a: string, b: string) {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

/** Dönemde hiçbir şey yoksa (program, çalışma, deneme, konu) rapor kaydedilmez */
const isEmpty = (r: PeriodReportData) =>
  r.totals.planned === 0 && r.totals.questions === 0 && r.totals.minutes === 0 && r.exams.length === 0 && r.topics.progressed.length === 0;

export async function POST(request: Request) {
  const secret = await getPushSecret().catch(() => null);
  const given = request.headers.get('x-push-secret') ?? '';
  if (!secret || !sameSecret(given, secret)) return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 });

  const admin = createAdminClient() as any;
  const { start, end } = lastWeekRange(todayTr());

  const { data: students } = await admin.from('students')
    .select('id, full_name, coach_id, responsible_coach_id, platform_only, status').neq('status', 'pasif');
  const list = ((students ?? []) as any[]).filter((s) => !s.platform_only && s.coach_id);

  const { data: existing } = await admin.from('student_reports').select('student_id')
    .eq('kind', 'otomatik').eq('period_start', start).eq('period_end', end);
  const done = new Set(((existing ?? []) as any[]).map((r) => r.student_id));

  const perCoach = new Map<string, number>();
  let created = 0, skipped = 0, failed = 0;
  const todo = list.filter((s) => !done.has(s.id));
  for (let i = 0; i < todo.length; i += 5) {
    await Promise.all(todo.slice(i, i + 5).map(async (s) => {
      try {
        const data = await buildPeriodReport(admin, s.id, start, end);
        if (!data || isEmpty(data)) { skipped++; return; }
        const { error } = await admin.from('student_reports').insert({ student_id: s.id, period_start: start, period_end: end, kind: 'otomatik', data });
        if (error) { failed++; return; }
        created++;
        const coach = s.responsible_coach_id ?? s.coach_id;
        perCoach.set(coach, (perCoach.get(coach) ?? 0) + 1);
      } catch {
        failed++;
      }
    }));
  }

  // Koça tek bildirim
  const rows = Array.from(perCoach, ([coach, n]) => ({
    recipient_id: coach, kind: 'rapor', title: 'Haftalık raporlar hazır 📊',
    body: `${n} öğrencinin geçen hafta raporu oluşturuldu. Öğrenci sayfasındaki "Raporlar" sekmesinden bakabilirsiniz.`,
    link: '/ogrenciler',
  }));
  if (rows.length) await admin.from('notifications').insert(rows);

  return NextResponse.json({ ok: true, start, end, created, skipped, failed });
}
