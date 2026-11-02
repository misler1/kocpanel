/* eslint-disable @typescript-eslint/no-explicit-any */
// Öğrenci motivasyonu: çalışma serisi, rozetler ve hedef net. Hepsi mevcut veriden hesaplanır, ayrıca saklanmaz.

const TZ = 'Europe/Istanbul';

/** Türkiye saatine göre YYYY-MM-DD */
export function trDate(d: Date | string = new Date()) {
  return new Date(d).toLocaleDateString('sv-SE', { timeZone: TZ });
}

export function shiftDay(date: string, days: number) {
  const d = new Date(`${date}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

const entryCount = (q: any) => Number(q?.count) || 0;

/** Günlükte soru ya da konu çalışması olan günler + görevin tiklendiği günler = aktif günler */
export function activeDays(dailyLogs: any[], tasks: any[]) {
  const days = new Set<string>();
  for (const l of dailyLogs) {
    const hasWork = (l.question_solved ?? []).some((q: any) => entryCount(q) > 0)
      || (l.topic_studies ?? []).some((t: any) => (Number(t?.duration_minutes) || 0) > 0);
    if (hasWork) days.add(l.log_date);
  }
  for (const t of tasks) if (t.student_done && t.student_done_at) days.add(trDate(t.student_done_at));
  return days;
}

export function streakInfo(days: Set<string>, today = trDate()) {
  // Bugün henüz çalışılmadıysa seri dünden sayılır (gün bitmeden "kırıldı" demeyelim)
  let cursor = days.has(today) ? today : shiftDay(today, -1);
  let current = 0;
  while (days.has(cursor)) { current++; cursor = shiftDay(cursor, -1); }

  let best = 0;
  let run = 0;
  let prev: string | null = null;
  for (const d of Array.from(days).sort()) {
    run = prev && shiftDay(prev, 1) === d ? run + 1 : 1;
    best = Math.max(best, run);
    prev = d;
  }
  return { current, best: Math.max(best, current), studiedToday: days.has(today) };
}

export function questionTotals(dailyLogs: any[], today = trDate()) {
  let total = 0;
  let todayCount = 0;
  for (const l of dailyLogs) {
    const n = (l.question_solved ?? []).reduce((s: number, q: any) => s + entryCount(q), 0);
    total += n;
    if (l.log_date === today) todayCount += n;
  }
  return { total, today: todayCount };
}

export type Badge = { id: string; emoji: string; title: string; desc: string; earned: boolean; progress?: number };

export function computeBadges(input: {
  days: Set<string>; bestStreak: number; totalQuestions: number; tasks: any[]; exams: any[]; topicsDone: number;
}): Badge[] {
  const { days, bestStreak, totalQuestions, tasks, exams, topicsDone } = input;
  const doneTasks = tasks.filter((t) => t.student_done).length;

  // Tamamı bitirilmiş (en az 3 görevli) bir hafta var mı?
  const weeks = new Map<string, { total: number; done: number }>();
  for (const t of tasks) {
    const w = weeks.get(t.week_start) ?? { total: 0, done: 0 };
    w.total++; if (t.student_done) w.done++;
    weeks.set(t.week_start, w);
  }
  const fullWeek = Array.from(weeks.values()).some((w) => w.total >= 3 && w.done === w.total);

  // Bir sınav türünde son deneme, o türdeki en iyi net mi?
  const byType = new Map<string, any[]>();
  for (const e of exams) {
    const k = e.exam_type ?? 'TYT';
    byType.set(k, [...(byType.get(k) ?? []), e]);
  }
  const record = Array.from(byType.values()).some((list) => {
    if (list.length < 2) return false;
    const sorted = [...list].sort((a, b) => (a.exam_date < b.exam_date ? -1 : 1));
    const last = Number(sorted[sorted.length - 1].net_score) || 0;
    return sorted.slice(0, -1).every((e) => last > (Number(e.net_score) || 0));
  });

  const p = (v: number, goal: number) => Math.min(100, Math.round((v / goal) * 100));
  return [
    { id: 'ilk-adim', emoji: '🌱', title: 'İlk adım', desc: 'İlk çalışmanı kaydet', earned: days.size > 0 },
    { id: 'seri-3', emoji: '🔥', title: '3 gün seri', desc: '3 gün üst üste çalış', earned: bestStreak >= 3, progress: p(bestStreak, 3) },
    { id: 'seri-7', emoji: '⚡', title: 'Haftalık seri', desc: '7 gün üst üste çalış', earned: bestStreak >= 7, progress: p(bestStreak, 7) },
    { id: 'seri-30', emoji: '👑', title: 'Ayın yıldızı', desc: '30 gün üst üste çalış', earned: bestStreak >= 30, progress: p(bestStreak, 30) },
    { id: 'soru-100', emoji: '🎯', title: '100 soru', desc: 'Toplam 100 soru çöz', earned: totalQuestions >= 100, progress: p(totalQuestions, 100) },
    { id: 'soru-1000', emoji: '💯', title: '1000 soru', desc: 'Toplam 1000 soru çöz', earned: totalQuestions >= 1000, progress: p(totalQuestions, 1000) },
    { id: 'soru-5000', emoji: '🏔️', title: 'Soru dağı', desc: 'Toplam 5000 soru çöz', earned: totalQuestions >= 5000, progress: p(totalQuestions, 5000) },
    { id: 'gorev-50', emoji: '✅', title: 'Görev ustası', desc: '50 görevi tamamla', earned: doneTasks >= 50, progress: p(doneTasks, 50) },
    { id: 'tam-hafta', emoji: '🏅', title: 'Kusursuz hafta', desc: 'Bir haftanın tüm görevlerini bitir', earned: fullWeek },
    { id: 'deneme-10', emoji: '📝', title: 'Deneme kurdu', desc: '10 deneme sınavına gir', earned: exams.length >= 10, progress: p(exams.length, 10) },
    { id: 'rekor', emoji: '📈', title: 'Net rekoru', desc: 'Son denemende en yüksek netini yap', earned: record },
    { id: 'konu-10', emoji: '📚', title: 'Konu avcısı', desc: '10 konuyu tamamla', earned: topicsDone >= 10, progress: p(topicsDone, 10) },
  ];
}

export const TARGET_MAX: Record<string, number> = { TYT: 120, AYT: 80, LGS: 90 };

/** Öğrencinin alanına göre hedef net konabilecek sınav türleri */
export function targetExamTypes(track?: string | null) {
  if (track === 'LGS') return ['LGS'];
  if (track === 'YKS_DIL') return ['TYT'];
  if (track?.startsWith('YKS')) return ['TYT', 'AYT'];
  return ['TYT'];
}

export type TargetRow = { type: string; target: number | null; current: number | null; best: number | null };

export function targetRows(track: string | null | undefined, targetNets: Record<string, number> | null, exams: any[]): TargetRow[] {
  return targetExamTypes(track).map((type) => {
    const list = exams.filter((e) => (e.exam_type ?? 'TYT') === type)
      .sort((a, b) => (a.exam_date < b.exam_date ? 1 : -1));
    const nets = list.map((e) => Number(e.net_score) || 0);
    const target = targetNets?.[type];
    return {
      type,
      target: typeof target === 'number' ? target : target ? Number(target) : null,
      current: nets.length ? nets[0] : null,
      best: nets.length ? Math.max(...nets) : null,
    };
  });
}
