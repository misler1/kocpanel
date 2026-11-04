// Haftalık programın günleri. Program week_start'tan week_end'e kadar sürer (1–7 gün; eski programlarda week_end yoksa 7 gün).
// Görevin günü (plan_day) haftanın günüdür: Pazartesi=0 … Pazar=6. Program en fazla 7 gün olduğu için her gün programda bir kez geçer.

export const DAY_NAMES = ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi', 'Pazar'];
export const DAY_SHORT = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'];

export type ProgramDay = { weekday: number; date: string | null; label: string };

const utc = (s: string) => new Date(`${s}T12:00:00Z`);
const iso = (d: Date) => d.toISOString().slice(0, 10);

export function addDays(dateStr: string, days: number) {
  const d = utc(dateStr);
  d.setUTCDate(d.getUTCDate() + days);
  return iso(d);
}

/** Pazartesi=0 … Pazar=6 */
export function weekdayOf(dateStr: string) {
  return (utc(dateStr).getUTCDay() + 6) % 7;
}

/** Programın gün sayısı (1–7) */
export function programLength(weekStart: string, weekEnd: string | null | undefined) {
  if (!weekEnd) return 7;
  const n = Math.round((utc(weekEnd).getTime() - utc(weekStart).getTime()) / 86_400_000) + 1;
  return Math.min(7, Math.max(1, n));
}

/** "12 Kas" */
export function shortDate(dateStr: string) {
  return utc(dateStr).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', timeZone: 'UTC' });
}

/**
 * Programın günleri başlangıç gününden itibaren sırayla.
 * Program aralığı dışında kalan bir güne görev girilmişse (eski kayıtlar) o gün de sona eklenir; görev kaybolmaz.
 */
export function programDays(weekStart: string, weekEnd: string | null | undefined, logs: { plan_day?: number | null }[] = []): ProgramDay[] {
  if (!weekStart) return DAY_NAMES.map((label, weekday) => ({ weekday, date: null, label }));
  const days: ProgramDay[] = Array.from({ length: programLength(weekStart, weekEnd) }, (_, k) => {
    const date = addDays(weekStart, k);
    const weekday = weekdayOf(date);
    return { weekday, date, label: DAY_NAMES[weekday] };
  });
  const inRange = new Set(days.map((d) => d.weekday));
  const extra = Array.from(new Set(logs.map((l) => l.plan_day).filter((d): d is number => typeof d === 'number' && !inRange.has(d)))).sort();
  return [...days, ...extra.map((weekday) => ({ weekday, date: null, label: DAY_NAMES[weekday] }))];
}
