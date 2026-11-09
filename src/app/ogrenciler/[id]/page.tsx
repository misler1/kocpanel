/* eslint-disable @typescript-eslint/no-explicit-any */
import { redirect, notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getRequestUser } from '@/lib/supabase/request-cache';
import { createAdminClient } from '@/lib/supabase/admin';
import { OgrenciDetayClient, type DetayStats } from './OgrenciDetayClient';
import { OgrenciArsivdenCikarButton } from './OgrenciArsivdenCikarButton';
import { VeliErisimPanel } from './VeliErisimPanel';
import { HedefNetPanel } from './HedefNetPanel';
import { HatirlatmaPanel } from './HatirlatmaPanel';
import { shiftDay, targetRows, trDate } from '@/lib/student-motivation';
import { getStaffAccess } from '@/lib/staff-access';
import { AnalizListesi, type AnalizOzet } from './AnalizListesi';

const daysBetween = (from: string, to: string) =>
  Math.round((new Date(`${to}T12:00:00Z`).getTime() - new Date(`${from}T12:00:00Z`).getTime()) / 86_400_000);

export default async function OgrenciDetayPage({ params, searchParams }: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ sekme?: string; gorusme?: string }>;
}) {
  const { id } = await params;
  const { sekme, gorusme } = await searchParams;
  const supabase = await createClient();
  const user = await getRequestUser();
  if (!user) redirect('/giris');

  // Kurum personeli (yurt yöneticisi/belletmen) koçun öğrencisini görür; hangi öğrenciler olduğunu veritabanı izni belirler
  const access = await getStaffAccess(supabase, user.id);
  const isScopedStaff = access.kind === 'manager' || access.kind === 'belletmen';
  let studentQuery = supabase.from('students').select('*').eq('id', id);
  if (!isScopedStaff) studentQuery = studentQuery.eq('coach_id', user.id);
  const { data: rawStudent } = await studentQuery.single();

  const student = rawStudent as any;
  if (!student) notFound();

  const today = trDate();
  const nowIso = new Date().toISOString();
  const db = supabase as any;

  const [
    { data: rawMeetings }, { data: nextMeetings }, { data: rawExams }, { data: rawTasks }, { data: rawExamNets },
    { data: weekRows }, { data: dailyRows }, pushRes, { data: analizler },
  ] = await Promise.all([
    db.from('meetings').select('*, created_by_profile:created_by(id, full_name)').eq('student_id', id)
      .order('scheduled_at', { ascending: false }).limit(5),
    // İleri tarihli ilk öğrenci görüşmesi (veli görüşmeleri sayılmaz)
    db.from('meetings').select('scheduled_at, meeting_type').eq('student_id', id)
      .gt('scheduled_at', nowIso).order('scheduled_at', { ascending: true }).limit(5),
    db.from('exams').select('*').eq('student_id', id).order('exam_date', { ascending: false }).limit(5),
    db.from('tasks').select('*').eq('student_id', id).eq('completed', false).order('created_at', { ascending: false }),
    // Hedef net satırları için tüm denemelerin yalnızca tür ve net bilgisi
    db.from('exams').select('exam_type, exam_date, net_score').eq('student_id', id),
    db.from('question_logs').select('week_start, week_end, student_done, appointment_id').eq('student_id', id)
      .gte('week_start', shiftDay(today, -13)).lte('week_start', today),
    db.from('daily_logs').select('log_date, question_solved, archived').eq('student_id', id)
      .gte('log_date', shiftDay(today, -6)).lte('log_date', today),
    // Öğrencinin telefon bildirimi açık mı (abonelikler yalnızca sunucudan okunur; tarayıcıya yalnızca evet/hayır gider)
    student.profile_id
      ? (createAdminClient() as any).from('push_subscriptions')
        .select('id', { count: 'exact', head: true }).eq('user_id', student.profile_id)
      : Promise.resolve({ count: 0 }),
    // Bu öğrenci için yapılan deneme analizleri (yalnızca analizi yapan görür; tablo yoksa boş)
    db.from('exam_analyses').select('id, exam_names, created_at, shared_at').eq('student_id', id)
      .order('created_at', { ascending: false }).limit(20),
  ]);

  const meetings: any[] = rawMeetings ?? [];
  const exams: any[] = rawExams ?? [];
  const targets = targetRows(student.track, student.target_nets ?? {}, (rawExamNets as any[]) ?? []);

  // ── Özet kartları (ana sayfadaki hesapla aynı) ──
  // Bu haftanın programı: bugünü kapsayan en güncel program haftası; Ajanda'dan gelen görüşme görevleri sayılmaz
  const progs = ((weekRows as any[]) ?? []).filter((t) => !t.appointment_id && t.week_start <= today && (!t.week_end || today <= t.week_end));
  const curStart = progs.reduce((max: string, t: any) => (t.week_start > max ? t.week_start : max), '');
  const week = progs.filter((t) => t.week_start === curStart);
  const questions7 = ((dailyRows as any[]) ?? []).filter((l) => !l.archived)
    .reduce((sum, l) => sum + (l.question_solved ?? []).reduce((a: number, q: any) => a + (Number(q?.count) || 0), 0), 0);
  const last = exams[0] ?? null;
  const prevSame = last ? exams.find((e) => e.id !== last.id && (e.exam_type ?? 'TYT') === (last.exam_type ?? 'TYT')) : null;
  // Son öğrenci görüşmesi: geçmiş tarihli, veli görüşmesi olmayan
  const lastMeeting = meetings.find((m) => m.meeting_type !== 'veli' && m.scheduled_at <= nowIso) ?? null;

  const stats: DetayStats = {
    week: week.length ? { total: week.length, done: week.filter((t) => t.student_done).length } : null,
    questions7,
    lastExam: last ? {
      name: last.exam_name ?? 'Deneme', type: last.exam_type ?? 'TYT', net: Number(last.net_score) || 0,
      delta: prevSame ? (Number(last.net_score) || 0) - (Number(prevSame.net_score) || 0) : null,
    } : null,
    lastMeetingDays: lastMeeting ? daysBetween(trDate(lastMeeting.scheduled_at), today) : null,
    nextMeeting: ((nextMeetings as any[]) ?? []).find((m) => m.meeting_type !== 'veli')?.scheduled_at ?? null,
  };

  return (
    <div className="mx-auto max-w-[1500px]">
      <OgrenciDetayClient
        initialPanel={gorusme === '1'}
        student={student}
        meetings={meetings}
        exams={exams}
        tasks={(rawTasks as any[]) ?? []}
        stats={stats}
        initialTab={sekme}
        access={access.kind}
        headerExtra={student.status === 'pasif' ? <OgrenciArsivdenCikarButton studentId={id} /> : null}
        hedefPanel={<>
          <HedefNetPanel studentId={id} rows={targets} targetNets={student.target_nets ?? null} />
          <AnalizListesi studentId={id} items={((analizler as AnalizOzet[]) ?? [])} />
        </>}
        settingsPanels={isScopedStaff ? null : (
          <>
            <HatirlatmaPanel studentId={id} coachId={user.id} times={student.reminder_times ?? []}
              days={student.reminder_days ?? [0, 1, 2, 3, 4, 5, 6]} hasAccount={!!student.profile_id}
              pushOn={((pushRes as any).count ?? 0) > 0} />
            <VeliErisimPanel student={student} />
          </>
        )}
      />
    </div>
  );
}
