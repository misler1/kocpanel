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

/** "Yapmadım" işareti (supabase/student_task_missed.sql). missed=false işareti kaldırır. */
export async function setTaskMissed(supabase: any, taskId: string, missed: boolean, note?: string): Promise<string | null> {
  const { error } = await supabase.from('question_logs').update({
    student_missed: missed,
    student_missed_at: missed ? new Date().toISOString() : null,
    student_missed_note: missed ? (note?.trim() || null) : null,
  }).eq('id', taskId);
  if (!error) return null;
  if (/student_missed/.test(error.message ?? '') || error.code === 'PGRST204' || error.code === '42703') {
    return '"Yapmadım" özelliği henüz etkin değil. Koçuna haber ver.';
  }
  return 'Kaydedilemedi, tekrar dene.';
}

export type ProgramDay = { weekStart: string; weekEnd: string | null; planDay: number };

/**
 * Plan dışı çalışma: programa ⭐ Ekstra görev olarak (yapıldı işaretli) eklenir, sayılar da o göreve yazılır.
 * Böylece hem öğrencinin görev listesinde hem koçun programında görünür.
 * Bugünü kapsayan bir program yoksa yalnızca günlüğe yazılır.
 */
export async function logExtraStudy(
  supabase: any, studentId: string, day: ProgramDay | null, input: StudyInput,
): Promise<{ error: string | null; task: any | null }> {
  if (!day) return { error: await logStudy(supabase, { ...input, taskId: null }), task: null };
  const { data: task, error: insErr } = await supabase.from('question_logs').insert({
    student_id: studentId, subject: input.subject, topic: input.topic || null,
    week_start: day.weekStart, week_end: day.weekEnd, plan_day: day.planDay,
    target_count: input.count, student_added: true,
  }).select().single();
  if (insErr || !task) {
    // Görev eklenemezse çalışma kaybolmasın: yalnızca günlüğe yaz
    return { error: await logStudy(supabase, { ...input, taskId: null }), task: null };
  }
  const err = await logStudy(supabase, { ...input, taskId: task.id });
  if (err) {
    await supabase.from('question_logs').delete().eq('id', task.id);
    return { error: err, task: null };
  }
  return {
    error: null,
    task: { ...task, student_done: true, student_done_at: new Date().toISOString(), done_count: input.count, topic_done_minutes: input.minutes },
  };
}
