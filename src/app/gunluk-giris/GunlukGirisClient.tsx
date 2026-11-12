'use client';
/* eslint-disable @typescript-eslint/no-explicit-any */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { IconArrowLeft, IconArrowRight, IconCheck, IconChevronDown, IconPlus, IconRotate, IconSearch, IconX, IconPencil } from '@tabler/icons-react';
import { createClient } from '@/lib/supabase/client';
import { shiftDate, tasksForDay, todayTr, weekdayIndex, type TaskRow } from '@/lib/day-tasks';
import { avatarColor, initials } from '@/lib/ui-colors';

// Öğrenci adına günlük çalışma girişi: koç, yurt yöneticisi ve belletmen kullanır (yurtta öğrencinin telefonu yok
// ya da öğrenci çalışmasını sözlü anlatır). Veritabanı: belletmen_gunluk.sql, daily_entry_pages.sql, staff_programs.sql
// Akış: öğrenci seç → gün seç → her görevde "Yaptı" (soru/doğru/yanlış/dakika/sayfa) ya da "Yapmadı".

type Student = { id: string; full_name: string; sinif_sube: string | null };
type Draft = { count: string; correct: string; wrong: string; minutes: string; pages: string };
type Entry = {
  subject: string; topic?: string; count?: number; correct?: number; wrong?: number; duration_minutes?: number;
  pages?: string; task_id?: string; by?: string; by_name?: string;
};
type StaffProgram = { id: string; week_start: string; week_end: string; tasks: unknown[]; status: string; created_at: string };

const DAY_SHORT = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'];
const emptyDraft: Draft = { count: '', correct: '', wrong: '', minutes: '', pages: '' };
const num = (v: string) => Math.max(0, Math.round(Number(v.replace(',', '.')) || 0));
const ddmm = (d: string) => `${d.slice(8, 10)}.${d.slice(5, 7)}`;

function dayTitle(date: string, today: string) {
  if (date === today) return 'Bugün';
  if (date === shiftDate(today, -1)) return 'Dün';
  return new Date(`${date}T12:00:00Z`).toLocaleDateString('tr-TR', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' });
}

const FIELDS: { k: keyof Draft; label: string; ph?: string; text?: boolean }[] = [
  { k: 'count', label: 'Soru' },
  { k: 'correct', label: 'Doğru' },
  { k: 'wrong', label: 'Yanlış' },
  { k: 'minutes', label: 'Dakika' },
  { k: 'pages', label: 'Sayfa', ph: 'ör. 45-60', text: true },
];

function DraftFields({ d, onChange }: { d: Draft; onChange: (patch: Partial<Draft>) => void }) {
  return (
    <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
      {FIELDS.map((f) => (
        <label key={f.k} className={`block ${f.k === 'pages' ? 'col-span-2 sm:col-span-1' : ''}`}>
          <span className="mb-0.5 block text-[11px] font-semibold text-gray-500">{f.label}{f.k === 'pages' && <span className="font-normal text-gray-400"> (isteğe bağlı)</span>}</span>
          <input
            inputMode={f.text ? 'text' : 'numeric'} value={d[f.k]} placeholder={f.ph ?? '0'} maxLength={f.text ? 40 : 5}
            onChange={(e) => onChange({ [f.k]: e.target.value })}
            className="w-full rounded-xl border border-gray-200 bg-white px-2.5 py-2.5 text-center text-[16px] font-semibold text-gray-900 placeholder:font-normal placeholder:text-gray-300 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-100"
          />
        </label>
      ))}
    </div>
  );
}

export function GunlukGirisClient({ students, initialStudentId, programMsg = null }: { students: Student[]; initialStudentId: string; programMsg?: 'aktif' | 'bekliyor' | null }) {
  const supabase = useMemo(() => createClient(), []);
  const today = todayTr();
  const [studentId, setStudentId] = useState(initialStudentId);
  const [date, setDate] = useState(today);
  const [rows, setRows] = useState<TaskRow[] | null>(null);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [openTask, setOpenTask] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [extra, setExtra] = useState<{ subject: string; topic: string } & Draft>({ subject: '', topic: '', ...emptyDraft });
  const [showExtra, setShowExtra] = useState(false);
  const [missFor, setMissFor] = useState<string | null>(null);
  const [missNote, setMissNote] = useState('');
  const [programs, setPrograms] = useState<StaffProgram[]>([]);
  const [programNote, setProgramNote] = useState(programMsg);
  const [picker, setPicker] = useState(false);
  const [q, setQ] = useState('');
  const searchRef = useRef<HTMLInputElement>(null);

  const idx = students.findIndex((s) => s.id === studentId);
  const student = students[idx];
  const days = Array.from({ length: 8 }, (_, i) => shiftDate(today, i - 7)); // son 7 gün + bugün (eskiden yeniye)

  const load = useCallback(async () => {
    if (!studentId) return;
    const [{ data: t }, { data: logs }, { data: progs }] = await Promise.all([
      (supabase as any).from('question_logs').select('*')
        .eq('student_id', studentId).lte('week_start', date).gte('week_start', shiftDate(date, -21)),
      (supabase as any).from('daily_logs').select('question_solved, topic_studies, archived')
        .eq('student_id', studentId).eq('log_date', date),
      // Personelin hazırladığı, koç onayı bekleyen / yakında reddedilen programlar (staff_programs.sql yoksa boş)
      (supabase as any).from('student_programs')
        .select('id, week_start, week_end, tasks, status, created_at, decided_at, prepared_by')
        .eq('student_id', studentId).not('prepared_by', 'is', null)
        .or(`status.eq.bekliyor,and(status.eq.reddedildi,decided_at.gte.${shiftDate(todayTr(), -7)})`)
        .order('created_at', { ascending: false }).limit(5),
    ]);
    setRows((t as TaskRow[]) ?? []);
    const all: Entry[] = [];
    for (const l of (logs as any[]) ?? []) {
      if (l.archived) continue;
      all.push(...((l.question_solved ?? []) as Entry[]), ...((l.topic_studies ?? []) as Entry[]));
    }
    setEntries(all);
    setPrograms((progs as StaffProgram[]) ?? []);
  }, [supabase, studentId, date]);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { setRows(null); setDrafts({}); setMsg(null); setOpenTask(null); setMissFor(null); load(); }, [load]);
  useEffect(() => { if (picker) searchRef.current?.focus(); }, [picker]);

  const tasks = rows ? tasksForDay(rows, date) : [];
  const extras = entries.filter((e) => !e.task_id);
  const doneCount = tasks.filter((t) => t.student_done).length;
  const missedCount = tasks.filter((t) => !t.student_done && t.student_missed).length;
  const dayQuestions = entries.reduce((s, e) => s + (Number(e.count) || 0), 0);
  const dayMinutes = entries.reduce((s, e) => s + (Number(e.duration_minutes) || 0), 0);
  const pct = tasks.length ? Math.round((doneCount / tasks.length) * 100) : 0;

  /** Görevin günlükteki kayıtları (soru + süre) */
  const taskEntry = (id: string) => {
    const list = entries.filter((e) => e.task_id === id);
    return {
      count: list.reduce((s, e) => s + (Number(e.count) || 0), 0),
      correct: list.reduce((s, e) => s + (Number(e.correct) || 0), 0),
      wrong: list.reduce((s, e) => s + (Number(e.wrong) || 0), 0),
      minutes: list.reduce((s, e) => s + (Number(e.duration_minutes) || 0), 0),
      pages: list.find((e) => e.pages)?.pages ?? '',
      by: list.find((e) => e.by_name)?.by_name ?? (list.some((e) => e.by === 'ogrenci') ? 'öğrenci' : ''),
    };
  };

  const draftOf = (t: TaskRow): Draft => {
    if (drafts[t.id]) return drafts[t.id];
    const e = taskEntry(t.id);
    return {
      count: e.count ? String(e.count) : t.done_count ? String(t.done_count) : t.target_count ? String(t.target_count) : '',
      correct: e.correct ? String(e.correct) : '', wrong: e.wrong ? String(e.wrong) : '',
      minutes: e.minutes ? String(e.minutes) : t.topic_target_minutes ? String(t.topic_target_minutes) : '',
      pages: e.pages,
    };
  };
  const setDraft = (id: string, patch: Partial<Draft>, base: Draft) => setDrafts((p) => ({ ...p, [id]: { ...base, ...patch } }));

  async function save(taskId: string | null, subject: string, topic: string, d: Draft) {
    setBusy(taskId ?? 'extra');
    setMsg(null);
    const args: Record<string, unknown> = {
      p_student: studentId, p_task_id: taskId, p_log_date: date, p_subject: subject, p_topic: topic,
      p_count: num(d.count), p_correct: num(d.correct), p_wrong: num(d.wrong), p_minutes: num(d.minutes),
      p_pages: d.pages.trim() || null,
    };
    let { error } = await (supabase as any).rpc('staff_log_study', args);
    // daily_entry_pages.sql henüz çalıştırılmadıysa sayfasız eski fonksiyonla kaydedilir
    if (error && (error.code === 'PGRST202' || /could not find the function/i.test(error.message ?? '')) && !d.pages.trim()) {
      delete args.p_pages;
      ({ error } = await (supabase as any).rpc('staff_log_study', args));
    }
    setBusy(null);
    if (error) {
      const missing = error.code === 'PGRST202' || /could not find the function/i.test(error.message ?? '');
      setMsg({ ok: false, text: missing ? 'Sayfa bilgisi henüz kaydedilemiyor (daily_entry_pages.sql çalıştırılmalı). Sayfa kutusunu boş bırakıp tekrar deneyin.' : error.message });
      return false;
    }
    setOpenTask(null);
    setDrafts((p) => { if (!taskId) return p; const n = { ...p }; delete n[taskId]; return n; });
    await load();
    return true;
  }

  async function undo(taskId: string) {
    if (!window.confirm('Bu görevin "yaptı" kaydı silinsin mi?')) return;
    setBusy(taskId);
    const { error } = await (supabase as any).rpc('staff_unlog_task', { p_student: studentId, p_task_id: taskId });
    setBusy(null);
    if (error) { setMsg({ ok: false, text: error.message }); return; }
    setDrafts((p) => { const n = { ...p }; delete n[taskId]; return n; });
    await load();
  }

  async function setMissed(taskId: string, missed: boolean, note?: string) {
    setBusy(taskId);
    setMsg(null);
    const { error } = await (supabase as any).rpc('staff_mark_missed', { p_student: studentId, p_task_id: taskId, p_missed: missed, p_note: note ?? null });
    setBusy(null);
    if (error) {
      const missing = error.code === 'PGRST202' || /could not find the function/i.test(error.message ?? '');
      setMsg({ ok: false, text: missing ? '"Yapmadı" işareti henüz etkin değil (staff_programs.sql çalıştırılmalı).' : error.message });
      return;
    }
    setMissFor(null); setMissNote('');
    await load();
  }

  async function withdrawProgram(id: string) {
    if (!window.confirm('Onay bekleyen program geri çekilsin mi?')) return;
    await (supabase as any).rpc('staff_withdraw_program', { p_id: id });
    await load();
  }

  const goStudent = (delta: number) => {
    const next = students[(idx + delta + students.length) % students.length];
    if (next) setStudentId(next.id);
  };

  if (!students.length) {
    return <p className="mx-auto max-w-2xl rounded-2xl border border-dashed border-gray-200 bg-white py-12 text-center text-gray-400">Giriş yapabileceğiniz öğrenci yok.</p>;
  }

  const filtered = students.filter((s) => !q || s.full_name.toLocaleLowerCase('tr').includes(q.toLocaleLowerCase('tr')));

  return (
    <div className="mx-auto max-w-2xl space-y-3 pb-12">
      <div className="flex items-center gap-2">
        <Link href="/anasayfa" className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100" aria-label="Ana sayfaya dön"><IconArrowLeft size={20} /></Link>
        <h1 className="text-[20px] font-bold text-gray-900">Günlük giriş</h1>
      </div>

      {programNote && (
        <p className="flex items-start gap-2 rounded-xl bg-violet-50 px-3 py-2 text-[13px] font-medium text-violet-800">
          <span className="flex-1">{programNote === 'aktif' ? 'Program kaydedildi ve geçerli oldu ✓' : 'Program koçun onayına gönderildi. Onaylanınca öğrencinin programı olur; size bildirim gelir.'}</span>
          <button type="button" onClick={() => setProgramNote(null)} className="text-violet-500" aria-label="Kapat"><IconX size={16} /></button>
        </p>
      )}

      {/* Öğrenci kartı */}
      <div className="overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-600 to-teal-600 text-white shadow-md">
        <div className="flex items-center gap-2 p-3">
          <button type="button" onClick={() => goStudent(-1)} aria-label="Önceki öğrenci" className="rounded-full p-2 text-white/80 hover:bg-white/15"><IconArrowLeft size={20} /></button>
          <button type="button" onClick={() => { setPicker(true); setQ(''); }} title="Öğrenci seç" className="flex min-w-0 flex-1 items-center gap-3 rounded-2xl bg-white/15 px-2 py-1.5 text-left ring-1 ring-inset ring-white/30 transition-colors hover:bg-white/25">
            <span className={`flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full text-[15px] font-bold ring-2 ring-white/60 ${avatarColor(studentId)}`}>{initials(student?.full_name ?? '')}</span>
            <span className="min-w-0 flex-1">
              <span className="flex items-center gap-1 truncate text-[17px] font-bold"><span className="truncate">{student?.full_name}</span> <span className="flex flex-shrink-0 items-center justify-center rounded-full bg-white/25 p-0.5"><IconChevronDown size={15} /></span></span>
              <span className="block text-[12.5px] text-white/80">{student?.sinif_sube ?? 'Sınıf yok'} · {idx + 1}/{students.length} öğrenci</span>
            </span>
          </button>
          <button type="button" onClick={() => goStudent(1)} aria-label="Sonraki öğrenci" className="rounded-full p-2 text-white/80 hover:bg-white/15"><IconArrowRight size={20} /></button>
        </div>

        {/* Gün şeridi */}
        <div className="flex gap-1 overflow-x-auto bg-black/10 px-2 py-2">
          {days.map((d) => {
            const on = d === date;
            return (
              <button key={d} type="button" onClick={() => setDate(d)}
                className={`flex min-w-[44px] flex-1 flex-col items-center rounded-xl py-1.5 transition-colors ${on ? 'bg-white text-emerald-700 shadow-sm' : 'text-white/85 hover:bg-white/15'}`}>
                <span className="text-[10.5px] font-semibold uppercase">{d === today ? 'Bugün' : DAY_SHORT[weekdayIndex(d)]}</span>
                <span className="text-[16px] font-bold leading-tight">{Number(d.slice(8))}</span>
              </button>
            );
          })}
        </div>

        {/* Günün özeti */}
        <div className="grid grid-cols-3 divide-x divide-white/20 px-1 py-2.5 text-center">
          <div><div className="text-[18px] font-bold leading-tight">{tasks.length ? `${doneCount}/${tasks.length}` : '—'}</div><div className="text-[11px] text-white/80">görev yapıldı</div></div>
          <div><div className="text-[18px] font-bold leading-tight">{dayQuestions}</div><div className="text-[11px] text-white/80">soru</div></div>
          <div><div className="text-[18px] font-bold leading-tight">{dayMinutes}</div><div className="text-[11px] text-white/80">dakika</div></div>
        </div>
        {tasks.length > 0 && <div className="h-1.5 bg-white/20"><div className="h-full bg-white transition-all" style={{ width: `${pct}%` }} /></div>}
      </div>

      {/* Program hazırlama + bekleyenler */}
      <div className="flex flex-wrap items-center gap-2">
        <Link href={`/gunluk-giris/program?ogrenci=${studentId}`}
          className="flex items-center gap-1.5 rounded-full border border-violet-200 bg-white px-3 py-1.5 text-[13px] font-semibold text-violet-700 hover:bg-violet-50">
          🗓️ Haftalık program hazırla
        </Link>
        {programs.map((p) => (
          <span key={p.id} className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] font-medium ${p.status === 'bekliyor' ? 'bg-amber-50 text-amber-800' : 'bg-rose-50 text-rose-700'}`}>
            {p.status === 'bekliyor' ? '⏳' : '✕'} {ddmm(p.week_start)}–{ddmm(p.week_end)} · {p.status === 'bekliyor' ? 'koç onayı bekliyor' : 'koç onaylamadı'}
            {p.status === 'bekliyor' && <button type="button" onClick={() => withdrawProgram(p.id)} className="font-semibold underline">Geri çek</button>}
          </span>
        ))}
      </div>

      {msg && <p className={`rounded-xl px-3 py-2 text-[13px] font-medium ${msg.ok ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>{msg.text}</p>}

      {/* Görevler */}
      <section className="space-y-2.5">
        <div className="flex items-baseline justify-between px-1 pt-1">
          <h2 className="text-[15px] font-bold text-gray-900">{dayTitle(date, today)}</h2>
          {tasks.length > 0 && (
            <span className="text-[12.5px] text-gray-500">
              <b className="text-emerald-600">{doneCount} yaptı</b>{missedCount > 0 && <> · <b className="text-rose-600">{missedCount} yapmadı</b></>} · {tasks.length - doneCount - missedCount} bekliyor
            </span>
          )}
        </div>

        {rows === null ? (
          <div className="space-y-2.5">{[0, 1, 2].map((i) => <div key={i} className="h-24 animate-pulse rounded-2xl bg-gray-100" />)}</div>
        ) : tasks.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-200 bg-white px-4 py-8 text-center">
            <div className="mb-1 text-[28px]">📭</div>
            <p className="text-[13.5px] text-gray-500">Bu gün için programda görev yok.</p>
            <p className="text-[12.5px] text-gray-400">Yaptığı çalışmayı aşağıdan “Plan dışı çalışma” olarak ekleyebilirsiniz.</p>
          </div>
        ) : tasks.map((t) => {
          const d = draftOf(t);
          const done = !!t.student_done;
          const missed = !done && !!t.student_missed;
          const open = openTask === t.id;
          const e = done ? taskEntry(t.id) : null;
          const meta = [t.resource_name, t.target_count ? `hedef ${t.target_count} soru` : null, t.topic_target_minutes ? `hedef ${t.topic_target_minutes} dk` : null,
            t.start_time ? `${t.start_time.slice(0, 5)}${t.end_time ? `–${t.end_time.slice(0, 5)}` : ''}` : null].filter(Boolean).join(' · ');
          const bar = done ? 'bg-emerald-500' : missed ? 'bg-rose-500' : 'bg-gray-200';
          return (
            <div key={t.id} className={`relative overflow-hidden rounded-2xl border bg-white shadow-sm ${done ? 'border-emerald-200' : missed ? 'border-rose-200' : 'border-gray-200'}`}>
              <span className={`absolute inset-y-0 left-0 w-1.5 ${bar}`} />
              <div className="py-3 pl-4 pr-3">
                <div className="flex items-start gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="text-[15px] font-semibold text-gray-900">{t.subject}</div>
                    {t.topic && <div className="text-[13px] text-gray-600">{t.topic}</div>}
                    {meta && <div className="mt-0.5 text-[12px] text-gray-400">{meta}</div>}
                  </div>
                  {done && <span className="flex flex-shrink-0 items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-[12px] font-bold text-emerald-700"><IconCheck size={14} /> Yaptı</span>}
                  {missed && <span className="flex-shrink-0 rounded-full bg-rose-100 px-2.5 py-1 text-[12px] font-bold text-rose-700">✕ Yapmadı</span>}
                </div>

                {/* Yapıldıysa özet */}
                {done && e && !open && (
                  <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl bg-emerald-50/70 px-3 py-2 text-[13px] text-emerald-900">
                    {e.count > 0 && <span><b>{e.count}</b> soru{(e.correct || e.wrong) ? ` (${e.correct}D ${e.wrong}Y)` : ''}</span>}
                    {e.minutes > 0 && <span><b>{e.minutes}</b> dk</span>}
                    {e.pages && <span>s. <b>{e.pages}</b></span>}
                    {e.by && <span className="text-[11.5px] text-emerald-700/70">{e.by} girdi</span>}
                    <span className="ml-auto flex gap-1">
                      <button type="button" onClick={() => setOpenTask(t.id)} className="flex items-center gap-1 rounded-lg px-2 py-1 text-[12px] font-semibold text-emerald-700 hover:bg-emerald-100"><IconPencil size={14} /> Düzenle</button>
                      <button type="button" disabled={busy === t.id} onClick={() => undo(t.id)} className="flex items-center gap-1 rounded-lg px-2 py-1 text-[12px] font-semibold text-gray-500 hover:bg-gray-100"><IconRotate size={14} /> Geri al</button>
                    </span>
                  </div>
                )}

                {missed && (
                  <div className="mt-2 flex flex-wrap items-center gap-2 rounded-xl bg-rose-50/70 px-3 py-2 text-[12.5px] text-rose-800">
                    <span className="flex-1">{t.student_missed_note ? <>Neden: {t.student_missed_note} · </> : null}{t.student_missed_by ? `${t.student_missed_by} işaretledi` : 'Öğrenci işaretledi'}</span>
                    <button type="button" onClick={() => setOpenTask(t.id)} className="rounded-lg px-2 py-1 font-semibold text-emerald-700 hover:bg-white">Aslında yaptı</button>
                    <button type="button" disabled={busy === t.id} onClick={() => setMissed(t.id, false)} className="rounded-lg px-2 py-1 font-semibold text-gray-500 hover:bg-white">Kaldır</button>
                  </div>
                )}

                {/* Bekleyen görev: büyük iki düğme */}
                {!done && !missed && !open && missFor !== t.id && (
                  <div className="mt-2.5 grid grid-cols-2 gap-2">
                    <button type="button" onClick={() => setOpenTask(t.id)}
                      className="flex items-center justify-center gap-1.5 rounded-xl bg-emerald-600 py-2.5 text-[14px] font-bold text-white shadow-sm hover:bg-emerald-700 active:scale-[0.98]">
                      <IconCheck size={18} /> Yaptı
                    </button>
                    <button type="button" onClick={() => { setMissFor(t.id); setMissNote(''); }}
                      className="flex items-center justify-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 py-2.5 text-[14px] font-bold text-rose-600 hover:bg-rose-100 active:scale-[0.98]">
                      <IconX size={18} /> Yapmadı
                    </button>
                  </div>
                )}

                {/* Yaptı formu */}
                {open && (
                  <div className="mt-2.5 space-y-2.5 rounded-xl bg-gray-50 p-2.5">
                    <DraftFields d={d} onChange={(patch) => setDraft(t.id, patch, d)} />
                    <div className="flex gap-2">
                      <button type="button" disabled={busy === t.id} onClick={() => save(t.id, t.subject, t.topic ?? '', d)}
                        className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-emerald-600 py-2.5 text-[14px] font-bold text-white hover:bg-emerald-700 disabled:opacity-60">
                        <IconCheck size={17} /> {busy === t.id ? 'Kaydediliyor…' : 'Kaydet'}
                      </button>
                      <button type="button" onClick={() => setOpenTask(null)} className="rounded-xl border border-gray-200 bg-white px-4 text-[13px] font-semibold text-gray-600 hover:bg-gray-100">Vazgeç</button>
                    </div>
                  </div>
                )}

                {/* Yapmadı nedeni */}
                {missFor === t.id && (
                  <div className="mt-2.5 space-y-2 rounded-xl bg-rose-50 p-2.5">
                    <input value={missNote} onChange={(ev) => setMissNote(ev.target.value)} maxLength={300} autoFocus
                      placeholder="Neden? (isteğe bağlı: hastaydı, izinliydi…)"
                      className="w-full rounded-xl border border-rose-200 bg-white px-3 py-2.5 text-[15px] focus:border-rose-400 focus:outline-none" />
                    <div className="flex gap-2">
                      <button type="button" disabled={busy === t.id} onClick={() => setMissed(t.id, true, missNote)}
                        className="flex-1 rounded-xl bg-rose-600 py-2.5 text-[14px] font-bold text-white hover:bg-rose-700 disabled:opacity-60">Yapmadı olarak kaydet</button>
                      <button type="button" onClick={() => setMissFor(null)} className="rounded-xl border border-gray-200 bg-white px-4 text-[13px] font-semibold text-gray-600 hover:bg-gray-100">Vazgeç</button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </section>

      {/* Plan dışı çalışma */}
      <section className="rounded-2xl border border-gray-200 bg-white shadow-sm">
        <button type="button" onClick={() => setShowExtra(!showExtra)} className="flex w-full items-center gap-2 px-4 py-3 text-[14px] font-bold text-gray-800">
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-violet-100 text-violet-700"><IconPlus size={16} /></span>
          Plan dışı çalışma ekle
          {extras.length > 0 && <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[11.5px] text-gray-600">{extras.length}</span>}
          <IconChevronDown size={16} className={`ml-auto text-gray-400 transition-transform ${showExtra ? 'rotate-180' : ''}`} />
        </button>
        {showExtra && (
          <div className="space-y-2.5 border-t border-gray-100 p-3">
            <div className="grid grid-cols-2 gap-2">
              <input value={extra.subject} onChange={(e) => setExtra({ ...extra, subject: e.target.value })} placeholder="Ders (ör. Matematik)"
                className="rounded-xl border border-gray-200 px-3 py-2.5 text-[15px] focus:border-violet-400 focus:outline-none" />
              <input value={extra.topic} onChange={(e) => setExtra({ ...extra, topic: e.target.value })} placeholder="Konu (isteğe bağlı)"
                className="rounded-xl border border-gray-200 px-3 py-2.5 text-[15px] focus:border-violet-400 focus:outline-none" />
            </div>
            <DraftFields d={extra} onChange={(patch) => setExtra({ ...extra, ...patch })} />
            <button type="button" disabled={busy === 'extra' || !extra.subject.trim()}
              onClick={async () => { if (await save(null, extra.subject, extra.topic, extra)) setExtra({ subject: '', topic: '', ...emptyDraft }); }}
              className="w-full rounded-xl bg-violet-600 py-2.5 text-[14px] font-bold text-white hover:bg-violet-700 disabled:opacity-50">
              {busy === 'extra' ? 'Kaydediliyor…' : 'Ekle'}
            </button>
          </div>
        )}
        {extras.length > 0 && (
          <ul className="space-y-1 border-t border-gray-100 px-4 py-2.5 text-[13px] text-gray-700">
            {extras.map((e, i) => (
              <li key={i} className="flex flex-wrap gap-x-1.5">
                <b className="font-semibold">{e.subject}</b>{e.topic ? <span>· {e.topic}</span> : null}
                {e.count ? <span>· {e.count} soru</span> : null}{e.duration_minutes ? <span>· {e.duration_minutes} dk</span> : null}
                {e.pages ? <span>· s. {e.pages}</span> : null}
                {e.by_name && <span className="text-gray-400">({e.by_name})</span>}
              </li>
            ))}
          </ul>
        )}
      </section>

      <button type="button" onClick={() => { goStudent(1); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
        className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gray-900 py-3.5 text-[15px] font-bold text-white shadow-sm hover:bg-gray-800">
        Sıradaki öğrenci: {students[(idx + 1) % students.length]?.full_name} <IconArrowRight size={18} />
      </button>

      {/* Öğrenci seçici */}
      {picker && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center" onClick={() => setPicker(false)}>
          <div className="flex max-h-[80dvh] w-full max-w-md flex-col rounded-t-3xl bg-white shadow-xl sm:rounded-3xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-2 border-b border-gray-100 p-3">
              <div className="flex flex-1 items-center gap-2 rounded-xl bg-gray-100 px-3">
                <IconSearch size={16} className="text-gray-400" />
                <input ref={searchRef} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Öğrenci ara"
                  className="w-full bg-transparent py-2.5 text-[15px] focus:outline-none" />
              </div>
              <button type="button" onClick={() => setPicker(false)} className="rounded-full p-2 text-gray-500 hover:bg-gray-100" aria-label="Kapat"><IconX size={18} /></button>
            </div>
            <ul className="overflow-y-auto p-2">
              {filtered.map((s) => (
                <li key={s.id}>
                  <button type="button" onClick={() => { setStudentId(s.id); setPicker(false); }}
                    className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left hover:bg-gray-50 ${s.id === studentId ? 'bg-emerald-50' : ''}`}>
                    <span className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full text-[13px] font-bold ${avatarColor(s.id)}`}>{initials(s.full_name)}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[14.5px] font-semibold text-gray-900">{s.full_name}</span>
                      {s.sinif_sube && <span className="block text-[12px] text-gray-500">{s.sinif_sube}</span>}
                    </span>
                    {s.id === studentId && <IconCheck size={18} className="text-emerald-600" />}
                  </button>
                </li>
              ))}
              {filtered.length === 0 && <li className="py-6 text-center text-[13px] text-gray-400">Öğrenci bulunamadı.</li>}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
