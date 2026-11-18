'use client';
/* eslint-disable @typescript-eslint/no-explicit-any */

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { IconPlus, IconX } from '@tabler/icons-react';
import { createClient } from '@/lib/supabase/client';
import { DAY_NAMES, programDays, shortDate } from '@/lib/program-days';

type Task = { subject: string; topic?: string | null; resource_name?: string | null; plan_day: number; target_count?: number | null; start_time?: string | null; end_time?: string | null };

// Öğrencinin kendine yaptığı program, koçun o tarihlerdeki programıyla çakışıyorsa koçun onayını bekler.
// Onay: koçun o tarihlerdeki programı silinir, öğrencininki geçerli olur. Ret: koçun programı geçerli kalır.
// Düzenle: koç görevleri değiştirip "Değişikliklerle onayla" der (supabase/program_duzenleyerek_onay.sql).
export function OgrenciProgramOnaylari({ programs }: { programs: any[] }) {
  const router = useRouter();
  const [open, setOpen] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Düzenlenen programın görevleri (programId → görevler)
  const [edits, setEdits] = useState<Record<string, Task[]>>({});

  async function decide(p: any, approve: boolean) {
    const name = p.students?.full_name ?? 'Öğrenci';
    const byStaff = p.prepared_by_name || p.prepared_by;
    const q = approve
      ? byStaff
        ? `${p.prepared_by_name ?? 'Personelin'} hazırladığı ${name} programı onaylansın mı?

Sizin ${shortDate(p.week_start)} – ${shortDate(p.week_end)} tarihleriyle çakışan programınız (varsa) silinecek ve bu program geçerli olacak.`
        : `${name} öğrencisinin programı onaylansın mı?\n\nSizin ${shortDate(p.week_start)} – ${shortDate(p.week_end)} tarihleriyle çakışan programınız silinecek ve öğrencinin programı geçerli olacak.`
      : `${name} için hazırlanan program reddedilsin mi? Sizin programınız geçerli kalır.`;
    if (!window.confirm(q)) return;
    setBusy(p.id); setError(null);
    const { error: err } = await (createClient() as any).rpc('decide_student_program', { p_id: p.id, p_approve: approve });
    setBusy(null);
    if (err) { setError(err.message); return; }
    router.refresh();
  }

  function startEdit(p: any) {
    const tasks: Task[] = (Array.isArray(p.tasks) ? p.tasks : []).map((t: any) => ({ ...t }));
    setEdits((e) => ({ ...e, [p.id]: tasks }));
    setOpen(p.id);
    setError(null);
  }
  const cancelEdit = (id: string) => setEdits((e) => { const n = { ...e }; delete n[id]; return n; });
  const updateTask = (id: string, idx: number, patch: Partial<Task>) =>
    setEdits((e) => ({ ...e, [id]: e[id].map((t, i) => (i === idx ? { ...t, ...patch } : t)) }));
  const removeTask = (id: string, idx: number) => setEdits((e) => ({ ...e, [id]: e[id].filter((_, i) => i !== idx) }));
  const addTask = (id: string, day: number) =>
    setEdits((e) => ({ ...e, [id]: [...e[id], { subject: '', topic: '', plan_day: day, target_count: 0 }] }));

  async function approveEdited(p: any) {
    const tasks = (edits[p.id] ?? [])
      .map((t) => ({ ...t, subject: (t.subject ?? '').trim(), topic: (t.topic ?? '').trim() || null, target_count: Math.max(0, Number(t.target_count) || 0) }))
      .filter((t) => t.subject || t.topic);
    if (tasks.some((t) => !t.subject)) { setError('Her görevin dersi yazılmalı.'); return; }
    if (!tasks.length) { setError('Programda en az bir görev olmalı.'); return; }
    if (!window.confirm(`${p.students?.full_name ?? 'Öğrenci'} programı yaptığınız değişikliklerle onaylansın mı?\n\nSizin ${shortDate(p.week_start)} – ${shortDate(p.week_end)} tarihleriyle çakışan programınız silinecek ve bu program geçerli olacak.`)) return;
    setBusy(p.id); setError(null);
    const { error: err } = await (createClient() as any).rpc('decide_student_program_edited', { p_id: p.id, p_tasks: tasks });
    setBusy(null);
    if (err) {
      setError(err.code === 'PGRST202' ? 'Düzenleyerek onay henüz etkin değil (supabase/program_duzenleyerek_onay.sql çalıştırılmalı).' : err.message);
      return;
    }
    cancelEdit(p.id);
    router.refresh();
  }

  const inCls = 'min-w-0 rounded border border-gray-200 px-1.5 py-1 text-[11.5px] focus:border-violet-400 focus:outline-none';

  return (
    <div className="mb-4 rounded-xl border border-violet-200 bg-violet-50">
      <p className="px-4 pt-3 text-[13px] font-medium text-violet-900">
        {programs.length} program onayınızı bekliyor (öğrencinin kendi yaptığı ya da belletmenin hazırladığı)
      </p>
      <p className="px-4 text-[11px] text-violet-700">Onaylarsanız sizin o tarihlerdeki programınızın yerine geçer. &quot;Düzenle&quot; ile değişiklik yapıp öyle onaylayabilirsiniz. Öğrencinin programına cevap vermezseniz öğrenci iki programı da görür, işaretlemeyi sizin programınızda yapar.</p>
      {error && <p className="px-4 pt-1 text-[12px] text-red-600">{error}</p>}
      <div className="divide-y divide-violet-100">
        {programs.map((p) => {
          const editing = !!edits[p.id];
          const tasks: Task[] = editing ? edits[p.id] : Array.isArray(p.tasks) ? p.tasks : [];
          return (
            <div key={p.id} className="px-4 py-3">
              <div className="flex flex-wrap items-start gap-2">
                <div className="min-w-0 flex-1">
                  <div className="text-[13px] font-medium text-gray-900">
                    {p.students?.id
                      ? <Link href={`/ogrenciler/${p.students.id}`} className="hover:underline">{p.students.full_name}</Link>
                      : p.students?.full_name}
                    {' · '}{shortDate(p.week_start)} – {shortDate(p.week_end)} · {tasks.length} görev
                  </div>
                  <span className={`mt-0.5 inline-block rounded-full px-2 py-0.5 text-[11px] font-semibold ${p.prepared_by ? 'bg-emerald-50 text-emerald-700' : 'bg-violet-100 text-violet-700'}`}>
                    {p.prepared_by ? `🧑‍🏫 Hazırlayan: ${p.prepared_by_name ?? 'personel'}` : '🧑‍🎓 Öğrencinin kendi programı'}
                  </span>
                  {p.note && <p className="mt-0.5 text-[12px] italic text-gray-600">“{p.note}”</p>}
                  {!editing && (
                    <button type="button" onClick={() => setOpen(open === p.id ? null : p.id)} className="mt-1 text-[12px] font-medium text-violet-700 hover:underline">
                      {open === p.id ? 'Programı gizle' : 'Programı gör'}
                    </button>
                  )}
                </div>
                {editing ? (
                  <>
                    <button disabled={busy === p.id} onClick={() => approveEdited(p)}
                      className="rounded-lg bg-violet-600 px-3 py-1.5 text-[12px] font-medium text-white disabled:opacity-50">
                      {busy === p.id ? 'Kaydediliyor…' : 'Değişikliklerle onayla'}
                    </button>
                    <button disabled={busy === p.id} onClick={() => cancelEdit(p.id)}
                      className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-[12px] text-gray-600 disabled:opacity-50">Vazgeç</button>
                  </>
                ) : (
                  <>
                    <button disabled={busy === p.id} onClick={() => decide(p, true)}
                      className="rounded-lg bg-violet-600 px-3 py-1.5 text-[12px] font-medium text-white disabled:opacity-50">Onayla</button>
                    <button disabled={busy === p.id} onClick={() => startEdit(p)}
                      className="rounded-lg border border-violet-300 bg-white px-3 py-1.5 text-[12px] font-medium text-violet-700 disabled:opacity-50">Düzenle</button>
                    <button disabled={busy === p.id} onClick={() => decide(p, false)}
                      className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-[12px] text-gray-600 disabled:opacity-50">Reddet</button>
                  </>
                )}
              </div>
              {(open === p.id || editing) && (
                <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
                  {programDays(p.week_start, p.week_end).map((d) => {
                    const list = tasks.map((t, idx) => ({ t, idx })).filter(({ t }) => t.plan_day === d.weekday);
                    return (
                      <div key={d.weekday} className="rounded-lg border border-violet-100 bg-white p-2">
                        <p className="mb-1 text-[11px] font-semibold text-gray-700">{DAY_NAMES[d.weekday]} {d.date ? shortDate(d.date) : ''}</p>
                        {list.length === 0 && !editing && <p className="text-[11px] text-gray-400">—</p>}
                        {list.map(({ t, idx }) => editing ? (
                          <div key={idx} className="mb-1.5 space-y-1 rounded border border-violet-100 bg-violet-50/40 p-1.5">
                            <div className="flex items-center gap-1">
                              <input value={t.subject ?? ''} onChange={(e) => updateTask(p.id, idx, { subject: e.target.value })}
                                placeholder="Ders" className={`${inCls} flex-1 font-medium`} />
                              <button type="button" onClick={() => removeTask(p.id, idx)} title="Görevi sil"
                                className="rounded p-0.5 text-gray-400 hover:bg-rose-50 hover:text-rose-600"><IconX size={14} /></button>
                            </div>
                            <div className="flex items-center gap-1">
                              <input value={t.topic ?? ''} onChange={(e) => updateTask(p.id, idx, { topic: e.target.value })}
                                placeholder="Konu" className={`${inCls} flex-1`} />
                              <input type="number" min={0} value={t.target_count ?? 0} onChange={(e) => updateTask(p.id, idx, { target_count: Number(e.target.value) })}
                                title="Soru sayısı" className={`${inCls} w-14`} />
                              <span className="text-[10.5px] text-gray-400">soru</span>
                            </div>
                          </div>
                        ) : (
                          <p key={idx} className="text-[11.5px] text-gray-800">
                            <span className="font-medium">{t.subject}</span>{t.topic ? ` · ${t.topic}` : ''}{t.target_count ? ` · ${t.target_count} soru` : ''}
                            {t.start_time ? <span className="text-gray-400"> · {t.start_time}{t.end_time ? `–${t.end_time}` : ''}</span> : null}
                          </p>
                        ))}
                        {editing && (
                          <button type="button" onClick={() => addTask(p.id, d.weekday)}
                            className="mt-0.5 flex items-center gap-1 text-[11px] font-medium text-violet-700 hover:underline">
                            <IconPlus size={12} /> Görev ekle
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
