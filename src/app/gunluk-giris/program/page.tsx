/* eslint-disable @typescript-eslint/no-explicit-any */
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { getRequestUser } from '@/lib/supabase/request-cache';
import { addDays } from '@/lib/program-days';
import { todayTr } from '@/lib/day-tasks';
import { ProgramYapClient } from '@/app/ogrenci/haftalik-takip/program-yap/ProgramYapClient';

// Belletmen / yurt personeli öğrenci adına 7 günlük program hazırlar; koçun onayına gider (staff_programs.sql).
// Koçun kendisi hazırlarsa hemen geçerli olur.
export default async function PersonelProgramPage({ searchParams }: { searchParams: Promise<{ ogrenci?: string }> }) {
  const user = await getRequestUser();
  if (!user) redirect('/giris');
  const { ogrenci } = await searchParams;
  if (!ogrenci) redirect('/gunluk-giris');
  const supabase = await createClient();

  // RLS: yalnızca erişebildiği öğrenci gelir
  const { data: student } = await (supabase as any)
    .from('students').select('id, full_name, track, resources, coach_id, responsible_coach_id').eq('id', ogrenci).maybeSingle();
  if (!student) {
    return (
      <div className="mx-auto max-w-2xl rounded-2xl border border-dashed border-gray-200 bg-white py-12 text-center text-gray-500">
        Öğrenci bulunamadı. <Link href="/gunluk-giris" className="font-semibold text-emerald-700 underline">Günlük takibe dön</Link>
      </div>
    );
  }
  const { data: me } = await (supabase as any).from('profiles').select('is_admin').eq('id', user.id).maybeSingle();
  const isCoach = student.coach_id === user.id || student.responsible_coach_id === user.id || !!me?.is_admin;

  const today = todayTr();
  const { data: logs } = await (supabase as any)
    .from('question_logs')
    .select('week_start, week_end, plan_day, subject, topic, resource_name, target_count, start_time, end_time, appointment_id, student_added, student_plan')
    .eq('student_id', student.id).is('appointment_id', null)
    .order('week_start', { ascending: false }).limit(400);
  const rows: any[] = logs ?? [];

  const ranges = new Map<string, { ws: string; we: string | null; coach: boolean }>();
  for (const l of rows) {
    const r = ranges.get(l.week_start) ?? { ws: l.week_start, we: l.week_end ?? null, coach: false };
    if (!l.student_plan && !l.student_added) r.coach = true;
    ranges.set(l.week_start, r);
  }
  const list = Array.from(ranges.values());
  const end = (r: { ws: string; we: string | null }) => r.we ?? addDays(r.ws, 6);
  const current = list.filter((r) => r.ws <= today && end(r) >= today).sort((a, b) => (end(a) < end(b) ? 1 : -1))[0];
  const defaultStart = current ? addDays(end(current), 1) : today;
  const lastWs = rows.find((l) => !l.student_added || l.student_plan)?.week_start;
  const lastProgram = lastWs ? rows.filter((l) => l.week_start === lastWs && (!l.student_added || l.student_plan)) : [];

  return (
    <div className="mx-auto max-w-3xl">
      <ProgramYapClient
        platformOnly={false}
        track={student.track ?? 'DIGER'}
        resources={student.resources ?? {}}
        defaultStart={defaultStart}
        today={today}
        coachRanges={list.filter((r) => r.coach).map(({ ws, we }) => ({ ws, we }))}
        lastProgram={lastProgram}
        staff={{ studentId: student.id, studentName: student.full_name, isCoach }}
      />
    </div>
  );
}
