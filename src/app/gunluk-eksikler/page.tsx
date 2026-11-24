/* eslint-disable @typescript-eslint/no-explicit-any */
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { getRequestUser, getRequestScope } from '@/lib/supabase/request-cache';
import { applyStudentScope } from '@/lib/effective-coach';
import { todayTr, shiftDate, type TaskRow } from '@/lib/day-tasks';
import { classifyMissingDaily, type MdStudent } from '@/lib/missing-daily';
import { GunlukEksiklerClient } from './GunlukEksiklerClient';

// Sabah 10:00 "Dün günlük girmeyenler" bildiriminin açtığı sayfa (supabase/gunluk_eksikler.sql).
export default async function GunlukEksiklerPage({ searchParams }: { searchParams: Promise<{ gun?: string; k?: string }> }) {
  const user = await getRequestUser();
  if (!user) redirect('/giris');
  const { gun, k } = await searchParams;
  const today = todayTr();
  const day = gun && /^\d{4}-\d{2}-\d{2}$/.test(gun) && gun <= today ? gun : shiftDate(today, -1);

  const supabase = await createClient();
  // Stajyerin özetinin kopyasından gelindiyse (k = stajyer) stajyerlerin öğrencileri de gösterilir
  const includeInterns = (await cookies()).get('show_interns')?.value === '1' || (!!k && k !== user.id);
  const scope = await getRequestScope(user.id, includeInterns);

  const base = 'id, full_name, sinif_sube, profile_id, reminder_days, platform_only';
  const first = await applyStudentScope(
    (supabase as any).from('students').select(`${base}, daily_alert_muted_until, daily_alert_mute_reason`).neq('status', 'pasif'),
    scope,
  );
  const muteReady = !first.error; // gunluk_eksikler.sql çalıştırılmadıysa sütunlar yok: onlarsız listele
  const rows = muteReady
    ? first.data
    : (await applyStudentScope((supabase as any).from('students').select(base).neq('status', 'pasif'), scope)).data;

  const students: MdStudent[] = ((rows as any[]) ?? [])
    .filter((s) => !s.platform_only)
    .map((s) => ({
      id: s.id, full_name: s.full_name ?? '', sinif_sube: s.sinif_sube ?? null, profile_id: s.profile_id ?? null,
      reminder_days: Array.isArray(s.reminder_days) ? s.reminder_days : null,
      muted_until: s.daily_alert_muted_until ?? null, mute_reason: s.daily_alert_mute_reason ?? null,
    }));
  const ids = students.filter((s) => s.profile_id).map((s) => s.id);

  const [tasksRes, logsRes, signedRes] = ids.length
    ? await Promise.all([
        (supabase as any).from('question_logs')
          .select('id, student_id, subject, topic, resource_name, week_start, week_end, plan_day, target_count, topic_target_minutes, done_count, topic_done_minutes, student_done, student_missed, student_added, start_time, end_time, appointment_id')
          .in('student_id', ids).lte('week_start', day).gte('week_start', shiftDate(day, -40)),
        (supabase as any).from('daily_logs').select('student_id').in('student_id', ids).eq('log_date', day).or('archived.is.null,archived.eq.false'),
        (supabase as any).rpc('students_signed_in', { p_ids: ids }),
      ])
    : [{ data: [] }, { data: [] }, { data: [] }];

  const signedIn = signedRes.error ? null : new Set<string>(((signedRes.data as any[]) ?? []).map((x) => (typeof x === 'string' ? x : x.students_signed_in)));
  const logIds = new Set<string>(((logsRes.data as any[]) ?? []).map((l) => l.student_id));
  const result = classifyMissingDaily(students, (tasksRes.data as TaskRow[]) ?? [], logIds, signedIn, day);

  return <GunlukEksiklerClient key={day} day={day} today={today} result={result} muteReady={muteReady && !signedRes.error} />;
}
