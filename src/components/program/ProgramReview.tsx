'use client';
/* eslint-disable @typescript-eslint/no-explicit-any */

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { IconX, IconCheck } from '@tabler/icons-react';
import { createClient } from '@/lib/supabase/client';
import { addDays, DAY_NAMES, DAY_SHORT, shortDate, weekdayOf } from '@/lib/program-days';
import { TRACK_RESOURCES } from '@/lib/track-resources';
import { ProgramBoard, newKey, type BoardTask } from './ProgramBoard';

// Koçun onayına gelen programı Haftalık Takip panosunun görünümüyle açar; koç aynı şekilde düzenleyip onaylar.
//  • kind 'program': öğrencinin kendi yaptığı ya da belletmenin hazırladığı program (student_programs)
//  • kind 'talep'  : öğrencinin mevcut programda istediği değişiklikler (weekly_plan_requests, kind = 'duzenleme')

export type ReviewItem =
  | { kind: 'program'; row: any }
  | { kind: 'talep'; row: any };

const hhmm = (t: any) => (t ? String(t).slice(0, 5) : '');
const FIELDS = ['subject', 'topic', 'resource_name', 'plan_day', 'target_count', 'start_time', 'end_time', 'topic_target_minutes'] as const;

function toTask(x: any, key: string, id?: string): BoardTask {
  return {
    key, id,
    subject: x.subject ?? '', topic: x.topic ?? '', resource_name: x.resource_name ?? '',
    plan_day: Number(x.plan_day) || 0, target_count: Number(x.target_count) || 0,
    topic_target_minutes: x.topic_target_minutes ? Number(x.topic_target_minutes) : null,
    start_time: hhmm(x.start_time), end_time: hhmm(x.end_time),
    locked: !!x.appointment_id,
  };
}

/** Görevin, karşılaştırılan halinden farkları (okunur satırlar) */
function diffLines(base: BoardTask, t: BoardTask) {
  const out: string[] = [];
  const v = (s: string) => s || '—';
  if (base.subject !== t.subject) out.push(`Ders: ${v(base.subject)} → ${v(t.subject)}`);
  if (base.topic !== t.topic) out.push(`Konu: ${v(base.topic)} → ${v(t.topic)}`);
  if (base.resource_name !== t.resource_name) out.push(`Kaynak: ${v(base.resource_name)} → ${v(t.resource_name)}`);
  if (base.plan_day !== t.plan_day) out.push(`Gün: ${DAY_SHORT[base.plan_day]} → ${DAY_SHORT[t.plan_day]}`);
  if (base.target_count !== t.target_count) out.push(`Soru: ${base.target_count} → ${t.target_count}`);
  if (base.start_time !== t.start_time || base.end_time !== t.end_time) {
    const r = (a: string, b: string) => (a || b ? `${a || '—'}–${b || '—'}` : '—');
    out.push(`Saat: ${r(base.start_time, base.end_time)} → ${r(t.start_time, t.end_time)}`);
  }
  if ((base.topic_target_minutes ?? 0) !== (t.topic_target_minutes ?? 0)) out.push(`Süre: ${base.topic_target_minutes ?? 0} → ${t.topic_target_minutes ?? 0} dk`);
  return out;
}

/** İşaretleri (yeni / değişiyor / kaldırılacak) karşılaştırma tabanına göre yeniden hesaplar */
function remark(tasks: BoardTask[], base: Map<string, BoardTask>): BoardTask[] {
  return tasks.map((t) => {
    if (t.mark === 'removed') return { ...t, changes: undefined };
    const b = base.get(t.key);
    if (!b) return { ...t, mark: 'new', changes: undefined };
    const changes = diffLines(b, t);
    return { ...t, mark: changes.length ? 'changed' : null, changes: changes.length ? changes : undefined };
  });
}

export function ProgramReview({ item, onClose }: { item: ReviewItem; onClose: () => void }) {
  const router = useRouter();
  const supabase = useMemo(() => createClient() as any, []);
  const row = item.row;
  const student = row.students ?? {};
  const isProgram = item.kind === 'program';

  const [loading, setLoading] = useState(true);
  const weekStart: string = row.week_start;
  const [weekEnd, setWeekEnd] = useState<string | null>(row.week_end ?? null);
  const [base, setBase] = useState<Map<string, BoardTask>>(new Map());
  const [tasks, setTasks] = useState<BoardTask[]>([]);
  const [current, setCurrent] = useState<{ ws: string; we: string | null; tasks: BoardTask[] }[]>([]);
  const [view, setView] = useState<'yeni' | 'mevcut'>('yeni');
  const [touched, setTouched] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const resourceMap = useMemo(() => {
    const rm: Record<string, string[]> = {};
    for (const [s, list] of Object.entries((student.resources ?? {}) as Record<string, string[]>)) {
      const f = (list ?? []).filter((x) => x && x.trim());
      if (f.length) rm[s] = f;
    }
    return rm;
  }, [student.resources]);
  const subjects = TRACK_RESOURCES[student.track] ?? Object.keys(resourceMap);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && !busy) onClose(); };
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = prev; };
  }, [busy, onClose]);

  useEffect(() => {
    (async () => {
      try {
        if (isProgram) {
          // Gönderilen program; karşılaştırma tabanı gönderilen hali (koçun değişiklikleri işaretlenir)
          const list = (Array.isArray(row.tasks) ? row.tasks : []).map((t: any) => toTask(t, newKey()));
          setBase(new Map(list.map((t: BoardTask) => [t.key, t])));
          setTasks(list);
          setLoading(false);
          // Koçun bu tarihlerdeki programı (onaylanırsa silinecek): karşılaştırma için
          const { data } = await supabase.from('question_logs').select('*')
            .eq('student_id', student.id).is('appointment_id', null).lte('week_start', row.week_end)
            .order('week_start', { ascending: true }).limit(400);
          const coach = (data ?? []).filter((l: any) => !l.student_plan && !l.student_added
            && (l.week_end ?? addDays(l.week_start, 6)) >= row.week_start);
          const weeks = new Map<string, { ws: string; we: string | null; tasks: BoardTask[] }>();
          for (const l of coach) {
            const w = weeks.get(l.week_start) ?? { ws: l.week_start as string, we: (l.week_end ?? null) as string | null, tasks: [] as BoardTask[] };
            w.tasks.push(toTask(l, l.id, l.id));
            weeks.set(l.week_start, w);
          }
          setCurrent(Array.from(weeks.values()));
        } else {
          // Değişiklik talebi: mevcut program + öğrencinin istediği değişiklikler işaretli
          const { data } = await supabase.from('question_logs').select('*').eq('student_id', student.id).eq('week_start', row.week_start);
          const logs: any[] = data ?? [];
          if (logs[0]?.week_end) setWeekEnd(logs[0].week_end);
          const baseList = logs.map((l) => toTask(l, l.id, l.id));
          const baseMap = new Map(baseList.map((t) => [t.key, t]));
          let list = baseList.map((t) => ({ ...t }));
          for (const op of (row.payload?.ops ?? []) as any[]) {
            if (op.op === 'delete') list = list.map((t) => (t.key === op.log_id ? { ...t, mark: 'removed' as const } : t));
            else if (op.op === 'update') {
              const f = op.fields ?? {};
              list = list.map((t) => (t.key !== op.log_id ? t : {
                ...t,
                ...(f.plan_day !== undefined ? { plan_day: Number(f.plan_day) } : {}),
                ...(f.target_count !== undefined ? { target_count: Number(f.target_count) || 0 } : {}),
                ...(f.start_time !== undefined ? { start_time: hhmm(f.start_time) } : {}),
                ...(f.end_time !== undefined ? { end_time: hhmm(f.end_time) } : {}),
              }));
            } else if (op.op === 'add') list.push(toTask(op.fields ?? {}, newKey()));
          }
          setBase(baseMap);
          setTasks(remark(list, baseMap));
        }
      } catch {
        setError('Program yüklenemedi, sayfayı yenileyip tekrar deneyin.');
      } finally {
        setLoading(false);
      }
    })();
  }, [isProgram, row, student.id, supabase]);

  function change(next: BoardTask[]) {
    setTouched(true);
    setTasks(remark(next, base));
  }

  const active = tasks.filter((t) => t.mark !== 'removed');
  const counts = {
    added: tasks.filter((t) => t.mark === 'new').length,
    changed: tasks.filter((t) => t.mark === 'changed').length,
    // Gönderilen programdan silinen görevler panoda kalmaz; tabanda olup panoda olmayanlar da sayılır
    removed: tasks.filter((t) => t.mark === 'removed').length + Array.from(base.keys()).filter((k) => !tasks.some((t) => t.key === k)).length,
  };
  const coachEdited = isProgram ? counts.added + counts.changed + counts.removed > 0 : touched;

  async function approve() {
    setError(null);
    if (active.some((t) => !t.subject.trim())) { setError('Her görevin dersi yazılmalı.'); return; }
    if (isProgram) {
      if (active.length === 0) { setError('Programda en az bir görev olmalı.'); return; }
      const msg = `${student.full_name ?? 'Öğrenci'} programı ${coachEdited ? 'yaptığınız değişikliklerle ' : ''}onaylansın mı?`
        + (current.length ? `\n\nSizin ${shortDate(row.week_start)} – ${shortDate(row.week_end)} tarihleriyle çakışan programınız silinecek ve bu program geçerli olacak.` : '');
      if (!window.confirm(msg)) return;
      setBusy(true);
      const payload = active.map((t) => ({
        subject: t.subject.trim(), topic: t.topic.trim() || null, resource_name: t.resource_name.trim() || null,
        plan_day: t.plan_day, target_count: t.target_count, start_time: t.start_time || null, end_time: t.end_time || null,
      }));
      const { error: err } = coachEdited
        ? await supabase.rpc('decide_student_program_edited', { p_id: row.id, p_tasks: payload })
        : await supabase.rpc('decide_student_program', { p_id: row.id, p_approve: true });
      setBusy(false);
      if (err) {
        setError(err.code === 'PGRST202' ? 'Düzenleyerek onay henüz etkin değil (supabase/program_duzenleyerek_onay.sql çalıştırılmalı).' : err.message);
        return;
      }
    } else {
      // Panodaki son hal ile mevcut program arasındaki fark uygulanır
      const ops: any[] = [];
      for (const b of base.values()) {
        if (b.locked) continue;
        const t = tasks.find((x) => x.key === b.key);
        if (!t || t.mark === 'removed') { ops.push({ op: 'delete', log_id: b.key }); continue; }
        const fields: Record<string, any> = {};
        for (const f of FIELDS) {
          if ((b as any)[f] !== (t as any)[f]) fields[f] = (t as any)[f] === '' ? null : (t as any)[f];
        }
        if (Object.keys(fields).length) ops.push({ op: 'update', log_id: b.key, fields });
      }
      for (const t of tasks) {
        if (base.has(t.key) || t.mark === 'removed') continue;
        ops.push({ op: 'add', fields: {
          subject: t.subject.trim(), topic: t.topic.trim() || null, resource_name: t.resource_name.trim() || null,
          plan_day: t.plan_day, target_count: t.target_count, start_time: t.start_time || null, end_time: t.end_time || null,
          topic_target_minutes: t.topic_target_minutes,
        } });
      }
      if (!window.confirm(`${student.full_name ?? 'Öğrenci'} programına ${ops.length} değişiklik uygulansın mı?`)) return;
      setBusy(true);
      const res = await fetch('/api/ogrenci/plan-talebi', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: row.id, action: 'onayla', ops }),
      });
      const json = await res.json().catch(() => ({}));
      setBusy(false);
      if (!res.ok) { setError(json.error ?? 'İşlem yapılamadı.'); return; }
    }
    onClose();
    router.refresh();
  }

  async function reject() {
    const q = isProgram
      ? `${student.full_name ?? 'Öğrenci'} için gönderilen program reddedilsin mi?${current.length ? ' Sizin programınız geçerli kalır.' : ''}`
      : 'Bu değişiklik talebi reddedilsin mi? Program olduğu gibi kalır.';
    if (!window.confirm(q)) return;
    setBusy(true); setError(null);
    if (isProgram) {
      const { error: err } = await supabase.rpc('decide_student_program', { p_id: row.id, p_approve: false });
      setBusy(false);
      if (err) { setError(err.message); return; }
    } else {
      const res = await fetch('/api/ogrenci/plan-talebi', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: row.id, action: 'reddet' }) });
      const json = await res.json().catch(() => ({}));
      setBusy(false);
      if (!res.ok) { setError(json.error ?? 'İşlem yapılamadı.'); return; }
    }
    onClose();
    router.refresh();
  }

  const who = isProgram
    ? row.prepared_by ? `${row.prepared_by_name ?? 'Personel'} hazırladı` : 'Öğrencinin kendi programı'
    : 'Öğrencinin değişiklik talebi';
  const range = `${DAY_NAMES[weekdayOf(weekStart)]} ${shortDate(weekStart)} → ${shortDate(weekEnd ?? addDays(weekStart, 6))}`;

  return (
    <div className="fixed inset-0 z-[60] flex items-stretch justify-center bg-black/45 p-0 backdrop-blur-[2px] sm:p-4" onClick={() => !busy && onClose()}>
      <div className="flex w-full max-w-[1600px] flex-col overflow-hidden bg-[var(--card)] shadow-2xl sm:rounded-2xl" onClick={(e) => e.stopPropagation()}>
        {/* Başlık */}
        <div className="flex flex-wrap items-start gap-3 border-b border-[var(--border)] bg-gradient-to-r from-indigo-50 to-[var(--card)] px-4 py-3">
          <div className="min-w-0 flex-1">
            <h2 className="text-[17px] font-semibold text-[var(--ink)]">
              {student.id ? <Link href={`/ogrenciler/${student.id}`} className="hover:underline">{student.full_name}</Link> : student.full_name}
              <span className="font-normal text-[var(--ink-muted)]"> · {isProgram ? 'Program onayı' : 'Değişiklik talebi'}</span>
            </h2>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-[12px]">
              <span className="rounded-full bg-[var(--card)] px-2 py-0.5 font-semibold text-[var(--ink)] shadow-sm">{range}</span>
              <span className={`rounded-full px-2 py-0.5 font-semibold ${isProgram && row.prepared_by ? 'bg-emerald-50 text-emerald-700' : 'bg-violet-100 text-violet-700'}`}>{who}</span>
              <span className="text-[var(--ink-muted)]">{active.length} görev</span>
            </div>
            {row.note && <p className="mt-1.5 max-w-3xl rounded-lg bg-[var(--card)] px-2.5 py-1.5 text-[12.5px] italic text-[var(--ink)] shadow-sm">“{row.note}”</p>}
          </div>
          <button type="button" onClick={onClose} disabled={busy} className="rounded-full p-1.5 text-[var(--ink-muted)] hover:bg-[var(--paper)]" aria-label="Kapat"><IconX size={20} /></button>
        </div>

        <div className="flex-1 space-y-3 overflow-y-auto p-3 sm:p-4">
          {loading ? (
            <p className="py-10 text-center text-[13px] text-[var(--ink-muted)]">Yükleniyor...</p>
          ) : (
            <>
              <div className="flex flex-wrap items-center gap-2">
                {isProgram && current.length > 0 && (
                  <div className="flex gap-1 rounded-lg bg-[var(--paper)] p-0.5">
                    <button type="button" onClick={() => setView('yeni')}
                      className={`rounded-md px-3 py-1 text-[12.5px] font-medium ${view === 'yeni' ? 'bg-[var(--card)] text-[var(--ink)] shadow-sm' : 'text-[var(--ink-muted)]'}`}>
                      Gelen program
                    </button>
                    <button type="button" onClick={() => setView('mevcut')}
                      className={`rounded-md px-3 py-1 text-[12.5px] font-medium ${view === 'mevcut' ? 'bg-[var(--card)] text-[var(--ink)] shadow-sm' : 'text-[var(--ink-muted)]'}`}>
                      Şu anki programınız
                    </button>
                  </div>
                )}
                {view === 'yeni' && (
                  <p className="text-[12px] text-[var(--ink-muted)]">
                    {isProgram
                      ? 'Haftalık Program’daki gibi düzenleyebilirsiniz: görev ekleyin, düzenleyin, silin, kopyalayıp başka güne yapıştırın, saatleri değiştirin.'
                      : 'Öğrencinin istediği değişiklikler işaretli. Onaylamadan önce istediğiniz gibi düzenleyebilirsiniz; silinenleri ↶ ile geri alabilirsiniz.'}
                  </p>
                )}
              </div>

              {view === 'yeni' && (counts.added + counts.changed + counts.removed > 0) && (
                <div className="flex flex-wrap gap-2 text-[11.5px] font-semibold">
                  {isProgram && <span className="text-[var(--ink-muted)]">Sizin değişiklikleriniz:</span>}
                  {counts.added > 0 && <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-emerald-700 ring-1 ring-emerald-300">+{counts.added} yeni</span>}
                  {counts.changed > 0 && <span className="rounded-full bg-amber-50 px-2 py-0.5 text-amber-800 ring-1 ring-amber-300">{counts.changed} değişiyor</span>}
                  {counts.removed > 0 && <span className="rounded-full bg-rose-50 px-2 py-0.5 text-rose-700 ring-1 ring-rose-300">{counts.removed} kaldırılacak</span>}
                </div>
              )}

              {view === 'yeni' ? (
                <ProgramBoard weekStart={weekStart} weekEnd={weekEnd} tasks={tasks} onChange={change}
                  subjects={subjects} resourceMap={resourceMap} showMinutes={!isProgram} />
              ) : (
                <div className="space-y-3">
                  <p className="rounded-md bg-amber-50 px-3 py-1.5 text-[12px] text-amber-800">
                    Gelen programı onaylarsanız bu tarihlerle çakışan programınız silinir ve yerine gelen program geçer.
                  </p>
                  {current.map((w) => (
                    <div key={w.ws}>
                      <p className="mb-1 text-[12px] font-semibold text-[var(--ink)]">{shortDate(w.ws)} – {shortDate(w.we ?? addDays(w.ws, 6))} · {w.tasks.length} görev</p>
                      <ProgramBoard weekStart={w.ws} weekEnd={w.we} tasks={w.tasks} subjects={subjects} resourceMap={resourceMap} readOnly />
                    </div>
                  ))}
                  <button type="button" onClick={() => setView('yeni')} className="text-[12px] font-medium text-[var(--accent-dark)] hover:underline">← Gelen programa dön</button>
                </div>
              )}
            </>
          )}
        </div>

        {/* İşlemler */}
        <div className="flex flex-wrap items-center gap-2 border-t border-[var(--border)] bg-[var(--card)] px-4 py-3">
          {error && <p className="w-full rounded-md bg-red-50 px-3 py-1.5 text-[12px] text-red-600">{error}</p>}
          <button type="button" disabled={busy || loading} onClick={reject}
            className="rounded-lg border border-[var(--danger)]/40 px-3.5 py-2 text-[13px] font-medium text-[var(--danger)] hover:bg-red-50 disabled:opacity-50">
            Reddet
          </button>
          <button type="button" disabled={busy} onClick={onClose}
            className="rounded-lg border border-[var(--border)] px-3.5 py-2 text-[13px] text-[var(--ink-muted)] hover:bg-[var(--paper)] disabled:opacity-50">
            Kapat
          </button>
          <button type="button" disabled={busy || loading} onClick={approve}
            className="ml-auto flex items-center gap-1.5 rounded-lg bg-[var(--accent)] px-4 py-2 text-[13px] font-semibold text-white hover:bg-[var(--accent-dark)] disabled:opacity-50">
            <IconCheck size={15} /> {busy ? 'Kaydediliyor…' : isProgram ? (coachEdited ? 'Değişikliklerimle onayla' : 'Onayla') : touched ? 'Değişikliklerimle onayla' : 'Onayla ve uygula'}
          </button>
        </div>
      </div>
    </div>
  );
}
