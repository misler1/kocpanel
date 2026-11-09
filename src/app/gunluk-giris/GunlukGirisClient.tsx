'use client';
/* eslint-disable @typescript-eslint/no-explicit-any */

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { IconArrowLeft, IconArrowRight, IconCheck, IconPlus, IconRotate } from '@tabler/icons-react';
import { createClient } from '@/lib/supabase/client';
import { shiftDate, tasksForDay, todayTr, type TaskRow } from '@/lib/day-tasks';

type Student = { id: string; full_name: string; sinif_sube: string | null };
type Draft = { count: string; correct: string; wrong: string; minutes: string };
type Entry = { subject: string; topic?: string; count?: number; correct?: number; wrong?: number; duration_minutes?: number; task_id?: string; by?: string; by_name?: string };

const DAY_NAMES = ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi', 'Pazar'];
const emptyDraft: Draft = { count: '', correct: '', wrong: '', minutes: '' };
const num = (v: string) => Math.max(0, Math.round(Number(v.replace(',', '.')) || 0));

function dayLabel(date: string, today: string) {
  if (date === today) return 'Bugün';
  if (date === shiftDate(today, -1)) return 'Dün';
  const wd = (new Date(`${date}T12:00:00Z`).getUTCDay() + 6) % 7;
  return `${DAY_NAMES[wd].slice(0, 3)} ${Number(date.slice(8))}`;
}

export function GunlukGirisClient({ students, initialStudentId }: { students: Student[]; initialStudentId: string }) {
  const supabase = useMemo(() => createClient(), []);
  const today = useMemo(() => todayTr(), []);
  const [studentId, setStudentId] = useState(initialStudentId);
  const [date, setDate] = useState(today);
  const [rows, setRows] = useState<TaskRow[] | null>(null);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [extra, setExtra] = useState<{ subject: string; topic: string } & Draft>({ subject: '', topic: '', ...emptyDraft });
  const [showExtra, setShowExtra] = useState(false);

  const idx = students.findIndex((s) => s.id === studentId);
  const days = Array.from({ length: 7 }, (_, i) => shiftDate(today, -i));

  const load = useCallback(async () => {
    if (!studentId) return;
    const [{ data: t }, { data: logs }] = await Promise.all([
      (supabase as any).from('question_logs')
        .select('*') // student_missed alanı student_task_missed.sql çalıştırılınca gelir
        .eq('student_id', studentId).lte('week_start', date).gte('week_start', shiftDate(date, -21)),
      (supabase as any).from('daily_logs').select('question_solved, topic_studies, archived')
        .eq('student_id', studentId).eq('log_date', date),
    ]);
    setRows((t as TaskRow[]) ?? []);
    const all: Entry[] = [];
    for (const l of (logs as any[]) ?? []) {
      if (l.archived) continue;
      all.push(...((l.question_solved ?? []) as Entry[]), ...((l.topic_studies ?? []) as Entry[]));
    }
    setEntries(all);
  }, [supabase, studentId, date]);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { setRows(null); setDrafts({}); setMsg(null); load(); }, [load]);

  const tasks = rows ? tasksForDay(rows, date) : [];
  const extras = entries.filter((e) => !e.task_id);
  const doneCount = tasks.filter((t) => t.student_done).length;

  const draftOf = (t: TaskRow): Draft => drafts[t.id] ?? {
    count: t.done_count ? String(t.done_count) : t.target_count ? String(t.target_count) : '',
    correct: '', wrong: '',
    minutes: t.topic_done_minutes ? String(t.topic_done_minutes) : t.topic_target_minutes ? String(t.topic_target_minutes) : '',
  };
  const setDraft = (id: string, patch: Partial<Draft>, base: Draft) => setDrafts((p) => ({ ...p, [id]: { ...base, ...patch } }));

  async function save(taskId: string | null, subject: string, topic: string, d: Draft) {
    setBusy(taskId ?? 'extra');
    setMsg(null);
    const { error } = await (supabase as any).rpc('staff_log_study', {
      p_student: studentId, p_task_id: taskId, p_log_date: date, p_subject: subject, p_topic: topic,
      p_count: num(d.count), p_correct: num(d.correct), p_wrong: num(d.wrong), p_minutes: num(d.minutes),
    });
    setBusy(null);
    if (error) {
      const missing = error.code === 'PGRST202' || /could not find the function/i.test(error.message ?? '');
      setMsg({ ok: false, text: missing ? 'Günlük giriş henüz etkin değil (belletmen_gunluk.sql çalıştırılmalı).' : error.message });
      return false;
    }
    setMsg({ ok: true, text: 'Kaydedildi ✓' });
    await load();
    return true;
  }

  async function undo(taskId: string) {
    setBusy(taskId);
    const { error } = await (supabase as any).rpc('staff_unlog_task', { p_student: studentId, p_task_id: taskId });
    setBusy(null);
    if (error) { setMsg({ ok: false, text: error.message }); return; }
    setDrafts((p) => { const n = { ...p }; delete n[taskId]; return n; });
    await load();
  }

  const goStudent = (delta: number) => {
    const next = students[(idx + delta + students.length) % students.length];
    if (next) setStudentId(next.id);
  };

  const input = 'w-full rounded-lg border border-gray-200 bg-white px-2 py-2 text-center text-[15px] focus:border-emerald-400 focus:outline-none';

  if (!students.length) {
    return <p className="mx-auto max-w-2xl rounded-2xl border border-dashed border-gray-200 bg-white py-12 text-center text-gray-400">Giriş yapabileceğiniz öğrenci yok.</p>;
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4 pb-10">
      <div className="flex items-center gap-2">
        <Link href="/anasayfa" className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100" aria-label="Ana sayfaya dön"><IconArrowLeft size={20} /></Link>
        <h1 className="text-[20px] font-bold text-gray-900">Günlük takip</h1>
      </div>

      {/* Öğrenci seçimi + sıradaki öğrenci */}
      <div className="flex items-center gap-2 rounded-2xl border border-gray-200 bg-white p-2 shadow-sm">
        <button type="button" onClick={() => goStudent(-1)} aria-label="Önceki öğrenci" className="rounded-xl p-2.5 text-gray-500 hover:bg-gray-100"><IconArrowLeft size={20} /></button>
        <select value={studentId} onChange={(e) => setStudentId(e.target.value)}
          className="min-w-0 flex-1 rounded-xl border-0 bg-transparent py-2 text-center text-[16px] font-semibold text-gray-900 focus:outline-none">
          {students.map((s) => <option key={s.id} value={s.id}>{s.full_name}{s.sinif_sube ? ` · ${s.sinif_sube}` : ''}</option>)}
        </select>
        <button type="button" onClick={() => goStudent(1)} aria-label="Sonraki öğrenci" className="rounded-xl p-2.5 text-gray-500 hover:bg-gray-100"><IconArrowRight size={20} /></button>
      </div>
      <p className="-mt-2 text-center text-[12px] text-gray-400">{idx + 1} / {students.length} öğrenci</p>

      {/* Gün seçimi */}
      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {days.map((d) => (
          <button key={d} type="button" onClick={() => setDate(d)}
            className={`flex-shrink-0 rounded-full px-3.5 py-1.5 text-[13px] font-semibold transition-colors ${date === d ? 'bg-emerald-600 text-white' : 'border border-gray-200 bg-white text-gray-600 hover:bg-gray-50'}`}>
            {dayLabel(d, today)}
          </button>
        ))}
      </div>

      {msg && <p className={`rounded-xl px-3 py-2 text-[13px] font-medium ${msg.ok ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>{msg.text}</p>}

      {/* Günün görevleri */}
      <section className="space-y-2.5">
        <div className="flex items-baseline justify-between">
          <h2 className="text-[15px] font-bold text-gray-900">{dayLabel(date, today)} · görevler</h2>
          {tasks.length > 0 && <span className="text-[13px] font-semibold text-gray-500">{doneCount}/{tasks.length} yapıldı</span>}
        </div>

        {rows === null ? (
          <p className="py-8 text-center text-[13px] text-gray-400">Yükleniyor…</p>
        ) : tasks.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-gray-200 bg-white py-8 text-center text-[13.5px] text-gray-400">
            Bu gün için programda görev yok. Yaptığı çalışmayı aşağıdan “Plan dışı çalışma” olarak ekleyebilirsiniz.
          </p>
        ) : tasks.map((t) => {
          const d = draftOf(t);
          const done = !!t.student_done;
          return (
            <div key={t.id} className={`rounded-2xl border p-3.5 shadow-sm ${done ? 'border-emerald-200 bg-emerald-50/60' : 'border-gray-200 bg-white'}`}>
              <div className="flex items-start gap-2">
                <div className="min-w-0 flex-1">
                  <div className="text-[15px] font-semibold text-gray-900">{t.subject}{t.topic ? <span className="font-normal text-gray-600"> · {t.topic}</span> : null}</div>
                  <div className="text-[12.5px] text-gray-500">
                    {[t.resource_name, t.target_count ? `hedef ${t.target_count} soru` : null, t.topic_target_minutes ? `hedef ${t.topic_target_minutes} dk` : null,
                      t.start_time ? `${t.start_time.slice(0, 5)}${t.end_time ? `–${t.end_time.slice(0, 5)}` : ''}` : null].filter(Boolean).join(' · ')}
                  </div>
                </div>
                {done && <span className="flex items-center gap-1 rounded-full bg-emerald-600 px-2.5 py-1 text-[12px] font-bold text-white"><IconCheck size={14} /> Yapıldı</span>}
                {!done && t.student_missed && (
                  <span title={t.student_missed_note ?? undefined} className="rounded-full bg-red-600 px-2.5 py-1 text-[12px] font-bold text-white">✕ Yapmadı</span>
                )}
              </div>

              <div className="mt-2.5 grid grid-cols-4 gap-2">
                {([['count', 'Soru'], ['correct', 'Doğru'], ['wrong', 'Yanlış'], ['minutes', 'Dakika']] as const).map(([k, label]) => (
                  <label key={k} className="text-center text-[11px] font-semibold text-gray-500">{label}
                    <input inputMode="numeric" value={d[k]} onChange={(e) => setDraft(t.id, { [k]: e.target.value }, d)} className={`${input} mt-0.5`} />
                  </label>
                ))}
              </div>

              <div className="mt-2.5 flex gap-2">
                <button type="button" disabled={busy === t.id} onClick={() => save(t.id, t.subject, t.topic ?? '', d)}
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-emerald-600 py-2.5 text-[14px] font-bold text-white hover:bg-emerald-700 disabled:opacity-60">
                  <IconCheck size={17} /> {busy === t.id ? 'Kaydediliyor…' : done ? 'Güncelle' : 'Yaptı, kaydet'}
                </button>
                {done && (
                  <button type="button" disabled={busy === t.id} onClick={() => undo(t.id)}
                    className="flex items-center gap-1 rounded-xl border border-gray-200 px-3 text-[13px] font-semibold text-gray-600 hover:bg-gray-50">
                    <IconRotate size={15} /> Geri al
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </section>

      {/* Plan dışı çalışma */}
      <section className="rounded-2xl border border-gray-200 bg-white p-3.5 shadow-sm">
        <button type="button" onClick={() => setShowExtra(!showExtra)} className="flex w-full items-center gap-1.5 text-[14px] font-bold text-gray-800">
          <IconPlus size={17} /> Plan dışı çalışma ekle
        </button>
        {showExtra && (
          <div className="mt-3 space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <input value={extra.subject} onChange={(e) => setExtra({ ...extra, subject: e.target.value })} placeholder="Ders (ör. Matematik)" className={`${input} text-left`} />
              <input value={extra.topic} onChange={(e) => setExtra({ ...extra, topic: e.target.value })} placeholder="Konu (isteğe bağlı)" className={`${input} text-left`} />
            </div>
            <div className="grid grid-cols-4 gap-2">
              {([['count', 'Soru'], ['correct', 'Doğru'], ['wrong', 'Yanlış'], ['minutes', 'Dakika']] as const).map(([k, label]) => (
                <label key={k} className="text-center text-[11px] font-semibold text-gray-500">{label}
                  <input inputMode="numeric" value={extra[k]} onChange={(e) => setExtra({ ...extra, [k]: e.target.value })} className={`${input} mt-0.5`} />
                </label>
              ))}
            </div>
            <button type="button" disabled={busy === 'extra' || !extra.subject.trim()}
              onClick={async () => { if (await save(null, extra.subject, extra.topic, extra)) setExtra({ subject: '', topic: '', ...emptyDraft }); }}
              className="w-full rounded-xl bg-gray-900 py-2.5 text-[14px] font-bold text-white hover:bg-gray-800 disabled:opacity-50">
              {busy === 'extra' ? 'Kaydediliyor…' : 'Ekle'}
            </button>
          </div>
        )}
        {extras.length > 0 && (
          <ul className="mt-3 space-y-1 border-t border-gray-100 pt-2 text-[13px] text-gray-700">
            {extras.map((e, i) => (
              <li key={i}>
                • {e.subject}{e.topic ? ` · ${e.topic}` : ''}{e.count ? ` · ${e.count} soru` : ''}{e.duration_minutes ? ` · ${e.duration_minutes} dk` : ''}
                {e.by_name && <span className="text-gray-400"> ({e.by_name})</span>}
              </li>
            ))}
          </ul>
        )}
      </section>

      <button type="button" onClick={() => goStudent(1)}
        className="flex w-full items-center justify-center gap-2 rounded-2xl bg-violet-600 py-3 text-[15px] font-bold text-white shadow-sm hover:bg-violet-700">
        Sıradaki öğrenci <IconArrowRight size={18} />
      </button>
    </div>
  );
}
