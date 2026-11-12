// Rapora "bugün" ne zaman dahil edilir? Öğrenci günlüğünü akşam girer; gün bitmeden alınan raporda bugün eksik görünür.
// Kural (Türkiye saatiyle): saat 22:00'yi geçmiş VE öğrencinin o günkü son çalışma hatırlatması (study_reminders.sql,
// students.reminder_times) üzerinden 15 dakika geçmişse bugün dahil edilir. Hatırlatması yoksa 22:00 yeterli.
// Koç "bugünü dahil et" derse (öğrenci girişini bitirdiyse) saatten bağımsız dahil edilir.
// Hem sunucuda (rapor üretilirken) hem tarayıcıda (ekranda bilgi vermek için) kullanılır.

/** Herkes için en erken saat */
export const REPORT_DAY_MIN = '22:00';
/** Son hatırlatmadan sonra beklenecek süre (dakika) */
export const AFTER_REMINDER_MIN = 15;

const toMin = (hhmm: string) => {
  const [h, m] = hhmm.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
};
const toHHMM = (min: number) => `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`;

/** Türkiye saatiyle şu an "HH:MM" */
export const nowTrHHMM = () =>
  new Date().toLocaleTimeString('tr-TR', { timeZone: 'Europe/Istanbul', hour: '2-digit', minute: '2-digit', hour12: false });

/**
 * Bugünün rapora dahil edilebileceği saat ("HH:MM"). Gece yarısını aşarsa null (bugün otomatik dahil edilmez).
 * weekday: Pazartesi = 0 (reminder_days ile aynı).
 */
export function reportCutoff(reminderTimes: string[] | null | undefined, reminderDays: number[] | null | undefined, weekday: number): string | null {
  const days = reminderDays?.length ? reminderDays : [0, 1, 2, 3, 4, 5, 6];
  const slots = days.includes(weekday) ? (reminderTimes ?? []).map((t) => toMin(String(t).slice(0, 5))) : [];
  const last = slots.length ? Math.max(...slots) + AFTER_REMINDER_MIN : 0;
  const cutoff = Math.max(toMin(REPORT_DAY_MIN), last);
  return cutoff >= 24 * 60 ? null : toHHMM(cutoff);
}

export function todayIncludedAuto(cutoff: string | null, now = nowTrHHMM()) {
  return cutoff !== null && toMin(now) >= toMin(cutoff);
}
