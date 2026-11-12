/* eslint-disable @typescript-eslint/no-explicit-any */
import { getStudentContext } from '@/lib/student-context';
import { TRACK_RESOURCES } from '@/lib/track-resources';
import { activeDays, computeBadges, questionTotals, streakInfo, targetRows, trDate } from '@/lib/student-motivation';
import { OgrenciAnasayfaClient } from './OgrenciAnasayfaClient';
import { isTopicDone, TOPIC_FLAG_COLUMNS } from '@/lib/topic-done';

const DAYS = ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi', 'Pazar'];

export default async function OgrenciAnaSayfa() {
  const { supabase, student, profile } = await getStudentContext();

  if (!student) {
    return (
      <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-6 text-center text-sm text-[var(--ink-muted)]">
        Merhaba {profile.full_name}. Hesabın henüz bir öğrenci kaydına bağlanmamış; koçunla iletişime geç.
      </div>
    );
  }

  // Sunucu UTC'de çalışır; gün sınırı Türkiye saatine göre
  const today = trDate();
  const todayIndex = (new Date(`${today}T12:00:00Z`).getUTCDay() + 6) % 7; // Pazartesi=0

  const [
    { data: weekRows }, { data: topics }, { data: exams }, { data: rank }, { data: pendingReqs },
    { data: dailyLogs }, { data: allTasks }, { data: feed },
  ] = await Promise.all([
    (supabase as any)
      .from('question_logs').select('*').eq('student_id', student.id)
      .lte('week_start', today).order('week_start', { ascending: false }).limit(60),
    (supabase as any)
      .from('topic_progress').select(TOPIC_FLAG_COLUMNS).eq('student_id', student.id),
    (supabase as any)
      .from('exams').select('id, exam_name, exam_type, exam_date, net_score').eq('student_id', student.id).order('exam_date', { ascending: false }),
    (supabase as any).rpc('student_exam_ranks'),
    (supabase as any)
      .from('weekly_plan_requests').select('id').eq('student_id', student.id).eq('status', 'bekliyor'),
    (supabase as any)
      .from('daily_logs').select('log_date, question_solved, topic_studies').eq('student_id', student.id)
      .order('log_date', { ascending: false }).limit(800),
    (supabase as any)
      .from('question_logs').select('week_start, student_done, student_done_at').eq('student_id', student.id).limit(5000),
    // Koçun paylaşımları ve pano (home_feed.sql çalıştırılmamışsa boş döner)
    (supabase as any).rpc('student_feed'),
  ]);

  // Bugünü içeren en güncel hafta
  const currentWeekStart = (weekRows ?? []).find((l: any) => !l.week_end || today <= l.week_end)?.week_start ?? null;
  const weekLogs = currentWeekStart ? (weekRows ?? []).filter((l: any) => l.week_start === currentWeekStart) : [];
  const todayLogs = weekLogs.filter((l: any) => l.plan_day === todayIndex);
  const currentWeekEnd = weekLogs[0]?.week_end ?? null;

  const topicList = topics ?? [];
  const topicsDone = topicList.filter((t: any) => isTopicDone(t)).length;

  const examList = exams ?? [];
  const lastExam = examList[0] ?? null;
  const lastExamRank = lastExam ? (rank ?? []).find((r: any) => r.exam_id === lastExam.id) : null;

  const logs = dailyLogs ?? [];
  const tasks = allTasks ?? [];
  const days = activeDays(logs, tasks);
  const streak = streakInfo(days, today);
  const questions = questionTotals(logs, today);
  const badges = computeBadges({
    days, bestStreak: streak.best, totalQuestions: questions.total, tasks, exams: examList, topicsDone,
  });
  const resourceSubjects = Object.keys(student.resources ?? {});
  const subjects = resourceSubjects.length ? resourceSubjects : (TRACK_RESOURCES[student.track] ?? []);

  return (
    <OgrenciAnasayfaClient
      studentId={student.id}
      programDay={currentWeekStart ? { weekStart: currentWeekStart, weekEnd: currentWeekEnd, planDay: todayIndex } : null}
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
      streak={streak}
      todayQuestions={questions.today}
      targets={targetRows(student.track, student.target_nets ?? {}, examList)}
      badges={badges}
      subjects={subjects}
      feed={feed ?? []}
    />
  );
}
