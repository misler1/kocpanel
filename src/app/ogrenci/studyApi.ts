/* eslint-disable @typescript-eslint/no-explicit-any */
// Öğrencinin görev tikleme + günlük çalışma kaydı çağrıları (supabase/student_daily_log.sql fonksiyonları).

export type StudyInput = {
  taskId: string | null;
  subject: string;
  topic: string;
  count: number;
  correct: number;
  wrong: number;
  minutes: number;
};

/** Türkiye saatine göre bugünün tarihi (YYYY-MM-DD) */
export function todayTr() {
  return new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Istanbul' });
}

const missingFn = (error: any) => error?.code === 'PGRST202' || /could not find the function/i.test(error?.message ?? '');

function friendly(error: any) {
  if (missingFn(error)) return 'Çalışma kaydı henüz etkin değil. Koçuna haber ver.';
  return error?.message ?? 'Kaydedilemedi, tekrar dene.';
}

export async function logStudy(supabase: any, input: StudyInput): Promise<string | null> {
  const { error } = await supabase.rpc('student_log_study', {
    p_task_id: input.taskId,
    p_log_date: todayTr(),
    p_subject: input.subject,
    p_topic: input.topic,
    p_count: input.count,
    p_correct: input.correct,
    p_wrong: input.wrong,
    p_minutes: input.minutes,
  });
  return error ? friendly(error) : null;
}

/** Yalnızca tik (sayı girmeden). */
export async function setTaskDone(supabase: any, taskId: string, done: boolean): Promise<string | null> {
  if (!done) {
    // Tik kalkınca o görevin günlükteki kaydı da silinsin
    const { error } = await supabase.rpc('student_unlog_task', { p_task_id: taskId });
    if (!error) return null;
    if (!missingFn(error)) return friendly(error);
  }
  const { error } = await supabase.from('question_logs')
    .update({ student_done: done, student_done_at: done ? new Date().toISOString() : null }).eq('id', taskId);
  return error ? 'Kaydedilemedi, tekrar dene.' : null;
}
