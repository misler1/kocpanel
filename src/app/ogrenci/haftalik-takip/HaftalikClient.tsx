'use client';
/* eslint-disable @typescript-eslint/no-explicit-any */

import { useMemo, useState } from 'react';
import { IconCheck, IconPlus, IconTrash, IconPencil, IconX } from '@tabler/icons-react';
import { createClient } from '@/lib/supabase/client';

const DAYS = ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi', 'Pazar'];
const DAYS_SHORT = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'];
const STATUS_TEXT: Record<string, string> = { bekliyor: 'Koç onayı bekliyor', onaylandi: 'Onaylandı', reddedildi: 'Reddedildi' };
const input = 'rounded-md border border-gray-200 bg-white px-1.5 py-1 text-[12px] focus:border-blue-500 focus:outline-none';

type Edits = Record<string, { plan_day?: number; start_time?: string | null; end_time?: string | null; target_count?: number }>;
type Added = { subject: string; topic: string; plan_day: number; target_count: number; start_time: string; end_time: string };

const hhmm = (t: string | null | undefined) => (t ? t.slice(0, 5) : '');
const weekLabel = (ws: string, we?: string | null) => {
  const f = (d: string) => new Date(d).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' });
  return we ? `${f(ws)} – ${f(we)}` : f(ws);
};

export function HaftalikClient({ studentId, coachId, resources, initialLogs, initialRequests }: {
  studentId: string; coachId: string; resources: Record<string, string[]>; initialLogs: any[]; initialRequests: any[];
}) {
  const supabase = createClient();
  const [logs, setLogs] = useState<any[]>(initialLogs);
  const [requests, setRequests] = useState<any[]>(initialRequests);
  const weeks = useMemo(() => {
    const m = new Map<string, string | null>();
    logs.forEach((l) => { if (!m.has(l.week_start)) m.set(l.week_start, l.week_end ?? null); });
    return Array.from(m.entries()).map(([ws, we]) => ({ ws, we })).sort((a, b) => (a.ws < b.ws ? 1 : -1));
  }, [logs]);

  const today = new Date().toISOString().slice(0, 10);
  const [week, setWeek] = useState<string>(() => {
    const cur = weeks.find((w) => w.ws <= today && (!w.we || today <= w.we));
    return (cur ?? weeks[0])?.ws ?? '';
  });
  const [editMode, setEditMode] = useState(false);
  const [edits, setEdits] = useState<Edits>({});
  const [removed, setRemoved] = useState<Set<string>>(new Set());
  const [added, setAdded] = useState<Added[]>([]);
  const [note, setNote] = useState('');
  const [newForm, setNewForm] = useState<Added | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [newNote, setNewNote] = useState('');
  const [showNew, setShowNew] = useState(false);
  const [extraForm, setExtraForm] = useState<Added | null>(null);
  const [extraBusy, setExtraBusy] = useState(false);

  const weekLogs = logs.filter((l) => l.week_start === week);
  const currentWeekEnd = weeks.find((w) => w.ws === week)?.we ?? null;
  const openEdit = requests.find((r) => r.status === 'bekliyor' && r.kind === 'duzenleme' && r.week_start === week);
  const openNew = requests.find((r) => r.status === 'bekliyor' && r.kind === 'yeni_program');
  const subjectOptions = Object.keys(resources);

  async function toggleDone(l: any) {
    if (editMode) return;
    const next = !l.student_done;
    setLogs((prev) => prev.map((x) => (x.id === l.id ? { ...x, student_done: next } : x)));
    const { error } = await (supabase.from('question_logs') as any)
      .update({ student_done: next, student_done_at: next ? new Date().toISOString() : null }).eq('id', l.id);
    if (error) {
      setLogs((prev) => prev.map((x) => (x.id === l.id ? { ...x, student_done: l.student_done } : x)));
      setMsg('Kaydedilemedi, tekrar dene.');
    } else setMsg(null);
  }

  function resetEdit() { setEditMode(false); setEdits({}); setRemoved(new Set()); setAdded([]); setNote(''); setNewForm(null); }
  const setEdit = (id: string, patch: Edits[string]) => setEdits((p) => ({ ...p, [id]: { ...p[id], ...patch } }));

  function buildRequest() {
    const ops: any[] = [];
    const summary: string[] = [];
    for (const l of weekLogs) {
      const name = `${DAYS_SHORT[l.plan_day ?? 0] ?? ''} · ${l.subject}${l.topic ? ' / ' + l.topic : ''}`;
      if (removed.has(l.id)) { ops.push({ op: 'delete', log_id: l.id }); summary.push(`${name}: kaldırılsın`); continue; }
      const e = edits[l.id];
      if (!e) continue;
      const fields: any = {}; const parts: string[] = [];
      if (e.plan_day !== undefined && e.plan_day !== l.plan_day) { fields.plan_day = e.plan_day; parts.push(`gün ${DAYS_SHORT[l.plan_day ?? 0]} → ${DAYS_SHORT[e.plan_day]}`); }
      if (e.target_count !== undefined && e.target_count !== l.target_count) { fields.target_count = e.target_count; parts.push(`hedef ${l.target_count} → ${e.target_count}`); }
      if (e.start_time !== undefined && (e.start_time ?? '') !== hhmm(l.start_time)) { fields.start_time = e.start_time || null; parts.push(`başlangıç ${hhmm(l.start_time) || '—'} → ${e.start_time || '—'}`); }
      if (e.end_time !== undefined && (e.end_time ?? '') !== hhmm(l.end_time)) { fields.end_time = e.end_time || null; parts.push(`bitiş ${hhmm(l.end_time) || '—'} → ${e.end_time || '—'}`); }
      if (parts.length) { ops.push({ op: 'update', log_id: l.id, fields }); summary.push(`${name}: ${parts.join(', ')}`); }
    }
    for (const a of added) {
      ops.push({ op: 'add', fields: { subject: a.subject, topic: a.topic || null, plan_day: a.plan_day, target_count: a.target_count, start_time: a.start_time || null, end_time: a.end_time || null } });
      summary.push(`${DAYS_SHORT[a.plan_day]} · ${a.subject}${a.topic ? ' / ' + a.topic : ''}: eklensin${a.target_count ? ` (${a.target_count} soru)` : ''}`);
    }
    return { ops, summary };
  }

  async function submitEdit() {
    const { ops, summary } = buildRequest();
    if (ops.length === 0) { setMsg('Henüz bir değişiklik yapmadın.'); return; }
    setBusy(true); setMsg(null);
    const { data, error } = await (supabase as any).from('weekly_plan_requests').insert({
      student_id: studentId, coach_id: coachId, kind: 'duzenleme', week_start: week,
      payload: { ops, summary }, note: note.trim() || null, status: 'bekliyor',
    }).select('id, kind, week_start, status, note, created_at, decided_at').single();
    setBusy(false);
    if (error) { setMsg(error.code === '23505' ? 'Bu hafta için zaten onay bekleyen bir talebin var.' : 'Talep gönderilemedi: ' + error.message); return; }
    setRequests((p) => [data, ...p]);
    resetEdit();
    setMsg('Değişiklik talebin koçuna gönderildi. Onaylayınca programına uygulanır.');
  }

  async function submitNew() {
    setBusy(true); setMsg(null);
    const { data, error } = await (supabase as any).from('weekly_plan_requests').insert({
      student_id: studentId, coach_id: coachId, kind: 'yeni_program', week_start: null,
      payload: {}, note: newNote.trim() || null, status: 'bekliyor',
    }).select('id, kind, week_start, status, note, created_at, decided_at').single();
    setBusy(false);
    if (error) { setMsg(error.code === '23505' ? 'Zaten bekleyen bir yeni program talebin var.' : 'Talep gönderilemedi: ' + error.message); return; }
    setRequests((p) => [data, ...p]);
    setShowNew(false); setNewNote('');
    setMsg('Yeni program talebin koçuna gönderildi.');
  }

  function submitAddForm() {
    if (!newForm || !newForm.subject.trim()) { setMsg('Ders adını yaz.'); return; }
    setAdded((p) => [...p, { ...newForm, subject: newForm.subject.trim(), topic: newForm.topic.trim() }]);
    setNewForm(null); setMsg(null);
  }

  // Koçun verdiği programın dışında, öğrencinin kendi eklediği görev. Onay beklemez, hemen eklenir.
  async function submitExtraTask() {
    if (!extraForm || !extraForm.subject.trim() || !week) { setMsg('Ders adını yaz.'); return; }
    setExtraBusy(true); setMsg(null);
    const { data, error } = await (supabase as any).from('question_logs').insert({
      student_id: studentId, subject: extraForm.subject.trim(), topic: extraForm.topic.trim() || null,
      week_start: week, week_end: currentWeekEnd, plan_day: extraForm.plan_day,
      target_count: extraForm.target_count, start_time: extraForm.start_time || null, end_time: extraForm.end_time || null,
    }).select().single();
    setExtraBusy(false);
    if (error) { setMsg('Görev eklenemedi: ' + error.message); return; }
    setLogs((prev) => [...prev, data]);
    setExtraForm(null);
  }

  async function removeExtraTask(id: string) {
    setLogs((prev) => prev.filter((l) => l.id !== id));
    const { error } = await (supabase as any).from('question_logs').delete().eq('id', id);
    if (error) setMsg('Silinemedi, tekrar dene.');
  }

  const doneCount = weekLogs.filter((l) => l.student_done).length;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-[17px] font-medium text-gray-900">Haftalık Takip</h1>
        {weeks.length > 0 && (
          <select value={week} onChange={(e) => { setWeek(e.target.value); resetEdit(); }} className="rounded-lg border border-gray-200 bg-white px-2 py-1 text-[13px]">
            {weeks.map((w) => <option key={w.ws} value={w.ws}>{weekLabel(w.ws, w.we)}</option>)}
          </select>
        )}
      </div>

      {msg && <p className="rounded-lg border border-blue-100 bg-blue-50 px-3 py-2 text-[13px] text-blue-800">{msg}</p>}
      {openEdit && <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[13px] text-amber-800">Bu hafta için değişiklik talebin koç onayını bekliyor.</p>}
      {openNew && <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[13px] text-amber-800">Yeni program talebin koçuna iletildi, hazırlanmasını bekliyor.</p>}

      {weeks.length === 0 ? (
        <p className="rounded-xl border border-gray-200 bg-white p-6 text-center text-sm text-gray-500">Koçun henüz bir haftalık program hazırlamamış.</p>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[12px] text-gray-500">{doneCount}/{weekLogs.length} görev tamamlandı</span>
            <div className="ml-auto flex gap-2">
              {!editMode && !openEdit && (
                <button onClick={() => { setEditMode(true); setMsg(null); }} className="flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-[12px] text-gray-700">
                  <IconPencil size={14} /> Programı düzenle
                </button>
              )}
              {editMode && (
                <button onClick={resetEdit} className="flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-[12px] text-gray-700"><IconX size={14} /> Vazgeç</button>
              )}
              {!openNew && !editMode && (
                <button onClick={() => setShowNew((v) => !v)} className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-[12px] text-gray-700">Yeni program iste</button>
              )}
            </div>
          </div>

          {showNew && (
            <div className="space-y-2 rounded-xl border border-gray-200 bg-white p-3">
              <p className="text-[13px] text-gray-700">Koçundan yeni bir haftalık program hazırlamasını iste.</p>
              <textarea value={newNote} onChange={(e) => setNewNote(e.target.value)} rows={2} placeholder="İstersen not yaz (örn. gelecek hafta deneme var)" className="w-full rounded-lg border border-gray-200 px-2 py-1.5 text-[13px]" />
              <button disabled={busy} onClick={submitNew} className="rounded-lg bg-blue-600 px-3 py-1.5 text-[12px] font-medium text-white disabled:opacity-50">Talebi gönder</button>
            </div>
          )}

          {editMode && <p className="text-[12px] text-gray-500">Değişiklikler hemen uygulanmaz; koçun onaylarsa programına işlenir.</p>}

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {DAYS.map((dayName, d) => {
              const dayLogs = weekLogs.filter((l) => l.plan_day === d);
              const dayAdded = added.filter((a) => a.plan_day === d);
              // Boş günler de gösterilir: öğrenci o güne ekstra görev ekleyebilmeli.
              return (
                <div key={d} className="rounded-xl border border-gray-200 bg-white p-2.5">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-[13px] font-semibold text-gray-800">{dayName}</span>
                    {editMode ? (
                      <button onClick={() => setNewForm({ subject: '', topic: '', plan_day: d, target_count: 0, start_time: '', end_time: '' })} className="flex items-center gap-0.5 text-[11px] text-blue-600"><IconPlus size={12} /> Görev</button>
                    ) : (
                      <button onClick={() => setExtraForm({ subject: '', topic: '', plan_day: d, target_count: 0, start_time: '', end_time: '' })} className="flex items-center gap-0.5 text-[11px] text-gray-500 hover:text-blue-600"><IconPlus size={12} /> Ekstra görev</button>
                    )}
                  </div>
                  <div className="space-y-2">
                    {dayLogs.map((l) => {
                      const done = !!l.student_done;
                      const isRemoved = removed.has(l.id);
                      const e = edits[l.id] ?? {};
                      const time = [hhmm(l.start_time), hhmm(l.end_time)].filter(Boolean).join(' - ');
                      if (editMode) {
                        return (
                          <div key={l.id} className={`space-y-1.5 rounded-lg border p-2 ${isRemoved ? 'border-red-200 bg-red-50 opacity-70' : 'border-gray-200'}`}>
                            <div className="flex items-start justify-between gap-1">
                              <div className="min-w-0 text-[12px] font-medium text-gray-900">{l.subject}{l.topic && <span className="block text-[11px] font-normal text-gray-500">{l.topic}</span>}</div>
                              <button onClick={() => setRemoved((p) => { const n = new Set(p); if (n.has(l.id)) n.delete(l.id); else n.add(l.id); return n; })} title={isRemoved ? 'Geri al' : 'Kaldırılsın'} className="text-gray-400 hover:text-red-600"><IconTrash size={14} /></button>
                            </div>
                            {!isRemoved && (
                              <div className="flex flex-wrap gap-1">
                                <select value={e.plan_day ?? l.plan_day} onChange={(ev) => setEdit(l.id, { plan_day: Number(ev.target.value) })} className={input}>{DAYS_SHORT.map((n, i) => <option key={i} value={i}>{n}</option>)}</select>
                                <input type="time" value={e.start_time !== undefined ? e.start_time ?? '' : hhmm(l.start_time)} onChange={(ev) => setEdit(l.id, { start_time: ev.target.value || null })} className={`${input} w-[5rem]`} />
                                <input type="time" value={e.end_time !== undefined ? e.end_time ?? '' : hhmm(l.end_time)} onChange={(ev) => setEdit(l.id, { end_time: ev.target.value || null })} className={`${input} w-[5rem]`} />
                                <input type="number" min={0} value={e.target_count ?? l.target_count ?? 0} onChange={(ev) => setEdit(l.id, { target_count: Math.max(0, Number(ev.target.value) || 0) })} className={`${input} w-16`} title="Hedef soru" />
                              </div>
                            )}
                          </div>
                        );
                      }
                      return (
                        <div key={l.id} className={`relative flex w-full items-start gap-2 rounded-lg border p-2 text-left transition ${done ? 'border-emerald-400 bg-emerald-50' : 'border-gray-200 bg-white hover:bg-gray-50'}`}>
                          <button type="button" onClick={() => toggleDone(l)} className="flex flex-1 items-start gap-2 text-left">
                            <span className={`mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full border ${done ? 'border-emerald-500 bg-emerald-500 text-white' : 'border-gray-300 text-transparent'}`}><IconCheck size={13} /></span>
                            <span className="min-w-0 flex-1">
                              <span className={`block text-[13px] font-medium ${done ? 'text-emerald-800' : 'text-gray-900'}`}>
                                {l.subject}{l.target_count > 0 && ` · ${l.target_count} soru`}
                                {l.student_added && <span className="ml-1.5 rounded-full bg-blue-50 px-1.5 py-0.5 text-[10px] font-medium text-blue-600">Ekstra</span>}
                              </span>
                              {l.topic && <span className="block text-[11px] text-gray-500">{l.topic}</span>}
                              {l.resource_name && <span className="block text-[11px] text-gray-400">{l.resource_name}</span>}
                              {time && <span className="block text-[11px] text-gray-400">{time}</span>}
                            </span>
                          </button>
                          {l.student_added && (
                            <button type="button" onClick={() => removeExtraTask(l.id)} title="Sil" className="flex-shrink-0 text-gray-300 hover:text-red-500"><IconTrash size={14} /></button>
                          )}
                        </div>
                      );
                    })}
                    {dayAdded.map((a, i) => (
                      <div key={i} className="flex items-center justify-between rounded-lg border border-dashed border-blue-300 bg-blue-50 p-2 text-[12px] text-blue-800">
                        <span>+ {a.subject}{a.topic && ` / ${a.topic}`}{a.target_count > 0 && ` · ${a.target_count} soru`}</span>
                        <button onClick={() => setAdded((p) => p.filter((x) => x !== a))}><IconX size={13} /></button>
                      </div>
                    ))}
                    {newForm && newForm.plan_day === d && (
                      <div className="space-y-1.5 rounded-lg border border-blue-300 p-2">
                        <input list="ders-listesi" value={newForm.subject} onChange={(e) => setNewForm({ ...newForm, subject: e.target.value })} placeholder="Ders" className={`${input} w-full`} />
                        <input value={newForm.topic} onChange={(e) => setNewForm({ ...newForm, topic: e.target.value })} placeholder="Konu (isteğe bağlı)" className={`${input} w-full`} />
                        <div className="flex flex-wrap gap-1">
                          <input type="number" min={0} value={newForm.target_count} onChange={(e) => setNewForm({ ...newForm, target_count: Math.max(0, Number(e.target.value) || 0) })} className={`${input} w-16`} title="Hedef soru" />
                          <input type="time" value={newForm.start_time} onChange={(e) => setNewForm({ ...newForm, start_time: e.target.value })} className={`${input} w-[5rem]`} />
                          <input type="time" value={newForm.end_time} onChange={(e) => setNewForm({ ...newForm, end_time: e.target.value })} className={`${input} w-[5rem]`} />
                        </div>
                        <div className="flex gap-2">
                          <button onClick={submitAddForm} className="rounded-md bg-blue-600 px-2.5 py-1 text-[12px] text-white">Ekle</button>
                          <button onClick={() => setNewForm(null)} className="rounded-md border border-gray-200 px-2.5 py-1 text-[12px] text-gray-600">İptal</button>
                        </div>
                      </div>
                    )}
                    {extraForm && extraForm.plan_day === d && (
                      <div className="space-y-1.5 rounded-lg border border-gray-300 bg-gray-50 p-2">
                        <p className="text-[11px] text-gray-500">Koçunun vermediği, kendi yaptığın bir görev. Hemen eklenir, onay gerekmez.</p>
                        <input list="ders-listesi" value={extraForm.subject} onChange={(e) => setExtraForm({ ...extraForm, subject: e.target.value })} placeholder="Ders" className={`${input} w-full`} />
                        <input value={extraForm.topic} onChange={(e) => setExtraForm({ ...extraForm, topic: e.target.value })} placeholder="Konu (isteğe bağlı)" className={`${input} w-full`} />
                        <div className="flex flex-wrap gap-1">
                          <input type="number" min={0} value={extraForm.target_count} onChange={(e) => setExtraForm({ ...extraForm, target_count: Math.max(0, Number(e.target.value) || 0) })} className={`${input} w-16`} title="Soru sayısı" />
                          <input type="time" value={extraForm.start_time} onChange={(e) => setExtraForm({ ...extraForm, start_time: e.target.value })} className={`${input} w-[5rem]`} />
                          <input type="time" value={extraForm.end_time} onChange={(e) => setExtraForm({ ...extraForm, end_time: e.target.value })} className={`${input} w-[5rem]`} />
                        </div>
                        <div className="flex gap-2">
                          <button disabled={extraBusy} onClick={submitExtraTask} className="rounded-md bg-gray-800 px-2.5 py-1 text-[12px] text-white disabled:opacity-50">Ekle</button>
                          <button onClick={() => setExtraForm(null)} className="rounded-md border border-gray-200 px-2.5 py-1 text-[12px] text-gray-600">İptal</button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          <datalist id="ders-listesi">{subjectOptions.map((s) => <option key={s} value={s} />)}</datalist>

          {editMode && (
            <div className="space-y-2 rounded-xl border border-gray-200 bg-white p-3">
              <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} placeholder="Koçuna not (örn. Cumartesi dersim var, o güne az görev koyalım)" className="w-full rounded-lg border border-gray-200 px-2 py-1.5 text-[13px]" />
              <button disabled={busy} onClick={submitEdit} className="rounded-lg bg-blue-600 px-3 py-1.5 text-[13px] font-medium text-white disabled:opacity-50">Koçuma onaya gönder</button>
            </div>
          )}
        </>
      )}

      {requests.length > 0 && (
        <div className="rounded-xl border border-gray-200 bg-white p-3">
          <p className="mb-1 text-[12px] font-semibold uppercase tracking-wide text-gray-400">Taleplerim</p>
          <ul className="divide-y divide-gray-100">
            {requests.map((r) => (
              <li key={r.id} className="flex items-center justify-between py-1.5 text-[12px]">
                <span className="text-gray-700">
                  {r.kind === 'yeni_program' ? 'Yeni program' : `Değişiklik (${weekLabel(r.week_start)})`} · {new Date(r.created_at).toLocaleDateString('tr-TR')}
                </span>
                <span className={r.status === 'onaylandi' ? 'text-emerald-600' : r.status === 'reddedildi' ? 'text-red-500' : 'text-amber-600'}>
                  {r.kind === 'yeni_program' && r.status === 'onaylandi' ? 'Hazırlandı' : STATUS_TEXT[r.status]}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
