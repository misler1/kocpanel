'use client';
/* eslint-disable @typescript-eslint/no-explicit-any */

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { IconArrowLeft, IconCopy, IconPlus, IconTrash } from '@tabler/icons-react';
import { createClient } from '@/lib/supabase/client';
import { addDays, programDays, shortDate } from '@/lib/program-days';
import { SuggestInput } from '@/components/SuggestInput';
import { TRACK_RESOURCES } from '@/lib/track-resources';
import { subjectEmoji } from '../../studentUi';

export type PlanTask = {
  plan_day: number; subject: string; topic: string; resource_name: string;
  target_count: number; start_time: string; end_time: string;
};
type Range = { ws: string; we: string | null };

const TRACKS: [string, string][] = [['YKS_SAY', 'Sayısal'], ['YKS_EA', 'Eşit Ağırlık'], ['YKS_SOZ', 'Sözel'], ['YKS_DIL', 'Dil'], ['LGS', 'LGS']];
const field = 'w-full rounded-xl border-2 border-[var(--border)] bg-white px-3 py-2 text-[14px] font-semibold text-[var(--ink)] focus:border-[var(--accent)] focus:outline-none';
const blank = (plan_day: number): PlanTask => ({ plan_day, subject: '', topic: '', resource_name: '', target_count: 0, start_time: '', end_time: '' });
const hhmm = (t: string | null | undefined) => (t ? t.slice(0, 5) : '');
const overlaps = (a: string, b: string, r: Range) => r.ws <= b && (r.we ?? addDays(r.ws, 6)) >= a;

export function ProgramYapClient({ platformOnly, track: initialTrack, resources, defaultStart, today, coachRanges, lastProgram, staff }: {
  platformOnly: boolean;
  /** Belletmen/yurt personeli öğrenci adına hazırlıyorsa: program koçun onayına gider (staff_programs.sql) */
  staff?: { studentId: string; studentName: string; isCoach: boolean };
  track: string;
  resources: Record<string, string[]>;
  defaultStart: string;
  today: string;
  /** Koçun programlarının tarih aralıkları (çakışma uyarısı için) */
  coachRanges: Range[];
  /** Son programın görevleri ("son programımı kopyala") */
  lastProgram: any[];
}) {
  const router = useRouter();
  const supabase = createClient();
  const [track, setTrack] = useState(initialTrack);
  const [start, setStart] = useState(defaultStart);
  const end = addDays(start, 6);
  const days = useMemo(() => programDays(start, end), [start, end]);
  const [day, setDay] = useState<number>(days[0].weekday);
  const [tasks, setTasks] = useState<PlanTask[]>([]);
  const [form, setForm] = useState<PlanTask>(() => blank(days[0].weekday));
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const subjects = useMemo(() => {
    const own = Object.keys(resources);
    return own.length ? own : (TRACK_RESOURCES[track] ?? []);
  }, [resources, track]);
  const backHref = staff ? `/gunluk-giris?ogrenci=${staff.studentId}` : '/ogrenci/haftalik-takip';
  const conflict = !staff && !platformOnly && coachRanges.some((r) => overlaps(start, end, r));
  const dayTasks = tasks.map((t, i) => ({ t, i })).filter(({ t }) => t.plan_day === day);

  async function pickTrack(t: string) {
    setTrack(t);
    const { error: err } = await (supabase as any).rpc('set_my_track', { p_track: t });
    if (err) setError('Alan kaydedilemedi: ' + err.message);
  }

  function selectDay(w: number) { setDay(w); setForm(blank(w)); }

  function addTask() {
    if (!form.subject.trim()) { setError('Dersi yaz.'); return; }
    setTasks((p) => [...p, { ...form, plan_day: day, subject: form.subject.trim(), topic: form.topic.trim(), resource_name: form.resource_name.trim() }]);
    setForm(blank(day));
    setError(null);
  }

  function copyLast() {
    if (lastProgram.length === 0) return;
    setTasks(lastProgram.map((l) => ({
      plan_day: l.plan_day ?? 0, subject: l.subject ?? '', topic: l.topic ?? '', resource_name: l.resource_name ?? '',
      target_count: l.target_count ?? 0, start_time: hhmm(l.start_time), end_time: hhmm(l.end_time),
    })));
  }

  function copyDayToAll() {
    const src = tasks.filter((t) => t.plan_day === day);
    if (src.length === 0) return;
    if (!window.confirm('Bu günün görevleri diğer bütün günlere de eklensin mi?')) return;
    const others = days.map((d) => d.weekday).filter((w) => w !== day);
    setTasks((p) => [...p, ...others.flatMap((w) => src.map((t) => ({ ...t, plan_day: w })))]);
  }

  async function save() {
    if (tasks.length === 0) { setError('Programa en az bir görev ekle.'); return; }
    setBusy(true); setError(null);
    const { data, error: err } = staff
      ? await (supabase as any).rpc('staff_submit_program', { p_student: staff.studentId, p_start: start, p_tasks: tasks, p_note: note.trim() || null })
      : await (supabase as any).rpc('submit_student_program', { p_start: start, p_tasks: tasks, p_note: note.trim() || null });
    setBusy(false);
    if (err) { setError(err.code === 'PGRST202' ? 'Bu özellik henüz etkin değil.' : err.message); return; }
    if (staff) {
      router.push(`/gunluk-giris?ogrenci=${staff.studentId}&program=${data === 'aktif' ? 'aktif' : 'bekliyor'}`);
      router.refresh();
      return;
    }
    router.push(`/ogrenci/haftalik-takip?program=${data === 'bekliyor' ? 'bekliyor' : 'aktif'}`);
    router.refresh();
  }

  return (
    <div className="space-y-4 pb-28">
      <div className="flex items-center gap-2">
        <Link href={backHref} className="rounded-full p-2 text-[var(--ink-muted)] hover:bg-[var(--card)]"><IconArrowLeft size={20} /></Link>
        <div>
          <h1 className="text-[22px] font-extrabold tracking-tight text-[var(--ink)]">{staff ? `🗓️ ${staff.studentName} için program` : '🗓️ Kendi programını yap'}</h1>
          <p className="text-[13px] font-medium text-[var(--ink-muted)]">
            {staff ? (staff.isCoach ? '7 günlük programı gün gün planlayın; kaydedince hemen geçerli olur.' : '7 günlük programı gün gün planlayın; koçun onayından sonra geçerli olur.') : '7 günlük programını gün gün planla.'}
          </p>
        </div>
      </div>

      {platformOnly && !staff && (
        <div className="rounded-[24px] border-2 border-[var(--border)] bg-[var(--card)] p-4">
          <p className="mb-2 text-[13px] font-bold text-[var(--ink-muted)]">🎓 Alanın {track === 'DIGER' && <span className="text-[var(--danger)]">(seç, derslerin buna göre önerilsin)</span>}</p>
          <div className="flex flex-wrap gap-2">
            {TRACKS.map(([k, l]) => (
              <button key={k} type="button" onClick={() => pickTrack(k)}
                className={`rounded-full px-3.5 py-1.5 text-[13px] font-bold transition-colors ${track === k ? 'bg-[var(--accent)] text-white shadow-sm' : 'border-2 border-[var(--border)] text-[var(--ink-muted)] hover:bg-[var(--accent-soft)]'}`}>
                {l}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-3 rounded-[24px] border-2 border-[var(--border)] bg-[var(--card)] p-4">
        <div className="flex flex-wrap items-end gap-3">
          <label className="block">
            <span className="mb-1 block text-[13px] font-bold text-[var(--ink-muted)]">Başlangıç günü</span>
            <input type="date" value={start} min={addDays(today, -7)}
              onChange={(e) => { if (!e.target.value) return; setStart(e.target.value); const w = programDays(e.target.value, addDays(e.target.value, 6))[0].weekday; setDay(w); setForm(blank(w)); }}
              className={field} />
          </label>
          <span className="pb-2.5 text-[14px] font-extrabold text-[var(--accent-dark)]">{shortDate(start)} – {shortDate(end)}</span>
          {lastProgram.length > 0 && (
            <button type="button" onClick={copyLast} className="ml-auto flex items-center gap-1.5 rounded-full border-2 border-[var(--border)] px-3.5 py-2 text-[13px] font-bold text-[var(--ink)] hover:bg-[var(--accent-soft)]">
              <IconCopy size={15} /> {staff ? 'Son programı kopyala' : 'Son programımı kopyala'}
            </button>
          )}
        </div>
        {staff && !staff.isCoach && coachRanges.some((r) => overlaps(start, end, r)) && (
          <p className="rounded-2xl bg-amber-50 px-3 py-2 text-[12.5px] font-bold text-[#8A5300]">
            ⏳ Bu tarihlerde koçun hazırladığı bir program var. Koç onaylarsa bu program onun yerine geçer.
          </p>
        )}
        {conflict && (
          <p className="rounded-2xl bg-[var(--sun-soft)] px-3 py-2 text-[12.5px] font-bold text-[#8A5300]">
            ⏳ Bu tarihlerde koçunun hazırladığı bir program var. Programın koçunun onayına gidecek: onaylarsa koçunun programının yerine geçer; o zamana kadar ikisini de görürsün, işaretlemeyi koçunun programında yaparsın.
          </p>
        )}
      </div>

      <div className="rounded-[24px] border-2 border-[var(--border)] bg-[var(--card)] p-4">
        <div className="-mx-1 mb-3 flex gap-1.5 overflow-x-auto px-1 pb-1">
          {days.map((d) => {
            const n = tasks.filter((t) => t.plan_day === d.weekday).length;
            return (
              <button key={d.weekday} type="button" onClick={() => selectDay(d.weekday)}
                className={`flex min-w-[62px] flex-shrink-0 flex-col items-center rounded-2xl px-2 py-1.5 text-[12px] font-bold transition-colors ${day === d.weekday ? 'bg-[var(--accent)] text-white shadow-sm' : 'bg-[var(--paper)] text-[var(--ink-muted)] hover:bg-[var(--accent-soft)]'}`}>
                <span>{d.label.slice(0, 3)}</span>
                <span className="text-[11px] font-semibold opacity-80">{d.date ? shortDate(d.date) : ''}</span>
                <span className={`mt-0.5 rounded-full px-1.5 text-[10.5px] ${n ? (day === d.weekday ? 'bg-white/25' : 'bg-[var(--accent-soft)] text-[var(--accent-dark)]') : 'opacity-50'}`}>{n} görev</span>
              </button>
            );
          })}
        </div>

        <div className="space-y-2">
          {dayTasks.length === 0 && <p className="py-2 text-center text-[13px] font-semibold text-[var(--ink-muted)]">Bu güne henüz görev eklemedin.</p>}
          {dayTasks.map(({ t, i }) => (
            <div key={i} className="flex items-center gap-2 rounded-2xl bg-[var(--paper)] px-3 py-2">
              <span className="text-[20px]">{subjectEmoji(t.subject)}</span>
              <span className="min-w-0 flex-1">
                <span className="block text-[14px] font-bold text-[var(--ink)]">{t.subject}</span>
                <span className="block text-[12px] font-medium text-[var(--ink-muted)]">
                  {[t.topic, t.resource_name && `📘 ${t.resource_name}`, t.target_count ? `${t.target_count} soru` : null,
                    t.start_time ? `⏰ ${t.start_time}${t.end_time ? '–' + t.end_time : ''}` : null].filter(Boolean).join(' · ') || 'Görev'}
                </span>
              </span>
              <button type="button" onClick={() => setTasks((p) => p.filter((_, k) => k !== i))} aria-label="Görevi sil"
                className="rounded-full p-1.5 text-[var(--ink-muted)] hover:bg-white hover:text-[var(--danger)]"><IconTrash size={16} /></button>
            </div>
          ))}
        </div>

        <div className="mt-3 space-y-2 rounded-2xl border-2 border-dashed border-[var(--border)] p-3">
          <SuggestInput options={subjects} value={form.subject} onChange={(v) => setForm((f) => ({ ...f, subject: v }))} placeholder="Ders (ör. TYT Matematik)" className={field} />
          <div className="grid grid-cols-2 gap-2">
            <input value={form.topic} onChange={(e) => setForm((f) => ({ ...f, topic: e.target.value }))} placeholder="Konu (isteğe bağlı)" className={field} />
            <input value={form.resource_name} onChange={(e) => setForm((f) => ({ ...f, resource_name: e.target.value }))} placeholder="Kaynak (isteğe bağlı)" className={field} />
          </div>
          <div className="grid grid-cols-3 gap-2">
            <label className="block"><span className="mb-0.5 block text-[11px] font-bold text-[var(--ink-muted)]">Soru hedefi</span>
              <input type="number" inputMode="numeric" min={0} value={form.target_count || ''} placeholder="0"
                onChange={(e) => setForm((f) => ({ ...f, target_count: Math.max(0, Math.floor(Number(e.target.value) || 0)) }))} className={field} /></label>
            <label className="block"><span className="mb-0.5 block text-[11px] font-bold text-[var(--ink-muted)]">Başlangıç</span>
              <input type="time" value={form.start_time} onChange={(e) => setForm((f) => ({ ...f, start_time: e.target.value }))} className={field} /></label>
            <label className="block"><span className="mb-0.5 block text-[11px] font-bold text-[var(--ink-muted)]">Bitiş</span>
              <input type="time" value={form.end_time} onChange={(e) => setForm((f) => ({ ...f, end_time: e.target.value }))} className={field} /></label>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={addTask} className="flex items-center gap-1 rounded-full bg-[var(--accent)] px-4 py-2 text-[13px] font-bold text-white shadow-sm hover:bg-[var(--accent-dark)]">
              <IconPlus size={15} /> Göreve ekle
            </button>
            {dayTasks.length > 0 && (
              <button type="button" onClick={copyDayToAll} className="rounded-full border-2 border-[var(--border)] px-3.5 py-2 text-[13px] font-bold text-[var(--ink-muted)] hover:bg-[var(--accent-soft)]">
                Bu günü diğer günlere kopyala
              </button>
            )}
          </div>
        </div>
      </div>

      {(staff ? !staff.isCoach : !platformOnly) && (
        <label className="block rounded-[24px] border-2 border-[var(--border)] bg-[var(--card)] p-4">
          <span className="mb-1 block text-[13px] font-bold text-[var(--ink-muted)]">💬 {staff ? 'Koça not' : 'Koçuna not'} (isteğe bağlı)</span>
          <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} maxLength={500} placeholder="ör. Bu hafta okulda sınavım var, ona göre planladım."
            className="w-full rounded-2xl border-2 border-[var(--border)] bg-[var(--paper)] px-3 py-2 text-[14px] focus:border-[var(--accent)] focus:outline-none" />
        </label>
      )}

      {error && <p className="rounded-2xl bg-[var(--danger-soft)] px-3 py-2 text-[13px] font-bold text-[var(--danger)]">{error}</p>}

      <div className="sticky bottom-24 z-10 flex items-center gap-2 rounded-full bg-[var(--card)]/95 p-1.5 shadow-lg backdrop-blur md:bottom-4">
        <span className="pl-3 text-[13px] font-bold text-[var(--ink-muted)]">{tasks.length} görev</span>
        <button type="button" disabled={busy} onClick={save}
          className="flex-1 rounded-full bg-[var(--accent)] px-5 py-3 text-[15px] font-extrabold text-white shadow-sm hover:bg-[var(--accent-dark)] disabled:opacity-50">
          {busy ? 'Kaydediliyor…' : staff ? (staff.isCoach ? 'Programı kaydet' : 'Koçun onayına gönder') : conflict ? 'Koçuma onaya gönder' : 'Programı kaydet 🚀'}
        </button>
      </div>
    </div>
  );
}
