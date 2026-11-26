'use client';

import { useEffect, useMemo, useState } from 'react';
import { IconCopy, IconDeviceFloppy, IconEdit, IconPlus, IconTrash, IconX, IconArrowBackUp } from '@tabler/icons-react';
import { DAY_SHORT, programDays, shortDate } from '@/lib/program-days';
import { getSubjectColor } from '@/lib/subject-colors';

// Haftalık Takip sayfasındaki panonun aynısı, ama veritabanına yazmaz: görevler bellekte düzenlenir.
// Program onay ekranında (öğrencinin / belletmenin programı, öğrencinin değişiklik talebi) kullanılır.

export type BoardTask = {
  key: string;
  /** Programda zaten var olan görevin question_logs id'si (değişiklik talebinde) */
  id?: string;
  subject: string;
  topic: string;
  resource_name: string;
  plan_day: number;
  target_count: number;
  topic_target_minutes: number | null;
  start_time: string;
  end_time: string;
  /** Talep edilen değişikliğin işareti: yeni eklenecek / değişecek / kaldırılacak */
  mark?: 'new' | 'changed' | 'removed' | null;
  /** "Gün: Pzt → Sal" gibi okunur değişiklik satırları */
  changes?: string[];
  /** Ajanda'dan gelen görüşme: buradan değişmez */
  locked?: boolean;
};

const CUSTOM = '__custom__';
const inputCls = 'w-full rounded-md border border-[var(--border)] bg-[var(--card)] px-1.5 py-1 text-[12px] text-[var(--ink)] outline-none focus:border-[var(--accent)]';
const timeCls = 'w-[4.5rem] rounded-md border border-[var(--border)] bg-[var(--card)] px-1 py-0.5 text-[11px] text-[var(--ink)] outline-none focus:border-[var(--accent)] disabled:opacity-60';

let seq = 0;
export const newKey = () => `t${Date.now().toString(36)}${(seq++).toString(36)}`;

type Draft = { subject: string; custom: string; resource: string; topic: string; target: string; minutes: string; start: string; end: string; day: number; days: number[] };

export function ProgramBoard({ weekStart, weekEnd, tasks, onChange, subjects, resourceMap, readOnly = false, showMinutes = true }: {
  weekStart: string;
  weekEnd: string | null;
  tasks: BoardTask[];
  onChange?: (tasks: BoardTask[]) => void;
  subjects: string[];
  resourceMap: Record<string, string[]>;
  readOnly?: boolean;
  /** Konu çalışma süresi (dk) alanı */
  showMinutes?: boolean;
}) {
  const days = useMemo(() => programDays(weekStart, weekEnd, tasks), [weekStart, weekEnd, tasks]);
  const [colorMode, setColorMode] = useState(true);
  const [addingDay, setAddingDay] = useState<number | null>(null);
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [error, setError] = useState('');
  const [clip, setClip] = useState<BoardTask | null>(null);
  const [mobileDay, setMobileDay] = useState<number>(() => days[0]?.weekday ?? 0);
  const shownMobileDay = days.some((d) => d.weekday === mobileDay) ? mobileDay : days[0]?.weekday ?? 0;

  useEffect(() => {
    if (!clip) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setClip(null); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [clip]);

  const set = (next: BoardTask[]) => onChange?.(next);
  const subjectList = useMemo(() => Array.from(new Set([...subjects, ...Object.keys(resourceMap)])), [subjects, resourceMap]);

  const sorted = [...tasks].sort((a, b) => {
    if (a.start_time && b.start_time) return a.start_time.localeCompare(b.start_time);
    if (a.start_time) return -1;
    if (b.start_time) return 1;
    return 0;
  });
  const byDay = (d: number) => sorted.filter((t) => t.plan_day === d);
  const rowCount = Math.max(3, ...days.map((d) => byDay(d.weekday).length + (readOnly ? 0 : 1)));

  function draftFrom(t: BoardTask | null, day: number): Draft {
    if (!t) {
      const s = subjectList[0] ?? CUSTOM;
      return { subject: s, custom: '', resource: resourceMap[s]?.[0] ?? '', topic: '', target: '', minutes: '', start: '', end: '', day, days: [day] };
    }
    const known = subjectList.includes(t.subject);
    return {
      subject: known ? t.subject : CUSTOM, custom: known ? '' : t.subject, resource: t.resource_name, topic: t.topic,
      target: t.target_count ? String(t.target_count) : '', minutes: t.topic_target_minutes ? String(t.topic_target_minutes) : '',
      start: t.start_time, end: t.end_time, day: t.plan_day, days: [t.plan_day],
    };
  }

  function openAdd(day: number) { setEditingKey(null); setDraft(draftFrom(null, day)); setAddingDay(day); setError(''); }
  function openEdit(t: BoardTask) { setAddingDay(null); setDraft(draftFrom(t, t.plan_day)); setEditingKey(t.key); setError(''); }
  function close() { setAddingDay(null); setEditingKey(null); setDraft(null); setError(''); }

  function fieldsFromDraft(d: Draft) {
    const subject = (d.subject === CUSTOM ? d.custom : d.subject).trim();
    if (!subject) { setError(d.subject === CUSTOM ? 'Görev adını yazın.' : 'Ders seçin.'); return null; }
    const target = Math.max(0, Math.floor(Number(d.target) || 0));
    const minutes = Math.max(0, Math.floor(Number(d.minutes) || 0));
    return { subject, resource_name: d.resource.trim(), topic: d.topic.trim(), target_count: target, topic_target_minutes: minutes || null, start_time: d.start, end_time: d.end };
  }

  function saveAdd() {
    if (!draft) return;
    const f = fieldsFromDraft(draft);
    if (!f) return;
    if (draft.days.length === 0) { setError('En az bir gün seçin.'); return; }
    set([...tasks, ...draft.days.map((day) => ({ ...f, key: newKey(), plan_day: day, mark: 'new' as const }))]);
    close();
  }

  function saveEdit(t: BoardTask) {
    if (!draft) return;
    const f = fieldsFromDraft(draft);
    if (!f) return;
    set(tasks.map((x) => (x.key === t.key ? { ...x, ...f, plan_day: draft.day, mark: x.mark === 'new' ? 'new' : x.mark } : x)));
    close();
  }

  function patch(t: BoardTask, p: Partial<BoardTask>) { set(tasks.map((x) => (x.key === t.key ? { ...x, ...p } : x))); }

  function remove(t: BoardTask) {
    // Programda var olan görev silinmez, "kaldırılacak" olarak işaretlenir (geri alınabilsin)
    if (t.id) patch(t, { mark: 'removed' });
    else set(tasks.filter((x) => x.key !== t.key));
  }

  function paste(day: number) {
    if (!clip) return;
    set([...tasks, { ...clip, key: newKey(), id: undefined, plan_day: day, mark: 'new', changes: undefined, locked: false }]);
  }

  function renderForm(t: BoardTask | null) {
    if (!draft) return null;
    const isAdd = !t;
    return (
      <div className="w-full space-y-1.5 rounded-lg border border-[var(--accent)] bg-[var(--card)] p-2">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-semibold text-[var(--ink)]">{isAdd ? `${days.find((d) => d.weekday === draft.day)?.label ?? ''} · yeni görev` : 'Görevi düzenle'}</span>
          <button type="button" onClick={close} className="text-[var(--ink-muted)] hover:text-[var(--ink)]"><IconX size={13} /></button>
        </div>
        <select value={draft.subject} onChange={(e) => setDraft({ ...draft, subject: e.target.value, resource: resourceMap[e.target.value]?.[0] ?? '' })} className={inputCls}>
          {subjectList.map((s) => <option key={s} value={s}>{s}</option>)}
          <option value={CUSTOM}>Diğer (kendim yazayım)</option>
        </select>
        {draft.subject === CUSTOM ? (
          <>
            <input autoFocus value={draft.custom} onChange={(e) => setDraft({ ...draft, custom: e.target.value })} placeholder="Görev adı (ör. Branş Denemesi)" className={inputCls} />
            <input value={draft.resource} onChange={(e) => setDraft({ ...draft, resource: e.target.value })} placeholder="Kaynak (opsiyonel)" className={inputCls} />
          </>
        ) : (resourceMap[draft.subject]?.length ?? 0) > 0 || !draft.resource ? (
          <select value={draft.resource} onChange={(e) => setDraft({ ...draft, resource: e.target.value })} className={inputCls}>
            <option value="">Kaynak yok</option>
            {(resourceMap[draft.subject] ?? []).map((r) => <option key={r} value={r}>{r}</option>)}
            {draft.resource && !(resourceMap[draft.subject] ?? []).includes(draft.resource) && <option value={draft.resource}>{draft.resource}</option>}
          </select>
        ) : (
          <input value={draft.resource} onChange={(e) => setDraft({ ...draft, resource: e.target.value })} placeholder="Kaynak (opsiyonel)" className={inputCls} />
        )}
        <input value={draft.topic} onChange={(e) => setDraft({ ...draft, topic: e.target.value })} placeholder="Konu (opsiyonel)" className={inputCls} />
        <div className="grid grid-cols-2 gap-1.5">
          {isAdd ? (
            <input type="number" min={0} value={draft.target} onChange={(e) => setDraft({ ...draft, target: e.target.value })} placeholder="Soru sayısı" className={`${inputCls} col-span-2`} />
          ) : (
            <>
              <select value={draft.day} onChange={(e) => setDraft({ ...draft, day: Number(e.target.value) })} className={inputCls}>
                {days.map((d) => <option key={d.weekday} value={d.weekday}>{d.label}{d.date ? ` (${shortDate(d.date)})` : ''}</option>)}
              </select>
              <input type="number" min={0} value={draft.target} onChange={(e) => setDraft({ ...draft, target: e.target.value })} placeholder="Soru" className={inputCls} />
            </>
          )}
        </div>
        <div className="grid grid-cols-2 gap-1.5">
          <input type="time" value={draft.start} onChange={(e) => setDraft({ ...draft, start: e.target.value })} title="Başlangıç saati" className={inputCls} />
          <input type="time" value={draft.end} onChange={(e) => setDraft({ ...draft, end: e.target.value })} title="Bitiş saati" className={inputCls} />
        </div>
        {showMinutes && (
          <input type="number" min={0} value={draft.minutes} onChange={(e) => setDraft({ ...draft, minutes: e.target.value })} placeholder="Çalışma süresi (dk)" className={inputCls} />
        )}
        {isAdd && (
          <div>
            <p className="mb-1 text-[10px] text-[var(--ink-muted)]">Şu günlere ekle:</p>
            <div className="flex flex-wrap gap-1">
              {days.map(({ weekday: i }) => (
                <button type="button" key={i}
                  onClick={() => setDraft({ ...draft, days: draft.days.includes(i) ? draft.days.filter((x) => x !== i) : [...draft.days, i].sort((a, b) => a - b) })}
                  className={`rounded-full px-1.5 py-0.5 text-[10px] font-medium ${draft.days.includes(i) ? 'bg-[var(--accent)] text-white' : 'border border-[var(--border)] bg-[var(--card)] text-[var(--ink-muted)]'}`}>
                  {DAY_SHORT[i]}
                </button>
              ))}
            </div>
          </div>
        )}
        {error && <p className="rounded-md bg-red-50 px-2 py-1 text-[11px] text-red-600">{error}</p>}
        <button type="button" onClick={() => (t ? saveEdit(t) : saveAdd())}
          className="flex w-full items-center justify-center gap-1 rounded-md bg-[var(--accent)] py-1.5 text-[12px] font-semibold text-white hover:bg-[var(--accent-dark)]">
          <IconDeviceFloppy size={13} /> {isAdd ? `Ekle${draft.days.length > 1 ? ` (${draft.days.length} güne)` : ''}` : 'Tamam'}
        </button>
      </div>
    );
  }

  function renderCard(t: BoardTask) {
    if (editingKey === t.key) return renderForm(t);
    const c = getSubjectColor(t.subject);
    const removed = t.mark === 'removed';
    const time = [t.start_time, t.end_time].filter(Boolean).join(' - ');
    const ring = t.mark === 'new' ? 'ring-2 ring-emerald-400' : t.mark === 'changed' ? 'ring-2 ring-amber-400' : removed ? 'ring-2 ring-rose-300' : '';
    return (
      <div className={`relative flex w-full flex-col rounded-lg border border-[var(--border)] bg-[var(--card)] p-1.5 ${ring} ${removed ? 'opacity-60' : ''}`}
        style={colorMode && !removed ? { backgroundColor: `${c}22`, borderLeft: `4px solid ${c}` } : removed ? { borderLeft: '4px solid #fda4af' } : undefined}>
        <div className="flex items-start justify-between gap-1">
          <div className="min-w-0">
            {t.mark === 'new' && <span className="mb-0.5 inline-block rounded bg-emerald-100 px-1 text-[9.5px] font-bold uppercase text-emerald-700">Yeni</span>}
            {t.mark === 'changed' && <span className="mb-0.5 inline-block rounded bg-amber-100 px-1 text-[9.5px] font-bold uppercase text-amber-800">Değişiyor</span>}
            {removed && <span className="mb-0.5 inline-block rounded bg-rose-100 px-1 text-[9.5px] font-bold uppercase text-rose-700">Kaldırılacak</span>}
            <span className={`block text-[12px] font-medium leading-tight text-[var(--ink)] ${removed ? 'line-through' : ''}`}>{t.subject}</span>
            {t.topic && <span className={`block text-[11px] leading-tight text-[var(--ink-muted)] ${removed ? 'line-through' : ''}`}>{t.topic}</span>}
            {t.resource_name && <span className="block text-[10px] leading-tight text-[var(--ink-muted)]">{t.resource_name}</span>}
            {t.locked && <span className="block text-[10px] font-semibold text-teal-700">Görüşme (Ajanda&apos;dan)</span>}
          </div>
          {!readOnly && !t.locked && (
            <div className="flex flex-shrink-0 items-center gap-1">
              {removed ? (
                <button type="button" onClick={() => patch(t, { mark: t.changes?.length ? 'changed' : null })} title="Geri al (kaldırılmasın)"
                  className="text-[var(--ink-muted)] hover:text-[var(--accent)]"><IconArrowBackUp size={14} /></button>
              ) : (
                <>
                  <button type="button" onClick={() => setClip(t)} title="Kopyala (sonra bir güne yapıştır)" className="text-[var(--ink-muted)] hover:text-[var(--accent)]"><IconCopy size={13} /></button>
                  <button type="button" onClick={() => openEdit(t)} title="Düzenle" className="text-[var(--ink-muted)] hover:text-[var(--accent)]"><IconEdit size={13} /></button>
                  <button type="button" onClick={() => remove(t)} title="Sil" className="text-[var(--ink-muted)] hover:text-[var(--danger)]"><IconTrash size={13} /></button>
                </>
              )}
            </div>
          )}
        </div>
        {t.changes && t.changes.length > 0 && (
          <ul className="mt-1 space-y-0.5 rounded bg-amber-50 px-1.5 py-1 text-[10.5px] leading-tight text-amber-900">
            {t.changes.map((c2, i) => <li key={i}>{c2}</li>)}
          </ul>
        )}
        <div className="mt-auto flex flex-wrap items-center gap-1 pt-1.5">
          {readOnly || t.locked || removed ? (
            time ? <span className="text-[11px] text-[var(--ink-muted)]">{time}</span> : null
          ) : (
            <>
              <input type="time" value={t.start_time} onChange={(e) => patch(t, { start_time: e.target.value })} title="Başlangıç saati" className={timeCls} />
              <input type="time" value={t.end_time} onChange={(e) => patch(t, { end_time: e.target.value })} title="Bitiş saati" className={timeCls} />
            </>
          )}
          {t.target_count > 0 && <span className="ml-auto text-[11px] font-medium text-[var(--ink-muted)]">{t.target_count} soru</span>}
        </div>
        {showMinutes && (t.topic_target_minutes ?? 0) > 0 && <span className="mt-0.5 text-[10px] text-[var(--ink-muted)]">Konu: {t.topic_target_minutes} dk</span>}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" onClick={() => setColorMode((v) => !v)}
          className="rounded-lg border border-[var(--border)] px-2.5 py-1 text-[12px] text-[var(--ink-muted)] hover:bg-[var(--paper)] hover:text-[var(--ink)]">
          {colorMode ? 'Renkli' : 'Siyah-beyaz'}
        </button>
        {clip && (
          <span className="flex flex-1 items-center justify-between gap-2 rounded-lg border border-[var(--accent)]/30 bg-[var(--accent-soft)] px-2.5 py-1 text-[12px] text-[var(--ink)]">
            <span>Kopyalanan: <b>{clip.subject}</b>{clip.topic ? ` · ${clip.topic}` : ''} — gün başlığındaki <b>Yapıştır</b>&apos;a basın.</span>
            <button type="button" onClick={() => setClip(null)} className="rounded-md border border-[var(--border)] bg-[var(--card)] px-2 py-0.5 text-[11px]">İptal</button>
          </span>
        )}
      </div>

      {/* Telefonda gün seçici */}
      <div className="flex gap-1 overflow-x-auto md:hidden">
        {days.map(({ weekday: i, date }) => (
          <button key={i} type="button" onClick={() => setMobileDay(i)}
            className={`flex min-w-[46px] flex-1 flex-col items-center rounded-xl px-1.5 py-1.5 text-[11.5px] font-medium ${shownMobileDay === i ? 'bg-indigo-500 text-white' : 'bg-[var(--paper)] text-[var(--ink-muted)]'}`}>
            {DAY_SHORT[i]}{date ? ` ${Number(date.slice(8))}` : ''}
            <span className={`text-[10.5px] ${shownMobileDay === i ? 'text-white/80' : ''}`}>{byDay(i).filter((t) => t.mark !== 'removed').length} görev</span>
          </button>
        ))}
      </div>

      <div className="overflow-x-auto pb-1">
        <div style={{ '--cols': days.length } as React.CSSProperties}
          className="grid grid-cols-1 gap-x-2 md:min-w-[calc(var(--cols)*158px)] md:grid-cols-[repeat(var(--cols),minmax(0,1fr))]">
          {days.map(({ weekday: i, label, date }) => (
            <div key={`h-${i}`} className={`flex flex-col items-center justify-center gap-1 rounded-t-lg bg-[var(--accent-soft)] px-1.5 py-2 text-center ${i !== shownMobileDay ? 'max-md:hidden' : ''}`}>
              <span className="text-[13px] font-semibold leading-tight text-[var(--accent-dark)]">
                {label}
                {date && <span className="block text-[11px] font-medium text-[var(--accent-dark)]/70">{shortDate(date)}</span>}
              </span>
              {clip && !readOnly && (
                <button type="button" onClick={() => paste(i)} className="rounded-md bg-[var(--accent)] px-2 py-0.5 text-[11px] font-medium text-white">Yapıştır</button>
              )}
            </div>
          ))}
          {Array.from({ length: rowCount }).flatMap((_, r) =>
            days.map(({ weekday: i }) => {
              const list = byDay(i);
              const t = list[r];
              const isAddSlot = !readOnly && r === list.length;
              return (
                <div key={`c-${i}-${r}`}
                  className={`flex bg-[var(--paper)] px-1.5 pb-1.5 ${r === rowCount - 1 ? 'rounded-b-lg' : ''} ${i !== shownMobileDay || (!t && !isAddSlot) ? 'max-md:hidden' : ''}`}>
                  {t ? renderCard(t) : isAddSlot ? (
                    addingDay === i ? renderForm(null) : (
                      <button type="button" onClick={() => openAdd(i)}
                        className="flex w-full items-center justify-center gap-1 self-start rounded-lg border border-dashed border-[var(--accent)]/50 bg-[var(--card)]/60 py-2 text-[12px] font-medium text-[var(--accent-dark)] transition-colors hover:border-[var(--accent)] hover:bg-[var(--accent)] hover:text-white">
                        <IconPlus size={13} /> Görev ekle
                      </button>
                    )
                  ) : null}
                </div>
              );
            }),
          )}
        </div>
      </div>
    </div>
  );
}
