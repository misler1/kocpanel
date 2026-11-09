/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useMemo, useState } from 'react';
import { IconX, IconCopy, IconCalendarShare, IconCheck } from '@tabler/icons-react';
import { createClient } from '@/lib/supabase/client';
import { addDays, programLength, shortDate } from '@/lib/program-days';
import { todayTr } from '@/lib/day-tasks';

// Toplu haftalık program işlemleri:
//  • grup  : açık programı (ör. Say1 şablon öğrencisi) seçilen öğrencilere AYNI TARİHLERE kopyalar
//  • aktar : seçilen her öğrencinin SON programını bir sonraki haftaya kopyalar (öğrenciye özel programlar korunur)

export type BulkMode = 'grup' | 'aktar';
type Student = { id: string; full_name: string; sinif_sube?: string | null };
type Source = { studentId: string; name: string; weekStart: string; weekEnd: string; logs: any[] } | null;

type GrupRow = { id: string; name: string; existing: { weekStart: string; count: number; done: number }[]; on: boolean };
type AktarRow = { id: string; name: string; from: { start: string; end: string; count: number } | null; to: { start: string; end: string } | null; on: boolean; ready?: boolean };

const range = (s: string, e: string) => `${shortDate(s)} – ${shortDate(e)}`;
const overlaps = (aS: string, aE: string, bS: string, bE: string) => aS <= bE && bS <= aE;

/** İşleri 8'erli gruplar hâlinde paralel çalıştırır */
async function inBatches<T, R>(items: T[], fn: (t: T) => Promise<R>, size = 8): Promise<R[]> {
  const out: R[] = [];
  for (let i = 0; i < items.length; i += size) out.push(...(await Promise.all(items.slice(i, i + size).map(fn))));
  return out;
}

function copyRow(log: any, studentId: string, coachId: string | undefined, start: string, end: string) {
  return {
    student_id: studentId,
    coach_id: coachId,
    subject: log.subject,
    resource_name: log.resource_name,
    topic: log.topic,
    week_start: start,
    week_end: end,
    plan_day: log.plan_day,
    start_time: log.start_time,
    end_time: log.end_time,
    target_count: log.target_count ?? 0,
    done_count: 0,
    topic_target_minutes: log.topic_target_minutes,
    topic_done_minutes: 0,
  };
}

export function TopluProgramModal({
  initialMode, students, source, onClose, onDone,
}: {
  initialMode: BulkMode;
  students: Student[];
  source: Source;
  onClose: () => void;
  onDone: () => void;
}) {
  const supabase = createClient();
  const [mode, setMode] = useState<BulkMode>(initialMode);
  const [selected, setSelected] = useState<Set<string>>(() =>
    initialMode === 'aktar' ? new Set(students.map((s) => s.id)) : new Set()
  );
  const [q, setQ] = useState('');
  const [step, setStep] = useState<'sec' | 'onizle' | 'bitti'>('sec');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [grupRows, setGrupRows] = useState<GrupRow[]>([]);
  const [replace, setReplace] = useState(false);
  const [aktarRows, setAktarRows] = useState<AktarRow[]>([]);
  const [result, setResult] = useState('');

  const candidates = useMemo(
    () => (mode === 'grup' && source ? students.filter((s) => s.id !== source.studentId) : students),
    [mode, source, students]
  );
  const classes = useMemo(() => {
    const m = new Map<string, string[]>();
    for (const s of candidates) {
      const k = s.sinif_sube?.trim() || 'Sınıfsız';
      m.set(k, [...(m.get(k) ?? []), s.id]);
    }
    return Array.from(m, ([name, ids]) => ({ name, ids })).sort((a, b) => a.name.localeCompare(b.name, 'tr'));
  }, [candidates]);
  const visible = candidates.filter((s) => !q || s.full_name.toLocaleLowerCase('tr').includes(q.toLocaleLowerCase('tr')));
  const selCount = candidates.filter((s) => selected.has(s.id)).length;

  function switchMode(m: BulkMode) {
    if (busy) return;
    setMode(m);
    setStep('sec');
    setError('');
    setSelected(m === 'aktar' ? new Set(students.map((s) => s.id)) : new Set());
  }
  function toggle(id: string) {
    setSelected((p) => { const n = new Set(p); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  }
  function toggleClass(ids: string[]) {
    setSelected((p) => {
      const n = new Set(p);
      const all = ids.every((id) => n.has(id));
      ids.forEach((id) => (all ? n.delete(id) : n.add(id)));
      return n;
    });
  }

  const nameOf = (id: string) => students.find((s) => s.id === id)?.full_name ?? '';
  const chosen = () => candidates.filter((s) => selected.has(s.id)).map((s) => s.id);

  // ── Önizleme ──
  async function preview() {
    setError('');
    setBusy(true);
    try {
      if (mode === 'grup') {
        if (!source) return;
        const { weekStart, weekEnd } = source;
        const rows = await inBatches(chosen(), async (id) => {
          const { data, error } = await (supabase as any).from('question_logs')
            .select('week_start, week_end, done_count, topic_done_minutes')
            .eq('student_id', id).is('appointment_id', null)
            .gte('week_start', addDays(weekStart, -6)).lte('week_start', weekEnd);
          if (error) throw error;
          const m = new Map<string, { weekStart: string; count: number; done: number }>();
          for (const r of data ?? []) {
            if (!overlaps(r.week_start, r.week_end || addDays(r.week_start, 6), weekStart, weekEnd)) continue;
            const e = m.get(r.week_start) ?? { weekStart: r.week_start, count: 0, done: 0 };
            e.count += 1;
            if ((r.done_count ?? 0) > 0 || (r.topic_done_minutes ?? 0) > 0) e.done += 1;
            m.set(r.week_start, e);
          }
          return { id, name: nameOf(id), existing: Array.from(m.values()), on: true } as GrupRow;
        });
        setGrupRows(rows);
      } else {
        const today = todayTr();
        const rows = await inBatches(chosen(), async (id) => {
          const { data, error } = await (supabase as any).from('question_logs')
            .select('week_start, week_end')
            .eq('student_id', id).is('appointment_id', null)
            .order('week_start', { ascending: false }).limit(1);
          if (error) throw error;
          const last = data?.[0];
          if (!last) return { id, name: nameOf(id), from: null, to: null, on: false } as AktarRow;
          const len = programLength(last.week_start, last.week_end);
          const { count } = await (supabase as any).from('question_logs')
            .select('id', { count: 'exact', head: true })
            .eq('student_id', id).eq('week_start', last.week_start).is('appointment_id', null);
          // Bir sonraki hafta; program haftalardır yazılmamışsa bu haftaya denk gelene kadar ilerletilir
          let start = addDays(last.week_start, 7);
          while (addDays(start, len - 1) < today) start = addDays(start, 7);
          return {
            id, name: nameOf(id),
            from: { start: last.week_start, end: last.week_end || addDays(last.week_start, 6), count: count ?? 0 },
            to: { start, end: addDays(start, len - 1) },
            // Son programı ileri bir tarihte başlıyorsa sonraki hafta zaten hazırlanmış demektir; varsayılan seçilmez
            on: last.week_start <= today,
            ready: last.week_start > today,
          } as AktarRow;
        });
        setAktarRows(rows.sort((a, b) => Number(!!b.from) - Number(!!a.from)));
      }
      setStep('onizle');
    } catch (e: any) {
      setError(e?.message ?? 'Programlar okunamadı.');
    } finally {
      setBusy(false);
    }
  }

  async function insertAll(rows: any[]) {
    for (let i = 0; i < rows.length; i += 500) {
      const { error } = await (supabase as any).from('question_logs').insert(rows.slice(i, i + 500));
      if (error) throw error;
    }
  }

  // ── Uygula ──
  async function apply() {
    setError('');
    setBusy(true);
    const { data: { user } } = await supabase.auth.getUser();
    try {
      if (mode === 'grup' && source) {
        const tasks = source.logs.filter((l) => !l.appointment_id);
        const targets = grupRows.filter((r) => r.on && (replace || r.existing.length === 0));
        let ok = 0;
        const failed: string[] = [];
        await inBatches(targets, async (r) => {
          try {
            for (const ex of r.existing) {
              const { error } = await (supabase as any).from('question_logs').delete()
                .eq('student_id', r.id).eq('week_start', ex.weekStart).is('appointment_id', null);
              if (error) throw error;
            }
            await insertAll(tasks.map((l) => copyRow(l, r.id, user?.id, source.weekStart, source.weekEnd)));
            ok += 1;
          } catch {
            failed.push(r.name);
          }
        }, 4);
        const skipped = grupRows.filter((r) => r.on).length - targets.length;
        setResult(
          `${ok} öğrenciye ${range(source.weekStart, source.weekEnd)} programı kopyalandı.` +
          (skipped ? ` Bu tarihlerde programı olan ${skipped} öğrenci atlandı.` : '') +
          (failed.length ? ` Kopyalanamayan: ${failed.join(', ')}.` : '')
        );
      } else {
        const targets = aktarRows.filter((r) => r.on && r.from && r.to);
        let ok = 0;
        const failed: string[] = [];
        await inBatches(targets, async (r) => {
          try {
            const { data, error } = await (supabase as any).from('question_logs').select('*')
              .eq('student_id', r.id).eq('week_start', r.from!.start).is('appointment_id', null);
            if (error) throw error;
            if (!data?.length) return;
            await insertAll(data.map((l: any) => copyRow(l, r.id, user?.id, r.to!.start, r.to!.end)));
            ok += 1;
          } catch {
            failed.push(r.name);
          }
        }, 4);
        setResult(
          `${ok} öğrencinin son haftalık programı bir sonraki haftaya aktarıldı.` +
          (failed.length ? ` Aktarılamayan: ${failed.join(', ')}.` : '')
        );
      }
      setStep('bitti');
      onDone();
    } catch (e: any) {
      setError(e?.message ?? 'İşlem tamamlanamadı.');
    } finally {
      setBusy(false);
    }
  }

  const tab = (m: BulkMode, label: string, Icon: typeof IconCopy) => (
    <button
      onClick={() => switchMode(m)}
      className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-[12px] font-semibold ${mode === m ? 'bg-[var(--accent)] text-white' : 'text-[var(--ink-muted)] hover:bg-[var(--paper)]'}`}
    >
      <Icon size={14} /> {label}
    </button>
  );

  const grupApplyCount = grupRows.filter((r) => r.on && (replace || r.existing.length === 0)).length;
  const aktarApplyCount = aktarRows.filter((r) => r.on && r.from).length;
  const grupBusyRows = grupRows.filter((r) => r.existing.length > 0);

  return (
    <div className="no-print fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-3" onClick={() => !busy && onClose()}>
      <div className="flex max-h-[92vh] w-full max-w-2xl flex-col gap-3 rounded-xl border border-[var(--border)] bg-[var(--card)] p-4 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h2 className="text-[15px] font-semibold text-[var(--ink)]">Toplu program işlemleri</h2>
          <button onClick={onClose} disabled={busy} className="text-[var(--ink-muted)] hover:text-[var(--ink)]"><IconX size={18} /></button>
        </div>

        <div className="flex gap-1 rounded-xl border border-[var(--border)] p-1">
          {tab('grup', 'Programı öğrencilere kopyala', IconCopy)}
          {tab('aktar', 'Son haftayı sonraki haftaya aktar', IconCalendarShare)}
        </div>

        {step === 'bitti' ? (
          <div className="space-y-3">
            <p className="flex items-start gap-2 rounded-lg bg-green-50 px-3 py-2.5 text-[13px] text-green-700">
              <IconCheck size={16} className="mt-0.5 shrink-0" /> {result}
            </p>
            <div className="flex justify-end gap-2">
              <button onClick={() => { setStep('sec'); setResult(''); }} className="rounded-md border border-[var(--border)] px-3 py-1.5 text-[12px] text-[var(--ink)] hover:bg-[var(--paper)]">Yeni işlem</button>
              <button onClick={onClose} className="rounded-md bg-[var(--accent)] px-3 py-1.5 text-[12px] font-semibold text-white">Kapat</button>
            </div>
          </div>
        ) : step === 'sec' ? (
          <>
            {mode === 'grup' ? (
              source && source.logs.length > 0 ? (
                <p className="rounded-lg bg-[var(--accent-soft)] px-3 py-2 text-[12px] text-[var(--ink)]">
                  Kaynak: <b>{source.name}</b> · {range(source.weekStart, source.weekEnd)} · {source.logs.filter((l) => !l.appointment_id).length} görev.
                  Seçtiğiniz öğrencilere <b>aynı tarihlere</b>, aynı gün ve saatlerle kopyalanır.
                </p>
              ) : (
                <p className="rounded-lg bg-amber-50 px-3 py-2 text-[12px] text-amber-800">
                  Önce kopyalamak istediğiniz programı açın (ör. şablon öğrencinin bu haftaki programı), sonra bu ekranı tekrar açın.
                </p>
              )
            ) : (
              <p className="rounded-lg bg-[var(--accent-soft)] px-3 py-2 text-[12px] text-[var(--ink)]">
                Seçilen her öğrencinin <b>en son haftalık programı</b> (öğrenciye özel değişiklikleriyle birlikte) bir sonraki haftaya kopyalanır.
                Yapılan soru ve süreler sıfırdan başlar. Sonraki adımda her öğrenci için tarihleri görüp onaylarsınız.
              </p>
            )}

            {(mode === 'aktar' || (source && source.logs.length > 0)) && (
              <>
                <div className="flex flex-wrap gap-1.5">
                  {classes.map((c) => {
                    const n = c.ids.filter((id) => selected.has(id)).length;
                    const all = n === c.ids.length;
                    return (
                      <button key={c.name} onClick={() => toggleClass(c.ids)}
                        className={`rounded-full border px-3 py-1 text-[12px] font-medium ${all ? 'border-[var(--accent)] bg-[var(--accent)] text-white' : n ? 'border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--ink)]' : 'border-[var(--border)] text-[var(--ink-muted)] hover:bg-[var(--paper)]'}`}>
                        {c.name} <span className="opacity-70">{n ? `${n}/` : ''}{c.ids.length}</span>
                      </button>
                    );
                  })}
                  <button onClick={() => setSelected(new Set(candidates.map((s) => s.id)))} className="rounded-full border border-[var(--border)] px-3 py-1 text-[12px] text-[var(--ink-muted)] hover:bg-[var(--paper)]">Hepsi</button>
                  <button onClick={() => setSelected(new Set())} className="rounded-full border border-[var(--border)] px-3 py-1 text-[12px] text-[var(--ink-muted)] hover:bg-[var(--paper)]">Hiçbiri</button>
                </div>
                <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Öğrenci ara…"
                  className="w-full rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-[13px] text-[var(--ink)] outline-none focus:border-[var(--accent)]" />
                <div className="grid min-h-0 flex-1 grid-cols-1 gap-1 overflow-y-auto sm:grid-cols-2">
                  {visible.map((s) => (
                    <label key={s.id} className={`flex cursor-pointer items-center gap-2 rounded-lg border px-2.5 py-1.5 text-[12px] ${selected.has(s.id) ? 'border-[var(--accent)] bg-[var(--accent-soft)]' : 'border-[var(--border)] hover:bg-[var(--paper)]'}`}>
                      <input type="checkbox" checked={selected.has(s.id)} onChange={() => toggle(s.id)} className="h-4 w-4 accent-[var(--accent)]" />
                      <span className="flex-1 truncate text-[var(--ink)]">{s.full_name}</span>
                      {s.sinif_sube && <span className="text-[11px] text-[var(--ink-muted)]">{s.sinif_sube}</span>}
                    </label>
                  ))}
                </div>
              </>
            )}
            {error && <p className="rounded-md bg-red-50 px-3 py-2 text-[12px] text-red-600">{error}</p>}
            <div className="flex justify-end gap-2">
              <button onClick={onClose} className="rounded-md border border-[var(--border)] px-3 py-1.5 text-[12px] text-[var(--ink)] hover:bg-[var(--paper)]">İptal</button>
              <button onClick={preview} disabled={busy || selCount === 0 || (mode === 'grup' && !source?.logs.length)}
                className="rounded-md bg-[var(--accent)] px-4 py-1.5 text-[12px] font-semibold text-white hover:bg-[var(--accent-dark)] disabled:opacity-50">
                {busy ? 'Kontrol ediliyor…' : `Devam (${selCount} öğrenci)`}
              </button>
            </div>
          </>
        ) : (
          <>
            {mode === 'grup' && source ? (
              <>
                {grupBusyRows.length > 0 && (
                  <div className="space-y-1.5 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-[12px] text-amber-900">
                    <p><b>{grupBusyRows.length} öğrencinin</b> bu tarihlerde zaten programı var. Ne yapılsın?</p>
                    <label className="flex items-center gap-2"><input type="radio" checked={!replace} onChange={() => setReplace(false)} /> Onları atla (programları değişmez)</label>
                    <label className="flex items-center gap-2"><input type="radio" checked={replace} onChange={() => setReplace(true)} /> Mevcut programlarını silip bu programı koy <span className="text-amber-700">(o haftaya girilmiş soru/süre bilgileri de silinir)</span></label>
                  </div>
                )}
                <div className="min-h-0 flex-1 space-y-1 overflow-y-auto">
                  {grupRows.map((r) => {
                    const willSkip = r.existing.length > 0 && !replace;
                    const done = r.existing.reduce((a, e) => a + e.done, 0);
                    return (
                      <label key={r.id} className={`flex items-center gap-2 rounded-lg border px-2.5 py-1.5 text-[12px] ${willSkip ? 'border-[var(--border)] opacity-60' : 'border-[var(--border)]'}`}>
                        <input type="checkbox" checked={r.on} onChange={() => setGrupRows((p) => p.map((x) => (x.id === r.id ? { ...x, on: !x.on } : x)))} className="h-4 w-4 accent-[var(--accent)]" />
                        <span className="flex-1 truncate font-medium text-[var(--ink)]">{r.name}</span>
                        <span className={`text-[11px] ${r.existing.length ? 'text-amber-700' : 'text-green-700'}`}>
                          {r.existing.length === 0 ? 'Eklenecek'
                            : willSkip ? `Programı var (${r.existing.reduce((a, e) => a + e.count, 0)} görev) · atlanacak`
                            : `Programı değiştirilecek${done ? ` · ${done} görevde giriş var` : ''}`}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </>
            ) : (
              <div className="min-h-0 flex-1 space-y-1 overflow-y-auto">
                {aktarRows.map((r) => (
                  <label key={r.id} className={`flex items-center gap-2 rounded-lg border border-[var(--border)] px-2.5 py-1.5 text-[12px] ${r.from ? '' : 'opacity-60'}`}>
                    <input type="checkbox" disabled={!r.from} checked={r.on} onChange={() => setAktarRows((p) => p.map((x) => (x.id === r.id ? { ...x, on: !x.on } : x)))} className="h-4 w-4 accent-[var(--accent)]" />
                    <span className="min-w-0 flex-1 truncate font-medium text-[var(--ink)]">{r.name}</span>
                    {r.from && r.to ? (
                      <span className="text-right text-[11px] text-[var(--ink-muted)]">
                        {r.ready && <span className="mr-1 text-amber-700">Sonraki program zaten hazır ·</span>}
                        {range(r.from.start, r.from.end)} ({r.from.count} görev) → <b className="text-[var(--ink)]">{range(r.to.start, r.to.end)}</b>
                      </span>
                    ) : (
                      <span className="text-[11px] text-[var(--ink-muted)]">Programı yok</span>
                    )}
                  </label>
                ))}
              </div>
            )}
            {error && <p className="rounded-md bg-red-50 px-3 py-2 text-[12px] text-red-600">{error}</p>}
            <div className="flex justify-end gap-2">
              <button onClick={() => setStep('sec')} disabled={busy} className="rounded-md border border-[var(--border)] px-3 py-1.5 text-[12px] text-[var(--ink)] hover:bg-[var(--paper)]">Geri</button>
              <button onClick={apply} disabled={busy || (mode === 'grup' ? grupApplyCount === 0 : aktarApplyCount === 0)}
                className="rounded-md bg-[var(--accent)] px-4 py-1.5 text-[12px] font-semibold text-white hover:bg-[var(--accent-dark)] disabled:opacity-50">
                {busy ? 'Uygulanıyor…' : mode === 'grup' ? `${grupApplyCount} öğrenciye kopyala` : `${aktarApplyCount} öğrenciye aktar`}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
