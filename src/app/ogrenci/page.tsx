/* eslint-disable @typescript-eslint/no-explicit-any */
import { getStudentContext } from '@/lib/student-context';
import { OgrenciAnasayfaClient } from './OgrenciAnasayfaClient';

const DAYS = ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi', 'Pazar'];

function todayStr() {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export default async function OgrenciAnaSayfa() {
  const { supabase, student, profile } = await getStudentContext();

  if (!student) {
    return (
      <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-6 text-center text-sm text-[var(--ink-muted)]">
        Merhaba {profile.full_name}. Hesabın henüz bir öğrenci kaydına bağlanmamış; koçunla iletişime geç.
      </div>
    );
  }

  const today = todayStr();
  const todayIndex = (new Date().getDay() + 6) % 7; // Pazartesi=0

  const [{ data: weekRows }, { data: topics }, { data: exams }, { data: rank }, { data: pendingReqs }] = await Promise.all([
    (supabase as any)
      .from('question_logs').select('*').eq('student_id', student.id)
      .lte('week_start', today).order('week_start', { ascending: false }).limit(60),
    (supabase as any)
      .from('topic_progress').select('konu_tamamlandi, kaynak1_sorular, yanlislar_kontrol').eq('student_id', student.id),
    (supabase as any)
      .from('exams').select('*').eq('student_id', student.id).order('exam_date', { ascending: false }).limit(1),
    (supabase as any).rpc('student_exam_ranks'),
    (supabase as any)
      .from('weekly_plan_requests').select('id').eq('student_id', student.id).eq('status', 'bekliyor'),
  ]);

  // Bugünü içeren en güncel hafta
  const currentWeekStart = (weekRows ?? []).find((l: any) => !l.week_end || today <= l.week_end)?.week_start ?? null;
  const weekLogs = currentWeekStart ? (weekRows ?? []).filter((l: any) => l.week_start === currentWeekStart) : [];
  const todayLogs = weekLogs.filter((l: any) => l.plan_day === todayIndex);

  const topicList = topics ?? [];
  const topicsDone = topicList.filter((t: any) => t.konu_tamamlandi && t.kaynak1_sorular && t.yanlislar_kontrol).length;

  const lastExam = exams?.[0] ?? null;
  const lastExamRank = lastExam ? (rank ?? []).find((r: any) => r.exam_id === lastExam.id) : null;

  return (
    <OgrenciAnasayfaClient
      fullName={student.full_name}
      todayLabel={DAYS[todayIndex]}
      todayLogs={todayLogs}
      weekTotal={weekLogs.length}
      weekDone={weekLogs.filter((l: any) => l.student_done).length}
      topicsDone={topicsDone}
      topicsTotal={topicList.length}
      lastExam={lastExam}
      lastExamRank={lastExamRank}
      pendingRequests={pendingReqs?.length ?? 0}
    />
  );
}
